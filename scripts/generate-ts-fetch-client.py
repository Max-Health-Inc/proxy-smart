#!/usr/bin/env python3
"""
Pure Python OpenAPI → TypeScript-fetch client generator.

Replaces the Java openapi-generator-cli for generating a typed fetch-based
API client from an OpenAPI 3.x spec. Handles OpenAPI 3.0.3 and 3.1.x natively.

Output is compatible with the existing client structure:
  - runtime.ts  (shared fetch infra — preserved, BASE_PATH updated)
  - models/*.ts (interfaces + FromJSON/ToJSON per schema)
  - apis/*.ts   (API classes extending BaseAPI, one per tag)
  - index.ts    (barrel exports)

Schema naming strategy (mirrors Java openapi-generator):
  1. Use 'title' field if present on the schema (Elysia/TypeBox sets these)
  2. Content-hash dedup: identical schemas with the same title → reuse
  3. Nested object properties: ParentName + PropertyName (PascalCase)
  4. Array items with object schemas: ParentName + PropertyName + "Inner"
  5. Fallback: OperationId + StatusCode + "Response"/"Request"

Usage:
  python scripts/generate-ts-fetch-client.py <spec-path> <output-dir>
"""

from __future__ import annotations

import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

# ─── Naming helpers ──────────────────────────────────────────────────────────────

def pascal(name: str) -> str:
    """Convert a kebab/snake/camelCase string to PascalCase."""
    parts = re.split(r'[-_\s]', name)
    result_parts: list[str] = []
    for p in parts:
        sub = re.sub(r'([a-z])([A-Z])', r'\1_\2', p).split('_')
        for s in sub:
            if s:
                result_parts.append(s[0].upper() + s[1:])
    return ''.join(result_parts)


def camel(name: str) -> str:
    """Convert to camelCase."""
    p = pascal(name)
    return p[0].lower() + p[1:] if p else ''


def safe_id(name: str) -> str:
    """Make a string safe as a TypeScript identifier."""
    name = re.sub(r'[^a-zA-Z0-9_$]', '_', name)
    if name and name[0:1].isdigit():
        name = '_' + name
    return name


def operation_id(method: str, path: str, op: dict) -> str:
    """Get or generate an operationId, always returning a valid camelCase identifier."""
    if 'operationId' in op:
        # Spec-provided operationIds may contain hyphens, wildcards (*), etc.
        # Replace * with 'All' for wildcard routes, strip remaining non-identifier chars,
        # then camelCase for a valid TS method name.
        raw = op['operationId'].replace('*', 'All')
        raw = re.sub(r'[^a-zA-Z0-9_-]', '', raw)
        return camel(raw)
    parts = path.strip('/').split('/')
    cleaned = []
    for part in parts:
        if part.startswith('{') and part.endswith('}'):
            cleaned.append('By' + pascal(part[1:-1]))
        else:
            cleaned.append(pascal(part))
    return camel(method + ''.join(cleaned))


# ─── Schema registry with dedup & nested extraction ─────────────────────────────

class SchemaRegistry:
    """
    Extracts inline schemas into named models with deduplication.

    Same-titled schemas with identical structure share a single model name.
    Nested object properties and array items are recursively extracted.
    """

    def __init__(self, spec: dict):
        self.spec = spec
        self.models: dict[str, dict] = {}         # name -> schema
        self._canon_map: dict[str, str] = {}      # canonical_hash -> name (dedup)
        self._used_names: set[str] = set()
        self._extracting: set[int] = set()        # cycle guard (schema id)

        # Pre-populate from components/schemas
        for name, schema in (spec.get('components', {}).get('schemas', {}) or {}).items():
            self._register_direct(name, schema)

    def _canonical(self, schema: dict) -> str:
        """Compute a canonical form of a schema for deduplication (ignores metadata)."""
        def _strip(obj: Any) -> Any:
            if isinstance(obj, dict):
                return {k: _strip(v) for k, v in sorted(obj.items())
                        if k not in ('title', 'description', 'example', 'examples',
                                     'default', 'x-examples', 'externalDocs')}
            if isinstance(obj, list):
                return [_strip(x) for x in obj]
            return obj
        return json.dumps(_strip(schema), sort_keys=True, separators=(',', ':'))

    def _unique_name(self, base: str) -> str:
        if base not in self._used_names:
            self._used_names.add(base)
            return base
        n = 1
        while f'{base}{n}' in self._used_names:
            n += 1
        name = f'{base}{n}'
        self._used_names.add(name)
        return name

    def resolve_ref(self, ref: str) -> tuple[str, dict]:
        parts = ref.lstrip('#/').split('/')
        obj = self.spec
        for part in parts:
            obj = obj[part]
        return parts[-1], obj

    def _register_direct(self, name: str, schema: dict) -> str:
        """Register with the given name, no title override. Used for components."""
        canon = self._canonical(schema)
        if canon in self._canon_map:
            return self._canon_map[canon]
        name = self._unique_name(name)
        self.models[name] = schema
        self._canon_map[canon] = name
        self._extract_nested(name, schema)
        return name

    def register_schema(self, schema: dict, context_name: str) -> str:
        """
        Register an inline object schema and return its assigned name.
        Uses 'title' if available, otherwise uses context_name.
        Content-hash dedup ensures identical schemas share a name.
        """
        if not schema or not isinstance(schema, dict):
            return context_name

        # Compute canonical form for dedup
        canon = self._canonical(schema)
        if canon in self._canon_map:
            return self._canon_map[canon]

        # Determine name: title takes priority
        title = schema.get('title')
        if title and isinstance(title, str):
            name = pascal(title)
        else:
            name = context_name

        name = self._unique_name(name)
        self.models[name] = schema
        self._canon_map[canon] = name

        # Recursively extract nested schemas
        self._extract_nested(name, schema)
        return name

    def _extract_nested(self, parent_name: str, schema: dict):
        """Recursively extract nested object/array schemas from properties."""
        sid = id(schema)
        if sid in self._extracting:
            return  # cycle guard
        self._extracting.add(sid)

        try:
            props = schema.get('properties', {})
            if not isinstance(props, dict):
                return

            for pname, pschema in props.items():
                if not isinstance(pschema, dict):
                    continue

                child_name = parent_name + pascal(pname)

                # Object property with properties → extract as separate model
                if pschema.get('type') == 'object' and pschema.get('properties'):
                    self.register_schema(pschema, child_name)

                # Array property with object items → extract with "Inner" suffix
                elif pschema.get('type') == 'array':
                    items = pschema.get('items', {})
                    if isinstance(items, dict) and items.get('type') == 'object' and items.get('properties'):
                        self.register_schema(items, child_name + 'Inner')

                # anyOf/oneOf with embedded objects
                for keyword in ('anyOf', 'oneOf'):
                    if keyword in pschema and isinstance(pschema[keyword], list):
                        for variant in pschema[keyword]:
                            if isinstance(variant, dict) and variant.get('type') == 'object' and variant.get('properties'):
                                self.register_schema(variant, child_name)
        finally:
            self._extracting.discard(sid)

    def ts_type(self, schema: dict | None, context_name: str = '') -> str:
        """
        Convert an OpenAPI schema to a TypeScript type string.
        Extracts inline object schemas as named models.
        """
        if schema is None:
            return 'any'

        # $ref
        if '$ref' in schema:
            name, _ = self.resolve_ref(schema['$ref'])
            return name

        # allOf
        if 'allOf' in schema:
            types = [self.ts_type(s, context_name) for s in schema['allOf']]
            return ' & '.join(types) if types else 'any'

        # oneOf / anyOf (handle nullable unions)
        for keyword in ('oneOf', 'anyOf'):
            if keyword in schema:
                variants = schema[keyword]
                non_null = [v for v in variants if v.get('type') != 'null']
                has_null = len(non_null) < len(variants) or schema.get('nullable')
                types = [self.ts_type(v, context_name) for v in non_null]
                ts = ' | '.join(types) if types else 'any'
                if has_null:
                    ts += ' | null'
                return ts

        schema_type = schema.get('type')
        nullable = schema.get('nullable', False) or schema_type == 'null'

        # Enum values
        if 'enum' in schema:
            ts = 'string'
            return f'{ts} | null' if nullable else ts

        # Object with properties → register as named model
        if schema_type == 'object' and schema.get('properties'):
            name = self.register_schema(schema, context_name)
            return f'{name} | null' if nullable else name

        # Array
        if schema_type == 'array':
            items = schema.get('items', {})
            item_ctx = context_name + 'Inner' if context_name else 'Item'
            item_type = self.ts_type(items, item_ctx)
            ts = f'Array<{item_type}>'
            return f'{ts} | null' if nullable else ts

        # Object without properties (generic/map)
        if schema_type == 'object':
            if 'additionalProperties' in schema and isinstance(schema['additionalProperties'], dict):
                val = self.ts_type(schema['additionalProperties'], context_name + 'Value')
                ts = f'{{ [key: string]: {val} }}'
            else:
                ts = 'object'
            return f'{ts} | null' if nullable else ts

        # Primitives
        type_map = {
            'string': 'string', 'integer': 'number', 'number': 'number',
            'boolean': 'boolean', 'null': 'null',
        }
        if schema_type in type_map:
            ts = type_map[schema_type]
            return f'{ts} | null' if nullable else ts

        return 'any'

    def response_schema(self, responses: dict, status_codes: tuple = ('200', '201', '202', '204')) -> tuple[str | None, dict | None]:
        """Returns (status_code, schema) for the first matching JSON response."""
        for code in status_codes:
            resp = responses.get(code, {})
            content = resp.get('content', {})
            for mt in ('application/json', '*/*'):
                if mt in content:
                    return code, content[mt].get('schema')
        return None, None

    def request_schema(self, body: dict | None) -> dict | None:
        if not body:
            return None
        content = body.get('content', {})
        for mt in ('application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'):
            if mt in content:
                return content[mt].get('schema')
        return None


# ─── Dependency tracking ─────────────────────────────────────────────────────────

def model_refs(ts_type: str, registry: SchemaRegistry, exclude: str = '') -> set[str]:
    """Find model names referenced in a TS type string."""
    refs: set[str] = set()
    for word in re.findall(r'\b[A-Z][a-zA-Z0-9]+\b', ts_type):
        if word in registry.models and word != exclude and word != 'Array':
            refs.add(word)
    return refs


# ─── Model file generator ────────────────────────────────────────────────────────

def gen_model(name: str, schema: dict, registry: SchemaRegistry, header: str) -> str:
    """Generate a complete model .ts file."""
    lines: list[str] = [header.rstrip(), '']

    props = schema.get('properties', {})
    required = set(schema.get('required', []))

    # Resolve property types
    prop_types: dict[str, str] = {}
    for pname, pschema in props.items():
        child_ctx = name + pascal(pname)
        prop_types[pname] = registry.ts_type(pschema, child_ctx)

    # Collect model imports
    imports: set[str] = set()
    for ts in prop_types.values():
        imports |= model_refs(ts, registry, name)

    # Write imports
    lines.append("import { mapValues } from '../runtime';")
    for imp in sorted(imports):
        lines.append(f"import type {{ {imp} }} from './{imp}';")
        lines.append(f"import {{")
        lines.append(f"    {imp}FromJSON,")
        lines.append(f"    {imp}FromJSONTyped,")
        lines.append(f"    {imp}ToJSON,")
        lines.append(f"    {imp}ToJSONTyped,")
        lines.append(f"}} from './{imp}';")
    lines.append('')

    # Pre-compute enum type names for properties that have enum values
    enum_type_map: dict[str, str] = {}
    for pname, pschema in props.items():
        if 'enum' in pschema:
            enum_type_map[pname] = f'{name}{pascal(pname)}Enum'

    # Build camelCase property name mapping: original -> camel
    camel_names: dict[str, str] = {}
    for pname in props:
        camel_names[pname] = camel(pname)

    # Interface — use camelCase property names (matches Java generator convention)
    lines.append(f'/**')
    if schema.get('description'):
        lines.append(f' * {schema["description"]}')
    lines.append(f' * @export')
    lines.append(f' * @interface {name}')
    lines.append(f' */')
    lines.append(f'export interface {name} {{')
    for pname, pschema in props.items():
        desc = pschema.get('description', '')
        opt = '?' if pname not in required else ''
        # Use enum type if enum values are declared, otherwise use resolved TS type
        ts = enum_type_map.get(pname, prop_types[pname])
        cn = camel_names[pname]
        lines.append(f'    /**')
        if desc:
            lines.append(f'     * {desc}')
        lines.append(f'     * @type {{{ts}}}')
        lines.append(f'     * @memberof {name}')
        lines.append(f'     */')
        lines.append(f'    {safe_id(cn)}{opt}: {ts};')
    lines.append('}')
    lines.append('')

    # Enum constants for enum properties
    for pname, pschema in props.items():
        if 'enum' in pschema:
            enum_name = f'{name}{pascal(pname)}Enum'
            lines.append(f'/**')
            lines.append(f' * @export')
            lines.append(f' */')
            lines.append(f'export const {enum_name} = {{')
            for val in pschema['enum']:
                key = pascal(str(val))
                lines.append(f"    {key}: '{val}'," if isinstance(val, str) else f"    {key}: {json.dumps(val)},")
            lines.append('} as const;')
            lines.append(f'export type {enum_name} = typeof {enum_name}[keyof typeof {enum_name}];')
            lines.append('')

    # instanceOf — check camelCase property names
    lines.append(f'/**')
    lines.append(f' * Check if a given object implements the {name} interface.')
    lines.append(f' */')
    lines.append(f'export function instanceOf{name}(value: object): value is {name} {{')
    for p in required:
        cn = camel_names.get(p, p)
        lines.append(f"    if (!('{cn}' in value) || value['{cn}'] === undefined) return false;")
    lines.append('    return true;')
    lines.append('}')
    lines.append('')

    # FromJSON — read json['original_name'], assign to camelCase key
    lines.append(f'export function {name}FromJSON(json: any): {name} {{')
    lines.append(f'    return {name}FromJSONTyped(json, false);')
    lines.append('}')
    lines.append('')
    lines.append(f'export function {name}FromJSONTyped(json: any, ignoreDiscriminator: boolean): {name} {{')
    lines.append(f'    if (json == null) {{')
    lines.append(f'        return json;')
    lines.append(f'    }}')
    lines.append(f'    return {{')
    lines.append(f'        ')
    for pname, pschema in props.items():
        cn = safe_id(camel_names[pname])
        is_required = pname in required
        lines.append(f"        '{cn}': {_from_json(pname, pschema, prop_types[pname], registry, name, is_required)},")
    lines.append(f'    }};')
    lines.append('}')
    lines.append('')

    # ToJSON — read value['camelCaseName'], output to 'original_name' key
    lines.append(f'export function {name}ToJSON(json: any): {name} {{')
    lines.append(f'    return {name}ToJSONTyped(json, false);')
    lines.append('}')
    lines.append('')
    lines.append(f'export function {name}ToJSONTyped(value?: {name} | null, ignoreDiscriminator: boolean = false): any {{')
    lines.append(f'    if (value == null) {{')
    lines.append(f'        return value;')
    lines.append(f'    }}')
    lines.append(f'')
    lines.append(f'    return {{')
    lines.append(f'        ')
    for pname, pschema in props.items():
        cn = safe_id(camel_names[pname])
        lines.append(f"        '{pname}': {_to_json(pname, pschema, prop_types[pname], registry, name, cn)},")
    lines.append(f'    }};')
    lines.append('}')
    lines.append('')

    return '\n'.join(lines)


def _resolve_model_type(schema: dict, ts_type: str, registry: SchemaRegistry) -> str | None:
    """Find the model name for a schema, if it resolves to one."""
    if '$ref' in schema:
        name, _ = registry.resolve_ref(schema['$ref'])
        return name
    clean = ts_type.replace(' | null', '').strip()
    if clean in registry.models:
        return clean
    return None


def _from_json(pname: str, schema: dict, ts_type: str, registry: SchemaRegistry, parent: str, is_required: bool = False) -> str:
    """Generate FromJSON expression for a property.

    For required properties, don't wrap in null-check (avoids 'undefined is not assignable' errors).
    For optional properties, return undefined if the JSON value is null/missing.
    """
    model = _resolve_model_type(schema, ts_type, registry)
    if model:
        if is_required:
            return f"{model}FromJSON(json['{pname}'])"
        return f"json['{pname}'] == null ? undefined : {model}FromJSON(json['{pname}'])"

    if schema.get('type') == 'array':
        items = schema.get('items', {})
        item_model = _resolve_model_type(items, '', registry)
        if not item_model:
            # Check by canonical form
            if isinstance(items, dict) and items.get('type') == 'object' and items.get('properties'):
                canon = registry._canonical(items)
                item_model = registry._canon_map.get(canon)
        if item_model:
            if is_required:
                return f"((json['{pname}'] as Array<any>).map({item_model}FromJSON))"
            return f"json['{pname}'] == null ? undefined : ((json['{pname}'] as Array<any>).map({item_model}FromJSON))"

    if is_required:
        return f"json['{pname}']"
    return f"json['{pname}'] == null ? undefined : json['{pname}']"


def _to_json(pname: str, schema: dict, ts_type: str, registry: SchemaRegistry, parent: str, camel_name: str = '') -> str:
    """Generate ToJSON expression for a property.

    Reads from value['camelCaseName'] and outputs to 'original_name'.
    """
    cn = camel_name or safe_id(pname)
    model = _resolve_model_type(schema, ts_type, registry)
    if model:
        return f"{model}ToJSON(value['{cn}'])"

    if schema.get('type') == 'array':
        items = schema.get('items', {})
        item_model = _resolve_model_type(items, '', registry)
        if not item_model:
            if isinstance(items, dict) and items.get('type') == 'object' and items.get('properties'):
                canon = registry._canonical(items)
                item_model = registry._canon_map.get(canon)
        if item_model:
            return f"value['{cn}'] == null ? undefined : ((value['{cn}'] as Array<any>).map({item_model}ToJSON))"

    return f"value['{cn}']"


# ─── API class generator ─────────────────────────────────────────────────────────

def _iface_name(oid: str, registry: SchemaRegistry) -> str:
    """Generate a unique request interface name that won't collide with model names."""
    candidate = pascal(oid) + 'Request'
    if candidate in registry.models:
        return pascal(oid) + 'OperationRequest'
    return candidate


def gen_api(tag: str, operations: list[dict], registry: SchemaRegistry, header: str) -> str:
    """Generate an API class file for a tag."""
    class_name = pascal(tag) + 'Api'
    lines: list[str] = [header.rstrip(), '', '']
    lines.append("import * as runtime from '../runtime';")

    all_refs: set[str] = set()
    for op in operations:
        all_refs |= op.get('_refs', set())

    if all_refs:
        lines.append('import type {')
        for ref in sorted(all_refs):
            lines.append(f'  {ref},')
        lines.append("} from '../models/index';")
        lines.append('import {')
        for ref in sorted(all_refs):
            lines.append(f'    {ref}FromJSON,')
            lines.append(f'    {ref}ToJSON,')
        lines.append("} from '../models/index';")

    lines.append('')

    # Request interfaces — use camelCase param names for TS convention
    for op in operations:
        params = op.get('params', [])
        if params:
            iface = _iface_name(op['id'], registry)
            lines.append(f'export interface {iface} {{')
            for p in params:
                opt = '' if p['required'] else '?'
                cn = camel(p['name'])
                lines.append(f"    {safe_id(cn)}{opt}: {p['ts']};")
            lines.append('}')
            lines.append('')

    # Class
    lines.append(f'/**')
    lines.append(f' * ')
    lines.append(f' */')
    lines.append(f'export class {class_name} extends runtime.BaseAPI {{')
    lines.append('')

    for op in operations:
        _gen_operation(lines, op, registry)

    lines.append('}')
    lines.append('')
    return '\n'.join(lines)


def _gen_operation(lines: list[str], op: dict, registry: SchemaRegistry):
    """Generate raw + convenience methods for one operation."""
    oid = op['id']
    method = op['method'].upper()
    path = op['path']
    summary = op.get('summary', '')
    desc = op.get('description', '')
    params = op.get('params', [])
    resp_type = op.get('resp_type', 'void')
    resp_array = op.get('resp_array', False)
    resp_item = op.get('resp_item')

    has_params = bool(params)
    has_required_params = any(p['required'] for p in params)
    iface = _iface_name(oid, registry) if has_params else None

    # ── Raw method ──
    lines.append('    /**')
    if desc:
        lines.append(f'     * {desc}')
    if summary:
        lines.append(f'     * {summary}')
    lines.append('     */')
    if has_params:
        opt_mark = '' if has_required_params else '?'
        sig = f'requestParameters{opt_mark}: {iface}, '
    else:
        sig = ''
    lines.append(f'    async {oid}Raw({sig}initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<{resp_type}>> {{')

    # Guard for optional requestParameters
    if has_params and not has_required_params:
        lines.append(f'        requestParameters = requestParameters || {{}};')
        lines.append('')

    for p in params:
        if p['required']:
            cn = safe_id(camel(p['name']))
            lines.append(f"        if (requestParameters['{cn}'] == null) {{")
            lines.append(f'            throw new runtime.RequiredError(')
            lines.append(f"                '{cn}',")
            lines.append(f"                'Required parameter \"{cn}\" was null or undefined when calling {oid}().'")
            lines.append(f'            );')
            lines.append(f'        }}')
            lines.append('')

    lines.append('        const queryParameters: any = {};')
    for p in params:
        if p['in'] == 'query':
            cn = safe_id(camel(p['name']))
            lines.append(f"        if (requestParameters['{cn}'] != null) {{")
            lines.append(f"            queryParameters['{p['name']}'] = requestParameters['{cn}'];")
            lines.append(f'        }}')
    lines.append('')

    lines.append('        const headerParameters: runtime.HTTPHeaders = {};')
    for p in params:
        if p['in'] == 'header':
            cn = safe_id(camel(p['name']))
            lines.append(f"        if (requestParameters['{cn}'] != null) {{")
            lines.append(f"            headerParameters['{p['name']}'] = String(requestParameters['{cn}']);")
            lines.append(f'        }}')
    lines.append('')

    # Auth
    lines.append('        if (this.configuration && this.configuration.accessToken) {')
    lines.append('            const token = this.configuration.accessToken;')
    lines.append('            const tokenString = await token("BearerAuth", []);')
    lines.append('')
    lines.append('            if (tokenString) {')
    lines.append('                headerParameters["Authorization"] = `Bearer ${tokenString}`;')
    lines.append('            }')
    lines.append('        }')
    lines.append('')

    lines.append(f"        let urlPath = `{path}`;")
    for p in params:
        if p['in'] == 'path':
            cn = safe_id(camel(p['name']))
            lines.append(f'        urlPath = urlPath.replace(`{{{p["name"]}}}`, encodeURIComponent(String(requestParameters[\'{cn}\'])));')
    lines.append('')

    body_param = next((p for p in params if p['in'] == 'body'), None)
    if body_param:
        lines.append("        headerParameters['Content-Type'] = 'application/json';")
        lines.append('')

    lines.append('        const response = await this.request({')
    lines.append('            path: urlPath,')
    lines.append(f"            method: '{method}',")
    lines.append('            headers: headerParameters,')
    lines.append('            query: queryParameters,')
    if body_param:
        bn = safe_id(camel(body_param['name']))
        bt = body_param['ts']
        if bt in registry.models:
            lines.append(f"            body: {bt}ToJSON(requestParameters['{bn}']),")
        else:
            lines.append(f"            body: requestParameters['{bn}'],")
    lines.append('        }, initOverrides);')
    lines.append('')

    if resp_type == 'void':
        lines.append('        return new runtime.VoidApiResponse(response);')
    elif resp_array and resp_item and resp_item in registry.models:
        lines.append(f'        return new runtime.JSONApiResponse(response, (jsonValue) => jsonValue.map({resp_item}FromJSON));')
    elif resp_type in registry.models:
        lines.append(f'        return new runtime.JSONApiResponse(response, (jsonValue) => {resp_type}FromJSON(jsonValue));')
    else:
        lines.append(f'        return new runtime.JSONApiResponse<{resp_type}>(response);')

    lines.append('    }')
    lines.append('')

    # ── Convenience method ──
    lines.append('    /**')
    if desc:
        lines.append(f'     * {desc}')
    if summary:
        lines.append(f'     * {summary}')
    lines.append('     */')
    if has_params:
        opt_mark = '' if has_required_params else '?'
        lines.append(f'    async {oid}(requestParameters{opt_mark}: {iface}, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<{resp_type}> {{')
        lines.append(f'        const response = await this.{oid}Raw(requestParameters, initOverrides);')
    else:
        lines.append(f'    async {oid}(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<{resp_type}> {{')
        lines.append(f'        const response = await this.{oid}Raw(initOverrides);')
    lines.append('        return await response.value();')
    lines.append('    }')
    lines.append('')


# ─── Main ────────────────────────────────────────────────────────────────────────

HEADER_TPL = '''/* tslint:disable */
/* eslint-disable */
/**
 * {title}
 * {description}
 *
 * The version of the OpenAPI document: {version}
 *
 * NOTE: This class is auto generated by generate-ts-fetch-client.py
 * Do not edit the class manually.
 */
'''


def generate(spec_path: str, output_dir: str):
    """Main entry: read spec, walk operations, generate files."""
    with open(spec_path, 'r', encoding='utf-8') as f:
        spec = json.load(f)

    info = spec.get('info', {})
    title = info.get('title', 'API')
    description = info.get('description', '')
    version = info.get('version', '0.0.0')
    base_path = ''
    servers = spec.get('servers', [])
    if servers:
        base_path = servers[0].get('url', '').rstrip('/')

    header = HEADER_TPL.format(title=title, description=description, version=version)
    registry = SchemaRegistry(spec)

    # ── Phase 1: Walk all operations, extract schemas ────────────────────────
    tag_ops: dict[str, list[dict]] = defaultdict(list)

    for path, path_item in (spec.get('paths', {}) or {}).items():
        if not isinstance(path_item, dict):
            continue
        for method in ('get', 'post', 'put', 'patch', 'delete', 'head', 'options'):
            op = path_item.get(method)
            if not op or not isinstance(op, dict):
                continue

            tags = op.get('tags', ['Default'])
            oid = operation_id(method, path, op)
            op_pascal = pascal(oid)

            # Parameters
            params: list[dict] = []
            refs: set[str] = set()

            raw_params = list(path_item.get('parameters', [])) + list(op.get('parameters', []))
            for p in raw_params:
                if '$ref' in p:
                    _, p = registry.resolve_ref(p['$ref'])
                p_schema = p.get('schema', {})
                ts = registry.ts_type(p_schema, op_pascal + pascal(p.get('name', '')))
                refs |= model_refs(ts, registry)
                params.append({
                    'name': p.get('name', ''),
                    'in': p.get('in', 'query'),
                    'required': p.get('required', False),
                    'ts': ts,
                })

            # Request body
            req_schema = registry.request_schema(op.get('requestBody'))
            if req_schema:
                ctx = req_schema.get('title')
                if ctx and isinstance(ctx, str):
                    ctx = pascal(ctx)
                else:
                    ctx = op_pascal + 'Request'
                ts = registry.ts_type(req_schema, ctx)
                refs |= model_refs(ts, registry)
                body_name = camel(ts.replace(' | null', '').strip()) if ts[0:1].isupper() else 'body'
                params.append({
                    'name': body_name,
                    'in': 'body',
                    'required': True,
                    'ts': ts,
                })

            # Response
            resp_code, resp_schema = registry.response_schema(op.get('responses', {}))
            resp_type = 'void'
            resp_array = False
            resp_item = None
            if resp_schema:
                ctx = resp_schema.get('title')
                if ctx and isinstance(ctx, str):
                    ctx = pascal(ctx)
                else:
                    # Match Java convention: OperationId + StatusCode + Response
                    ctx = f'{op_pascal}{resp_code or ""}Response'
                resp_type = registry.ts_type(resp_schema, ctx)
                refs |= model_refs(resp_type, registry)
                if resp_schema.get('type') == 'array':
                    resp_array = True
                    items = resp_schema.get('items', {})
                    item_ctx = items.get('title') if isinstance(items.get('title'), str) else None
                    if item_ctx:
                        item_ctx = pascal(item_ctx)
                    else:
                        item_ctx = f'{op_pascal}{resp_code or ""}ResponseItem'
                    resp_item = registry.ts_type(items, item_ctx)

            op_data = {
                'id': oid,
                'method': method,
                'path': path,
                'summary': op.get('summary', ''),
                'description': op.get('description', ''),
                'params': params,
                'resp_type': resp_type,
                'resp_array': resp_array,
                'resp_item': resp_item,
                '_refs': refs,
            }
            # Assign to first tag only (like Java generator) to avoid
            # duplicate request interface exports across API classes.
            tag_ops[tags[0]].append(op_data)

    # ── Phase 2: Generate files ──────────────────────────────────────────────
    out = Path(output_dir)
    models_dir = out / 'models'
    apis_dir = out / 'apis'
    models_dir.mkdir(parents=True, exist_ok=True)
    apis_dir.mkdir(parents=True, exist_ok=True)

    # Models
    model_files: list[str] = []
    for name, schema in sorted(registry.models.items()):
        if not schema.get('properties'):
            continue
        content = gen_model(name, schema, registry, header)
        (models_dir / f'{name}.ts').write_text(content, encoding='utf-8')
        model_files.append(name)
        print(f'   [ok] models/{name}.ts')

    # Models index
    idx = '/* tslint:disable */\n/* eslint-disable */\n'
    for n in sorted(model_files):
        idx += f"export * from './{n}';\n"
    (models_dir / 'index.ts').write_text(idx, encoding='utf-8')

    # APIs
    api_files: list[str] = []
    total_ops = 0
    for tag, ops in sorted(tag_ops.items()):
        cls = pascal(tag) + 'Api'
        content = gen_api(tag, ops, registry, header)
        (apis_dir / f'{cls}.ts').write_text(content, encoding='utf-8')
        api_files.append(cls)
        total_ops += len(ops)
        print(f'   [ok] apis/{cls}.ts ({len(ops)} operations)')

    # APIs index
    idx = '/* tslint:disable */\n/* eslint-disable */\n'
    for n in sorted(api_files):
        idx += f"export * from './{n}';\n"
    (apis_dir / 'index.ts').write_text(idx, encoding='utf-8')

    # runtime.ts — copy from template, update BASE_PATH + version
    runtime_path = out / 'runtime.ts'
    template_path = Path(__file__).parent / 'runtime-template.ts'
    if template_path.exists():
        rt = template_path.read_text(encoding='utf-8')
    elif runtime_path.exists():
        rt = runtime_path.read_text(encoding='utf-8')
    else:
        print(f'   [ERROR] runtime-template.ts not found next to generator and runtime.ts not found in output!')
        sys.exit(1)
    rt = re.sub(r'export const BASE_PATH = "[^"]*"', f'export const BASE_PATH = "{base_path}"', rt)
    rt = re.sub(r'The version of the OpenAPI document: [^\n]*', f'The version of the OpenAPI document: {version}', rt)
    rt = re.sub(
        r'NOTE: This class is auto generated by OpenAPI Generator.*\n.*openapi-generator\.tech\n.*Do not edit the class manually\.',
        'NOTE: This class is auto generated by generate-ts-fetch-client.py\n * Do not edit the class manually.',
        rt
    )
    runtime_path.write_text(rt, encoding='utf-8')
    print(f'   [ok] runtime.ts ({"created" if not runtime_path.exists() else "updated"})')

    # Top-level index.ts
    (out / 'index.ts').write_text(
        "/* tslint:disable */\n/* eslint-disable */\nexport * from './runtime';\nexport * from './apis/index';\nexport * from './models/index';\n",
        encoding='utf-8'
    )

    print(f'\n[ok] Generated {len(model_files)} models, {len(api_files)} API classes, {total_ops} operations')
    return model_files, api_files


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(f'Usage: {sys.argv[0]} <spec-path> <output-dir>')
        sys.exit(1)
    generate(sys.argv[1], sys.argv[2])

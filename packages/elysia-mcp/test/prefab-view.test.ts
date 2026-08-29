// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * The prefab view — which payload shape becomes which UI.
 *
 * The shape rules are the whole contract here: everything else (component
 * props, wire format) is prefab's own, tested there.
 */

import { describe, it, expect } from 'bun:test'
import { PrefabApp, Column, Heading } from '@maxhealth.tech/prefab'
import { defaultView, labelFromToolName, prefabView, titleFromToolName, toolForm, uiToolMeta } from '../src/prefab-view'
import { Type } from '@sinclair/typebox'
import { executeTool, executeResourceResult } from '../src/executor'
import type { ResourceMetadata, ToolMetadata } from '../src/types'

const meta: ToolMetadata = { path: '/admin/roles', method: 'GET', handler: () => [], readOnly: true }
const context = { toolName: 'list_admin_roles', meta }

const ROWS = [{ name: 'admin', active: true }, { name: 'user', active: false }]

/** The component type prefab serialized, for asserting which renderer ran. */
function rootTypes(component: { toJSON(): unknown }): string {
  return JSON.stringify(component.toJSON())
}

describe('titleFromToolName', () => {
  it('drops the verb and reads the rest as a noun', () => {
    expect(titleFromToolName('list_admin_roles')).toBe('Admin roles')
    expect(titleFromToolName('create_admin_smart-apps')).toBe('Admin smart apps')
    expect(titleFromToolName('get_admin_branding')).toBe('Admin branding')
  })

  it('keeps a name that is only a verb', () => {
    expect(titleFromToolName('search')).toBe('Search')
  })
})

describe('defaultView', () => {
  it('renders a list of records as a table', () => {
    const view = defaultView(ROWS, context)
    expect(view).toBeDefined()
    expect(rootTypes(view!)).toContain('DataTable')
  })

  it('renders a single record as a detail view', () => {
    const view = defaultView({ name: 'admin', description: 'Full access' }, context)
    expect(rootTypes(view!)).toContain('Card')
  })

  it('unwraps an envelope that holds exactly one list', () => {
    const view = defaultView({ items: ROWS, total: 2 }, context)
    expect(rootTypes(view!)).toContain('DataTable')
  })

  it('treats a record holding two lists as a record, not a guess at which is the table', () => {
    const view = defaultView({ roles: ROWS, groups: ROWS }, context)
    expect(rootTypes(view!)).not.toContain('DataTable')
  })

  it('caps the rows it ships into the iframe', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ name: `role-${i}` }))
    const view = defaultView(many, context, { maxRows: 5 })
    const json = rootTypes(view!)
    expect(json).toContain('role-4')
    expect(json).not.toContain('role-5')
  })

  it('declines an empty list and an empty record', () => {
    expect(defaultView([], context)).toBeUndefined()
    expect(defaultView({}, context)).toBeUndefined()
  })
})

describe('prefabView', () => {
  it('emits the $prefab wire object', () => {
    const wire = prefabView()(ROWS, context)
    expect(wire).toBeDefined()
    expect(Object.keys(wire as Record<string, unknown>)).toContain('$prefab')
  })

  it('lets a custom renderer take over, and falls through when it declines', () => {
    const view = prefabView({
      render: (_payload, ctx) =>
        ctx.toolName === 'list_admin_roles' ? Column({ children: [Heading('Custom')] }) : undefined,
    })
    expect(JSON.stringify(view(ROWS, context))).toContain('Custom')
    expect(JSON.stringify(view(ROWS, { ...context, toolName: 'list_admin_users' }))).toContain('DataTable')
  })

  it('accepts a PrefabApp from a custom renderer without re-wrapping it', () => {
    const view = prefabView({ render: () => new PrefabApp({ title: 'Mine', view: Heading('Hi') }) })
    const wire = view(ROWS, context) as { view: { children: unknown[] } }
    expect(wire.view.children).toHaveLength(1)
    expect(JSON.stringify(wire.view.children[0])).toContain('Hi')
  })

  it('reports the payloads it could not render', () => {
    const skipped: string[] = []
    const view = prefabView({ onSkipped: ctx => skipped.push(ctx.toolName) })
    expect(view([], context)).toBeUndefined()
    expect(skipped).toEqual(['list_admin_roles'])
  })
})

describe('prefabView through executeTool', () => {
  it('puts the view in structuredContent and the data in the text block', async () => {
    const roles: ToolMetadata = { path: '/admin/roles', method: 'GET', handler: () => ROWS, readOnly: true }
    const result = await executeTool('list_admin_roles', roles, {}, undefined, undefined, { view: prefabView() })

    expect(Object.keys(result.structuredContent as Record<string, unknown>)).toContain('$prefab')
    expect(JSON.parse(result.content[0]?.text ?? '')).toEqual(ROWS)
  })

  it('leaves a scalar payload as it was', async () => {
    const ping: ToolMetadata = { path: '/admin/ping', method: 'GET', handler: () => 'pong', readOnly: true }
    const result = await executeTool('get_admin_ping', ping, {}, undefined, undefined, { view: prefabView() })
    expect(result.structuredContent).toBeUndefined()
    expect(result.content[0]?.text).toBe('pong')
  })
})

describe('prefabView through executeResourceResult', () => {
  it('renders the view from the payload, not from the encoded text', async () => {
    // A uniform list is exactly what `auto` encodes as TOON, which no longer
    // parses as JSON — the view has to be built before that choice is made.
    const rows = Array.from({ length: 12 }, (_, i) => ({ name: `role-${i}`, active: true }))
    const resource: ResourceMetadata = {
      path: '/admin/roles',
      method: 'GET',
      handler: () => rows,
      pathParams: [],
    }

    const result = await executeResourceResult(resource, {}, undefined, undefined, {
      textFormat: 'auto',
      view: prefabView(),
    })

    expect(() => JSON.parse(result.text) as unknown).toThrow()
    expect(Object.keys(result.structuredContent as Record<string, unknown>)).toContain('$prefab')
    expect(JSON.stringify(result.structuredContent)).toContain('role-11')
  })

  it('titles the view from the resource that answered, not from the calling tool', async () => {
    const resource: ResourceMetadata = {
      path: '/admin/smart-apps',
      method: 'GET',
      handler: () => [{ clientId: 'growth-chart' }],
      pathParams: [],
    }
    const result = await executeResourceResult(resource, {}, undefined, undefined, { view: prefabView() })
    expect(JSON.stringify(result.structuredContent)).toContain('Admin smart apps')
  })
})

describe('toolForm', () => {
  const createRole: ToolMetadata = {
    path: '/admin/roles',
    method: 'POST',
    handler: () => ({}),
    schema: Type.Object({
      name: Type.String({ title: 'Role name' }),
      description: Type.Optional(Type.String()),
      scope: Type.Optional(Type.Union([Type.Literal('realm'), Type.Literal('client')])),
    }),
  }

  const updateUser: ToolMetadata = {
    path: '/admin/users/:userId',
    method: 'PUT',
    handler: () => ({}),
    schema: Type.Object({ email: Type.String({ format: 'email' }) }),
    paramsSchema: Type.Object({ userId: Type.String() }),
  }

  it('asks for what the tool accepts, and submits to that tool', () => {
    const json = JSON.stringify(toolForm('create_admin_roles', createRole)!.toJSON())
    expect(json).toContain('create_admin_roles')
    expect(json).toContain('Role name')
    expect(json).toContain('description')
  })

  it('marks required arguments as required', () => {
    const form = JSON.parse(JSON.stringify(toolForm('create_admin_roles', createRole)!.toJSON())) as unknown
    const flat = JSON.stringify(form)
    // `name` is the only non-optional property in the schema.
    expect(flat).toContain('"required":true')
  })

  it('keeps path params as fields — they are arguments of the call', () => {
    const json = JSON.stringify(toolForm('update_admin_users_userId', updateUser)!.toJSON())
    expect(json).toContain('userId')
  })

  it('binds a form to one record by pre-filling', () => {
    const json = JSON.stringify(
      toolForm('update_admin_users_userId', updateUser, { values: { userId: 'abc123' } })!.toJSON(),
    )
    expect(json).toContain('abc123')
  })

  it('labels the submit button with the verb the tool name starts with', () => {
    expect(JSON.stringify(toolForm('create_admin_roles', createRole)!.toJSON())).toContain('Create')
    expect(JSON.stringify(toolForm('update_admin_users_userId', updateUser)!.toJSON())).toContain('Update')
  })

  it('declines a tool with no arguments a form can ask for', () => {
    const restart: ToolMetadata = { path: '/admin/restart', method: 'POST', handler: () => ({}) }
    expect(toolForm('create_admin_restart', restart)).toBeUndefined()
  })

  it('excludes what the caller already knows', () => {
    const json = JSON.stringify(
      toolForm('create_admin_roles', createRole, { exclude: ['description'] })!.toJSON(),
    )
    expect(json).not.toContain('description')
  })
})

describe('labelFromToolName', () => {
  it('keeps the verb, unlike a view title', () => {
    expect(labelFromToolName('create_admin_smart-apps')).toBe('Create admin smart apps')
    expect(titleFromToolName('create_admin_smart-apps')).toBe('Admin smart apps')
  })
})

describe('uiToolMeta', () => {
  it('points at the prefab viewer by default', () => {
    expect(uiToolMeta().ui.resourceUri).toStartWith('ui://')
  })

  it('takes a custom viewer uri', () => {
    expect(uiToolMeta('ui://custom/viewer')).toEqual({ ui: { resourceUri: 'ui://custom/viewer' } })
  })
})

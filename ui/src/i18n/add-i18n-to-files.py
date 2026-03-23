"""
Add useTranslation hook and wrap hardcoded JSX strings with t() calls.

This script processes React component files that don't yet use i18n:
1. Adds `import { useTranslation } from 'react-i18next'`
2. Adds `const { t } = useTranslation()` inside the component
3. Wraps user-visible hardcoded strings with `t('...')`

It handles:
- JSX text content: <Tag>Some text</Tag> → <Tag>{t('Some text')}</Tag>
- String props: title="Some text" → title={t('Some text')}
- Placeholder/label props: placeholder="text" → placeholder={t('text')}
"""

import os
import re
import json
import sys

UI_SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'components')

# Props that contain user-visible text and should be translated
TRANSLATABLE_PROPS = [
    'title', 'placeholder', 'label', 'description', 'alt',
    'aria-label', 'aria-placeholder', 'aria-description',
]

# Strings to SKIP (not user-visible)
SKIP_PATTERNS = [
    r'^https?://',        # URLs
    r'^/',                # paths
    r'^\d+$',            # pure numbers
    r'^#[0-9a-fA-F]+$',  # hex colors
    r'^[a-z]+-[a-z]+',   # CSS-like classes (kebab-case)
    r'^\s*$',            # whitespace only
    r'^[{}<>=/\.\,\;\:\|\&\!\?\+\-\*]+$',  # punctuation only
    r'^(true|false|null|undefined)$',  # JS literals
    r'^(GET|POST|PUT|DELETE|PATCH)$',  # HTTP methods
    r'^(sm|md|lg|xl|2xl|xs)$',  # size classes
    r'^(div|span|p|h[1-6]|button|input|form|label|select|option|table|tr|td|th|thead|tbody|ul|li|ol|a|img|svg|path|circle|rect)$',  # HTML tags
    r'^\w+\.\w+',        # dotted identifiers (e.g., foo.bar)
    r'^[a-z_]+$',        # lowercase_only identifiers
    r'^\w+:\/\/',         # protocol URLs
    r'^application\/',    # MIME types
    r'^data:',            # data URLs
    r'^Bearer ',          # auth headers
    r'^[A-Z_]+$',        # CONSTANT_CASE
    r'^\*$',             # wildcards
]

# Minimum length for translatable strings
MIN_STRING_LENGTH = 2

def should_skip_string(s):
    """Check if a string should NOT be wrapped with t()."""
    s = s.strip()
    if len(s) < MIN_STRING_LENGTH:
        return True
    for pattern in SKIP_PATTERNS:
        if re.match(pattern, s):
            return True
    # Skip if it looks like a className (space-separated CSS classes)
    if all(re.match(r'^[a-z0-9\-_/\[\]:]+$', part) for part in s.split()):
        if any(c in s for c in ['-', '/', '[', ':']):
            return True
    # Skip if it's a single word that looks like an identifier
    if re.match(r'^[a-z][a-zA-Z0-9]*$', s) and ' ' not in s:
        return True
    return False


def has_user_visible_text(s):
    """Check if string contains text a user would see (not just code/markup)."""
    s = s.strip()
    if not s:
        return False
    # Must contain at least one letter
    if not re.search(r'[a-zA-Z]', s):
        return False
    # Must start with an uppercase letter or be a common word
    if re.match(r'^[A-Z]', s):
        return True
    # Common patterns that are user-visible even lowercase
    if any(word in s.lower() for word in ['error', 'success', 'loading', 'save', 'cancel', 'delete',
                                           'create', 'update', 'add', 'remove', 'edit', 'search',
                                           'filter', 'select', 'enter', 'type', 'click', 'no ', 'yes',
                                           'failed', 'please', 'are you sure', 'confirm']):
        return True
    return False


def find_non_i18n_files(src_dir):
    """Find .tsx files that don't import useTranslation."""
    files = []
    for root, _, filenames in os.walk(src_dir):
        for f in filenames:
            if f.endswith('.tsx'):
                filepath = os.path.join(root, f)
                with open(filepath, 'r', encoding='utf-8') as fh:
                    content = fh.read()
                if 'useTranslation' not in content:
                    # Check if it has JSX (user-visible component)
                    if re.search(r'<\w+[\s>]', content):
                        files.append(filepath)
    return files


def add_use_translation_import(content):
    """Add useTranslation import to the file."""
    # Check if react-i18next is already imported
    if 'react-i18next' in content:
        return content
    
    # Find the last import line
    import_lines = list(re.finditer(r'^import\s+.*$', content, re.MULTILINE))
    if import_lines:
        last_import = import_lines[-1]
        insert_pos = last_import.end()
        content = (content[:insert_pos] + 
                   "\nimport { useTranslation } from 'react-i18next';" + 
                   content[insert_pos:])
    else:
        content = "import { useTranslation } from 'react-i18next';\n" + content
    return content


def add_use_translation_hook(content):
    """Add const { t } = useTranslation() inside the component function."""
    # Pattern: function ComponentName(...) { or const ComponentName = (...) => {
    # or export default function ... or export function ...
    
    # Try to find the component function body opening
    patterns = [
        # export default function Name() {
        r'(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*(?::\s*[^{]+)?\{)',
        # export function Name() {
        r'(export\s+function\s+\w+\s*\([^)]*\)\s*(?::\s*[^{]+)?\{)',
        # function Name() {
        r'(function\s+\w+\s*\([^)]*\)\s*(?::\s*[^{]+)?\{)',
        # const Name = (...) => {  (arrow with block body)
        r'((?:export\s+)?const\s+\w+\s*(?::\s*[^=]+)?\s*=\s*\([^)]*\)\s*(?::\s*[^=]+)?\s*=>\s*\{)',
        # const Name = () => {
        r'((?:export\s+)?const\s+\w+\s*=\s*\(\s*\)\s*=>\s*\{)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, content)
        if match:
            # Check if t is already destructured
            # Look in the next ~500 chars for existing const { t }
            after = content[match.end():match.end()+500]
            if re.search(r'const\s*\{\s*t\s*\}\s*=\s*useTranslation', after):
                return content
            
            insert_pos = match.end()
            indent = '  '  # Standard 2-space indent
            content = (content[:insert_pos] + 
                       f"\n{indent}const {{ t }} = useTranslation();" + 
                       content[insert_pos:])
            return content
    
    return content


def wrap_jsx_text_content(content):
    """Wrap hardcoded text in JSX with t() calls.
    
    Handles: <Tag>Some text</Tag> → <Tag>{t('Some text')}</Tag>
    """
    # Pattern: >text< where text is user-visible
    # Match text between > and < that isn't already wrapped in { }
    def replace_jsx_text(match):
        prefix = match.group(1)  # > or similar
        text = match.group(2)
        suffix = match.group(3)  # < or similar
        
        stripped = text.strip()
        if not stripped:
            return match.group(0)
        
        # Skip if already wrapped with { }
        if stripped.startswith('{') or stripped.endswith('}'):
            return match.group(0)
        
        # Skip if it's just whitespace + JSX expressions
        if '{' in stripped or '}' in stripped:
            return match.group(0)
            
        if should_skip_string(stripped) or not has_user_visible_text(stripped):
            return match.group(0)
        
        # Escape single quotes in the text
        escaped = stripped.replace("'", "\\'")
        
        # Preserve leading/trailing whitespace
        leading = text[:len(text) - len(text.lstrip())]
        trailing = text[len(text.rstrip()):]
        
        return f"{prefix}{leading}{{t('{escaped}')}}{trailing}{suffix}"
    
    # Match text between JSX tags: >text content here<
    # But NOT inside attributes or script blocks
    content = re.sub(
        r'(>)(\s*[A-Z][^<{]*?)(\s*<)',
        replace_jsx_text,
        content
    )
    
    return content


def wrap_string_props(content):
    """Wrap string prop values with t().
    
    Handles: title="Some text" → title={t('Some text')}
    """
    for prop in TRANSLATABLE_PROPS:
        # Match prop="text" or prop='text'
        def replace_prop(match):
            prop_name = match.group(1)
            quote = match.group(2)
            value = match.group(3)
            
            if should_skip_string(value) or not has_user_visible_text(value):
                return match.group(0)
            
            escaped = value.replace("'", "\\'")
            return f"{prop_name}={{t('{escaped}')}}"
        
        content = re.sub(
            rf'({prop})\s*=\s*(["\'])([^"\']+)\2',
            replace_prop,
            content
        )
    
    return content


def process_file(filepath):
    """Process a single file: add i18n imports and wrap strings."""
    with open(filepath, 'r', encoding='utf-8') as f:
        original = f.read()
    
    content = original
    
    # Step 1: Wrap JSX text content with t()
    content = wrap_jsx_text_content(content)
    content = wrap_string_props(content)
    
    # Only add imports if we actually added t() calls
    if content != original:
        content = add_use_translation_import(content)
        content = add_use_translation_hook(content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False


def main():
    files = find_non_i18n_files(UI_SRC)
    print(f"Found {len(files)} files without i18n")
    
    updated = 0
    for filepath in sorted(files):
        rel = os.path.relpath(filepath, os.path.join(UI_SRC, '..'))
        try:
            if process_file(filepath):
                print(f"  ✓ Updated: {rel}")
                updated += 1
            else:
                print(f"  - Skipped (no user-visible text): {rel}")
        except Exception as e:
            print(f"  ✗ Error in {rel}: {e}")
    
    print(f"\nDone: {updated}/{len(files)} files updated")


if __name__ == '__main__':
    main()

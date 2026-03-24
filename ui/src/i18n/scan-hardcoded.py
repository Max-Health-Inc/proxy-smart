"""
Scan all .tsx files in ui/src/components/ and report hardcoded user-visible
JSX strings that are NOT wrapped in t().

Output: file path, line number, the hardcoded text.
"""

import os
import re

UI_SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'components')

# Patterns that match t('...') wrapped strings (already i18n'd)
T_CALL = re.compile(r"""\bt\(\s*['"`]""")

# Match >Text< patterns (JSX text content)
JSX_TEXT = re.compile(r'>([^<>{}\n]+)</')

# Match translatable string props
PROP_TEXT = re.compile(r'(?:title|placeholder|label|description|alt|aria-label)\s*=\s*["\']([^"\']+)["\']')

SKIP_PATTERNS = [
    r'^https?://',
    r'^/',
    r'^\d+(\.\d+)*$',
    r'^#[0-9a-fA-F]+$',
    r'^\s*$',
    r'^[{}<>=/\.\,\;\:\|\&\!\?\+\-\*]+$',
    r'^(true|false|null|undefined)$',
    r'^(GET|POST|PUT|DELETE|PATCH)$',
    r'^(sm|md|lg|xl|2xl|xs)$',
    r'^\w+\.\w+',
    r'^[a-z_]+$',
    r'^[A-Z_]+$',
    r'^\*$',
    r'^v\d',
    r'^0x',
]

def should_skip(s):
    s = s.strip()
    if len(s) < 2:
        return True
    if not re.search(r'[a-zA-Z]', s):
        return True
    for p in SKIP_PATTERNS:
        if re.match(p, s):
            return True
    # Skip CSS-like class strings
    if all(re.match(r'^[a-z0-9\-_/\[\]:\.]+$', part) for part in s.split()):
        if any(c in s for c in ['-', '/', '[', ':', '.']):
            return True
    # Skip single lowercase word (identifier)
    if re.match(r'^[a-z][a-zA-Z0-9]*$', s) and ' ' not in s:
        return True
    return False

def has_visible_text(s):
    s = s.strip()
    if not s:
        return False
    if not re.search(r'[a-zA-Z]', s):
        return False
    if re.match(r'^[A-Z]', s):
        return True
    common = ['error', 'success', 'loading', 'save', 'cancel', 'delete',
              'create', 'update', 'add', 'remove', 'edit', 'search',
              'filter', 'select', 'enter', 'no ', 'yes', 'failed',
              'please', 'confirm', 'warning', 'info', 'enabled', 'disabled']
    if any(w in s.lower() for w in common):
        return True
    return False

def scan_file(filepath):
    findings = []
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    for i, line in enumerate(lines, 1):
        stripped = line.strip()

        # Skip comments, imports, type definitions
        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('import '):
            continue
        if stripped.startswith('type ') or stripped.startswith('interface ') or stripped.startswith('export type'):
            continue

        # Skip lines that already use t()
        if T_CALL.search(line):
            continue

        # Check JSX text content: >Text</
        for m in JSX_TEXT.finditer(line):
            text = m.group(1).strip()
            if text and not should_skip(text) and has_visible_text(text):
                findings.append((i, 'JSX text', text))

        # Check string props
        for m in PROP_TEXT.finditer(line):
            text = m.group(1).strip()
            if text and not should_skip(text) and has_visible_text(text):
                # Make sure it's not already inside t()
                start = m.start()
                preceding = line[max(0, start-5):start]
                if "t('" not in preceding and 't("' not in preceding:
                    findings.append((i, 'prop', text))

    return findings

def main():
    total_findings = 0
    files_with_issues = 0

    for root, _, files in os.walk(UI_SRC):
        for f in sorted(files):
            if not f.endswith('.tsx'):
                continue
            filepath = os.path.join(root, f)
            findings = scan_file(filepath)
            if findings:
                files_with_issues += 1
                rel = os.path.relpath(filepath, os.path.join(UI_SRC, '..'))
                print(f"\n{'='*80}")
                print(f"📄 {rel}  ({len(findings)} hardcoded strings)")
                print(f"{'='*80}")
                for line_no, kind, text in findings:
                    total_findings += 1
                    print(f"  L{line_no:>4} [{kind:>8}]  \"{text}\"")

    print(f"\n{'='*80}")
    print(f"SUMMARY: {total_findings} hardcoded strings in {files_with_issues} files")
    print(f"{'='*80}")

if __name__ == '__main__':
    main()

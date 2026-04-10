"""
Fix issues introduced by the add-i18n-to-files.py script:
1. useTranslation import inserted inside another multi-line import block
2. t() wrapping non-translatable text like TypeScript types (e.g., t('Promise'))
"""
import re
import os

src = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'components')
fixed_files = 0

def fix_misplaced_import(content):
    """Fix useTranslation import that was inserted inside another import block."""
    # Pattern: import { useTranslation } from 'react-i18next'; appearing inside another import
    # e.g.:
    #   import type {
    #   import { useTranslation } from 'react-i18next';
    #     SomeType,
    
    # Remove the misplaced import line
    bad_import = "import { useTranslation } from 'react-i18next';\n"
    
    if bad_import not in content:
        return content
    
    # Check if it's inside another import (preceded by an unclosed import)
    lines = content.split('\n')
    new_lines = []
    removed = False
    import_to_add = False
    
    in_import = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # Track if we're inside a multi-line import
        if re.match(r'^import\s+(type\s+)?{', stripped) and '}' not in stripped:
            in_import = True
        
        if in_import and stripped == "import { useTranslation } from 'react-i18next';":
            # This is misplaced - skip it and mark for re-adding
            removed = True
            import_to_add = True
            continue
        
        if in_import and '}' in stripped:
            in_import = False
        
        new_lines.append(line)
    
    if not removed:
        return content
    
    # Now re-add the import at the right place (after all imports)
    content = '\n'.join(new_lines)
    
    if import_to_add:
        # Find the last import line
        lines = content.split('\n')
        last_import_idx = -1
        in_import = False
        for i, line in enumerate(lines):
            stripped = line.strip()
            if re.match(r'^import\s+', stripped):
                if '{' in stripped and '}' not in stripped:
                    in_import = True
                    last_import_idx = i
                else:
                    in_import = False
                    last_import_idx = i
            elif in_import:
                if '}' in stripped:
                    in_import = False
                    last_import_idx = i
        
        if last_import_idx >= 0:
            # Check if useTranslation import already exists properly
            has_proper_import = any(
                "import { useTranslation } from 'react-i18next'" in l 
                for l in lines
            )
            if not has_proper_import:
                lines.insert(last_import_idx + 1, "import { useTranslation } from 'react-i18next';")
            content = '\n'.join(lines)
    
    return content


def fix_bad_t_calls(content):
    """Remove t() wrapping from non-translatable text like TypeScript types."""
    # Fix {t('Promise')}<void> → Promise<void>
    content = re.sub(r"\{t\('Promise'\)\}", 'Promise', content)
    
    # Fix other obvious non-translatable t() wrappings in type positions
    # Pattern: t('SomeType') in a TypeScript type context (after : or in <>)
    
    return content


def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        original = f.read()
    
    content = original
    content = fix_misplaced_import(content)
    content = fix_bad_t_calls(content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False


count = 0
for root, _, files in os.walk(src):
    for f in sorted(files):
        if not f.endswith('.tsx'):
            continue
        fp = os.path.join(root, f)
        rel = os.path.relpath(fp, os.path.join(src, '..'))
        if process_file(fp):
            count += 1
            print(f"  Fixed: {rel}")

print(f"\nFixed {count} files")

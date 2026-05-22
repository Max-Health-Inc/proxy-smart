"""
Fix t() calls where the string literal itself spans multiple lines.
Legitimate: t('text {{var}}', {\n  var: value\n}) - multi-line object param OK
Broken:     t('some long text\n  continues here') - string has literal newline
"""
import re
import os

src = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'components')
fixed = 0

for root, _, files in os.walk(src):
    for f in files:
        if not f.endswith('.tsx'):
            continue
        fp = os.path.join(root, f)
        with open(fp, 'r', encoding='utf-8') as fh:
            content = fh.read()
        
        original = content
        
        # Find t('...multi-line string...') where the string itself breaks across lines
        # Pattern: t(' followed by text that doesn't close the string on the same line
        # Then continues on next lines until we find the closing quote + )
        
        # Match t('string that\n continues\n here')
        # But NOT t('string', {\n  key: val\n})  (args on new lines is fine)
        
        def fix_multiline_string(match):
            global fixed
            full = match.group(0)
            quote = match.group(1)  # ' or "
            string_content = match.group(2)
            
            # If the string content has newlines, join them
            if '\n' in string_content:
                # Collapse the multi-line string into one line
                cleaned = re.sub(r'\s*\n\s*', ' ', string_content)
                cleaned = re.sub(r'\s+', ' ', cleaned)
                fixed += 1
                return f"t({quote}{cleaned}{quote}"
            return full
        
        # Match t('...' where ... may span multiple lines, ending with ')
        # We need to be careful: t('text', { ... }) has the quote closed on first line
        # The broken case is t('text\nmore text')
        content = re.sub(
            r"""t\((['"])((?:(?!\1).)*?\n(?:(?!\1).)*?)\1""",
            fix_multiline_string,
            content,
            flags=re.DOTALL
        )
        
        if content != original:
            with open(fp, 'w', encoding='utf-8') as fh:
                fh.write(content)
            rel = os.path.relpath(fp, os.path.join(src, '..'))
            print(f"  Fixed: {rel}")

print(f"\nFixed {fixed} multi-line string(s)")

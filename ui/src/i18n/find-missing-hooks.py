"""
Find files that call t() but don't have const { t } = useTranslation() properly set up.
Then fix them.
"""
import re
import os

src = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'components')

for root, _, files in os.walk(src):
    for f in sorted(files):
        if not f.endswith('.tsx'):
            continue
        fp = os.path.join(root, f)
        with open(fp, 'r', encoding='utf-8') as fh:
            content = fh.read()
        
        # Check if file uses t() but doesn't have the hook
        has_t_call = bool(re.search(r'\bt\(', content))
        has_hook = bool(re.search(r'const\s*\{\s*t\s*\}\s*=\s*useTranslation', content))
        has_import = 'useTranslation' in content
        
        if has_t_call and not has_hook:
            rel = os.path.relpath(fp, os.path.join(src, '..'))
            print(f"  MISSING HOOK: {rel} (import={has_import})")

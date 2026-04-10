"""Find t() calls that span multiple lines (broken strings)."""
import re
import os

src = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'components')

for root, _, files in os.walk(src):
    for f in files:
        if not f.endswith('.tsx'):
            continue
        fp = os.path.join(root, f)
        with open(fp, 'r', encoding='utf-8') as fh:
            lines = fh.readlines()
        
        for i, line in enumerate(lines, 1):
            # Check if line has an opening t(' or t(" without closing on same line
            if re.search(r"""\bt\(\s*['"]""", line):
                # Check if the t() call is NOT closed on this line
                # Simple check: count opening t(' and closing ')
                opens = len(re.findall(r"""\bt\(\s*['"]""", line))
                closes = len(re.findall(r"""['"]\s*\)""", line))
                if opens > closes:
                    rel = os.path.relpath(fp, os.path.join(src, '..'))
                    text = line.strip()[:80]
                    print(f"  {rel}:{i}: {text}")

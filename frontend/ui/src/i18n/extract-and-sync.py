"""
Extract all t() keys from source code and sync en.json / de.json.
Keys are the English text itself (self-referencing in en.json).
"""
import os
import re
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(SCRIPT_DIR, "..", "..")  # ui/src
SRC_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, "..", ".."))
TRANSLATIONS_DIR = os.path.join(SCRIPT_DIR, "translations")
EN_FILE = os.path.join(TRANSLATIONS_DIR, "en.json")
DE_FILE = os.path.join(TRANSLATIONS_DIR, "de.json")

# Regex to match t('key') or t("key") — captures single-line keys
# We use a non-greedy match for the content between quotes
PATTERN = re.compile(r"""\bt\(\s*(['"])((?:(?!\1).)*?)\1""", re.DOTALL)


def find_keys(src_dir):
    keys = set()
    for root, _, files in os.walk(src_dir):
        for f in files:
            if not (f.endswith(".tsx") or f.endswith(".ts")):
                continue
            if f.endswith((".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx")):
                continue
            path = os.path.join(root, f)
            try:
                content = open(path, encoding="utf-8").read()
            except Exception:
                continue
            if "useTranslation" not in content and "i18next" not in content:
                continue
            for m in PATTERN.finditer(content):
                key = m.group(2).strip()
                if key and len(key) >= 2:
                    keys.add(key)
    return keys


def sync_file(keys, filepath, is_english=True):
    """Sync a translation file. For English: key=key. For others: keep existing, add key=key for missing."""
    existing = {}
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            try:
                existing = json.load(f)
            except json.JSONDecodeError:
                existing = {}

    updated = {}
    added = 0
    removed = 0

    for key in sorted(keys):
        if key in existing:
            if is_english:
                updated[key] = key  # en.json: always key=key
            else:
                updated[key] = existing[key]
        else:
            updated[key] = key  # New key: use the key itself as placeholder
            added += 1

    removed = len(existing) - (len(existing) - added)  # keys in existing not in keys
    removed = len(set(existing.keys()) - keys)

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(updated, f, ensure_ascii=False, indent=2)
        f.write("\n")

    return added, removed


def main():
    print(f"Scanning {SRC_DIR} for t() keys...")
    keys = find_keys(os.path.join(SRC_DIR, "src"))
    print(f"Found {len(keys)} unique keys.\n")

    # Sync en.json
    added_en, removed_en = sync_file(keys, EN_FILE, is_english=True)
    print(f"en.json: +{added_en} added, -{removed_en} removed, {len(keys)} total")

    # Sync de.json
    added_de, removed_de = sync_file(keys, DE_FILE, is_english=False)
    print(f"de.json: +{added_de} added, -{removed_de} removed, {len(keys)} total")

    # Show some sample keys
    print(f"\nSample keys:")
    for k in sorted(keys)[:15]:
        print(f"  {k}")
    if len(keys) > 15:
        print(f"  ... and {len(keys) - 15} more")


if __name__ == "__main__":
    main()

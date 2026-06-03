"""
Extract all t() keys from source code and sync translations.json.
DRY format: single file, key = English text, value = [de, ...] translations array.
English is never stored — i18next returns the key itself as fallback.
"""
import os
import re
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, "..", ".."))
TRANSLATIONS_FILE = os.path.join(SCRIPT_DIR, "translations", "translations.json")

# Supported non-English languages (order matches array index in translations.json)
LANGUAGES = ["de"]

# Regex to match t('key') or t("key") — captures single-line keys
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


def sync_translations(keys):
    """Sync translations.json — preserves existing translations, adds new keys with null, removes orphans."""
    existing = {}
    if os.path.exists(TRANSLATIONS_FILE):
        with open(TRANSLATIONS_FILE, "r", encoding="utf-8") as f:
            try:
                existing = json.load(f)
            except json.JSONDecodeError:
                existing = {}

    # Remove metadata key before processing
    existing.pop("_languages", None)

    updated = {"_languages": LANGUAGES}
    added = 0
    removed = 0
    num_langs = len(LANGUAGES)

    for key in sorted(keys):
        if key in existing:
            # Preserve existing translations, pad to correct length if needed
            val = existing[key]
            if isinstance(val, list):
                # Ensure array is the right length
                while len(val) < num_langs:
                    val.append(None)
                updated[key] = val[:num_langs]
            else:
                updated[key] = [None] * num_langs
        else:
            # New key — no translations yet
            updated[key] = [None] * num_langs
            added += 1

    removed = len(set(existing.keys()) - keys)

    with open(TRANSLATIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(updated, f, ensure_ascii=False, indent=2)
        f.write("\n")

    return added, removed


def main():
    print(f"Scanning {SRC_DIR} for t() keys...")
    keys = find_keys(os.path.join(SRC_DIR, "src"))
    print(f"Found {len(keys)} unique keys.\n")

    added, removed = sync_translations(keys)
    translated = 0
    untranslated = 0

    # Count translation coverage
    if os.path.exists(TRANSLATIONS_FILE):
        with open(TRANSLATIONS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        for key, val in data.items():
            if key == "_languages":
                continue
            if isinstance(val, list) and val[0] is not None:
                translated += 1
            else:
                untranslated += 1

    print(f"translations.json: +{added} added, -{removed} removed, {len(keys)} total")
    print(f"Coverage: {translated} translated, {untranslated} untranslated ({translated * 100 // max(len(keys), 1)}%)")

    print(f"\nSample keys:")
    for k in sorted(keys)[:15]:
        print(f"  {k}")
    if len(keys) > 15:
        print(f"  ... and {len(keys) - 15} more")


if __name__ == "__main__":
    main()

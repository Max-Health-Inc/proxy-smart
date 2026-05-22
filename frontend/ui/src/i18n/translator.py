"""
translator.py — Translate untranslated keys in non-English JSON files.

Detection: a key is untranslated when value == key (self-referencing)
           OR value starts with "TODO: Translate".

Uses g4f (auto-provider selection) to translate in batches.
"""
import os
import re
import shutil
import json
import sys
import time
from g4f.client import Client

BATCH_SIZE = 50  # keys per translation request
MAX_RETRIES = 3  # retries per batch on failure

# Initialize the client
client = Client()

# Directory containing translation files (absolute path)
script_dir = os.path.dirname(os.path.abspath(__file__))
translations_dir = os.path.join(script_dir, "translations")

# Language name mapping for better prompts
LANG_NAMES = {
    "de": "German",
    "fr": "French",
    "es": "Spanish",
    "it": "Italian",
    "ar": "Arabic",
    "pt": "Portuguese",
    "nl": "Dutch",
    "ja": "Japanese",
    "zh": "Chinese",
    "ko": "Korean",
}


def read_json_file(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            content = file.read().strip()
            if not content:
                return {}
            return json.loads(content)
    except json.JSONDecodeError as e:
        print(f"Error reading JSON file {file_path}: {e}")
        return {}


def write_json_file(file_path, data):
    try:
        with open(file_path, "w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, indent=2)
            file.write("\n")
        print(f"  Wrote {file_path}")
    except Exception as e:
        print(f"  Error writing {file_path}: {e}")


def is_untranslated(key, value):
    """A key is untranslated if value == key (self-referencing) or starts with TODO."""
    if not isinstance(value, str):
        return False
    return value == key or value.startswith("TODO: Translate")


def prepare_translation_data():
    """Find all untranslated keys per non-English language file."""
    if not os.path.exists(translations_dir):
        raise FileNotFoundError(f"Translations directory not found: {translations_dir}")

    files = [f for f in os.listdir(translations_dir) if f.endswith(".json")]
    translation_data = {}

    for file in files:
        lang = os.path.splitext(file)[0]
        if lang == "en":
            continue

        file_path = os.path.join(translations_dir, file)
        data = read_json_file(file_path)

        keys_to_translate = {k: v for k, v in data.items() if is_untranslated(k, v)}

        if keys_to_translate:
            translation_data[lang] = keys_to_translate
            print(f"  {lang}: {len(keys_to_translate)} keys need translation")

    return translation_data


def extract_json_from_response(text):
    """Extract JSON object from a response that may contain markdown fences."""
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    brace_start = text.find("{")
    brace_end = text.rfind("}")
    if brace_start != -1 and brace_end != -1:
        try:
            return json.loads(text[brace_start : brace_end + 1])
        except json.JSONDecodeError:
            pass

    return None


def translate_batch(batch_dict, lang):
    """Translate a batch of keys using g4f auto-provider selection."""
    lang_name = LANG_NAMES.get(lang, lang)

    prompt = (
        f"Translate the following JSON object values from English to {lang_name}. "
        "Keep ALL keys exactly the same (unchanged). Only translate the values. "
        "Keep technical terms (FHIR, SMART, OAuth, mTLS, PKCE, JWKS, LDAP, MCP, IAL, etc.) untranslated. "
        "Keep placeholder patterns like {{name}}, {{count}}, {{error}} etc. exactly as-is. "
        "Return ONLY a valid JSON object, no explanation:\n\n"
        f"{json.dumps(batch_dict, ensure_ascii=False, indent=2)}"
    )

    for attempt in range(MAX_RETRIES):
        try:
            response = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            f"You are a professional translator. Translate JSON values to {lang_name}. "
                            "Return only valid JSON. Keep keys unchanged. Keep technical terms untranslated."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                web_search=False,
            )
            raw = response.choices[0].message.content.strip()
            parsed = extract_json_from_response(raw)
            if parsed and isinstance(parsed, dict) and len(parsed) >= len(batch_dict) * 0.7:
                return parsed
            else:
                print(f"(parse issue, retry {attempt+1})", end=" ", flush=True)
        except Exception as e:
            print(f"(error: {str(e)[:60]}, retry {attempt+1})", end=" ", flush=True)
        time.sleep(2)

    return None


def translate_language(lang, keys_to_translate):
    """Translate all untranslated keys for a language, in batches."""
    file_path = os.path.join(translations_dir, f"{lang}.json")
    full_data = read_json_file(file_path)
    keys = list(keys_to_translate.keys())
    total = len(keys)
    translated_count = 0
    total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE

    print(f"\nTranslating {total} keys to {LANG_NAMES.get(lang, lang)} in {total_batches} batches...")

    for i in range(0, total, BATCH_SIZE):
        batch_keys = keys[i : i + BATCH_SIZE]
        batch_dict = {k: keys_to_translate[k] for k in batch_keys}
        batch_num = i // BATCH_SIZE + 1

        print(f"  Batch {batch_num}/{total_batches} ({len(batch_dict)} keys)...", end=" ", flush=True)

        result = translate_batch(batch_dict, lang)

        if result:
            batch_translated = 0
            for k in batch_keys:
                if k in result and isinstance(result[k], str) and result[k] != k:
                    full_data[k] = result[k]
                    translated_count += 1
                    batch_translated += 1
            print(f"OK +{batch_translated} ({translated_count}/{total} total)")

            # Save progress after each successful batch
            sorted_data = dict(sorted(full_data.items()))
            write_json_file(file_path, sorted_data)
        else:
            print(f"FAILED after {MAX_RETRIES} retries")

        # Delay between batches
        if i + BATCH_SIZE < total:
            time.sleep(2)

    return translated_count, total


def main():
    print("=" * 60)
    print("Translation Runner (g4f auto-provider)")
    print("=" * 60)

    translation_data = prepare_translation_data()

    if not translation_data:
        print("All translations are up to date!")
        return

    for lang, keys_to_translate in translation_data.items():
        translated, total = translate_language(lang, keys_to_translate)
        print(f"\n{lang}: Translated {translated}/{total} keys")

    print("\nTranslation process completed.")


if __name__ == "__main__":
    main()

    # ─── CLEANUP g4f artifacts from both script dir and CWD ─────────────────
    for base in [script_dir, os.getcwd()]:
        for temp_dir in ["generated_media", "har_and_cookies"]:
            temp_path = os.path.join(base, temp_dir)
            if os.path.isdir(temp_path):
                shutil.rmtree(temp_path)
                print(f"Removed leftover directory: {temp_path}")

    # ─── CLOSE GPT-5 CLIENT SESSION ─────────────────────────────────────────
    try:
        # g4f.Client often stores its aiohttp.ClientSession in ._session or .session
        session = getattr(client, "_session", None) or getattr(client, "session", None)
        if session and not getattr(session, "closed", True):
            session.close()
            print("Closed g4f client session.")
        # and close the connector if present
        connector = getattr(session, "connector", None)
        if connector and not getattr(connector, "closed", True):
            connector.close()
            print("Closed aiohttp connector.")
    except Exception as e:
        print(f"Error closing client session/connector: {e}")

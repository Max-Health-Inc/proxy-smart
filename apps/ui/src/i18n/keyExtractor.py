import os
import re
import json

# Directory containing the source code (adjust this path as needed)
root_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(root_dir, "src")
translations_dir = os.path.join(root_dir, "translations")
en_translation_file = os.path.join(translations_dir, "en.json")

translation_key_regex = r'(?<![A-Za-z0-9])t\(\s*(?:["\'`])([A-Za-z0-9_.\-\s]{2,})["\'`]\s*\)'

# Function to flatten a nested dictionary
def flatten_dict(d, parent_key="", sep="."):
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


# Function to unflatten a flattened dictionary
def unflatten_dict(d, sep="."):
    result = {}
    for key, value in d.items():
        # Split the key by the separator and filter out empty parts
        parts = [part for part in key.split(sep) if part.strip()]
        d_ref = result
        for part in parts[:-1]:
            d_ref = d_ref.setdefault(part, {})
        d_ref[parts[-1]] = value
    return result


# Function to find the `src` directory by walking upwards
def find_src_directory(start_dir):
    current_dir = start_dir
    while current_dir != os.path.dirname(current_dir):  # Stop at the root directory
        if "src" in os.listdir(
            current_dir
        ):  # Check if `src` exists in the current directory
            return os.path.join(current_dir, "src")
        current_dir = os.path.dirname(current_dir)  # Move one level up
    raise FileNotFoundError("`src` directory not found in the directory tree.")


# Function to recursively walk through directories and find .tsx and .ts files
def find_translation_keys(directory):
    keys = set()
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(".tsx") or file.endswith(".ts"):
                file_path = os.path.join(root, file)
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    # Ensure the file contains "i18n" before extracting keys
                    if "i18n" in content:
                        # now findall returns a list of strings, not tuples
                        matches = re.findall(translation_key_regex, content)
                        for key in matches:
                            keys.add(key)
    return keys


def update_translation_file(keys, en_translation_file):
    if not os.path.exists(en_translation_file):
        print(f"Translation file not found: {en_translation_file}")
        return

    # Read the existing en.json file
    with open(en_translation_file, "r", encoding="utf-8") as f:
        try:
            translations = json.load(f)
        except json.JSONDecodeError as e:
            print(f"Error reading translation file: {e}")
            translations = {}

    # Flatten the translations for easier comparison
    flattened_translations = flatten_dict(translations)

    # Add missing keys with a placeholder
    updated = False
    missing_keys_count = 0
    for key in keys:
        if key not in flattened_translations:
            flattened_translations[key] = f"TODO: Translate {key}"
            updated = True
            missing_keys_count += 1

    # Remove unused keys
    unused_keys = set(flattened_translations.keys()) - keys
    for key in unused_keys:
        del flattened_translations[key]
        updated = True

    # Unflatten the translations back to their original structure
    updated_translations = unflatten_dict(flattened_translations)

    # Write back the updated en.json file
    if updated:
        with open(en_translation_file, "w", encoding="utf-8") as f:
            json.dump(updated_translations, f, ensure_ascii=False, indent=2)
        print(f"Updated {en_translation_file}:")
        print(f"  - Added {missing_keys_count} missing keys.")
        print(f"  - Removed {len(unused_keys)} unused keys.")
    else:
        print("No changes needed. Translation file is already in sync.")

# Main function
def main():
    # Start from the current directory and walk upwards to find `src`
    start_dir = os.path.dirname(os.path.abspath(__file__))
    try:
        src_dir = find_src_directory(start_dir)
        print(f"Found `src` directory at: {src_dir}")
    except FileNotFoundError as e:
        print(e)
        return

    print("Scanning for translation keys...")
    keys = find_translation_keys(src_dir)
    print(f"Found {len(keys)} translation keys.")
    update_translation_file(keys, en_translation_file)
    print("Translation keys synced successfully.")


if __name__ == "__main__":
    main()

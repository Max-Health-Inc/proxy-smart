import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const translationsDir = path.join(__dirname, './translations');

// Function to read JSON file
const readJsonFile = (filePath) => {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

// Function to write JSON file
const writeJsonFile = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};
// Helper function to recursively collect all keys from a nested object
const collectKeys = (obj, prefix = '') => {
  const keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys.push(...collectKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
};

// Helper function to recursively add missing keys to a nested object
const addMissingKeys = (obj, allKeys, prefix = '') => {
  let updated = false;
  allKeys.forEach((key) => {
    const parts = key.split('.');
    let current = obj;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        if (!current.hasOwnProperty(part)) {
          current[part] = `TODO: Translate ${key}`;
          updated = true;
        }
      } else {
        if (!current.hasOwnProperty(part) || typeof current[part] !== 'object' || current[part] === null) {
          current[part] = {};
          updated = true;
        }
        current = current[part];
      }
    }
  });
  return updated;
};

// Main function to sync translations
const syncTranslations = () => {
  // Get all JSON files in the translations directory
  const files = fs.readdirSync(translationsDir).filter((file) => file.endsWith('.json'));

  // Read all translation files
  const translations = files.reduce((acc, file) => {
    const lang = path.basename(file, '.json'); // Extract language code from file name
    const filePath = path.join(translationsDir, file);
    acc[lang] = readJsonFile(filePath);
    return acc;
  }, {});

  // Collect all keys from all translation files
  const allKeys = new Set();
  Object.values(translations).forEach((translation) => {
    collectKeys(translation).forEach((key) => allKeys.add(key));
  });

  // Add missing keys to each translation file
  files.forEach((file) => {
    const lang = path.basename(file, '.json');
    const filePath = path.join(translationsDir, file);
    const translation = translations[lang];

    const updated = addMissingKeys(translation, allKeys);

    if (updated) {
      writeJsonFile(filePath, translation);
      console.log(`Updated ${file} with missing keys.`);
    }
  });

  console.log('Translation files are in sync.');
};

// Run the main function if the script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncTranslations();
}
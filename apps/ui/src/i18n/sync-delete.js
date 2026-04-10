import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Directory containing translation files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const translationsDir = path.join(__dirname, './translations');
const sourceFile = path.join(translationsDir, 'en.json');

// Read the source file (en.json)
const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

// Function to recursively remove keys not in the source file
function removeExtraKeys(source, target) {
    const updatedTarget = {};
    for (const key in target) {
        if (source.hasOwnProperty(key)) {
            if (typeof source[key] === 'object' && typeof target[key] === 'object') {
                // Recursively process nested objects
                updatedTarget[key] = removeExtraKeys(source[key], target[key]);
            } else {
                // Keep the key if it exists in the source
                updatedTarget[key] = target[key];
            }
        }
    }
    return updatedTarget;
}

// Process all translation files
fs.readdirSync(translationsDir).forEach((file) => {
    if (file !== 'en.json' && file.endsWith('.json')) {
        const filePath = path.join(translationsDir, file);
        const targetData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Remove keys not in the source file
        const updatedData = removeExtraKeys(sourceData, targetData);

        // Write the updated file
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
        console.log(`Synced: ${file}`);
    }
});

console.log('Translation files synced successfully!');
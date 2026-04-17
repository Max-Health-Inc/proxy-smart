/**
 * ValueSet: SNOMEDCTAdditionalDosageInstructions
 * URL: http://hl7.org/fhir/ValueSet/additional-instruction-codes
 * Size: 43 concepts
 */
export const SNOMEDCTAdditionalDosageInstructionsConcepts = [
    { code: "419492006", system: "http://snomed.info/sct", display: "Additional dosage instructions (qualifier value)" },
    { code: "311501008", system: "http://snomed.info/sct", display: "Half to one hour before food" },
    { code: "311504000", system: "http://snomed.info/sct", display: "With or after food" },
    { code: "417929005", system: "http://snomed.info/sct", display: "Times (qualifier value)" },
    { code: "417980006", system: "http://snomed.info/sct", display: "Contains aspirin (qualifier value)" },
    { code: "417995008", system: "http://snomed.info/sct", display: "Dissolve or mix with water before taking (qualifier value)" },
    { code: "418071006", system: "http://snomed.info/sct", display: "Warning. Causes drowsiness which may continue the next day. If affected do not drive or operate machinery. Avoid alcoholic drink (qualifier value)" },
    { code: "418194009", system: "http://snomed.info/sct", display: "Contains an aspirin-like medicine (qualifier value)" },
    { code: "418281004", system: "http://snomed.info/sct", display: "Do not take anything containing aspirin while taking this medicine (qualifier value)" },
    { code: "418443006", system: "http://snomed.info/sct", display: "Do not take more than . . . in 24 hours or . . . in any one week (qualifier value)" },
    { code: "418521000", system: "http://snomed.info/sct", display: "Avoid exposure of skin to direct sunlight or sun lamps (qualifier value)" },
    { code: "418577003", system: "http://snomed.info/sct", display: "Take at regular intervals. Complete the prescribed course unless otherwise directed (qualifier value)" },
    { code: "418637003", system: "http://snomed.info/sct", display: "Do not take with any other paracetamol products (qualifier value)" },
    { code: "418639000", system: "http://snomed.info/sct", display: "Warning. May cause drowsiness (qualifier value)" },
    { code: "418693002", system: "http://snomed.info/sct", display: "Swallowed whole, not chewed (qualifier value)" },
    { code: "418849000", system: "http://snomed.info/sct", display: "Warning. Follow the printed instructions you have been given with this medicine (qualifier value)" },
    { code: "418850000", system: "http://snomed.info/sct", display: "Contains aspirin and paracetamol. Do not take with any other paracetamol products (qualifier value)" },
    { code: "418914006", system: "http://snomed.info/sct", display: "Warning. May cause drowsiness. If affected do not drive or operate machinery. Avoid alcoholic drink (qualifier value)" },
    { code: "418954008", system: "http://snomed.info/sct", display: "Warning. May cause drowsiness. If affected do not drive or operate machinery (qualifier value)" },
    { code: "418991002", system: "http://snomed.info/sct", display: "Sucked or chewed (qualifier value)" },
    { code: "419111009", system: "http://snomed.info/sct", display: "Allow to dissolve under the tongue. Do not transfer from this container. Keep tightly closed. Discard eight weeks after opening (qualifier value)" },
    { code: "419115000", system: "http://snomed.info/sct", display: "Do not take milk, indigestion remedies, or medicines containing iron or zinc at the same time of day as this medicine (qualifier value)" },
    { code: "419303009", system: "http://snomed.info/sct", display: "With plenty of water (qualifier value)" },
    { code: "419437002", system: "http://snomed.info/sct", display: "Do not take more than 2 at any one time. Do not take more than 8 in 24 hours (qualifier value)" },
    { code: "419439004", system: "http://snomed.info/sct", display: "Caution flammable: keep away from fire or flames (qualifier value)" },
    { code: "419444006", system: "http://snomed.info/sct", display: "Do not stop taking this medicine except on your doctor's advice (qualifier value)" },
    { code: "419473009", system: "http://snomed.info/sct", display: "Each (qualifier value)" },
    { code: "419529008", system: "http://snomed.info/sct", display: "Dissolved under the tongue (qualifier value)" },
    { code: "419822006", system: "http://snomed.info/sct", display: "Warning. Avoid alcoholic drink (qualifier value)" },
    { code: "419974005", system: "http://snomed.info/sct", display: "This medicine may colour the urine (qualifier value)" },
    { code: "420003005", system: "http://snomed.info/sct", display: "Do not take more than . . . in 24 hours (qualifier value)" },
    { code: "420082003", system: "http://snomed.info/sct", display: "Do not take indigestion remedies or medicines containing iron or zinc at the same time of day as this medicine (qualifier value)" },
    { code: "420110001", system: "http://snomed.info/sct", display: "Do not take indigestion remedies at the same time of day as this medicine (qualifier value)" },
    { code: "420162004", system: "http://snomed.info/sct", display: "To be spread thinly (qualifier value)" },
    { code: "420652005", system: "http://snomed.info/sct", display: "Until gone - dosing instruction fragment (qualifier value)" },
    { code: "421484000", system: "http://snomed.info/sct", display: "Then discontinue - dosing instruction fragment (qualifier value)" },
    { code: "421769005", system: "http://snomed.info/sct", display: "Follow directions (qualifier value)" },
    { code: "421984009", system: "http://snomed.info/sct", display: "Until finished - dosing instruction fragment (qualifier value)" },
    { code: "422327006", system: "http://snomed.info/sct", display: "Then stop - dosing instruction fragment (qualifier value)" },
    { code: "428579001", system: "http://snomed.info/sct", display: "Use with caution (qualifier value)" },
    { code: "717154004", system: "http://snomed.info/sct", display: "Take on an empty stomach (qualifier value)" },
    { code: "1287351008", system: "http://snomed.info/sct", display: "Until next appointment" },
    { code: "1287353006", system: "http://snomed.info/sct", display: "Until symptoms improve" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidSNOMEDCTAdditionalDosageInstructionsCode(code) {
    return SNOMEDCTAdditionalDosageInstructionsConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getSNOMEDCTAdditionalDosageInstructionsConcept(code) {
    return SNOMEDCTAdditionalDosageInstructionsConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const SNOMEDCTAdditionalDosageInstructionsCodes = SNOMEDCTAdditionalDosageInstructionsConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomSNOMEDCTAdditionalDosageInstructionsCode() {
    return SNOMEDCTAdditionalDosageInstructionsCodes[Math.floor(Math.random() * SNOMEDCTAdditionalDosageInstructionsCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomSNOMEDCTAdditionalDosageInstructionsConcept() {
    return SNOMEDCTAdditionalDosageInstructionsConcepts[Math.floor(Math.random() * SNOMEDCTAdditionalDosageInstructionsConcepts.length)];
}

/**
 * ValueSet: MedicationsExampleUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/medication-example-uv-ips
 * Size: 17 concepts
 */
export const MedicationsExampleUvIpsConcepts = [
    { code: "777067000", system: "http://snomed.info/sct", display: "Acetaminophen only product" },
    { code: "774587000", system: "http://snomed.info/sct", display: "Amoxicillin and clavulanic acid only product" },
    { code: "776556004", system: "http://snomed.info/sct", display: "Lithium citrate only product" },
    { code: "774409003", system: "http://snomed.info/sct", display: "Acenocoumarol only product" },
    { code: "780130002", system: "http://snomed.info/sct", display: "Acetaminophen only product in rectal dose form" },
    { code: "778315007", system: "http://snomed.info/sct", display: "Amoxicillin and clavulanic acid only product in oral dose form" },
    { code: "779725005", system: "http://snomed.info/sct", display: "Lithium citrate only product in oral dose form" },
    { code: "778207007", system: "http://snomed.info/sct", display: "Acenocoumarol only product in oral dose form" },
    { code: "322257001", system: "http://snomed.info/sct", display: "Paracetamol 250 mg rectal suppository" },
    { code: "392259005", system: "http://snomed.info/sct", display: "Amoxicillin 875 mg and clavulanic acid (as clavulanate potassium) 125 mg oral tablet" },
    { code: "766489003", system: "http://snomed.info/sct", display: "Lithium citrate 104 mg/mL oral solution" },
    { code: "319740004", system: "http://snomed.info/sct", display: "Acenocoumarol 1 mg oral tablet" },
    { code: "331055", system: "http://www.nlm.nih.gov/research/umls/rxnorm", display: "Amoxicillin 1000 MG" },
    { code: "437158", system: "http://www.nlm.nih.gov/research/umls/rxnorm", display: "Acetaminophen 100 MG" },
    { code: "332122", system: "http://www.nlm.nih.gov/research/umls/rxnorm", display: "lithium citrate 60 MG/ML" },
    { code: "0781-1852", system: "http://hl7.org/fhir/sid/ndc", display: "Amoxicillin and Clavulanate Potassium  (product)" },
    { code: "0781-1852-20", system: "http://hl7.org/fhir/sid/ndc", display: "Amoxicillin and Clavulanate Potassium, 20 TABLET, FILM COATED in 1 BOTTLE (0781-1852-20) (package)" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidMedicationsExampleUvIpsCode(code) {
    return MedicationsExampleUvIpsConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getMedicationsExampleUvIpsConcept(code) {
    return MedicationsExampleUvIpsConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const MedicationsExampleUvIpsCodes = MedicationsExampleUvIpsConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomMedicationsExampleUvIpsCode() {
    return MedicationsExampleUvIpsCodes[Math.floor(Math.random() * MedicationsExampleUvIpsCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomMedicationsExampleUvIpsConcept() {
    return MedicationsExampleUvIpsConcepts[Math.floor(Math.random() * MedicationsExampleUvIpsConcepts.length)];
}

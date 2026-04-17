/**
 * ValueSet: diagnostic-service-sections
 * URL: http://hl7.org/fhir/ValueSet/diagnostic-service-sections
 * Size: 45 concepts
 */
export const DiagnosticServiceSectionsConcepts = [
    { code: "AU", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Audiology" },
    { code: "BG", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Blood Gases" },
    { code: "BLB", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Blood Bank" },
    { code: "CG", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Cytogenetics" },
    { code: "CUS", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Cardiac Ultrasound" },
    { code: "CTH", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Cardiac Catheterization" },
    { code: "CT", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "CAT Scan" },
    { code: "CH", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Chemistry" },
    { code: "CP", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Cytopathology" },
    { code: "EC", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Electrocardiac (e.g., EKG,  EEC, Holter)" },
    { code: "EN", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Electroneuro (EEG, EMG,EP,PSG)" },
    { code: "GE", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Genetics" },
    { code: "HM", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Hematology" },
    { code: "IMG", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Diagnostic Imaging" },
    { code: "ICU", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Bedside ICU Monitoring" },
    { code: "IMM", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Immunology" },
    { code: "LAB", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Laboratory" },
    { code: "MB", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Microbiology" },
    { code: "MCB", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Mycobacteriology" },
    { code: "MYC", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Mycology" },
    { code: "NMS", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Nuclear Medicine Scan" },
    { code: "NMR", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Nuclear Magnetic Resonance" },
    { code: "NRS", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Nursing Service Measures" },
    { code: "OUS", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "OB Ultrasound" },
    { code: "OT", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Occupational Therapy" },
    { code: "OTH", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Other" },
    { code: "OSL", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Outside Lab" },
    { code: "PAR", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Parasitology" },
    { code: "PHR", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Pharmacy" },
    { code: "PAT", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Pathology (gross & histopath, not surgical)" },
    { code: "PT", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Physical Therapy" },
    { code: "PHY", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Physician (Hx. Dx, admission note, etc.)" },
    { code: "PF", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Pulmonary Function" },
    { code: "RAD", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Radiology" },
    { code: "RX", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Radiograph" },
    { code: "RUS", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Radiology Ultrasound" },
    { code: "RC", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Respiratory Care (therapy)" },
    { code: "RT", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Radiation Therapy" },
    { code: "SR", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Serology" },
    { code: "SP", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Surgical Pathology" },
    { code: "TX", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Toxicology" },
    { code: "VUS", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Vascular Ultrasound" },
    { code: "VR", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Virology" },
    { code: "URN", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Urinalysis" },
    { code: "XRC", system: "http://terminology.hl7.org/CodeSystem/v2-0074", display: "Cineradiograph" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidDiagnosticServiceSectionsCode(code) {
    return DiagnosticServiceSectionsConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getDiagnosticServiceSectionsConcept(code) {
    return DiagnosticServiceSectionsConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const DiagnosticServiceSectionsCodes = DiagnosticServiceSectionsConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomDiagnosticServiceSectionsCode() {
    return DiagnosticServiceSectionsCodes[Math.floor(Math.random() * DiagnosticServiceSectionsCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomDiagnosticServiceSectionsConcept() {
    return DiagnosticServiceSectionsConcepts[Math.floor(Math.random() * DiagnosticServiceSectionsConcepts.length)];
}
/**
 * Multi-language display translations
 * Maps code → language → display string
 */
export const DiagnosticServiceSectionsDisplays = {
    "AU": { "de": "Audiologie" },
    "BG": { "de": "Blutgase" },
    "BLB": { "de": "Blutbank" },
    "CUS": { "de": "Kardiologische Ultraschalluntersuchung" },
    "CTH": { "de": "Herzkatheter" },
    "CT": { "de": "Computertomographie" },
    "CH": { "de": "Klinische Chemie" },
    "CP": { "de": "Zellpathologie" },
    "EC": { "de": "Elektrokardiographie" },
    "EN": { "de": "Elektroneurographie, Elektroencephalographie" },
    "GE": { "de": "Genetik" },
    "HM": { "de": "Hämatologie" },
    "IMM": { "de": "Immunologie" },
    "LAB": { "de": "Labor" },
    "MB": { "de": "Mikrobiologie" },
    "MCB": { "de": "Mykobakteriologie" },
    "MYC": { "de": "Mykologie" },
    "NMS": { "de": "Szintigramm" },
    "NMR": { "de": "Kernspintomographie (MR)" },
    "NRS": { "de": "Pflegemaßnahme" },
    "OUS": { "de": "Geburtshilfiche Ultraschalluntersuchung" },
    "OT": { "de": "Beschäftigungstherapie" },
    "OTH": { "de": "Andere" },
    "OSL": { "de": "Externes Labor" },
    "PAR": { "de": "Parasitologie" },
    "PHR": { "de": "Apotheke" },
    "PAT": { "de": "Pathologie" },
    "PT": { "de": "physiklische Therapie" },
    "PHY": { "de": "Arzt (Krankengeschichte, Diagnose, Aufnahmeuntersuchung)" },
    "PF": { "de": "Lungenfunktion" },
    "RAD": { "de": "Radiologie" },
    "RX": { "de": "Röntgenaufnahme" },
    "RUS": { "de": "Radiologische Ultraschalluntersuchung" },
    "RC": { "de": "Atemtherapie" },
    "RT": { "de": "Strahlentherapie" },
    "SR": { "de": "Serologie" },
    "SP": { "de": "Operative Pathologie" },
    "TX": { "de": "Toxikologie" },
    "VUS": { "de": "Ultraschalluntersuchung der Gefäße" },
    "VR": { "de": "Virologie" },
    "URN": { "de": "Urinanalyse" },
    "XRC": { "de": "Röntgenkinematographie" },
};
/**
 * Get the display string for a code in a specific language
 */
export function getDiagnosticServiceSectionsDisplay(code, lang) {
    return DiagnosticServiceSectionsDisplays[code]?.[lang];
}

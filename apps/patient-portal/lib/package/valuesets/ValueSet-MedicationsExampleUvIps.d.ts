/**
 * ValueSet: MedicationsExampleUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/medication-example-uv-ips
 * Size: 17 concepts
 */
export declare const MedicationsExampleUvIpsConcepts: readonly [{
    readonly code: "777067000";
    readonly system: "http://snomed.info/sct";
    readonly display: "Acetaminophen only product";
}, {
    readonly code: "774587000";
    readonly system: "http://snomed.info/sct";
    readonly display: "Amoxicillin and clavulanic acid only product";
}, {
    readonly code: "776556004";
    readonly system: "http://snomed.info/sct";
    readonly display: "Lithium citrate only product";
}, {
    readonly code: "774409003";
    readonly system: "http://snomed.info/sct";
    readonly display: "Acenocoumarol only product";
}, {
    readonly code: "780130002";
    readonly system: "http://snomed.info/sct";
    readonly display: "Acetaminophen only product in rectal dose form";
}, {
    readonly code: "778315007";
    readonly system: "http://snomed.info/sct";
    readonly display: "Amoxicillin and clavulanic acid only product in oral dose form";
}, {
    readonly code: "779725005";
    readonly system: "http://snomed.info/sct";
    readonly display: "Lithium citrate only product in oral dose form";
}, {
    readonly code: "778207007";
    readonly system: "http://snomed.info/sct";
    readonly display: "Acenocoumarol only product in oral dose form";
}, {
    readonly code: "322257001";
    readonly system: "http://snomed.info/sct";
    readonly display: "Paracetamol 250 mg rectal suppository";
}, {
    readonly code: "392259005";
    readonly system: "http://snomed.info/sct";
    readonly display: "Amoxicillin 875 mg and clavulanic acid (as clavulanate potassium) 125 mg oral tablet";
}, {
    readonly code: "766489003";
    readonly system: "http://snomed.info/sct";
    readonly display: "Lithium citrate 104 mg/mL oral solution";
}, {
    readonly code: "319740004";
    readonly system: "http://snomed.info/sct";
    readonly display: "Acenocoumarol 1 mg oral tablet";
}, {
    readonly code: "331055";
    readonly system: "http://www.nlm.nih.gov/research/umls/rxnorm";
    readonly display: "Amoxicillin 1000 MG";
}, {
    readonly code: "437158";
    readonly system: "http://www.nlm.nih.gov/research/umls/rxnorm";
    readonly display: "Acetaminophen 100 MG";
}, {
    readonly code: "332122";
    readonly system: "http://www.nlm.nih.gov/research/umls/rxnorm";
    readonly display: "lithium citrate 60 MG/ML";
}, {
    readonly code: "0781-1852";
    readonly system: "http://hl7.org/fhir/sid/ndc";
    readonly display: "Amoxicillin and Clavulanate Potassium  (product)";
}, {
    readonly code: "0781-1852-20";
    readonly system: "http://hl7.org/fhir/sid/ndc";
    readonly display: "Amoxicillin and Clavulanate Potassium, 20 TABLET, FILM COATED in 1 BOTTLE (0781-1852-20) (package)";
}];
/** Union type of all valid codes in this ValueSet */
export type MedicationsExampleUvIpsCode = "777067000" | "774587000" | "776556004" | "774409003" | "780130002" | "778315007" | "779725005" | "778207007" | "322257001" | "392259005" | "766489003" | "319740004" | "331055" | "437158" | "332122" | "0781-1852" | "0781-1852-20";
/** Type representing a concept from this ValueSet */
export type MedicationsExampleUvIpsConcept = typeof MedicationsExampleUvIpsConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidMedicationsExampleUvIpsCode(code: string): code is MedicationsExampleUvIpsCode;
/**
 * Get concept details by code
 */
export declare function getMedicationsExampleUvIpsConcept(code: string): MedicationsExampleUvIpsConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const MedicationsExampleUvIpsCodes: ("777067000" | "774587000" | "776556004" | "774409003" | "780130002" | "778315007" | "779725005" | "778207007" | "322257001" | "392259005" | "766489003" | "319740004" | "331055" | "437158" | "332122" | "0781-1852" | "0781-1852-20")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomMedicationsExampleUvIpsCode(): MedicationsExampleUvIpsCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomMedicationsExampleUvIpsConcept(): MedicationsExampleUvIpsConcept;

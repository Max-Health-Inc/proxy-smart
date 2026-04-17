/**
 * ValueSet: VaccineTargetDiseasesUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/target-diseases-uv-ips
 * Size: 50 concepts
 */
export const VaccineTargetDiseasesUvIpsConcepts = [
    { code: "4834000", system: "http://snomed.info/sct", display: "Typhoid fever (disorder)" },
    { code: "6142004", system: "http://snomed.info/sct", display: "Influenza (disorder)" },
    { code: "16541001", system: "http://snomed.info/sct", display: "Yellow fever (disorder)" },
    { code: "14189004", system: "http://snomed.info/sct", display: "Measles (disorder)" },
    { code: "14168008", system: "http://snomed.info/sct", display: "Rabies (disorder)" },
    { code: "18624000", system: "http://snomed.info/sct", display: "Disease caused by Rotavirus (disorder)" },
    { code: "23502006", system: "http://snomed.info/sct", display: "Lyme disease (disorder)" },
    { code: "23511006", system: "http://snomed.info/sct", display: "Meningococcal infectious disease (disorder)" },
    { code: "24662006", system: "http://snomed.info/sct", display: "Influenza caused by Influenza B virus (disorder)" },
    { code: "25225006", system: "http://snomed.info/sct", display: "Disease caused by Adenovirus (disorder)" },
    { code: "27836007", system: "http://snomed.info/sct", display: "Pertussis (disorder)" },
    { code: "32398004", system: "http://snomed.info/sct", display: "Bronchitis (disorder)" },
    { code: "36653000", system: "http://snomed.info/sct", display: "Rubella (disorder)" },
    { code: "36989005", system: "http://snomed.info/sct", display: "Mumps (disorder)" },
    { code: "37246009", system: "http://snomed.info/sct", display: "Disease caused by rickettsiae (disorder)" },
    { code: "38907003", system: "http://snomed.info/sct", display: "Varicella (disorder)" },
    { code: "40468003", system: "http://snomed.info/sct", display: "Viral hepatitis, type A (disorder)" },
    { code: "50711007", system: "http://snomed.info/sct", display: "Viral hepatitis type C (disorder)" },
    { code: "52947006", system: "http://snomed.info/sct", display: "Japanese encephalitis virus disease (disorder)" },
    { code: "56717001", system: "http://snomed.info/sct", display: "Tuberculosis (disorder)" },
    { code: "58750007", system: "http://snomed.info/sct", display: "Plague (disorder)" },
    { code: "63650001", system: "http://snomed.info/sct", display: "Cholera (disorder)" },
    { code: "66071002", system: "http://snomed.info/sct", display: "Viral hepatitis type B (disorder)" },
    { code: "67924001", system: "http://snomed.info/sct", display: "Smallpox (disorder)" },
    { code: "70036007", system: "http://snomed.info/sct", display: "Haemophilus influenzae pneumonia (disorder)" },
    { code: "75702008", system: "http://snomed.info/sct", display: "Brucellosis (disorder)" },
    { code: "76902006", system: "http://snomed.info/sct", display: "Tetanus (disorder)" },
    { code: "85904008", system: "http://snomed.info/sct", display: "Paratyphoid fever (disorder)" },
    { code: "111852003", system: "http://snomed.info/sct", display: "Vaccinia (disorder)" },
    { code: "186150001", system: "http://snomed.info/sct", display: "Enteritis caused by rotavirus (disorder)" },
    { code: "186772009", system: "http://snomed.info/sct", display: "Rocky Mountain spotted fever (disorder)" },
    { code: "186788009", system: "http://snomed.info/sct", display: "Q fever (disorder)" },
    { code: "240532009", system: "http://snomed.info/sct", display: "Human papillomavirus infection (disorder)" },
    { code: "240613006", system: "http://snomed.info/sct", display: "Typhus group rickettsial disease (disorder)" },
    { code: "372244006", system: "http://snomed.info/sct", display: "Malignant melanoma (disorder)" },
    { code: "397430003", system: "http://snomed.info/sct", display: "Diphtheria caused by Corynebacterium diphtheriae (disorder)" },
    { code: "398102009", system: "http://snomed.info/sct", display: "Acute poliomyelitis (disorder)" },
    { code: "398565003", system: "http://snomed.info/sct", display: "Infection caused by Clostridium botulinum (disorder)" },
    { code: "409498004", system: "http://snomed.info/sct", display: "Anthrax (disorder)" },
    { code: "417093003", system: "http://snomed.info/sct", display: "Disease caused by West Nile virus (disorder)" },
    { code: "442438000", system: "http://snomed.info/sct", display: "Influenza caused by Influenza A virus (disorder)" },
    { code: "442696006", system: "http://snomed.info/sct", display: "Influenza caused by Influenza A virus subtype H1N1 (disorder)" },
    { code: "450715004", system: "http://snomed.info/sct", display: "Influenza caused by Influenza A virus subtype H7 (disorder)" },
    { code: "707448003", system: "http://snomed.info/sct", display: "Influenza caused by Influenza A virus subtype H7N9 (disorder)" },
    { code: "709410003", system: "http://snomed.info/sct", display: "Haemophilus influenzae type b infection (disorder)" },
    { code: "712986001", system: "http://snomed.info/sct", display: "Encephalitis caused by tick-borne encephalitis virus (disorder)" },
    { code: "713083002", system: "http://snomed.info/sct", display: "Influenza caused by Influenza A virus subtype H5 (disorder)" },
    { code: "772810003", system: "http://snomed.info/sct", display: "Influenza caused by Influenza A virus subtype H3N2 (disorder)" },
    { code: "772828001", system: "http://snomed.info/sct", display: "Influenza caused by Influenza A virus subtype H5N1 (disorder)" },
    { code: "840539006", system: "http://snomed.info/sct", display: "Disease caused by severe acute respiratory syndrome coronavirus 2 (disorder)" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidVaccineTargetDiseasesUvIpsCode(code) {
    return VaccineTargetDiseasesUvIpsConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getVaccineTargetDiseasesUvIpsConcept(code) {
    return VaccineTargetDiseasesUvIpsConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const VaccineTargetDiseasesUvIpsCodes = VaccineTargetDiseasesUvIpsConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomVaccineTargetDiseasesUvIpsCode() {
    return VaccineTargetDiseasesUvIpsCodes[Math.floor(Math.random() * VaccineTargetDiseasesUvIpsCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomVaccineTargetDiseasesUvIpsConcept() {
    return VaccineTargetDiseasesUvIpsConcepts[Math.floor(Math.random() * VaccineTargetDiseasesUvIpsConcepts.length)];
}

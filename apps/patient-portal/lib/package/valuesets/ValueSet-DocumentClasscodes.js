/**
 * ValueSet: document-classcodes
 * URL: http://hl7.org/fhir/ValueSet/document-classcodes
 * Size: 45 concepts
 */
export const DocumentClasscodesConcepts = [
    { code: "11369-6", system: "http://loinc.org", display: "History of Immunization note" },
    { code: "11485-0", system: "http://loinc.org", display: "Anesthesia records" },
    { code: "11486-8", system: "http://loinc.org", display: "Chemotherapy records" },
    { code: "11488-4", system: "http://loinc.org", display: "Consult note" },
    { code: "11506-3", system: "http://loinc.org", display: "Progress note" },
    { code: "11543-6", system: "http://loinc.org", display: "Nursery records" },
    { code: "15508-5", system: "http://loinc.org", display: "Labor and delivery records" },
    { code: "18726-0", system: "http://loinc.org", display: "Radiology studies (set)" },
    { code: "18761-7", system: "http://loinc.org", display: "Transfer summary note" },
    { code: "18842-5", system: "http://loinc.org", display: "Discharge summary" },
    { code: "26436-6", system: "http://loinc.org", display: "Laboratory studies (set)" },
    { code: "26441-6", system: "http://loinc.org", display: "Cardiology studies (set)" },
    { code: "26442-4", system: "http://loinc.org", display: "Obstetrical studies (set)" },
    { code: "27895-2", system: "http://loinc.org", display: "Gastroenterology endoscopy studies (set)" },
    { code: "27896-0", system: "http://loinc.org", display: "Pulmonary studies (set)" },
    { code: "27897-8", system: "http://loinc.org", display: "Neuromuscular electrophysiology studies (set)" },
    { code: "27898-6", system: "http://loinc.org", display: "Pathology studies (set)" },
    { code: "28570-0", system: "http://loinc.org", display: "Procedure note" },
    { code: "28619-5", system: "http://loinc.org", display: "Ophthalmology/Optometry studies (set)" },
    { code: "28634-4", system: "http://loinc.org", display: "Miscellaneous studies (set)" },
    { code: "29749-9", system: "http://loinc.org", display: "Dialysis records" },
    { code: "29750-7", system: "http://loinc.org", display: "Neonatal intensive care records" },
    { code: "29751-5", system: "http://loinc.org", display: "Critical care records" },
    { code: "29752-3", system: "http://loinc.org", display: "Perioperative records" },
    { code: "34109-9", system: "http://loinc.org", display: "Note" },
    { code: "34117-2", system: "http://loinc.org", display: "History and physical note" },
    { code: "34121-4", system: "http://loinc.org", display: "Interventional procedure note" },
    { code: "34122-2", system: "http://loinc.org", display: "Pathology procedure note" },
    { code: "34133-9", system: "http://loinc.org", display: "Summary of episode note" },
    { code: "34140-4", system: "http://loinc.org", display: "Deprecated Transfer of care referral note" },
    { code: "34748-4", system: "http://loinc.org", display: "Telephone encounter Note" },
    { code: "34775-7", system: "http://loinc.org", display: "Deprecated General surgery Pre-operative evaluation and management note" },
    { code: "47039-3", system: "http://loinc.org", display: "Hospital Admission history and physical note" },
    { code: "47042-7", system: "http://loinc.org", display: "Counseling note" },
    { code: "47045-0", system: "http://loinc.org", display: "Study report" },
    { code: "47046-8", system: "http://loinc.org", display: "Summary of death note" },
    { code: "47049-2", system: "http://loinc.org", display: "Deprecated Non-patient Communication note" },
    { code: "57017-6", system: "http://loinc.org", display: "Privacy policy Organization Document" },
    { code: "57016-8", system: "http://loinc.org", display: "Privacy policy acknowledgment Document" },
    { code: "56445-0", system: "http://loinc.org", display: "Medication summary Document" },
    { code: "53576-5", system: "http://loinc.org", display: "Personal Health Monitoring Report" },
    { code: "56447-6", system: "http://loinc.org", display: "Deprecated Plan of care note" },
    { code: "18748-4", system: "http://loinc.org", display: "Diagnostic imaging study" },
    { code: "11504-8", system: "http://loinc.org", display: "Surgical operation note" },
    { code: "57133-1", system: "http://loinc.org", display: "Referral note" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidDocumentClasscodesCode(code) {
    return DocumentClasscodesConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getDocumentClasscodesConcept(code) {
    return DocumentClasscodesConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const DocumentClasscodesCodes = DocumentClasscodesConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomDocumentClasscodesCode() {
    return DocumentClasscodesCodes[Math.floor(Math.random() * DocumentClasscodesCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomDocumentClasscodesConcept() {
    return DocumentClasscodesConcepts[Math.floor(Math.random() * DocumentClasscodesConcepts.length)];
}
/**
 * Multi-language display translations
 * Maps code → language → display string
 */
export const DocumentClasscodesDisplays = {
    "11369-6": { "de": "Impfanamnese - Dokumentation", "es": "Inmunización: Paciente:Punto temporal:Hx:Narrativo:" },
    "11485-0": { "es": "Registros de anestesia: Paciente:-:Tipo:Documento:" },
    "11486-8": { "es": "Registros de quimioterapia: Paciente:-:Tipo:Documento:" },
    "11488-4": { "de": "Befund", "es": "Nota de consulta:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "11506-3": { "es": "Nota de progreso:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "11543-6": { "es": "Registros de guardería: Paciente:-:Tipo:Documento:" },
    "15508-5": { "es": "Registros de trabajo de parto y parto: Paciente:-:Tipo:Documento:" },
    "18726-0": { "de": "Radiologie", "es": "estudios radiológicos:complejo:-:^paciente:Conjunto:" },
    "18761-7": { "de": "Transferbericht (Verlegungsbericht)", "es": "Transferir nota de resumen:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "18842-5": { "de": "Entlassungsbrief", "es": "Nota de resumen de alta:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "26436-6": { "de": "Laboruntersuchungen", "fr": "Biologie polyvalente [Autre] - ; Patient ; Statut", "es": "estudios de laboratorio:complejo:-:^paciente:Conjunto:" },
    "26441-6": { "es": "estudios cardiológicos:complejo:-:^paciente:Conjunto:" },
    "26442-4": { "es": "estudios obstétricos:complejo:-:^paciente:Conjunto:" },
    "27895-2": { "es": "estudios endoscópicos gastroenterológicos:complejo:-:^paciente:Conjunto:" },
    "27896-0": { "es": "estudios pulmonares:complejo:-:^paciente:Conjunto:" },
    "27897-8": { "es": "estudios electrofisiológicos neuromusculares:complejo:-:^paciente:Conjunto:" },
    "27898-6": { "fr": "Pathologie [Autre] - ; Patient ; Statut", "es": "estudios patológicos:complejo:-:^paciente:Conjunto:" },
    "28570-0": { "es": "Nota de procedimiento:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "28619-5": { "es": "estudios de oftalmología:complejo:-:^paciente:Conjunto:" },
    "28634-4": { "es": "estudios variados:complejo:-:^paciente:Conjunto:" },
    "29749-9": { "de": "Dialysebericht", "fr": "Dossier de dialyse [Recherche] - ; Patient ; Document", "es": "Registros de diálisis: Paciente:-:Tipo:Documento:" },
    "29750-7": { "es": "Registros de cuidados intensivos neonatales: Paciente:-:Tipo:Documento:" },
    "29751-5": { "es": "Registros de cuidados críticos: Paciente:-:Tipo:Documento:" },
    "29752-3": { "es": "Registros perioperatorios: Paciente:-:Tipo:Documento:" },
    "34109-9": { "es": "Nota:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "34117-2": { "es": "Historia y nota física:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "34121-4": { "es": "Nota de procedimiento intervencionista:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "34122-2": { "es": "Nota de procedimiento:{Configuración} :Punto temporal:Tipo:Documento:Pathology" },
    "34133-9": { "de": "Krankengeschichte", "es": "Resumen de la nota del episodio:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "34140-4": { "es": "Nota de remisión de transferencia de atención:{Configuración} :Punto temporal:Tipo:Documento:{Provider}" },
    "34748-4": { "es": "Nota:Encuentro telefónico :Punto temporal:Tipo:Documento:{Role}" },
    "34775-7": { "es": "Nota de gestión y evaluación preoperatoria:{Configuración} :Punto temporal:Tipo:Documento:General surgery" },
    "47039-3": { "es": "Historial de admisión y nota física:Hospital :Punto temporal:Tipo:Documento:{Role}" },
    "47042-7": { "es": "Nota de asesoramiento:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "47045-0": { "es": "Informe de estudio:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "47046-8": { "es": "Resumen de la nota de muerte:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "47049-2": { "es": "Nota de comunicación:{Configuración} :Punto temporal:Tipo:Documento:{Non-patient}" },
    "57017-6": { "es": "Política de privacidad:Organización :Punto temporal:Tipo:Documento:" },
    "57016-8": { "de": "Bestätigung der Datenschutzbestimmungen - Dokument", "es": "Reconocimiento de la política de privacidad: Paciente:Punto temporal:Tipo:Documento:" },
    "56445-0": { "de": "Medikationsübersicht - Dokument", "es": "Resumen de medicación: Paciente:Punto temporal:Tipo:Documento:" },
    "53576-5": { "de": "Bericht aus persönlichem Gesundheitsmonitoring - Dokument", "es": "Informe de seguimiento de la salud personal:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "56447-6": { "es": "Nota del plan de cuidados:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "18748-4": { "de": "Diagnostische Bildgebung - Untersuchung", "es": "Informe de estudio:No especificado :Punto temporal:Tipo:Documento:Diagnostic imaging" },
    "11504-8": { "de": "OP-Bericht", "es": "Nota de operación quirúrgica:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "57133-1": { "es": "Nota de referencia:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
};
/**
 * Get the display string for a code in a specific language
 */
export function getDocumentClasscodesDisplay(code, lang) {
    return DocumentClasscodesDisplays[code]?.[lang];
}

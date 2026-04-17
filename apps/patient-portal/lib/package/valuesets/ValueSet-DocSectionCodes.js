/**
 * ValueSet: doc-section-codes
 * URL: http://hl7.org/fhir/ValueSet/doc-section-codes
 * Size: 55 concepts
 */
export const DocSectionCodesConcepts = [
    { code: "10154-3", system: "http://loinc.org", display: "Chief complaint Narrative - Reported" },
    { code: "10157-6", system: "http://loinc.org", display: "History of family member diseases note" },
    { code: "10160-0", system: "http://loinc.org", display: "History of Medication use Narrative" },
    { code: "10164-2", system: "http://loinc.org", display: "History of Present illness Narrative" },
    { code: "10183-2", system: "http://loinc.org", display: "Hospital discharge medications Narrative" },
    { code: "10184-0", system: "http://loinc.org", display: "Hospital discharge physical findings Narrative" },
    { code: "10187-3", system: "http://loinc.org", display: "Review of systems Narrative - Reported" },
    { code: "10210-3", system: "http://loinc.org", display: "Physical findings of General status Narrative" },
    { code: "10216-0", system: "http://loinc.org", display: "Surgical operation note fluids Narrative" },
    { code: "10218-6", system: "http://loinc.org", display: "Surgical operation note postoperative diagnosis Narrative" },
    { code: "10223-6", system: "http://loinc.org", display: "Surgical operation note surgical procedure Narrative" },
    { code: "10222-8", system: "http://loinc.org", display: "Surgical operation note surgical complications [Interpretation] Narrative" },
    { code: "11329-0", system: "http://loinc.org", display: "History general Narrative - Reported" },
    { code: "11348-0", system: "http://loinc.org", display: "History of Past illness note" },
    { code: "11369-6", system: "http://loinc.org", display: "History of Immunization note" },
    { code: "57852-6", system: "http://loinc.org", display: "Problem list Narrative - Reported" },
    { code: "11493-4", system: "http://loinc.org", display: "Hospital discharge studies summary Narrative" },
    { code: "11535-2", system: "http://loinc.org", display: "Hospital discharge diagnosis note" },
    { code: "11537-8", system: "http://loinc.org", display: "Surgical drains Narrative" },
    { code: "18776-5", system: "http://loinc.org", display: "Plan of care note" },
    { code: "18841-7", system: "http://loinc.org", display: "Hospital consultations Document" },
    { code: "29299-5", system: "http://loinc.org", display: "Reason for visit Narrative" },
    { code: "29545-1", system: "http://loinc.org", display: "Physical findings note" },
    { code: "29549-3", system: "http://loinc.org", display: "Medication administered Narrative" },
    { code: "29554-3", system: "http://loinc.org", display: "Procedure Narrative" },
    { code: "29762-2", system: "http://loinc.org", display: "Social history note" },
    { code: "30954-2", system: "http://loinc.org", display: "Relevant diagnostic tests/laboratory data note" },
    { code: "42344-2", system: "http://loinc.org", display: "Discharge diet (narrative)" },
    { code: "42346-7", system: "http://loinc.org", display: "Medications on admission (narrative)" },
    { code: "42348-3", system: "http://loinc.org", display: "Advance healthcare directives" },
    { code: "42349-1", system: "http://loinc.org", display: "Reason for referral (narrative)" },
    { code: "46240-8", system: "http://loinc.org", display: "History of Hospitalizations+Outpatient visits Narrative" },
    { code: "46241-6", system: "http://loinc.org", display: "Hospital admission diagnosis Narrative - Reported" },
    { code: "46264-8", system: "http://loinc.org", display: "History of medical device use" },
    { code: "47420-5", system: "http://loinc.org", display: "Functional status assessment note" },
    { code: "47519-4", system: "http://loinc.org", display: "History of Procedures Document" },
    { code: "48765-2", system: "http://loinc.org", display: "Allergies and adverse reactions Document" },
    { code: "48768-6", system: "http://loinc.org", display: "Payment sources Document" },
    { code: "51848-0", system: "http://loinc.org", display: "Evaluation note" },
    { code: "55109-3", system: "http://loinc.org", display: "Complications Document" },
    { code: "55122-6", system: "http://loinc.org", display: "Surgical operation note implants Narrative" },
    { code: "59768-2", system: "http://loinc.org", display: "Procedure indications [Interpretation] Narrative" },
    { code: "59769-0", system: "http://loinc.org", display: "Postprocedure diagnosis Narrative" },
    { code: "59770-8", system: "http://loinc.org", display: "Procedure estimated blood loss Narrative" },
    { code: "59771-6", system: "http://loinc.org", display: "Procedure implants Narrative" },
    { code: "59772-4", system: "http://loinc.org", display: "Planned procedure Narrative" },
    { code: "59773-2", system: "http://loinc.org", display: "Procedure specimens taken Narrative" },
    { code: "59775-7", system: "http://loinc.org", display: "Procedure disposition Narrative" },
    { code: "59776-5", system: "http://loinc.org", display: "Procedure findings Narrative" },
    { code: "61149-1", system: "http://loinc.org", display: "Objective Narrative" },
    { code: "61150-9", system: "http://loinc.org", display: "Subjective Narrative" },
    { code: "69730-0", system: "http://loinc.org", display: "Instructions" },
    { code: "8648-8", system: "http://loinc.org", display: "Hospital course note" },
    { code: "8653-8", system: "http://loinc.org", display: "Hospital Discharge instructions" },
    { code: "8716-3", system: "http://loinc.org", display: "Vital signs note" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidDocSectionCodesCode(code) {
    return DocSectionCodesConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getDocSectionCodesConcept(code) {
    return DocSectionCodesConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const DocSectionCodesCodes = DocSectionCodesConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomDocSectionCodesCode() {
    return DocSectionCodesCodes[Math.floor(Math.random() * DocSectionCodesCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomDocSectionCodesConcept() {
    return DocSectionCodesConcepts[Math.floor(Math.random() * DocSectionCodesConcepts.length)];
}
/**
 * Multi-language display translations
 * Maps code → language → display string
 */
export const DocSectionCodesDisplays = {
    "10154-3": { "es": "Queja principal: Paciente:Punto temporal:Tipo:Narrativo:Reported" },
    "10157-6": { "es": "Historia de enfermedades de miembros de la familia: Miembro de la familia:Punto temporal:Hx:Narrativo:" },
    "10160-0": { "de": "Medikationsanamnese - Freitext", "es": "Uso de medicación: Paciente:Punto temporal:Hx:Narrativo:" },
    "10164-2": { "de": "Anamnese der aktuellen Krankheit - Freitext", "es": "Enfermedad presente: Paciente:Punto temporal:Hx:Narrativo:" },
    "10183-2": { "es": "Medicamentos para el alta hospitalaria: Paciente:Punto temporal:Tipo:Narrativo:" },
    "10184-0": { "de": "Krankenhausentlassbefund der körperlichen Untersuchungen - Freitext", "es": "Hallazgos físicos al alta hospitalaria: Paciente:Punto temporal:Tipo:Narrativo:" },
    "10187-3": { "es": "Revisión de sistemas: Paciente:Punto temporal:Tipo:Narrativo:Reported" },
    "10210-3": { "es": "Hallazgos físicos:Estatus general :Punto temporal:Tipo:Narrativo:Observed" },
    "10216-0": { "es": "Líquidos de notas de operación quirúrgica: Paciente:Punto temporal:Tipo:Narrativo:" },
    "10218-6": { "es": "Nota operatoria postoperatoria Dx: Paciente:Punto temporal:Interpretación:Narrativo:" },
    "10223-6": { "es": "Operación quirúrgica nota procedimiento quirúrgico: Paciente:Punto temporal:Tipo:Narrativo:" },
    "10222-8": { "es": "Operación quirúrgica nota complicaciones quirúrgicas: Paciente:Punto temporal:Interpretación:Narrativo:" },
    "11329-0": { "es": "Historia general: Paciente:Punto temporal:Tipo:Narrativo:Reported" },
    "11348-0": { "de": "Anamnese früherer Krankheiten - Dokumentation", "es": "Enfermedad pasada: Paciente:Punto temporal:Hx:Narrativo:" },
    "11369-6": { "de": "Impfanamnese - Dokumentation", "es": "Inmunización: Paciente:Punto temporal:Hx:Narrativo:" },
    "57852-6": { "de": "Problemliste Freitext - Berichtet", "es": "Lista de problemas: Paciente:Punto temporal:Tipo:Narrativo:Reported" },
    "11493-4": { "es": "Resumen de estudios de alta hospitalaria: Paciente:Punto temporal:Tipo:Narrativo:" },
    "11535-2": { "de": "Entlassdiagnose des Krankenhausaufenthalts - Dokumentation", "es": "Alta hospitalaria Dx: Paciente:Punto temporal:Interpretación:Narrativo:" },
    "11537-8": { "es": "Drenajes quirúrgicos:Procedimiento quirúrgico :Punto temporal:Tipo:Narrativo:" },
    "18776-5": { "de": "Behandlungsplan - Dokumentation", "es": "Nota del plan de cuidados:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "18841-7": { "es": "Consultas hospitalarias: Paciente:Punto temporal:Tipo:Documento:" },
    "29299-5": { "es": "Razón de la visita: Paciente:Punto temporal:Tipo:Narrativo:" },
    "29545-1": { "de": "Körperliche Befunde - Dokumentation", "es": "Hallazgos físicos: Paciente:Punto temporal:Tipo:Narrativo:Observed" },
    "29549-3": { "es": "Medicación administrada: Paciente:Punto temporal:Tipo:Narrativo:" },
    "29554-3": { "de": "Prozedur oder Maßnahme - Freitext", "es": "Procedimiento: Paciente:Punto temporal:Tipo:Narrativo:" },
    "29762-2": { "de": "Sozialanamnese - Dokumentation", "es": "Historia social: Paciente:Punto temporal:Tipo:Narrativo:" },
    "30954-2": { "de": "Relevante diagnostische Tests/Laborergebnisse - Dokumentation", "es": "Pruebas de diagnóstico o datos de laboratorio relevantes: Paciente:Punto temporal:Tipo:Narrativo:" },
    "42346-7": { "de": "Medikation bei Aufnahme - Freitext", "fr": "Traitement lors de l'admission [Recherche] Patient ; Résultat textuel" },
    "42348-3": { "de": "Patientenverfügungen", "es": "Directivas avanzadas:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "42349-1": { "de": "Zuweisungsdiagnose" },
    "46240-8": { "es": "Hospitalizaciones + Visitas ambulatorias: Paciente:Punto temporal:Hx:Narrativo:" },
    "46241-6": { "es": "Admisión hospitalaria Dx: Paciente:Punto temporal:Interpretación:Narrativo:Reported" },
    "46264-8": { "de": "Anamnese zum Einsatz von Medizinprodukten", "es": "Historial de uso de dispositivos médicos:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "47420-5": { "de": "Beurteilung des Funktionsstatus - Dokumentation", "es": "Nota de evaluación del estado funcional:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "47519-4": { "de": "Anamnese der Maßnahmen - Dokument", "es": "Historia de los procedimientos:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "48765-2": { "de": "Allergien und unerwünschte Wirkungen - Dokument", "es": "Alergias y reacciones adversas: Paciente:Punto temporal:Tipo:Documento:" },
    "48768-6": { "de": "Kostenträger", "es": "Fuentes de pago: Paciente:Punto temporal:Tipo:Documento:" },
    "51848-0": { "es": "Nota de evaluación:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "55109-3": { "es": "Complicaciones: Paciente:Punto temporal:Tipo:Documento:" },
    "55122-6": { "es": "Implantes de notas de operación quirúrgica: Paciente:Punto temporal:Tipo:Narrativo:" },
    "59768-2": { "es": "Indicaciones de procedimiento: Paciente:Punto temporal:Interpretación:Narrativo:" },
    "59769-0": { "es": "Diagnóstico posprocedimiento: Paciente:Punto temporal:Interpretación:Narrativo:" },
    "59770-8": { "es": "Procedimiento pérdida de sangre estimada: Paciente:Punto temporal:Tipo:Narrativo:" },
    "59771-6": { "es": "Implantes de procedimiento: Paciente:Punto temporal:Tipo:Narrativo:" },
    "59772-4": { "es": "Procedimiento planificado: Paciente:Punto temporal:Tipo:Narrativo:" },
    "59773-2": { "es": "Muestras de procedimiento tomadas: Paciente:Punto temporal:Tipo:Narrativo:" },
    "59775-7": { "es": "Disposición del procedimiento: Paciente:Punto temporal:Tipo:Narrativo:" },
    "59776-5": { "es": "Hallazgos del procedimiento: Paciente:Punto temporal:Tipo:Narrativo:" },
    "61149-1": { "es": "Objetivo: Paciente:Punto temporal:Tipo:Narrativo:" },
    "61150-9": { "es": "Subjetivo: Paciente:Punto temporal:Tipo:Narrativo:" },
    "69730-0": { "es": "Instrucciones:{Configuración} :Punto temporal:Tipo:Documento:{Role}" },
    "8648-8": { "de": "Verlauf des Krankenhausaufenthalts - Dokumentation", "es": "Curso hospitalario: Paciente:Punto temporal:Tipo:Narrativo:" },
    "8653-8": { "de": "Krankenhausentlassanweisungen", "es": "Instrucciones de descarga:Hospital :Punto temporal:Tipo:Documento:{Role}" },
    "8716-3": { "de": "Vitalparameter - Dokumentation", "es": "Signos vitales: Paciente:Punto temporal:Tipo:Narrativo:Observed" },
};
/**
 * Get the display string for a code in a specific language
 */
export function getDocSectionCodesDisplay(code, lang) {
    return DocSectionCodesDisplays[code]?.[lang];
}

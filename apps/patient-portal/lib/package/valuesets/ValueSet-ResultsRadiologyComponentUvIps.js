/**
 * ValueSet: ResultsRadiologyComponentUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/results-radiology-component-uv-ips
 * Size: 37 concepts
 */
export const ResultsRadiologyComponentUvIpsConcepts = [
    { code: "121065", system: "http://dicom.nema.org/resources/ontology/DCM", display: "Procedure Description" },
    { code: "121069", system: "http://dicom.nema.org/resources/ontology/DCM", display: "Previous Finding" },
    { code: "121071", system: "http://dicom.nema.org/resources/ontology/DCM", display: "Finding" },
    { code: "121073", system: "http://dicom.nema.org/resources/ontology/DCM", display: "Impression" },
    { code: "121075", system: "http://dicom.nema.org/resources/ontology/DCM", display: "Recommendation" },
    { code: "121077", system: "http://dicom.nema.org/resources/ontology/DCM", display: "Conclusion" },
    { code: "121110", system: "http://dicom.nema.org/resources/ontology/DCM", display: "Patient Presentation" },
    { code: "121111", system: "http://dicom.nema.org/resources/ontology/DCM", display: "Summary" },
    { code: "121207", system: "http://dicom.nema.org/resources/ontology/DCM", display: "Height" },
    { code: "121211", system: "http://dicom.nema.org/resources/ontology/DCM", display: "Path length" },
    { code: "121206", system: "http://dicom.nema.org/resources/ontology/DCM", display: "Distance" },
    { code: "121216", system: "http://dicom.nema.org/resources/ontology/DCM", display: "Volume estimated from single 2D region" },
    { code: "121218", system: "http://dicom.nema.org/resources/ontology/DCM", display: "Volume estimated from two non-coplanar 2D regions" },
    { code: "121217", system: "http://dicom.nema.org/resources/ontology/DCM", display: "Volume estimated from three or more non-coplanar 2D regions" },
    { code: "121222", system: "http://dicom.nema.org/resources/ontology/DCM", display: "Volume of sphere" },
    { code: "121221", system: "http://dicom.nema.org/resources/ontology/DCM", display: "Volume of ellipsoid" },
    { code: "121220", system: "http://dicom.nema.org/resources/ontology/DCM", display: "Volume of circumscribed sphere" },
    { code: "121219", system: "http://dicom.nema.org/resources/ontology/DCM", display: "Volume of bounding three dimensional region" },
    { code: "11329-0", system: "http://loinc.org", display: "History" },
    { code: "55115-0", system: "http://loinc.org", display: "Request" },
    { code: "116224001", system: "http://snomed.info/sct", display: "Complication of Procedure" },
    { code: "410668003", system: "http://snomed.info/sct", display: "Length" },
    { code: "103355008", system: "http://snomed.info/sct", display: "Width" },
    { code: "131197000", system: "http://snomed.info/sct", display: "Depth" },
    { code: "81827009", system: "http://snomed.info/sct", display: "Diameter" },
    { code: "103339001", system: "http://snomed.info/sct", display: "Long Axis" },
    { code: "103340004", system: "http://snomed.info/sct", display: "Short Axis" },
    { code: "131187009", system: "http://snomed.info/sct", display: "Major Axis" },
    { code: "131188004", system: "http://snomed.info/sct", display: "Minor Axis" },
    { code: "131189007", system: "http://snomed.info/sct", display: "Perpendicular Axis" },
    { code: "131190003", system: "http://snomed.info/sct", display: "Radius" },
    { code: "131191004", system: "http://snomed.info/sct", display: "Perimeter" },
    { code: "74551000", system: "http://snomed.info/sct", display: "Circumference" },
    { code: "131192006", system: "http://snomed.info/sct", display: "Diameter of circumscribed circle" },
    { code: "42798000", system: "http://snomed.info/sct", display: "Area" },
    { code: "131184002", system: "http://snomed.info/sct", display: "Area of defined region" },
    { code: "118565006", system: "http://snomed.info/sct", display: "Volume" },
];
/**
 * Check if a code is valid in this ValueSet
 */
export function isValidResultsRadiologyComponentUvIpsCode(code) {
    return ResultsRadiologyComponentUvIpsConcepts.some(c => c.code === code);
}
/**
 * Get concept details by code
 */
export function getResultsRadiologyComponentUvIpsConcept(code) {
    return ResultsRadiologyComponentUvIpsConcepts.find(c => c.code === code);
}
/**
 * Array of all valid codes (for runtime checks)
 */
export const ResultsRadiologyComponentUvIpsCodes = ResultsRadiologyComponentUvIpsConcepts.map(c => c.code);
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export function randomResultsRadiologyComponentUvIpsCode() {
    return ResultsRadiologyComponentUvIpsCodes[Math.floor(Math.random() * ResultsRadiologyComponentUvIpsCodes.length)];
}
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export function randomResultsRadiologyComponentUvIpsConcept() {
    return ResultsRadiologyComponentUvIpsConcepts[Math.floor(Math.random() * ResultsRadiologyComponentUvIpsConcepts.length)];
}

/**
 * ValueSet: ResultsRadiologyComponentUvIps
 * URL: http://hl7.org/fhir/uv/ips/ValueSet/results-radiology-component-uv-ips
 * Size: 37 concepts
 */
export declare const ResultsRadiologyComponentUvIpsConcepts: readonly [{
    readonly code: "121065";
    readonly system: "http://dicom.nema.org/resources/ontology/DCM";
    readonly display: "Procedure Description";
}, {
    readonly code: "121069";
    readonly system: "http://dicom.nema.org/resources/ontology/DCM";
    readonly display: "Previous Finding";
}, {
    readonly code: "121071";
    readonly system: "http://dicom.nema.org/resources/ontology/DCM";
    readonly display: "Finding";
}, {
    readonly code: "121073";
    readonly system: "http://dicom.nema.org/resources/ontology/DCM";
    readonly display: "Impression";
}, {
    readonly code: "121075";
    readonly system: "http://dicom.nema.org/resources/ontology/DCM";
    readonly display: "Recommendation";
}, {
    readonly code: "121077";
    readonly system: "http://dicom.nema.org/resources/ontology/DCM";
    readonly display: "Conclusion";
}, {
    readonly code: "121110";
    readonly system: "http://dicom.nema.org/resources/ontology/DCM";
    readonly display: "Patient Presentation";
}, {
    readonly code: "121111";
    readonly system: "http://dicom.nema.org/resources/ontology/DCM";
    readonly display: "Summary";
}, {
    readonly code: "121207";
    readonly system: "http://dicom.nema.org/resources/ontology/DCM";
    readonly display: "Height";
}, {
    readonly code: "121211";
    readonly system: "http://dicom.nema.org/resources/ontology/DCM";
    readonly display: "Path length";
}, {
    readonly code: "121206";
    readonly system: "http://dicom.nema.org/resources/ontology/DCM";
    readonly display: "Distance";
}, {
    readonly code: "121216";
    readonly system: "http://dicom.nema.org/resources/ontology/DCM";
    readonly display: "Volume estimated from single 2D region";
}, {
    readonly code: "121218";
    readonly system: "http://dicom.nema.org/resources/ontology/DCM";
    readonly display: "Volume estimated from two non-coplanar 2D regions";
}, {
    readonly code: "121217";
    readonly system: "http://dicom.nema.org/resources/ontology/DCM";
    readonly display: "Volume estimated from three or more non-coplanar 2D regions";
}, {
    readonly code: "121222";
    readonly system: "http://dicom.nema.org/resources/ontology/DCM";
    readonly display: "Volume of sphere";
}, {
    readonly code: "121221";
    readonly system: "http://dicom.nema.org/resources/ontology/DCM";
    readonly display: "Volume of ellipsoid";
}, {
    readonly code: "121220";
    readonly system: "http://dicom.nema.org/resources/ontology/DCM";
    readonly display: "Volume of circumscribed sphere";
}, {
    readonly code: "121219";
    readonly system: "http://dicom.nema.org/resources/ontology/DCM";
    readonly display: "Volume of bounding three dimensional region";
}, {
    readonly code: "11329-0";
    readonly system: "http://loinc.org";
    readonly display: "History";
}, {
    readonly code: "55115-0";
    readonly system: "http://loinc.org";
    readonly display: "Request";
}, {
    readonly code: "116224001";
    readonly system: "http://snomed.info/sct";
    readonly display: "Complication of Procedure";
}, {
    readonly code: "410668003";
    readonly system: "http://snomed.info/sct";
    readonly display: "Length";
}, {
    readonly code: "103355008";
    readonly system: "http://snomed.info/sct";
    readonly display: "Width";
}, {
    readonly code: "131197000";
    readonly system: "http://snomed.info/sct";
    readonly display: "Depth";
}, {
    readonly code: "81827009";
    readonly system: "http://snomed.info/sct";
    readonly display: "Diameter";
}, {
    readonly code: "103339001";
    readonly system: "http://snomed.info/sct";
    readonly display: "Long Axis";
}, {
    readonly code: "103340004";
    readonly system: "http://snomed.info/sct";
    readonly display: "Short Axis";
}, {
    readonly code: "131187009";
    readonly system: "http://snomed.info/sct";
    readonly display: "Major Axis";
}, {
    readonly code: "131188004";
    readonly system: "http://snomed.info/sct";
    readonly display: "Minor Axis";
}, {
    readonly code: "131189007";
    readonly system: "http://snomed.info/sct";
    readonly display: "Perpendicular Axis";
}, {
    readonly code: "131190003";
    readonly system: "http://snomed.info/sct";
    readonly display: "Radius";
}, {
    readonly code: "131191004";
    readonly system: "http://snomed.info/sct";
    readonly display: "Perimeter";
}, {
    readonly code: "74551000";
    readonly system: "http://snomed.info/sct";
    readonly display: "Circumference";
}, {
    readonly code: "131192006";
    readonly system: "http://snomed.info/sct";
    readonly display: "Diameter of circumscribed circle";
}, {
    readonly code: "42798000";
    readonly system: "http://snomed.info/sct";
    readonly display: "Area";
}, {
    readonly code: "131184002";
    readonly system: "http://snomed.info/sct";
    readonly display: "Area of defined region";
}, {
    readonly code: "118565006";
    readonly system: "http://snomed.info/sct";
    readonly display: "Volume";
}];
/** String type (ValueSet too large for union type) */
export type ResultsRadiologyComponentUvIpsCode = string;
/** Type representing a concept from this ValueSet */
export type ResultsRadiologyComponentUvIpsConcept = typeof ResultsRadiologyComponentUvIpsConcepts[number];
/**
 * Check if a code is valid in this ValueSet
 */
export declare function isValidResultsRadiologyComponentUvIpsCode(code: string): code is ResultsRadiologyComponentUvIpsCode;
/**
 * Get concept details by code
 */
export declare function getResultsRadiologyComponentUvIpsConcept(code: string): ResultsRadiologyComponentUvIpsConcept | undefined;
/**
 * Array of all valid codes (for runtime checks)
 */
export declare const ResultsRadiologyComponentUvIpsCodes: ("121207" | "11329-0" | "121065" | "121069" | "121071" | "121073" | "121075" | "121077" | "121110" | "121111" | "121211" | "121206" | "121216" | "121218" | "121217" | "121222" | "121221" | "121220" | "121219" | "55115-0" | "116224001" | "410668003" | "103355008" | "131197000" | "81827009" | "103339001" | "103340004" | "131187009" | "131188004" | "131189007" | "131190003" | "131191004" | "74551000" | "131192006" | "42798000" | "131184002" | "118565006")[];
/**
 * Pick a random code from this ValueSet (for test data generation)
 */
export declare function randomResultsRadiologyComponentUvIpsCode(): ResultsRadiologyComponentUvIpsCode;
/**
 * Pick a random concept from this ValueSet (includes system and display)
 */
export declare function randomResultsRadiologyComponentUvIpsConcept(): ResultsRadiologyComponentUvIpsConcept;

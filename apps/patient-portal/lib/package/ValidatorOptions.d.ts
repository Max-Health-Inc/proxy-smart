/** Runtime options for generated FHIR validators. */
export interface ValidatorOptions {
    /** Terminology server URL for memberOf() evaluation (e.g. "https://tx.fhir.org/r4"). */
    terminologyUrl?: string;
    /** FHIR server URL for resolve() evaluation (e.g. "https://hapi.fhir.org/baseR4"). */
    fhirServerUrl?: string;
    /** HTTP headers keyed by server URL — used for auth with terminology or FHIR servers. */
    httpHeaders?: Record<string, string>;
    /** AbortSignal for cancelling long-running async evaluations. */
    signal?: AbortSignal;
    /** Debug tracing callback — invoked for every FHIRPath trace() call. */
    traceFn?: (value: any, label: string) => void;
}

/**
 * FHIR Bundle Parser - provides type-safe parsing and filtering of FHIR Bundles
 */
export class BundleParser {
    constructor(bundle) {
        this.bundle = bundle;
    }
    /**
     * Get all resources from the bundle
     */
    getAllResources() {
        return this.bundle.entry?.map(e => e.resource).filter((r) => r !== undefined) || [];
    }
    /**
     * Get resources of a specific type
     */
    getResourcesByType(resourceType) {
        const entries = this.getAllEntries();
        switch (resourceType) {
            case 'AllergyIntolerance':
                return entries
                    .filter((e) => e.resource?.resourceType === 'AllergyIntolerance')
                    .map(e => e.resource);
            case 'Bundle':
                return entries
                    .filter((e) => e.resource?.resourceType === 'Bundle')
                    .map(e => e.resource);
            case 'Composition':
                return entries
                    .filter((e) => e.resource?.resourceType === 'Composition')
                    .map(e => e.resource);
            case 'Condition':
                return entries
                    .filter((e) => e.resource?.resourceType === 'Condition')
                    .map(e => e.resource);
            case 'Device':
                return entries
                    .filter((e) => e.resource?.resourceType === 'Device')
                    .map(e => e.resource);
            case 'DeviceUseStatement':
                return entries
                    .filter((e) => e.resource?.resourceType === 'DeviceUseStatement')
                    .map(e => e.resource);
            case 'DiagnosticReport':
                return entries
                    .filter((e) => e.resource?.resourceType === 'DiagnosticReport')
                    .map(e => e.resource);
            case 'Flag':
                return entries
                    .filter((e) => e.resource?.resourceType === 'Flag')
                    .map(e => e.resource);
            case 'ImagingStudy':
                return entries
                    .filter((e) => e.resource?.resourceType === 'ImagingStudy')
                    .map(e => e.resource);
            case 'Immunization':
                return entries
                    .filter((e) => e.resource?.resourceType === 'Immunization')
                    .map(e => e.resource);
            case 'Medication':
                return entries
                    .filter((e) => e.resource?.resourceType === 'Medication')
                    .map(e => e.resource);
            case 'MedicationRequest':
                return entries
                    .filter((e) => e.resource?.resourceType === 'MedicationRequest')
                    .map(e => e.resource);
            case 'MedicationStatement':
                return entries
                    .filter((e) => e.resource?.resourceType === 'MedicationStatement')
                    .map(e => e.resource);
            case 'Observation':
                return entries
                    .filter((e) => e.resource?.resourceType === 'Observation')
                    .map(e => e.resource);
            case 'Organization':
                return entries
                    .filter((e) => e.resource?.resourceType === 'Organization')
                    .map(e => e.resource);
            case 'Patient':
                return entries
                    .filter((e) => e.resource?.resourceType === 'Patient')
                    .map(e => e.resource);
            case 'PractitionerRole':
                return entries
                    .filter((e) => e.resource?.resourceType === 'PractitionerRole')
                    .map(e => e.resource);
            case 'Practitioner':
                return entries
                    .filter((e) => e.resource?.resourceType === 'Practitioner')
                    .map(e => e.resource);
            case 'Procedure':
                return entries
                    .filter((e) => e.resource?.resourceType === 'Procedure')
                    .map(e => e.resource);
            case 'Specimen':
                return entries
                    .filter((e) => e.resource?.resourceType === 'Specimen')
                    .map(e => e.resource);
            default:
                return [];
        }
    }
    /**
     * Get the first resource of a specific type
     */
    getFirstResourceByType(resourceType) {
        return this.getResourcesByType(resourceType)[0];
    }
    filterResources(predicate) {
        return this.getAllResources().filter(predicate);
    }
    /**
     * Get all entries (including metadata like fullUrl, search scores, etc.)
     */
    getAllEntries() {
        return (this.bundle.entry || []);
    }
    /**
     * Get entries of a specific resource type
     */
    getEntriesByType(resourceType) {
        return this.getAllEntries().filter((e) => e.resource?.resourceType === resourceType);
    }
    /**
     * Get total count from bundle (if available)
     */
    getTotal() {
        return this.bundle.total;
    }
    /**
     * Get next page URL from bundle links
     */
    getNextUrl() {
        return this.bundle.link?.find(l => l.relation === 'next')?.url;
    }
    /**
     * Get previous page URL from bundle links
     */
    getPreviousUrl() {
        return this.bundle.link?.find(l => l.relation === 'previous')?.url;
    }
    /**
     * Check if bundle has more pages
     */
    hasNextPage() {
        return this.getNextUrl() !== undefined;
    }
    /**
     * Group resources by type
     */
    groupByResourceType() {
        const grouped = new Map();
        for (const resource of this.getAllResources()) {
            const type = resource.resourceType;
            if (!grouped.has(type)) {
                grouped.set(type, []);
            }
            grouped.get(type).push(resource);
        }
        return grouped;
    }
    /**
     * Get bundle type
     */
    getBundleType() {
        return this.bundle.type;
    }
}
/**
 * Parse a FHIR Bundle into a BundleParser instance
 */
export function parseBundle(bundle) {
    return new BundleParser(bundle);
}

import type { Bundle, FhirResource } from "./types.js";
/**
 * Represents a single entry in a FHIR Bundle
 */
export type BundleEntry<T extends FhirResource = FhirResource> = {
    fullUrl?: string;
    resource?: T;
    search?: {
        mode?: 'match' | 'include' | 'outcome';
        score?: number;
    };
    request?: {
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
        url: string;
    };
    response?: {
        status: string;
        location?: string;
        etag?: string;
        lastModified?: string;
        outcome?: FhirResource;
    };
};
/**
 * FHIR Bundle Parser - provides type-safe parsing and filtering of FHIR Bundles
 */
export declare class BundleParser {
    private readonly bundle;
    constructor(bundle: Bundle<FhirResource>);
    /**
     * Get all resources from the bundle
     */
    getAllResources(): FhirResource[];
    /**
     * Get resources of a specific type
     */
    getResourcesByType<T extends FhirResource>(resourceType: T['resourceType']): T[];
    /**
     * Get the first resource of a specific type
     */
    getFirstResourceByType<T extends FhirResource>(resourceType: T['resourceType']): T | undefined;
    /**
     * Filter resources by a predicate function
     */
    filterResources<T extends FhirResource>(predicate: (resource: FhirResource) => resource is T): T[];
    filterResources(predicate: (resource: FhirResource) => boolean): FhirResource[];
    /**
     * Get all entries (including metadata like fullUrl, search scores, etc.)
     */
    getAllEntries(): BundleEntry<FhirResource>[];
    /**
     * Get entries of a specific resource type
     */
    getEntriesByType<T extends FhirResource>(resourceType: T['resourceType']): BundleEntry<T>[];
    /**
     * Get total count from bundle (if available)
     */
    getTotal(): number | undefined;
    /**
     * Get next page URL from bundle links
     */
    getNextUrl(): string | undefined;
    /**
     * Get previous page URL from bundle links
     */
    getPreviousUrl(): string | undefined;
    /**
     * Check if bundle has more pages
     */
    hasNextPage(): boolean;
    /**
     * Group resources by type
     */
    groupByResourceType(): Map<string, FhirResource[]>;
    /**
     * Get bundle type
     */
    getBundleType(): 'collection' | 'searchset' | 'transaction-response' | 'transaction' | undefined;
}
/**
 * Parse a FHIR Bundle into a BundleParser instance
 */
export declare function parseBundle(bundle: Bundle<FhirResource>): BundleParser;

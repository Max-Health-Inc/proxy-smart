/**
 * Implementation of FHIR resource reader
 */
export class FhirResourceReader {
    constructor(baseUrl, resourceType, fetchFn) {
        this.baseUrl = baseUrl;
        this.resourceType = resourceType;
        this.fetchFn = fetchFn ?? globalThis.fetch.bind(globalThis);
    }
    async read(id) {
        const url = `${this.baseUrl}/${this.resourceType}/${id}`;
        const response = await this.fetchFn(url, {
            headers: {
                Accept: "application/fhir+json",
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to read ${this.resourceType}/${id}: ${response.status} ${response.statusText}`);
        }
        return (await response.json());
    }
    async search(params) {
        const url = new URL(`${this.baseUrl}/${this.resourceType}`);
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined) {
                    if (Array.isArray(value)) {
                        for (const v of value) {
                            url.searchParams.append(key, v);
                        }
                    }
                    else {
                        url.searchParams.set(key, String(value));
                    }
                }
            }
        }
        const response = await this.fetchFn(url.toString(), {
            headers: {
                Accept: "application/fhir+json",
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to search ${this.resourceType}: ${response.status} ${response.statusText}`);
        }
        return (await response.json());
    }
    async searchOne(params) {
        const bundle = await this.search({ ...params, _count: 1 });
        return bundle.entry?.[0]?.resource;
    }
    async searchAll(params) {
        const results = [];
        let bundle = await this.search(params);
        while (bundle.entry && bundle.entry.length > 0) {
            results.push(...bundle.entry.map((e) => e.resource));
            // Check for next link
            const nextLink = bundle.link?.find((l) => l.relation === "next")?.url;
            if (!nextLink)
                break;
            const response = await this.fetchFn(nextLink, {
                headers: {
                    Accept: "application/fhir+json",
                },
            });
            if (!response.ok)
                break;
            bundle = (await response.json());
        }
        return results;
    }
}

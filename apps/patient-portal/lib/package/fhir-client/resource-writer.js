/**
 * Implementation of FHIR resource writer
 */
export class FhirResourceWriterImpl {
    constructor(baseUrl, resourceType, fetchFn) {
        this.baseUrl = baseUrl;
        this.resourceType = resourceType;
        this.fetchFn = fetchFn ?? globalThis.fetch.bind(globalThis);
    }
    async create(resource) {
        const url = `${this.baseUrl}/${this.resourceType}`;
        const response = await this.fetchFn(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/fhir+json",
                Accept: "application/fhir+json",
            },
            body: JSON.stringify(resource),
        });
        if (!response.ok) {
            throw new Error(`Failed to create ${this.resourceType}: ${response.status} ${response.statusText}`);
        }
        return (await response.json());
    }
    async update(resource) {
        const url = `${this.baseUrl}/${this.resourceType}/${resource.id}`;
        const response = await this.fetchFn(url, {
            method: "PUT",
            headers: {
                "Content-Type": "application/fhir+json",
                Accept: "application/fhir+json",
            },
            body: JSON.stringify(resource),
        });
        if (!response.ok) {
            throw new Error(`Failed to update ${this.resourceType}/${resource.id}: ${response.status} ${response.statusText}`);
        }
        return (await response.json());
    }
    async delete(id) {
        const url = `${this.baseUrl}/${this.resourceType}/${id}`;
        const response = await this.fetchFn(url, {
            method: "DELETE",
        });
        if (!response.ok) {
            throw new Error(`Failed to delete ${this.resourceType}/${id}: ${response.status} ${response.statusText}`);
        }
    }
    async createOrUpdate(resource) {
        if (typeof resource === "object" &&
            resource !== null &&
            "id" in resource &&
            resource.id) {
            return this.update(resource);
        }
        else {
            return this.create(resource);
        }
    }
}

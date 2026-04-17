import { PGenderIdentity } from "./PGenderIdentity";
import { Address, ContactPoint, Extension, HumanName, Identifier, Patient, Reference } from "fhir/r4";
import { Pronouns } from "./Pronouns";
export interface PatientUvIps extends Omit<Patient, 'identifier' | 'name' | 'telecom' | 'address' | 'generalPractitioner' | 'extension'> {
    /** Must Support */
    identifier?: Identifier[];
    /** Must Support */
    name: HumanName[];
    /** Must Support */
    telecom?: ContactPoint[];
    /** Must Support */
    address?: Address[];
    /** Must Support */
    generalPractitioner?: Reference[];
    extension?: (Extension | PGenderIdentity | Pronouns)[];
}
import type { ValidatorOptions } from './ValidatorOptions.js';
export declare function validatePatientUvIps(resource: PatientUvIps, options?: ValidatorOptions): Promise<{
    errors: string[];
    warnings: string[];
}>;

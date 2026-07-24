Alias: $consentscope = http://terminology.hl7.org/CodeSystem/consentscope

// ─────────────────────────────────────────────────────────────────────────────
// Consent — patient-privacy data-access consent
//
// The base profile the consent portal manages: which organization or app the
// patient has granted access to, over which data classes, for how long.
// Mirrors the model in maxhealth.tech/CONSENT_PORTAL.md.
// ─────────────────────────────────────────────────────────────────────────────

Profile: MaxHealthConsent
Parent: Consent
Id: maxhealth-consent
Title: "Max Health Consent"
Description: "Patient-privacy consent governing which organizations or apps may access a patient's data, scoped by data class and time period."

* status MS
* scope = $consentscope#patient-privacy
* category 1..* MS
* patient 1..1 MS
* dateTime MS
* provision MS
* provision.type MS
* provision.period MS
* provision.actor MS
* provision.actor.role MS
* provision.actor.reference MS
* provision.action MS
* provision.class MS

// ─────────────────────────────────────────────────────────────────────────────
// Share Consent — a SMART Health Link (SHL) modelled as a Consent
//
// A patient-initiated share IS a consent grant: the patient (performer) permits
// a recipient (provision.actor) to access a scoped set of resource classes
// until the link expires (provision.period.end == the SHL's expiresAt).
//
// Consent.identifier carries the SHL session id so the proxy can reconcile the
// Consent with its SHL session store (mint → active, revoke → inactive+delete).
// ─────────────────────────────────────────────────────────────────────────────

Profile: MaxHealthShareConsent
Parent: MaxHealthConsent
Id: maxhealth-share-consent
Title: "Max Health Share Consent (SMART Health Link)"
Description: "A patient-initiated data share represented as a Consent. Backs a SMART Health Link (SHL): a time-limited permit provision granting a recipient access to a scoped set of resources. The link's expiry is provision.period.end; the SHL session id is carried in Consent.identifier."

// The SHL session id — links this Consent to its row in the SHL session store.
* identifier 1..* MS
// The patient who created the share.
* performer 1..1 MS
// A share only ever permits; it never denies.
* provision.type = #permit (exactly)
// Every share expires — period.end maps to the SHL's expiresAt.
* provision.period 1..1 MS
* provision.period.end 1..1 MS
// Granted to any holder of the link (a bearer credential), carried as a single
// Information Recipient actor. Actual recipients/devices are NOT enumerated here
// — access is tracked out of band via the SHL session store + AuditEvent, which
// is where an access log belongs (Consent.provision.actor is the grantee, not a log).
* provision.actor 1..* MS
* provision.actor.role MS
// Resource classes the link exposes. Present only for scoped shares (e.g. a
// single ImagingStudy); a whole-patient share omits it (empty class = all),
// so this is optional rather than a fabricated type list.
* provision.class 0..* MS

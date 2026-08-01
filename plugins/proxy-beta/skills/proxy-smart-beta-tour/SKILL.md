---
name: proxy-smart-beta-tour
description: >-
  Find your way around the public Proxy Smart beta at beta.proxy-smart.com — a live SMART on
  FHIR authorization proxy with seeded demo data. Use when someone wants to see how a SMART
  deployment is wired, try registering an app or changing scopes without touching anything
  real, evaluate Proxy Smart before deploying it, or read the seeded FHIR data. Uses the
  `proxy-smart-beta` MCP server.
---

# The Proxy Smart beta

`beta.proxy-smart.com` runs the whole stack: the authorization proxy, Keycloak as the identity
provider, and a HAPI FHIR server with seeded data. It exists so that Proxy Smart can be
understood by using one rather than by reading about one. The MCP server exposes the same
admin tools a real deployment does, so everything here transfers.

## Say what it is, once, before changing anything

This is a public, shared environment, and it is reset without notice. Say so plainly the first
time someone is about to write to it, and then stop repeating it.

- **Never put real patient data in it.** Not as a test, not "just one record". Anything written
  here is visible to everyone else using the beta.
- **Anyone else's work can vanish, including yours.** Do not build on it.
- **What you change, others see.** Deleting a seeded client to see what happens breaks the
  environment for the next person. Prefer creating something new with a name of your own over
  editing what is already there.

If someone is evaluating Proxy Smart for actual use, the beta answers "how does this work" and
their own deployment answers "will this work for us". Say when they have reached the second
question rather than letting them keep prototyping here.

## What is in it

**Seeded FHIR data** — a small but connected set: two patients, two practitioners, a Person
record linking a user to a patient, and around fifty observations, plus conditions, encounters,
medication requests, allergies, immunizations, procedures, diagnostic reports, document
references, imaging studies, questionnaires, and organizations. Enough for a patient chart to
look like a chart. FHIR is served under `/proxy-smart-backend/{server}/{version}/`, and each
server publishes its own `.well-known/smart-configuration`.

**Registered clients** — the interesting part of the tour, because they are real examples of
each app type rather than toy entries. Read them before creating anything: `patient-portal`,
`dicom-viewer`, `consent-app`, and `dtr-app` are SMART apps with different scope profiles;
`inferno-backend-services` is a backend service using `private_key_jwt`; `mcp-client` is the
public client MCP tools authenticate through; `fhir-resource-server` and `mcp-resource-server`
are the audience targets that make RFC 8707 resource indicators work.

**Keycloak** at `/auth`, realm `proxy-smart`, with the SMART scopes, protocol mappers, and
organizations already configured.

**A SMART App Launch 2.2.0 compliance run.** The deployment is tested against Inferno's
`smart_stu2_2` suite in CI, and the report is in the repository under `testing/beta/report`.
When someone asks whether Proxy Smart is actually compliant, point at that rather than at a
badge.

## Good ways to spend the first ten minutes

Pick by what the person is trying to find out, and do one thing at a time — a tour that lists
everything at once teaches nothing.

- **"How does a SMART app get configured?"** Read `patient-portal` and `inferno-backend-services`
  side by side. The differences — public vs confidential, redirect URIs vs none, `patient/…`
  vs `system/…` scopes, PKCE vs `private_key_jwt` — are the whole of SMART client configuration
  in two examples.
- **"What do the scopes look like?"** List the SMART scopes and the scope sets, then look at
  which are default and which optional on one app.
- **"Can I register my own app?"** Yes, with a client ID clearly your own. This is the best use
  of the beta.
- **"What does the FHIR side look like?"** Read a patient and their observations through the
  proxy, so the scope enforcement is part of what is seen.
- **"Is it compliant?"** The Inferno report.

## Signing in

The endpoint is OAuth-protected and discovers its authorization server through RFC 9728, so a
plugin-aware client runs the flow itself. Demo accounts are documented in the repository; treat
those credentials as public, because they are, and never reuse them anywhere else.

## When the beta is the wrong tool

Once someone is configuring apps they intend to keep, they want their own deployment. Install
the `proxy` plugin, point `PROXY_SMART_URL` at their instance, and the
`smart-app-onboarding` and `smart-launch-debugging` skills that come with it cover the
production work this tour deliberately does not.

Deployment instructions:
[Proxy Smart README](https://github.com/Max-Health-Inc/proxy-smart#quick-start) ·
[Deployment guide](https://github.com/Max-Health-Inc/proxy-smart/blob/main/docs/deployment.md)

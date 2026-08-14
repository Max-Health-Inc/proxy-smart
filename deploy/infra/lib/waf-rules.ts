// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import type * as wafv2 from 'aws-cdk-lib/aws-wafv2';

/**
 * The AWS managed rule groups every production Web ACL runs, with the exclusions
 * that OAuth and MCP traffic requires.
 *
 * ONE DEFINITION, because BackendStack and KeycloakStack front two halves of the
 * SAME authorization flow. When only the Keycloak ACL carried exclusions, a request
 * that cleared `api.proxy-smart.com/auth/authorize` was still blocked one hop later
 * — and vice versa. Divergence between the two is always a bug.
 *
 * Beta runs behind Caddy with no WAF at all, which is why every failure below was
 * production-only and invisible in staging.
 */

/**
 * Sub-rules of AWSManagedRulesCommonRuleSet that legitimate traffic trips.
 *
 * Excluding a rule sets it to COUNT, not off: it still evaluates and still emits
 * CloudWatch metrics and sampled requests, it just stops terminating the request.
 *
 * Each entry below is a MEASURED failure against production (2026-08-08), not a
 * precaution. Re-verify before removing one.
 */
const COMMON_RULE_SET_EXCLUSIONS = [
  /**
   * Blocks any query string over 2048 bytes.
   *
   * An MCP client's authorization request carries `state`, `code_challenge`,
   * `redirect_uri`, `scope` and the RFC 8707 `resource` indicator in the URL, and
   * clears 2048 bytes routinely — Claude's connector does. Measured: a request to
   * /auth/authorize (and to Keycloak's /protocol/openid-connect/auth) returns 302
   * at a ~1.9KB query string and a bare nginx 403 at ~2.3KB, before the login page
   * is ever rendered. The OAuth flow therefore died at step one on production while
   * working on beta, which is exactly the "MCP works on beta, not on prod" symptom.
   */
  'SizeRestrictions_QUERYSTRING',
  /**
   * Blocks request bodies over 8KB.
   *
   * MCP is JSON-RPC over POST: a tools/call with a FHIR resource in `arguments`,
   * or a tools/list response cursor, passes 8KB easily. Measured: POST /mcp with a
   * 4KB body reaches the app (401, unauthenticated), a 9KB body is blocked (403).
   * Keycloak's login form POST can also exceed it once the theme adds hidden fields.
   */
  'SizeRestrictions_BODY',
  /**
   * Pattern-matches XSS payloads in the body.
   *
   * False-positives on both of the bodies we legitimately send: Keycloak login
   * forms, and MCP tool arguments that carry FHIR narrative (`Narrative.div` is
   * XHTML by definition, so it looks like injected markup to a generic matcher).
   */
  'CrossSiteScripting_BODY',
  /**
   * Blocks any request with no User-Agent header.
   *
   * SMART Backend Services clients are SERVERS, and a server-side HTTP client sends no
   * User-Agent unless told to — Cloudflare Workers' `fetch` is one, and so is anything
   * built on undici defaults. Measured on production: the same URL returns 200 with
   * `-A curl/8.0` and 403 with `-A ""`, for both
   * /proxy-smart-backend/<server>/R4/.well-known/smart-configuration and .../metadata.
   *
   * So SMART discovery failed for every headless client, which is the entire audience
   * of a system-scoped FHIR API. Ours reported it as "Failed to discover SMART endpoints"
   * and a member's record went unwritten. A bot heuristic that blocks conformant machine
   * clients is wrong for this API specifically.
   */
  'NoUserAgent_HEADER',
] as const;

/** Options for {@link managedRuleGroups}. */
export interface ManagedRuleGroupOptions {
  /**
   * Priority of AWSManagedRulesCommonRuleSet. KnownBadInputs takes the next slot.
   * Must sit above any explicit block rules and below any explicit allow rules —
   * WAF evaluates in ascending priority and the first terminating action wins.
   */
  startPriority: number;
}

/**
 * The shared AWS managed rule groups, ready to splice into a `CfnWebACL.rules`
 * array alongside a stack's own block/allow rules.
 */
export function managedRuleGroups({
  startPriority,
}: ManagedRuleGroupOptions): wafv2.CfnWebACL.RuleProperty[] {
  return [
    {
      name: 'AWSManagedRulesCommonRuleSet',
      priority: startPriority,
      overrideAction: { none: {} },
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesCommonRuleSet',
          excludedRules: COMMON_RULE_SET_EXCLUSIONS.map((name) => ({ name })),
        },
      },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'CommonRuleSetMetrics',
        sampledRequestsEnabled: true,
      },
    },
    {
      name: 'AWSManagedRulesKnownBadInputsRuleSet',
      priority: startPriority + 1,
      overrideAction: { none: {} },
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
        },
      },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'KnownBadInputsMetrics',
        sampledRequestsEnabled: true,
      },
    },
  ];
}

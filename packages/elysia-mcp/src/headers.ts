// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * The Streamable HTTP header contract a host's CORS layer has to honour.
 */

/**
 * Request headers a Streamable HTTP client sends, which a CORS preflight must allow.
 *
 * `Mcp-Method` and `Mcp-Name` are REQUIRED of clients from MCP 2026-07-28 (Streamable
 * HTTP, "Standard Request Headers") so intermediaries can route and inspect a request
 * without parsing the JSON-RPC body. A server that omits them from
 * Access-Control-Allow-Headers fails the preflight of any browser-based client that
 * sends them — which, being required, is every conformant one.
 */
export const MCP_REQUEST_HEADERS = [
  'Mcp-Session-Id',
  'Mcp-Protocol-Version',
  'Mcp-Method',
  'Mcp-Name',
  // Sent by 2025-era clients resuming an SSE stream. This server is stateless and
  // has nothing to resume, but the spec says ignore it rather than reject it — and
  // omitting it from the allow-list would fail those clients' preflight outright.
  'Last-Event-ID',
] as const

/**
 * Response headers a browser-based client must be able to READ, which only
 * Access-Control-Expose-Headers grants — the allow-list above does not.
 *
 * Deliberately short. `Mcp-Session-Id` used to be here, and had to be while the
 * server was stateful: it came back on initialize and the client had to echo it.
 * Statelessly there is no session id to emit, so exposing it advertised a header
 * that is never sent. `Last-Event-ID` likewise — it is a REQUEST header for stream
 * resumption, and belongs in the allow-list above rather than here.
 */
export const MCP_EXPOSED_RESPONSE_HEADERS = [
  'Mcp-Protocol-Version',
] as const

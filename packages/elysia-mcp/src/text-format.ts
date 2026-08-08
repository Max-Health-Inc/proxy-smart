// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * @max-health-inc/elysia-mcp - Tool text encoding
 *
 * Chooses the encoding for a tool result's `content[].text` block, the part a
 * client feeds to the model. `structuredContent` is unaffected and stays JSON:
 * the MCP spec requires it to be a JSON object, so machine consumers never see
 * anything but JSON regardless of what is chosen here.
 *
 * TOON collapses a uniform array of flat objects into a header plus rows, the
 * way CSV does, which is a large saving on list endpoints. It cannot do that
 * when objects carry nested maps or arrays, and then falls back to an indented
 * form that is LARGER than compact JSON. Measured against this API's own shapes
 * (gpt-tokenizer, 2026-08-09):
 *
 *   roles list (30, flat)             894 → 515 tokens   (-42%)
 *   smart scopes (40, flat)           973 → 700 tokens   (-28%)
 *   healthcare users (nested)        3433 → 3808 tokens  (+11%, WORSE)
 *   single SMART app (one object)      78 → 85 tokens    (+9%, WORSE)
 *
 * So the format is not chosen by shape heuristics, which would have to
 * re-derive the encoder's own rules and drift from them. Both encodings are
 * produced and the shorter one wins, which is correct by construction for any
 * shape and cannot regress a payload that TOON handles badly.
 */

import { encode as toonEncode } from '@toon-format/toon'

/**
 * How to encode the text block.
 *
 * `json`  always compact JSON. The default, and what every existing consumer
 *         gets, so adopting this module changes nothing until asked.
 * `auto`  whichever of JSON and TOON is shorter for this payload.
 */
export type ToolTextFormat = 'json' | 'auto'

/**
 * Length is compared in characters rather than tokens: a tokenizer would be a
 * heavyweight dependency in the hot path, and TOON's saving is structural
 * (repeated keys and delimiters removed) so the two move together. The choice
 * only has to pick the smaller of two encodings of identical data, not predict
 * an exact token count.
 */
export function chooseToolText(serialized: string, format: ToolTextFormat = 'json'): string {
  if (format !== 'auto') return serialized

  let value: unknown
  try {
    value = JSON.parse(serialized)
  } catch {
    // Not JSON — a plain-text handler response. Nothing to re-encode.
    return serialized
  }

  // Primitives gain nothing and TOON's root forms only add framing.
  if (value === null || typeof value !== 'object') return serialized

  try {
    const toon = toonEncode(value)
    return toon.length < serialized.length ? toon : serialized
  } catch {
    // An unencodable value (cycles, exotic types) is not an error worth
    // failing a tool call over — the JSON the caller already has is valid.
    return serialized
  }
}

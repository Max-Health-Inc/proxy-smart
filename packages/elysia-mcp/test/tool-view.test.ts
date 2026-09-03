// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * The `view` hook — what a tool result carries once a UI is attached.
 *
 * The invariants worth pinning are the two the MCP Apps path depends on: the
 * view replaces `structuredContent` (where a host looks for it) and leaves the
 * text block carrying the payload (where the model reads it), and a view that
 * declines or throws leaves the result exactly as it would have been.
 */

import { describe, it, expect } from 'bun:test'
import { mountRoutes } from './helpers/mount'
import { executeTool, type ToolView } from '../src/executor'
import type { ToolMetadata } from '../src/types'

const listRoles: ToolMetadata = {
  path: '/admin/roles',
  method: 'GET',
  handler: () => [{ name: 'admin' }, { name: 'user' }],
  readOnly: true,
}

const createRole: ToolMetadata = {
  path: '/admin/roles',
  method: 'POST',
  handler: (ctx: { body: { name: string } }) => ({ created: ctx.body.name }),
}

/** A stand-in for a real renderer: it only has to be a JSON object. */
const wireView: ToolView = (payload, context) => ({
  $wire: '1.0',
  tool: context.toolName,
  method: context.meta.method,
  rows: Array.isArray(payload) ? payload.length : 1,
})

describe('executeTool with a view', () => {
  it('replaces structuredContent with the view', async () => {
    const result = await executeTool('list_admin_roles', listRoles, {}, undefined, mountRoutes(listRoles), { view: wireView })
    expect(result.structuredContent).toEqual({ $wire: '1.0', tool: 'list_admin_roles', method: 'GET', rows: 2 })
  })

  it('leaves the payload in the text block, so the model still reads the data', async () => {
    const result = await executeTool('list_admin_roles', listRoles, {}, undefined, mountRoutes(listRoles), { view: wireView })
    const text = result.content[0]?.text ?? ''
    expect(JSON.parse(text)).toEqual([{ name: 'admin' }, { name: 'user' }])
    expect(text).not.toContain('$wire')
  })

  it('is told the tool name and the route it came from', async () => {
    const seen: string[] = []
    const view: ToolView = (_payload, ctx) => {
      seen.push(`${ctx.toolName} ${ctx.meta.method} ${ctx.meta.path}`)
      return { ok: true }
    }
    await executeTool('create_admin_roles', createRole, { name: 'nurse' }, undefined, mountRoutes(createRole), { view })
    expect(seen).toEqual(['create_admin_roles POST /admin/roles'])
  })

  it('keeps the payload when the view declines to render it', async () => {
    const result = await executeTool('list_admin_roles', listRoles, {}, undefined, mountRoutes(listRoles), {
      view: () => undefined,
    })
    expect(result.structuredContent).toEqual([{ name: 'admin' }, { name: 'user' }])
  })

  it('keeps the payload when the view throws — presentation cannot fail a call', async () => {
    const result = await executeTool('list_admin_roles', listRoles, {}, undefined, mountRoutes(listRoles), {
      view: () => { throw new Error('renderer exploded') },
    })
    expect(result.isError).toBeUndefined()
    expect(result.structuredContent).toEqual([{ name: 'admin' }, { name: 'user' }])
  })

  it('is not consulted for an error result', async () => {
    let called = false
    const broken: ToolMetadata = {
      path: '/admin/roles',
      method: 'GET',
      handler: () => { throw new Error('DB down') },
    }
    const result = await executeTool('list_admin_roles', broken, {}, undefined, mountRoutes(broken), {
      view: () => { called = true; return { rendered: true } },
    })
    expect(result.isError).toBe(true)
    expect(called).toBe(false)
  })

  it('composes with the auto text format: the two halves are chosen independently', async () => {
    const result = await executeTool('list_admin_roles', listRoles, {}, undefined, mountRoutes(listRoles), {
      view: wireView,
      textFormat: 'auto',
    })
    expect(result.structuredContent).toMatchObject({ $wire: '1.0' })
    // Whichever encoding won, the text block encodes the payload and not the view.
    expect(result.content[0]?.text).toContain('admin')
    expect(result.content[0]?.text).not.toContain('$wire')
  })

  it('changes nothing when no view is supplied', async () => {
    const result = await executeTool('list_admin_roles', listRoles, {}, undefined, mountRoutes(listRoles))
    expect(result.structuredContent).toEqual([{ name: 'admin' }, { name: 'user' }])
  })
})

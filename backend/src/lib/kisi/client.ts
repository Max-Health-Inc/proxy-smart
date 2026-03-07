/**
 * Kisi API Client
 * 
 * TypeScript fetch-based client for the Kisi Access Control API.
 * Replaces the official kisi-client (axios-based, untyped JS) with a
 * typed, dependency-free implementation that fits the project stack.
 * 
 * API Docs: https://api.kisi.io/docs
 */

import { logger } from '../logger'

// ==================== Types ====================

export interface KisiClientConfig {
  /** Kisi API base URL (default: https://api.kisi.io) */
  baseUrl?: string
  /** API key for Organization API authentication */
  apiKey?: string
  /** Request timeout in ms (default: 10000) */
  timeout?: number
}

export interface KisiPagination {
  offset: number
  limit: number
  count: number
}

export interface KisiPaginatedResponse<T> {
  data: T[]
  pagination: KisiPagination
}

export interface KisiPlace {
  id: number
  name: string
  address?: string
  description?: string
  latitude?: number
  longitude?: number
  timeZone?: string
  organizationId?: number
  createdAt?: string
  updatedAt?: string
}

export interface KisiLock {
  id: number
  name: string
  placeId: number
  description?: string
  online: boolean
  locked?: boolean
  type?: string
  createdAt?: string
  updatedAt?: string
}

export interface KisiGroup {
  id: number
  name: string
  description?: string
  organizationId?: number
  placeId?: number
  createdAt?: string
  updatedAt?: string
}

export interface KisiMember {
  id: number
  name?: string
  email: string
  organizationId?: number
  groupIds?: number[]
  confirmed?: boolean
  enabled?: boolean
  image?: string
  createdAt?: string
  updatedAt?: string
}

export interface KisiGroupLock {
  id: number
  groupId: number
  lockId: number
  createdAt?: string
  updatedAt?: string
}

export interface KisiEvent {
  id: number
  action: string
  actorType?: string
  actorId?: number
  actorEmail?: string
  objectType?: string
  objectId?: number
  lockId?: number
  message?: string
  createdAt?: string
}

export interface KisiCreateMemberRequest {
  name?: string
  email: string
}

export interface KisiCreateGroupRequest {
  name: string
  description?: string
}

export interface KisiUnlockResponse {
  message: string
}

export interface KisiListParams {
  limit?: number
  offset?: number
  query?: string
  [key: string]: string | number | boolean | undefined
}

// ==================== Error ====================

export class KisiApiError extends Error {
  public readonly status: number
  public readonly code: string
  public readonly reason: string | null

  constructor(status: number, code = '000000', reason: string | null = null) {
    super(`Kisi API error: ${status} - ${reason || code}`)
    this.name = 'KisiApiError'
    this.status = status
    this.code = code
    this.reason = reason
  }
}

// ==================== Client ====================

export class KisiClient {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly timeout: number

  constructor(config: KisiClientConfig) {
    this.baseUrl = (config.baseUrl || 'https://api.kisi.io').replace(/\/$/, '')
    if (!config.apiKey) {
      throw new Error('Kisi API key is required')
    }
    this.apiKey = config.apiKey
    this.timeout = config.timeout || 10_000
  }

  // ==================== Low-level HTTP ====================

  private async request<T>(method: string, path: string, body?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}/${path.replace(/^\//, '')}`)
    
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(this.toSnakeCase(key), String(value))
        }
      }
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `KISI-ORGANIZATION ${this.apiKey}`,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      logger.debug('kisi', `${method} ${url.pathname}`, { params })
      
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(this.decamelizeKeys(body)) : undefined,
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        const code = errorBody?.code || '000000'
        const reason = errorBody?.error || errorBody?.errors || null
        throw new KisiApiError(response.status, code, typeof reason === 'string' ? reason : JSON.stringify(reason))
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T
      }

      const data = await response.json()

      // Handle pagination header
      const collectionRange = response.headers.get('x-collection-range')
      if (collectionRange && Array.isArray(data)) {
        return this.parsePaginatedResponse(data, collectionRange) as T
      }

      return this.camelizeKeys(data) as T
    } catch (error) {
      if (error instanceof KisiApiError) throw error
      if ((error as Error).name === 'AbortError') {
        throw new KisiApiError(408, 'TIMEOUT', 'Request timed out')
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private parsePaginatedResponse<T>(data: T[], collectionRange: string): KisiPaginatedResponse<T> {
    const [range, count] = collectionRange.split('/')
    const totalCount = Number(count)

    if (range === '*') {
      return {
        data: (data as unknown[]).map(item => this.camelizeKeys(item)) as T[],
        pagination: { offset: 0, limit: 0, count: totalCount }
      }
    }

    const [start, end] = range.split('-').map(Number)
    return {
      data: (data as unknown[]).map(item => this.camelizeKeys(item)) as T[],
      pagination: { offset: start, limit: end - start + 1, count: totalCount }
    }
  }

  async get<T>(path: string, params?: KisiListParams): Promise<T> {
    return this.request<T>('GET', path, undefined, params)
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body)
  }

  async delete<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('DELETE', path, undefined, params)
  }

  // ==================== Places ====================

  async getPlaces(params?: KisiListParams): Promise<KisiPaginatedResponse<KisiPlace>> {
    return this.get<KisiPaginatedResponse<KisiPlace>>('places', params)
  }

  async getPlace(id: number): Promise<KisiPlace> {
    return this.get<KisiPlace>(`places/${id}`)
  }

  // ==================== Locks ====================

  async getLocks(params?: KisiListParams & { placeId?: number }): Promise<KisiPaginatedResponse<KisiLock>> {
    return this.get<KisiPaginatedResponse<KisiLock>>('locks', params)
  }

  async getLock(id: number): Promise<KisiLock> {
    return this.get<KisiLock>(`locks/${id}`)
  }

  async unlock(lockId: number): Promise<KisiUnlockResponse> {
    return this.post<KisiUnlockResponse>(`locks/${lockId}/unlock`)
  }

  // ==================== Groups ====================

  async getGroups(params?: KisiListParams): Promise<KisiPaginatedResponse<KisiGroup>> {
    return this.get<KisiPaginatedResponse<KisiGroup>>('groups', params)
  }

  async getGroup(id: number): Promise<KisiGroup> {
    return this.get<KisiGroup>(`groups/${id}`)
  }

  async createGroup(data: KisiCreateGroupRequest): Promise<KisiGroup> {
    return this.post<KisiGroup>('groups', { group: data })
  }

  async deleteGroup(id: number): Promise<void> {
    return this.delete<void>(`groups/${id}`)
  }

  // ==================== Group ↔ Lock assignments ====================

  async getGroupLocks(params?: KisiListParams & { groupId?: number }): Promise<KisiPaginatedResponse<KisiGroupLock>> {
    return this.get<KisiPaginatedResponse<KisiGroupLock>>('group_locks', params)
  }

  async assignLockToGroup(groupId: number, lockId: number): Promise<KisiGroupLock> {
    return this.post<KisiGroupLock>('group_locks', { groupLock: { groupId, lockId } })
  }

  async removeLockFromGroup(id: number): Promise<void> {
    return this.delete<void>(`group_locks/${id}`)
  }

  // ==================== Members ====================

  async getMembers(params?: KisiListParams): Promise<KisiPaginatedResponse<KisiMember>> {
    return this.get<KisiPaginatedResponse<KisiMember>>('members', params)
  }

  async getMember(id: number): Promise<KisiMember> {
    return this.get<KisiMember>(`members/${id}`)
  }

  async createMember(data: KisiCreateMemberRequest): Promise<KisiMember> {
    return this.post<KisiMember>('members', { member: data })
  }

  async deleteMember(id: number): Promise<void> {
    return this.delete<void>(`members/${id}`)
  }

  // ==================== Events / Audit Log ====================

  async getEvents(params?: KisiListParams & { lockId?: number; actorEmail?: string }): Promise<KisiPaginatedResponse<KisiEvent>> {
    return this.get<KisiPaginatedResponse<KisiEvent>>('events', params)
  }

  // ==================== Health Check ====================

  async ping(): Promise<boolean> {
    try {
      await this.get<KisiPaginatedResponse<KisiPlace>>('places', { limit: 1 })
      return true
    } catch {
      return false
    }
  }

  // ==================== Key utils (snake_case ↔ camelCase) ====================

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
  }

  private camelizeKeys(obj: unknown): unknown {
    if (Array.isArray(obj)) return obj.map(item => this.camelizeKeys(item))
    if (obj !== null && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
          key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
          this.camelizeKeys(value)
        ])
      )
    }
    return obj
  }

  private decamelizeKeys(obj: unknown): unknown {
    if (Array.isArray(obj)) return obj.map(item => this.decamelizeKeys(item))
    if (obj !== null && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
          this.toSnakeCase(key),
          this.decamelizeKeys(value)
        ])
      )
    }
    return obj
  }
}

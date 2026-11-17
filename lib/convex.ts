'use client'

import { ConvexHttpClient } from 'convex/browser'
import { anyApi } from 'convex/server'
import { ConvexError } from 'convex/values'

/**
 * The Convex functions live in the website repo (peterish8/rc-gudalur, convex/).
 * This admin app talks to the same deployment, so it uses the untyped `anyApi`
 * reference instead of generated types: api.events.listAll -> convex/events.ts listAll.
 */
export const api = anyApi

const url = process.env.NEXT_PUBLIC_CONVEX_URL

if (!url && typeof window !== 'undefined') {
  console.error('Missing NEXT_PUBLIC_CONVEX_URL. Please check your .env.local file.')
}

export const convex = new ConvexHttpClient(url || 'https://missing-convex-url.convex.cloud')

const TOKEN_KEY = 'rcg_admin_token'

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage blocked (private mode): the session just won't survive a reload.
  }
}

/** Readable message from a Convex (or any) error. */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof ConvexError) return String(err.data)
  if (err instanceof Error) {
    // Server errors arrive as "[CONVEX M(...)] ... Uncaught ConvexError: <msg>"
    const match = err.message.match(/ConvexError: (.+?)(\n|$)/)
    return match ? match[1] : err.message
  }
  return fallback
}

/** Uploads a file to Convex storage and returns its public URL. */
export async function uploadFile(file: File): Promise<string> {
  const token = getToken()
  const uploadUrl: string = await convex.mutation(api.files.generateUploadUrl, { token })
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!res.ok) throw new Error(`Upload failed (${res.status})`)
  const { storageId } = await res.json()
  return await convex.mutation(api.files.getUrl, { token, storageId })
}

/** Deletes previously uploaded files by their public URLs (non-Convex URLs are ignored). */
export async function deleteFilesByUrl(urls: string[]): Promise<void> {
  if (urls.length === 0) return
  try {
    await convex.mutation(api.files.removeByUrls, { token: getToken(), urls })
  } catch (err) {
    console.error('Failed to delete stored files:', err)
  }
}

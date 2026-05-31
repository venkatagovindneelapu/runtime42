import { getToken, signOut } from './auth'

const API_URL = import.meta.env.VITE_API_URL

export interface User {
  id: string
  name: string | null
  email: string | null
  avatarUrl?: string | null
  githubUsername?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Page {
  id: string
  userId: string
  title: string
  prompt: string
  html: string | null
  status: string
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken()

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    localStorage.removeItem('runtime42_token')
    await signOut()
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Request failed')
  }

  return res.json()
}

export const api = {
  me: () => apiFetch<User>('/api/auth/me'),
  getPages: () => apiFetch<Page[]>('/api/pages'),
  getPage: (id: string) => apiFetch<Page>(`/api/pages/${id}`),
  createPage: (data: { prompt: string; title?: string }) =>
    apiFetch<Page>('/api/pages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deletePage: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/pages/${id}`, { method: 'DELETE' }),
}

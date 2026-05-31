import { authClient } from './neonAuth'
import { signOut } from './auth'

const API_URL = import.meta.env.VITE_API_URL

async function getAuthToken(): Promise<string | null> {
  const session = await authClient.getSession()
  return (
    session?.data?.session?.token ??
    session?.data?.session?.access_token ??
    null
  )
}

export interface User {
  id: string
  name: string | null
  email: string | null
  avatarUrl?: string | null
  githubUsername?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Project {
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

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken()

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
  getProjects: () => apiFetch<Project[]>('/api/projects'),
  getProject: (id: string) => apiFetch<Project>(`/api/projects/${id}`),
  createProject: (data: { prompt: string; title?: string }) =>
    apiFetch<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteProject: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),
  updateProjectTitle: (id: string, title: string) =>
    apiFetch<Project>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),
}

export function getProjects() {
  return api.getProjects()
}

export function createProject(prompt: string, title?: string) {
  return api.createProject({ prompt, title })
}

export function getProject(id: string) {
  return api.getProject(id)
}

export function deleteProject(id: string) {
  return api.deleteProject(id)
}

export function updateProjectTitle(id: string, title: string) {
  return api.updateProjectTitle(id, title)
}

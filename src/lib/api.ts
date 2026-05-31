import { authClient } from './neonAuth'
import { signOut } from './auth'

const API_URL = import.meta.env.VITE_API_URL

async function getAuthToken(): Promise<string | null> {
  const session = await authClient.getSession()
  return session?.data?.session?.token ?? null
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
  files: string | null
  chunkedIntent?: string | null
  codingPlan?: string | null
  chatTitle?: string | null
  status: string
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export type ChatMessageType = 'text' | 'thinking' | 'error' | 'summary' | 'file_list'

export interface ChatMessage {
  id: string
  projectId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  messageType: ChatMessageType | string | null
  metadata: string | null
  createdAt: string
}

export interface GenerationSummary {
  headline: string
  whatWasBuilt: string
  filesSummary: Array<{ file: string; description: string }>
  highlights: string[]
  nextSuggestions: string[]
}

export interface GenerateProjectResponse {
  files: Record<string, string>
  summary: GenerationSummary
  intent: Record<string, unknown>
  plan: Record<string, unknown>
  projectId: string
}

export type CheckpointStatus = 'active' | 'done' | 'error'

export interface PipelineCheckpoint {
  type: 'checkpoint' | 'files_delta' | 'complete' | 'error'
  agent?: number
  label: string
  detail?: string
  status?: CheckpointStatus
  paths?: string[]
  files?: Record<string, string>
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
  getMessages: (id: string) => apiFetch<ChatMessage[]>(`/api/projects/${id}/messages`),
  saveMessage: (
    id: string,
    data: {
      role: string
      content: string
      messageType?: string
      metadata?: unknown
    }
  ) =>
    apiFetch<ChatMessage>(`/api/projects/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  generateProject: (id: string, prompt: string, errors?: string[]) =>
    apiFetch<GenerateProjectResponse>(`/api/projects/${id}/generate`, {
      method: 'POST',
      body: JSON.stringify({ prompt, errors }),
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

export function getMessages(projectId: string) {
  return api.getMessages(projectId)
}

export function sendMessage(projectId: string, message: string, errors?: string[]) {
  return api.generateProject(projectId, message, errors)
}

export function generateProject(id: string, prompt: string, errors?: string[]) {
  return api.generateProject(id, prompt, errors)
}

export async function generateProjectStream(
  projectId: string,
  prompt: string,
  onEvent: (event: PipelineCheckpoint) => void,
  errors?: string[]
): Promise<GenerateProjectResponse> {
  const token = await getAuthToken()

  const res = await fetch(`${API_URL}/api/projects/${projectId}/generate/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ prompt, errors }),
  })

  if (res.status === 401) {
    localStorage.removeItem('runtime42_token')
    await signOut()
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Stream request failed')
  }

  if (!res.body) {
    throw new Error('No response stream from server')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let complete: GenerateProjectResponse | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''

    for (const chunk of chunks) {
      const line = chunk.trim()
      if (!line.startsWith('data:')) continue
      const json = JSON.parse(line.slice(5).trim()) as PipelineCheckpoint & GenerateProjectResponse

      if (json.type === 'complete' && 'files' in json && json.summary) {
        complete = {
          files: json.files,
          summary: json.summary,
          intent: json.intent,
          plan: json.plan,
          projectId: json.projectId,
        }
      }

      onEvent(json)
    }
  }

  if (!complete) {
    throw new Error('Generation stream ended without complete payload')
  }

  return complete
}

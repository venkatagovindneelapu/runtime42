export { authClient } from './neonAuth'

export async function getToken(): Promise<string | null> {
  const { authClient } = await import('./neonAuth')
  const result = await authClient.getSession()
  return result?.data?.session?.token ?? 
         result?.data?.session?.access_token ?? 
         null
}

export async function signOut() {
  const { authClient } = await import('./neonAuth')
  await authClient.signOut()
  localStorage.removeItem('runtime42_token')
  window.location.href = '/'
}

export async function syncUser(token: string) {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/auth/sync`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    }
  )
  if (!res.ok) throw new Error('Failed to sync user')
  return res.json()
}

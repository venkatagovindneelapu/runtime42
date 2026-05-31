export const DEV_PORT_START = 3000
export const DEV_PORT_MAX = 3010

export function isDevPreviewPort(port: number): boolean {
  return port >= DEV_PORT_START && port <= DEV_PORT_MAX
}

export function isPortInUseError(text: string): boolean {
  return /EADDRINUSE|address already in use/i.test(text)
}

export function nextDevPort(current: number): number | null {
  if (current >= DEV_PORT_MAX) return null
  return current + 1
}

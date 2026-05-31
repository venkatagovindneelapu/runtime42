import { Request, Response, NextFunction } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const neonAuthUrl = process.env.NEON_AUTH_URL
if (!neonAuthUrl) {
  throw new Error('NEON_AUTH_URL is required')
}

const JWKS = createRemoteJWKSet(
  new URL(`${neonAuthUrl}/.well-known/jwks.json`)
)

export interface AuthUser {
  id: string
  email: string
  name?: string
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  const token = authHeader.slice(7)

  try {
    const { payload } = await jwtVerify(token, JWKS)
    if (!payload.sub) {
      return res.status(401).json({ error: 'Invalid token subject' })
    }

    req.user = {
      id: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : '',
      name: payload.name as string | undefined,
    }
    next()
  } catch (err) {
    console.error('JWT verification failed:', err)
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

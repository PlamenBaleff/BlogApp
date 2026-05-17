import jwt, { type SignOptions } from 'jsonwebtoken';
import type { JWTPayload, UserRole } from '@bloghub/types';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '24h') as SignOptions['expiresIn'];
const JWT_REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN ||
  '30d') as SignOptions['expiresIn'];

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

const SECRET: jwt.Secret = JWT_SECRET;

export function generateAccessToken(
  userId: string,
  email: string,
  role: UserRole = 'user'
): string {
  return jwt.sign({ sub: userId, email, role }, SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' }, SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, SECRET) as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(
  token: string
): { sub: string; type: string } | null {
  try {
    return jwt.verify(token, SECRET) as unknown as { sub: string; type: string };
  } catch {
    return null;
  }
}

export function decodeToken(token: string): unknown {
  return jwt.decode(token);
}

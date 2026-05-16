export interface User {
  id: string;
  email: string;
  name: string;
  bio?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  sub: string; // user ID
  email: string;
  iat: number;
  exp: number;
}

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'password'>;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

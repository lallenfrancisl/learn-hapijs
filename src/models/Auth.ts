export interface AuthenticateInput {
  email: string;
  emailToken: string;
}

export interface LoginInput {
  email: string;
}

export interface APITokenPayload {
  tokenId: number;
}

export const API_AUTH_STRATEGY = 'API';
export const JWT_SECRET = process.env.JWT_SECRET || 'JWT_SECRET';
export const JWT_ALGORITHM = 'HS256';
export const AUTH_TOKEN_EXP_HOURS = 12;
export const EMAIL_TOKEN_EXP_MINS = 10;


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

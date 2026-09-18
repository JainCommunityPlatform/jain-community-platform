export interface AuthenticatedUser {
  subject: string;
  email?: string;
  displayName?: string;
}

export interface AuthenticationTokenVerifier {
  verify(token: string): Promise<AuthenticatedUser>;
}

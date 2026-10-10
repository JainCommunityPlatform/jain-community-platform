export interface AuthenticatedUser {
  subject: string;
  email?: string;
  emailVerified?: boolean;
  verifiedPhoneNumber?: string;
  displayName?: string;
}

export interface AuthenticationTokenVerifier {
  verify(token: string): Promise<AuthenticatedUser>;
}

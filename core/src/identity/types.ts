export interface ResolvedIdentity {
  personaId: string;
  email: string;
  idpGroups: string[];
  isAdmin: boolean;
}

export interface IdentityResolver {
  resolve(headers: Record<string, string | undefined>): ResolvedIdentity | null;
}

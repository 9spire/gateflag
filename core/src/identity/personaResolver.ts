import type { PersonasFile } from '../demo-data/loadSeed.js';
import type { IdentityResolver, ResolvedIdentity } from './types.js';

export function createPersonaIdentityResolver(personas: PersonasFile): IdentityResolver {
  const byId = new Map(personas.personas.map((persona) => [persona.id, persona]));

  return {
    resolve(headers: Record<string, string | undefined>): ResolvedIdentity | null {
      const personaId = headers['x-demo-user'] ?? headers['X-Demo-User'];
      if (!personaId) {
        return null;
      }
      const persona = byId.get(personaId);
      if (!persona) {
        return null;
      }
      return {
        personaId: persona.id,
        email: persona.email,
        idpGroups: [...persona.idpGroups],
        isAdmin: persona.idpGroups.includes(personas.adminIdpGroup),
      };
    },
  };
}

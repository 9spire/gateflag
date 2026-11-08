/** @gateflag/core — framework-free domain, services, and route table. */
export const CORE_PACKAGE = '@gateflag/core' as const;

export * from './domain/index.js';
export { loadSeed, loadPersonas } from './demo-data/loadSeed.js';
export type { Persona, PersonasFile } from './demo-data/loadSeed.js';

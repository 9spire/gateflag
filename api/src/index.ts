import { CORE_PACKAGE } from '@gateflag/core';

/** @gateflag/api — Express adapter + DynamoDB. Wired in Phase 4. */
export const API_PACKAGE = '@gateflag/api' as const;
export const dependsOnCore = CORE_PACKAGE;

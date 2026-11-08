export class NotFoundError extends Error {
  override readonly name = 'NotFoundError';
  constructor(
    readonly entityType: string,
    readonly key: string,
  ) {
    super(`${entityType} not found: ${key}`);
  }
}

export class AlreadyExistsError extends Error {
  override readonly name = 'AlreadyExistsError';
  constructor(
    readonly entityType: string,
    readonly key: string,
  ) {
    super(`${entityType} already exists: ${key}`);
  }
}

export class VersionConflictError extends Error {
  override readonly name = 'VersionConflictError';
  constructor(
    readonly entityType: string,
    readonly key: string,
  ) {
    super(`${entityType} version conflict: ${key}`);
  }
}

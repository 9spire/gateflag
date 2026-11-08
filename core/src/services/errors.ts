export class BusinessRuleError extends Error {
  override readonly name = 'BusinessRuleError';
  constructor(message: string) {
    super(message);
  }
}

export class ValidationAppError extends Error {
  override readonly name = 'ValidationAppError';
  constructor(
    message: string,
    readonly details: unknown[] = [],
  ) {
    super(message);
  }
}

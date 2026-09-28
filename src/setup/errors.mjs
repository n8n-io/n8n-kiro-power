export class SetupError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SetupError';
    this.code = code;
  }
}

export function fail(code, message) {
  throw new SetupError(code, message);
}

export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

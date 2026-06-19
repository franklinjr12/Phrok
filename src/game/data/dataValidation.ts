export class DataValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataValidationError";
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function requireString(
  source: Record<string, unknown>,
  field: string,
  fileName: string,
  id: string,
): string {
  const value = source[field];

  if (typeof value !== "string" || value.length === 0) {
    throw fieldError(fileName, id, field, "a non-empty string");
  }

  return value;
}

export function optionalString(
  source: Record<string, unknown>,
  field: string,
  defaultValue: string,
): string {
  const value = source[field];
  return typeof value === "string" ? value : defaultValue;
}

export function requireNumber(
  source: Record<string, unknown>,
  field: string,
  fileName: string,
  id: string,
): number {
  const value = source[field];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw fieldError(fileName, id, field, "a finite number");
  }

  return value;
}

export function optionalNumber(
  source: Record<string, unknown>,
  field: string,
  defaultValue: number,
): number {
  const value = source[field];
  return typeof value === "number" && Number.isFinite(value) ? value : defaultValue;
}

export function optionalStringArray(
  source: Record<string, unknown>,
  field: string,
  defaultValue: string[] = [],
): string[] {
  const value = source[field];
  return Array.isArray(value) && value.every((entry) => typeof entry === "string")
    ? value
    : defaultValue;
}

export function requireRecord(
  source: Record<string, unknown>,
  field: string,
  fileName: string,
  id: string,
): Record<string, unknown> {
  const value = source[field];

  if (!isRecord(value)) {
    throw fieldError(fileName, id, field, "an object");
  }

  return value;
}

export function fieldError(
  fileName: string,
  id: string,
  field: string,
  expected: string,
): DataValidationError {
  return new DataValidationError(`${fileName} entry "${id}" is missing ${field}; expected ${expected}.`);
}


import { errorMessage, isApiError } from "../api/errors";

/**
 * Splits an API error into per-field messages (for inputs) and a form-level
 * message. `fieldMap` renames backend field keys to form field names.
 */
export function toFormErrors<F extends string>(
  error: unknown,
  fieldMap: Partial<Record<string, F>> = {},
): Partial<Record<F | "form", string>> {
  const result: Partial<Record<F | "form", string>> = {};
  if (isApiError(error) && error.hasFieldErrors) {
    for (const [key, message] of Object.entries(error.fields)) {
      const field = (fieldMap[key] ?? key) as F;
      result[field] = message;
    }
    return result;
  }
  result.form = errorMessage(error);
  return result;
}

import { deleteField, FieldValue } from 'firebase/firestore';

/**
 * Strips all undefined fields recursively so that Firestore does not reject them.
 * Firestore strictly disallows `undefined` values:
 * "Function setDoc() called with invalid data. Unsupported field value: undefined (found in field ...)"
 */
export function sanitizeForFirestore<T extends Record<string, any>>(data: T): Record<string, any> {
  if (!data || typeof data !== 'object') {
    return data;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      // Omit undefined completely from document
      continue;
    }
    if (value === null) {
      result[key] = null;
      continue;
    }
    if (value instanceof FieldValue || value instanceof Date) {
      result[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      result[key] = value
        .filter((item) => item !== undefined)
        .map((item) => {
          if (item !== null && typeof item === 'object' && !(item instanceof Date) && !(item instanceof FieldValue)) {
            return sanitizeForFirestore(item);
          }
          return item;
        });
      continue;
    }
    if (typeof value === 'object') {
      if (value.constructor && value.constructor.name !== 'Object') {
        result[key] = value;
      } else {
        result[key] = sanitizeForFirestore(value);
      }
      continue;
    }
    result[key] = value;
  }
  return result;
}

/**
 * Prepares data for updateDoc:
 * - Converts undefined fields to deleteField() so that fields being cleared
 *   are properly removed in Firestore rather than crashing with an undefined error.
 */
export function sanitizeForFirestoreUpdate<T extends Record<string, any>>(data: T): Record<string, any> {
  if (!data || typeof data !== 'object') {
    return data;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      result[key] = deleteField();
      continue;
    }
    if (value === null) {
      result[key] = null;
      continue;
    }
    if (value instanceof FieldValue || value instanceof Date) {
      result[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      result[key] = value
        .filter((item) => item !== undefined)
        .map((item) => {
          if (item !== null && typeof item === 'object' && !(item instanceof Date) && !(item instanceof FieldValue)) {
            return sanitizeForFirestore(item);
          }
          return item;
        });
      continue;
    }
    if (typeof value === 'object') {
      if (value.constructor && value.constructor.name !== 'Object') {
        result[key] = value;
      } else {
        result[key] = sanitizeForFirestore(value);
      }
      continue;
    }
    result[key] = value;
  }
  return result;
}

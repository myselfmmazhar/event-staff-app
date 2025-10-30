/**
 * Error Messages
 * Centralized error message mapping and formatting
 */

/**
 * Error codes for consistent error handling
 */
export const ErrorCode = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PHONE: 'INVALID_PHONE',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  PASSWORD_MISMATCH: 'PASSWORD_MISMATCH',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  
  // Server errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

/**
 * User-friendly error messages
 */
export const ErrorMessages: Record<string, string> = {
  // Authentication
  UNAUTHORIZED: 'You must be logged in to perform this action',
  FORBIDDEN: 'You do not have permission to perform this action',
  INVALID_CREDENTIALS: 'Invalid email or password',
  
  // Validation
  VALIDATION_ERROR: 'Please check your input and try again',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  WEAK_PASSWORD: 'Password does not meet security requirements',
  PASSWORD_MISMATCH: 'Passwords do not match',
  
  // Resources
  NOT_FOUND: 'The requested resource was not found',
  CONFLICT: 'This resource already exists',
  DUPLICATE_EMAIL: 'A user with this email address already exists',
  
  // Server
  INTERNAL_SERVER_ERROR: 'Something went wrong. Please try again later',
  DATABASE_ERROR: 'Database error occurred. Please try again',
};

/**
 * Field-specific error templates
 */
export const FieldErrors = {
  email: {
    required: 'Email is required',
    invalid: 'Please enter a valid email address',
    duplicate: 'This email is already registered',
    disposable: 'Please use a permanent email address',
  },
  password: {
    required: 'Password is required',
    minLength: 'Password must be at least 8 characters',
    maxLength: 'Password must not exceed 128 characters',
    uppercase: 'Password must contain at least one uppercase letter',
    lowercase: 'Password must contain at least one lowercase letter',
    number: 'Password must contain at least one number',
    special: 'Password must contain at least one special character',
    complexity: 'Password does not meet complexity requirements',
  },
  passwordConfirm: {
    required: 'Please confirm your password',
    mismatch: 'Passwords do not match',
  },
  firstName: {
    required: 'First name is required',
    minLength: 'First name must be at least 1 character',
    maxLength: 'First name must not exceed 50 characters',
  },
  lastName: {
    required: 'Last name is required',
    minLength: 'Last name must be at least 1 character',
    maxLength: 'Last name must not exceed 50 characters',
  },
  phone: {
    invalid: 'Please enter a valid phone number',
    format: 'Phone number must be in valid format (e.g., +1234567890)',
  },
  role: {
    required: 'Role is required',
    invalid: 'Please select a valid role',
  },
};

/**
 * Get user-friendly error message from error code
 */
export function getErrorMessage(code: string): string {
  return ErrorMessages[code] || ErrorMessages.INTERNAL_SERVER_ERROR;
}

/**
 * Format validation error with field context
 */
export function formatFieldError(field: string, errorType: string): string {
  const fieldErrors = FieldErrors[field as keyof typeof FieldErrors];
  if (fieldErrors && typeof fieldErrors === 'object') {
    return fieldErrors[errorType as keyof typeof fieldErrors] || `Invalid ${field}`;
  }
  return `Invalid ${field}`;
}

/**
 * Extract field name from Zod error path
 */
export function extractFieldFromPath(path: (string | number)[]): string {
  return path.join('.');
}


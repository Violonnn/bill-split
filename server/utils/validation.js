import validator from 'validator';

/**
 * Checks if string is only whitespace or empty - spaces are not valid input.
 */
export function isEmptyOrWhitespace(value) {
  if (value == null) return true;
  return typeof value === 'string' && value.trim().length === 0;
}

/**
 * Validates first or last name: required, no spaces, no spaces-only, min 2 chars.
 * Spaces are not valid input per project requirements.
 */
export function validateName(value, fieldName) {
  if (isEmptyOrWhitespace(value)) {
    return `${fieldName} is required`;
  }
  const trimmed = value.trim();
  if (/\s/.test(trimmed)) {
    return 'Spaces are not valid input';
  }
  if (trimmed.length < 2) {
    return `${fieldName} must be at least 2 characters`;
  }
  return null;
}

/**
 * Validates nickname: required, no spaces, unique is checked at DB, min 3 chars.
 * Spaces are not valid input per project requirements.
 */
export function validateNickname(value) {
  if (isEmptyOrWhitespace(value)) {
    return 'Nickname is required';
  }
  const trimmed = value.trim();
  if (/\s/.test(trimmed)) {
    return 'Spaces are not valid input';
  }
  if (trimmed.length < 3) {
    return 'Nickname must be at least 3 characters';
  }
  return null;
}

/**
 * Validates email format. Spaces-only is not valid input.
 */
export function validateEmail(value) {
  if (isEmptyOrWhitespace(value)) {
    return 'Email is required';
  }
  if (!validator.isEmail(value.trim())) {
    return 'Please enter a valid email address';
  }
  return null;
}

/**
 * Validates username: required, no spaces, alphanumeric + underscore, min 3 chars.
 * Spaces are not valid input per project requirements.
 */
export function validateUsername(value) {
  if (isEmptyOrWhitespace(value)) {
    return 'Username is required';
  }
  const trimmed = value.trim();
  if (/\s/.test(trimmed)) {
    return 'Spaces are not valid input';
  }
  if (trimmed.length < 3) {
    return 'Username must be at least 3 characters';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  return null;
}

/**
 * Validates password: 8-16 chars, upper, lower, number, special.
 */
export function validatePassword(value) {
  if (!value) return 'Password is required';
  if (value.length < 8 || value.length > 16) {
    return 'Password must be 8-16 characters long';
  }
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value)) {
    return 'Password must contain upper and lower case letters';
  }
  if (!/[0-9]/.test(value)) {
    return 'Password must contain at least one number';
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)) {
    return 'Password must contain at least one special character';
  }
  return null;
}

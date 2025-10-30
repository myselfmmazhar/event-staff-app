/**
 * Validation Utilities
 * Reusable validation functions for phone, email, password, etc.
 */

/**
 * Phone Number Validation
 */
export const phoneValidation = {
  /**
   * Check if phone number is in valid format
   * Accepts: +1234567890, (123) 456-7890, 123-456-7890, 1234567890
   */
  isValid: (phone: string): boolean => {
    if (!phone) return false;
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    // Must be between 10-15 digits (international format)
    return digits.length >= 10 && digits.length <= 15;
  },

  /**
   * Format phone number to standard format
   */
  format: (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length === 10) {
      // US format: (123) 456-7890
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits[0] === '1') {
      // US with country code: +1 (123) 456-7890
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else if (digits.length > 10) {
      // International format: +XX XXXXXXXXXX
      return `+${digits}`;
    }
    
    return phone; // Return as-is if format not recognized
  },

  /**
   * Normalize phone number to digits only
   */
  normalize: (phone: string): string => {
    return phone.replace(/\D/g, '');
  },
};

/**
 * Email Validation
 */
export const emailValidation = {
  /**
   * Check if email domain is valid (not disposable/temporary)
   */
  hasValidDomain: (email: string): boolean => {
    const disposableDomains = [
      'tempmail.com',
      'guerrillamail.com',
      'mailinator.com',
      '10minutemail.com',
      'throwaway.email',
      'temp-mail.org',
    ];
    
    const domain = email.split('@')[1]?.toLowerCase();
    return !disposableDomains.includes(domain);
  },

  /**
   * Normalize email (lowercase, trim)
   */
  normalize: (email: string): string => {
    return email.trim().toLowerCase();
  },

  /**
   * Basic email format validation
   */
  isValid: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
};

/**
 * Password Validation
 */
export const passwordValidation = {
  /**
   * Check if password has at least one uppercase letter
   */
  hasUpperCase: (password: string): boolean => {
    return /[A-Z]/.test(password);
  },

  /**
   * Check if password has at least one lowercase letter
   */
  hasLowerCase: (password: string): boolean => {
    return /[a-z]/.test(password);
  },

  /**
   * Check if password has at least one number
   */
  hasNumber: (password: string): boolean => {
    return /\d/.test(password);
  },

  /**
   * Check if password has at least one special character
   */
  hasSpecialChar: (password: string): boolean => {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  },

  /**
   * Calculate password strength
   * Returns: 0 (weak), 1 (medium), 2 (strong)
   */
  calculateStrength: (password: string): number => {
    if (!password) return 0;

    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;

    // Character variety
    if (passwordValidation.hasUpperCase(password)) strength++;
    if (passwordValidation.hasLowerCase(password)) strength++;
    if (passwordValidation.hasNumber(password)) strength++;
    if (passwordValidation.hasSpecialChar(password)) strength++;

    // Convert to 0-2 scale
    if (strength <= 2) return 0; // weak
    if (strength <= 4) return 1; // medium
    return 2; // strong
  },

  /**
   * Get password strength label
   */
  getStrengthLabel: (password: string): string => {
    const strength = passwordValidation.calculateStrength(password);
    const labels = ['Weak', 'Medium', 'Strong'];
    return labels[strength];
  },

  /**
   * Get password strength color
   */
  getStrengthColor: (password: string): string => {
    const strength = passwordValidation.calculateStrength(password);
    const colors = ['#ef4444', '#f59e0b', '#10b981']; // red, yellow, green
    return colors[strength];
  },

  /**
   * Check if password meets all complexity requirements
   */
  meetsComplexityRequirements: (password: string): boolean => {
    return (
      password.length >= 8 &&
      passwordValidation.hasUpperCase(password) &&
      passwordValidation.hasLowerCase(password) &&
      passwordValidation.hasNumber(password) &&
      passwordValidation.hasSpecialChar(password)
    );
  },

  /**
   * Get list of unmet requirements
   */
  getUnmetRequirements: (password: string): string[] => {
    const unmet: string[] = [];
    
    if (password.length < 8) {
      unmet.push('At least 8 characters');
    }
    if (!passwordValidation.hasUpperCase(password)) {
      unmet.push('One uppercase letter');
    }
    if (!passwordValidation.hasLowerCase(password)) {
      unmet.push('One lowercase letter');
    }
    if (!passwordValidation.hasNumber(password)) {
      unmet.push('One number');
    }
    if (!passwordValidation.hasSpecialChar(password)) {
      unmet.push('One special character');
    }
    
    return unmet;
  },
};

/**
 * String Sanitization Helpers
 */
export const sanitization = {
  /**
   * Trim and normalize whitespace
   */
  trimString: (value: string | undefined | null): string | undefined => {
    if (!value) return undefined;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  },

  /**
   * Sanitize name (capitalize first letter, lowercase rest)
   */
  sanitizeName: (name: string): string => {
    return name
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  /**
   * Remove extra spaces (multiple spaces become single space)
   */
  normalizeSpaces: (value: string): string => {
    return value.replace(/\s+/g, ' ').trim();
  },
};


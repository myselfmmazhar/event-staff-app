import { z } from 'zod';

/**
 * Authentication validation schemas
 * Used for email/password sign-in and sign-up forms
 */

export class AuthSchema {
  /**
   * Sign-in schema - email and password only
   */
  static signIn = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional(),
  });

  /**
   * Sign-up schema - includes name fields and password confirmation
   */
  static signUp = z
    .object({
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      email: z.string().email('Invalid email address'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    });
}

// Type exports for convenience
export type SignInInput = z.infer<typeof AuthSchema.signIn>;
export type SignUpInput = z.infer<typeof AuthSchema.signUp>;

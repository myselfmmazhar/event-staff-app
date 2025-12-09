'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserSchema } from '@/lib/schemas/user.schema';
import type { CreateUserInput, UpdateUserInput } from '@/lib/schemas/user.schema';
import { UserRole } from '@prisma/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CloseIcon } from '@/components/ui/icons';
import { PasswordStrength } from '@/components/ui/password-strength';
import { PhoneInput } from '@/components/ui/phone-input';
import { FieldErrors } from '@/lib/utils/error-messages';
import { passwordValidation, emailValidation, phoneValidation } from '@/lib/utils/validation';
import { useRoleTerm } from '@/lib/hooks/use-terminology';

// Extended schema for create mode (with password confirmation)
const createFormSchema = UserSchema.create.extend({
  passwordConfirm: z.string().min(1, FieldErrors.passwordConfirm.required),
}).refine((data) => data.password === data.passwordConfirm, {
  message: FieldErrors.passwordConfirm.mismatch,
  path: ['passwordConfirm'],
});

// Extended schema for edit mode (password optional)
// Build on UserSchema to ensure consistent validation with backend
const editFormSchema = z.object({
  firstName: z
    .string()
    .min(1, FieldErrors.firstName.required)
    .max(50, FieldErrors.firstName.maxLength)
    .transform((val) => val.trim()),
  lastName: z
    .string()
    .min(1, FieldErrors.lastName.required)
    .max(50, FieldErrors.lastName.maxLength)
    .transform((val) => val.trim()),
  email: z
    .string()
    .min(1, FieldErrors.email.required)
    .email({ message: FieldErrors.email.invalid })
    .transform((val) => val.trim().toLowerCase())
    .refine(
      (email) => emailValidation.hasValidDomain(email),
      { message: FieldErrors.email.disposable }
    ),
  password: z.string().optional().or(z.literal('')),
  passwordConfirm: z.string().optional().or(z.literal('')),
  role: z.nativeEnum(UserRole),
  phone: z
    .string()
    .optional()
    .transform((val) => val?.trim())
    .refine(
      (phone) => !phone || phoneValidation.isValid(phone),
      { message: FieldErrors.phone.invalid }
    ),
  address: z
    .string()
    .optional()
    .transform((val) => val?.trim()),
  emergencyContact: z
    .string()
    .optional()
    .transform((val) => val?.trim()),
}).refine(
  (data) => {
    // If password is provided, it must meet complexity requirements
    if (data.password && data.password.length > 0) {
      return passwordValidation.meetsComplexityRequirements(data.password);
    }
    return true;
  },
  {
    message: FieldErrors.password.complexity,
    path: ['password'],
  }
).refine(
  (data) => {
    // If password is provided, confirmation must match
    if (data.password && data.password.length > 0) {
      return data.password === data.passwordConfirm;
    }
    return true;
  },
  {
    message: FieldErrors.passwordConfirm.mismatch,
    path: ['passwordConfirm'],
  }
);

// Use input types (before transforms) for form compatibility
type CreateFormData = z.input<typeof createFormSchema>;
type EditFormData = z.input<typeof editFormSchema>;
type FormData = CreateFormData | EditFormData;

// Form field names for type-safe setError calls
type FormFieldName = keyof CreateFormData;

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
}

interface UserFormModalProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserInput | Omit<UpdateUserInput, 'id'>) => void;
  isSubmitting: boolean;
  backendErrors?: Array<{ field: string; message: string }>;
}

const ROLES: Array<{ value: UserRole; label: string }> = [
  { value: 'STAFF', label: 'Staff' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

export function UserFormModal({
  user,
  open,
  onClose,
  onSubmit,
  isSubmitting,
  backendErrors = [],
}: UserFormModalProps) {
  const isEdit = !!user;
  const [password, setPassword] = useState('');
  const roleTerm = useRoleTerm();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setError,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(isEdit ? editFormSchema : createFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      passwordConfirm: '',
      role: 'STAFF',
      phone: '',
      address: '',
      emergencyContact: '',
    },
  });

  // Watch password field for strength indicator
  const watchedPassword = watch('password');

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: '',
        passwordConfirm: '',
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        emergencyContact: user.emergencyContact || '',
      });
    } else {
      reset({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        passwordConfirm: '',
        role: 'STAFF',
        phone: '',
        address: '',
        emergencyContact: '',
      });
    }
    setPassword('');
  }, [user, reset, open]);

  // Map backend errors to form fields
  useEffect(() => {
    if (backendErrors && backendErrors.length > 0) {
      backendErrors.forEach((error) => {
        // Cast to FormFieldName since backend field names should match form field names
        setError(error.field as FormFieldName, {
          type: 'manual',
          message: error.message,
        });
      });
    }
  }, [backendErrors, setError]);

  const handleFormSubmit = (data: FormData) => {
    // Remove password and passwordConfirm if empty (for edit mode)
    if (isEdit && !data.password) {
      const { password, passwordConfirm, ...rest } = data as EditFormData;
      onSubmit(rest);
    } else {
      // Remove passwordConfirm before submitting (not needed in backend)
      const { passwordConfirm, ...submitData } = data;
      onSubmit(submitData as CreateUserInput | Omit<UpdateUserInput, 'id'>);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{isEdit ? 'Edit User' : 'Create New User'}</DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <DialogContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <Label htmlFor="firstName" required>
                First Name
              </Label>
              <Input
                id="firstName"
                {...register('firstName')}
                error={!!errors.firstName}
                disabled={isSubmitting}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive mt-1">{errors.firstName.message}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <Label htmlFor="lastName" required>
                Last Name
              </Label>
              <Input
                id="lastName"
                {...register('lastName')}
                error={!!errors.lastName}
                disabled={isSubmitting}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive mt-1">{errors.lastName.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="md:col-span-2">
              <Label htmlFor="email" required>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                error={!!errors.email}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="md:col-span-2">
              <Label htmlFor="password" required={!isEdit}>
                Password {isEdit && '(leave blank to keep current)'}
              </Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                error={!!errors.password}
                disabled={isSubmitting}
                placeholder={isEdit ? 'Leave blank to keep current password' : ''}
              />
              {errors.password && (
                <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
              )}
              
              {/* Password Strength Indicator */}
              {watchedPassword && watchedPassword.length > 0 && (
                <div className="mt-3">
                  <PasswordStrength password={watchedPassword} />
                </div>
              )}
            </div>

            {/* Password Confirmation */}
            <div className="md:col-span-2">
              <Label htmlFor="passwordConfirm" required={!isEdit || Boolean(watchedPassword && watchedPassword.length > 0)}>
                Confirm Password
              </Label>
              <Input
                id="passwordConfirm"
                type="password"
                {...register('passwordConfirm')}
                error={!!errors.passwordConfirm}
                disabled={isSubmitting}
                placeholder={isEdit ? 'Confirm new password if changing' : 'Re-enter password'}
              />
              {errors.passwordConfirm && (
                <p className="text-sm text-destructive mt-1">{errors.passwordConfirm.message}</p>
              )}
            </div>

            {/* Role */}
            <div>
              <Label htmlFor="role" required>
                {roleTerm.singular}
              </Label>
              <select
                id="role"
                {...register('role')}
                disabled={isSubmitting || (isEdit && user?.role === 'SUPER_ADMIN')}
                className="w-full rounded-lg border-2 border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {isEdit && user?.role === 'SUPER_ADMIN' && (
                <p className="text-sm text-muted-foreground mt-1">
                  Role cannot be changed for SUPER_ADMIN users
                </p>
              )}
              {errors.role && (
                <p className="text-sm text-destructive mt-1">{errors.role.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone">Phone</Label>
              <PhoneInput
                id="phone"
                {...register('phone')}
                error={!!errors.phone}
                disabled={isSubmitting}
                onChange={(value) => setValue('phone', value)}
              />
              {errors.phone && (
                <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
              )}
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...register('address')}
                error={!!errors.address}
                disabled={isSubmitting}
              />
              {errors.address && (
                <p className="text-sm text-destructive mt-1">{errors.address.message}</p>
              )}
            </div>

            {/* Emergency Contact */}
            <div className="md:col-span-2">
              <Label htmlFor="emergencyContact">Emergency Contact</Label>
              <Input
                id="emergencyContact"
                {...register('emergencyContact')}
                error={!!errors.emergencyContact}
                disabled={isSubmitting}
                placeholder="Name and phone number"
              />
              {errors.emergencyContact && (
                <p className="text-sm text-destructive mt-1">{errors.emergencyContact.message}</p>
              )}
            </div>
          </div>
        </DialogContent>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? 'Update User' : 'Create User'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

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
import type { InviteUserInput, UpdateUserInput } from '@/lib/schemas/user.schema';
import { UserRole } from '@prisma/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CloseIcon } from '@/components/ui/icons';
import { PhoneInput } from '@/components/ui/phone-input';
import { FieldErrors } from '@/lib/utils/error-messages';
import { emailValidation, phoneValidation } from '@/lib/utils/validation';
import { useRoleTerm } from '@/lib/hooks/use-terminology';

// Schema for user form (no password - users set their own via invitation)
const userFormSchema = z.object({
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
  role: z.nativeEnum(UserRole),
  phone: z
    .string()
    .optional()
    .transform((val) => val?.trim())
    .refine(
      (phone) => !phone || phoneValidation.isValid(phone),
      { message: FieldErrors.phone.invalid }
    ),
});

// Use input types (before transforms) for form compatibility
type FormData = z.input<typeof userFormSchema>;

// Form field names for type-safe setError calls
type FormFieldName = keyof FormData;

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  phone?: string | null;
}

interface UserFormModalProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: InviteUserInput | Omit<UpdateUserInput, 'id'>) => void;
  isSubmitting: boolean;
  backendErrors?: Array<{ field: string; message: string }>;
}

// Note: STAFF role is excluded - staff are managed separately in the Staff module
const ROLES: Array<{ value: UserRole; label: string }> = [
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
  const roleTerm = useRoleTerm();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'MANAGER',
      phone: '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
      });
    } else {
      reset({
        firstName: '',
        lastName: '',
        email: '',
        role: 'MANAGER',
        phone: '',
      });
    }
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
    onSubmit(data as InviteUserInput | Omit<UpdateUserInput, 'id'>);
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{isEdit ? 'Edit User' : 'Invite New User'}</DialogTitle>
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
              {!isEdit && (
                <p className="text-sm text-muted-foreground mt-1">
                  An invitation email will be sent to this address
                </p>
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
          </div>
        </DialogContent>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? 'Update User' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

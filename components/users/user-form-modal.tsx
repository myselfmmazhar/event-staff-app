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
import { UserRole } from '@prisma/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CloseIcon } from '@/components/ui/icons';

const formSchema = UserSchema.create.extend({
  password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

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
  onSubmit: (data: FormData) => void;
  isSubmitting: boolean;
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
}: UserFormModalProps) {
  const isEdit = !!user;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'STAFF',
      phone: '',
      address: '',
      emergencyContact: '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: '',
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
        role: 'STAFF',
        phone: '',
        address: '',
        emergencyContact: '',
      });
    }
  }, [user, reset, open]);

  const handleFormSubmit = (data: FormData) => {
    // Remove password if empty (for edit mode)
    if (isEdit && !data.password) {
      const { password, ...rest } = data;
      onSubmit(rest as FormData);
    } else {
      onSubmit(data);
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
            </div>

            {/* Role */}
            <div>
              <Label htmlFor="role" required>
                Role
              </Label>
              <select
                id="role"
                {...register('role')}
                disabled={isSubmitting}
                className="w-full rounded-lg border-2 border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p className="text-sm text-destructive mt-1">{errors.role.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                error={!!errors.phone}
                disabled={isSubmitting}
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

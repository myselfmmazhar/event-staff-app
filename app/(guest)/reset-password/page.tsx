'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { EyeIcon, EyeOffIcon } from '@/components/ui/icons';
import { resetPassword } from '@/lib/client/auth';
import { trpc } from '@/lib/client/trpc';

const ResetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

function ResetPasswordFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Fetch company profile for branding
  const { data: companyProfile } = trpc.settings.getCompanyProfile.useQuery();

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    if (!token) {
      toast({
        message: 'Invalid or missing reset token.',
        type: 'error',
      });
      return;
    }

    try {
      const result = await resetPassword({
        newPassword: data.password,
        token: token,
      });

      if (result.error) {
        toast({
          message: result.error.message || 'Failed to reset password',
          type: 'error',
        });
        return;
      }

      setIsSuccess(true);
      toast({
        message: 'Password reset successfully!',
        type: 'success',
      });

      // Redirect after a 2-second delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      console.error('Reset password error:', error);
      toast({
        message: error instanceof Error ? error.message : 'An expected error occurred',
        type: 'error',
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          {companyProfile?.companyLogoUrl ? (
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden bg-muted shadow-lg mb-4">
              <img
                src={companyProfile.companyLogoUrl}
                alt="Company Logo"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg mb-4">
              <svg
                className="h-8 w-8 text-primary-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
          <h1 className="text-3xl font-bold text-foreground">
            Tripod
          </h1>
          <p className="text-muted-foreground mt-2">
            {companyProfile?.companyTagline || 'Staff Management Platform'}
          </p>
        </div>

        {/* Reset Password Card */}
        <Card>
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              {isSuccess 
                ? 'Your password has been reset successfully.'
                : 'Enter your new password below.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isSuccess ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto flex flex-col items-center justify-center space-y-4">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 border-2 border-green-500">
                    <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-green-600 dark:text-green-400">All set!</h3>
                  <p className="text-sm text-muted-foreground">Redirecting to login...</p>
                </div>
              </div>
            ) : !token ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto flex flex-col items-center justify-center space-y-4">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                    <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium">Invalid Link</h3>
                  <p className="text-sm text-muted-foreground">
                    This password reset link is invalid or has expired. Please request a new one.
                  </p>
                  <Button
                    variant="default"
                    className="w-full mt-4"
                    onClick={() => router.push('/forgot-password')}
                  >
                    Request New Link
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Password Field */}
                <div>
                  <Label htmlFor="password" requiredMark>
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      invalid={!!form.formState.errors.password}
                      disabled={form.formState.isSubmitting}
                      {...form.register('password')}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOffIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <Label htmlFor="confirmPassword" requiredMark>
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      invalid={!!form.formState.errors.confirmPassword}
                      disabled={form.formState.isSubmitting}
                      {...form.register('confirmPassword')}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOffIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {form.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  isLoading={form.formState.isSubmitting}
                  className="w-full mt-4"
                >
                  {form.formState.isSubmitting ? 'Resetting Password...' : 'Reset Password'}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="border-t pt-6">
            <div className="text-center w-full">
              <Link href="/login" className="text-sm text-primary hover:text-primary/80 font-medium">
                &larr; Back to login
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8 mt-20"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"/></div>}>
      <ResetPasswordFormContent />
    </Suspense>
  );
}

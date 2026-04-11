'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { forgotPassword } from '@/lib/client/auth';
import { trpc } from '@/lib/client/trpc';

const ForgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSuccess, setIsSuccess] = useState(false);

  // Fetch company profile for branding
  const { data: companyProfile } = trpc.settings.getCompanyProfile.useQuery();

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      const result = await forgotPassword({
        email: data.email,
        redirectTo: '/reset-password',
      });

      if (result.error) {
        toast({
          message: result.error.message || 'Failed to send reset email',
          type: 'error',
        });
        return;
      }

      setIsSuccess(true);
      toast({
        message: 'Password reset link sent to your email!',
        type: 'success',
      });
    } catch (error) {
      console.error('Forgot password error:', error);
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

        {/* Forgot Password Card */}
        <Card>
          <CardHeader>
            <CardTitle>Forgot Password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isSuccess ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900">
                  <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium">Check your email</h3>
                <p className="text-sm text-muted-foreground">
                  We've sent a password reset link to <span className="font-semibold text-foreground">{form.getValues('email')}</span>.
                </p>
                <div className="pt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setIsSuccess(false);
                      form.reset();
                    }}
                  >
                    Try another email
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Email Field */}
                <div>
                  <Label htmlFor="email" requiredMark>
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    invalid={!!form.formState.errors.email}
                    disabled={form.formState.isSubmitting}
                    {...form.register('email')}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  isLoading={form.formState.isSubmitting}
                  className="w-full"
                >
                  {form.formState.isSubmitting ? 'Sending Link...' : 'Send Reset Link'}
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

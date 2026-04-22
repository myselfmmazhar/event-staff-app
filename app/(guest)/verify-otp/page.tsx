'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { trpc } from '@/lib/client/trpc';
import { signIn } from '@/lib/client/auth';
import { Loader2, ShieldCheck } from 'lucide-react';

const OTP_LENGTH = 6;

function VerifyOtpContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';
    const type = (searchParams.get('type') || 'client') as 'client' | 'staff';

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [isSigningIn, setIsSigningIn] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    const clientVerifyMutation = trpc.clients.verifyOtp.useMutation();
    const staffVerifyMutation = trpc.staff.verifyOtp.useMutation();
    const clientResendMutation = trpc.clients.resendOtp.useMutation();
    const staffResendMutation = trpc.staff.resendOtp.useMutation();

    const verifyMutation = type === 'client' ? clientVerifyMutation : staffVerifyMutation;
    const resendMutation = type === 'client' ? clientResendMutation : staffResendMutation;

    const isLoading = verifyMutation.isPending || isSigningIn;

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const digit = value.slice(-1);
        const next = [...otp];
        next[index] = digit;
        setOtp(next);
        if (digit && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
        if (pasted.length === OTP_LENGTH) {
            setOtp(pasted.split(''));
            inputRefs.current[OTP_LENGTH - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length !== OTP_LENGTH) {
            toast({ message: 'Please enter all 6 digits', type: 'error' });
            return;
        }

        try {
            await verifyMutation.mutateAsync({ email, otp: code });

            // Auto sign-in using credentials stored in sessionStorage
            const password = sessionStorage.getItem('otp_password');
            if (!password) {
                toast({ message: 'Verification successful! Please log in.', type: 'success' });
                router.push('/login');
                return;
            }

            setIsSigningIn(true);
            const result = await signIn.email({ email, password, callbackURL: '/' });

            sessionStorage.removeItem('otp_password');
            sessionStorage.removeItem('otp_email');
            sessionStorage.removeItem('otp_type');

            if (result?.error) {
                toast({ message: 'Verification successful! Please log in.', type: 'success' });
                router.push('/login');
            }
            // router navigation handled by callbackURL on success
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Verification failed';
            toast({ message, type: 'error' });
            setIsSigningIn(false);
        }
    };

    const handleResend = async () => {
        try {
            await resendMutation.mutateAsync({ email });
            toast({ message: 'A new verification code has been sent to your email.', type: 'success' });
            setOtp(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to resend code';
            toast({ message, type: 'error' });
        }
    };

    if (!email) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">Invalid Link</CardTitle>
                        <CardDescription>No email address found. Please restart the invitation process.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button onClick={() => router.push('/login')} className="w-full">Go to Login</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg mb-4">
                        <ShieldCheck className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">Verify Your Email</h1>
                    <p className="text-muted-foreground mt-2">
                        We sent a 6-digit code to <strong>{email}</strong>
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Enter Verification Code</CardTitle>
                        <CardDescription>
                            Enter the 6-digit code from your email. The code expires in 10 minutes.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="flex justify-center gap-3" onPaste={handlePaste}>
                            {otp.map((digit, i) => (
                                <Input
                                    key={i}
                                    ref={(el) => { inputRefs.current[i] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleChange(i, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(i, e)}
                                    disabled={isLoading}
                                    className="w-12 h-14 text-center text-xl font-bold"
                                />
                            ))}
                        </div>

                        <Button
                            onClick={handleVerify}
                            size="lg"
                            className="w-full"
                            disabled={isLoading || otp.join('').length !== OTP_LENGTH}
                        >
                            {isLoading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isSigningIn ? 'Signing in...' : 'Verifying...'}</>
                            ) : 'Verify & Sign In'}
                        </Button>
                    </CardContent>

                    <CardFooter className="flex-col gap-3">
                        <p className="text-sm text-muted-foreground">
                            Didn't receive the code?{' '}
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resendMutation.isPending}
                                className="text-primary hover:text-primary/80 font-medium disabled:opacity-50"
                            >
                                {resendMutation.isPending ? 'Sending...' : 'Resend code'}
                            </button>
                        </p>
                        <p className="text-sm text-muted-foreground">
                            <button
                                type="button"
                                onClick={() => router.push('/login')}
                                className="text-muted-foreground hover:text-foreground underline"
                            >
                                Back to login
                            </button>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

export default function VerifyOtpPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        }>
            <VerifyOtpContent />
        </Suspense>
    );
}

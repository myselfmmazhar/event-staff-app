'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { EyeIcon, EyeOffIcon } from '@/components/ui/icons';
import { twoFactor, useSession, signOut } from '@/lib/client/auth';

type Step = 'password' | 'scan' | 'verify' | 'backup';

export default function Setup2FAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const { data: session, isPending } = useSession();

  const [step, setStep] = useState<Step>('password');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totpUri, setTotpUri] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace('/login');
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (totpUri) {
      QRCode.toDataURL(totpUri, { width: 240, margin: 1 }).then(setQrDataUrl);
    }
  }, [totpUri]);

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await twoFactor.enable({ password });
      if (result.error) {
        toast({ message: result.error.message || 'Failed to enable 2FA', type: 'error' });
        return;
      }
      setTotpUri(result.data?.totpURI || '');
      setBackupCodes(result.data?.backupCodes || []);
      setStep('scan');
    } catch (err) {
      toast({
        message: err instanceof Error ? err.message : 'Failed to enable 2FA',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await twoFactor.verifyTotp({ code });
      if (result.error) {
        toast({ message: result.error.message || 'Invalid code', type: 'error' });
        return;
      }
      setStep('backup');
    } catch (err) {
      toast({
        message: err instanceof Error ? err.message : 'Verification failed',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const blob = new Blob(
      [
        `Event Staff App — 2FA Backup Codes\n` +
          `Account: ${session?.user.email}\n` +
          `Generated: ${new Date().toISOString()}\n\n` +
          `Keep these codes somewhere safe. Each code can be used once if you lose access to your authenticator.\n\n` +
          backupCodes.join('\n'),
      ],
      { type: 'text/plain' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `2fa-backup-codes-${session?.user.email}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFinish = () => {
    router.push(callbackUrl);
  };

  if (isPending || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Set up Two-Factor Auth</h1>

        </div>

        <Card>
          {step === 'password' && (
            <>
              <CardHeader>
                <CardTitle>Confirm your password</CardTitle>
                <CardDescription>
                  Enter your password to begin enrolling in two-factor authentication.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEnable} className="space-y-4">
                  <div>
                    <Label htmlFor="password" requiredMark>
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    variant="default"
                    size="lg"
                    isLoading={loading}
                    className="w-full"
                  >
                    Continue
                  </Button>
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                      router.push('/login');
                    }}
                    className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
                  >
                    Sign out
                  </button>
                </form>
              </CardContent>
            </>
          )}

          {step === 'scan' && (
            <>
              <CardHeader>
                <CardTitle>Scan QR code</CardTitle>
                <CardDescription>
                  Open Google Authenticator (or any TOTP app) and scan the code below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="2FA QR code"
                      className="rounded-lg border bg-white p-2"
                    />
                  ) : (
                    <div className="h-[240px] w-[240px] animate-pulse rounded-lg bg-muted" />
                  )}
                </div>
                <details className="text-sm text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">
                    Can't scan? Enter the key manually
                  </summary>
                  <code className="mt-2 block break-all rounded bg-muted p-2 font-mono text-xs">
                    {totpUri}
                  </code>
                </details>
                <Button
                  variant="default"
                  size="lg"
                  className="w-full"
                  onClick={() => setStep('verify')}
                >
                  I've scanned it
                </Button>
              </CardContent>
            </>
          )}

          {step === 'verify' && (
            <>
              <CardHeader>
                <CardTitle>Enter verification code</CardTitle>
                <CardDescription>
                  Enter the 6-digit code from your authenticator app.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <Label htmlFor="code" requiredMark>
                      6-digit code
                    </Label>
                    <Input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="text-center text-2xl tracking-widest font-mono"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="default"
                    size="lg"
                    isLoading={loading}
                    className="w-full"
                    disabled={code.length !== 6}
                  >
                    Verify and enable
                  </Button>
                  <button
                    type="button"
                    onClick={() => setStep('scan')}
                    className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
                  >
                    Back to QR code
                  </button>
                </form>
              </CardContent>
            </>
          )}

          {step === 'backup' && (
            <>
              <CardHeader>
                <CardTitle>Save your backup codes</CardTitle>
                <CardDescription>
                  Store these codes somewhere safe. Each one can be used once if you lose
                  access to your authenticator. They will not be shown again.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-4">
                  {backupCodes.map((c) => (
                    <code key={c} className="font-mono text-sm">
                      {c}
                    </code>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={downloadBackupCodes}
                >
                  Download codes
                </Button>
                <Button
                  variant="default"
                  size="lg"
                  className="w-full"
                  onClick={handleFinish}
                >
                  I've saved my codes — continue
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

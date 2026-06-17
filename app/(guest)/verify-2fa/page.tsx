'use client';

// =============================================================================
// 2FA (Google Authenticator) functionality disabled — kept for reference.
// This page is no longer reachable from the app flow. It now redirects to the
// login page. The original implementation is preserved in the block comment
// below so it can be restored later if needed.
// =============================================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Verify2FAPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
// ORIGINAL 2FA VERIFY IMPLEMENTATION (disabled)

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { twoFactor } from '@/lib/client/auth';

type Mode = 'totp' | 'backup';

export default function Verify2FAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [mode, setMode] = useState<Mode>('totp');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result =
        mode === 'totp'
          ? await twoFactor.verifyTotp({ code })
          : await twoFactor.verifyBackupCode({ code });

      if (result.error) {
        toast({ message: result.error.message || 'Invalid code', type: 'error' });
        return;
      }

      toast({ message: 'Verified. Redirecting...', type: 'success' });
      router.push(callbackUrl);
    } catch (err) {
      toast({
        message: err instanceof Error ? err.message : 'Verification failed',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const isTotp = mode === 'totp';
  const expectedLen = isTotp ? 6 : 10;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Two-Factor Auth</h1>
          <p className="text-muted-foreground mt-2">
            {isTotp
              ? 'Enter the 6-digit code from your authenticator app'
              : 'Enter one of your backup codes'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isTotp ? 'Authenticator code' : 'Backup code'}</CardTitle>
            <CardDescription>
              {isTotp
                ? 'Open Google Authenticator or your TOTP app and enter the current code.'
                : 'Each backup code can only be used once.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="code" requiredMark>
                  {isTotp ? '6-digit code' : 'Backup code'}
                </Label>
                <Input
                  id="code"
                  type="text"
                  inputMode={isTotp ? 'numeric' : 'text'}
                  pattern={isTotp ? '[0-9]{6}' : undefined}
                  maxLength={expectedLen}
                  value={code}
                  onChange={(e) =>
                    setCode(isTotp ? e.target.value.replace(/\D/g, '') : e.target.value.trim())
                  }
                  placeholder={isTotp ? '123456' : 'XXXXXXXXXX'}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoFocus
                  required
                />
              </div>
              <Button
                type="submit"
                variant="default"
                size="lg"
                isLoading={loading}
                className="w-full"
                disabled={code.length !== expectedLen}
              >
                Verify
              </Button>
              <button
                type="button"
                onClick={() => {
                  setCode('');
                  setMode(isTotp ? 'backup' : 'totp');
                }}
                className="block w-full text-center text-sm text-primary hover:text-primary/80 font-medium"
              >
                {isTotp ? 'Use a backup code instead' : 'Use authenticator app instead'}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
---------------------------------------------------------------------------- */

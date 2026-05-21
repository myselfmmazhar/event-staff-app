'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { twoFactor, useSession } from '@/lib/client/auth';

type Mode = 'idle' | 'regenerate' | 'change-device';

export function TwoFactorSection() {
  const { toast } = useToast();
  const router = useRouter();
  const { data: session } = useSession();

  const [mode, setMode] = useState<Mode>('idle');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);

  const resetForm = () => {
    setPassword('');
    setMode('idle');
  };

  const handleRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNewCodes(null);
    try {
      const result = await twoFactor.generateBackupCodes({ password });
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message || 'Failed to regenerate codes',
          variant: 'destructive',
        });
        return;
      }
      const codes = result.data?.backupCodes || [];
      setNewCodes(codes);
      setPassword('');
      setMode('idle');
      toast({
        title: 'Backup codes regenerated',
        description: 'Your previous backup codes are no longer valid.',
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to regenerate codes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await twoFactor.disable({ password });
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message || 'Failed to disable 2FA',
          variant: 'destructive',
        });
        return;
      }
      // 2FA is now disabled — the AuthGuard will force re-enrollment, but we
      // route directly to /setup-2fa for the cleaner UX.
      toast({
        title: 'Removing old authenticator',
        description: 'Set up your new device on the next screen.',
        variant: 'success',
      });
      router.push('/setup-2fa');
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to disable 2FA',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const downloadCodes = () => {
    if (!newCodes) return;
    const blob = new Blob(
      [
        `Event Staff App — 2FA Backup Codes\n` +
          `Account: ${session?.user.email}\n` +
          `Generated: ${new Date().toISOString()}\n\n` +
          `Keep these codes somewhere safe. Each code can be used once if you lose access to your authenticator.\n\n` +
          newCodes.join('\n'),
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Two-factor auth is enabled for your account. Regenerate backup codes or switch to a
          new authenticator device below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {newCodes && (
          <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div>
              <h3 className="font-semibold">New backup codes</h3>
              <p className="text-sm text-muted-foreground">
                Save these now — they will not be shown again.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-lg border bg-background p-4">
              {newCodes.map((c) => (
                <code key={c} className="font-mono text-sm">
                  {c}
                </code>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadCodes}>
                Download codes
              </Button>
              <Button variant="ghost" onClick={() => setNewCodes(null)}>
                Done
              </Button>
            </div>
          </div>
        )}

        {/* Regenerate backup codes */}
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold">Backup codes</h3>
            <p className="text-sm text-muted-foreground">
              Generate a new set of backup codes. Your previous codes will stop working
              immediately.
            </p>
          </div>
          {mode === 'regenerate' ? (
            <form onSubmit={handleRegenerate} className="space-y-3">
              <div>
                <Label htmlFor="regen-password" requiredMark>
                  Confirm your password
                </Label>
                <Input
                  id="regen-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" isLoading={loading} disabled={!password}>
                  Regenerate codes
                </Button>
                <Button type="button" variant="ghost" onClick={resetForm} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="outline"
              onClick={() => setMode('regenerate')}
              disabled={mode !== 'idle'}
            >
              Regenerate backup codes
            </Button>
          )}
        </div>

        {/* Change device */}
        <div className="space-y-3 border-t pt-6">
          <div>
            <h3 className="font-semibold">Authenticator device</h3>
            <p className="text-sm text-muted-foreground">
              Lost or replaced your phone? Remove the current authenticator and set up a new
              one. You'll be taken to the setup screen next.
            </p>
          </div>
          {mode === 'change-device' ? (
            <form onSubmit={handleChangeDevice} className="space-y-3">
              <div>
                <Label htmlFor="device-password" requiredMark>
                  Confirm your password
                </Label>
                <Input
                  id="device-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" isLoading={loading} disabled={!password}>
                  Continue to new device setup
                </Button>
                <Button type="button" variant="ghost" onClick={resetForm} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="outline"
              onClick={() => setMode('change-device')}
              disabled={mode !== 'idle'}
            >
              Change authenticator device
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

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
import { CheckIcon } from '@/components/ui/icons';
import { useState } from 'react';

interface TemporaryPasswordModalProps {
  tempPassword: string | null;
  clientName: string;
  clientEmail: string;
  open: boolean;
  onClose: () => void;
}

export function TemporaryPasswordModal({
  tempPassword,
  clientName,
  clientEmail,
  open,
  onClose,
}: TemporaryPasswordModalProps) {
  const [copied, setCopied] = useState(false);

  if (!tempPassword) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Share Login Credentials</DialogTitle>
      </DialogHeader>

      <DialogContent>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-blue-900">
              ✓ Login credentials have been generated for <strong>{clientName}</strong>
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Client Email</label>
            <Input
              value={clientEmail}
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Temporary Password</label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={tempPassword}
                readOnly
                className="bg-muted"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <CheckIcon className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium text-yellow-900">⚠️ Important:</p>
            <ul className="text-sm text-yellow-900 space-y-1 list-disc list-inside">
              <li>Save this password - it won't be shown again</li>
              <li>Share the email and password with the client securely</li>
              <li>The client can change their password after first login</li>
            </ul>
          </div>

          <div className="space-y-2 p-4 bg-gray-50 rounded-lg border border-border">
            <p className="text-sm font-medium">Suggested Message:</p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Email: <code className="bg-white px-2 py-1 rounded">{clientEmail}</code></p>
              <p>Password: <code className="bg-white px-2 py-1 rounded">{tempPassword}</code></p>
              <p className="mt-2">Please log in at: <code className="bg-white px-2 py-1 rounded">portal.yourdomain.com</code></p>
            </div>
          </div>
        </div>
      </DialogContent>

      <DialogFooter>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </Dialog>
  );
}

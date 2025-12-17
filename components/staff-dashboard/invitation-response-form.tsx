'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface InvitationResponseFormProps {
  onSubmit: (accept: boolean, declineReason?: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function InvitationResponseForm({
  onSubmit,
  onCancel,
  isSubmitting,
}: InvitationResponseFormProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleDecline = () => {
    if (!reason.trim()) {
      setError('Please provide a reason for declining');
      return;
    }
    onSubmit(false, reason.trim());
  };

  return (
    <div className="w-full md:w-64 space-y-3 p-3 bg-muted/30 rounded-lg">
      <div>
        <Label htmlFor="declineReason">Reason for declining</Label>
        <Textarea
          id="declineReason"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError('');
          }}
          placeholder="Please provide a reason..."
          rows={3}
          disabled={isSubmitting}
          className="mt-1"
        />
        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      </div>
      <div className="flex gap-2">
        <Button
          variant="danger"
          size="sm"
          onClick={handleDecline}
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Submitting...' : 'Confirm Decline'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

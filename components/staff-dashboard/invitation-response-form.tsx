'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface InvitationResponseFormProps {
  onSubmit: (accept: boolean, declineReason?: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const SUGGESTED_REPLIES = [
  'Unavailable',
  'Schedule conflict',
  'Too far',
  'Pay rate too low',
];

export function InvitationResponseForm({
  onSubmit,
  onCancel,
  isSubmitting,
}: InvitationResponseFormProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [selectedAutoReply, setSelectedAutoReply] = useState<string | null>(null);

  const handleDecline = () => {
    const finalReason = selectedAutoReply === 'Other' || !selectedAutoReply 
      ? reason.trim() 
      : selectedAutoReply;
      
    if (!finalReason) {
      setError('Please provide a reason for declining');
      return;
    }
    onSubmit(false, finalReason);
  };

  const handleAutoReplyClick = (reply: string) => {
    setSelectedAutoReply(reply);
    if (reply !== 'Other') {
      setReason('');
    }
    setError('');
  };

  return (
    <div className="w-full md:w-80 space-y-4 p-4 bg-muted/30 rounded-lg border border-border shadow-sm">
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Reason for declining</Label>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTED_REPLIES.map((reply) => (
            <Button
              key={reply}
              variant="outline"
              size="sm"
              type="button"
              className={cn(
                "h-8 text-xs font-medium rounded-full px-3",
                selectedAutoReply === reply && "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
              )}
              onClick={() => handleAutoReplyClick(reply)}
            >
              {reply}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            type="button"
            className={cn(
              "h-8 text-xs font-medium rounded-full px-3",
              selectedAutoReply === 'Other' && "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
            )}
            onClick={() => handleAutoReplyClick('Other')}
          >
            Other
          </Button>
        </div>

        {(selectedAutoReply === 'Other' || !selectedAutoReply) && (
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
            className="mt-1 resize-none"
          />
        )}
        
        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      </div>
      
      <div className="flex gap-2 pt-2">
        <Button
          variant="danger"
          size="sm"
          onClick={handleDecline}
          disabled={isSubmitting || (!selectedAutoReply && !reason.trim())}
          className="flex-1 font-bold"
        >
          {isSubmitting ? 'Submitting...' : 'Confirm Decline'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 font-bold"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

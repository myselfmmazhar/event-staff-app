'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BellIcon, CheckCircleIcon } from '@/components/ui/icons';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { isDateNullOrUBD } from '@/lib/utils/date-formatter';
import type { AssignmentData } from './assignment-table';

interface SendReminderModalProps {
  assignment: AssignmentData | null;
  open: boolean;
  onClose: () => void;
}

export function SendReminderModal({
  assignment,
  open,
  onClose,
}: SendReminderModalProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!assignment) return null;

  const confirmedStaff = assignment.invitations.filter(inv => inv.isConfirmed);
  const dateIsUBD = isDateNullOrUBD(assignment.startDate);
  const startDate = dateIsUBD ? null : (typeof assignment.startDate === 'string'
    ? new Date(assignment.startDate)
    : assignment.startDate);
  const dateStr = dateIsUBD ? 'a date to be determined' : format(startDate!, 'EEEE, MMMM d, yyyy');

  const defaultMessage = `Reminder: You have an upcoming assignment for "${assignment.service?.title || 'Event Staff'}" at ${assignment.event.title} on ${dateStr}. Please ensure you arrive on time.`;

  const handleSend = async () => {
    if (confirmedStaff.length === 0) {
      toast({ title: 'No confirmed staff to send reminders to', variant: 'info' });
      return;
    }

    setIsSending(true);

    // Simulate sending reminders (in a real app, this would call an API)
    // For now, we'll show a success message after a short delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    setSentSuccess(true);
    setIsSending(false);

    toast({
      title: `Reminder sent to ${confirmedStaff.length} staff member${confirmedStaff.length > 1 ? 's' : ''}`,
      variant: 'success'
    });

    // Reset and close after showing success
    setTimeout(() => {
      setSentSuccess(false);
      setMessage('');
      onClose();
    }, 1500);
  };

  const handleClose = () => {
    setSentSuccess(false);
    setMessage('');
    onClose();
  };

  if (sentSuccess) {
    return (
      <Dialog open={open} onClose={handleClose}>
        <DialogContent>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-green-100 p-3 mb-4">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Reminders Sent!
            </h3>
            <p className="text-sm text-muted-foreground text-center">
              {confirmedStaff.length} staff member{confirmedStaff.length > 1 ? 's have' : ' has'} been notified.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <BellIcon className="h-5 w-5" />
          Send Reminder
        </DialogTitle>
      </DialogHeader>

      <DialogContent>
        <div className="space-y-4">
          {/* Assignment Info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium text-foreground">
              {assignment.service?.title || 'No Position'}
            </p>
            <p className="text-sm text-muted-foreground">
              {assignment.event.title} - {dateIsUBD ? 'UBD' : format(startDate!, 'MMM d, yyyy')}
            </p>
          </div>

          {/* Recipients */}
          <div>
            <Label className="text-sm font-medium">Recipients</Label>
            {confirmedStaff.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {confirmedStaff.map((inv) => (
                  <Badge key={inv.id} variant="secondary">
                    {inv.staff.firstName} {inv.staff.lastName}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No confirmed staff for this assignment.
              </p>
            )}
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="reminder-message" className="text-sm font-medium">
              Message (optional)
            </Label>
            <Textarea
              id="reminder-message"
              placeholder={defaultMessage}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-2"
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to use the default reminder message.
            </p>
          </div>
        </div>
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={handleClose} disabled={isSending}>
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          disabled={isSending || confirmedStaff.length === 0}
        >
          {isSending ? 'Sending...' : `Send to ${confirmedStaff.length} Staff`}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

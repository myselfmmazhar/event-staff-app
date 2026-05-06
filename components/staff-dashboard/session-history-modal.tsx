'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CloseIcon } from '@/components/ui/icons';
import { format } from 'date-fns';
import type { ShiftSession } from './talent-assignment-table';

interface SessionHistoryModalProps {
  open: boolean;
  onClose: () => void;
  sessions: ShiftSession[];
}

function fmtInstant(d: Date | string) {
  return format(new Date(d), 'MMM d, yyyy · h:mm a');
}

function sessionDurationMs(s: ShiftSession): number | null {
  if (!s.clockOut) return null;
  return new Date(s.clockOut).getTime() - new Date(s.clockIn).getTime();
}

function fmtDurationMs(ms: number) {
  const safe = ms < 0 ? 0 : ms;
  const totalMin = Math.floor(safe / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function SessionHistoryModal({ open, onClose, sessions }: SessionHistoryModalProps) {
  const totalMs = sessions.reduce((acc, s) => acc + (sessionDurationMs(s) ?? 0), 0);

  return (
    <Dialog open={open} onClose={onClose} className="w-full max-w-lg">
      <DialogHeader className="flex items-start justify-between">
        <div>
          <DialogTitle>Session History</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Clock-in / clock-out details for this assignment.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 -mt-1 -mr-2"
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon className="h-4 w-4" />
        </Button>
      </DialogHeader>

      <DialogContent className="space-y-3 max-h-[60vh] overflow-y-auto">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions recorded.</p>
        ) : (
          sessions.map((s, idx) => {
            const dur = sessionDurationMs(s);
            return (
              <div
                key={s.id}
                className="border border-border rounded-lg p-3 bg-muted/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Session {idx + 1}
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {dur === null ? '—' : fmtDurationMs(dur)}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Clock in</p>
                    <p className="text-foreground">{fmtInstant(s.clockIn)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Clock out</p>
                    <p className="text-foreground">
                      {s.clockOut ? fmtInstant(s.clockOut) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </DialogContent>

      {sessions.length > 0 && (
        <div className="px-6 py-3 border-t border-border flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Total</span>
          <span className="text-sm font-semibold text-foreground">
            {fmtDurationMs(totalMs)}
          </span>
        </div>
      )}
    </Dialog>
  );
}

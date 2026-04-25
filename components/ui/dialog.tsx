'use client';

import { useEffect, useRef, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// Track open dialogs to handle stacking properly
const openDialogs: Set<string> = new Set();

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  fullScreen?: boolean;
}

export function Dialog({ open, onClose, children, className, fullScreen }: DialogProps) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();

  useEffect(() => {
    setMounted(true);
    if (open) {
      openDialogs.add(dialogId);
    } else {
      openDialogs.delete(dialogId);
    }
    return () => {
      openDialogs.delete(dialogId);
    };
  }, [open, dialogId]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Only close the topmost (most recently opened) dialog
        const dialogsArray = Array.from(openDialogs);
        if (dialogsArray[dialogsArray.length - 1] === dialogId) {
          e.stopPropagation();
          onClose();
        }
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      // Only restore scroll if no other dialogs are open
      if (openDialogs.size === 0) {
        document.body.style.overflow = 'unset';
      }
    };
  }, [open, onClose, dialogId]);

  if (!open || !mounted) return null;

  // Calculate z-index based on dialog stack position
  const stackIndex = Array.from(openDialogs).indexOf(dialogId);
  const zIndex = 50 + (stackIndex * 10);

  const dialogContent = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
      style={{ zIndex }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative bg-card shadow-2xl transition-all duration-200',
          'animate-in fade-in-0 zoom-in-95',
          fullScreen
            ? 'w-screen h-screen max-w-none max-h-none rounded-none flex flex-col'
            : 'w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl',
          className
        )}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}

export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 py-4 border-b border-border', className)}>
      {children}
    </div>
  );
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn('text-xl font-semibold text-card-foreground', className)}>
      {children}
    </h2>
  );
}

export function DialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-sm text-muted-foreground mt-1', className)}>
      {children}
    </p>
  );
}

export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  );
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 py-4 border-t border-border flex items-center justify-end gap-3', className)}>
      {children}
    </div>
  );
}

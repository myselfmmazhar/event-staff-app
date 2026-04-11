import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive' | 'success' | 'info';
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  const getButtonClass = () => {
    switch (variant) {
      case 'destructive': return 'bg-destructive hover:bg-destructive/90 text-destructive-foreground';
      case 'success': return 'bg-emerald-600 hover:bg-emerald-700 text-white';
      case 'info': return 'bg-blue-600 hover:bg-blue-700 text-white';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-[400px]">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      
      <DialogFooter className="bg-muted/30">
        <Button 
          variant="outline" 
          onClick={onClose} 
          disabled={isLoading}
          className="px-6"
        >
          {cancelLabel}
        </Button>
        <Button 
          onClick={onConfirm} 
          disabled={isLoading}
          className={cn('px-6 min-w-[100px]', getButtonClass())}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Processing...
            </div>
          ) : confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

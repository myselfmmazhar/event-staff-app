'use client';

import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Service } from '@/lib/types/service';
import {
  COST_UNIT_TYPE_LABELS,
} from '@/lib/constants/enums';
import { CloseIcon } from '@/components/ui/icons';
import { formatDollarOrPlaceholder } from '@/lib/utils/currency-formatter';

interface ViewServiceModalProps {
  service: Service | null;
  open: boolean;
  onClose: () => void;
}

export function ViewServiceModal({ service, open, onClose }: ViewServiceModalProps) {
  if (!service) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="mx-4 flex h-[min(94vh,1000px)] w-full max-h-[min(94vh,1000px)] max-w-[1400px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-card p-0 shadow-xl"
    >
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle>Service Details</DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </DialogHeader>

      <DialogContent>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-xs text-muted-foreground">{service.serviceId}</div>
              <h3 className="text-lg font-semibold text-foreground">{service.title}</h3>
            </div>
            <Badge variant={service.isActive ? 'success' : 'secondary'} asSpan>
              {service.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <div className="text-muted-foreground mb-1">Cost</div>
              <div className="text-foreground font-medium">{formatDollarOrPlaceholder(service.cost)}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Price</div>
              <div className="text-foreground font-medium">{formatDollarOrPlaceholder(service.price)}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Minimum</div>
              <div className="text-foreground font-medium">
                {service.minimum != null 
                  ? `${(typeof service.minimum === 'object' && 'toNumber' in service.minimum ? (service.minimum as { toNumber: () => number }).toNumber() : Number(service.minimum))}${service.costUnitType === 'HOURLY' ? ' hrs' : ''}`
                  : '-'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Rate Type</div>
              <div className="text-foreground font-medium">
                {service.costUnitType ? COST_UNIT_TYPE_LABELS[service.costUnitType] : '-'}
              </div>
            </div>
          </div>

          {service.description && (
            <div>
              <div className="text-sm text-muted-foreground mb-1">Description</div>
              <div className="text-sm text-foreground whitespace-pre-wrap">{service.description}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


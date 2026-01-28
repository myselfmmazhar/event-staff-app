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
  EXPERIENCE_REQUIREMENT_LABELS,
  STAFF_RATING_LABELS,
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
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Cost</div>
              <div className="text-foreground font-medium">{formatDollarOrPlaceholder(service.cost)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Cost Unit</div>
              <div className="text-foreground font-medium">
                {service.costUnitType ? COST_UNIT_TYPE_LABELS[service.costUnitType] : '-'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Experience Requirement</div>
              <div className="text-foreground font-medium">
                {service.experienceRequirement
                  ? EXPERIENCE_REQUIREMENT_LABELS[service.experienceRequirement]
                  : '-'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Rating Requirement</div>
              <div className="text-foreground font-medium">
                {service.ratingRequirement ? STAFF_RATING_LABELS[service.ratingRequirement] : '-'}
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


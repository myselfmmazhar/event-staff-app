'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { EditIcon } from '@/components/ui/icons';
import type { Client } from '@/lib/types/client';

interface ViewClientDialogProps {
  client: Client | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export function ViewClientDialog({
  client,
  open,
  onClose,
  onEdit,
}: ViewClientDialogProps) {
  if (!client) return null;

  return (
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Client Details</DialogTitle>
      </DialogHeader>

      <DialogContent className="max-h-[calc(100vh-280px)] overflow-y-auto">
        {/* Client ID */}
        <div className="mb-6 p-3 bg-muted/30 rounded-md border border-border">
          <p className="text-sm text-muted-foreground">Client ID</p>
          <p className="text-base font-medium">{client.clientId}</p>
        </div>

        {/* Client Information */}
        <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
          <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Client Information</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Business Name</p>
              <p className="text-base">{client.businessName}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">First Name</p>
                <p className="text-base">{client.firstName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Name</p>
                <p className="text-base">{client.lastName}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-base">{client.email}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Cell Phone</p>
                <p className="text-base">{client.cellPhone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Business Phone</p>
                <p className="text-base">{client.businessPhone || '-'}</p>
              </div>
            </div>
            {client.details && (
              <div>
                <p className="text-sm text-muted-foreground">Details</p>
                <p className="text-base whitespace-pre-wrap">{client.details}</p>
              </div>
            )}
          </div>
        </div>

        {/* Primary Address */}
        <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
          <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Primary Address</h3>
          <div className="space-y-3">
            {client.venueName && (
              <div>
                <p className="text-sm text-muted-foreground">Venue Name</p>
                <p className="text-base">{client.venueName}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Street Address</p>
              <p className="text-base">
                {client.streetAddress}
                {client.aptSuiteUnit && `, ${client.aptSuiteUnit}`}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">City</p>
                <p className="text-base">{client.city}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">State</p>
                <p className="text-base">{client.state}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ZIP</p>
                <p className="text-base">{client.zipCode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Country</p>
                <p className="text-base">{client.country}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Client Portal Access */}
        <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
          <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Client Portal Access</h3>
          <div className="flex items-center gap-3">
            <Badge variant={client.hasLoginAccess ? 'default' : 'secondary'}>
              {client.hasLoginAccess ? 'Portal Access Enabled' : 'No Portal Access'}
            </Badge>
            {client.hasLoginAccess && client.userId && (
              <p className="text-sm text-muted-foreground">Client can log in to the portal</p>
            )}
          </div>
        </div>
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={onEdit}>
          <EditIcon className="h-4 w-4 mr-2" />
          Edit Client
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

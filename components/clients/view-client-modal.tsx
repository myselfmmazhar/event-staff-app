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
import { Card } from '@/components/ui/card';
import { EditIcon, MapPinIcon } from '@/components/ui/icons';
import type { Client } from '@/lib/types/client';

interface ViewClientModalProps {
  client: Client | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export function ViewClientModal({
  client,
  open,
  onClose,
  onEdit,
}: ViewClientModalProps) {
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-base">{client.email}</p>
              </div>
              {client.ccEmail && (
                <div>
                  <p className="text-sm text-muted-foreground">CC Email</p>
                  <p className="text-base">{client.ccEmail}</p>
                </div>
              )}
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
            {client.requirements && (
              <div>
                <p className="text-sm text-muted-foreground">Requirements</p>
                <p className="text-base whitespace-pre-wrap">{client.requirements}</p>
              </div>
            )}
          </div>
        </div>

        {/* Business Address */}
        <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
          <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Business Address</h3>
          <div className="space-y-3">
            {client.businessAddress && (
              <div>
                <p className="text-sm text-muted-foreground">Business Address</p>
                <p className="text-base">{client.businessAddress}</p>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
            </div>
          </div>
        </div>

        {/* Billing Contact */}
        {(client.billingFirstName || client.billingLastName || client.billingEmail || client.billingPhone) && (
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Billing Contact</h3>
            <div className="space-y-3">
              {(client.billingFirstName || client.billingLastName) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Billing First Name</p>
                    <p className="text-base">{client.billingFirstName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Billing Last Name</p>
                    <p className="text-base">{client.billingLastName || '-'}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {client.billingEmail && (
                  <div>
                    <p className="text-sm text-muted-foreground">Billing Email</p>
                    <p className="text-base">{client.billingEmail}</p>
                  </div>
                )}
                {client.billingPhone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Billing Phone</p>
                    <p className="text-base">{client.billingPhone}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Saved Locations */}
        {client.locations && client.locations.length > 0 && (
          <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Saved Locations</h3>
            <div className="space-y-3">
              {client.locations.map((location) => (
                <Card key={location.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPinIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{location.venueName}</p>
                      {location.meetingPoint && (
                        <p className="text-sm text-muted-foreground">
                          Meeting Point: {location.meetingPoint}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {location.venueAddress}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {location.city}, {location.state} {location.zipCode}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

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

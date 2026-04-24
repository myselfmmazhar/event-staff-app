'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CloseIcon, EditIcon, MapPinIcon } from '@/components/ui/icons';
import type { Client } from '@/lib/types/client';

interface ViewClientModalProps {
  client: Client | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-5">
      <h3 className="mb-4 border-b border-slate-200 pb-2.5 text-sm font-bold uppercase tracking-wide text-slate-600">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function ViewClientModal({ client, open, onClose, onEdit }: ViewClientModalProps) {
  if (!client) return null;

  const hasBillingContact =
    client.billingFirstName || client.billingLastName || client.billingEmail || client.billingPhone;
  const hasLocations = client.locations && client.locations.length > 0;

  const fullAddress = [
    client.businessAddress,
    client.businessAddressLine2,
    [client.city, client.state].filter(Boolean).join(', '),
    client.zipCode,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="mx-4 flex h-[min(94vh,1000px)] w-full max-h-[min(94vh,1000px)] max-w-[1400px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-card p-0 shadow-xl"
    >
      <DialogContent className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div className="flex h-full min-h-0 flex-col bg-white">

          {/* Header */}
          <div className="shrink-0 border-b border-slate-200 px-6 pb-5 pt-5 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 pr-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  {client.businessName}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-slate-500">{client.clientId}</span>
                  <Badge variant={client.hasLoginAccess ? 'success' : 'secondary'} asSpan>
                    {client.hasLoginAccess ? 'Portal Access' : 'No Access'}
                  </Badge>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

              {/* Left column */}
              <div className="space-y-6">
                <Section title="Contact Information">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="First Name" value={client.firstName} />
                    <Field label="Last Name" value={client.lastName} />
                  </div>
                  <Field label="Email" value={client.email} />
                  <Field label="CC Email" value={client.ccEmail} />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Cell Phone" value={client.cellPhone} />
                    <Field label="Business Phone" value={client.businessPhone} />
                  </div>
                </Section>

                {(client.details || client.requirements) && (
                  <Section title="Notes">
                    <Field label="Details" value={client.details} />
                    <Field label="Requirements" value={client.requirements} />
                  </Section>
                )}
              </div>

              {/* Right column */}
              <div className="space-y-6">
                {fullAddress && (
                  <Section title="Business Address">
                    <Field label="Street" value={client.businessAddress} />
                    {client.businessAddressLine2 && (
                      <Field label="Address Line 2" value={client.businessAddressLine2} />
                    )}
                    <div className="grid grid-cols-3 gap-4">
                      <Field label="City" value={client.city} />
                      <Field label="State" value={client.state} />
                      <Field label="ZIP" value={client.zipCode} />
                    </div>
                  </Section>
                )}

                {hasBillingContact && (
                  <Section title="Billing Contact">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="First Name" value={client.billingFirstName} />
                      <Field label="Last Name" value={client.billingLastName} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Email" value={client.billingEmail} />
                      <Field label="Phone" value={client.billingPhone} />
                    </div>
                  </Section>
                )}

                {hasLocations && (
                  <Section title="Saved Locations">
                    <div className="space-y-2">
                      {client.locations!.map((location) => (
                        <Card key={location.id} className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                              <MapPinIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900">{location.venueName}</p>
                              {location.meetingPoint && (
                                <p className="text-sm text-slate-500">
                                  Meeting point: {location.meetingPoint}
                                </p>
                              )}
                              <p className="text-sm text-slate-500">{location.venueAddress}</p>
                              <p className="text-sm text-slate-500">
                                {location.city}, {location.state} {location.zipCode}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-200 px-6 py-4 sm:px-8">
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-lg border-slate-200">
                Close
              </Button>
              <Button
                type="button"
                onClick={onEdit}
                className="rounded-lg bg-slate-900 text-white hover:bg-slate-800"
              >
                <EditIcon className="mr-2 h-4 w-4" />
                Edit Client
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

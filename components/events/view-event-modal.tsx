'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EditIcon, UsersIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { EVENT_STATUS_COLORS, EVENT_STATUS_LABELS } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils/date-formatter';
import { AMOUNT_TYPE_LABELS, PRICE_UNIT_TYPE_LABELS } from '@/lib/constants/enums';
import { WrenchScrewdriverIcon, CubeIcon } from '@/components/ui/icons';
import type { AmountType, PriceUnitType } from '@prisma/client';

interface ViewEventModalProps {
  eventId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (event: any) => void;
  readOnly?: boolean;
}

export function ViewEventModal({
  eventId,
  open,
  onClose,
  onEdit,
  readOnly = false,
}: ViewEventModalProps) {
  const router = useRouter();
  const { terminology } = useTerminology();
  const { data: event, isLoading, error } = trpc.event.getById.useQuery(
    { id: eventId || '' },
    { enabled: !!eventId && open }
  );

  const handleEdit = () => {
    if (event && onEdit) {
      onEdit(event);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <div className="h-full flex flex-col">
        <DialogHeader>
          <DialogTitle>{terminology.event.singular} Details</DialogTitle>
        </DialogHeader>

        <DialogContent className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive">Failed to load {terminology.event.lower} details</p>
              <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
            </div>
          ) : event ? (
            <div className="space-y-6">
              {/* Header: Event ID + Status */}
              <div className="flex items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{terminology.event.singular} ID</p>
                  <p className="font-mono text-sm font-medium">{event.eventId}</p>
                </div>
                <Badge
                  variant={EVENT_STATUS_COLORS[event.status as keyof typeof EVENT_STATUS_COLORS]}
                  asSpan
                >
                  {EVENT_STATUS_LABELS[event.status as keyof typeof EVENT_STATUS_LABELS]}
                </Badge>
              </div>

              {/* === ROW 1: Event Details + Schedule === */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Event Details */}
                <div className="lg:col-span-2 bg-accent/5 border border-border/30 p-5 rounded-lg">
                  <h3 className="text-base font-semibold border-b border-border pb-2 mb-4">{terminology.event.singular} Details</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Title</p>
                      <p className="text-sm font-medium text-foreground">{event.title}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Client</p>
                      <p className="text-sm text-foreground">
                        {event.client?.businessName || (
                          <span className="text-muted-foreground/70 italic">Not applicable</span>
                        )}
                      </p>
                    </div>

                    {event.description && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{event.description}</p>
                      </div>
                    )}

                    {event.requirements && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Requirements</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{event.requirements}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Schedule */}
                <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                  <h3 className="text-base font-semibold border-b border-border pb-2 mb-4">Schedule</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Start</p>
                      <p className="text-sm text-foreground">{formatDateTime(event.startDate, event.startTime, { dateFormat: 'long' })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">End</p>
                      <p className="text-sm text-foreground">{formatDateTime(event.endDate, event.endTime, { dateFormat: 'long' })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Timezone</p>
                      <p className="text-sm text-foreground font-mono">{event.timezone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* === ROW 2: Venue Information (full width) === */}
              <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                <h3 className="text-base font-semibold border-b border-border pb-2 mb-4">Venue Information</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="text-muted-foreground">Venue:</span>
                    <span className="font-medium text-foreground">{event.venueName}</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="text-muted-foreground">Address:</span>
                    <span className="text-foreground">{event.address}</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="text-foreground">{event.city}, {event.state} {event.zipCode}</span>
                  </div>
                  {event.meetingPoint && (
                    <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                      <span className="text-muted-foreground">Meeting Point:</span>
                      <span className="text-foreground">{event.meetingPoint}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* === ROW 3: Request Information + Onsite Contact === */}
              {(event.requestMethod || event.requestorName || event.poNumber || event.onsitePocName || event.onsitePocPhone || event.onsitePocEmail) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Request Information */}
                  {(event.requestMethod || event.requestorName || event.poNumber) && (
                    <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                      <h3 className="text-base font-semibold border-b border-border pb-2 mb-4">Request Information</h3>
                      <div className="space-y-2">
                        {event.requestMethod && (
                          <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                            <span className="text-muted-foreground">Method:</span>
                            <span className="text-foreground">{event.requestMethod.replace('_', ' ')}</span>
                          </div>
                        )}
                        {event.poNumber && (
                          <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                            <span className="text-muted-foreground">PO Number:</span>
                            <span className="text-foreground font-mono">{event.poNumber}</span>
                          </div>
                        )}
                        {event.requestorName && (
                          <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                            <span className="text-muted-foreground">Requestor:</span>
                            <span className="text-foreground">{event.requestorName}</span>
                          </div>
                        )}
                        {event.requestorPhone && (
                          <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                            <span className="text-muted-foreground">Phone:</span>
                            <span className="text-foreground">{event.requestorPhone}</span>
                          </div>
                        )}
                        {event.requestorEmail && (
                          <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="text-foreground">{event.requestorEmail}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Onsite Contact */}
                  {(event.onsitePocName || event.onsitePocPhone || event.onsitePocEmail) && (
                    <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                      <h3 className="text-base font-semibold border-b border-border pb-2 mb-4">Onsite Contact (POC)</h3>
                      <div className="space-y-2">
                        {event.onsitePocName && (
                          <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                            <span className="text-muted-foreground">Name:</span>
                            <span className="text-foreground">{event.onsitePocName}</span>
                          </div>
                        )}
                        {event.onsitePocPhone && (
                          <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                            <span className="text-muted-foreground">Phone:</span>
                            <span className="text-foreground">{event.onsitePocPhone}</span>
                          </div>
                        )}
                        {event.onsitePocEmail && (
                          <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="text-foreground">{event.onsitePocEmail}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* === ROW 4: Pre-Event Instructions + Documents/Files === */}
              {(event.preEventInstructions || (event.eventDocuments && Array.isArray(event.eventDocuments) && event.eventDocuments.length > 0) || (event.fileLinks && Array.isArray(event.fileLinks) && event.fileLinks.length > 0)) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pre-Event Instructions */}
                  {event.preEventInstructions && (
                    <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                      <h3 className="text-base font-semibold border-b border-border pb-2 mb-4">Pre-Event Instructions</h3>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{event.preEventInstructions}</p>
                    </div>
                  )}

                  {/* Documents & Files Column */}
                  {((event.eventDocuments && Array.isArray(event.eventDocuments) && event.eventDocuments.length > 0) || (event.fileLinks && Array.isArray(event.fileLinks) && event.fileLinks.length > 0)) && (
                    <div className="space-y-6">
                      {/* Event Documents */}
                      {event.eventDocuments && Array.isArray(event.eventDocuments) && event.eventDocuments.length > 0 && (
                        <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                          <h3 className="text-base font-semibold border-b border-border pb-2 mb-4">Event Documents</h3>
                          <div className="space-y-2">
                            {event.eventDocuments.map((doc: any, index: number) => (
                              <a
                                key={index}
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
                              >
                                <span className="truncate">{doc.name}</span>
                                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                </svg>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* File Links */}
                      {event.fileLinks && Array.isArray(event.fileLinks) && event.fileLinks.length > 0 && (
                        <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                          <h3 className="text-base font-semibold border-b border-border pb-2 mb-4">Files</h3>
                          <div className="space-y-2">
                            {event.fileLinks.map((file: any, index: number) => (
                              <a
                                key={index}
                                href={file.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
                              >
                                <span className="truncate">{file.name}</span>
                                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                </svg>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* === ROW 5: Billing + Services & Products === */}
              {((event.estimate || event.taskRateType || event.commission || event.approveForOvertime) || ((event.callTimes && event.callTimes.length > 0) || (event.eventProducts && event.eventProducts.length > 0))) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Billing & Rate Settings */}
                  {(event.estimate || event.taskRateType || event.commission || event.approveForOvertime) && (
                    <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                      <h3 className="text-base font-semibold border-b border-border pb-2 mb-4">Billing & Rate Settings</h3>
                      <div className="space-y-3">
                        {event.estimate && (
                          <div className="flex items-center gap-2">
                            <Badge variant="warning" asSpan>Estimate</Badge>
                            <span className="text-sm text-muted-foreground">This is an estimate</span>
                          </div>
                        )}

                        {event.taskRateType && (
                          <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                            <span className="text-muted-foreground">Task Rate Type:</span>
                            <span className="text-foreground">{AMOUNT_TYPE_LABELS[event.taskRateType as AmountType]}</span>
                          </div>
                        )}

                        {event.commission && (
                          <div className="border-t border-border/30 pt-3 mt-3">
                            <p className="text-sm font-medium mb-2">Commission</p>
                            <div className="space-y-2 pl-3">
                              {event.commissionAmount != null && (
                                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                                  <span className="text-muted-foreground">Amount:</span>
                                  <span className="text-foreground">
                                    {event.commissionAmountType === 'FIXED' ? '$' : ''}
                                    {Number(event.commissionAmount).toFixed(2)}
                                    {event.commissionAmountType === 'MULTIPLIER' ? 'x' : ''}
                                  </span>
                                </div>
                              )}
                              {event.commissionAmountType && (
                                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                                  <span className="text-muted-foreground">Type:</span>
                                  <span className="text-foreground">{AMOUNT_TYPE_LABELS[event.commissionAmountType as AmountType]}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {event.approveForOvertime && (
                          <div className="border-t border-border/30 pt-3 mt-3">
                            <p className="text-sm font-medium mb-2">Overtime</p>
                            <div className="space-y-2 pl-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="success" asSpan>Approved</Badge>
                                <span className="text-sm text-muted-foreground">Approved for overtime</span>
                              </div>
                              {event.overtimeRate != null && (
                                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                                  <span className="text-muted-foreground">Rate:</span>
                                  <span className="text-foreground">
                                    {event.overtimeRateType === 'FIXED' ? '$' : ''}
                                    {Number(event.overtimeRate).toFixed(2)}
                                    {event.overtimeRateType === 'MULTIPLIER' ? 'x' : ''}
                                  </span>
                                </div>
                              )}
                              {event.overtimeRateType && (
                                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                                  <span className="text-muted-foreground">Type:</span>
                                  <span className="text-foreground">{AMOUNT_TYPE_LABELS[event.overtimeRateType as AmountType]}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Services & Products */}
                  {((event.callTimes && event.callTimes.length > 0) || (event.eventProducts && event.eventProducts.length > 0)) && (
                    <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
                      <h3 className="text-base font-semibold border-b border-border pb-2 mb-4">Services & Products</h3>
                      <div className="space-y-4">
                        {/* Services (from CallTimes) */}
                        {event.callTimes && event.callTimes.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <WrenchScrewdriverIcon className="h-4 w-4 text-muted-foreground" />
                              <p className="text-sm font-medium">Services ({event.callTimes.length})</p>
                            </div>
                            <div className="space-y-2">
                              {event.callTimes.map((ct: any) => {
                                const price = ct.billRate != null ? Number(ct.billRate) : (ct.service?.price != null ? Number(ct.service.price) : null);
                                const quantity = ct.numberOfStaffRequired;
                                const lineTotal = price != null ? price * quantity : null;
                                return (
                                  <div key={ct.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{ct.service?.title}</p>
                                      {ct.notes && (
                                        <p className="text-xs text-muted-foreground mt-1 italic">{ct.notes}</p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm">
                                        {quantity} x {price != null ? `$${price.toFixed(2)}` : '—'}
                                      </p>
                                      {lineTotal != null && (
                                        <p className="text-sm font-medium">${lineTotal.toFixed(2)}</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Products */}
                        {event.eventProducts && event.eventProducts.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <CubeIcon className="h-4 w-4 text-muted-foreground" />
                              <p className="text-sm font-medium">Products ({event.eventProducts.length})</p>
                            </div>
                            <div className="space-y-2">
                              {event.eventProducts.map((ep: any) => {
                                const price = ep.product?.price != null ? Number(ep.product.price) : null;
                                const lineTotal = price != null ? price * ep.quantity : null;
                                return (
                                  <div key={ep.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{ep.product?.title}</p>
                                      {ep.product?.priceUnitType && (
                                        <p className="text-xs text-muted-foreground">
                                          {PRICE_UNIT_TYPE_LABELS[ep.product.priceUnitType as PriceUnitType]}
                                        </p>
                                      )}
                                      {ep.notes && (
                                        <p className="text-xs text-muted-foreground mt-1 italic">{ep.notes}</p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm">
                                        {ep.quantity} x {price != null ? `$${price.toFixed(2)}` : '—'}
                                      </p>
                                      {lineTotal != null && (
                                        <p className="text-sm font-medium">${lineTotal.toFixed(2)}</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Grand Total */}
                        {(() => {
                          const servicesTotal = (event.callTimes || []).reduce((sum: number, ct: any) => {
                            const price = ct.billRate != null ? Number(ct.billRate) : (ct.service?.price != null ? Number(ct.service.price) : 0);
                            return sum + price * ct.numberOfStaffRequired;
                          }, 0);
                          const productsTotal = (event.eventProducts || []).reduce((sum: number, ep: any) => {
                            const price = ep.product?.price != null ? Number(ep.product.price) : 0;
                            return sum + price * ep.quantity;
                          }, 0);
                          const grandTotal = servicesTotal + productsTotal;

                          if (grandTotal > 0) {
                            return (
                              <div className="border-t border-border pt-3 mt-3 flex justify-end">
                                <div className="text-right">
                                  <p className="text-sm text-muted-foreground">Grand Total</p>
                                  <p className="text-lg font-bold">${grandTotal.toFixed(2)}</p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* === ROW 6: Internal Notes + Metadata === */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Internal Notes */}
                {event.privateComments && (
                  <div className="lg:col-span-2 bg-accent/5 border border-border/30 p-5 rounded-lg">
                    <h3 className="text-base font-semibold border-b border-border pb-2 mb-4">Internal Notes</h3>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{event.privateComments}</p>
                  </div>
                )}

                {/* Metadata */}
                <div className={`bg-muted/20 border border-border/30 p-4 rounded-lg ${!event.privateComments ? 'lg:col-span-3' : ''}`}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Metadata</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground mb-1">Created</p>
                      <p className="text-foreground font-medium">
                        {format(new Date(event.createdAt), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Last Updated</p>
                      <p className="text-foreground font-medium">
                        {format(new Date(event.updatedAt), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {event && !readOnly && (
            <Button
              variant="secondary"
              onClick={() => {
                onClose();
                router.push(`/events/${event.id}/call-times`);
              }}
            >
              <UsersIcon className="h-4 w-4 mr-2" />
              Manage Call Times
            </Button>
          )}
          {event && onEdit && !readOnly && (
            <Button onClick={handleEdit}>
              <EditIcon className="h-4 w-4 mr-2" />
              Edit {terminology.event.singular}
            </Button>
          )}
        </DialogFooter>
      </div>
    </Dialog>
  );
}

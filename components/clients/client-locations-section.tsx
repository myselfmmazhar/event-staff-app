'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { PlusIcon, EditIcon, TrashIcon, MapPinIcon, CloseIcon } from '@/components/ui/icons';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { trpc } from '@/lib/client/trpc';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ClientLocationSelect } from '@/lib/types/prisma-types';

const locationFormSchema = z.object({
  venueName: z.string().min(1, "Venue name is required").max(200).transform(val => val.trim()),
  meetingPoint: z.string().max(300).transform(val => val?.trim()).optional(),
  venueAddress: z.string().min(1, "Venue address is required").max(300).transform(val => val.trim()),
  city: z.string().min(1, "City is required").max(100).transform(val => val.trim()),
  state: z.string().min(1, "State is required").max(50).transform(val => val.trim()),
  zipCode: z.string().min(1, "ZIP code is required").max(20).transform(val => val.trim()),
});

type LocationFormData = z.infer<typeof locationFormSchema>;

interface ClientLocationsSectionProps {
  clientId: string;
  locations: ClientLocationSelect[];
  onLocationsChange: () => void;
  isReadOnly?: boolean;
}

export function ClientLocationsSection({
  clientId,
  locations: initialLocations,
  onLocationsChange,
  isReadOnly = false,
}: ClientLocationsSectionProps) {
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<ClientLocationSelect | null>(null);
  const [localLocations, setLocalLocations] = useState<ClientLocationSelect[]>(initialLocations);

  // Sync local state with props when they change
  useEffect(() => {
    setLocalLocations(initialLocations);
  }, [initialLocations]);

  const utils = trpc.useUtils();

  const createMutation = trpc.clientLocation.create.useMutation({
    onSuccess: (newLocation) => {
      setIsAddingLocation(false);
      reset();
      // Update local state immediately
      setLocalLocations(prev => [...prev, newLocation as ClientLocationSelect]);
      onLocationsChange();
      utils.clients.getById.invalidate({ id: clientId });
    },
  });

  const updateMutation = trpc.clientLocation.update.useMutation({
    onSuccess: (updatedLocation) => {
      setEditingLocationId(null);
      reset();
      // Update local state immediately
      setLocalLocations(prev =>
        prev.map(loc => loc.id === updatedLocation.id ? updatedLocation as ClientLocationSelect : loc)
      );
      onLocationsChange();
      utils.clients.getById.invalidate({ id: clientId });
    },
  });

  const deleteMutation = trpc.clientLocation.delete.useMutation({
    onSuccess: () => {
      // Update local state immediately
      if (locationToDelete) {
        setLocalLocations(prev => prev.filter(loc => loc.id !== locationToDelete.id));
      }
      setDeleteModalOpen(false);
      setLocationToDelete(null);
      onLocationsChange();
      utils.clients.getById.invalidate({ id: clientId });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      venueName: '',
      meetingPoint: '',
      venueAddress: '',
      city: '',
      state: '',
      zipCode: '',
    },
  });

  const handleAddNew = () => {
    reset({
      venueName: '',
      meetingPoint: '',
      venueAddress: '',
      city: '',
      state: '',
      zipCode: '',
    });
    setEditingLocationId(null);
    setIsAddingLocation(true);
  };

  const handleEdit = (location: ClientLocationSelect) => {
    setIsAddingLocation(false);
    setEditingLocationId(location.id);
    setValue('venueName', location.venueName);
    setValue('meetingPoint', location.meetingPoint || '');
    setValue('venueAddress', location.venueAddress);
    setValue('city', location.city);
    setValue('state', location.state);
    setValue('zipCode', location.zipCode);
  };

  const handleCancel = () => {
    setIsAddingLocation(false);
    setEditingLocationId(null);
    reset();
  };

  const handleDeleteClick = (location: ClientLocationSelect) => {
    setLocationToDelete(location);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (locationToDelete) {
      deleteMutation.mutate({ id: locationToDelete.id });
    }
  };

  const onSubmit = (data: LocationFormData) => {
    if (editingLocationId) {
      updateMutation.mutate({ id: editingLocationId, ...data });
    } else {
      createMutation.mutate({ clientId, ...data });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
        <h3 className="text-lg font-semibold">Saved Locations</h3>
        {!isReadOnly && !isAddingLocation && !editingLocationId && (
          <Button variant="outline" size="sm" onClick={handleAddNew}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Location
          </Button>
        )}
      </div>

      {/* Location Form */}
      {(isAddingLocation || editingLocationId) && !isReadOnly && (
        <Card className="p-4 mb-4 border-primary/20 bg-primary/5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">
                {editingLocationId ? 'Edit Location' : 'New Location'}
              </h4>
              <button
                type="button"
                onClick={handleCancel}
                className="text-muted-foreground hover:text-foreground"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="loc-venueName" required>Venue Name</Label>
                  <Input
                    id="loc-venueName"
                    {...register('venueName')}
                    error={!!errors.venueName}
                    disabled={isSubmitting}
                    placeholder="Venue name"
                  />
                  {errors.venueName && (
                    <p className="text-sm text-destructive mt-1">{errors.venueName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="loc-meetingPoint">Meeting Point</Label>
                  <Input
                    id="loc-meetingPoint"
                    {...register('meetingPoint')}
                    error={!!errors.meetingPoint}
                    disabled={isSubmitting}
                    placeholder="e.g., Main Entrance, Lobby"
                  />
                  {errors.meetingPoint && (
                    <p className="text-sm text-destructive mt-1">{errors.meetingPoint.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="loc-venueAddress" required>Venue Address</Label>
                <Input
                  id="loc-venueAddress"
                  {...register('venueAddress')}
                  error={!!errors.venueAddress}
                  disabled={isSubmitting}
                  placeholder="Street address"
                />
                {errors.venueAddress && (
                  <p className="text-sm text-destructive mt-1">{errors.venueAddress.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="loc-city" required>City</Label>
                  <Input
                    id="loc-city"
                    {...register('city')}
                    error={!!errors.city}
                    disabled={isSubmitting}
                    placeholder="City"
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="loc-state" required>State</Label>
                  <Input
                    id="loc-state"
                    {...register('state')}
                    error={!!errors.state}
                    disabled={isSubmitting}
                    placeholder="State"
                  />
                  {errors.state && (
                    <p className="text-sm text-destructive mt-1">{errors.state.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="loc-zipCode" required>ZIP Code</Label>
                  <Input
                    id="loc-zipCode"
                    {...register('zipCode')}
                    error={!!errors.zipCode}
                    disabled={isSubmitting}
                    placeholder="ZIP"
                  />
                  {errors.zipCode && (
                    <p className="text-sm text-destructive mt-1">{errors.zipCode.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="button" size="sm" disabled={isSubmitting} onClick={handleSubmit(onSubmit)}>
                  {isSubmitting ? 'Saving...' : editingLocationId ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Locations List */}
      {localLocations.length === 0 && !isAddingLocation ? (
        <p className="text-muted-foreground text-sm text-center py-4">
          No saved locations yet.
        </p>
      ) : (
        <div className="space-y-3">
          {localLocations.map((location) => (
            <Card
              key={location.id}
              className={`p-3 ${editingLocationId === location.id ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
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

                {!isReadOnly && !editingLocationId && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(location)}
                      disabled={deleteMutation.isPending}
                    >
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(location)}
                      disabled={deleteMutation.isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setLocationToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
        title="Delete Location"
        description={`Are you sure you want to delete "${locationToDelete?.venueName}"?`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

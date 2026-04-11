'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { PlusIcon, EditIcon, TrashIcon, MapPinIcon, CloseIcon } from '@/components/ui/icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const locationFormSchema = z.object({
  venueName: z.string().min(1, "Venue name is required").max(200).transform(val => val.trim()),
  meetingPoint: z.string().max(300).transform(val => val?.trim()).optional(),
  venueAddress: z.string().min(1, "Venue address is required").max(300).transform(val => val.trim()),
  city: z.string().min(1, "City is required").max(100).transform(val => val.trim()),
  state: z.string().min(1, "State is required").max(50).transform(val => val.trim()),
  zipCode: z.string().min(1, "ZIP code is required").max(20).transform(val => val.trim()),
});

type LocationFormData = z.infer<typeof locationFormSchema>;

export interface TemporaryLocation {
  tempId: string;
  venueName: string;
  meetingPoint?: string;
  venueAddress: string;
  city: string;
  state: string;
  zipCode: string;
}

interface TemporaryLocationsSectionProps {
  locations: TemporaryLocation[];
  onLocationsChange: (locations: TemporaryLocation[]) => void;
}

export function TemporaryLocationsSection({
  locations,
  onLocationsChange,
}: TemporaryLocationsSectionProps) {
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [editingTempId, setEditingTempId] = useState<string | null>(null);

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
    setEditingTempId(null);
    setIsAddingLocation(true);
  };

  const handleEdit = (location: TemporaryLocation) => {
    setIsAddingLocation(false);
    setEditingTempId(location.tempId);
    setValue('venueName', location.venueName);
    setValue('meetingPoint', location.meetingPoint || '');
    setValue('venueAddress', location.venueAddress);
    setValue('city', location.city);
    setValue('state', location.state);
    setValue('zipCode', location.zipCode);
  };

  const handleCancel = () => {
    setIsAddingLocation(false);
    setEditingTempId(null);
    reset();
  };

  const handleDelete = (tempId: string) => {
    const updatedLocations = locations.filter(loc => loc.tempId !== tempId);
    onLocationsChange(updatedLocations);
  };

  const onSubmit = (data: LocationFormData) => {
    if (editingTempId) {
      // Update existing
      const updatedLocations = locations.map(loc =>
        loc.tempId === editingTempId
          ? { ...loc, ...data }
          : loc
      );
      onLocationsChange(updatedLocations);
      setEditingTempId(null);
    } else {
      // Add new
      const newLocation: TemporaryLocation = {
        tempId: `temp-${Date.now()}`,
        ...data,
      };
      onLocationsChange([...locations, newLocation]);
      setIsAddingLocation(false);
    }
    reset();
  };

  return (
    <div className="bg-accent/5 border border-border/30 p-5 rounded-lg">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
        <h3 className="text-lg font-semibold">Saved Locations</h3>
        {!isAddingLocation && !editingTempId && (
          <Button variant="outline" size="sm" onClick={handleAddNew}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Location
          </Button>
        )}
      </div>

      {/* Location Form */}
      {(isAddingLocation || editingTempId) && (
        <Card className="p-4 mb-4 border-primary/20 bg-primary/5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">
                {editingTempId ? 'Edit Location' : 'New Location'}
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
                  <Label htmlFor="temp-venueName" required>Venue Name</Label>
                  <Input
                    id="temp-venueName"
                    {...register('venueName')}
                    error={!!errors.venueName}
                    placeholder="Venue name"
                  />
                  {errors.venueName && (
                    <p className="text-sm text-destructive mt-1">{errors.venueName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="temp-meetingPoint">Meeting Point</Label>
                  <Input
                    id="temp-meetingPoint"
                    {...register('meetingPoint')}
                    error={!!errors.meetingPoint}
                    placeholder="e.g., Main Entrance, Lobby"
                  />
                  {errors.meetingPoint && (
                    <p className="text-sm text-destructive mt-1">{errors.meetingPoint.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="temp-venueAddress" required>Venue Address</Label>
                <Input
                  id="temp-venueAddress"
                  {...register('venueAddress')}
                  error={!!errors.venueAddress}
                  placeholder="Street address"
                />
                {errors.venueAddress && (
                  <p className="text-sm text-destructive mt-1">{errors.venueAddress.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="temp-city" required>City</Label>
                  <Input
                    id="temp-city"
                    {...register('city')}
                    error={!!errors.city}
                    placeholder="City"
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="temp-state" required>State</Label>
                  <Input
                    id="temp-state"
                    {...register('state')}
                    error={!!errors.state}
                    placeholder="State"
                  />
                  {errors.state && (
                    <p className="text-sm text-destructive mt-1">{errors.state.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="temp-zipCode" required>ZIP Code</Label>
                  <Input
                    id="temp-zipCode"
                    {...register('zipCode')}
                    error={!!errors.zipCode}
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
                >
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={handleSubmit(onSubmit)}>
                  {editingTempId ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Locations List */}
      {locations.length === 0 && !isAddingLocation ? (
        <p className="text-muted-foreground text-sm text-center py-4">
          No saved locations yet. Locations will be created when you save the client.
        </p>
      ) : (
        <div className="space-y-3">
          {locations.map((location) => (
            <Card
              key={location.tempId}
              className={`p-3 ${editingTempId === location.tempId ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between">
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

                {!editingTempId && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(location)}
                    >
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(location.tempId)}
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
    </div>
  );
}

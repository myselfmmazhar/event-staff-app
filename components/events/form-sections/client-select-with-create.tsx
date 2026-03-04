'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Controller, Control } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select';
import { PlusIcon } from '@/components/ui/icons';
import { ClientFormModal, type CreateClientInputWithLocations } from '@/components/clients/client-form-modal';
import { trpc } from '@/lib/client/trpc';
import { toast } from '@/components/ui/use-toast';
import type { ClientOption, EventFormData } from './types';

interface ClientSelectWithCreateProps {
  control: Control<EventFormData>;
  clients: ClientOption[];
  disabled?: boolean;
  onClientCreated?: (clientId: string) => void;
}

export function ClientSelectWithCreate({
  control,
  clients,
  disabled = false,
  onClientCreated,
}: ClientSelectWithCreateProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const utils = trpc.useUtils();

  // Create portal container on mount to avoid SSR issues
  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  const createClientMutation = trpc.clients.create.useMutation({
    onSuccess: async (response) => {
      toast({ title: 'Client created successfully', type: 'success' });
      // Close the modal first
      setShowCreateModal(false);
      // Refetch client queries and wait for data before selecting
      await utils.clients.getAll.refetch();
      // Wait for React to re-render with new data before setting the value
      if (onClientCreated && response.client?.id) {
        requestAnimationFrame(() => {
          onClientCreated(response.client.id);
        });
      }
    },
    onError: (error) => {
      toast({ title: `Failed to create client: ${error.message}`, type: 'error' });
    },
  });

  const handleCreateClient = (data: CreateClientInputWithLocations | Record<string, unknown>) => {
    // Only handle create mode - data will be CreateClientInputWithLocations
    createClientMutation.mutate(data as CreateClientInputWithLocations);
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
  };

  return (
    <>
      <Controller
        name="clientId"
        control={control}
        render={({ field }) => (
          <Select
            value={field.value || 'none'}
            onValueChange={(val) => {
              if (val === '__create__') {
                handleOpenCreateModal();
              } else {
                field.onChange(val === 'none' ? null : val);
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger id="clientId">
              <SelectValue placeholder="Not applicable" />
            </SelectTrigger>
            <SelectContent>
              {/* Create Client Button */}
              <div
                className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleOpenCreateModal();
                }}
              >
                <PlusIcon className="h-4 w-4 mr-2 text-primary" />
                <span className="text-primary font-medium">Create Client</span>
              </div>
              <SelectSeparator />

              {/* Not applicable option */}
              <SelectItem value="none">Not applicable</SelectItem>

              {/* Client list */}
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.businessName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />

      {/* Create Client Modal - rendered via portal to avoid nested form issue */}
      {portalContainer && createPortal(
        <ClientFormModal
          client={null}
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateClient}
          isSubmitting={createClientMutation.isPending}
          resetKey={formResetKey}
        />,
        portalContainer
      )}
    </>
  );
}

'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { PlusIcon, TrashIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import type { TeamMembersSectionProps } from './types';

export function TeamMembersSection({
  teamMembers,
  newTeamMember,
  onTeamMembersChange,
  onNewTeamMemberChange,
  onAddTeamMember,
  onRemoveTeamMember,
  services,
  disabled = false,
  className,
}: TeamMembersSectionProps) {
  const serviceOptions = services.map((s) => ({ value: s.id, label: s.title }));

  const getServiceNames = (serviceIds: string[] | undefined) => {
    if (!serviceIds || serviceIds.length === 0) return 'None';
    return serviceIds
      .map((id) => services.find((s) => s.id === id)?.title)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className={cn('bg-accent/5 border border-border/30 p-5 rounded-lg', className)}>
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">
        Team Members
      </h3>
      <div className="space-y-4">
        {teamMembers.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-11 gap-2 text-sm font-medium text-muted-foreground px-2">
              <div className="col-span-2">Name</div>
              <div className="col-span-2">Email</div>
              <div className="col-span-2">Phone</div>
              <div className="col-span-5">Services</div>
            </div>
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="grid grid-cols-11 gap-2 items-center bg-background border rounded-md p-2"
              >
                <div className="col-span-2 flex gap-2 items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveTeamMember(index)}
                    disabled={disabled}
                    className="h-9 w-9 p-0 shrink-0"
                  >
                    <TrashIcon className="h-4 w-4 text-destructive" />
                  </Button>
                  <Input
                    value={`${member.firstName} ${member.lastName || ''}`.trim()}
                    disabled
                    className="h-9 flex-1"
                  />
                </div>
                <div className="col-span-2">
                  <Input value={member.email} disabled className="h-9" />
                </div>
                <div className="col-span-2">
                  <Input value={member.phone || ''} disabled className="h-9" />
                </div>
                <div className="col-span-5">
                  <Input
                    value={getServiceNames(member.serviceIds)}
                    disabled
                    className="h-9"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-4">
          <Label className="text-base font-semibold mb-3 block">Add New Team Member</Label>
          <div className="grid grid-cols-11 gap-2">
            <div className="col-span-2 flex gap-2">
              <div className="flex flex-col">
                <Label className="text-xs mb-1 invisible">Action</Label>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={onAddTeamMember}
                  disabled={disabled || !newTeamMember.firstName || !newTeamMember.email}
                  className="h-9 w-9 p-0 shrink-0"
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1">
                <Label htmlFor="newMemberFirstName" className="text-xs mb-1 block">
                  First Name *
                </Label>
                <Input
                  id="newMemberFirstName"
                  value={newTeamMember.firstName}
                  onChange={(e) =>
                    onNewTeamMemberChange({ ...newTeamMember, firstName: e.target.value })
                  }
                  placeholder="First name"
                  disabled={disabled}
                  className="h-9"
                />
              </div>
            </div>
            <div className="col-span-2">
              <Label htmlFor="newMemberEmail" className="text-xs mb-1 block">
                Email *
              </Label>
              <Input
                id="newMemberEmail"
                type="email"
                value={newTeamMember.email}
                onChange={(e) =>
                  onNewTeamMemberChange({ ...newTeamMember, email: e.target.value })
                }
                placeholder="email@example.com"
                disabled={disabled}
                className="h-9"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="newMemberPhone" className="text-xs mb-1 block">
                Phone
              </Label>
              <Input
                id="newMemberPhone"
                type="tel"
                value={newTeamMember.phone || ''}
                onChange={(e) =>
                  onNewTeamMemberChange({ ...newTeamMember, phone: e.target.value })
                }
                placeholder="(555) 123-4567"
                disabled={disabled}
                className="h-9"
              />
            </div>
            <div className="col-span-5">
              <Label htmlFor="newMemberServices" className="text-xs mb-1 block">
                Services
              </Label>
              <MultiSelect
                options={serviceOptions}
                value={newTeamMember.serviceIds || []}
                onChange={(ids) =>
                  onNewTeamMemberChange({ ...newTeamMember, serviceIds: ids })
                }
                placeholder="Select services"
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

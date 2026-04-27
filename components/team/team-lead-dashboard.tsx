'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/client/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArchiveIcon, BriefcaseIcon, LayoutGridIcon } from 'lucide-react';
import { AddTeamUnitModal } from './add-team-unit-modal';
import { TeamUnitsTable } from './team-units-table';

interface TeamLeadDashboardProps {
    firstName?: string;
    lastName?: string;
    teamEntityName?: string | null;
}

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    description: string;
    onClick: () => void;
}

function StatCard({ title, value, icon, description, onClick }: StatCardProps) {
    return (
        <Card
            className="bg-card border border-border shadow-none hover:shadow-sm cursor-pointer transition-shadow duration-150"
            onClick={onClick}
        >
            <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                        <div className="w-4 h-4">{icon}</div>
                    </div>
                </div>
                <h3 className="text-4xl font-bold text-foreground leading-none mb-1.5">{value}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}

type UnitFilter = 'ALL' | 'ACTIVE' | 'ARCHIVED';

export function TeamLeadDashboard({ firstName, lastName, teamEntityName }: TeamLeadDashboardProps) {
    const [addUnitOpen, setAddUnitOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState<UnitFilter>('ALL');
    const [showUnits, setShowUnits] = useState(false);

    function openUnits(filter: UnitFilter) {
        setActiveFilter(filter);
        setShowUnits(true);
    }

    const { data: rawUnits = [] } = trpc.teamUnit.getAll.useQuery();
    const { data: invitations } = trpc.callTime.getMyInvitations.useQuery({}, {
        refetchInterval: 30000,
        staleTime: 5000,
        refetchOnWindowFocus: true,
    });

    const units = rawUnits as Array<{ status: string }>;
    const activeCount = useMemo(() => units.filter(u => u.status === 'ACTIVE').length, [units]);
    const archivedCount = useMemo(() => units.filter(u => u.status === 'ARCHIVED').length, [units]);
    const openOffersCount = invitations?.pending?.length ?? 0;

    const teamName = teamEntityName ||
        ((firstName || lastName) ? `${firstName ?? ''} ${lastName ?? ''}`.trim() + ' Team' : 'My Team');

    return (
        <div className="space-y-6">
            {/* Header — Team Profile + Responsibility */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Left — Team Profile */}
                <div className="lg:col-span-3 bg-card border border-border rounded-xl p-6 flex flex-col gap-5">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{teamName}</h1>
                        <p className="text-sm text-muted-foreground mt-1.5">
                            This team profile is managed by the invited Team Lead. Units may represent trucks, crews, equipment, or other service-specific team resources.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            size="sm"
                            className="gap-1.5 text-sm"
                            onClick={() => setAddUnitOpen(true)}
                        >
                            + Add Team Unit
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-sm"
                            onClick={() => openUnits('ALL')}
                        >
                            View Units
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-sm"
                            onClick={() => openUnits('ARCHIVED')}
                        >
                            View History
                        </Button>
                    </div>
                </div>

                {/* Right — Team Lead Responsibility */}
                <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
                    <h2 className="text-base font-semibold text-foreground mb-2">Team Lead Responsibility</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        The company provides visibility and assignment access, but the Team Lead remains responsible for managing their team units.
                    </p>
                    <ul className="space-y-2">
                        {[
                            'Team Lead can add, edit, and archive units.',
                            'Units cannot be permanently deleted.',
                            'Archived units remain visible for historical activity.',
                            'Company may also add or update units on behalf of the Team Lead.',
                            'Payment is issued to the Team Lead, not directly to each unit.',
                        ].map((item) => (
                            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground shrink-0" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    title="Active Units"
                    value={activeCount}
                    icon={<LayoutGridIcon className="w-full h-full" />}
                    description="Currently active team units"
                    onClick={() => openUnits('ACTIVE')}
                />
                <StatCard
                    title="Archived Units"
                    value={archivedCount}
                    icon={<ArchiveIcon className="w-full h-full" />}
                    description="Inactive, kept for history"
                    onClick={() => openUnits('ARCHIVED')}
                />
                <StatCard
                    title="Open Offers"
                    value={openOffersCount}
                    icon={<BriefcaseIcon className="w-full h-full" />}
                    description="Pending invitations"
                    onClick={() => openUnits('ALL')}
                />
            </div>

            {/* Units Table */}
            {showUnits && (
                <div className="bg-card border border-border rounded-xl p-6">
                    <TeamUnitsTable key={activeFilter} defaultFilter={activeFilter} />
                </div>
            )}

            <AddTeamUnitModal
                open={addUnitOpen}
                onClose={() => setAddUnitOpen(false)}
                onSuccess={() => setAddUnitOpen(false)}
            />
        </div>
    );
}

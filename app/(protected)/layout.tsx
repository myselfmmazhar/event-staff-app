'use client';

import { useState } from 'react';
import { AuthGuard, StaffProfileGuard } from '@/components/guards';
import { useProfileCompletion } from '@/components/guards/staff-profile-guard';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ProfileCompletionModal } from '@/components/staff/profile-completion-modal';
import { OnboardingTour } from '@/components/onboarding/onboarding-tour';
import { trpc } from '@/lib/client/trpc';
import { UserRole } from '@prisma/client';

function ProtectedLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isProfileIncomplete, isLoading: staffProfileLoading } = useProfileCompletion();

  const { data: profile, isLoading: profileLoading } = trpc.profile.getMyProfile.useQuery();
  const hasSeenOnboarding = profile?.user_preferences?.hasSeenOnboarding === true;
  const isClient = (profile?.role as string) === 'CLIENT' || (profile?.role as any) === UserRole.CLIENT;
  // For staff: wait for the staff-profile query to settle so isProfileIncomplete is accurate,
  // then only show the tour after profile completion. For clients: show immediately on first login.
  const showOnboarding = !profileLoading && !staffProfileLoading && profile && !hasSeenOnboarding && (isClient || !isProfileIncomplete);

  // Block the layout while the staff-profile query is loading OR the profile is incomplete.
  // staffProfileLoading is only true when the user is staff (query is disabled for non-staff),
  // so using it here prevents a race window where content is accessible before the query resolves.
  const shouldBlockLayout = staffProfileLoading || isProfileIncomplete;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Blur effect when profile is incomplete or still loading */}
      {shouldBlockLayout && <div className="fixed inset-0 backdrop-blur-sm z-30" />}

      {/* Desktop Sidebar */}
      <div className={`hidden md:block ${shouldBlockLayout ? 'opacity-50 pointer-events-none' : ''}`}>
        <Sidebar />
      </div>

      {/* Mobile Sidebar (Drawer) */}
      <Sidebar
        isMobile
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className={`flex flex-1 flex-col overflow-hidden md:ml-64 ${shouldBlockLayout ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Header */}
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>

      {/* Profile Completion Modal Overlay */}
      <ProfileCompletionModal isOpen={isProfileIncomplete} />

      {/* Onboarding Tour Overlay */}
        <OnboardingTour 
          isClient={!!isClient} 
          isOpen={!!showOnboarding}
        />
    </div>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <StaffProfileGuard>
        <ProtectedLayoutContent>{children}</ProtectedLayoutContent>
      </StaffProfileGuard>
    </AuthGuard>
  );
}

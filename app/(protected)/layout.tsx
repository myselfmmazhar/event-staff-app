'use client';

import { useState } from 'react';
import { AuthGuard, StaffProfileGuard } from '@/components/guards';
import { useProfileCompletion } from '@/components/guards/staff-profile-guard';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ProfileCompletionModal } from '@/components/staff/profile-completion-modal';

function ProtectedLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isProfileIncomplete } = useProfileCompletion();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Blur effect when profile is incomplete */}
      {isProfileIncomplete && <div className="fixed inset-0 backdrop-blur-sm z-30" />}

      {/* Desktop Sidebar */}
      <div className={`hidden md:block ${isProfileIncomplete ? 'opacity-50 pointer-events-none' : ''}`}>
        <Sidebar />
      </div>

      {/* Mobile Sidebar (Drawer) */}
      <Sidebar
        isMobile
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className={`flex flex-1 flex-col overflow-hidden md:ml-64 ${isProfileIncomplete ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Header */}
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>

      {/* Profile Completion Modal Overlay */}
      <ProfileCompletionModal isOpen={isProfileIncomplete} />
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

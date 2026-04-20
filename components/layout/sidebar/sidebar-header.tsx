'use client';

import { CloseIcon } from '@/components/ui/icons';

interface SidebarHeaderProps {
  companyLogoUrl?: string | null;
  isMobile?: boolean;
  onClose?: () => void;
}

export function SidebarHeader({ companyLogoUrl, isMobile, onClose }: SidebarHeaderProps) {
  return (  <div className="flex h-16 items-center justify-between px-6">
  
      <div className="flex items-center gap-2">
        {companyLogoUrl ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden bg-white">
            <img
              src={companyLogoUrl}
              alt="Company Logo"
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
            <span className="text-sm font-bold text-[#196496]">
              T
            </span>
          </div>
        )}
        <span className="text-lg font-semibold text-white">
          Tripod
        </span>
      </div>
      {isMobile && (
        <button
          onClick={onClose}
          className="rounded-lg p-1 hover:bg-sidebar-hover transition-colors"
          aria-label="Close menu"
        >
          <CloseIcon className="h-5 w-5 text-white" />
        </button>
      )}
    </div>
  );
}

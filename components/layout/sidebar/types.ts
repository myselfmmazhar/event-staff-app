import type { FeatureFlags } from '@/lib/config/feature-flags';

export interface SubNavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  featureFlag?: keyof FeatureFlags;
  comingSoon?: boolean;
  subItems?: SubNavItem[];
}

export interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAdmin?: boolean;
  subItems?: SubNavItem[];
  featureFlag?: keyof FeatureFlags;
  staffOnly?: boolean;
  clientOnly?: boolean;
}

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

export interface NavItemProps {
  item: NavItem | SubNavItem;
  depth: number;
  parentPath: string;
  onMobileClose?: () => void;
  isMobile?: boolean;
}

export interface NavItemLinkProps {
  item: SubNavItem;
  depth: number;
  onMobileClose?: () => void;
  isMobile?: boolean;
}

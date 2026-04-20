'use client';

import { ChevronDownIcon, ChevronRightIcon, ClockIcon } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { getFeatureStatus } from '@/lib/config/feature-flags';
import { NavItemLink } from './nav-item-link';
import { useSidebarState } from './use-sidebar-state';
import type { NavItem as NavItemType, SubNavItem } from './types';

function ComingSoonIndicator() {
  return (
    <Badge
      variant="secondary"
      size="sm"
      asSpan
      className="px-1"
      title="Coming Soon"
      aria-label="Coming Soon"
    >
      <ClockIcon aria-hidden="true" className="h-3 w-3" />
    </Badge>
  );
}

const depthConfig = {
  0: {
    container: '',
    button: 'px-3 py-2.5 text-sm',
    icon: 'h-5 w-5',
    chevron: 'h-4 w-4',
    border: 'border-l-2 border-sidebar-border',
    indent: 'ml-4 pl-2',
  },
  1: {
    container: '',
    button: 'px-3 py-2 text-sm',
    icon: 'h-4 w-4',
    chevron: 'h-3 w-3',
    border: 'border-l border-sidebar-border',
    indent: 'ml-4 pl-2',
  },
  2: {
    container: '',
    button: 'px-3 py-1.5 text-xs',
    icon: 'h-3.5 w-3.5',
    chevron: 'h-3 w-3',
    border: 'border-l border-sidebar-border/60',
    indent: 'ml-4 pl-2',
  },
  3: {
    container: '',
    button: 'px-2 py-1 text-xs',
    icon: 'h-3 w-3',
    chevron: 'h-3 w-3',
    border: 'border-l border-sidebar-border/40',
    indent: 'ml-4 pl-2',
  },
} as const;

interface Props {
  item: NavItemType | SubNavItem;
  depth?: number;
  parentPath?: string;
  onMobileClose?: () => void;
  isMobile?: boolean;
  parentComingSoon?: boolean;
  sidebarState: ReturnType<typeof useSidebarState>;
}

export function NavItem({
  item,
  depth = 0,
  parentPath = '',
  onMobileClose,
  isMobile,
  parentComingSoon,
  sidebarState,
}: Props) {
  const { isActive, hasActiveChild, isExpanded, toggle } = sidebarState;
  const Icon = item.icon;
  const hasSubItems = item.subItems && item.subItems.length > 0;
  const itemPath = parentPath ? `${parentPath}.${item.label}` : item.label;
  const hasActiveChildFlag = hasActiveChild(item.subItems);
  const expanded = isExpanded(itemPath, hasActiveChildFlag);
  const config = depthConfig[Math.min(depth, 3) as keyof typeof depthConfig];

  // Leaf item (no sub-items) - use NavItemLink
  if (!hasSubItems) {
    return (
      <NavItemLink
        item={item as SubNavItem}
        depth={depth}
        isActive={item.href ? isActive(item.href) : false}
        onMobileClose={onMobileClose}
        isMobile={isMobile}
        parentComingSoon={parentComingSoon}
      />
    );
  }

  // Expandable item with sub-items
  const isParentComingSoon = (item as SubNavItem).comingSoon || parentComingSoon;
  const featureStatus = (item as SubNavItem).featureFlag
    ? getFeatureStatus((item as SubNavItem).featureFlag!)
    : 'enabled';
  const isDisabled = featureStatus === 'disabled';

  return (
    <div>
      <button
        onClick={() => toggle(itemPath, hasActiveChildFlag)}
        className={`
          flex w-full items-center gap-3 rounded-lg ${config.button} font-medium transition-all duration-200
          ${hasActiveChildFlag
            ? depth === 0
              ? 'bg-sidebar-active-bg text-sidebar-foreground'
              : 'bg-sidebar-active-bg/70 text-sidebar-foreground'
            : isParentComingSoon || isDisabled
              ? 'text-white opacity-60'
              : 'text-white hover:bg-sidebar-hover hover:text-sidebar-foreground'
          }
        `}
      >
        <Icon className={config.icon} />
        <span className="flex-1 text-left">{item.label}</span>
        {isParentComingSoon && <ComingSoonIndicator />}
        {expanded ? (
          <ChevronDownIcon className={config.chevron} />
        ) : (
          <ChevronRightIcon className={config.chevron} />
        )}
      </button>

      {expanded && item.subItems && (
        <div className={`${config.indent} mt-1 space-y-${depth >= 2 ? '0.5' : '1'} ${config.border}`}>
          {item.subItems.map((subItem) => (
            <NavItem
              key={subItem.label}
              item={subItem}
              depth={depth + 1}
              parentPath={itemPath}
              onMobileClose={onMobileClose}
              isMobile={isMobile}
              parentComingSoon={isParentComingSoon}
              sidebarState={sidebarState}
            />
          ))}
        </div>
      )}
    </div>
  );
}

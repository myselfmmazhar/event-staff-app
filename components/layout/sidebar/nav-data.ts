import {
  DashboardIcon,
  UsersIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  SettingsIcon,
  BellIcon,
  ClipboardListIcon,
  BuildingOfficeIcon,
  DocumentDuplicateIcon,
  UserGroupIcon,
  SquaresIcon,
  WrenchScrewdriverIcon,
  CubeIcon,
  MapPinIcon,
  TableCellsIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
} from '@/components/ui/icons';
import {
  getStaffRoute,
  getEventRoute,
  getTimesheetRoute,
} from '@/lib/utils/route-helpers';
import type { TerminologyConfig } from '@/lib/config/terminology';
import type { NavItem } from './types';

export function getNavItems(terminology: TerminologyConfig): NavItem[] {
  return [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: DashboardIcon,
      requiresAdmin: false,
      featureFlag: 'dashboard',
    },
    // Staff-only items
    {
      label: 'My Schedule',
      href: '/my-schedule',
      icon: CalendarIcon,
      requiresAdmin: false,
      staffOnly: true,
    },
    {
      label: 'My Profile',
      href: '/profile',
      icon: UserIcon,
      requiresAdmin: false,
      staffOnly: true,
    },
    // Client-only items
    {
      label: 'Dashboard',
      href: '/client-portal',
      icon: DashboardIcon,
      requiresAdmin: false,
      clientOnly: true,
    },
    {
      label: 'My Events',
      href: '/client-portal/my-events',
      icon: CalendarIcon,
      requiresAdmin: false,
      clientOnly: true,
    },
    {
      label: 'My Profile',
      href: '/profile',
      icon: UserIcon,
      requiresAdmin: false,
      clientOnly: true,
    },
    // Admin items - Task Pod Section
    {
      label: 'Task Pod',
      icon: ClipboardListIcon,
      requiresAdmin: false,
      subItems: [
        {
          label: `${terminology.event.singular} Manager`,
          href: getEventRoute(terminology),
          icon: CalendarIcon,
          featureFlag: 'events',
        },
        {
          label: 'Client Manager',
          href: '/clients',
          icon: BuildingOfficeIcon,
          featureFlag: 'clients',
        },
        {
          label: 'Assignment Manager',
          href: '/assignments',
          icon: ClipboardListIcon,
        },
      ],
    },
    // Talent Pod Section
    {
      label: 'Talent Pod',
      icon: UserGroupIcon,
      requiresAdmin: false,
      subItems: [
        {
          label: `${terminology.staff.singular} Manager`,
          href: getStaffRoute(terminology),
          icon: UsersIcon,
          featureFlag: 'staff',
        },
        {
          label: 'Catalog Manager',
          icon: SquaresIcon,
          subItems: [
            {
              label: 'Services',
              href: '/catalog/services',
              icon: WrenchScrewdriverIcon,
            },
            {
              label: 'Products',
              href: '/catalog/products',
              icon: CubeIcon,
            },
            {
              label: 'Locations',
              href: '/catalog/locations',
              icon: MapPinIcon,
              comingSoon: true,
            },
          ],
        },
      ],
    },
    // Time Pod Section
    {
      label: 'Time Pod',
      icon: ClockIcon,
      requiresAdmin: false,
      subItems: [
        {
          label: 'Time Manager',
          href: getTimesheetRoute(terminology),
          icon: TableCellsIcon,
        },
        {
          label: 'Finance Manager',
          icon: CurrencyDollarIcon,
          subItems: [
            // {
            //   label: 'Proposals',
            //   href: '/finance/proposals',
            //   icon: DocumentTextIcon,
            //   comingSoon: true,
            // },
            {
              label: 'Bills',
              href: '/bills',
              // href: '/finance/bills',
              icon: BanknotesIcon,
            },
            {
              label: 'Estimates',
              href: '/estimates',
              icon: DocumentTextIcon,
            },
            {
              label: 'Invoices',
              href: '/invoices',
              icon: DocumentTextIcon,
            },
          ],
        },
      ],
    },
    {
      label: 'Communication Manager',
      href: '/communication-manager?tab=email',
      icon: ChatBubbleLeftRightIcon,
      requiresAdmin: true,
    },
    // Settings Section (at bottom)
    {
      label: 'Settings',
      icon: SettingsIcon,
      requiresAdmin: true,
      subItems: [
        {
          label: 'Labels',
          href: '/settings/labels',
          icon: SettingsIcon,
        },
        {
          label: 'Templates',
          href: '/settings/templates',
          icon: DocumentDuplicateIcon,
        },
        {
          label: 'Notifications',
          href: '/settings/notifications',
          icon: BellIcon,
        },
        {
          label: 'Communication',
          href: '/settings/communication',
          icon: EnvelopeIcon,
        },
      ],
    },
  ];
}

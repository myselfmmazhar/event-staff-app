import {
  DashboardIcon,
  UsersIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  SettingsIcon,
  BellIcon,
  ClipboardListIcon,
  BuildingOfficeIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  UserGroupIcon,
  SquaresIcon,
  WrenchScrewdriverIcon,
  CubeIcon,
  MapPinIcon,
  TableCellsIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  BanknotesIcon,
} from '@/components/ui/icons';
import {
  getStaffRoute,
  getEventRoute,
  getEventCalendarRoute,
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
          icon: CalendarIcon,
          subItems: [
            {
              label: `${terminology.event.singular} Details`,
              href: getEventRoute(terminology),
              icon: EyeIcon,
              featureFlag: 'events',
            },
            {
              label: `Add ${terminology.event.singular}`,
              href: `${getEventRoute(terminology)}?create=true`,
              icon: PlusIcon,
              featureFlag: 'events',
            },
            {
              label: `${terminology.event.singular} Templates`,
              href: '/templates/events',
              icon: DocumentDuplicateIcon,
            },
          ],
        },
        {
          label: 'Client Manager',
          icon: BuildingOfficeIcon,
          subItems: [
            {
              label: 'Client Details',
              href: '/clients',
              icon: EyeIcon,
              featureFlag: 'clients',
            },
            {
              label: 'Add Client',
              href: '/clients?create=true',
              icon: PlusIcon,
              featureFlag: 'clients',
            },
          ],
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
          icon: UsersIcon,
          subItems: [
            {
              label: `${terminology.staff.singular} Details`,
              href: getStaffRoute(terminology),
              icon: EyeIcon,
              featureFlag: 'staff',
            },
            {
              label: `Add ${terminology.staff.singular}`,
              href: `${getStaffRoute(terminology)}?create=true`,
              icon: PlusIcon,
              featureFlag: 'staff',
            },
          ],
        },
        {
          label: 'Catalog Manager',
          icon: SquaresIcon,
          subItems: [
            {
              label: 'Services',
              icon: WrenchScrewdriverIcon,
              subItems: [
                {
                  label: 'Service Details',
                  href: '/catalog/services',
                  icon: EyeIcon,
                },
                {
                  label: 'Add Service',
                  href: '/catalog/services?create=true',
                  icon: PlusIcon,
                },
              ],
            },
            {
              label: 'Products',
              icon: CubeIcon,
              subItems: [
                {
                  label: 'Product Details',
                  href: '/catalog/products',
                  icon: EyeIcon,
                  comingSoon: true,
                },
                {
                  label: 'Add Product',
                  href: '/catalog/products?create=true',
                  icon: PlusIcon,
                  comingSoon: true,
                },
              ],
            },
            {
              label: 'Locations',
              icon: MapPinIcon,
              subItems: [
                {
                  label: 'Location Details',
                  href: '/catalog/locations',
                  icon: EyeIcon,
                  comingSoon: true,
                },
                {
                  label: 'Add Location',
                  href: '/catalog/locations?create=true',
                  icon: PlusIcon,
                  comingSoon: true,
                },
              ],
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
          icon: CalendarIcon,
          subItems: [
            {
              label: `${terminology.event.singular} Calendar`,
              href: getEventCalendarRoute(terminology),
              icon: CalendarIcon,
              featureFlag: 'events',
            },
            {
              label: 'Time Sheet',
              href: getTimesheetRoute(terminology),
              icon: TableCellsIcon,
            },
          ],
        },
        {
          label: 'Finance Manager',
          icon: CurrencyDollarIcon,
          subItems: [
            {
              label: 'Proposals',
              icon: DocumentTextIcon,
              subItems: [
                {
                  label: 'Proposal Details',
                  href: '/finance/proposals',
                  icon: EyeIcon,
                  comingSoon: true,
                },
                {
                  label: 'Add Proposal',
                  href: '/finance/proposals?create=true',
                  icon: PlusIcon,
                  comingSoon: true,
                },
              ],
            },
            {
              label: 'Invoices',
              icon: DocumentTextIcon,
              subItems: [
                {
                  label: 'Invoice Details',
                  href: '/finance/invoices',
                  icon: EyeIcon,
                  comingSoon: true,
                },
                {
                  label: 'Add Invoice',
                  href: '/finance/invoices?create=true',
                  icon: PlusIcon,
                  comingSoon: true,
                },
              ],
            },
            {
              label: 'Bills',
              icon: BanknotesIcon,
              subItems: [
                {
                  label: 'Bill Details',
                  href: '/finance/bills',
                  icon: EyeIcon,
                  comingSoon: true,
                },
                {
                  label: 'Add Bill',
                  href: '/finance/bills?create=true',
                  icon: PlusIcon,
                  comingSoon: true,
                },
              ],
            },
          ],
        },
      ],
    },
    // Settings Section (at bottom)
    {
      label: 'Settings',
      icon: SettingsIcon,
      requiresAdmin: true,
      subItems: [
        {
          label: 'Preferences',
          href: '/settings/preferences',
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
      ],
    },
  ];
}

'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRightIcon } from '@/components/ui/icons';
import { useTerminology } from '@/lib/hooks/use-terminology';

export function Breadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { terminology } = useTerminology();

  // Route to label mappings for breadcrumbs (matching sidebar structure)
  // Some labels are dynamic based on terminology
  const getRouteLabel = (segment: string): string => {
    const staticLabels: Record<string, string> = {
      // Main sections
      'dashboard': 'Dashboard',

      // Talent section - handled by getTalentPodHierarchy
      'positions': 'Positions',

      // Catalog section
      'services': 'Services',
      'products': 'Products',
      'locations': 'Locations',

      // Time Pod section
      'timesheet': 'Time Sheet',
      'calendar': 'Calendar',

      // Finance section (under Time Pod)
      'finance': 'Finance',
      'proposals': 'Proposals',
      'invoices': 'Invoices',
      'bills': 'Bills',

      // Profile section (user menu)
      'profile': 'Profile',
      'company': 'Company Profile',
      'team': 'Team',
      'reports': 'Reports',
      'billing': 'Billing',

      // Settings section
      'settings': 'Settings',
      'preferences': 'Preferences',
      'terminology': 'Terminology',
      'labels': 'Labels',
      'templates': 'Templates',
      'notifications': 'Notifications',

      // Other
      'my-schedule': 'My Schedule',
      'client-portal': 'Client Portal',
    };

    // Dynamic labels based on terminology
    if (segment === 'tasks' || segment === 'events') {
      return terminology.event.singular;
    }

    // Clients now shows as "Clients" instead of "Inventory"
    if (segment === 'clients') {
      return 'Clients';
    }

    return staticLabels[segment] || segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Check if segment matches the event route (dynamic based on terminology)
  const isEventRoute = (segment: string) => segment === terminology.event.route;

  // Check if segment matches the staff route (dynamic based on terminology)
  const isStaffRoute = (segment: string) => segment === terminology.staff.route;

  // Get the parent hierarchy for Task Pod routes
  const getTaskPodHierarchy = (segment: string, isCreate: boolean): Array<{ label: string; href?: string }> => {
    const hierarchy: Array<{ label: string; href?: string }> = [
      { label: 'Task Pod' }  // No link for top-level parent
    ];

    // Task Manager routes (dynamic based on terminology.event.route)
    if (isEventRoute(segment)) {
      hierarchy.push({ label: `${terminology.event.singular} Manager` });
      if (isCreate) {
        hierarchy.push({ label: `Add ${terminology.event.singular}` });
      } else {
        hierarchy.push({ label: 'Overview' });
      }
      return hierarchy;
    }

    // Client Manager routes
    if (segment === 'clients') {
      hierarchy.push({ label: 'Client Manager' });
      if (isCreate) {
        hierarchy.push({ label: 'Add Client' });
      } else {
        hierarchy.push({ label: 'Overview' });
      }
      return hierarchy;
    }

    return [];
  };

  // Get the parent hierarchy for Talent Pod routes
  const getTalentPodHierarchy = (segments: string[], isCreate: boolean): Array<{ label: string; href?: string }> => {
    const hierarchy: Array<{ label: string; href?: string }> = [
      { label: 'Talent Pod' }  // No link for top-level parent
    ];

    const firstSegment = segments[0];

    // Talent Manager routes (dynamic based on terminology.staff.route)
    if (firstSegment && isStaffRoute(firstSegment)) {
      hierarchy.push({ label: `${terminology.staff.singular} Manager` });
      if (isCreate) {
        hierarchy.push({ label: `Add ${terminology.staff.singular}` });
      } else {
        hierarchy.push({ label: 'Overview' });
      }
      return hierarchy;
    }

    // Catalog Manager routes
    if (firstSegment === 'catalog') {
      hierarchy.push({ label: 'Catalog Manager' });

      const secondSegment = segments[1];
      if (secondSegment === 'services') {
        hierarchy.push({ label: 'Services' });
        if (isCreate) {
          hierarchy.push({ label: 'Add Service' });
        } else {
          hierarchy.push({ label: 'Overview' });
        }
      } else if (secondSegment === 'products') {
        hierarchy.push({ label: 'Products' });
        if (isCreate) {
          hierarchy.push({ label: 'Add Product' });
        } else {
          hierarchy.push({ label: 'Overview' });
        }
      } else if (secondSegment === 'locations') {
        hierarchy.push({ label: 'Locations' });
        if (isCreate) {
          hierarchy.push({ label: 'Add Location' });
        } else {
          hierarchy.push({ label: 'Overview' });
        }
      }
      return hierarchy;
    }

    return [];
  };

  // Get the parent hierarchy for Time Pod routes
  const getTimePodHierarchy = (segments: string[], isCreate: boolean): Array<{ label: string; href?: string }> => {
    const hierarchy: Array<{ label: string; href?: string }> = [
      { label: 'Time Pod' }  // No link for top-level parent
    ];

    const firstSegment = segments[0];

    // Time Manager routes (dynamic based on terminology - tasks or events)
    if (firstSegment && isEventRoute(firstSegment)) {
      const secondSegment = segments[1];
      if (secondSegment === 'calendar') {
        hierarchy.push({ label: 'Time Manager' });
        hierarchy.push({ label: `${terminology.event.singular} Calendar` });
        return hierarchy;
      }
      if (secondSegment === 'timesheet') {
        hierarchy.push({ label: 'Time Manager' });
        hierarchy.push({ label: 'Time Sheet' });
        return hierarchy;
      }
    }

    // Finance Manager routes
    if (firstSegment === 'finance') {
      hierarchy.push({ label: 'Finance Manager' });

      const secondSegment = segments[1];
      if (secondSegment === 'proposals') {
        hierarchy.push({ label: 'Proposals' });
        if (isCreate) {
          hierarchy.push({ label: 'Add Proposal' });
        } else {
          hierarchy.push({ label: 'Overview' });
        }
      } else if (secondSegment === 'invoices') {
        hierarchy.push({ label: 'Invoices' });
        if (isCreate) {
          hierarchy.push({ label: 'Add Invoice' });
        } else {
          hierarchy.push({ label: 'Overview' });
        }
      } else if (secondSegment === 'bills') {
        hierarchy.push({ label: 'Bills' });
        if (isCreate) {
          hierarchy.push({ label: 'Add Bill' });
        } else {
          hierarchy.push({ label: 'Overview' });
        }
      }
      return hierarchy;
    }

    return [];
  };

  // Generate breadcrumb segments from pathname
  const generateBreadcrumbs = () => {
    if (!pathname || pathname === '/') return [];

    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: Array<{ label: string; href?: string }> = [];
    const isCreate = searchParams.get('create') === 'true';

    const firstSegment = segments[0];
    const secondSegment = segments[1];

    // Check Time Pod routes FIRST (calendar/timesheet under event route, and finance)
    // This must come before Task Pod check since both use event route
    if (firstSegment && isEventRoute(firstSegment) && (secondSegment === 'calendar' || secondSegment === 'timesheet')) {
      return getTimePodHierarchy(segments, isCreate);
    }

    // Finance Manager routes (under Time Pod)
    if (firstSegment === 'finance') {
      if (segments.length <= 2) {
        return getTimePodHierarchy(segments, isCreate);
      }
      // For deeper routes like /finance/proposals/123
      const hierarchy = getTimePodHierarchy(segments.slice(0, 2), false);
      hierarchy.pop(); // Remove "Overview"
      breadcrumbs.push(...hierarchy);

      let currentPath = `/${segments[0]}/${segments[1]}`;
      breadcrumbs.push({
        label: 'Overview',
        href: currentPath,
      });

      for (let i = 2; i < segments.length; i++) {
        const segment = segments[i]!;
        currentPath += `/${segment}`;
        breadcrumbs.push({
          label: getRouteLabel(segment),
          href: currentPath,
        });
      }
      return breadcrumbs;
    }

    // Check if this is a Task Pod route (events/tasks based on terminology, or clients)
    if (firstSegment && (isEventRoute(firstSegment) || firstSegment === 'clients')) {
      // For simple routes like /clients or /events, show full hierarchy
      if (segments.length === 1) {
        return getTaskPodHierarchy(firstSegment, isCreate);
      }

      // For nested routes like /events/123, show hierarchy plus the nested parts
      const hierarchy = getTaskPodHierarchy(firstSegment, false);
      // Remove the "Overview" since we're going deeper
      hierarchy.pop();
      breadcrumbs.push(...hierarchy);

      // Add the remaining segments
      let currentPath = '';
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]!;
        currentPath += `/${segment}`;

        if (i === 0) {
          // First segment is handled by hierarchy, add as link to overview
          breadcrumbs.push({
            label: 'Overview',
            href: currentPath,
          });
        } else {
          // Subsequent segments (like event ID)
          breadcrumbs.push({
            label: getRouteLabel(segment),
            href: currentPath,
          });
        }
      }
      return breadcrumbs;
    }

    // Check if this is a Talent Pod route (staff/talent based on terminology, or catalog)
    if (firstSegment && (isStaffRoute(firstSegment) || firstSegment === 'catalog')) {
      // For catalog routes, check if it's a simple route
      if (firstSegment === 'catalog') {
        if (segments.length <= 2) {
          return getTalentPodHierarchy(segments, isCreate);
        }
        // For deeper routes, show hierarchy plus nested parts
        const hierarchy = getTalentPodHierarchy(segments.slice(0, 2), false);
        hierarchy.pop(); // Remove "Overview"
        breadcrumbs.push(...hierarchy);

        let currentPath = `/${segments[0]}/${segments[1]}`;
        breadcrumbs.push({
          label: 'Overview',
          href: currentPath,
        });

        for (let i = 2; i < segments.length; i++) {
          const segment = segments[i]!;
          currentPath += `/${segment}`;
          breadcrumbs.push({
            label: getRouteLabel(segment),
            href: currentPath,
          });
        }
        return breadcrumbs;
      }

      // For staff/talent routes
      if (segments.length === 1) {
        return getTalentPodHierarchy(segments, isCreate);
      }

      // For nested routes like /staff/123
      const hierarchy = getTalentPodHierarchy(segments, false);
      hierarchy.pop(); // Remove "Overview"
      breadcrumbs.push(...hierarchy);

      let currentPath = '';
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]!;
        currentPath += `/${segment}`;

        if (i === 0) {
          breadcrumbs.push({
            label: 'Overview',
            href: currentPath,
          });
        } else {
          breadcrumbs.push({
            label: getRouteLabel(segment),
            href: currentPath,
          });
        }
      }
      return breadcrumbs;
    }

    // Profile routes - /profile is "My Profile", sub-routes show hierarchy
    if (firstSegment === 'profile') {
      // For /profile (My Profile page)
      if (segments.length === 1) {
        breadcrumbs.push({ label: 'My Profile', href: '/profile' });
        return breadcrumbs;
      }

      // For nested profile routes like /profile/company, /profile/team
      breadcrumbs.push({ label: 'My Profile', href: '/profile' });

      let currentPath = '/profile';
      for (let i = 1; i < segments.length; i++) {
        const segment = segments[i]!;
        currentPath += `/${segment}`;
        breadcrumbs.push({
          label: getRouteLabel(segment),
          href: currentPath,
        });
      }
      return breadcrumbs;
    }

    // Templates routes - show as child of the relevant section
    if (firstSegment === 'templates') {
      if (secondSegment === 'events') {
        // Event Templates: Task Pod > Event Manager > Templates
        breadcrumbs.push({ label: 'Task Pod' });
        breadcrumbs.push({
          label: `${terminology.event.singular} Manager`,
          href: `/${terminology.event.route}`
        });
        breadcrumbs.push({ label: 'Templates' });
        return breadcrumbs;
      }
      // Other template types can be added here
      return breadcrumbs;
    }

    // Settings routes - Settings label should not be clickable
    if (firstSegment === 'settings') {
      breadcrumbs.push({ label: 'Settings' }); // No href - not clickable

      // Add remaining segments with links
      let currentPath = '/settings';
      for (let i = 1; i < segments.length; i++) {
        const segment = segments[i]!;
        currentPath += `/${segment}`;
        breadcrumbs.push({
          label: getRouteLabel(segment),
          href: currentPath,
        });
      }
      return breadcrumbs;
    }

    // Default behavior for other routes
    let currentPath = '';
    for (const segment of segments) {
      currentPath += `/${segment}`;

      const label = getRouteLabel(segment);

      breadcrumbs.push({
        label,
        href: currentPath,
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-sm">
      {breadcrumbs.map((breadcrumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const hasLink = !!breadcrumb.href;

        return (
          <div key={breadcrumb.href || breadcrumb.label} className="flex items-center">
            {index > 0 && (
              <ChevronRightIcon className="mx-1 h-4 w-4 text-muted-foreground" />
            )}
            {isLast || !hasLink ? (
              <span className={isLast ? "font-medium text-foreground" : "text-muted-foreground"}>
                {breadcrumb.label}
              </span>
            ) : (
              <Link
                href={breadcrumb.href!}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {breadcrumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}


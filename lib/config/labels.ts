/**
 * Labels Configuration Module
 *
 * Centralized configuration for customizable UI labels throughout the application.
 * Labels are organized in two tiers:
 * 1. Global Labels - Shared across the entire app (actions, search, pagination, etc.)
 * 2. Page Labels - Page-specific labels (table headers, filters, page titles)
 */

import type { TerminologyConfig } from './terminology';

// ============================================================================
// GLOBAL LABELS - Shared across the entire application
// ============================================================================

export interface ActionLabels {
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  add: string;
  create: string;
  update: string;
  submit: string;
  confirm: string;
  close: string;
  back: string;
  next: string;
  done: string;
  apply: string;
  reset: string;
  refresh: string;
  export: string;
  import: string;
  download: string;
  upload: string;
  view: string;
  copy: string;
  duplicate: string;
  archive: string;
  restore: string;
  send: string;
  resend: string;
  invite: string;
}

export interface SearchLabels {
  placeholder: string;
  noResults: string;
  clearSearch: string;
  searchBy: string;
}

export interface FilterLabels {
  title: string;
  clearAll: string;
  apply: string;
  showAll: string;
  activeFilters: string;
  noFiltersApplied: string;
}

export interface TableLabels {
  actions: string;
  status: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  type: string;
  noData: string;
  loading: string;
  selectAll: string;
  selected: string;
  sortAsc: string;
  sortDesc: string;
}

export interface PaginationLabels {
  itemsPerPage: string;
  showing: string;
  of: string;
  results: string;
  page: string;
  previous: string;
  next: string;
  first: string;
  last: string;
  goToPage: string;
}

export interface CommonLabels {
  yes: string;
  no: string;
  all: string;
  none: string;
  select: string;
  selectAll: string;
  required: string;
  optional: string;
  view: string;
  details: string;
  more: string;
  less: string;
  enabled: string;
  disabled: string;
  on: string;
  off: string;
  loading: string;
  error: string;
  success: string;
  warning: string;
  info: string;
}

export interface StatusLabels {
  active: string;
  inactive: string;
  pending: string;
  disabled: string;
  draft: string;
  published: string;
  confirmed: string;
  inProgress: string;
  completed: string;
  cancelled: string;
  accepted: string;
  declined: string;
  waitlisted: string;
}

export interface FormLabels {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  streetAddress: string;
  aptSuiteUnit: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  description: string;
  notes: string;
  date: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface MessageLabels {
  saveSuccess: string;
  saveError: string;
  deleteSuccess: string;
  deleteError: string;
  updateSuccess: string;
  updateError: string;
  createSuccess: string;
  createError: string;
  loadError: string;
  confirmDelete: string;
  confirmAction: string;
  unsavedChanges: string;
  noChanges: string;
  invalidData: string;
  networkError: string;
  sessionExpired: string;
  unauthorized: string;
  notFound: string;
}

export interface GlobalLabels {
  actions: ActionLabels;
  search: SearchLabels;
  filters: FilterLabels;
  table: TableLabels;
  pagination: PaginationLabels;
  common: CommonLabels;
  status: StatusLabels;
  form: FormLabels;
  messages: MessageLabels;
}

// ============================================================================
// PAGE LABELS - Page-specific labels
// ============================================================================

export interface StaffPageLabels {
  pageTitle: string;
  pageSubtitle: string;
  addButton: string;
  searchPlaceholder: string;
  columns: {
    staffId: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    type: string;
    skillLevel: string;
    availability: string;
    positions: string;
    actions: string;
  };
  filters: {
    title: string;
    accountStatus: string;
    staffType: string;
    skillLevel: string;
    availability: string;
    position: string;
  };
  emptyState: string;
  emptyStateDescription: string;
}

export interface EventsPageLabels {
  pageTitle: string;
  pageSubtitle: string;
  addButton: string;
  searchPlaceholder: string;
  calendarView: string;
  columns: {
    eventId: string;
    title: string;
    client: string;
    venueName: string;
    startDate: string;
    endDate: string;
    status: string;
    staffCount: string;
    actions: string;
  };
  filters: {
    title: string;
    status: string;
    client: string;
    dateRange: string;
  };
  emptyState: string;
  emptyStateDescription: string;
}

export interface ClientsPageLabels {
  pageTitle: string;
  pageSubtitle: string;
  addButton: string;
  searchPlaceholder: string;
  columns: {
    clientId: string;
    businessName: string;
    contactName: string;
    email: string;
    phone: string;
    city: string;
    eventsCount: string;
    loginAccess: string;
    actions: string;
  };
  filters: {
    title: string;
    loginAccess: string;
    city: string;
  };
  emptyState: string;
  emptyStateDescription: string;
}

export interface UsersPageLabels {
  pageTitle: string;
  pageSubtitle: string;
  addButton: string;
  searchPlaceholder: string;
  columns: {
    name: string;
    email: string;
    role: string;
    status: string;
    lastLogin: string;
    actions: string;
  };
  filters: {
    role: string;
    status: string;
    emailVerified: string;
    hasPhone: string;
    createdDate: string;
  };
  emptyState: string;
  emptyStateDescription: string;
}

export interface DashboardPageLabels {
  welcome: string;
  quickStats: string;
  upcomingEvents: string;
  recentActivity: string;
  totalStaff: string;
  totalEvents: string;
  activeStaff: string;
  pendingInvitations: string;
  viewAll: string;
}

export interface MySchedulePageLabels {
  pageTitle: string;
  pageSubtitle: string;
  tabs: {
    pending: string;
    upcoming: string;
    history: string;
    declined: string;
  };
  emptyState: {
    pending: string;
    upcoming: string;
    history: string;
    declined: string;
  };
}

export interface SettingsPageLabels {
  pageTitle: string;
  terminology: {
    title: string;
    subtitle: string;
  };
  positions: {
    title: string;
    subtitle: string;
    addButton: string;
  };
  templates: {
    title: string;
    subtitle: string;
  };
  labels: {
    title: string;
    subtitle: string;
  };
}

export interface PageLabels {
  staff: StaffPageLabels;
  events: EventsPageLabels;
  clients: ClientsPageLabels;
  users: UsersPageLabels;
  dashboard: DashboardPageLabels;
  mySchedule: MySchedulePageLabels;
  settings: SettingsPageLabels;
}

// ============================================================================
// COMBINED LABELS CONFIG
// ============================================================================

export interface LabelsConfig {
  global: GlobalLabels;
  pages: PageLabels;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_GLOBAL_LABELS: GlobalLabels = {
  actions: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    create: 'Create',
    update: 'Update',
    submit: 'Submit',
    confirm: 'Confirm',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    apply: 'Apply',
    reset: 'Reset',
    refresh: 'Refresh',
    export: 'Export',
    import: 'Import',
    download: 'Download',
    upload: 'Upload',
    view: 'View',
    copy: 'Copy',
    duplicate: 'Duplicate',
    archive: 'Archive',
    restore: 'Restore',
    send: 'Send',
    resend: 'Resend',
    invite: 'Invite',
  },
  search: {
    placeholder: 'Search...',
    noResults: 'No results found',
    clearSearch: 'Clear search',
    searchBy: 'Search by',
  },
  filters: {
    title: 'Filters',
    clearAll: 'Clear All',
    apply: 'Apply Filters',
    showAll: 'All',
    activeFilters: 'Active Filters',
    noFiltersApplied: 'No filters applied',
  },
  table: {
    actions: 'Actions',
    status: 'Status',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    date: 'Date',
    type: 'Type',
    noData: 'No data found',
    loading: 'Loading...',
    selectAll: 'Select all',
    selected: 'selected',
    sortAsc: 'Sort ascending',
    sortDesc: 'Sort descending',
  },
  pagination: {
    itemsPerPage: 'Items per page:',
    showing: 'Showing',
    of: 'of',
    results: 'results',
    page: 'Page',
    previous: 'Previous',
    next: 'Next',
    first: 'First',
    last: 'Last',
    goToPage: 'Go to page',
  },
  common: {
    yes: 'Yes',
    no: 'No',
    all: 'All',
    none: 'None',
    select: 'Select',
    selectAll: 'Select All',
    required: 'Required',
    optional: 'Optional',
    view: 'View',
    details: 'Details',
    more: 'More',
    less: 'Less',
    enabled: 'Enabled',
    disabled: 'Disabled',
    on: 'On',
    off: 'Off',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Info',
  },
  status: {
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    disabled: 'Disabled',
    draft: 'Draft',
    published: 'Published',
    confirmed: 'Confirmed',
    inProgress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    accepted: 'Accepted',
    declined: 'Declined',
    waitlisted: 'Waitlisted',
  },
  form: {
    firstName: 'First Name',
    lastName: 'Last Name',
    fullName: 'Full Name',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    streetAddress: 'Street Address',
    aptSuiteUnit: 'Apt/Suite/Unit',
    city: 'City',
    state: 'State',
    zipCode: 'Zip Code',
    country: 'Country',
    description: 'Description',
    notes: 'Notes',
    date: 'Date',
    startDate: 'Start Date',
    endDate: 'End Date',
    startTime: 'Start Time',
    endTime: 'End Time',
    timezone: 'Timezone',
  },
  messages: {
    saveSuccess: 'Saved successfully',
    saveError: 'Failed to save',
    deleteSuccess: 'Deleted successfully',
    deleteError: 'Failed to delete',
    updateSuccess: 'Updated successfully',
    updateError: 'Failed to update',
    createSuccess: 'Created successfully',
    createError: 'Failed to create',
    loadError: 'Failed to load data',
    confirmDelete: 'Are you sure you want to delete this?',
    confirmAction: 'Are you sure you want to proceed?',
    unsavedChanges: 'You have unsaved changes',
    noChanges: 'No changes to save',
    invalidData: 'Please check the form for errors',
    networkError: 'Network error. Please try again.',
    sessionExpired: 'Your session has expired. Please log in again.',
    unauthorized: 'You do not have permission to perform this action',
    notFound: 'The requested resource was not found',
  },
};

// Page labels use terminology placeholders: {Staff}, {staff}, {StaffPlural}, {staffPlural}, etc.
export const DEFAULT_PAGE_LABELS: PageLabels = {
  staff: {
    pageTitle: '{StaffPlural}',
    pageSubtitle: 'Manage {staffPlural} and positions',
    addButton: 'Add {Staff}',
    searchPlaceholder: 'Search by name, email, phone, or {staff} ID...',
    columns: {
      staffId: '{Staff} ID',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      status: 'Status',
      type: 'Type',
      skillLevel: 'Experience',
      availability: 'Availability',
      positions: 'Positions',
      actions: 'Actions',
    },
    filters: {
      title: 'Filters',
      accountStatus: 'Account Status',
      staffType: '{Staff} Type',
      skillLevel: 'Skill Level',
      availability: 'Availability',
      position: 'Position',
    },
    emptyState: 'No {staffPlural} found',
    emptyStateDescription: 'Get started by adding your first {staff} member.',
  },
  events: {
    pageTitle: '{EventPlural}',
    pageSubtitle: 'Manage {eventPlural} and schedules',
    addButton: 'New {Event}',
    searchPlaceholder: 'Search by title, location, city, or {event} ID...',
    calendarView: 'Calendar View',
    columns: {
      eventId: '{Event} ID',
      title: 'Title',
      client: 'Client',
      venueName: 'Location',
      startDate: 'Start Date',
      endDate: 'End Date',
      status: 'Status',
      staffCount: '{Staff} Count',
      actions: 'Actions',
    },
    filters: {
      title: 'Filters',
      status: 'Status',
      client: 'Client',
      dateRange: 'Date Range',
    },
    emptyState: 'No {eventPlural} found',
    emptyStateDescription: 'Get started by creating your first {event}.',
  },
  clients: {
    pageTitle: 'Clients',
    pageSubtitle: 'Manage clients and their portal access',
    addButton: 'Create Client',
    searchPlaceholder: 'Search by business name, contact, or email...',
    columns: {
      clientId: 'Client ID',
      businessName: 'Business Name',
      contactName: 'Contact Name',
      email: 'Email',
      phone: 'Phone',
      city: 'City',
      eventsCount: '{EventPlural}',
      loginAccess: 'Portal Access',
      actions: 'Actions',
    },
    filters: {
      title: 'Filters',
      loginAccess: 'Portal Access',
      city: 'City',
    },
    emptyState: 'No clients found',
    emptyStateDescription: 'Get started by adding your first client.',
  },
  users: {
    pageTitle: 'Users',
    pageSubtitle: 'Manage user accounts and permissions',
    addButton: 'Add User',
    searchPlaceholder: 'Search by name or email...',
    columns: {
      name: 'Name',
      email: 'Email',
      role: '{Role}',
      status: 'Status',
      lastLogin: 'Last Login',
      actions: 'Actions',
    },
    filters: {
      role: '{Role}',
      status: 'Status',
      emailVerified: 'Email Status',
      hasPhone: 'Phone Status',
      createdDate: 'Created Date',
    },
    emptyState: 'No users found',
    emptyStateDescription: 'Get started by adding your first user.',
  },
  dashboard: {
    welcome: 'Welcome',
    quickStats: 'Quick Stats',
    upcomingEvents: 'Upcoming {EventPlural}',
    recentActivity: 'Recent Activity',
    totalStaff: 'Total {StaffPlural}',
    totalEvents: 'Total {EventPlural}',
    activeStaff: 'Active {StaffPlural}',
    pendingInvitations: 'Pending Invitations',
    viewAll: 'View All',
  },
  mySchedule: {
    pageTitle: 'My Schedule',
    pageSubtitle: 'View and respond to your {event} invitations',
    tabs: {
      pending: 'Pending',
      upcoming: 'Upcoming',
      history: 'History',
      declined: 'Declined',
    },
    emptyState: {
      pending: 'No pending invitations',
      upcoming: 'No upcoming {eventPlural}',
      history: 'No past {eventPlural}',
      declined: 'No declined invitations',
    },
  },
  settings: {
    pageTitle: 'Settings',
    terminology: {
      title: 'Terminology',
      subtitle: 'Customize the terms used throughout the application',
    },
    positions: {
      title: 'Positions',
      subtitle: 'Manage {staff} positions',
      addButton: 'Add Position',
    },
    templates: {
      title: 'Templates',
      subtitle: 'Manage email and SMS templates',
    },
    labels: {
      title: 'Labels',
      subtitle: 'Customize UI labels throughout the application',
    },
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Deep merge two objects, with source values overwriting target values
 */
export function deepMerge<T extends object>(
  target: T,
  source: Partial<T>
): T {
  const output = { ...target } as T;

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    if (sourceValue !== undefined) {
      if (
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof target[key] === 'object' &&
        target[key] !== null
      ) {
        output[key] = deepMerge(
          target[key] as Record<string, unknown>,
          sourceValue as Partial<Record<string, unknown>>
        ) as unknown as T[keyof T];
      } else {
        output[key] = sourceValue as T[keyof T];
      }
    }
  }

  return output;
}

/**
 * Get a nested value from an object using a dot-separated path
 */
export function getNestedValue<T>(
  obj: Record<string, unknown>,
  path: string
): T | undefined {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current as T;
}

/**
 * Set a nested value in an object using a dot-separated path
 */
export function setNestedValue<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown
): T {
  const parts = path.split('.');
  const result = { ...obj };
  let current: Record<string, unknown> = result;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current[part] = { ...(current[part] as Record<string, unknown>) };
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  if (lastPart !== undefined) {
    current[lastPart] = value;
  }
  return result;
}

/**
 * Interpolate terminology placeholders in a label string
 * Placeholders: {Staff}, {staff}, {StaffPlural}, {staffPlural}, etc.
 */
export function interpolateLabel(
  label: string,
  terminology: TerminologyConfig
): string {
  return label
    // Staff term
    .replace(/{Staff}/g, terminology.staff.singular)
    .replace(/{staff}/g, terminology.staff.lower)
    .replace(/{StaffPlural}/g, terminology.staff.plural)
    .replace(/{staffPlural}/g, terminology.staff.lowerPlural)
    .replace(/{STAFF}/g, terminology.staff.upper)
    .replace(/{STAFFPLURAL}/g, terminology.staff.upperPlural)
    // Event term
    .replace(/{Event}/g, terminology.event.singular)
    .replace(/{event}/g, terminology.event.lower)
    .replace(/{EventPlural}/g, terminology.event.plural)
    .replace(/{eventPlural}/g, terminology.event.lowerPlural)
    .replace(/{EVENT}/g, terminology.event.upper)
    .replace(/{EVENTPLURAL}/g, terminology.event.upperPlural)
    // Role term
    .replace(/{Role}/g, terminology.role.singular)
    .replace(/{role}/g, terminology.role.lower)
    .replace(/{RolePlural}/g, terminology.role.plural)
    .replace(/{rolePlural}/g, terminology.role.lowerPlural)
    .replace(/{ROLE}/g, terminology.role.upper)
    .replace(/{ROLEPLURAL}/g, terminology.role.upperPlural);
}

/**
 * Get default labels config
 */
export function getDefaultLabels(): LabelsConfig {
  return {
    global: DEFAULT_GLOBAL_LABELS,
    pages: DEFAULT_PAGE_LABELS,
  };
}

function normalizeDotNotation(obj: Record<string, unknown>): Record<string, unknown> {
  let result: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(obj)) {
    const value =
      rawValue &&
        typeof rawValue === 'object' &&
        !Array.isArray(rawValue)
        ? normalizeDotNotation(rawValue as Record<string, unknown>)
        : rawValue;

    if (key.includes('.')) {
      result = setNestedValue(result, key, value);
      continue;
    }

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
      continue;
    }

    result[key] = value;
  }

  return result;
}

/**
 * Build labels config from database data, merging with defaults
 */
export function buildLabelsConfig(data: {
  globalLabels?: Record<string, unknown>;
  pageLabels?: Record<string, unknown>;
}): LabelsConfig {
  const normalizedPageLabels = normalizeDotNotation(data.pageLabels || {});

  return {
    global: deepMerge<GlobalLabels>(
      DEFAULT_GLOBAL_LABELS,
      (data.globalLabels || {}) as unknown as Partial<GlobalLabels>
    ),
    pages: deepMerge<PageLabels>(
      DEFAULT_PAGE_LABELS,
      normalizedPageLabels as unknown as Partial<PageLabels>
    ),
  };
}

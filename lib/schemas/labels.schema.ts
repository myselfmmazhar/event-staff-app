import { z } from 'zod';

/**
 * Label string validation
 * - Min 1 character, Max 100 characters
 * - Cannot be only whitespace
 */
const labelString = z
  .string()
  .min(1, 'Label cannot be empty')
  .max(100, 'Label must be 100 characters or less')
  .transform((val) => val.trim())
  .refine((val) => val.length >= 1, {
    message: 'Label cannot be only whitespace',
  });

/**
 * Optional label string (for partial updates)
 */
const optionalLabelString = labelString.optional();

// ============================================================================
// GLOBAL LABELS SCHEMAS
// ============================================================================

export const actionLabelsSchema = z
  .object({
    save: optionalLabelString,
    cancel: optionalLabelString,
    delete: optionalLabelString,
    edit: optionalLabelString,
    add: optionalLabelString,
    create: optionalLabelString,
    update: optionalLabelString,
    submit: optionalLabelString,
    confirm: optionalLabelString,
    close: optionalLabelString,
    back: optionalLabelString,
    next: optionalLabelString,
    done: optionalLabelString,
    apply: optionalLabelString,
    reset: optionalLabelString,
    refresh: optionalLabelString,
    export: optionalLabelString,
    import: optionalLabelString,
    download: optionalLabelString,
    upload: optionalLabelString,
    view: optionalLabelString,
    copy: optionalLabelString,
    duplicate: optionalLabelString,
    archive: optionalLabelString,
    restore: optionalLabelString,
    send: optionalLabelString,
    resend: optionalLabelString,
    invite: optionalLabelString,
  })
  .partial();

export const searchLabelsSchema = z
  .object({
    placeholder: optionalLabelString,
    noResults: optionalLabelString,
    clearSearch: optionalLabelString,
    searchBy: optionalLabelString,
  })
  .partial();

export const filterLabelsSchema = z
  .object({
    title: optionalLabelString,
    clearAll: optionalLabelString,
    apply: optionalLabelString,
    showAll: optionalLabelString,
    activeFilters: optionalLabelString,
    noFiltersApplied: optionalLabelString,
  })
  .partial();

export const tableLabelsSchema = z
  .object({
    actions: optionalLabelString,
    status: optionalLabelString,
    name: optionalLabelString,
    email: optionalLabelString,
    phone: optionalLabelString,
    date: optionalLabelString,
    type: optionalLabelString,
    noData: optionalLabelString,
    loading: optionalLabelString,
    selectAll: optionalLabelString,
    selected: optionalLabelString,
    sortAsc: optionalLabelString,
    sortDesc: optionalLabelString,
  })
  .partial();

export const paginationLabelsSchema = z
  .object({
    itemsPerPage: optionalLabelString,
    showing: optionalLabelString,
    of: optionalLabelString,
    results: optionalLabelString,
    page: optionalLabelString,
    previous: optionalLabelString,
    next: optionalLabelString,
    first: optionalLabelString,
    last: optionalLabelString,
    goToPage: optionalLabelString,
  })
  .partial();

export const commonLabelsSchema = z
  .object({
    yes: optionalLabelString,
    no: optionalLabelString,
    all: optionalLabelString,
    none: optionalLabelString,
    select: optionalLabelString,
    selectAll: optionalLabelString,
    required: optionalLabelString,
    optional: optionalLabelString,
    view: optionalLabelString,
    details: optionalLabelString,
    more: optionalLabelString,
    less: optionalLabelString,
    enabled: optionalLabelString,
    disabled: optionalLabelString,
    on: optionalLabelString,
    off: optionalLabelString,
    loading: optionalLabelString,
    error: optionalLabelString,
    success: optionalLabelString,
    warning: optionalLabelString,
    info: optionalLabelString,
  })
  .partial();

export const statusLabelsSchema = z
  .object({
    active: optionalLabelString,
    inactive: optionalLabelString,
    pending: optionalLabelString,
    disabled: optionalLabelString,
    draft: optionalLabelString,
    published: optionalLabelString,
    confirmed: optionalLabelString,
    inProgress: optionalLabelString,
    completed: optionalLabelString,
    cancelled: optionalLabelString,
    accepted: optionalLabelString,
    declined: optionalLabelString,
    waitlisted: optionalLabelString,
  })
  .partial();

export const formLabelsSchema = z
  .object({
    firstName: optionalLabelString,
    lastName: optionalLabelString,
    fullName: optionalLabelString,
    email: optionalLabelString,
    phone: optionalLabelString,
    address: optionalLabelString,
    streetAddress: optionalLabelString,
    aptSuiteUnit: optionalLabelString,
    city: optionalLabelString,
    state: optionalLabelString,
    zipCode: optionalLabelString,
    country: optionalLabelString,
    description: optionalLabelString,
    notes: optionalLabelString,
    date: optionalLabelString,
    startDate: optionalLabelString,
    endDate: optionalLabelString,
    startTime: optionalLabelString,
    endTime: optionalLabelString,
    timezone: optionalLabelString,
    customField1: optionalLabelString,
    customField2: optionalLabelString,
    customField3: optionalLabelString,
  })
  .partial();

export const messageLabelsSchema = z
  .object({
    saveSuccess: optionalLabelString,
    saveError: optionalLabelString,
    deleteSuccess: optionalLabelString,
    deleteError: optionalLabelString,
    updateSuccess: optionalLabelString,
    updateError: optionalLabelString,
    createSuccess: optionalLabelString,
    createError: optionalLabelString,
    loadError: optionalLabelString,
    confirmDelete: optionalLabelString,
    confirmAction: optionalLabelString,
    unsavedChanges: optionalLabelString,
    noChanges: optionalLabelString,
    invalidData: optionalLabelString,
    networkError: optionalLabelString,
    sessionExpired: optionalLabelString,
    unauthorized: optionalLabelString,
    notFound: optionalLabelString,
  })
  .partial();

export const staffCustomFieldsSchema = z
  .object({
    customField1: optionalLabelString,
    customField2: optionalLabelString,
    customField3: optionalLabelString,
  })
  .partial();

/**
 * Update Global Labels Schema
 */
export const updateGlobalLabelsSchema = z
  .object({
    actions: actionLabelsSchema.optional(),
    search: searchLabelsSchema.optional(),
    filters: filterLabelsSchema.optional(),
    table: tableLabelsSchema.optional(),
    pagination: paginationLabelsSchema.optional(),
    common: commonLabelsSchema.optional(),
    status: statusLabelsSchema.optional(),
    form: formLabelsSchema.optional(),
    staffCustomFields: staffCustomFieldsSchema.optional(),
    messages: messageLabelsSchema.optional(),
  })
  .partial();

export type UpdateGlobalLabelsInput = z.infer<typeof updateGlobalLabelsSchema>;

// ============================================================================
// PAGE LABELS SCHEMAS
// ============================================================================

/**
 * Page identifier enum
 */
export const pageIdentifierSchema = z.enum([
  'staff',
  'cleanup-roster',
  'events',
  'clients',
  'users',
  'dashboard',
  'mySchedule',
  'settings',
]);

export type PageIdentifier = z.infer<typeof pageIdentifierSchema>;

/**
 * Update Page Labels Schema
 * Used for updating labels for a specific page
 */
export const updatePageLabelsSchema = z.object({
  page: pageIdentifierSchema,
  labels: z.record(z.string(), z.unknown()),
});

export type UpdatePageLabelsInput = z.infer<typeof updatePageLabelsSchema>;

/**
 * Reset Labels Schema
 */
export const resetLabelsSchema = z.object({
  scope: z.enum(['all', 'global', 'page']),
  page: pageIdentifierSchema.optional(),
});

export type ResetLabelsInput = z.infer<typeof resetLabelsSchema>;

/**
 * Get Labels Schema (optional page filter)
 */
export const getLabelsSchema = z
  .object({
    page: pageIdentifierSchema.optional(),
  })
  .optional();

export type GetLabelsInput = z.infer<typeof getLabelsSchema>;

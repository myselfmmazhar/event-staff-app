'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CloseIcon } from '@/components/ui/icons';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RequirementTemplateCardGrid } from '@/components/common/requirement-template-card-grid';
import {
  REQ_TEMPLATE_CARDS,
  isTalentSubmissionTemplateId,
  type ReqTemplateId,
} from '@/lib/requirement-templates';
import { trpc } from '@/lib/client/trpc';
import { cn } from '@/lib/utils';

/** Mirrors Prisma `CatalogRequirementExpiration` — defined here so the wizard stays client-safe (no `@prisma/client` in the bundle). */
const CATALOG_REQUIREMENT_EXPIRATION = [
  'NEVER',
  'CUSTOM_DATE',
  'PER_TALENT',
] as const;

type CatalogRequirementExpirationValue = (typeof CATALOG_REQUIREMENT_EXPIRATION)[number];

const expirationTypeSchema = z.enum(CATALOG_REQUIREMENT_EXPIRATION);

const settingsSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(200).transform((v) => v.trim()),
    instructions: z
      .string()
      .max(5000)
      .optional()
      .transform((v) => (v?.trim() ? v.trim() : undefined)),
    allowPdf: z.boolean(),
    allowImage: z.boolean(),
    allowOther: z.boolean(),
    expirationType: expirationTypeSchema,
    expirationDate: z.string().optional(),
    allowEarlyRenewal: z.boolean(),
    requiresApproval: z.boolean(),
    isTalentRequired: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.expirationType === 'CUSTOM_DATE' && !data.expirationDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select an expiration date',
        path: ['expirationDate'],
      });
    }
  });

type SettingsFormInput = z.input<typeof settingsSchema>;
type SettingsFormOutput = z.infer<typeof settingsSchema>;

type TemplateTab = 'all' | 'standard' | 'smart';

export interface CreateRequirementWizardModalProps {
  open: boolean;
  onClose: () => void;
  /** When set, the wizard opens in edit mode for this collection. */
  editCategory?: { id: string; name: string; description: string | null } | null;
  onSaved?: () => void;
}

function templateTabFilter(tab: TemplateTab): readonly ReqTemplateId[] | undefined {
  if (tab === 'all') return undefined;
  const badge = tab === 'standard' ? 'Standard' : 'Smart';
  return REQ_TEMPLATE_CARDS.filter((c) => c.badge === badge).map((c) => c.id);
}

const defaultSettings = (): SettingsFormInput => ({
  name: '',
  instructions: undefined,
  allowPdf: true,
  allowImage: true,
  allowOther: false,
  expirationType: 'NEVER',
  expirationDate: undefined,
  allowEarlyRenewal: false,
  requiresApproval: false,
  isTalentRequired: false,
});

const WIZARD_STEPS = [1, 2, 3] as const;
type WizardStep = 1 | 2 | 3;

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Collection',
  2: 'Info & Settings',
  3: 'Preview',
};

export function CreateRequirementWizardModal({
  open,
  onClose,
  editCategory = null,
  onSaved,
}: CreateRequirementWizardModalProps) {
  const isEditMode = !!editCategory;

  const [step, setStep] = useState<WizardStep>(1);
  const [templateTab, setTemplateTab] = useState<TemplateTab>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ReqTemplateId | null>(null);
  const [editingRequirementId, setEditingRequirementId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryDescription, setCategoryDescription] = useState<string>('');
  const [preview, setPreview] = useState<SettingsFormOutput | null>(null);
  const saveActionRef = useRef<'close' | 'new'>('close');
  const utils = trpc.useUtils();

  // Existing requirements for the editing collection — used to mark templates as editable
  // and to load settings when the user clicks one to edit.
  const { data: existingRequirements } = trpc.catalogRequirement.getAll.useQuery(
    { serviceCategoryId: editCategory?.id ?? '', limit: 100 },
    { enabled: open && isEditMode && !!editCategory?.id }
  );

  const requirementByTemplate = useMemo(() => {
    const map = new Map<ReqTemplateId, string>();
    for (const req of existingRequirements?.data ?? []) {
      if (req.templateId) map.set(req.templateId as ReqTemplateId, req.id);
    }
    return map;
  }, [existingRequirements]);

  const editableTemplateIds = useMemo(
    () => new Set<ReqTemplateId>(requirementByTemplate.keys()),
    [requirementByTemplate]
  );

  // Fetch full settings for the requirement being edited
  const { data: editingRequirementDetails } = trpc.catalogRequirement.getById.useQuery(
    { id: editingRequirementId ?? '' },
    { enabled: !!editingRequirementId }
  );

  const createRequirementMutation = trpc.catalogRequirement.create.useMutation();
  const updateRequirementMutation = trpc.catalogRequirement.update.useMutation();
  const categoryCreateMutation = trpc.category.create.useMutation();
  const categoryUpdateMutation = trpc.category.update.useMutation();

  const visibleTemplateIds = useMemo(() => templateTabFilter(templateTab), [templateTab]);

  const isUploadTemplate = selectedTemplate === 'upload';
  const isEditingExistingRequirement = !!editingRequirementId;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<SettingsFormInput, unknown, SettingsFormOutput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: defaultSettings(),
  });

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setTemplateTab('all');
    setSelectedTemplate(null);
    setEditingRequirementId(null);
    setCategoryName(editCategory?.name ?? '');
    setCategoryDescription(editCategory?.description ?? '');
    setPreview(null);
    reset(defaultSettings());
    clearErrors();
  }, [open, editCategory?.id, editCategory?.name, editCategory?.description, reset, clearErrors]);

  // In edit mode, once existing requirements load, auto-select the first one's template card.
  useEffect(() => {
    if (!open || !isEditMode || selectedTemplate) return;
    const first = existingRequirements?.data?.[0];
    if (!first) return;
    setSelectedTemplate(first.templateId as ReqTemplateId);
    setEditingRequirementId(first.id);
  }, [open, isEditMode, existingRequirements, selectedTemplate]);

  const handleClose = () => {
    createRequirementMutation.reset();
    updateRequirementMutation.reset();
    categoryCreateMutation.reset();
    categoryUpdateMutation.reset();
    onClose();
  };

  const canContinueStep1 = !!categoryName.trim() && !!selectedTemplate;

  const handleTemplateSelect = (templateId: ReqTemplateId | null) => {
    setSelectedTemplate(templateId);
    if (templateId && requirementByTemplate.has(templateId)) {
      setEditingRequirementId(requirementByTemplate.get(templateId)!);
    } else {
      setEditingRequirementId(null);
    }
  };

  const goNextFromStep1 = () => {
    if (!canContinueStep1 || !selectedTemplate) return;

    const card = REQ_TEMPLATE_CARDS.find((c) => c.id === selectedTemplate);

    if (isEditingExistingRequirement && editingRequirementDetails) {
      const d = editingRequirementDetails;
      reset({
        name: d.name,
        instructions: d.instructions ?? undefined,
        allowPdf: d.allowPdf,
        allowImage: d.allowImage,
        allowOther: d.allowOther,
        expirationType: d.expirationType,
        expirationDate: d.expirationDate
          ? new Date(d.expirationDate).toISOString().split('T')[0]
          : undefined,
        allowEarlyRenewal: d.allowEarlyRenewal,
        requiresApproval: d.requiresApproval,
        isTalentRequired: d.isTalentRequired,
      });
    } else {
      reset({
        ...defaultSettings(),
        name: card?.title ?? selectedTemplate,
      });
    }
    clearErrors();
    setStep(2);
  };

  const onSettingsSubmit = (data: SettingsFormOutput) => {
    if (selectedTemplate === 'upload' && !data.allowPdf && !data.allowImage && !data.allowOther) {
      setError('allowPdf', { type: 'manual', message: 'Select at least one accepted file format' });
      return;
    }
    clearErrors();
    setPreview(data);
    setStep(3);
  };

  const collectionDirty =
    isEditMode &&
    ((categoryName.trim() !== (editCategory?.name ?? '').trim()) ||
      ((categoryDescription.trim() || null) !== (editCategory?.description ?? null)));

  const persistCollection = async (): Promise<string | null> => {
    if (isEditMode) {
      if (collectionDirty) {
        await categoryUpdateMutation.mutateAsync({
          id: editCategory!.id,
          name: categoryName.trim(),
          description: categoryDescription.trim() || null,
        });
      }
      return editCategory!.id;
    }
    const newCat = await categoryCreateMutation.mutateAsync({
      name: categoryName.trim(),
      description: categoryDescription.trim() || null,
      requirementTemplateIds: [],
      isRequired: false,
    });
    return newCat ? (newCat as any).id : null;
  };

  const handleFinalSave = async (action: 'close' | 'new' = 'close') => {
    if (!canContinueStep1 || !selectedTemplate || !preview) return;
    saveActionRef.current = action;

    let targetCategoryId: string | null;
    try {
      targetCategoryId = await persistCollection();
    } catch {
      return;
    }
    if (!targetCategoryId) return;

    try {
      if (isEditingExistingRequirement && editingRequirementId) {
        await updateRequirementMutation.mutateAsync({
          id: editingRequirementId,
          name: preview.name,
          instructions: preview.instructions ?? null,
          allowPdf: isUploadTemplate ? preview.allowPdf : true,
          allowImage: isUploadTemplate ? preview.allowImage : true,
          allowOther: isUploadTemplate ? preview.allowOther : false,
          expirationType: preview.expirationType,
          expirationDate:
            preview.expirationType === 'CUSTOM_DATE' && preview.expirationDate
              ? new Date(preview.expirationDate)
              : null,
          allowEarlyRenewal: preview.allowEarlyRenewal,
          requiresApproval: preview.requiresApproval,
          isTalentRequired: isTalentSubmissionTemplateId(selectedTemplate)
            ? preview.isTalentRequired
            : false,
        });
      } else {
        await createRequirementMutation.mutateAsync({
          serviceCategoryId: targetCategoryId,
          templateId: selectedTemplate,
          name: preview.name,
          instructions: preview.instructions ?? null,
          allowPdf: isUploadTemplate ? preview.allowPdf : true,
          allowImage: isUploadTemplate ? preview.allowImage : true,
          allowOther: isUploadTemplate ? preview.allowOther : false,
          expirationType: preview.expirationType,
          expirationDate:
            preview.expirationType === 'CUSTOM_DATE' && preview.expirationDate
              ? new Date(preview.expirationDate)
              : null,
          allowEarlyRenewal: preview.allowEarlyRenewal,
          requiresApproval: preview.requiresApproval,
          isTalentRequired: isTalentSubmissionTemplateId(selectedTemplate)
            ? preview.isTalentRequired
            : false,
        });
      }

      onSaved?.();

      if (action === 'new') {
        await Promise.all([
          utils.catalogRequirement.getAll.invalidate(),
          utils.category.getAllActive.invalidate(),
        ]);
        setSelectedTemplate(null);
        setEditingRequirementId(null);
        setTemplateTab('all');
        setPreview(null);
        reset(defaultSettings());
        clearErrors();
        setStep(1);
      } else {
        handleClose();
      }
    } catch {
      // mutation already surfaces error toast
    }
  };

  const settingsValues = preview;
  const submissionTemplate = selectedTemplate && isTalentSubmissionTemplateId(selectedTemplate);
  const isSaving =
    createRequirementMutation.isPending ||
    updateRequirementMutation.isPending ||
    categoryCreateMutation.isPending ||
    categoryUpdateMutation.isPending;

  const handleStepClick = (target: WizardStep) => {
    if (target === step) return;
    if (target < step) {
      if (target === 2 && preview) reset(preview);
      setStep(target);
      return;
    }
    if (target === 2 && canContinueStep1) {
      goNextFromStep1();
    } else if (target === 3 && preview !== null) {
      setStep(3);
    }
  };

  const collectionSectionLabel = isEditMode ? 'Collection Details' : 'New Collection Details';
  const headerTitle = isEditMode ? 'Edit Collection' : 'Add Requirement';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      className="mx-4 flex h-[min(94vh,1000px)] w-full max-h-[min(94vh,1000px)] max-w-[1200px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-card p-0 shadow-xl"
    >
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200 px-6 pb-0 pt-5 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{headerTitle}</h2>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper tabs */}
        <div className="mt-6 flex gap-1 overflow-x-auto border-t border-slate-200/90 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {WIZARD_STEPS.map((n) => {
            const active = step === n;
            const reachable =
              n < step ||
              (n === 2 && canContinueStep1) ||
              (n === 3 && preview !== null);
            return (
              <button
                key={n}
                type="button"
                onClick={() => handleStepClick(n)}
                disabled={!reachable && n !== step}
                className={cn(
                  'relative shrink-0 whitespace-nowrap px-3 py-3 text-sm transition-colors',
                  active
                    ? 'font-bold text-slate-900'
                    : reachable
                    ? 'font-medium text-slate-500 hover:text-slate-700 cursor-pointer'
                    : 'font-medium text-slate-400 cursor-not-allowed'
                )}
              >
                {n}. {STEP_LABELS[n]}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-slate-900" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <DialogContent className="flex-1 overflow-y-auto min-h-0 px-6 py-6 sm:px-8">
        {step === 1 && (
          <div className="space-y-8">
            <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
                {collectionSectionLabel}
              </h3>
              <div>
                <Label htmlFor="cat-name" required>Collection Name</Label>
                <Input
                  id="cat-name"
                  className="mt-1.5 bg-background"
                  placeholder="e.g., Security, Catering..."
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cat-desc">Description (optional)</Label>
                <Textarea
                  id="cat-desc"
                  className="mt-1.5 bg-background"
                  placeholder="What this collection is for..."
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-border">
              <div>
                <Label className="text-base font-semibold mb-3 block">Requirement Template</Label>
                <div className="flex gap-2 border-b border-border pb-2">
                  {(['all', 'standard', 'smart'] as TemplateTab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setTemplateTab(tab)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                        templateTab === tab
                          ? 'bg-slate-900 text-white'
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {tab === 'all' ? 'All' : tab === 'standard' ? 'Standard' : 'Smart'}
                    </button>
                  ))}
                </div>
              </div>

              <RequirementTemplateCardGrid
                selected={new Set()}
                onToggle={() => {}}
                selectionMode="single"
                singleSelected={selectedTemplate}
                onSingleChange={handleTemplateSelect}
                visibleIds={visibleTemplateIds}
                editableIds={isEditMode ? editableTemplateIds : undefined}
              />
            </div>
          </div>
        )}

        {step === 2 && selectedTemplate && (
          <form id="req-settings-form" className="space-y-8" onSubmit={handleSubmit(onSettingsSubmit)}>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Requirement information</h3>
              <div>
                <Label htmlFor="req-name" required>Name</Label>
                <Input id="req-name" className="mt-1.5 max-w-lg" {...register('name')} error={!!errors.name} />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label>Type</Label>
                <p className="mt-1.5 text-sm font-medium">
                  {REQ_TEMPLATE_CARDS.find((c) => c.id === selectedTemplate)?.title ?? selectedTemplate}
                </p>
              </div>
            </div>

            {isUploadTemplate && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">About file upload requirements</h3>
                <div>
                  <Label htmlFor="req-instructions">Instructions to contractor (optional)</Label>
                  <Textarea
                    id="req-instructions"
                    rows={4}
                    className="mt-1.5"
                    {...register('instructions')}
                    placeholder="Guidelines for what to upload"
                  />
                </div>
                <div>
                  <Label required>Specify accepted file format(s)</Label>
                  <p className="text-xs text-muted-foreground mt-1">Max 100MB per file (enforced when talent uploads).</p>
                  <div className="mt-3 space-y-3">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={watch('allowPdf')} onChange={(e) => setValue('allowPdf', e.target.checked)} />
                      Document (pdf)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={watch('allowImage')} onChange={(e) => setValue('allowImage', e.target.checked)} />
                      Image (jpeg, png)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={watch('allowOther')} onChange={(e) => setValue('allowOther', e.target.checked)} />
                      Other (docx, xlsx, csv)
                    </label>
                  </div>
                  {errors.allowPdf && (
                    <p className="text-sm text-destructive mt-2">{errors.allowPdf.message}</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Expiration</h3>
              <RadioGroup
                value={watch('expirationType')}
                onValueChange={(v) => {
                  const next = v as CatalogRequirementExpirationValue;
                  setValue('expirationType', next);
                  if (next !== 'CUSTOM_DATE') setValue('expirationDate', undefined);
                  setValue('requiresApproval', next === 'PER_TALENT');
                }}
                className="space-y-2"
              >
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="NEVER" id="exp-never" />
                  <span>Never expires</span>
                </label>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="CUSTOM_DATE" id="exp-custom" />
                  <span>Expires on a specific date</span>
                </label>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="PER_TALENT" id="exp-per-talent" />
                  <div>
                    <span>Document expiry date</span>
                  </div>
                </label>
              </RadioGroup>
              {watch('expirationType') === 'CUSTOM_DATE' && (
                <div className="pl-6 space-y-1">
                  <Input
                    type="date"
                    value={watch('expirationDate') ?? ''}
                    onChange={(e) => setValue('expirationDate', e.target.value || undefined)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.expirationDate && (
                    <p className="text-sm text-destructive">{errors.expirationDate.message}</p>
                  )}
                </div>
              )}
              <label className="flex items-start gap-3 rounded-md border border-border p-3 bg-muted/20 mt-4">
                <Checkbox
                  checked={watch('allowEarlyRenewal')}
                  onChange={(e) => setValue('allowEarlyRenewal', e.target.checked)}
                />
                <div>
                  <span className="text-sm font-medium">Early renewals (optional)</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Allow contractor to renew documents for this requirement at any time. Reminders can be sent
                    before expiration.
                  </p>
                </div>
              </label>
            </div>

            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Approvals</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    When enabled, an admin review is required after the contractor submits this requirement.
                  </p>
                </div>
                <Checkbox
                  checked={watch('requiresApproval')}
                  onChange={(e) => setValue('requiresApproval', e.target.checked)}
                  aria-label="Require approvals"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {watch('requiresApproval') ? 'Approvals on' : 'Approvals off'}
              </p>
            </div>

            {submissionTemplate && (
              <label className="flex items-start gap-3 rounded-md border border-border p-3 bg-muted/20">
                <Checkbox
                  checked={watch('isTalentRequired')}
                  onChange={(e) => setValue('isTalentRequired', e.target.checked)}
                />
                <div>
                  <span className="text-sm font-medium">Required when talent submits data</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Talent must satisfy this requirement before saving their profile or accepting an invitation
                    (where your onboarding flow applies this rule).
                  </p>
                </div>
              </label>
            )}
          </form>
        )}

        {step === 3 && selectedTemplate && settingsValues && (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-border p-4 space-y-2">
              <p>
                <span className="text-muted-foreground">Collection: </span>
                <span className="font-medium">{categoryName}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Template: </span>
                {REQ_TEMPLATE_CARDS.find((c) => c.id === selectedTemplate)?.title}
                {isEditingExistingRequirement && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                    Editing
                  </span>
                )}
              </p>
              <p>
                <span className="text-muted-foreground">Name: </span>
                {settingsValues.name}
              </p>
              {settingsValues.instructions && (
                <p>
                  <span className="text-muted-foreground">Instructions: </span>
                  {settingsValues.instructions}
                </p>
              )}
              {isUploadTemplate && (
                <p>
                  <span className="text-muted-foreground">Formats: </span>
                  {[
                    settingsValues.allowPdf && 'PDF',
                    settingsValues.allowImage && 'Images',
                    settingsValues.allowOther && 'Other',
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Expiration: </span>
                {settingsValues.expirationType === 'NEVER'
                  ? 'Never expires'
                  : settingsValues.expirationType === 'PER_TALENT'
                    ? 'Document expiry date'
                    : settingsValues.expirationDate
                      ? `Expires on ${new Date(settingsValues.expirationDate).toLocaleDateString()}`
                      : 'Custom date'}
              </p>
              <p>
                <span className="text-muted-foreground">Approvals: </span>
                {settingsValues.requiresApproval ? 'On' : 'Off'}
              </p>
              {submissionTemplate && (
                <p>
                  <span className="text-muted-foreground">Talent required: </span>
                  {settingsValues.isTalentRequired ? 'Yes' : 'No'}
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-200 px-6 py-5 sm:px-8 bg-slate-50/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            {step === 1 && (
              <Button
                type="button"
                onClick={goNextFromStep1}
                disabled={!canContinueStep1}
                className="h-14 w-full rounded-xl bg-slate-900 px-10 text-lg font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:shadow-none sm:w-auto sm:min-w-[200px]"
              >
                Continue
              </Button>
            )}
            {step === 2 && (
              <Button
                type="submit"
                form="req-settings-form"
                className="h-14 w-full rounded-xl bg-slate-900 px-10 text-lg font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:shadow-none sm:w-auto sm:min-w-[200px]"
              >
                Continue
              </Button>
            )}
            {step === 3 && (
              <Button
                type="button"
                onClick={() => handleFinalSave('close')}
                disabled={isSaving}
                className="h-14 w-full rounded-xl bg-slate-900 px-10 text-lg font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:shadow-none sm:w-auto sm:min-w-[200px]"
              >
                {isSaving && saveActionRef.current === 'close' ? 'Saving...' : 'Save & Close'}
              </Button>
            )}
            <Button
              type="button"
              onClick={() => handleFinalSave('new')}
              disabled={step !== 3 || !preview || isSaving}
              className="h-14 w-full rounded-xl bg-blue-600 px-10 text-lg font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-none sm:w-auto sm:min-w-[200px] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving && saveActionRef.current === 'new' ? 'Saving...' : 'Save & Add New Requirement'}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (step === 3 && preview) reset(preview);
                  setStep((step - 1) as WizardStep);
                }}
                disabled={isSaving}
                className="h-10 rounded-xl border-slate-200 bg-white px-5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
              className="h-10 rounded-xl border-slate-200 bg-white px-5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

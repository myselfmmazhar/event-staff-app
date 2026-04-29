'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CloseIcon } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RequirementTemplateCardGrid } from '@/components/common/requirement-template-card-grid';
import {
  REQ_TEMPLATE_CARDS,
  isTalentSubmissionTemplateId,
  type ReqTemplateId,
} from '@/lib/requirement-templates';
import { trpc } from '@/lib/client/trpc';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

/** Mirrors Prisma `CatalogRequirementExpiration` — defined here so the wizard stays client-safe (no `@prisma/client` in the bundle). */
const CATALOG_REQUIREMENT_EXPIRATION = [
  'NEVER',
  'FROM_YEAR_START',
  'FROM_COMPLETION',
  'BEFORE_YEAR_END',
] as const;

type CatalogRequirementExpirationValue = (typeof CATALOG_REQUIREMENT_EXPIRATION)[number];

const expirationTypeSchema = z.enum(CATALOG_REQUIREMENT_EXPIRATION);

const settingsSchema = z.object({
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
  allowEarlyRenewal: z.boolean(),
  requiresApproval: z.boolean(),
  isTalentRequired: z.boolean(),
});

type SettingsFormInput = z.input<typeof settingsSchema>;
type SettingsFormOutput = z.infer<typeof settingsSchema>;

type TemplateTab = 'all' | 'standard' | 'smart';

export interface CreateRequirementWizardModalProps {
  open: boolean;
  onClose: () => void;
  fixedCategory?: { id: string; name: string; categoryId: string } | null;
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
  allowEarlyRenewal: false,
  requiresApproval: false,
  isTalentRequired: false,
});

export function CreateRequirementWizardModal({
  open,
  onClose,
  fixedCategory = null,
  onSaved,
}: CreateRequirementWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [templateTab, setTemplateTab] = useState<TemplateTab>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ReqTemplateId | null>(null);
  const [categoryId, setCategoryId] = useState<string>('');
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryDescription, setCategoryDescription] = useState<string>('');
  const [preview, setPreview] = useState<SettingsFormOutput | null>(null);

  const { data: activeCategories } = trpc.category.getAllActive.useQuery(undefined, {
    enabled: open && !fixedCategory,
  });

  const createMutation = trpc.catalogRequirement.create.useMutation({
    onSuccess: () => {
      onSaved?.();
      handleClose();
    },
  });

  const categoryCreateMutation = trpc.category.create.useMutation();

  const visibleTemplateIds = useMemo(() => templateTabFilter(templateTab), [templateTab]);

  const isUploadTemplate = selectedTemplate === 'upload';

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
    setCategoryId(fixedCategory?.id ?? '');
    setCategoryName('');
    setCategoryDescription('');
    setPreview(null);
    reset(defaultSettings());
    clearErrors();
  }, [open, fixedCategory?.id, reset, clearErrors]);

  const handleClose = () => {
    createMutation.reset();
    onClose();
  };

  const effectiveCategoryId = fixedCategory?.id ?? categoryId;
  const isNewCategory = categoryId === 'CREATE_NEW';
  const canContinueStep1 = (!!fixedCategory || (!!categoryId && categoryId !== 'CREATE_NEW') || (isNewCategory && !!categoryName.trim())) && !!selectedTemplate;

  const goNextFromStep1 = () => {
    if (!canContinueStep1 || !selectedTemplate) return;
    const card = REQ_TEMPLATE_CARDS.find((c) => c.id === selectedTemplate);
    reset({
      ...defaultSettings(),
      name: card?.title ?? selectedTemplate,
    });
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

  const handleFinalCreate = async () => {
    if (!canContinueStep1 || !selectedTemplate || !preview) return;

    let targetCategoryId = effectiveCategoryId;

    if (isNewCategory) {
      try {
        const newCat = await categoryCreateMutation.mutateAsync({
          name: categoryName.trim(),
          description: categoryDescription.trim() || null,
          requirementTemplateIds: [],
          isRequired: false,
        });
        if (newCat) {
          targetCategoryId = (newCat as any).id;
        }
      } catch (err) {
        return; // Error handled by TRPC/Mutation
      }
    }

    if (!targetCategoryId) return;

    createMutation.mutate({
      serviceCategoryId: targetCategoryId,
      templateId: selectedTemplate,
      name: preview.name,
      instructions: preview.instructions ?? null,
      allowPdf: isUploadTemplate ? preview.allowPdf : true,
      allowImage: isUploadTemplate ? preview.allowImage : true,
      allowOther: isUploadTemplate ? preview.allowOther : false,
      expirationType: preview.expirationType,
      allowEarlyRenewal: preview.allowEarlyRenewal,
      requiresApproval: preview.requiresApproval,
      isTalentRequired: isTalentSubmissionTemplateId(selectedTemplate) ? preview.isTalentRequired : false,
    });
  };

  const settingsValues = preview;
  const submissionTemplate = selectedTemplate && isTalentSubmissionTemplateId(selectedTemplate);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      className="mx-4 flex h-[min(94vh,1000px)] w-full max-h-[min(94vh,1000px)] max-w-[1200px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-card p-0 shadow-xl"
    >
      <DialogHeader>
        <div className="flex items-center justify-between">
          <div>
            <DialogTitle>
              {step === 1 && 'Select collection & template'}
              {step === 2 && 'Requirement settings'}
              {step === 3 && 'Preview & create'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1 pr-8">
              {step === 1 && 'Choose a collection and a requirement template.'}
              {step === 2 && 'Info & settings for this requirement.'}
              {step === 3 && 'Review and save this requirement to the catalog.'}
            </p>
          </div>
          <button type="button" onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-6 border-t border-border mt-4 pt-3">
          {([1, 2, 3] as const).map((n) => (
            <div
              key={n}
              className={cn(
                'pb-2 text-sm font-medium border-b-2 -mb-[2px]',
                step === n ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              )}
            >
              {n === 1 && '1. Collection'}
              {n === 2 && '2. Info & settings'}
              {n === 3 && '3. Preview'}
            </div>
          ))}
        </div>
      </DialogHeader>

      <DialogContent className="flex-1 overflow-y-auto min-h-0">
        {step === 1 && (
          <div className="space-y-8">
            <div className="space-y-6">
              {!fixedCategory && (
                <div className="space-y-4">
                  <div>
                    <Label required>Collection</Label>
                    <Select value={categoryId || undefined} onValueChange={(v) => setCategoryId(v)}>
                      <SelectTrigger className="mt-1.5 max-w-md">
                        <SelectValue placeholder="Select a collection" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CREATE_NEW" className="font-semibold text-primary">
                          + Create New Collection
                        </SelectItem>
                        {(activeCategories ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.categoryId})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {isNewCategory && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5"
                    >
                      <h3 className="text-sm font-bold text-primary uppercase tracking-wider">New Collection Details</h3>
                      <div>
                        <Label htmlFor="new-cat-name" required>Collection Name</Label>
                        <Input
                          id="new-cat-name"
                          className="mt-1.5 bg-background"
                          placeholder="e.g., Security, Catering..."
                          value={categoryName}
                          onChange={(e) => setCategoryName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-cat-desc">Description (optional)</Label>
                        <Textarea
                          id="new-cat-desc"
                          className="mt-1.5 bg-background"
                          placeholder="What this collection is for..."
                          value={categoryDescription}
                          onChange={(e) => setCategoryDescription(e.target.value)}
                          rows={2}
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
              {fixedCategory && (
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium uppercase text-[10px] tracking-wider">Selected Collection</span>
                    <Badge variant="outline" className="text-[10px] font-bold">Fixed</Badge>
                  </div>
                  <p className="text-base font-semibold text-slate-900">{fixedCategory.name}</p>
                  <p className="text-xs text-muted-foreground">{fixedCategory.categoryId}</p>
                </div>
              )}

              {!fixedCategory && categoryId && categoryId !== 'CREATE_NEW' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-lg border border-border bg-slate-50 px-4 py-3 text-sm space-y-1"
                >
                  <span className="text-muted-foreground font-medium uppercase text-[10px] tracking-wider block mb-1">Collection Details</span>
                  <p className="text-base font-semibold text-slate-900">
                    {activeCategories?.find(c => c.id === categoryId)?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeCategories?.find(c => c.id === categoryId)?.categoryId}
                  </p>
                  {activeCategories?.find(c => c.id === categoryId)?.description && (
                    <p className="text-sm text-slate-600 mt-2 italic">
                      "{activeCategories?.find(c => c.id === categoryId)?.description}"
                    </p>
                  )}
                </motion.div>
              )}
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
                          ? 'bg-primary text-primary-foreground'
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
                onSingleChange={setSelectedTemplate}
                visibleIds={visibleTemplateIds}
              />
            </div>
          </div>
        )}

        {step === 2 && selectedTemplate && (
          <form id="req-settings-form" className="space-y-8" onSubmit={handleSubmit(onSettingsSubmit)}>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Requirement information</h3>
              <div>
                <Label htmlFor="req-name" required>
                  Name
                </Label>
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
                      <Checkbox
                        checked={watch('allowPdf')}
                        onChange={(e) => setValue('allowPdf', e.target.checked)}
                      />
                      Document (pdf)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={watch('allowImage')}
                        onChange={(e) => setValue('allowImage', e.target.checked)}
                      />
                      Image (jpeg, png)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={watch('allowOther')}
                        onChange={(e) => setValue('allowOther', e.target.checked)}
                      />
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
                onValueChange={(v) => setValue('expirationType', v as CatalogRequirementExpirationValue)}
                className="space-y-2"
              >
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="NEVER" id="exp-never" />
                  <span>Never expires</span>
                </label>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="FROM_YEAR_START" id="exp-ys" />
                  <span>Fixed period from year start</span>
                </label>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="FROM_COMPLETION" id="exp-fc" />
                  <span>Fixed period from completion</span>
                </label>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="BEFORE_YEAR_END" id="exp-ye" />
                  <span>Fixed period before year end</span>
                </label>
              </RadioGroup>
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
                <span className="font-medium">
                  {fixedCategory?.name ?? activeCategories?.find((c) => c.id === categoryId)?.name}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Template: </span>
                {REQ_TEMPLATE_CARDS.find((c) => c.id === selectedTemplate)?.title}
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
                {settingsValues.expirationType.replaceAll('_', ' ')}
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

      <DialogFooter className="sm:justify-between w-full flex-row items-center border-t border-border/40 pt-4 mt-6">
        <div className="flex items-center gap-3">
          {step === 1 && (
            <Button 
              type="button" 
              onClick={goNextFromStep1} 
              disabled={!canContinueStep1}
              className="bg-[#868E96] hover:bg-[#727982] text-white w-48 font-semibold rounded-lg shadow-none"
            >
              Continue
            </Button>
          )}
          {step === 2 && (
            <>
              <Button 
                type="submit" 
                form="req-settings-form"
                className="bg-[#868E96] hover:bg-[#727982] text-white w-48 font-semibold rounded-lg shadow-none"
              >
                Continue
              </Button>
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="rounded-lg">
                Back
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button 
                type="button" 
                onClick={handleFinalCreate} 
                disabled={createMutation.isPending || categoryCreateMutation.isPending}
                className="bg-[#868E96] hover:bg-[#727982] text-white w-48 font-semibold rounded-lg shadow-none"
              >
                {createMutation.isPending || categoryCreateMutation.isPending ? 'Saving...' : 'Continue'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (preview) reset(preview);
                  setStep(2);
                }}
                className="rounded-lg"
              >
                Back
              </Button>
            </>
          )}
        </div>
        
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleClose} 
          disabled={createMutation.isPending}
          className="rounded-lg border-slate-200 text-slate-600 hover:text-slate-900 ml-auto"
        >
          Cancel
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

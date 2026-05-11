"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, RotateCcwIcon, SaveIcon, TagIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { trpc } from "@/lib/client/trpc";
import { useLabels } from "@/lib/hooks/use-labels";
import { useTerminology } from "@/lib/hooks/use-terminology";
import { DEFAULT_GLOBAL_LABELS, POD_IDS, POD_TITLES, type GlobalLabels, type PodId } from "@/lib/config/labels";
import { TerminologyForm } from "@/components/settings/terminology-form";
import { cn } from "@/lib/utils";

type LabelCategory = keyof typeof DEFAULT_GLOBAL_LABELS;
type ScopeId = "global" | PodId;

const SCOPE_TABS: { id: ScopeId; label: string }[] = [
  { id: "global", label: "Global" },
  { id: "task", label: POD_TITLES.task },
  { id: "talent", label: POD_TITLES.talent },
  { id: "time", label: POD_TITLES.time },
];

const CATEGORY_TITLES: Record<LabelCategory, string> = {
  staffCustomFields: "Talent Custom Fields",
  actions: "Action Buttons",
  search: "Search & Results",
  filters: "Filters",
  table: "Table Labels",
  pagination: "Pagination",
  common: "Common UI",
  status: "Status Labels",
  form: "Form Labels",
  messages: "Messages & Notifications",
};

const CATEGORY_DESCRIPTIONS: Record<LabelCategory, string> = {
  staffCustomFields: "Customize labels for your talent/staff profile custom fields",
  actions: "Labels for buttons like Save, Cancel, Delete, etc.",
  search: "Labels for search inputs and results",
  filters: "Labels for filter controls",
  table: "Labels for table headers and states",
  pagination: "Labels for pagination controls",
  common: "Common labels used throughout the app",
  status: "Labels for status indicators",
  form: "Labels for form fields",
  messages: "Success, error, and confirmation messages",
};

/**
 * Edited buffer keyed by scope -> category -> key.
 * `global` and each pod id maintain independent buffers so switching tabs
 * doesn't lose unsaved work for another scope.
 */
type EditedLabels = Record<ScopeId, Record<string, Record<string, string>>>;

const EMPTY_EDITED: EditedLabels = {
  global: {},
  task: {},
  talent: {},
  time: {},
};

export default function LabelsSettingsPage() {
  const { toast } = useToast();
  const { labels, refreshLabels } = useLabels();
  const { terminology, isLoading: isTerminologyLoading } = useTerminology();
  const [activeScope, setActiveScope] = useState<ScopeId>("global");
  const [expandedCategories, setExpandedCategories] = useState<Set<LabelCategory>>(new Set());
  const [editedLabels, setEditedLabels] = useState<EditedLabels>(EMPTY_EDITED);
  const [isSaving, setIsSaving] = useState(false);

  const updateGlobalLabelsMutation = trpc.settings.updateGlobalLabels.useMutation();
  const updatePodLabelsMutation = trpc.settings.updatePodLabels.useMutation();
  const resetLabelsMutation = trpc.settings.resetLabels.useMutation();

  // Toggle category expansion
  const toggleCategory = (category: LabelCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Handle label change for the active scope
  const handleLabelChange = (category: LabelCategory, key: string, value: string) => {
    setEditedLabels((prev) => ({
      ...prev,
      [activeScope]: {
        ...prev[activeScope],
        [category]: {
          ...prev[activeScope]?.[category],
          [key]: value,
        },
      },
    }));
  };

  /**
   * For pod tabs: pre-fill inputs with effective values so admin sees the
   * starting point (pod override -> global -> default). Edits replace pod-local
   * state. For the Global tab, we read from labels.global.
   */
  const getStoredValue = (scope: ScopeId, category: LabelCategory, key: string): string => {
    const defaults = DEFAULT_GLOBAL_LABELS[category] as unknown as Record<string, string>;
    if (scope === "global") {
      const savedGlobal = labels.global[category] as unknown as Record<string, string>;
      return savedGlobal[key] ?? defaults[key] ?? "";
    }
    const savedPod = (labels.pods[scope]?.[category] as unknown as Record<string, string> | undefined) ?? undefined;
    const savedGlobal = labels.global[category] as unknown as Record<string, string>;
    return savedPod?.[key] ?? savedGlobal[key] ?? defaults[key] ?? "";
  };

  const getLabelValue = (category: LabelCategory, key: string): string => {
    const buffered = editedLabels[activeScope]?.[category]?.[key];
    if (buffered !== undefined) return buffered;
    return getStoredValue(activeScope, category, key);
  };

  const isLabelModified = (category: LabelCategory, key: string): boolean => {
    return editedLabels[activeScope]?.[category]?.[key] !== undefined;
  };

  const hasChangesInScope = (scope: ScopeId): boolean =>
    Object.keys(editedLabels[scope] ?? {}).some(
      (category) => Object.keys(editedLabels[scope]?.[category] ?? {}).length > 0
    );

  const hasChanges = hasChangesInScope(activeScope);

  // Save changes for the active scope
  const handleSave = async () => {
    if (!hasChanges) return;
    const scope = activeScope;
    setIsSaving(true);
    try {
      if (scope === "global") {
        await updateGlobalLabelsMutation.mutateAsync(editedLabels.global);
      } else {
        // Snapshot semantics: send the full effective set for the pod, so the
        // pod becomes detached from global from that point on. We compose the
        // effective values per key (edited buffer -> stored pod -> global ->
        // default) and submit the complete GlobalLabels-shaped object.
        const snapshot = buildPodSnapshot(scope, labels.pods[scope], labels.global, editedLabels[scope]);
        await updatePodLabelsMutation.mutateAsync({ pod: scope, labels: snapshot });
      }
      await refreshLabels();
      setEditedLabels((prev) => ({ ...prev, [scope]: {} }));
      toast({
        title: "Labels saved",
        description: scope === "global"
          ? "Your global label changes have been saved successfully."
          : `${POD_TITLES[scope as PodId]} labels have been saved successfully.`,
      });
    } catch (error) {
      console.error("Failed to save labels:", error);
      toast({
        title: "Error",
        description: "Failed to save labels. Please try again.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset labels for the active scope
  const handleReset = async () => {
    const scope = activeScope;
    const scopeName = scope === "global" ? "global" : POD_TITLES[scope as PodId];
    if (!confirm(`Are you sure you want to reset all ${scopeName} labels to their defaults?`)) {
      return;
    }
    setIsSaving(true);
    try {
      if (scope === "global") {
        await resetLabelsMutation.mutateAsync({ scope: "global" });
      } else {
        await resetLabelsMutation.mutateAsync({ scope: "pod", pod: scope });
      }
      await refreshLabels();
      setEditedLabels((prev) => ({ ...prev, [scope]: {} }));
      toast({
        title: "Labels reset",
        description: `${scopeName === "global" ? "All global" : `All ${scopeName}`} labels have been reset to defaults.`,
      });
    } catch (error) {
      console.error("Failed to reset labels:", error);
      toast({
        title: "Error",
        description: "Failed to reset labels. Please try again.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedLabels((prev) => ({ ...prev, [activeScope]: {} }));
  };

  if (isTerminologyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeScopeLabel =
    activeScope === "global" ? "Global" : POD_TITLES[activeScope as PodId];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <TagIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Labels</h1>
          <p className="text-sm text-muted-foreground">
            Customize terminology and labels throughout the application
          </p>
        </div>
      </div>

      {/* Terminology Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Terminology</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Customize how your organization refers to staff and events.
          </p>
        </div>

        {/* Current Terminology Preview */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Current Terminology</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Staff Term</h4>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">Singular:</span> {terminology.staff.singular}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Plural:</span> {terminology.staff.plural}
                </p>
                <p className="text-sm">
                  <span className="font-medium">ID Prefix:</span> {terminology.staffIdPrefix}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Route:</span> /{terminology.staff.route}
                </p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Event Term</h4>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">Singular:</span> {terminology.event.singular}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Plural:</span> {terminology.event.plural}
                </p>
                <p className="text-sm">
                  <span className="font-medium">ID Prefix:</span> {terminology.eventIdPrefix}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Route:</span> /{terminology.event.route}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Terminology Form */}
        <Card className="p-6">
          <TerminologyForm currentTerminology={terminology} />
        </Card>
      </section>

      {/* Labels Section with scope tabs */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Labels</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {activeScope === "global"
                ? "Customize the text labels used throughout the application."
                : `Override labels for the ${activeScopeLabel} section. Unsaved fields fall back to the Global value.`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
            >
              <RotateCcwIcon className="h-4 w-4 mr-2" />
              Reset {activeScopeLabel}
            </Button>
          </div>
        </div>

        {/* Scope tabs */}
        <div className="flex items-center gap-1 border-b border-border w-full overflow-x-auto">
          {SCOPE_TABS.map((tab) => {
            const isActive = activeScope === tab.id;
            const tabHasChanges = hasChangesInScope(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveScope(tab.id)}
                className={cn(
                  "px-4 py-3 transition-all duration-200 border-b-2 -mb-[2px] whitespace-nowrap",
                  isActive
                    ? "text-primary border-primary font-semibold"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground/30"
                )}
              >
                {tab.label}
                {tabHasChanges && (
                  <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-500" aria-label="unsaved changes" />
                )}
              </button>
            );
          })}
        </div>

        {/* Category Cards */}
        <div className="space-y-4">
          {(Object.keys(DEFAULT_GLOBAL_LABELS) as LabelCategory[]).map((category) => {
            const isExpanded = expandedCategories.has(category);
            const categoryLabels = DEFAULT_GLOBAL_LABELS[category] as unknown as Record<string, string>;
            const labelKeys = Object.keys(categoryLabels);

            return (
              <Card key={`${activeScope}-${category}`} className="overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className={cn(
                    "w-full flex items-center justify-between p-4",
                    "hover:bg-muted/50 transition-colors",
                    "text-left"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDownIcon className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <h3 className="font-semibold">{CATEGORY_TITLES[category]}</h3>
                      <p className="text-sm text-muted-foreground">
                        {CATEGORY_DESCRIPTIONS[category]}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {labelKeys.length} labels
                  </span>
                </button>

                {/* Category Content */}
                {isExpanded && (
                  <div className="border-t p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {labelKeys.map((key) => {
                        const defaultValue = categoryLabels[key];
                        const currentValue = getLabelValue(category, key);
                        const isModified = isLabelModified(category, key);
                        const globalValue =
                          (labels.global[category] as unknown as Record<string, string>)[key] ?? defaultValue;

                        return (
                          <div key={key} className="space-y-1.5">
                            <Label
                              htmlFor={`${activeScope}-${category}-${key}`}
                              className="text-sm font-medium flex items-center gap-2"
                            >
                              {formatLabelKey(key)}
                              {isModified && (
                                <span className="text-xs text-blue-600">Modified</span>
                              )}
                            </Label>
                            <Input
                              id={`${activeScope}-${category}-${key}`}
                              value={currentValue}
                              onChange={(e) => handleLabelChange(category, key, e.target.value)}
                              placeholder={defaultValue}
                              className={cn(
                                "h-9",
                                isModified && "border-blue-300 bg-blue-50"
                              )}
                            />
                            {activeScope !== "global" && currentValue !== globalValue && (
                              <p className="text-xs text-muted-foreground">
                                Global: {globalValue}
                              </p>
                            )}
                            {activeScope === "global" && currentValue !== defaultValue && (
                              <p className="text-xs text-muted-foreground">
                                Default: {defaultValue}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* Sticky Save Bar */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end gap-2 p-4 bg-white border rounded-lg shadow-lg">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <SaveIcon className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : `Save ${activeScopeLabel}`}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Build a full GlobalLabels-shaped snapshot for a pod from the edited buffer.
 *
 * Source priority per key:
 *   edited buffer  >  stored pod value  >  global  >  built-in default
 *
 * The result is sent to updatePodLabels, replacing any prior pod storage. After
 * the save, the pod becomes detached from later globalLabels changes (matches
 * the "Pre-filled copies of global" semantics chosen at design time).
 */
function buildPodSnapshot(
  pod: PodId,
  storedPod: Partial<GlobalLabels> | undefined,
  global: GlobalLabels,
  edited: Record<string, Record<string, string>>
): GlobalLabels {
  const result: Record<string, Record<string, string>> = {};
  for (const category of Object.keys(DEFAULT_GLOBAL_LABELS) as (keyof GlobalLabels)[]) {
    const defaults = DEFAULT_GLOBAL_LABELS[category] as unknown as Record<string, string>;
    const globalCat = global[category] as unknown as Record<string, string>;
    const storedCat = (storedPod?.[category] as unknown as Record<string, string> | undefined) || {};
    const editedCat = edited[category] || {};
    const merged: Record<string, string> = {};
    for (const key of Object.keys(defaults)) {
      merged[key] = editedCat[key] ?? storedCat[key] ?? globalCat[key] ?? defaults[key] ?? "";
    }
    result[category] = merged;
  }
  // Suppress unused-var: keeping pod in the signature for clarity at call sites.
  void pod;
  return result as unknown as GlobalLabels;
}

/**
 * Format a camelCase key to a human-readable label
 */
function formatLabelKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

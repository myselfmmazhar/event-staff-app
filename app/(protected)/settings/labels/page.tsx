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
import { DEFAULT_GLOBAL_LABELS } from "@/lib/config/labels";
import { TerminologyForm } from "@/components/settings/terminology-form";
import { cn } from "@/lib/utils";

type LabelCategory = keyof typeof DEFAULT_GLOBAL_LABELS;

const CATEGORY_TITLES: Record<LabelCategory, string> = {
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

export default function LabelsSettingsPage() {
  const { toast } = useToast();
  const { labels, refreshLabels } = useLabels();
  const { terminology, isLoading: isTerminologyLoading } = useTerminology();
  const [expandedCategories, setExpandedCategories] = useState<Set<LabelCategory>>(new Set());
  const [editedLabels, setEditedLabels] = useState<Record<string, Record<string, string>>>({});
  const [isSaving, setIsSaving] = useState(false);

  const updateGlobalLabelsMutation = trpc.settings.updateGlobalLabels.useMutation();
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

  // Handle label change
  const handleLabelChange = (category: LabelCategory, key: string, value: string) => {
    setEditedLabels((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  // Get the current value for a label
  const getLabelValue = (category: LabelCategory, key: string): string => {
    // Check edited labels first
    if (editedLabels[category]?.[key] !== undefined) {
      return editedLabels[category][key];
    }
    // Then check saved labels
    const savedLabels = labels.global[category] as unknown as Record<string, string>;
    const defaultLabels = DEFAULT_GLOBAL_LABELS[category] as unknown as Record<string, string>;
    return savedLabels[key] ?? defaultLabels[key] ?? "";
  };

  // Check if a label has been modified
  const isLabelModified = (category: LabelCategory, key: string): boolean => {
    return editedLabels[category]?.[key] !== undefined;
  };

  // Check if there are any unsaved changes
  const hasChanges = Object.keys(editedLabels).some(
    (category) => Object.keys(editedLabels[category as LabelCategory] ?? {}).length > 0
  );

  // Save all changes
  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      await updateGlobalLabelsMutation.mutateAsync(editedLabels);
      await refreshLabels();
      setEditedLabels({});
      toast({
        title: "Labels saved",
        description: "Your label changes have been saved successfully.",
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

  // Reset all global labels
  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset all global labels to their defaults?")) {
      return;
    }

    setIsSaving(true);
    try {
      await resetLabelsMutation.mutateAsync({ scope: "global" });
      await refreshLabels();
      setEditedLabels({});
      toast({
        title: "Labels reset",
        description: "All global labels have been reset to defaults.",
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

  // Cancel changes
  const handleCancel = () => {
    setEditedLabels({});
  };

  if (isTerminologyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

      {/* Global Labels Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Global Labels</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Customize the text labels used throughout the application. Page-specific labels can be
              edited directly on each page using the &quot;Edit Labels&quot; button.
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
              Reset All
            </Button>
          </div>
        </div>

        {/* Category Cards */}
        <div className="space-y-4">
          {(Object.keys(DEFAULT_GLOBAL_LABELS) as LabelCategory[]).map((category) => {
            const isExpanded = expandedCategories.has(category);
            const categoryLabels = DEFAULT_GLOBAL_LABELS[category] as unknown as Record<string, string>;
            const labelKeys = Object.keys(categoryLabels);

            return (
              <Card key={category} className="overflow-hidden">
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

                        return (
                          <div key={key} className="space-y-1.5">
                            <Label
                              htmlFor={`${category}-${key}`}
                              className="text-sm font-medium flex items-center gap-2"
                            >
                              {formatLabelKey(key)}
                              {isModified && (
                                <span className="text-xs text-blue-600">Modified</span>
                              )}
                            </Label>
                            <Input
                              id={`${category}-${key}`}
                              value={currentValue}
                              onChange={(e) => handleLabelChange(category, key, e.target.value)}
                              placeholder={defaultValue}
                              className={cn(
                                "h-9",
                                isModified && "border-blue-300 bg-blue-50"
                              )}
                            />
                            {currentValue !== defaultValue && (
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
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
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

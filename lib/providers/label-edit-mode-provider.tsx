"use client";

import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/client/trpc";
import { useLabelsContext } from "./labels-provider";
import type { PageIdentifier } from "@/lib/schemas/labels.schema";
import { setNestedValue } from "@/lib/config/labels";

/** Auto-save delay in milliseconds */
const AUTO_SAVE_DELAY = 1500;

/**
 * Label Edit Mode Context Value
 */
interface LabelEditModeContextValue {
  /** Whether edit mode is active */
  isEditMode: boolean;
  /** The current page being edited */
  currentPage: PageIdentifier | null;
  /** Map of edited labels (key -> value) */
  editedLabels: Record<string, string>;
  /** Toggle edit mode on/off for a page */
  toggleEditMode: (page: PageIdentifier) => void;
  /** Enter edit mode for a specific page */
  enterEditMode: (page: PageIdentifier) => void;
  /** Exit edit mode (cancel) */
  exitEditMode: () => void;
  /** Set a label value during editing */
  setLabel: (key: string, value: string) => void;
  /** Save all edited labels */
  saveLabels: () => Promise<void>;
  /** Cancel editing and discard changes */
  cancelEdit: () => void;
  /** Whether there are unsaved changes */
  hasChanges: boolean;
  /** Whether manual save is in progress */
  isSaving: boolean;
  /** Whether auto-save is in progress */
  isAutoSaving: boolean;
  /** Error from save operation */
  saveError: Error | null;
}

/**
 * Create Label Edit Mode Context
 */
const LabelEditModeContext = createContext<LabelEditModeContextValue | undefined>(undefined);

/**
 * Label Edit Mode Provider Props
 */
interface LabelEditModeProviderProps {
  children: React.ReactNode;
}

/**
 * Label Edit Mode Provider Component
 *
 * Manages the state for inline label editing on pages.
 * Tracks which page is being edited and stores edited label values
 * until they are saved or discarded.
 */
export function LabelEditModeProvider({ children }: LabelEditModeProviderProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageIdentifier | null>(null);
  const [editedLabels, setEditedLabels] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  // Ref for auto-save debounce timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { refreshLabels } = useLabelsContext();
  const updatePageLabelsMutation = trpc.settings.updatePageLabels.useMutation();

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    return Object.keys(editedLabels).length > 0;
  }, [editedLabels]);

  /**
   * Convert flat edited labels to nested structure
   * e.g., { "columns.staffId": "Employee ID" } -> { columns: { staffId: "Employee ID" } }
   */
  const buildNestedLabels = useCallback((labels: Record<string, string>) => {
    const nestedLabels: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(labels)) {
      const parts = key.split('.');
      let current: Record<string, unknown> = nestedLabels;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]!;
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }

      const lastPart = parts[parts.length - 1];
      if (lastPart !== undefined) {
        current[lastPart] = value;
      }
    }

    return nestedLabels;
  }, []);

  /**
   * Auto-save labels without exiting edit mode
   * Called by debounced effect after user stops typing
   */
  const autoSaveLabels = useCallback(async (labelsToSave: Record<string, string>, page: PageIdentifier) => {
    if (Object.keys(labelsToSave).length === 0) return;

    setIsAutoSaving(true);
    setSaveError(null);

    try {
      const nestedLabels = buildNestedLabels(labelsToSave);

      await updatePageLabelsMutation.mutateAsync({
        page,
        labels: nestedLabels,
      });

      // Refresh labels to get updated values
      await refreshLabels();

      // Clear edited labels after successful auto-save (they're now saved in DB)
      setEditedLabels({});
    } catch (error) {
      console.error("Failed to auto-save labels:", error);
      setSaveError(error instanceof Error ? error : new Error("Failed to auto-save labels"));
    } finally {
      setIsAutoSaving(false);
    }
  }, [buildNestedLabels, updatePageLabelsMutation, refreshLabels]);

  // Debounced auto-save effect
  useEffect(() => {
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Only auto-save if in edit mode with changes
    if (!isEditMode || !currentPage || Object.keys(editedLabels).length === 0) {
      return;
    }

    // Set new timer for auto-save
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveLabels(editedLabels, currentPage);
    }, AUTO_SAVE_DELAY);

    // Cleanup timer on unmount or when dependencies change
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [editedLabels, isEditMode, currentPage, autoSaveLabels]);

  // Toggle edit mode on/off
  const toggleEditMode = useCallback((page: PageIdentifier) => {
    if (isEditMode && currentPage === page) {
      // Exit edit mode
      setIsEditMode(false);
      setCurrentPage(null);
      setEditedLabels({});
      setSaveError(null);
    } else {
      // Enter edit mode for this page
      setIsEditMode(true);
      setCurrentPage(page);
      setEditedLabels({});
      setSaveError(null);
    }
  }, [isEditMode, currentPage]);

  // Enter edit mode for a specific page
  const enterEditMode = useCallback((page: PageIdentifier) => {
    setIsEditMode(true);
    setCurrentPage(page);
    setEditedLabels({});
    setSaveError(null);
  }, []);

  // Exit edit mode without saving
  const exitEditMode = useCallback(() => {
    setIsEditMode(false);
    setCurrentPage(null);
    setEditedLabels({});
    setSaveError(null);
  }, []);

  // Set a label value during editing
  const setLabel = useCallback((key: string, value: string) => {
    setEditedLabels((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Save all edited labels (manual save - exits edit mode)
  const saveLabels = useCallback(async () => {
    if (!currentPage || !hasChanges) return;

    // Cancel any pending auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const nestedLabels = buildNestedLabels(editedLabels);

      await updatePageLabelsMutation.mutateAsync({
        page: currentPage,
        labels: nestedLabels,
      });

      // Refresh labels to get updated values
      await refreshLabels();

      // Exit edit mode on success
      setIsEditMode(false);
      setCurrentPage(null);
      setEditedLabels({});
    } catch (error) {
      console.error("Failed to save labels:", error);
      setSaveError(error instanceof Error ? error : new Error("Failed to save labels"));
    } finally {
      setIsSaving(false);
    }
  }, [currentPage, hasChanges, editedLabels, buildNestedLabels, updatePageLabelsMutation, refreshLabels]);

  // Cancel editing and discard changes
  const cancelEdit = useCallback(() => {
    setIsEditMode(false);
    setCurrentPage(null);
    setEditedLabels({});
    setSaveError(null);
  }, []);

  const value: LabelEditModeContextValue = {
    isEditMode,
    currentPage,
    editedLabels,
    toggleEditMode,
    enterEditMode,
    exitEditMode,
    setLabel,
    saveLabels,
    cancelEdit,
    hasChanges,
    isSaving,
    isAutoSaving,
    saveError,
  };

  return (
    <LabelEditModeContext.Provider value={value}>
      {children}
    </LabelEditModeContext.Provider>
  );
}

/**
 * Hook to access label edit mode context
 * Must be used within a LabelEditModeProvider
 *
 * @throws Error if used outside of LabelEditModeProvider
 */
export function useLabelEditModeContext(): LabelEditModeContextValue {
  const context = useContext(LabelEditModeContext);

  if (context === undefined) {
    throw new Error(
      "useLabelEditModeContext must be used within a LabelEditModeProvider"
    );
  }

  return context;
}

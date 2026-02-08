"use client";

import { useMemo } from "react";
import { useLabelEditMode } from "@/lib/hooks/use-label-edit-mode";
import { useLabels } from "@/lib/hooks/use-labels";
import { useTerminology } from "@/lib/hooks/use-terminology";
import { getNestedValue, interpolateLabel } from "@/lib/config/labels";
import { cn } from "@/lib/utils";

interface EditableLabelProps {
  /** The label key within the current page (e.g., "columns.staffId", "pageTitle") */
  labelKey: string;
  /** The default value to display if no custom label is set */
  defaultValue: string;
  /** Optional className for the wrapper element */
  className?: string;
  /** Whether to interpolate terminology placeholders */
  interpolate?: boolean;
  /** Render as a specific element (default: span) */
  as?: "span" | "h1" | "h2" | "h3" | "h4" | "p" | "label" | "th" | "td";
  /** Additional props for the rendered element */
  htmlProps?: React.HTMLAttributes<HTMLElement>;
}

/**
 * EditableLabel Component
 *
 * Renders a label that can be edited inline when edit mode is active.
 * In normal mode, displays the label text (custom or default).
 * In edit mode, displays an input field for editing.
 *
 * @example
 * ```tsx
 * // In a table header
 * <EditableLabel
 *   labelKey="columns.staffId"
 *   defaultValue={`${staffTerm.singular} ID`}
 * />
 *
 * // As a page title
 * <EditableLabel
 *   labelKey="pageTitle"
 *   defaultValue="{StaffPlural}"
 *   interpolate
 *   as="h1"
 *   className="text-2xl font-bold"
 * />
 * ```
 */
export function EditableLabel({
  labelKey,
  defaultValue,
  className,
  interpolate = true,
  as: Component = "span",
  htmlProps,
}: EditableLabelProps) {
  const { isEditMode, currentPage, editedLabels, setLabel } = useLabelEditMode();
  const { labels } = useLabels();
  const { terminology } = useTerminology();

  // Get the saved label value from the labels config
  const savedValue = useMemo(() => {
    if (!currentPage) return undefined;
    const pagePath = `pages.${currentPage}.${labelKey}`;
    return getNestedValue<string>(labels as unknown as Record<string, unknown>, pagePath);
  }, [labels, currentPage, labelKey]);

  // Get the current value: edited > saved > default
  const currentValue = useMemo(() => {
    const value = editedLabels[labelKey] ?? savedValue ?? defaultValue;
    return interpolate ? interpolateLabel(value, terminology) : value;
  }, [editedLabels, labelKey, savedValue, defaultValue, interpolate, terminology]);

  // Get the raw value for editing (without interpolation)
  const rawValue = useMemo(() => {
    return editedLabels[labelKey] ?? savedValue ?? defaultValue;
  }, [editedLabels, labelKey, savedValue, defaultValue]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(labelKey, e.target.value);
  };

  // Handle blur - fallback to default if empty
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (!value) {
      // Reset to default if user clears the label
      setLabel(labelKey, defaultValue);
    }
  };

  // Handle key press (Enter to blur, Escape to cancel)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      // Reset to saved value on Escape
      setLabel(labelKey, savedValue ?? defaultValue);
      e.currentTarget.blur();
    }
  };

  if (isEditMode) {
    return (
      <input
        type="text"
        value={rawValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "bg-blue-50 border border-blue-300 rounded px-2 py-0.5 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "min-w-[80px] w-auto",
          // Inherit font styles from context
          "font-inherit",
          className
        )}
        style={{
          // Auto-size input based on content
          width: `${Math.max(80, rawValue.length * 8 + 24)}px`,
        }}
      />
    );
  }

  return (
    <Component className={className} {...htmlProps}>
      {currentValue}
    </Component>
  );
}

/**
 * EditableLabelText Component
 *
 * A simpler version that just returns the text value without wrapping element.
 * Useful when you need to embed the label in another element.
 *
 * @example
 * ```tsx
 * <Button>
 *   <PlusIcon />
 *   <EditableLabelText labelKey="addButton" defaultValue="Add Staff" />
 * </Button>
 * ```
 */
export function EditableLabelText({
  labelKey,
  defaultValue,
  interpolate = true,
}: Omit<EditableLabelProps, "className" | "as" | "htmlProps">) {
  const { isEditMode, currentPage, editedLabels, setLabel } = useLabelEditMode();
  const { labels } = useLabels();
  const { terminology } = useTerminology();

  // Get the saved label value
  const savedValue = useMemo(() => {
    if (!currentPage) return undefined;
    const pagePath = `pages.${currentPage}.${labelKey}`;
    return getNestedValue<string>(labels as unknown as Record<string, unknown>, pagePath);
  }, [labels, currentPage, labelKey]);

  // Get the current value
  const currentValue = useMemo(() => {
    const value = editedLabels[labelKey] ?? savedValue ?? defaultValue;
    return interpolate ? interpolateLabel(value, terminology) : value;
  }, [editedLabels, labelKey, savedValue, defaultValue, interpolate, terminology]);

  // Get raw value for editing
  const rawValue = useMemo(() => {
    return editedLabels[labelKey] ?? savedValue ?? defaultValue;
  }, [editedLabels, labelKey, savedValue, defaultValue]);

  if (isEditMode) {
    return (
      <input
        type="text"
        value={rawValue}
        onChange={(e) => setLabel(labelKey, e.target.value)}
        onBlur={(e) => {
          const value = e.target.value.trim();
          if (!value) {
            setLabel(labelKey, defaultValue);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setLabel(labelKey, savedValue ?? defaultValue);
            e.currentTarget.blur();
          }
        }}
        className={cn(
          "bg-blue-50 border border-blue-300 rounded px-2 py-0.5 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-blue-500",
          "min-w-[60px]"
        )}
        style={{ width: `${Math.max(60, rawValue.length * 8 + 16)}px` }}
      />
    );
  }

  return <>{currentValue}</>;
}

/**
 * useEditableLabel Hook
 *
 * Returns the current label value and a setter for use in custom components.
 *
 * @example
 * ```tsx
 * function CustomLabel() {
 *   const { value, rawValue, isEditing, onChange } = useEditableLabel({
 *     labelKey: "columns.staffId",
 *     defaultValue: "Staff ID",
 *   });
 *
 *   if (isEditing) {
 *     return <input value={rawValue} onChange={(e) => onChange(e.target.value)} />;
 *   }
 *   return <span>{value}</span>;
 * }
 * ```
 */
export function useEditableLabel({
  labelKey,
  defaultValue,
  interpolate = true,
}: {
  labelKey: string;
  defaultValue: string;
  interpolate?: boolean;
}) {
  const { isEditMode, currentPage, editedLabels, setLabel } = useLabelEditMode();
  const { labels } = useLabels();
  const { terminology } = useTerminology();

  const savedValue = useMemo(() => {
    if (!currentPage) return undefined;
    const pagePath = `pages.${currentPage}.${labelKey}`;
    return getNestedValue<string>(labels as unknown as Record<string, unknown>, pagePath);
  }, [labels, currentPage, labelKey]);

  const rawValue = useMemo(() => {
    return editedLabels[labelKey] ?? savedValue ?? defaultValue;
  }, [editedLabels, labelKey, savedValue, defaultValue]);

  const value = useMemo(() => {
    return interpolate ? interpolateLabel(rawValue, terminology) : rawValue;
  }, [rawValue, interpolate, terminology]);

  const onChange = (newValue: string) => {
    setLabel(labelKey, newValue);
  };

  return {
    value,
    rawValue,
    isEditing: isEditMode,
    onChange,
  };
}

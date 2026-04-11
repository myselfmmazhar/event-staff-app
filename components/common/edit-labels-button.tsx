"use client";

import { PencilIcon, XIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLabelEditMode } from "@/lib/hooks/use-label-edit-mode";
import type { PageIdentifier } from "@/lib/schemas/labels.schema";
import { trpc } from "@/lib/client/trpc";
import { cn } from "@/lib/utils";

interface EditLabelsButtonProps {
  /** The page identifier for this button */
  page: PageIdentifier;
  /** Optional className for the button */
  className?: string;
}

/**
 * EditLabelsButton Component
 *
 * Renders an "Edit Labels" toggle button that allows admins to enter
 * edit mode for customizing page labels inline.
 *
 * Only visible to admin/super-admin users.
 *
 * @example
 * ```tsx
 * function StaffPage() {
 *   return (
 *     <div className="flex justify-between items-center">
 *       <h1>Staff</h1>
 *       <EditLabelsButton page="staff" />
 *     </div>
 *   );
 * }
 * ```
 */
export function EditLabelsButton({ page, className }: EditLabelsButtonProps) {
  const { isEditMode, currentPage, toggleEditMode } = useLabelEditMode();

  // Check if user is admin
  const { data: profile, isLoading: isLoadingProfile } = trpc.profile.getMyProfile.useQuery();

  const isAdmin = profile?.role === "ADMIN" || profile?.role === "SUPER_ADMIN";
  const isEditingThisPage = isEditMode && currentPage === page;

  // Don't show button if not admin or still loading
  if (isLoadingProfile || !isAdmin) {
    return null;
  }

  return (
    <Button
      variant={isEditingThisPage ? "default" : "ghost"}
      size="sm"
      onClick={() => toggleEditMode(page)}
      className={cn(
        "gap-2",
        isEditingThisPage && "bg-blue-600 hover:bg-blue-700 text-white",
        className
      )}
    >
      {isEditingThisPage ? (
        <>
          <XIcon className="h-4 w-4" />
          Exit Edit Mode
        </>
      ) : (
        <>
          <PencilIcon className="h-4 w-4" />
          Edit Labels
        </>
      )}
    </Button>
  );
}

/**
 * EditLabelsSaveBar Component
 *
 * Floating save/cancel bar that appears when in edit mode.
 * Shows at the bottom of the screen with save and cancel buttons.
 *
 * @example
 * ```tsx
 * function PageLayout({ children }) {
 *   return (
 *     <div>
 *       {children}
 *       <EditLabelsSaveBar />
 *     </div>
 *   );
 * }
 * ```
 */
export function EditLabelsSaveBar() {
  const {
    isEditMode,
    currentPage,
    hasChanges,
    isSaving,
    isAutoSaving,
    saveError,
    saveLabels,
    cancelEdit,
  } = useLabelEditMode();

  // Check if user is admin
  const { data: profile } = trpc.profile.getMyProfile.useQuery();
  const isAdmin = profile?.role === "ADMIN" || profile?.role === "SUPER_ADMIN";

  // Don't show bar if not in edit mode or not admin
  if (!isEditMode || !isAdmin) {
    return null;
  }

  // Determine status text and indicator
  const getStatusInfo = () => {
    if (isAutoSaving) {
      return { text: "Auto-saving...", color: "bg-yellow-500", animate: true };
    }
    if (hasChanges) {
      return { text: "Unsaved changes", color: "bg-blue-500", animate: true };
    }
    return { text: "All saved", color: "bg-green-500", animate: false };
  };

  const status = getStatusInfo();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="flex justify-center pb-6">
        <div
          className={cn(
            "pointer-events-auto",
            "flex items-center gap-4 px-6 py-3",
            "bg-white border border-gray-200 rounded-lg shadow-lg",
            "animate-in slide-in-from-bottom-4 duration-200"
          )}
        >
          {/* Status indicator */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className={cn(
              "h-2 w-2 rounded-full",
              status.color,
              status.animate && "animate-pulse"
            )} />
            <span>
              Editing {currentPage} labels • {status.text}
            </span>
          </div>

          {/* Error message */}
          {saveError && (
            <span className="text-sm text-red-600">{saveError.message}</span>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={cancelEdit}
              disabled={isSaving || isAutoSaving}
            >
              <XIcon className="h-4 w-4 mr-1" />
              Done
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={saveLabels}
              disabled={!hasChanges || isSaving || isAutoSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-1" />
                  Save & Exit
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * EditLabelsIndicator Component
 *
 * Small indicator that shows when edit mode is active.
 * Can be placed in the header or page title area.
 *
 * @example
 * ```tsx
 * <div className="flex items-center gap-2">
 *   <h1>Staff</h1>
 *   <EditLabelsIndicator />
 * </div>
 * ```
 */
export function EditLabelsIndicator() {
  const { isEditMode } = useLabelEditMode();

  if (!isEditMode) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
      <PencilIcon className="h-3 w-3" />
      Editing
    </span>
  );
}

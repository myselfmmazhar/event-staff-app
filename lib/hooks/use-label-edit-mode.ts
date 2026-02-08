import { useLabelEditModeContext } from "@/lib/providers/label-edit-mode-provider";

/**
 * Hook to access label edit mode functionality
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     isEditMode,
 *     editedLabels,
 *     setLabel,
 *     saveLabels,
 *     cancelEdit,
 *     hasChanges,
 *   } = useLabelEditMode();
 *
 *   return (
 *     <div>
 *       {isEditMode ? (
 *         <input
 *           value={editedLabels['myLabel'] ?? 'Default'}
 *           onChange={(e) => setLabel('myLabel', e.target.value)}
 *         />
 *       ) : (
 *         <span>My Label</span>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLabelEditMode() {
  return useLabelEditModeContext();
}

/**
 * Hook to check if label editing is active
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isEditing = useIsLabelEditMode();
 *   return isEditing ? <EditView /> : <ReadView />;
 * }
 * ```
 */
export function useIsLabelEditMode(): boolean {
  const { isEditMode } = useLabelEditModeContext();
  return isEditMode;
}

/**
 * Hook to check if a specific page is being edited
 *
 * @example
 * ```tsx
 * function StaffPage() {
 *   const isEditingThisPage = useIsEditingPage('staff');
 *   return <div className={isEditingThisPage ? 'editing' : ''}>...</div>;
 * }
 * ```
 */
export function useIsEditingPage(page: string): boolean {
  const { isEditMode, currentPage } = useLabelEditModeContext();
  return isEditMode && currentPage === page;
}

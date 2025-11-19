import { create } from "zustand";

export type ModalType = "form" | "view" | "delete" | "tempPassword" | null;

interface ModalState<T = any> {
  // Current modal state
  modalType: ModalType;
  isOpen: boolean;
  selectedData: T | null;
  mode: "create" | "edit" | null;
  tempData: any; // For temp password or other temporary data

  // Actions
  openModal: (type: ModalType, data?: T, mode?: "create" | "edit") => void;
  closeModal: () => void;
  setTempData: (data: any) => void;
  setSelectedData: (data: T | null) => void;
  reset: () => void;
}

const DEFAULT_STATE = {
  modalType: null as ModalType,
  isOpen: false,
  selectedData: null,
  mode: null as "create" | "edit" | null,
  tempData: null,
};

export const useModalStore = create<ModalState>((set) => ({
  ...DEFAULT_STATE,

  openModal: (type, data, mode) =>
    set({
      modalType: type,
      isOpen: true,
      selectedData: data ?? null,
      mode: mode ?? null,
    }),

  closeModal: () =>
    set({
      ...DEFAULT_STATE,
      isOpen: false,
    }),

  setTempData: (data) =>
    set({ tempData: data }),

  setSelectedData: (data) =>
    set({ selectedData: data }),

  reset: () => set(DEFAULT_STATE),
}));

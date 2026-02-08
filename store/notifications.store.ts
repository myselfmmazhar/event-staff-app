import { create } from "zustand";

interface NotificationStore {
    // State
    unreadCount: number;
    isDropdownOpen: boolean;
    isConnected: boolean;

    // Actions
    setUnreadCount: (count: number) => void;
    incrementUnread: () => void;
    decrementUnread: (amount?: number) => void;
    toggleDropdown: () => void;
    openDropdown: () => void;
    closeDropdown: () => void;
    setConnected: (connected: boolean) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
    // Initial state
    unreadCount: 0,
    isDropdownOpen: false,
    isConnected: false,

    // Actions
    setUnreadCount: (count) => set({ unreadCount: count }),

    incrementUnread: () => set((state) => ({
        unreadCount: state.unreadCount + 1
    })),

    decrementUnread: (amount = 1) => set((state) => ({
        unreadCount: Math.max(0, state.unreadCount - amount)
    })),

    toggleDropdown: () => set((state) => ({
        isDropdownOpen: !state.isDropdownOpen
    })),

    openDropdown: () => set({ isDropdownOpen: true }),

    closeDropdown: () => set({ isDropdownOpen: false }),

    setConnected: (connected) => set({ isConnected: connected }),
}));

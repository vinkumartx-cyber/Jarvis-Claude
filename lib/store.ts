import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { VoiceState, ChatMessage, Briefing } from '@/types';

interface AppStoreState {
  // Voice state
  voiceState: VoiceState;
  isListening: boolean;
  transcript: string;

  // Chat state
  messages: ChatMessage[];
  currentBriefing: Briefing | null;
  isBriefingPlaying: boolean;

  // Sync state
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;

  // UI state
  sidebarOpen: boolean;
  selectedConversation: string | null;

  // Actions
  setVoiceState: (state: VoiceState) => void;
  setIsListening: (listening: boolean) => void;
  setTranscript: (transcript: string) => void;
  clearTranscript: () => void;

  addMessage: (message: ChatMessage) => void;
  removeMessage: (messageId: string) => void;
  clearMessages: () => void;

  setCurrentBriefing: (briefing: Briefing | null) => void;
  setIsBriefingPlaying: (playing: boolean) => void;

  setIsSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: Date) => void;
  setSyncError: (error: string | null) => void;

  setSidebarOpen: (open: boolean) => void;
  setSelectedConversation: (conversationId: string | null) => void;

  reset: () => void;
}

const initialState = {
  voiceState: 'idle' as VoiceState,
  isListening: false,
  transcript: '',

  messages: [],
  currentBriefing: null,
  isBriefingPlaying: false,

  isSyncing: false,
  lastSyncTime: null,
  syncError: null,

  sidebarOpen: true,
  selectedConversation: null,
};

export const useAppStore = create<AppStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Voice actions
        setVoiceState: (state: VoiceState) => set({ voiceState: state }),
        setIsListening: (listening: boolean) => set({ isListening: listening }),
        setTranscript: (transcript: string) => set({ transcript }),
        clearTranscript: () => set({ transcript: '' }),

        // Chat actions
        addMessage: (message: ChatMessage) =>
          set((state) => ({
            messages: [...state.messages, message],
          })),

        removeMessage: (messageId: string) =>
          set((state) => ({
            messages: state.messages.filter((msg) => msg.id !== messageId),
          })),

        clearMessages: () => set({ messages: [] }),

        // Briefing actions
        setCurrentBriefing: (briefing: Briefing | null) => set({ currentBriefing: briefing }),
        setIsBriefingPlaying: (playing: boolean) => set({ isBriefingPlaying: playing }),

        // Sync actions
        setIsSyncing: (syncing: boolean) => set({ isSyncing: syncing }),
        setLastSyncTime: (time: Date) => set({ lastSyncTime: time }),
        setSyncError: (error: string | null) => set({ syncError: error }),

        // UI actions
        setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
        setSelectedConversation: (conversationId: string | null) =>
          set({ selectedConversation: conversationId }),

        // Reset
        reset: () => set(initialState),
      }),
      {
        name: 'vinesh-ai-store',
        partialize: (state) => ({
          // Only persist UI state, not transient data
          sidebarOpen: state.sidebarOpen,
          selectedConversation: state.selectedConversation,
          messages: state.messages,
        }),
      }
    )
  )
);

// Utility hooks for common patterns
export function useVoiceState() {
  return useAppStore((state) => ({
    voiceState: state.voiceState,
    isListening: state.isListening,
    transcript: state.transcript,
    setVoiceState: state.setVoiceState,
    setIsListening: state.setIsListening,
    setTranscript: state.setTranscript,
    clearTranscript: state.clearTranscript,
  }));
}

export function useChatState() {
  return useAppStore((state) => ({
    messages: state.messages,
    addMessage: state.addMessage,
    removeMessage: state.removeMessage,
    clearMessages: state.clearMessages,
  }));
}

export function useBriefingState() {
  return useAppStore((state) => ({
    currentBriefing: state.currentBriefing,
    isBriefingPlaying: state.isBriefingPlaying,
    setCurrentBriefing: state.setCurrentBriefing,
    setIsBriefingPlaying: state.setIsBriefingPlaying,
  }));
}

export function useSyncState() {
  return useAppStore((state) => ({
    isSyncing: state.isSyncing,
    lastSyncTime: state.lastSyncTime,
    syncError: state.syncError,
    setIsSyncing: state.setIsSyncing,
    setLastSyncTime: state.setLastSyncTime,
    setSyncError: state.setSyncError,
  }));
}

export function useUIState() {
  return useAppStore((state) => ({
    sidebarOpen: state.sidebarOpen,
    selectedConversation: state.selectedConversation,
    setSidebarOpen: state.setSidebarOpen,
    setSelectedConversation: state.setSelectedConversation,
  }));
}

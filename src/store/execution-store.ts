import { create } from 'zustand';

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  nodeId?: string;
  nodeName?: string;
  message: string;
}

interface ExecutionState {
  isExecuting: boolean;
  currentExecutionId: string | null;
  logs: LogEntry[];
  nodeStatuses: Record<string, string>;

  // Actions
  setIsExecuting: (executing: boolean) => void;
  setCurrentExecutionId: (id: string | null) => void;
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  setNodeStatus: (nodeId: string, status: string) => void;
  resetNodeStatuses: () => void;
  reset: () => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  isExecuting: false,
  currentExecutionId: null,
  logs: [],
  nodeStatuses: {},

  setIsExecuting: (executing) => set({ isExecuting: executing }),
  setCurrentExecutionId: (id) => set({ currentExecutionId: id }),

  addLog: (entry) =>
    set((s) => ({
      logs: [
        ...s.logs,
        {
          ...entry,
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date(),
        },
      ],
    })),

  clearLogs: () => set({ logs: [] }),

  setNodeStatus: (nodeId, status) =>
    set((s) => ({
      nodeStatuses: { ...s.nodeStatuses, [nodeId]: status },
    })),

  resetNodeStatuses: () => set({ nodeStatuses: {} }),

  reset: () =>
    set({
      isExecuting: false,
      currentExecutionId: null,
      logs: [],
      nodeStatuses: {},
    }),
}));

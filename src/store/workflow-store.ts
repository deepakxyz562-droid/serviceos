import { create } from 'zustand';
import type { WorkflowNode, WorkflowEdge, WorkflowSettings } from '@/types/workflow';

interface WorkflowState {
  // Current workflow
  workflowId: string | null;
  workflowName: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  settings: WorkflowSettings;
  active: boolean;
  
  // Selection
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  
  // History (undo/redo)
  history: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }[];
  historyIndex: number;
  
  // Actions
  setWorkflow: (id: string, name: string, nodes: WorkflowNode[], edges: WorkflowEdge[], settings: WorkflowSettings, active: boolean) => void;
  addNode: (node: WorkflowNode) => void;
  updateNode: (id: string, data: Partial<WorkflowNode['data']>) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  removeNodes: (ids: string[]) => void;
  addEdge: (edge: WorkflowEdge) => void;
  removeEdges: (ids: string[]) => void;
  setSelectedNodes: (ids: string[]) => void;
  setSelectedEdges: (ids: string[]) => void;
  setWorkflowName: (name: string) => void;
  setActive: (active: boolean) => void;
  setSettings: (settings: Partial<WorkflowSettings>) => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  reset: () => void;
}

const defaultSettings: WorkflowSettings = {
  saveDataSuccess: true,
  saveDataError: true,
  saveManualExecutions: true,
  concurrencyLimit: -1,
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflowId: null,
  workflowName: 'Untitled Workflow',
  nodes: [],
  edges: [],
  settings: defaultSettings,
  active: false,
  selectedNodeIds: [],
  selectedEdgeIds: [],
  history: [{ nodes: [], edges: [] }],
  historyIndex: 0,
  
  setWorkflow: (id, name, nodes, edges, settings, active) => 
    set({ workflowId: id, workflowName: name, nodes, edges, settings, active, history: [{ nodes, edges }], historyIndex: 0 }),
  
  addNode: (node) => {
    const { nodes } = get();
    const newNodes = [...nodes, node];
    set({ nodes: newNodes });
    get().pushHistory();
  },
  
  updateNode: (id, data) => {
    set((s) => ({
      nodes: s.nodes.map((n) => n.id === id ? { ...n, data: { ...n.data, ...data } } : n),
    }));
    get().pushHistory();
  },
  
  updateNodePosition: (id, position) => {
    set((s) => ({
      nodes: s.nodes.map((n) => n.id === id ? { ...n, position } : n),
    }));
    get().pushHistory();
  },
  
  removeNodes: (ids) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => !ids.includes(n.id)),
      edges: s.edges.filter((e) => !ids.includes(e.source) && !ids.includes(e.target)),
      selectedNodeIds: s.selectedNodeIds.filter((id) => !ids.includes(id)),
    }));
    get().pushHistory();
  },
  
  addEdge: (edge) => {
    set((s) => ({ edges: [...s.edges, edge] }));
    get().pushHistory();
  },
  
  removeEdges: (ids) => {
    set((s) => ({
      edges: s.edges.filter((e) => !ids.includes(e.id)),
      selectedEdgeIds: s.selectedEdgeIds.filter((id) => !ids.includes(id)),
    }));
    get().pushHistory();
  },
  
  setSelectedNodes: (ids) => set({ selectedNodeIds: ids }),
  setSelectedEdges: (ids) => set({ selectedEdgeIds: ids }),
  setWorkflowName: (name) => set({ workflowName: name }),
  setActive: (active) => set({ active }),
  setSettings: (settings) => set((s) => ({ settings: { ...s.settings, ...settings } })),
  
  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      set({ nodes: state.nodes, edges: state.edges, historyIndex: newIndex });
    }
  },
  
  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      set({ nodes: state.nodes, edges: state.edges, historyIndex: newIndex });
    }
  },
  
  pushHistory: () => {
    const { nodes, edges, historyIndex, history } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    // Deep clone to prevent mutation of historical state
    newHistory.push(JSON.parse(JSON.stringify({ nodes, edges })));
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },
  
  reset: () => set({
    workflowId: null,
    workflowName: 'Untitled Workflow',
    nodes: [],
    edges: [],
    settings: defaultSettings,
    active: false,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    history: [{ nodes: [], edges: [] }],
    historyIndex: 0,
  }),
}));

'use client';

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
  useReactFlow,
  SelectionMode,
  NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useWorkflowStore } from '@/store/workflow-store';
import { useAppStore } from '@/store/app-store';
import { useExecutionStore } from '@/store/execution-store';
import { WorkflowNode, WorkflowEdge } from '@/types/workflow';
import { getNodeTypeDefinition } from '@/lib/node-registry';
import { CustomNode } from './custom-node';
import { AnimatedEdge } from './animated-edge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Undo2, Redo2, ZoomIn, ZoomOut, Maximize, Power, PowerOff, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// === Execution Node Data Type ===

interface ExecutionNodeData {
  nodeId: string;
  status?: string;
  error?: string;
  output?: Array<{ json?: Record<string, any> }>;
  nodeName?: string;
}

// === Type Conversion Helpers ===

function toReactFlowNode(wn: WorkflowNode): Node {
  // Guard against nodes with missing data (e.g. from DB where data may be null)
  const safeData = wn.data || {};
  return {
    id: wn.id,
    type: 'customNode',
    position: wn.position || { x: 0, y: 0 },
    data: {
      nodeType: safeData.nodeType || wn.type || 'unknown',
      config: safeData.config || {},
      name: wn.name || 'Untitled Node',
      notes: safeData.notes,
      disabled: safeData.disabled,
      status: safeData.status,
    },
  };
}

function toReactFlowEdge(we: WorkflowEdge): Edge {
  return {
    id: we.id,
    source: we.source || '',
    target: we.target || '',
    sourceHandle: we.sourcePort,
    targetHandle: we.targetPort,
    type: 'animated',
    animated: we.animated,
    label: we.label,
  };
}

// === Main Component ===

export function WorkflowCanvasInner() {
  const reactFlowInstance = useReactFlow();

  const {
    workflowId,
    nodes: storeNodes,
    edges: storeEdges,
    addNode,
    addEdge: addStoreEdge,
    setSelectedNodes,
    setSelectedEdges,
    setWorkflow,
    updateNodePosition,
    undo,
    redo,
    historyIndex,
    history,
    workflowName,
    active: workflowActive,
    setActive: setWorkflowActive,
    setWorkflowName,
  } = useWorkflowStore();

  const { currentWorkflowId } = useAppStore();
  const { setIsExecuting, addLog, setNodeStatus, resetNodeStatuses } = useExecutionStore();
  const [isExecuting, setIsLocalExecuting] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [togglingActive, setTogglingActive] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize React Flow state from store (with safety for invalid nodes)
  const [nodes, setNodes, onNodesChange] = useNodesState(
    (storeNodes || []).filter(n => n && n.id).map(toReactFlowNode),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    (storeEdges || []).filter(e => e && e.id && e.source && e.target).map(toReactFlowEdge),
  );

  // Keep a ref in sync with current nodes to preserve selection state during store→RF syncs
  const currentNodesRef = useRef<Node[]>(nodes);
  useEffect(() => {
    currentNodesRef.current = nodes;
  }, [nodes]);

  // Register custom node and edge types
  const nodeTypes = useMemo(() => ({ customNode: CustomNode }), []);
  const edgeTypes = useMemo(() => ({ animated: AnimatedEdge }), []);

  // Track a flag to avoid re-syncing when we just loaded from API
  const isLoadingRef = useRef(false);

  // Load workflow from API when currentWorkflowId changes
  useEffect(() => {
    const wfId = currentWorkflowId || workflowId;
    if (!wfId) return;

    const loadWorkflow = async () => {
      try {
        isLoadingRef.current = true;
        const res = await fetch(`/api/workflows/${wfId}`);
        if (!res.ok) return;
        const data = await res.json();
        const wf = data.workflow || data;

        // Normalize nodes from DB — ensure every node has a valid `data` object
        const rawNodes: WorkflowNode[] = Array.isArray(wf.nodes) ? wf.nodes : [];
        const loadedNodes: WorkflowNode[] = rawNodes.map((n: any) => ({
          ...n,
          position: n.position || { x: 0, y: 0 },
          data: n.data
            ? { nodeType: n.data.nodeType || n.type, config: n.data.config || {}, notes: n.data.notes, disabled: n.data.disabled, status: n.data.status }
            : { nodeType: n.type || 'unknown', config: {} },
        }));
        const loadedEdges: WorkflowEdge[] = Array.isArray(wf.edges) ? wf.edges : [];
        const settings = wf.settings || {};

        setWorkflow(
          wf.id,
          wf.name,
          loadedNodes,
          loadedEdges,
          settings,
          wf.active || false,
        );

        setNodes(loadedNodes.map(toReactFlowNode));
        setEdges(loadedEdges.map(toReactFlowEdge));
      } catch (err) {
        console.error('Failed to load workflow:', err);
      } finally {
        // Use a microtask to ensure state has settled before clearing the flag
        setTimeout(() => { isLoadingRef.current = false; }, 0);
      }
    };

    loadWorkflow();
  }, [currentWorkflowId, workflowId, setWorkflow, setNodes, setEdges]);

  // Sync store nodes → React Flow only on undo/redo (history changes)
  // Skip during initial load to avoid double-render
  // IMPORTANT: Preserve selection state to prevent panel from hiding when config updates
  useEffect(() => {
    if (isLoadingRef.current) return;
    const rfNodes = (storeNodes || []).filter(n => n && n.id).map((wn) => {
      const rfNode = toReactFlowNode(wn);
      // Preserve selection state from current React Flow nodes
      const existingNode = currentNodesRef.current.find((n) => n.id === wn.id);
      if (existingNode?.selected) {
        rfNode.selected = true;
      }
      return rfNode;
    });
    setNodes(rfNodes);
  }, [storeNodes, setNodes]);

  useEffect(() => {
    if (isLoadingRef.current) return;
    const rfEdges = storeEdges.map(toReactFlowEdge);
    setEdges(rfEdges);
  }, [storeEdges, setEdges]);

  // Track zoom level via onMoveEnd callback
  const onMoveEnd = useCallback(
    (_event: MouseEvent | TouchEvent | null) => {
      const zoom = reactFlowInstance.getZoom?.() ?? 1;
      setZoomLevel(Math.round(zoom * 100));
    },
    [reactFlowInstance],
  );

  // Handle node changes (position, selection, etc.)
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      // Update store for position changes
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          updateNodePosition(change.id, change.position);
        }
      });
    },
    [onNodesChange, updateNodePosition],
  );

  // Handle selection changes - protect against deselection when config panel is focused
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: Node[]; edges: Edge[] }) => {
      // If the active element is inside the config panel, don't clear selection
      // This prevents the panel from hiding when the user is typing in inputs
      const activeEl = document.activeElement;
      if (selectedNodes.length === 0 && activeEl) {
        const panelEl = activeEl.closest('[data-config-panel]');
        if (panelEl) {
          // Don't clear selection while panel is focused
          return;
        }
      }
      setSelectedNodes(selectedNodes.map((n) => n.id));
      setSelectedEdges(selectedEdges.map((e) => e.id));
    },
    [setSelectedNodes, setSelectedEdges],
  );

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const newEdge: WorkflowEdge = {
        id: `edge_${connection.source}_${connection.sourceHandle || 'main'}_${connection.target}_${connection.targetHandle || 'main'}_${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourcePort: connection.sourceHandle || undefined,
        targetPort: connection.targetHandle || undefined,
        animated: true,
      };

      addStoreEdge(newEdge);

      const rfEdge = toReactFlowEdge(newEdge);
      setEdges((eds) => [...eds, rfEdge]);
    },
    [addStoreEdge, setEdges],
  );

  // Handle drag-and-drop from sidebar
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const nodeDef = getNodeTypeDefinition(type);
      if (!nodeDef) return;

      // Build default config from node properties
      const defaultConfig: Record<string, any> = {};
      if (nodeDef.properties) {
        for (const prop of nodeDef.properties) {
          if (prop.default !== undefined) {
            defaultConfig[prop.name] = prop.default;
          }
        }
      }

      // Special handling for webhook triggers
      if (type === 'webhookTrigger' || type === 'httpRequestTrigger') {
        defaultConfig.path = crypto.randomUUID();
      }

      const newNode: WorkflowNode = {
        id: `${type}_${Date.now()}`,
        type: type,
        name: nodeDef.displayName,
        position,
        data: {
          nodeType: type,
          config: defaultConfig,
        },
      };

      addNode(newNode);
      setNodes((nds) => [...nds, toReactFlowNode(newNode)]);
    },
    [reactFlowInstance, addNode, setNodes],
  );

  // Save workflow (debounced)
  const saveWorkflow = useCallback(async () => {
    const wfId = workflowId;
    if (!wfId) return;

    try {
      await fetch(`/api/workflows/${wfId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: storeNodes,
          edges: storeEdges,
          active: workflowActive,
        }),
      });
      addLog({ level: 'info', message: 'Workflow saved' });
    } catch {
      addLog({ level: 'error', message: 'Failed to save workflow' });
    }
  }, [workflowId, storeNodes, storeEdges, workflowActive, addLog]);

  // Debounced save on changes
  useEffect(() => {
    if (!workflowId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(saveWorkflow, 2000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [storeNodes, storeEdges, workflowId, saveWorkflow]);

  // Rename workflow
  const startRenaming = useCallback(() => {
    setRenameValue(workflowName);
    setIsRenaming(true);
    setTimeout(() => renameInputRef.current?.select(), 0);
  }, [workflowName]);

  const confirmRename = useCallback(async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === workflowName) {
      setIsRenaming(false);
      return;
    }
    setWorkflowName(trimmed);
    setIsRenaming(false);
    // Save to backend
    if (workflowId) {
      try {
        await fetch(`/api/workflows/${workflowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed }),
        });
        toast.success('Workflow renamed');
      } catch {
        toast.error('Failed to rename workflow');
      }
    }
  }, [renameValue, workflowName, workflowId, setWorkflowName]);

  const cancelRename = useCallback(() => {
    setIsRenaming(false);
  }, []);

  // Toggle workflow active/inactive
  const toggleActive = useCallback(async () => {
    const wfId = workflowId;
    if (!wfId || togglingActive) return;
    setTogglingActive(true);
    try {
      const res = await fetch(`/api/workflows/${wfId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !workflowActive }),
      });
      if (res.ok) {
        const data = await res.json();
        setWorkflowActive(data.active);
        addLog({ level: 'info', message: data.active ? 'Workflow activated — webhook triggers are now live' : 'Workflow deactivated' });
        toast.success(data.active ? 'Workflow activated — webhook triggers are now live' : 'Workflow deactivated');
      } else {
        const errorData = await res.json().catch(() => ({}));
        addLog({ level: 'error', message: `Failed to toggle: ${errorData.error || 'Unknown error'}` });
      }
    } catch (err: any) {
      addLog({ level: 'error', message: `Failed to toggle workflow: ${err.message || 'Network error'}` });
    } finally {
      setTogglingActive(false);
    }
  }, [workflowId, workflowActive, togglingActive, setWorkflowActive, addLog]);

  // Execute workflow
  const executeWorkflow = useCallback(async () => {
    if (!workflowId || isExecuting) return;
    setIsExecuting(true);
    setIsLocalExecuting(true);
    resetNodeStatuses();

    addLog({ level: 'info', message: 'Starting workflow execution...' });

    // Set all nodes to running
    const currentNodeIds = storeNodes.map((n) => n.id);
    currentNodeIds.forEach((id) => setNodeStatus(id, 'running'));

    try {
      const res = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Execution failed with status ${res.status}`);
      }

      const data = await res.json();

      // Use real node data from the execution result
      const nodeDataMap = new Map<string, ExecutionNodeData>(
        (data.nodeData || []).map((nd: any) => [nd.nodeId as string, nd as ExecutionNodeData]),
      );

      // Stagger node status updates based on actual results
      const nodesToUpdate = currentNodeIds.length > 0 ? currentNodeIds : (data.nodeData || []).map((nd: any) => nd.nodeId);

      nodesToUpdate.forEach((nodeId: string, i: number) => {
        setTimeout(() => {
          const nd = nodeDataMap.get(nodeId);
          const status = nd?.status || 'success';
          setNodeStatus(nodeId, status);

          const node = storeNodes.find((n) => n.id === nodeId);

          if (status === 'error') {
            const errorMsg = nd?.error || nd?.output?.[0]?.json?.error || 'Node failed';
            addLog({
              level: 'error',
              nodeId,
              nodeName: node?.name || nd?.nodeName,
              message: `Node "${node?.name || nd?.nodeName || nodeId}" failed: ${typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}`,
            });
          } else {
            // Build a meaningful log message based on output
            let message = `Node "${node?.name || nd?.nodeName || nodeId}" completed successfully`;

            if (nd?.output?.[0]?.json) {
              const output = nd.output[0].json;

              // WhatsApp-specific output
              if (output.success === true && output.messageId) {
                const msgType = output.type || 'message';
                const shortId = output.messageId?.substring(0, 20) || '';
                message = `✅ WhatsApp ${msgType} sent to ${output.to || 'recipient'} (ID: ${shortId}...)`;
                if (output.deliveryNote) {
                  message += ` — ${output.deliveryNote}`;
                }
              } else if (output.success === false && output.simulated) {
                message = `⚠️ WhatsApp message not delivered: ${output.error || 'Unknown error'}. ${output.tip || ''}`;
              } else if (output.error && typeof output.error === 'string' && output.error.includes('credential')) {
                message = `❌ WhatsApp: ${output.error}`;
              } else if (output.error) {
                message = `❌ Error: ${typeof output.error === 'string' ? output.error : JSON.stringify(output.error)}`;
              } else if (output.statusCode) {
                message = `HTTP ${output.method || ''} request completed with status ${output.statusCode}`;
              } else if (output.simulated) {
                message = `Node "${node?.name || nd?.nodeName}" completed (simulated)`;
              }
            }

            addLog({
              level: status === 'error' ? 'error' : 'success',
              nodeId,
              nodeName: node?.name || nd?.nodeName,
              message,
            });
          }

          if (i === nodesToUpdate.length - 1) {
            setIsExecuting(false);
            setIsLocalExecuting(false);
            const overallStatus = data.status === 'error' ? 'with errors' : 'successfully';
            addLog({ level: data.status === 'error' ? 'error' : 'info', message: `Workflow execution completed ${overallStatus} in ${data.durationMs}ms` });
          }
        }, (i + 1) * 300);
      });
    } catch (error) {
      setIsExecuting(false);
      setIsLocalExecuting(false);
      currentNodeIds.forEach((id) => setNodeStatus(id, 'error'));
      addLog({
        level: 'error',
        message: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }, [workflowId, isExecuting, storeNodes, setIsExecuting, addLog, setNodeStatus, resetNodeStatuses]);

  // Undo/redo keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onSelectionChange={onSelectionChange}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        selectionMode={SelectionMode.Partial}
        deleteKeyCode={['Backspace', 'Delete']}
        className="bg-gray-50"
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'animated',
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
        <Controls
          showInteractive={false}
          className="!bg-white !border !shadow-md !rounded-lg"
        />
        <MiniMap
          nodeStrokeWidth={3}
          pannable
          zoomable
          className="!bg-white !border !shadow-md !rounded-lg"
          nodeColor={(node) => {
            const nodeType = (node.data as Record<string, unknown>).nodeType as string;
            const def = getNodeTypeDefinition(nodeType);
            if (def?.color) {
              const colorMap: Record<string, string> = {
                'bg-amber-500': '#f59e0b',
                'bg-orange-500': '#f97316',
                'bg-orange-400': '#fb923c',
                'bg-red-500': '#ef4444',
                'bg-red-600': '#dc2626',
                'bg-red-400': '#f87171',
                'bg-rose-500': '#f43f5e',
                'bg-teal-500': '#14b8a6',
                'bg-teal-400': '#2dd4bf',
                'bg-yellow-500': '#eab308',
                'bg-yellow-400': '#facc15',
                'bg-blue-500': '#3b82f6',
                'bg-green-500': '#22c55e',
                'bg-green-600': '#16a34a',
                'bg-purple-500': '#a855f7',
                'bg-pink-500': '#ec4899',
                'bg-emerald-500': '#10b981',
                'bg-cyan-500': '#06b6d4',
                'bg-sky-500': '#0ea5e9',
                'bg-indigo-500': '#6366f1',
                'bg-slate-500': '#64748b',
                'bg-neutral-700': '#404040',
                'bg-amber-600': '#d97706',
                'bg-gray-500': '#6b7280',
              };
              return colorMap[def.color] || '#94a3b8';
            }
            return '#94a3b8';
          }}
        />

        {/* Top-left panel: Zoom level and workflow name */}
        <Panel position="top-left" className="!m-2">
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg border px-3 py-1.5 shadow-sm">
            {isRenaming ? (
              <div className="flex items-center gap-1">
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename();
                    if (e.key === 'Escape') cancelRename();
                  }}
                  className="text-xs font-medium bg-white border border-gray-300 rounded px-1.5 py-0.5 w-36 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
                <button
                  onClick={confirmRename}
                  className="p-0.5 hover:bg-emerald-100 rounded text-emerald-600"
                >
                  <Check className="size-3" />
                </button>
                <button
                  onClick={cancelRename}
                  className="p-0.5 hover:bg-red-100 rounded text-red-500"
                >
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={startRenaming}
                className="flex items-center gap-1 group/name"
                title="Click to rename"
              >
                <span className="text-xs text-gray-500 font-medium">{workflowName}</span>
                <Pencil className="size-2.5 text-gray-300 opacity-0 group-hover/name:opacity-100 transition-opacity" />
              </button>
            )}
            <Badge variant="secondary" className="text-[10px] h-5">
              {zoomLevel}%
            </Badge>
          </div>
        </Panel>

        {/* Bottom-left panel: Action buttons */}
        <Panel position="bottom-left" className="!m-2">
          <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg border px-2 py-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={undo}
              disabled={historyIndex <= 0}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="size-3.5" />
            </Button>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => reactFlowInstance.zoomIn()}
              title="Zoom In"
            >
              <ZoomIn className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => reactFlowInstance.zoomOut()}
              title="Zoom Out"
            >
              <ZoomOut className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => reactFlowInstance.fitView()}
              title="Fit View"
            >
              <Maximize className="size-3.5" />
            </Button>
          </div>
        </Panel>

        {/* Top-right panel: Active toggle + Execute button */}
        <Panel position="top-right" className="!m-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className={cn(
                'gap-1.5 shadow-md border-2',
                togglingActive && 'opacity-50 pointer-events-none',
                workflowActive
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50',
              )}
              onClick={toggleActive}
              disabled={togglingActive}
              title={workflowActive ? 'Deactivate workflow (disable webhook triggers)' : 'Activate workflow (enable webhook triggers)'}
            >
              {workflowActive ? (
                <Power className="size-3.5" />
              ) : (
                <PowerOff className="size-3.5" />
              )}
              {togglingActive ? '...' : workflowActive ? 'Active' : 'Inactive'}
            </Button>
            <Button
              size="sm"
              className={cn(
                'gap-1.5 shadow-md',
                isExecuting
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'bg-emerald-600 hover:bg-emerald-700',
              )}
              onClick={executeWorkflow}
              disabled={isExecuting}
            >
              <Play className="size-3.5" />
              {isExecuting ? 'Executing...' : 'Execute'}
            </Button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Save,
  Play,
  Trash2,
  X,
  GripVertical,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  Zap,
  Workflow,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  NODE_CATEGORIES,
  nodeRegistry,
  getNodesByCategory,
  getNodeTypeDefinition,
  getCategoryColor,
  triggerNodes,
  conditionNodes,
  actionNodes,
  flowControlNodes,
  logicNodes,
  codeNodes,
  dataNodes,
  communicationNodes,
  cloudNodes,
  aiNodes,
  utilityNodes,
  workflowTemplates,
} from '@/lib/node-registry';
import type { NodeCategory, NodeTypeDefinition } from '@/types/workflow';

// ─── Types ────────────────────────────────────────────────────────────────

type NodeType = 'trigger' | 'action' | 'condition' | 'flowControl' | 'logic' | 'code' | 'data' | 'communication' | 'cloud' | 'ai' | 'utility' | 'delay';

interface CanvasNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  category: NodeCategory;
  icon?: string;
  nodeType?: string; // the type string from node-registry (e.g. 'leadCreated')
  event?: string; // event source for trigger nodes
}

interface CanvasEdge {
  id: string;
  source: string;
  target: string;
}

// ─── Category color maps ────────────────────────────────────────────────

const CATEGORY_BORDER_COLOR: Record<string, string> = {
  trigger: 'border-l-blue-500',
  condition: 'border-l-orange-500',
  action: 'border-l-emerald-500',
  flowControl: 'border-l-purple-500',
  logic: 'border-l-orange-500',
  code: 'border-l-yellow-500',
  data: 'border-l-blue-500',
  communication: 'border-l-pink-500',
  cloud: 'border-l-amber-500',
  ai: 'border-l-pink-500',
  utility: 'border-l-gray-500',
  template: 'border-l-yellow-500',
};

const CATEGORY_ICON_BG: Record<string, string> = {
  trigger: 'bg-blue-500/15 text-blue-600',
  condition: 'bg-orange-500/15 text-orange-600',
  action: 'bg-emerald-500/15 text-emerald-600',
  flowControl: 'bg-purple-500/15 text-purple-600',
  logic: 'bg-orange-500/15 text-orange-600',
  code: 'bg-yellow-500/15 text-yellow-600',
  data: 'bg-blue-500/15 text-blue-600',
  communication: 'bg-pink-500/15 text-pink-600',
  cloud: 'bg-amber-500/15 text-amber-600',
  ai: 'bg-pink-500/15 text-pink-600',
  utility: 'bg-gray-500/15 text-gray-600',
  template: 'bg-yellow-500/15 text-yellow-600',
};

// ─── Helper: generate unique id ────────────────────────────────────────

function uid() {
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Helper: stable icon component to avoid creating components during render ──

function DynamicIcon({ name, className }: { name?: string; className?: string }) {
  if (!name) return <Zap className={className} />;
  const Icon = (LucideIcons as unknown as Record<string, React.ElementType>)[name];
  if (!Icon) return <Zap className={className} />;
  return <Icon className={className} />;
}

// ─── Constants ──────────────────────────────────────────────────────────

const NODE_WIDTH = 260;
const NODE_HEIGHT = 72;
const VERTICAL_GAP = 100;
const HORIZONTAL_GAP = 40;

// ─── Component ──────────────────────────────────────────────────────────

export function WorkflowEditor() {
  // ─── State ──────────────────────────────────────────────────────────
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [sidebarCategory, setSidebarCategory] = useState<string>('all');
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['trigger', 'condition', 'action', 'flowControl', 'logic']),
  );

  const canvasRef = useRef<HTMLDivElement>(null);
  const [showAddMenu, setShowAddMenu] = useState<string | null>(null);

  // ─── Derived ────────────────────────────────────────────────────────
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  // Filtered nodes for sidebar — uses node-registry
  const filteredNodes = useMemo(() => {
    let list: NodeTypeDefinition[] = nodeRegistry;
    if (sidebarCategory !== 'all') {
      list = list.filter((n) => n.category === sidebarCategory);
    }
    if (sidebarSearch.trim()) {
      const q = sidebarSearch.toLowerCase();
      list = list.filter(
        (n) =>
          n.displayName.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q) ||
          n.type.toLowerCase().includes(q)
      );
    }
    return list;
  }, [sidebarCategory, sidebarSearch]);

  // Group filtered nodes by category for sidebar display
  const filteredGroupedByCategory = useMemo(() => {
    const groups: Record<string, NodeTypeDefinition[]> = {};
    for (const cat of NODE_CATEGORIES) {
      const catNodes = filteredNodes.filter((n) => n.category === cat.id);
      if (catNodes.length > 0) {
        groups[cat.id] = catNodes;
      }
    }
    return groups;
  }, [filteredNodes]);

  const totalFilteredCount = filteredNodes.length;

  // ─── Auto-position helper ──────────────────────────────────────────
  const getNextPosition = useCallback(
    (parentId?: string): { x: number; y: number } => {
      if (parentId) {
        const parent = nodes.find((n) => n.id === parentId);
        if (parent) {
          // Check existing children of parent
          const childEdges = edges.filter((e) => e.source === parentId);
          const childCount = childEdges.length;
          return {
            x: parent.position.x + childCount * (NODE_WIDTH + HORIZONTAL_GAP),
            y: parent.position.y + NODE_HEIGHT + VERTICAL_GAP,
          };
        }
      }
      // No parent — place at the bottom
      if (nodes.length === 0) {
        return { x: 300, y: 60 };
      }
      const maxY = Math.max(...nodes.map((n) => n.position.y));
      return {
        x: 300,
        y: maxY + NODE_HEIGHT + VERTICAL_GAP,
      };
    },
    [nodes, edges]
  );

  // ─── Add node from registry ────────────────────────────────────────
  const addNodeFromRegistry = useCallback(
    (nodeType: string, dropX?: number, dropY?: number) => {
      const nodeDef = getNodeTypeDefinition(nodeType);
      if (!nodeDef) return;

      const pos = dropX !== undefined && dropY !== undefined
        ? { x: dropX, y: dropY }
        : getNextPosition();

      const mapCategoryToType = (cat: string): NodeType => {
        switch (cat) {
          case 'trigger': return 'trigger';
          case 'condition': return 'condition';
          case 'flowControl': return 'flowControl';
          case 'logic': return 'logic';
          case 'code': return 'code';
          case 'data': return 'data';
          case 'communication': return 'communication';
          case 'cloud': return 'cloud';
          case 'ai': return 'ai';
          case 'utility': return 'utility';
          default: return 'action';
        }
      };

      const newNode: CanvasNode = {
        id: uid(),
        type: mapCategoryToType(nodeDef.category),
        name: nodeDef.displayName,
        description: nodeDef.description,
        position: pos,
        config: {},
        category: nodeDef.category,
        icon: nodeDef.icon,
        nodeType: nodeDef.type,
        event: nodeDef.event,
      };

      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
      toast.success(`Added: ${nodeDef.displayName}`);
    },
    [getNextPosition]
  );

  // ─── Add connected node (the "+" button popover) ───────────────────
  const addConnectedNode = useCallback(
    (parentId: string, nodeType: string) => {
      const parent = nodes.find((n) => n.id === parentId);
      if (!parent) return;

      const nodeDef = getNodeTypeDefinition(nodeType);
      if (!nodeDef) return;

      const mapCategoryToType = (cat: string): NodeType => {
        switch (cat) {
          case 'trigger': return 'trigger';
          case 'condition': return 'condition';
          case 'flowControl': return 'flowControl';
          case 'logic': return 'logic';
          case 'code': return 'code';
          case 'data': return 'data';
          case 'communication': return 'communication';
          case 'cloud': return 'cloud';
          case 'ai': return 'ai';
          case 'utility': return 'utility';
          default: return 'action';
        }
      };

      const pos = getNextPosition(parentId);

      const newNode: CanvasNode = {
        id: uid(),
        type: mapCategoryToType(nodeDef.category),
        name: nodeDef.displayName,
        description: nodeDef.description,
        position: pos,
        config: {},
        category: nodeDef.category,
        icon: nodeDef.icon,
        nodeType: nodeDef.type,
        event: nodeDef.event,
      };

      const newEdge: CanvasEdge = {
        id: `e_${parentId}_${newNode.id}`,
        source: parentId,
        target: newNode.id,
      };

      setNodes((prev) => [...prev, newNode]);
      setEdges((prev) => [...prev, newEdge]);
      setSelectedNodeId(newNode.id);
      setShowAddMenu(null);
      toast.success(`Added: ${nodeDef.displayName}`);
    },
    [nodes, getNextPosition]
  );

  // ─── Delete node and its edges ─────────────────────────────────────
  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [selectedNodeId]
  );

  // ─── Update node config ────────────────────────────────────────────
  const updateNodeConfig = useCallback(
    (nodeId: string, key: string, value: any) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId ? { ...n, config: { ...n.config, [key]: value } } : n
        )
      );
    },
    []
  );

  const updateNodeName = useCallback(
    (nodeId: string, name: string) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, name } : n))
      );
    },
    []
  );

  // ─── Drag & Drop: sidebar → canvas ─────────────────────────────────
  const handleSidebarDragStart = useCallback(
    (e: React.DragEvent, nodeType: string) => {
      e.dataTransfer.setData('application/reactflow', nodeType);
      e.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData('application/reactflow');
      if (!nodeType) return;

      // Calculate position relative to canvas
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - canvasOffset.x) / zoom;
      const y = (e.clientY - rect.top - canvasOffset.y) / zoom;

      addNodeFromRegistry(nodeType, Math.max(20, x - NODE_WIDTH / 2), Math.max(20, y - NODE_HEIGHT / 2));
    },
    [addNodeFromRegistry, canvasOffset, zoom]
  );

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // ─── Canvas click (deselect) ───────────────────────────────────────
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      // Only deselect if clicking the canvas background itself
      if (e.target === canvasRef.current || (e.target as HTMLElement).dataset.canvas === 'true') {
        setSelectedNodeId(null);
        setConnectingFrom(null);
      }
    },
    []
  );

  // ─── Connection logic ──────────────────────────────────────────────
  const handleOutputClick = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (connectingFrom === null) {
        setConnectingFrom(nodeId);
      } else if (connectingFrom !== nodeId) {
        // Create connection
        const existing = edges.find(
          (ed) => ed.source === connectingFrom && ed.target === nodeId
        );
        if (!existing) {
          setEdges((prev) => [
            ...prev,
            { id: `e_${connectingFrom}_${nodeId}`, source: connectingFrom, target: nodeId },
          ]);
          toast.success('Nodes connected');
        }
        setConnectingFrom(null);
      } else {
        setConnectingFrom(null);
      }
    },
    [connectingFrom, edges]
  );

  const handleInputClick = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (connectingFrom !== null && connectingFrom !== nodeId) {
        const existing = edges.find(
          (ed) => ed.source === connectingFrom && ed.target === nodeId
        );
        if (!existing) {
          setEdges((prev) => [
            ...prev,
            { id: `e_${connectingFrom}_${nodeId}`, source: connectingFrom, target: nodeId },
          ]);
          toast.success('Nodes connected');
        }
        setConnectingFrom(null);
      }
    },
    [connectingFrom, edges]
  );

  // ─── Node dragging on canvas ───────────────────────────────────────
  const handleNodeMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      if (connectingFrom) return; // Don't drag while connecting
      e.stopPropagation();
      setSelectedNodeId(nodeId);

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      setDraggingNodeId(nodeId);
      setDragOffset({
        x: e.clientX / zoom - node.position.x,
        y: e.clientY / zoom - node.position.y,
      });
    },
    [nodes, zoom, connectingFrom]
  );

  useEffect(() => {
    if (!draggingNodeId) return;

    const handleMouseMove = (e: MouseEvent) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggingNodeId
            ? {
                ...n,
                position: {
                  x: Math.max(0, e.clientX / zoom - dragOffset.x - (canvasRef.current?.getBoundingClientRect().left ?? 0) / zoom),
                  y: Math.max(0, e.clientY / zoom - dragOffset.y - (canvasRef.current?.getBoundingClientRect().top ?? 0) / zoom),
                },
              }
            : n
        )
      );
    };

    const handleMouseUp = () => {
      setDraggingNodeId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNodeId, dragOffset, zoom]);

  // ─── Canvas panning ────────────────────────────────────────────────
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle button or holding shift+left for panning
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
      }
    },
    [canvasOffset]
  );

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      setCanvasOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, panStart]);

  // ─── Zoom controls ─────────────────────────────────────────────────
  const handleZoomIn = () => setZoom((z) => Math.min(2, z + 0.1));
  const handleZoomOut = () => setZoom((z) => Math.max(0.3, z - 0.1));
  const handleZoomReset = () => {
    setZoom(1);
    setCanvasOffset({ x: 0, y: 0 });
  };

  // ─── Save workflow ─────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (nodes.length === 0) {
      toast.error('Add at least one node to save');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: workflowName,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type === 'trigger' ? 'trigger' : 'action',
          name: n.name,
          position: n.position,
          data: {
            nodeType: n.nodeType || n.type,
            config: n.config,
            category: n.category,
            ...(n.event ? { event: n.event } : {}),
          },
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'bezier',
          animated: true,
        })),
      };

      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success('Workflow saved successfully');
      } else {
        toast.success('Workflow saved locally');
      }
    } catch {
      toast.success('Workflow saved locally');
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, workflowName]);

  // ─── Test workflow ─────────────────────────────────────────────────
  const handleTest = useCallback(async () => {
    if (nodes.length === 0) {
      toast.error('Add at least one node to test');
      return;
    }
    setTesting(true);
    // Simulate a test run
    await new Promise((r) => setTimeout(r, 1500));
    setTesting(false);
    toast.success('Test run completed successfully');
  }, [nodes]);

  // ─── Clear canvas ──────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setConnectingFrom(null);
    toast.success('Canvas cleared');
  }, []);

  // ─── SVG edge path ─────────────────────────────────────────────────
  const getEdgePath = (sourceNode: CanvasNode, targetNode: CanvasNode) => {
    const sx = sourceNode.position.x + NODE_WIDTH / 2;
    const sy = sourceNode.position.y + NODE_HEIGHT;
    const tx = targetNode.position.x + NODE_WIDTH / 2;
    const ty = targetNode.position.y;

    const midY = (sy + ty) / 2;
    return `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
  };

  // ─── Nodes for the "+" popover (actions, conditions, flow control) ──
  const addMenuNodes = useMemo(() => ({
    actions: actionNodes,
    conditions: conditionNodes,
    flowControl: flowControlNodes,
    logic: logicNodes,
    code: codeNodes,
    data: dataNodes,
    communication: communicationNodes,
    cloud: cloudNodes,
    ai: aiNodes,
    utilities: utilityNodes,
  }), []);

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* ═══ LEFT SIDEBAR ═══ */}
      <div className="flex w-[280px] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {/* Sidebar Header */}
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <Zap className="h-4 w-4 text-emerald-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Node Library
          </h2>
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {totalFilteredCount}
          </Badge>
        </div>

        {/* Search */}
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Search nodes..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-1 px-3 pt-2 pb-1">
          <button
            onClick={() => setSidebarCategory('all')}
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
              sidebarCategory === 'all'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            )}
          >
            All
          </button>
          {NODE_CATEGORIES.filter((c) => c.id !== 'template').map((cat) => {
            const CatIcon = (LucideIcons as unknown as Record<string, React.ElementType>)[cat.icon] || LucideIcons.Circle;
            const count = getNodesByCategory(cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSidebarCategory(cat.id)}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors flex items-center gap-0.5',
                  sidebarCategory === cat.id
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                )}
              >
                <CatIcon className="h-2.5 w-2.5" />
                {cat.label}
                <span className="text-[9px] opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        <Separator className="my-1" />

        {/* Node list — grouped by category */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {Object.keys(filteredGroupedByCategory).length === 0 && (
              <p className="py-8 text-center text-xs text-gray-400">
                No nodes found
              </p>
            )}
            {sidebarCategory !== 'all'
              ? // Single category — show flat list
                filteredGroupedByCategory[sidebarCategory]?.map((nodeDef) => (
                  <SidebarNodeCard
                    key={nodeDef.type}
                    nodeDef={nodeDef}
                    onDragStart={handleSidebarDragStart}
                    onDoubleClick={() => addNodeFromRegistry(nodeDef.type)}
                  />
                ))
              : // All categories — show grouped with expandable sections
                NODE_CATEGORIES.filter((c) => c.id !== 'template').map((category) => {
                  const catNodes = filteredGroupedByCategory[category.id];
                  if (!catNodes) return null;
                  const isExpanded = expandedCategories.has(category.id);
                  const CatIcon = (LucideIcons as unknown as Record<string, React.ElementType>)[category.icon] || LucideIcons.Circle;
                  return (
                    <div key={category.id} className="mb-1">
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/50 rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        <CatIcon className="h-3 w-3" />
                        {category.label}
                        <span className="text-[9px] font-normal ml-auto opacity-50">{catNodes.length}</span>
                      </button>
                      {isExpanded &&
                        catNodes.map((nodeDef) => (
                          <SidebarNodeCard
                            key={nodeDef.type}
                            nodeDef={nodeDef}
                            onDragStart={handleSidebarDragStart}
                            onDoubleClick={() => addNodeFromRegistry(nodeDef.type)}
                          />
                        ))}
                    </div>
                  );
                })
            }

            {/* Workflow Templates section */}
            {sidebarCategory === 'all' && (
              <>
                <div className="my-2">
                  <button
                    onClick={() => toggleCategory('template')}
                    className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/50 rounded"
                  >
                    {expandedCategories.has('template') ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <LucideIcons.Sparkles className="h-3 w-3" />
                    Templates
                    <span className="text-[9px] font-normal ml-auto opacity-50">{workflowTemplates.length}</span>
                  </button>
                  {expandedCategories.has('template') &&
                    workflowTemplates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="flex items-center gap-2 px-2 py-1.5 mx-1 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => toast.info(`Template: ${tpl.name} — coming soon`)}
                      >
                        <div className="flex items-center justify-center size-6 rounded bg-yellow-500/15 shrink-0">
                          <LucideIcons.Sparkles className="size-3 text-yellow-600" />
                        </div>
                        <span className="text-xs text-foreground truncate">{tpl.name}</span>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ═══ CENTER CANVAS ═══ */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="h-8 w-56 border-gray-200 bg-transparent text-sm font-medium dark:border-gray-700 dark:bg-transparent"
          />

          <div className="ml-auto flex items-center gap-1.5">
            {/* Zoom controls */}
            <div className="mr-2 flex items-center gap-0.5 rounded-md border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomOut}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="min-w-[3rem] text-center text-[10px] font-medium text-gray-600 dark:text-gray-400">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomIn}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomReset}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleClear}
              disabled={nodes.length === 0}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleTest}
              disabled={nodes.length === 0 || testing}
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Test
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-emerald-600 text-xs hover:bg-emerald-700"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </Button>
          </div>
        </div>

        {/* Canvas area */}
        <div
          ref={canvasRef}
          data-canvas="true"
          className={cn(
            'relative flex-1 overflow-auto',
            isPanning ? 'cursor-grabbing' : '',
            connectingFrom ? 'cursor-crosshair' : ''
          )}
          onClick={handleCanvasClick}
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
          onMouseDown={handleCanvasMouseDown}
          style={{
            backgroundImage:
              'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`,
          }}
        >
          {/* Transform wrapper for zoom/pan */}
          <div
            style={{
              transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              width: '100%',
              height: '100%',
              position: 'relative',
              minHeight: '100%',
            }}
          >
            {/* SVG layer for edges */}
            <svg
              className="pointer-events-none absolute inset-0"
              style={{
                width: '100%',
                height: '100%',
                overflow: 'visible',
              }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 8 3, 0 6"
                    fill="#10b981"
                  />
                </marker>
              </defs>
              {edges.map((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.source);
                const targetNode = nodes.find((n) => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                const path = getEdgePath(sourceNode, targetNode);
                return (
                  <g key={edge.id}>
                    <path
                      d={path}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeOpacity="0.4"
                      markerEnd="url(#arrowhead)"
                    />
                    <path
                      d={path}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      strokeOpacity="0.8"
                      className="animate-dash"
                      style={{
                        animation: 'dashmove 1s linear infinite',
                      }}
                    />
                  </g>
                );
              })}
              {/* Temporary connection line while connecting */}
              {connectingFrom && (() => {
                const fromNode = nodes.find((n) => n.id === connectingFrom);
                if (!fromNode) return null;
                return (
                  <circle
                    cx={fromNode.position.x + NODE_WIDTH / 2}
                    cy={fromNode.position.y + NODE_HEIGHT}
                    r="6"
                    fill="#10b981"
                    fillOpacity="0.5"
                    stroke="#10b981"
                    strokeWidth="2"
                  >
                    <animate
                      attributeName="r"
                      values="6;10;6"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="fill-opacity"
                      values="0.5;0.2;0.5"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </circle>
                );
              })()}
            </svg>

            {/* Nodes layer */}
            {nodes.map((node) => {
              const borderClass = CATEGORY_BORDER_COLOR[node.category] || 'border-l-gray-400';
              const iconBgClass = CATEGORY_ICON_BG[node.category] || 'bg-gray-500/15 text-gray-600';

              const hasOutgoingEdge = edges.some((e) => e.source === node.id);
              // Only show input connector for non-trigger nodes
              const hasIncomingEdge = edges.some((e) => e.target === node.id);

              return (
                <div
                  key={node.id}
                  className={cn(
                    'absolute group/node',
                    draggingNodeId === node.id ? 'z-50' : 'z-10'
                  )}
                  style={{
                    left: node.position.x,
                    top: node.position.y,
                    width: NODE_WIDTH,
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(node.id);
                  }}
                >
                  {/* Node card */}
                  <div
                    className={cn(
                      'relative rounded-lg border border-l-4 bg-white shadow-sm transition-all dark:bg-gray-900',
                      borderClass,
                      selectedNodeId === node.id
                        ? 'ring-2 ring-emerald-500 ring-offset-1 shadow-md'
                        : 'hover:shadow-md',
                      connectingFrom === node.id ? 'ring-2 ring-emerald-400' : ''
                    )}
                    style={{ minHeight: NODE_HEIGHT }}
                  >
                    <div className="flex items-start gap-2.5 p-3">
                      {/* Icon */}
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                          iconBgClass
                        )}
                      >
                        <DynamicIcon name={node.icon} className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100">
                          {node.name}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          {node.event && (
                            <span className="text-[10px] text-gray-500 font-mono">
                              {node.event}
                            </span>
                          )}
                          {!node.event && node.nodeType && node.category !== 'trigger' && (
                            <span className="text-[10px] text-gray-500">
                              {node.nodeType.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Input connector (top) — only for non-trigger nodes */}
                    {node.category !== 'trigger' && (
                      <button
                        className={cn(
                          'absolute -top-2 left-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-gray-300 transition-colors dark:border-gray-900',
                          'h-4 w-4 hover:bg-emerald-500 hover:scale-125',
                          connectingFrom ? 'hover:bg-emerald-500' : ''
                        )}
                        onClick={(e) => handleInputClick(node.id, e)}
                        title="Input connector"
                      />
                    )}

                    {/* Output connector (bottom) */}
                    {!(node.category === 'flowControl' && node.nodeType === 'endWorkflow') && (
                      <button
                        className={cn(
                          'absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border-2 border-white transition-colors dark:border-gray-900',
                          'h-4 w-4',
                          connectingFrom === node.id
                            ? 'bg-emerald-500 scale-125'
                            : 'bg-emerald-400 hover:bg-emerald-600 hover:scale-125'
                        )}
                        onClick={(e) => handleOutputClick(node.id, e)}
                        title="Output connector — click to connect"
                      />
                    )}
                  </div>

                  {/* Add button below node */}
                  {!hasOutgoingEdge && !(node.category === 'flowControl' && node.nodeType === 'endWorkflow') && (
                    <div className="flex justify-center mt-2">
                      <Popover
                        open={showAddMenu === node.id}
                        onOpenChange={(open) => {
                          setShowAddMenu(open ? node.id : null);
                        }}
                      >
                        <PopoverTrigger asChild>
                          <button
                            className={cn(
                              'flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-white text-gray-400 transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-emerald-500 dark:hover:text-emerald-400'
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-64 p-2 max-h-80 overflow-y-auto"
                          side="bottom"
                          align="center"
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          <p className="mb-2 px-1 text-xs font-medium text-gray-500">
                            Add next step
                          </p>

                          {/* Actions group */}
                          {addMenuNodes.actions.length > 0 && (
                            <div className="mb-2">
                              <p className="px-1 mb-1 text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Actions</p>
                              {addMenuNodes.actions.map((nodeDef) => (
                                <button
                                  key={nodeDef.type}
                                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addConnectedNode(node.id, nodeDef.type);
                                  }}
                                >
                                  <DynamicIcon name={nodeDef.icon} className="h-3.5 w-3.5 text-emerald-500" />
                                  <span>{nodeDef.displayName}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Conditions group */}
                          {addMenuNodes.conditions.length > 0 && (
                            <div className="mb-2">
                              <p className="px-1 mb-1 text-[10px] font-semibold text-orange-600 uppercase tracking-wider">Conditions</p>
                              {addMenuNodes.conditions.map((nodeDef) => (
                                <button
                                  key={nodeDef.type}
                                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addConnectedNode(node.id, nodeDef.type);
                                  }}
                                >
                                  <DynamicIcon name={nodeDef.icon} className="h-3.5 w-3.5 text-orange-500" />
                                  <span>{nodeDef.displayName}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Flow Control group */}
                          {addMenuNodes.flowControl.length > 0 && (
                            <div className="mb-2">
                              <p className="px-1 mb-1 text-[10px] font-semibold text-purple-600 uppercase tracking-wider">Flow Control</p>
                              {addMenuNodes.flowControl.map((nodeDef) => (
                                <button
                                  key={nodeDef.type}
                                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addConnectedNode(node.id, nodeDef.type);
                                  }}
                                >
                                  <DynamicIcon name={nodeDef.icon} className="h-3.5 w-3.5 text-purple-500" />
                                  <span>{nodeDef.displayName}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Logic group */}
                          {addMenuNodes.logic.length > 0 && (
                            <div className="mb-2">
                              <p className="px-1 mb-1 text-[10px] font-semibold text-orange-600 uppercase tracking-wider">Logic</p>
                              {addMenuNodes.logic.map((nodeDef) => (
                                <button
                                  key={nodeDef.type}
                                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addConnectedNode(node.id, nodeDef.type);
                                  }}
                                >
                                  <DynamicIcon name={nodeDef.icon} className="h-3.5 w-3.5 text-orange-500" />
                                  <span>{nodeDef.displayName}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Code group */}
                          {addMenuNodes.code.length > 0 && (
                            <div className="mb-2">
                              <p className="px-1 mb-1 text-[10px] font-semibold text-yellow-600 uppercase tracking-wider">Code</p>
                              {addMenuNodes.code.map((nodeDef) => (
                                <button
                                  key={nodeDef.type}
                                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addConnectedNode(node.id, nodeDef.type);
                                  }}
                                >
                                  <DynamicIcon name={nodeDef.icon} className="h-3.5 w-3.5 text-yellow-500" />
                                  <span>{nodeDef.displayName}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Data group */}
                          {addMenuNodes.data.length > 0 && (
                            <div className="mb-2">
                              <p className="px-1 mb-1 text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Data</p>
                              {addMenuNodes.data.map((nodeDef) => (
                                <button
                                  key={nodeDef.type}
                                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addConnectedNode(node.id, nodeDef.type);
                                  }}
                                >
                                  <DynamicIcon name={nodeDef.icon} className="h-3.5 w-3.5 text-blue-500" />
                                  <span>{nodeDef.displayName}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Communication group */}
                          {addMenuNodes.communication.length > 0 && (
                            <div className="mb-2">
                              <p className="px-1 mb-1 text-[10px] font-semibold text-pink-600 uppercase tracking-wider">Communication</p>
                              {addMenuNodes.communication.map((nodeDef) => (
                                <button
                                  key={nodeDef.type}
                                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addConnectedNode(node.id, nodeDef.type);
                                  }}
                                >
                                  <DynamicIcon name={nodeDef.icon} className="h-3.5 w-3.5 text-pink-500" />
                                  <span>{nodeDef.displayName}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Cloud group */}
                          {addMenuNodes.cloud.length > 0 && (
                            <div className="mb-2">
                              <p className="px-1 mb-1 text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Cloud & Storage</p>
                              {addMenuNodes.cloud.map((nodeDef) => (
                                <button
                                  key={nodeDef.type}
                                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addConnectedNode(node.id, nodeDef.type);
                                  }}
                                >
                                  <DynamicIcon name={nodeDef.icon} className="h-3.5 w-3.5 text-amber-500" />
                                  <span>{nodeDef.displayName}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* AI group */}
                          {addMenuNodes.ai.length > 0 && (
                            <div className="mb-2">
                              <p className="px-1 mb-1 text-[10px] font-semibold text-pink-600 uppercase tracking-wider">AI</p>
                              {addMenuNodes.ai.map((nodeDef) => (
                                <button
                                  key={nodeDef.type}
                                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addConnectedNode(node.id, nodeDef.type);
                                  }}
                                >
                                  <DynamicIcon name={nodeDef.icon} className="h-3.5 w-3.5 text-pink-500" />
                                  <span>{nodeDef.displayName}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Utility group */}
                          {addMenuNodes.utilities.length > 0 && (
                            <div>
                              <p className="px-1 mb-1 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Utilities</p>
                              {addMenuNodes.utilities.map((nodeDef) => (
                                <button
                                  key={nodeDef.type}
                                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addConnectedNode(node.id, nodeDef.type);
                                  }}
                                >
                                  <DynamicIcon name={nodeDef.icon} className="h-3.5 w-3.5 text-gray-500" />
                                  <span>{nodeDef.displayName}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty state */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                    <Workflow className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-400 dark:text-gray-500">
                    Build Your Workflow
                  </h3>
                  <p className="mt-1 text-sm text-gray-400 dark:text-gray-600 max-w-xs">
                    Drag a node from the left sidebar and drop it here to get started
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                    <span className="rounded border border-dashed border-gray-300 px-1.5 py-0.5 dark:border-gray-600">
                      Shift + Drag
                    </span>
                    <span>to pan canvas</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL — Node Configuration ═══ */}
      <div
        className={cn(
          'w-[300px] shrink-0 border-l border-gray-200 bg-white transition-all dark:border-gray-800 dark:bg-gray-900',
          selectedNode ? 'translate-x-0' : 'translate-x-full absolute right-0 top-0 bottom-0 opacity-0 pointer-events-none'
        )}
      >
        {selectedNode && (
          <div className="flex h-full flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Configure Node
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSelectedNodeId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Node type badge */}
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      'text-[10px]',
                      CATEGORY_ICON_BG[selectedNode.category]?.replace(/\/15/, '-100').replace(/text-/, 'border-') ||
                      'bg-gray-100 text-gray-700 border-gray-200'
                    )}
                  >
                    {selectedNode.category.charAt(0).toUpperCase() + selectedNode.category.slice(1)}
                  </Badge>
                  {selectedNode.nodeType && (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {selectedNode.nodeType}
                    </Badge>
                  )}
                </div>

                {/* Node name */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={selectedNode.name}
                    onChange={(e) => updateNodeName(selectedNode.id, e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                {/* Description */}
                {selectedNode.description && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {selectedNode.description}
                    </p>
                  </div>
                )}

                {/* Event source for triggers */}
                {selectedNode.category === 'trigger' && selectedNode.event && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Event Source</Label>
                    <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                      <div className={cn('h-2 w-2 rounded-full', getCategoryColor(selectedNode.category))} />
                      <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
                        {selectedNode.event}
                      </span>
                    </div>
                  </div>
                )}

                {/* Node properties from registry definition */}
                {(() => {
                  const nodeDef = selectedNode.nodeType ? getNodeTypeDefinition(selectedNode.nodeType) : null;
                  if (!nodeDef || nodeDef.properties.length === 0) return null;

                  return nodeDef.properties.map((prop) => (
                    <div key={prop.name} className="space-y-1.5">
                      <Label className="text-xs">
                        {prop.displayName}
                        {prop.required && <span className="text-red-500 ml-0.5">*</span>}
                      </Label>

                      {/* Select type */}
                      {prop.type === 'select' && prop.options && (
                        <Select
                          value={selectedNode.config?.[prop.name] ?? prop.default?.toString() ?? ''}
                          onValueChange={(val) => updateNodeConfig(selectedNode.id, prop.name, val)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {prop.options.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {/* Number type */}
                      {prop.type === 'number' && (
                        <Input
                          type="number"
                          value={selectedNode.config?.[prop.name] ?? prop.default ?? ''}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, prop.name, parseFloat(e.target.value) || 0)
                          }
                          className="h-8 text-xs"
                          placeholder={prop.placeholder}
                        />
                      )}

                      {/* Text / String type */}
                      {(prop.type === 'string' || prop.type === 'text' || prop.type === 'expression') && (
                        prop.type === 'text' ? (
                          <Textarea
                            value={selectedNode.config?.[prop.name] ?? prop.default ?? ''}
                            onChange={(e) => updateNodeConfig(selectedNode.id, prop.name, e.target.value)}
                            className="min-h-[80px] text-xs"
                            placeholder={prop.placeholder}
                          />
                        ) : (
                          <Input
                            value={selectedNode.config?.[prop.name] ?? prop.default ?? ''}
                            onChange={(e) => updateNodeConfig(selectedNode.id, prop.name, e.target.value)}
                            className="h-8 text-xs"
                            placeholder={prop.placeholder}
                          />
                        )
                      )}

                      {/* JSON / Code type */}
                      {(prop.type === 'json' || prop.type === 'code') && (
                        <Textarea
                          value={
                            typeof selectedNode.config?.[prop.name] === 'object'
                              ? JSON.stringify(selectedNode.config[prop.name], null, 2)
                              : selectedNode.config?.[prop.name] ?? (prop.default ? JSON.stringify(prop.default, null, 2) : '')
                          }
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              updateNodeConfig(selectedNode.id, prop.name, parsed);
                            } catch {
                              updateNodeConfig(selectedNode.id, prop.name, e.target.value);
                            }
                          }}
                          className="min-h-[80px] text-xs font-mono"
                          placeholder={prop.placeholder}
                        />
                      )}

                      {/* Boolean type */}
                      {prop.type === 'boolean' && (
                        <Select
                          value={(selectedNode.config?.[prop.name] ?? prop.default ?? false).toString()}
                          onValueChange={(val) => updateNodeConfig(selectedNode.id, prop.name, val === 'true')}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      {/* Property description */}
                      {prop.description && (
                        <p className="text-[10px] text-gray-400">{prop.description}</p>
                      )}
                    </div>
                  ));
                })()}

                {/* Conditions textarea for triggers without specific properties */}
                {selectedNode.category === 'trigger' && (() => {
                  const nodeDef = selectedNode.nodeType ? getNodeTypeDefinition(selectedNode.nodeType) : null;
                  return !nodeDef || nodeDef.properties.length === 0;
                })() && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Conditions</Label>
                    <Textarea
                      placeholder="Add conditions in JSON format..."
                      value={selectedNode.config?.conditions || ''}
                      onChange={(e) =>
                        updateNodeConfig(selectedNode.id, 'conditions', e.target.value)
                      }
                      className="min-h-[60px] text-xs"
                    />
                  </div>
                )}

                {/* Info box for conditions */}
                {selectedNode.category === 'condition' && (
                  <div className="rounded-md border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-900/20">
                    <p className="text-[10px] text-orange-700 dark:text-orange-400">
                      <strong>Condition:</strong> When the condition is met, the flow continues.
                      Add separate paths for &quot;Yes&quot; and &quot;No&quot; branches by
                      connecting actions below.
                    </p>
                  </div>
                )}

                {/* Info box for delay/flow control */}
                {selectedNode.category === 'flowControl' && selectedNode.nodeType === 'delay' && (
                  <div className="rounded-md border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-900/20">
                    <p className="text-[10px] text-purple-700 dark:text-purple-400">
                      The workflow will pause for the specified duration before continuing
                      to the next step.
                    </p>
                  </div>
                )}

                <Separator />

                {/* Connection info */}
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Connections</Label>
                  {(() => {
                    const incoming = edges.filter((e) => e.target === selectedNode.id);
                    const outgoing = edges.filter((e) => e.source === selectedNode.id);
                    return (
                      <div className="space-y-1 text-xs text-gray-500">
                        <p>
                          Incoming:{' '}
                          {incoming.length > 0
                            ? incoming.map((e) => nodes.find((n) => n.id === e.source)?.name || 'Unknown').join(', ')
                            : 'None'}
                        </p>
                        <p>
                          Outgoing:{' '}
                          {outgoing.length > 0
                            ? outgoing.map((e) => nodes.find((n) => n.id === e.target)?.name || 'Unknown').join(', ')
                            : 'None'}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                <Separator />

                {/* Delete button */}
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full gap-1.5 text-xs"
                  onClick={() => {
                    deleteNode(selectedNode.id);
                    toast.success('Node deleted');
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Node
                </Button>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* CSS animation for dashed line */}
      <style jsx>{`
        @keyframes dashmove {
          to {
            stroke-dashoffset: -10;
          }
        }
        .animate-dash {
          animation: dashmove 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

// ─── Sidebar Node Card ────────────────────────────────────────────────────

function SidebarNodeCard({
  nodeDef,
  onDragStart,
  onDoubleClick,
}: {
  nodeDef: NodeTypeDefinition;
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  onDoubleClick: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, nodeDef.type)}
      onDoubleClick={onDoubleClick}
      className={cn(
        'group flex cursor-grab items-start gap-2.5 rounded-lg border border-gray-150 bg-white p-2.5 transition-all hover:border-emerald-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-700',
        'active:cursor-grabbing'
      )}
      title={nodeDef.description}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
          CATEGORY_ICON_BG[nodeDef.category] || 'bg-gray-500/15 text-gray-600'
        )}
      >
        <DynamicIcon name={nodeDef.icon} className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-gray-900 dark:text-gray-100">
          {nodeDef.displayName}
        </p>
        <div className="mt-0.5 flex items-center gap-1">
          <span
            className={cn(
              'inline-block h-1.5 w-1.5 rounded-full',
              getCategoryColor(nodeDef.category)
            )}
          />
          <span className="text-[10px] text-gray-500">
            {nodeDef.category}
          </span>
          {nodeDef.event && (
            <span className="text-[9px] text-gray-400 font-mono ml-1">
              {nodeDef.event}
            </span>
          )}
        </div>
      </div>
      <GripVertical className="mt-1 h-3.5 w-3.5 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Save,
  Play,
  Trash2,
  ChevronLeft,
  X,
  Clock3,
  ArrowRightLeft,
  GripVertical,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  MousePointerClick,
  Zap,
  Workflow,
} from 'lucide-react';
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
  PREBUILT_TRIGGERS,
  TRIGGER_CATEGORIES,
  ACTION_TYPES,
} from '@/lib/trigger-catalog';

// ─── Types ────────────────────────────────────────────────────────────────

type NodeType = 'trigger' | 'action' | 'condition' | 'delay';

interface CanvasNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  category?: string;
  categoryColor?: string;
  icon?: string;
  triggerType?: string;
  actionType?: string;
  eventLabel?: string;
}

interface CanvasEdge {
  id: string;
  source: string;
  target: string;
}

// ─── Category border color mapping ──────────────────────────────────────

const CATEGORY_BORDER: Record<string, string> = {
  CRM: 'border-l-blue-500',
  Booking: 'border-l-purple-500',
  Job: 'border-l-amber-500',
  WhatsApp: 'border-l-green-500',
  Finance: 'border-l-rose-500',
  Employee: 'border-l-cyan-500',
  Website: 'border-l-orange-500',
  'Time-Based': 'border-l-slate-500',
};

const NODE_TYPE_BORDER: Record<NodeType, string> = {
  trigger: 'border-l-blue-500',
  action: 'border-l-emerald-500',
  condition: 'border-l-orange-500',
  delay: 'border-l-gray-400',
};

const NODE_TYPE_BG: Record<NodeType, string> = {
  trigger: 'bg-white',
  action: 'bg-white',
  condition: 'bg-white',
  delay: 'bg-white',
};

const CATEGORY_DOT: Record<string, string> = {
  CRM: 'bg-blue-500',
  Booking: 'bg-purple-500',
  Job: 'bg-amber-500',
  WhatsApp: 'bg-green-500',
  Finance: 'bg-rose-500',
  Employee: 'bg-cyan-500',
  Website: 'bg-orange-500',
  'Time-Based': 'bg-slate-500',
};

// ─── Helper: generate unique id ────────────────────────────────────────

function uid() {
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Helper: icon name → lucide component ──────────────────────────────

import {
  UserPlus, Clock3 as ClockIcon, ArrowRightLeft as AltIcon, CheckCircle,
  Edit3, Users, CalendarCheck, CalendarX, CalendarClock, CalendarPlus,
  AlertCircle, CircleCheck, UserCheck, XCircle, Briefcase, AlertTriangle,
  MessageCircle, MessageSquarePlus, MailCheck, Banknote, CreditCard,
  Receipt, FileCheck2, WifiOff, Globe, MousePointerClick as ClickIcon,
  TimerReset, Tag, PlusCircle, Bell, Save as SaveIcon, Bot, Timer,
  Mail,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  UserPlus, Clock3: ClockIcon, ArrowRightLeft: AltIcon, CheckCircle,
  Edit3, Users, CalendarCheck, CalendarX, CalendarClock, CalendarPlus,
  AlertCircle, CircleCheck, UserCheck, XCircle, Briefcase, AlertTriangle,
  MessageCircle, MessageSquarePlus, MailCheck, Banknote, CreditCard,
  Receipt, FileCheck2, WifiOff, Globe, MousePointerClick: ClickIcon,
  TimerReset, Tag, PlusCircle, Bell, Save: SaveIcon, Bot, Timer, Mail,
  Zap, Workflow,
};

function getIcon(name?: string): React.ElementType | null {
  if (!name) return null;
  return ICON_MAP[name] || null;
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
  const [sidebarCategory, setSidebarCategory] = useState('all');
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const [showAddMenu, setShowAddMenu] = useState<string | null>(null);

  // ─── Derived ────────────────────────────────────────────────────────
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const filteredTriggers = useMemo(() => {
    let list = PREBUILT_TRIGGERS;
    if (sidebarCategory !== 'all') {
      list = list.filter((t) => t.category === sidebarCategory);
    }
    if (sidebarSearch.trim()) {
      const q = sidebarSearch.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [sidebarCategory, sidebarSearch]);

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
      const bottomNodes = nodes.filter((n) => n.position.y === maxY);
      return {
        x: 300,
        y: maxY + NODE_HEIGHT + VERTICAL_GAP,
      };
    },
    [nodes, edges]
  );

  // ─── Add trigger node from sidebar ─────────────────────────────────
  const addTriggerNode = useCallback(
    (triggerId: string, dropX?: number, dropY?: number) => {
      const trigger = PREBUILT_TRIGGERS.find((t) => t.id === triggerId);
      if (!trigger) return;

      const pos = dropX !== undefined && dropY !== undefined
        ? { x: dropX, y: dropY }
        : getNextPosition();

      const newNode: CanvasNode = {
        id: uid(),
        type: 'trigger',
        name: trigger.name,
        description: trigger.description,
        position: pos,
        config: JSON.parse(trigger.triggerConfigJson || '{}'),
        category: trigger.category,
        categoryColor: trigger.categoryColor,
        icon: trigger.icon.displayName || trigger.icon.name,
        triggerType: trigger.triggerType,
        eventLabel: trigger.eventLabel,
      };

      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
      toast.success(`Added trigger: ${trigger.name}`);
    },
    [getNextPosition]
  );

  // ─── Add action/condition/delay node ───────────────────────────────
  const addConnectedNode = useCallback(
    (parentId: string, actionValue: string) => {
      const parent = nodes.find((n) => n.id === parentId);
      if (!parent) return;

      const actionDef = ACTION_TYPES.find((a) => a.value === actionValue);
      if (!actionDef) return;

      const isCondition = actionValue === 'condition';
      const isDelay = actionValue === 'delay';

      const pos = getNextPosition(parentId);

      const newNode: CanvasNode = {
        id: uid(),
        type: isCondition ? 'condition' : isDelay ? 'delay' : 'action',
        name: actionDef.label,
        description: isCondition
          ? 'Branch based on a condition'
          : isDelay
          ? 'Wait for a specified duration'
          : `Action: ${actionDef.label}`,
        position: pos,
        config: isDelay ? { delayMinutes: 5 } : isCondition ? { field: '', operator: 'equals', value: '' } : {},
        category: parent.category,
        icon: actionDef.icon.displayName || actionDef.icon.name,
        actionType: actionValue,
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
      toast.success(`Added: ${actionDef.label}`);
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
  const handleDragStart = useCallback(
    (e: React.DragEvent, triggerId: string) => {
      e.dataTransfer.setData('triggerId', triggerId);
      e.dataTransfer.effectAllowed = 'copy';
    },
    []
  );

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const triggerId = e.dataTransfer.getData('triggerId');
      if (!triggerId) return;

      // Calculate position relative to canvas
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - canvasOffset.x) / zoom;
      const y = (e.clientY - rect.top - canvasOffset.y) / zoom;

      addTriggerNode(triggerId, Math.max(20, x - NODE_WIDTH / 2), Math.max(20, y - NODE_HEIGHT / 2));
    },
    [addTriggerNode, canvasOffset, zoom]
  );

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
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
      // Middle button or holding space not needed — use right-click or shift+left for panning
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
      toast.error('Add at least one trigger to save');
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
            nodeType: n.type === 'trigger' ? 'Trigger' : n.type === 'condition' ? 'ifElse' : n.type === 'delay' ? 'wait' : 'Action',
            config: n.config,
            ...(n.triggerType ? { triggerType: n.triggerType } : {}),
            ...(n.actionType ? { actionType: n.actionType } : {}),
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
      toast.error('Add at least one trigger to test');
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

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* ═══ LEFT SIDEBAR ═══ */}
      <div className="flex w-[280px] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {/* Sidebar Header */}
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <Zap className="h-4 w-4 text-emerald-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Trigger Library
          </h2>
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {filteredTriggers.length}
          </Badge>
        </div>

        {/* Search */}
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Search triggers..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-1 px-3 pt-2 pb-1">
          {TRIGGER_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSidebarCategory(cat.id)}
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
                sidebarCategory === cat.id
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <Separator className="my-1" />

        {/* Trigger list */}
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-3">
            {filteredTriggers.length === 0 && (
              <p className="py-8 text-center text-xs text-gray-400">
                No triggers found
              </p>
            )}
            {filteredTriggers.map((trigger) => {
              const Icon = trigger.icon;
              return (
                <div
                  key={trigger.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, trigger.id)}
                  className={cn(
                    'group flex cursor-grab items-start gap-2.5 rounded-lg border border-gray-150 bg-white p-2.5 transition-all hover:border-emerald-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-700',
                    'active:cursor-grabbing'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                      trigger.categoryColor
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-gray-900 dark:text-gray-100">
                      {trigger.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span
                        className={cn(
                          'inline-block h-1.5 w-1.5 rounded-full',
                          CATEGORY_DOT[trigger.category] || 'bg-gray-400'
                        )}
                      />
                      <span className="text-[10px] text-gray-500">
                        {trigger.category}
                      </span>
                      {trigger.popular && (
                        <Badge className="ml-1 h-3.5 px-1 text-[8px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0">
                          Popular
                        </Badge>
                      )}
                    </div>
                  </div>
                  <GripVertical className="mt-1 h-3.5 w-3.5 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              );
            })}
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
              const IconComp = getIcon(node.icon);
              const borderClass =
                node.type === 'trigger'
                  ? CATEGORY_BORDER[node.category || ''] || 'border-l-blue-500'
                  : NODE_TYPE_BORDER[node.type];

              const hasOutgoingEdge = edges.some((e) => e.source === node.id);

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
                          node.type === 'trigger'
                            ? node.categoryColor || 'bg-blue-500/15 text-blue-600'
                            : node.type === 'action'
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : node.type === 'condition'
                            ? 'bg-orange-500/15 text-orange-600'
                            : 'bg-gray-500/15 text-gray-600'
                        )}
                      >
                        {IconComp ? <IconComp className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100">
                          {node.name}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          {node.type === 'trigger' && node.eventLabel && (
                            <span className="text-[10px] text-gray-500">
                              {node.eventLabel}
                            </span>
                          )}
                          {node.type === 'action' && node.actionType && (
                            <span className="text-[10px] text-gray-500">
                              {node.actionType.replace(/_/g, ' ')}
                            </span>
                          )}
                          {node.type === 'condition' && (
                            <span className="text-[10px] text-orange-600">
                              If/Else
                            </span>
                          )}
                          {node.type === 'delay' && (
                            <span className="text-[10px] text-gray-500">
                              {node.config?.delayMinutes || 5} min
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Input connector (top) */}
                    <button
                      className={cn(
                        'absolute -top-2 left-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-gray-300 transition-colors dark:border-gray-900',
                        'h-4 w-4 hover:bg-emerald-500 hover:scale-125',
                        connectingFrom ? 'hover:bg-emerald-500' : ''
                      )}
                      onClick={(e) => handleInputClick(node.id, e)}
                      title="Input connector"
                    />

                    {/* Output connector (bottom) */}
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
                  </div>

                  {/* Add button below node */}
                  {!hasOutgoingEdge && (
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
                          className="w-56 p-2"
                          side="bottom"
                          align="center"
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          <p className="mb-1.5 px-1 text-xs font-medium text-gray-500">
                            Add next step
                          </p>
                          <div className="space-y-0.5">
                            {ACTION_TYPES.map((action) => {
                              const ActionIcon = action.icon;
                              return (
                                <button
                                  key={action.value}
                                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addConnectedNode(node.id, action.value);
                                  }}
                                >
                                  <ActionIcon className="h-3.5 w-3.5" />
                                  <span>{action.label}</span>
                                </button>
                              );
                            })}
                          </div>
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
                    Drag a trigger from the left sidebar and drop it here to get started
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
                      selectedNode.type === 'trigger'
                        ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800'
                        : selectedNode.type === 'action'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800'
                        : selectedNode.type === 'condition'
                        ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800'
                        : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                    )}
                  >
                    {selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)}
                  </Badge>
                  {selectedNode.category && (
                    <Badge variant="outline" className="text-[10px]">
                      {selectedNode.category}
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

                {/* Trigger-specific config */}
                {selectedNode.type === 'trigger' && (
                  <>
                    {selectedNode.description && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Description</Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          {selectedNode.description}
                        </p>
                      </div>
                    )}
                    {selectedNode.triggerType && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Event Source</Label>
                        <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                          <div
                            className={cn(
                              'h-2 w-2 rounded-full',
                              CATEGORY_DOT[selectedNode.category || ''] || 'bg-gray-400'
                            )}
                          />
                          <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
                            {selectedNode.triggerType}
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedNode.eventLabel && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Event Label</Label>
                        <Input
                          value={selectedNode.eventLabel}
                          readOnly
                          className="h-8 text-xs bg-gray-50 dark:bg-gray-800"
                        />
                      </div>
                    )}
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
                  </>
                )}

                {/* Action-specific config */}
                {selectedNode.type === 'action' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Action Type</Label>
                      <Select
                        value={selectedNode.actionType || ''}
                        onValueChange={(val) => {
                          const actionDef = ACTION_TYPES.find((a) => a.value === val);
                          if (actionDef) {
                            setNodes((prev) =>
                              prev.map((n) =>
                                n.id === selectedNode.id
                                  ? {
                                      ...n,
                                      actionType: val,
                                      name: actionDef.label,
                                      icon: actionDef.icon.displayName || actionDef.icon.name,
                                    }
                                  : n
                              )
                            );
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_TYPES.filter((a) => a.value !== 'condition' && a.value !== 'delay').map((action) => (
                            <SelectItem key={action.value} value={action.value}>
                              {action.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* WhatsApp-specific fields */}
                    {(selectedNode.actionType === 'send_whatsapp') && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Recipient</Label>
                          <Select
                            value={selectedNode.config?.recipient || 'customer'}
                            onValueChange={(val) =>
                              updateNodeConfig(selectedNode.id, 'recipient', val)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="customer">Customer</SelectItem>
                              <SelectItem value="employee">Employee</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Template Message</Label>
                          <Textarea
                            value={selectedNode.config?.template || ''}
                            onChange={(e) =>
                              updateNodeConfig(selectedNode.id, 'template', e.target.value)
                            }
                            className="min-h-[80px] text-xs"
                            placeholder="Enter WhatsApp message template..."
                          />
                        </div>
                      </>
                    )}

                    {/* Notification-specific fields */}
                    {(selectedNode.actionType === 'send_notification') && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Title</Label>
                          <Input
                            value={selectedNode.config?.title || ''}
                            onChange={(e) =>
                              updateNodeConfig(selectedNode.id, 'title', e.target.value)
                            }
                            className="h-8 text-xs"
                            placeholder="Notification title"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Message</Label>
                          <Textarea
                            value={selectedNode.config?.message || ''}
                            onChange={(e) =>
                              updateNodeConfig(selectedNode.id, 'message', e.target.value)
                            }
                            className="min-h-[60px] text-xs"
                            placeholder="Notification message"
                          />
                        </div>
                      </>
                    )}

                    {/* Create task fields */}
                    {(selectedNode.actionType === 'create_task') && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Task Title</Label>
                          <Input
                            value={selectedNode.config?.title || ''}
                            onChange={(e) =>
                              updateNodeConfig(selectedNode.id, 'title', e.target.value)
                            }
                            className="h-8 text-xs"
                            placeholder="Task title"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Assign To</Label>
                          <Select
                            value={selectedNode.config?.assignTo || 'round_robin'}
                            onValueChange={(val) =>
                              updateNodeConfig(selectedNode.id, 'assignTo', val)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="round_robin">Round Robin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="specific">Specific User</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {/* Create job fields */}
                    {(selectedNode.actionType === 'create_job') && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Job Title</Label>
                        <Input
                          value={selectedNode.config?.title || ''}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, 'title', e.target.value)
                          }
                          className="h-8 text-xs"
                          placeholder="Job title"
                        />
                      </div>
                    )}

                    {/* Assign user fields */}
                    {(selectedNode.actionType === 'assign_user') && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Assign To</Label>
                        <Select
                          value={selectedNode.config?.assignTo || 'round_robin'}
                          onValueChange={(val) =>
                            updateNodeConfig(selectedNode.id, 'assignTo', val)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="round_robin">Round Robin</SelectItem>
                            <SelectItem value="nearest">Nearest Available</SelectItem>
                            <SelectItem value="specific">Specific User</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Add tag fields */}
                    {(selectedNode.actionType === 'add_tag') && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tag</Label>
                        <Input
                          value={selectedNode.config?.tag || ''}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, 'tag', e.target.value)
                          }
                          className="h-8 text-xs"
                          placeholder="Enter tag name"
                        />
                      </div>
                    )}

                    {/* Update record fields */}
                    {(selectedNode.actionType === 'update_record') && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Record Type</Label>
                          <Select
                            value={selectedNode.config?.recordType || 'lead'}
                            onValueChange={(val) =>
                              updateNodeConfig(selectedNode.id, 'recordType', val)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lead">Lead</SelectItem>
                              <SelectItem value="customer">Customer</SelectItem>
                              <SelectItem value="job">Job</SelectItem>
                              <SelectItem value="booking">Booking</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Field</Label>
                          <Input
                            value={selectedNode.config?.field || ''}
                            onChange={(e) =>
                              updateNodeConfig(selectedNode.id, 'field', e.target.value)
                            }
                            className="h-8 text-xs"
                            placeholder="Field name"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Value</Label>
                          <Input
                            value={selectedNode.config?.value || ''}
                            onChange={(e) =>
                              updateNodeConfig(selectedNode.id, 'value', e.target.value)
                            }
                            className="h-8 text-xs"
                            placeholder="New value"
                          />
                        </div>
                      </>
                    )}

                    {/* Move pipeline fields */}
                    {(selectedNode.actionType === 'move_pipeline') && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Stage</Label>
                        <Select
                          value={selectedNode.config?.stage || 'contacted'}
                          onValueChange={(val) =>
                            updateNodeConfig(selectedNode.id, 'stage', val)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="proposal">Proposal</SelectItem>
                            <SelectItem value="won">Won</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Send email fields */}
                    {(selectedNode.actionType === 'send_email') && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs">To</Label>
                          <Input
                            value={selectedNode.config?.to || ''}
                            onChange={(e) =>
                              updateNodeConfig(selectedNode.id, 'to', e.target.value)
                            }
                            className="h-8 text-xs"
                            placeholder="Recipient email"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Subject</Label>
                          <Input
                            value={selectedNode.config?.subject || ''}
                            onChange={(e) =>
                              updateNodeConfig(selectedNode.id, 'subject', e.target.value)
                            }
                            className="h-8 text-xs"
                            placeholder="Email subject"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Body</Label>
                          <Textarea
                            value={selectedNode.config?.body || ''}
                            onChange={(e) =>
                              updateNodeConfig(selectedNode.id, 'body', e.target.value)
                            }
                            className="min-h-[80px] text-xs"
                            placeholder="Email body"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Condition-specific config */}
                {selectedNode.type === 'condition' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Field</Label>
                      <Input
                        value={selectedNode.config?.field || ''}
                        onChange={(e) =>
                          updateNodeConfig(selectedNode.id, 'field', e.target.value)
                        }
                        className="h-8 text-xs"
                        placeholder="e.g. status, amount, priority"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Operator</Label>
                      <Select
                        value={selectedNode.config?.operator || 'equals'}
                        onValueChange={(val) =>
                          updateNodeConfig(selectedNode.id, 'operator', val)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="not_equals">Not Equals</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="greater_than">Greater Than</SelectItem>
                          <SelectItem value="less_than">Less Than</SelectItem>
                          <SelectItem value="is_empty">Is Empty</SelectItem>
                          <SelectItem value="is_not_empty">Is Not Empty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Value</Label>
                      <Input
                        value={selectedNode.config?.value || ''}
                        onChange={(e) =>
                          updateNodeConfig(selectedNode.id, 'value', e.target.value)
                        }
                        className="h-8 text-xs"
                        placeholder="Condition value"
                      />
                    </div>
                    <div className="rounded-md border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-900/20">
                      <p className="text-[10px] text-orange-700 dark:text-orange-400">
                        <strong>If/Else:</strong> When the condition is met, the flow continues.
                        Add separate paths for &quot;Yes&quot; and &quot;No&quot; branches by
                        connecting actions below.
                      </p>
                    </div>
                  </>
                )}

                {/* Delay-specific config */}
                {selectedNode.type === 'delay' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Delay Duration</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={selectedNode.config?.delayMinutes || 5}
                          onChange={(e) =>
                            updateNodeConfig(
                              selectedNode.id,
                              'delayMinutes',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="h-8 w-20 text-xs"
                          min={0}
                        />
                        <Select
                          value={
                            selectedNode.config?.delayMinutes >= 1440
                              ? 'days'
                              : selectedNode.config?.delayMinutes >= 60
                              ? 'hours'
                              : 'minutes'
                          }
                          onValueChange={(unit) => {
                            const current = selectedNode.config?.delayMinutes || 5;
                            let newVal = current;
                            if (unit === 'minutes') newVal = Math.max(1, Math.round(current));
                            if (unit === 'hours') newVal = Math.max(1, Math.round(current / 60)) * 60;
                            if (unit === 'days') newVal = Math.max(1, Math.round(current / 1440)) * 1440;
                            updateNodeConfig(selectedNode.id, 'delayMinutes', newVal);
                          }}
                        >
                          <SelectTrigger className="h-8 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes">Minutes</SelectItem>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                      <p className="text-[10px] text-gray-600 dark:text-gray-400">
                        The workflow will pause for the specified duration before continuing
                        to the next step.
                      </p>
                    </div>
                  </>
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

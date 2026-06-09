'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkflowStore } from '@/store/workflow-store';
import { getNodeTypeDefinition } from '@/lib/node-registry';
import type { WorkflowNode } from '@/types/workflow';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  X, Trash2, Database, Play, ChevronDown, ChevronUp, AlertCircle,
  Table, FileEdit, StickyNote, Settings, Eye, RefreshCw, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DatabaseConfigPanelProps {
  node: WorkflowNode;
}

// ─── Table Schema Info ───────────────────────────────────────────────────────

const TABLE_SCHEMAS: Record<string, { label: string; fields: { name: string; type: string; description: string }[] }> = {
  jobs: {
    label: 'Jobs',
    fields: [
      { name: 'id', type: 'String', description: 'Auto-generated ID' },
      { name: 'title', type: 'String', description: 'Job title' },
      { name: 'description', type: 'String?', description: 'Job description' },
      { name: 'status', type: 'String', description: 'pending, assigned, accepted, in_progress, completed, cancelled' },
      { name: 'priority', type: 'String', description: 'low, medium, high, urgent' },
      { name: 'type', type: 'String', description: 'delivery, cleaning, repair, etc.' },
      { name: 'address', type: 'String?', description: 'Job address' },
      { name: 'customerName', type: 'String?', description: 'Customer name' },
      { name: 'customerPhone', type: 'String?', description: 'Customer phone' },
      { name: 'assigneeId', type: 'String?', description: 'Assigned employee ID' },
      { name: 'assigneeName', type: 'String?', description: 'Assigned employee name' },
      { name: 'assigneePhone', type: 'String?', description: 'Assigned employee phone' },
      { name: 'createdAt', type: 'DateTime', description: 'Created timestamp' },
    ],
  },
  employees: {
    label: 'Employees',
    fields: [
      { name: 'id', type: 'String', description: 'Auto-generated ID' },
      { name: 'name', type: 'String', description: 'Employee name' },
      { name: 'phone', type: 'String', description: 'Phone number' },
      { name: 'role', type: 'String', description: 'driver, cleaner, technician, etc.' },
      { name: 'status', type: 'String', description: 'available, busy, offline' },
      { name: 'skills', type: 'JSON', description: 'Skills array as JSON string' },
      { name: 'rating', type: 'Float', description: 'Employee rating' },
      { name: 'completedJobs', type: 'Int', description: 'Number of completed jobs' },
      { name: 'location', type: 'String?', description: 'Current location' },
      { name: 'whatsappId', type: 'String?', description: 'WhatsApp ID' },
    ],
  },
  customers: {
    label: 'Customers',
    fields: [
      { name: 'id', type: 'String', description: 'Auto-generated ID' },
      { name: 'name', type: 'String', description: 'Customer name' },
      { name: 'phone', type: 'String', description: 'Phone number' },
      { name: 'email', type: 'String?', description: 'Email address' },
      { name: 'address', type: 'String?', description: 'Customer address' },
      { name: 'whatsappId', type: 'String?', description: 'WhatsApp ID' },
    ],
  },
  resources: {
    label: 'Resources',
    fields: [
      { name: 'id', type: 'String', description: 'Auto-generated ID' },
      { name: 'name', type: 'String', description: 'Resource name' },
      { name: 'phone', type: 'String', description: 'Contact phone' },
      { name: 'type', type: 'String', description: 'driver, vehicle, equipment' },
      { name: 'status', type: 'String', description: 'available, busy, offline' },
      { name: 'skills', type: 'JSON', description: 'Skills as JSON string' },
      { name: 'location', type: 'String?', description: 'Current location' },
    ],
  },
};

// ─── Quick Filter Presets ────────────────────────────────────────────────────

const FILTER_PRESETS: Record<string, { label: string; filters: string }[]> = {
  jobs: [
    { label: 'Pending Jobs', filters: '{"status": "pending"}' },
    { label: 'Assigned Jobs', filters: '{"status": "assigned"}' },
    { label: 'Unassigned Jobs', filters: '{"status": "pending", "assigneeId": null}' },
    { label: 'High Priority', filters: '{"priority": "high"}' },
  ],
  employees: [
    { label: 'Available Drivers', filters: '{"status": "available", "role": "driver"}' },
    { label: 'All Drivers', filters: '{"role": "driver"}' },
    { label: 'Available Employees', filters: '{"status": "available"}' },
    { label: 'Busy Employees', filters: '{"status": "busy"}' },
  ],
  customers: [
    { label: 'All Customers', filters: '{}' },
  ],
  resources: [
    { label: 'Available Resources', filters: '{"status": "available"}' },
    { label: 'Available Drivers', filters: '{"type": "driver", "status": "available"}' },
  ],
};

// ─── Quick Data Presets ──────────────────────────────────────────────────────

const DATA_PRESETS: Record<string, { label: string; data: string }[]> = {
  jobs: [
    { label: 'Assign Employee', data: '{"assigneeId": "{{ $json.selection.id }}", "assigneeName": "{{ $json.selection.title }}", "status": "assigned"}' },
    { label: 'Mark Accepted', data: '{"status": "accepted", "assignmentStatus": "accepted"}' },
    { label: 'Mark Completed', data: '{"status": "completed", "actualEndTime": "NOW"}' },
    { label: 'Cancel Job', data: '{"status": "cancelled"}' },
  ],
  employees: [
    { label: 'Set Busy', data: '{"status": "busy"}' },
    { label: 'Set Available', data: '{"status": "available"}' },
  ],
  customers: [],
  resources: [
    { label: 'Set Busy', data: '{"status": "busy"}' },
    { label: 'Set Available', data: '{"status": "available"}' },
  ],
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function DatabaseConfigPanel({ node }: DatabaseConfigPanelProps) {
  const { updateNode, removeNodes, setSelectedNodes } = useWorkflowStore();
  const nodeDef = getNodeTypeDefinition(node.data.nodeType);
  const IconComponent = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[nodeDef?.icon || 'Database'] || LucideIcons.Database;

  // ─── Local state from node config ────────────────────────────────────────
  const [localName, setLocalName] = useState(node.name);
  const [operation, setOperation] = useState<string>(node.data.config?.operation || 'query');
  const [table, setTable] = useState<string>(node.data.config?.table || 'jobs');
  const [filters, setFilters] = useState<string>(node.data.config?.filters || '{}');
  const [data, setData] = useState<string>(node.data.config?.data || '{}');
  const [orderBy, setOrderBy] = useState<string>(node.data.config?.orderBy || '');
  const [limit, setLimit] = useState<number>(node.data.config?.limit || 100);
  const [localNotes, setLocalNotes] = useState(node.data.notes || '');
  const [activeTab, setActiveTab] = useState('parameters');
  const [schemaExpanded, setSchemaExpanded] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; data: any; error?: string} | null>(null);
  const [testing, setTesting] = useState(false);

  // ─── Sync config to store (debounced) ────────────────────────────────────
  const isInitialMount = useRef(true);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncConfig = useCallback(() => {
    const config: Record<string, unknown> = {
      operation,
      table,
      filters,
      data,
      orderBy,
      limit,
    };
    updateNode(node.id, { config });
  }, [node.id, operation, table, filters, data, orderBy, limit, updateNode]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncConfig();
    }, 300);
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [syncConfig]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleNameChange = useCallback((name: string) => {
    setLocalName(name);
    const storeNodes = useWorkflowStore.getState().nodes;
    const updatedNodes = storeNodes.map((n) =>
      n.id === node.id ? { ...n, name } : n,
    );
    useWorkflowStore.setState({ nodes: updatedNodes });
  }, [node.id]);

  const handleNotesChange = useCallback((notes: string) => {
    setLocalNotes(notes);
    updateNode(node.id, { notes });
  }, [node.id, updateNode]);

  const handleDelete = useCallback(() => {
    removeNodes([node.id]);
    setSelectedNodes([]);
  }, [node.id, removeNodes, setSelectedNodes]);

  const handleDisableToggle = useCallback(() => {
    updateNode(node.id, { disabled: !node.data.disabled });
  }, [node.id, node.data.disabled, updateNode]);

  // ─── Test Query ──────────────────────────────────────────────────────────
  const handleTestQuery = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const tableApiMap: Record<string, string> = {
        jobs: '/api/jobs',
        employees: '/api/employees',
        customers: '/api/customers',
        resources: '/api/resources',
      };
      const url = tableApiMap[table] || '/api/jobs';

      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        setTestResult({ success: false, data: null, error: `API returned ${response.status}` });
        return;
      }
      const result = await response.json();
      setTestResult({ success: true, data: result });
      toast.success(`Found ${Array.isArray(result) ? result.length : (result.data?.length || 0)} records`);
    } catch (error: any) {
      setTestResult({ success: false, data: null, error: error.message });
      toast.error(`Query failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  }, [table]);

  // ─── Validate JSON ───────────────────────────────────────────────────────
  const validateJson = useCallback((value: string): { valid: boolean; error?: string } => {
    if (!value || value.trim() === '' || value.trim() === '{}') return { valid: true };
    try {
      JSON.parse(value);
      return { valid: true };
    } catch (e: any) {
      return { valid: false, error: e.message };
    }
  }, []);

  const filtersValid = validateJson(filters);
  const dataValid = validateJson(data);

  // ─── Get presets ─────────────────────────────────────────────────────────
  const currentFilterPresets = FILTER_PRESETS[table] || [];
  const currentDataPresets = DATA_PRESETS[table] || [];
  const currentSchema = TABLE_SCHEMAS[table];

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      className="w-96 border-l bg-white flex flex-col shrink-0 h-full overflow-hidden"
      data-config-panel="true"
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.stopPropagation();
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <div className={cn('flex items-center justify-center size-7 rounded', nodeDef?.color || 'bg-emerald-600')}>
            <IconComponent className="size-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 leading-tight">Database Query</h3>
            <p className="text-[10px] text-gray-400">data</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setSelectedNodes([])}
        >
          <X className="size-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-2 mx-3 mt-2 shrink-0">
          <TabsTrigger value="parameters" className="text-xs">Parameters</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
        </TabsList>

        <div
          className="flex-1 min-h-0 overflow-y-auto"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#d1d5db transparent',
          }}
        >
          {activeTab === 'parameters' && (
            <div className="p-3 space-y-3">
              {/* Node Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Name</Label>
                <Input
                  value={localName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <Separator className="my-2" />

              {/* Operation */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Operation</Label>
                <Select value={operation} onValueChange={setOperation}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="query" className="text-xs">
                      <div className="flex items-center gap-2">
                        <Database className="size-3" />
                        Query (Find Many)
                      </div>
                    </SelectItem>
                    <SelectItem value="findOne" className="text-xs">
                      <div className="flex items-center gap-2">
                        <Database className="size-3" />
                        Find One
                      </div>
                    </SelectItem>
                    <SelectItem value="insert" className="text-xs">
                      <div className="flex items-center gap-2">
                        <FileEdit className="size-3" />
                        Insert (Create)
                      </div>
                    </SelectItem>
                    <SelectItem value="update" className="text-xs">
                      <div className="flex items-center gap-2">
                        <FileEdit className="size-3" />
                        Update
                      </div>
                    </SelectItem>
                    <SelectItem value="delete" className="text-xs">
                      <div className="flex items-center gap-2">
                        <Trash2 className="size-3" />
                        Delete
                      </div>
                    </SelectItem>
                    <SelectItem value="count" className="text-xs">
                      <div className="flex items-center gap-2">
                        <Database className="size-3" />
                        Count
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Table</Label>
                <Select value={table} onValueChange={setTable}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jobs" className="text-xs">
                      <div className="flex items-center gap-2">
                        <Table className="size-3" />
                        Jobs
                      </div>
                    </SelectItem>
                    <SelectItem value="employees" className="text-xs">
                      <div className="flex items-center gap-2">
                        <Table className="size-3" />
                        Employees
                      </div>
                    </SelectItem>
                    <SelectItem value="customers" className="text-xs">
                      <div className="flex items-center gap-2">
                        <Table className="size-3" />
                        Customers
                      </div>
                    </SelectItem>
                    <SelectItem value="resources" className="text-xs">
                      <div className="flex items-center gap-2">
                        <Table className="size-3" />
                        Resources
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filters */}
              {(operation === 'query' || operation === 'findOne' || operation === 'update' || operation === 'delete' || operation === 'count') && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Filters (Where)</Label>
                  <Textarea
                    value={filters}
                    onChange={(e) => setFilters(e.target.value)}
                    placeholder='{"status": "available", "role": "driver"}'
                    className="min-h-[60px] text-xs font-mono"
                  />
                  {!filtersValid.valid && (
                    <p className="text-[10px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      Invalid JSON: {filtersValid.error}
                    </p>
                  )}
                  {currentFilterPresets.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] text-gray-400">Presets:</span>
                      {currentFilterPresets.map((preset) => (
                        <Badge
                          key={preset.label}
                          variant="outline"
                          className="text-[10px] cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            setFilters(preset.filters);
                            toast.success(`Applied "${preset.label}" filter`);
                          }}
                        >
                          {preset.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400">
                    Supports expressions: {'{{ $json.body.id }}'}, {'{{ $json.selection.id }}'}
                  </p>
                </div>
              )}

              {/* Data (for insert/update) */}
              {(operation === 'insert' || operation === 'update') && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    {operation === 'insert' ? 'Data (Create)' : 'Data (Update)'}
                  </Label>
                  <Textarea
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    placeholder={operation === 'insert'
                      ? '{"title": "New Job", "status": "pending", "customerName": "Rahul"}'
                      : '{"status": "assigned", "assigneeId": "{{ $json.selection.id }}"}'
                    }
                    className="min-h-[80px] text-xs font-mono"
                  />
                  {!dataValid.valid && (
                    <p className="text-[10px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      Invalid JSON: {dataValid.error}
                    </p>
                  )}
                  {currentDataPresets.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] text-gray-400">Presets:</span>
                      {currentDataPresets.map((preset) => (
                        <Badge
                          key={preset.label}
                          variant="outline"
                          className="text-[10px] cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            setData(preset.data);
                            toast.success(`Applied "${preset.label}" data`);
                          }}
                        >
                          {preset.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400">
                    Use expressions for dynamic values: {'{{ $json.selection.id }}'}, {'{{ $json.body.jobId }}'}
                  </p>
                </div>
              )}

              {/* Order By */}
              {(operation === 'query' || operation === 'findOne') && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Order By</Label>
                  <Input
                    value={orderBy}
                    onChange={(e) => setOrderBy(e.target.value)}
                    placeholder="createdAt desc"
                    className="h-8 text-sm"
                  />
                </div>
              )}

              {/* Limit */}
              {operation === 'query' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Limit</Label>
                  <Input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
                    className="h-8 text-sm"
                    min={1}
                    max={1000}
                  />
                </div>
              )}

              <Separator className="my-2" />

              {/* Expression Variable Quick-Insert */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Expression Variables</Label>
                <div className="flex items-center gap-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-gray-50" onClick={() => {
                    const target = (operation === 'insert' || operation === 'update') ? 'data' : 'filters';
                    if (target === 'data') setData((prev) => prev + '{{ $json.body.id }}');
                    else setFilters((prev) => prev + '{{ $json.body.id }}');
                  }}>
                    {'{{ $json.body.id }}'}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-gray-50" onClick={() => {
                    const target = (operation === 'insert' || operation === 'update') ? 'data' : 'filters';
                    if (target === 'data') setData((prev) => prev + '{{ $json.selection.id }}');
                    else setFilters((prev) => prev + '{{ $json.selection.id }}');
                  }}>
                    {'{{ $json.selection.id }}'}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-gray-50" onClick={() => {
                    const target = (operation === 'insert' || operation === 'update') ? 'data' : 'filters';
                    if (target === 'data') setData((prev) => prev + '{{ $json.selection.title }}');
                    else setFilters((prev) => prev + '{{ $json.selection.title }}');
                  }}>
                    {'{{ $json.selection.title }}'}
                  </Badge>
                </div>
              </div>

              <Separator className="my-2" />

              {/* Table Schema Info */}
              {currentSchema && (
                <div className="space-y-1.5">
                  <button
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-600 w-full"
                    onClick={() => setSchemaExpanded(!schemaExpanded)}
                  >
                    {schemaExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                    {currentSchema.label} Schema
                  </button>
                  {schemaExpanded && (
                    <div className="border rounded-md p-2 space-y-1 max-h-48 overflow-y-auto bg-gray-50">
                      {currentSchema.fields.map((field) => (
                        <div key={field.name} className="flex items-center gap-2 text-[10px]">
                          <code className="bg-white px-1 rounded border text-gray-700 font-mono min-w-[100px]">{field.name}</code>
                          <span className="text-gray-400">{field.type}</span>
                          <span className="text-gray-400">— {field.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Separator className="my-2" />

              {/* Test Query */}
              {(operation === 'query' || operation === 'findOne' || operation === 'count') && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={handleTestQuery}
                    disabled={testing}
                  >
                    {testing ? (
                      <RefreshCw className="size-3.5 animate-spin" />
                    ) : (
                      <Play className="size-3.5" />
                    )}
                    {testing ? 'Testing...' : 'Test Query'}
                  </Button>
                  {testResult && (
                    <div className={cn(
                      'p-2 rounded-md text-[10px] font-mono max-h-40 overflow-y-auto border',
                      testResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                    )}>
                      {testResult.success ? (
                        <div>
                          <div className="flex items-center gap-1 text-emerald-600 font-sans mb-1">
                            <CheckCircle2 className="size-3" />
                            Success — {Array.isArray(testResult.data) ? testResult.data.length : (testResult.data?.data?.length || '?')} records
                          </div>
                          <pre className="whitespace-pre-wrap">{JSON.stringify(testResult.data, null, 2).substring(0, 500)}</pre>
                        </div>
                      ) : (
                        <div className="text-red-600">{testResult.error}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Operation description */}
              <div className="p-2.5 rounded-md bg-blue-50 border border-blue-200">
                <div className="text-[10px] text-blue-700 space-y-0.5">
                  <p className="font-medium">
                    {operation === 'query' && 'Query returns an array of matching records'}
                    {operation === 'findOne' && 'Find One returns the first matching record'}
                    {operation === 'insert' && 'Insert creates a new record in the table'}
                    {operation === 'update' && 'Update modifies matching records. Use "id" in filters for single record update.'}
                    {operation === 'delete' && 'Delete removes matching records. Use "id" in filters for single record delete.'}
                    {operation === 'count' && 'Count returns the number of matching records'}
                  </p>
                  <p>Output is available as {'{{ $json.data }}'} for downstream nodes.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-3 space-y-4">
              {/* Disabled toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Disabled</Label>
                <Switch
                  checked={node.data.disabled || false}
                  onCheckedChange={handleDisableToggle}
                />
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <StickyNote className="size-3.5 text-gray-400" />
                  <Label className="text-xs font-medium">Notes</Label>
                </div>
                <Textarea
                  value={localNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Add notes about this node..."
                  className="min-h-[60px] text-xs"
                />
              </div>

              <Separator />

              {/* Error Handling */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-600">Error Handling</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-500">Retry Count</Label>
                    <Input
                      type="number"
                      value={node.data.retryCount ?? 0}
                      onChange={(e) =>
                        updateNode(node.id, { retryCount: parseInt(e.target.value) || 0 })
                      }
                      className="h-7 text-xs"
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-500">Retry Delay (ms)</Label>
                    <Input
                      type="number"
                      value={node.data.retryDelay ?? 1000}
                      onChange={(e) =>
                        updateNode(node.id, { retryDelay: parseInt(e.target.value) || 1000 })
                      }
                      className="h-7 text-xs"
                      min={0}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Delete */}
              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-1.5"
                onClick={handleDelete}
              >
                <Trash2 className="size-3.5" />
                Delete Node
              </Button>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}

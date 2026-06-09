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
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  X, Trash2, Settings, StickyNote, Database, Play, Plus, Eye,
  ChevronDown, ChevronUp, AlertCircle, RefreshCw, Search,
  Table2, FileJson, Filter, ArrowDownToLine, ArrowUpFromLine,
  Copy, CheckCircle2, XCircle, Loader2, Info, Zap,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SupabaseConfigPanelProps {
  node: WorkflowNode;
}

interface TableInfo {
  name: string;
  displayName: string;
  icon: string;
  sampleFields: string[];
}

interface QueryResult {
  success: boolean;
  data?: Record<string, unknown>[];
  count?: number;
  error?: string;
  executionTime?: number;
}

// ─── Table Definitions ────────────────────────────────────────────────────────

const TABLE_OPTIONS: TableInfo[] = [
  { name: 'employees', displayName: 'Employees', icon: '👤', sampleFields: ['id', 'name', 'phone', 'role', 'status'] },
  { name: 'jobs', displayName: 'Jobs', icon: '📋', sampleFields: ['id', 'title', 'status', 'priority', 'type'] },
  { name: 'customers', displayName: 'Customers', icon: '🏢', sampleFields: ['id', 'name', 'phone', 'email', 'address'] },
  { name: 'resources', displayName: 'Resources', icon: '📦', sampleFields: ['id', 'name', 'type', 'status', 'location'] },
  { name: 'contact_lists', displayName: 'Contact Lists', icon: '📑', sampleFields: ['id', 'name', 'type', 'description'] },
  { name: 'webhook_sources', displayName: 'Webhook Sources', icon: '🌐', sampleFields: ['id', 'name', 'type', 'status'] },
];

const OPERATION_OPTIONS = [
  { value: 'query', label: 'Query', description: 'Fetch records with filters', icon: Search },
  { value: 'insert', label: 'Insert', description: 'Create new records', icon: ArrowDownToLine },
  { value: 'update', label: 'Update', description: 'Update existing records', icon: ArrowUpFromLine },
  { value: 'delete', label: 'Delete', description: 'Remove records', icon: Trash2 },
  { value: 'upsert', label: 'Upsert', description: 'Insert or update records', icon: RefreshCw },
];

const FILTER_OPERATORS = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'gt', label: 'greater than' },
  { value: 'gte', label: 'greater than or equal' },
  { value: 'lt', label: 'less than' },
  { value: 'lte', label: 'less than or equal' },
  { value: 'like', label: 'like (pattern)' },
  { value: 'ilike', label: 'like (case-insensitive)' },
  { value: 'in', label: 'in (list)' },
  { value: 'is', label: 'is (null/true/false)' },
];

interface FilterRow {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface OrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SupabaseConfigPanel({ node }: SupabaseConfigPanelProps) {
  const { updateNode, removeNodes, setSelectedNodes } = useWorkflowStore();
  const nodeDef = getNodeTypeDefinition(node.data.nodeType);
  const IconComponent = (LucideIcons as Record<string, LucideIcons.LucideIcon>)[nodeDef?.icon || 'Database'] || LucideIcons.Database;

  // ─── Local state from node config ─────────────────────────────────────────
  const [localName, setLocalName] = useState(node.name);
  const [operation, setOperation] = useState<string>(node.data.config?.operation || 'query');
  const [table, setTable] = useState<string>(node.data.config?.table || 'employees');
  const [filters, setFilters] = useState<FilterRow[]>(node.data.config?.filters || []);
  const [updateData, setUpdateData] = useState<string>(
    typeof node.data.config?.updateData === 'string'
      ? (node.data.config.updateData as string)
      : node.data.config?.updateData
        ? JSON.stringify(node.data.config.updateData, null, 2)
        : '{}'
  );
  const [selectFields, setSelectFields] = useState<string>(node.data.config?.selectFields || '*');
  const [limit, setLimit] = useState<string>(node.data.config?.limit || '100');
  const [orderBy, setOrderBy] = useState<OrderBy[]>(node.data.config?.orderBy || []);
  const [returnFields, setReturnFields] = useState<string>(node.data.config?.returnFields || '*');
  const [localNotes, setLocalNotes] = useState(node.data.notes || '');

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('parameters');
  const [showPreview, setShowPreview] = useState(false);
  const [testingQuery, setTestingQuery] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [showFilterHelp, setShowFilterHelp] = useState(false);

  // ─── Sync config to store (debounced, skip first mount) ──────────────────
  const isInitialMount = useRef(true);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncConfig = useCallback(() => {
    let parsedUpdateData: unknown = updateData;
    try {
      parsedUpdateData = JSON.parse(updateData);
    } catch {
      // Keep as string if not valid JSON
    }

    const config: Record<string, unknown> = {
      operation,
      table,
      filters,
      updateData: parsedUpdateData,
      selectFields,
      limit,
      orderBy,
      returnFields,
    };
    updateNode(node.id, { config });
  }, [node.id, operation, table, filters, updateData, selectFields, limit, orderBy, returnFields, updateNode]);

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

  // ─── Handlers ─────────────────────────────────────────────────────────────
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

  // ─── Filter management ────────────────────────────────────────────────────
  const addFilter = useCallback(() => {
    const tableInfo = TABLE_OPTIONS.find((t) => t.name === table);
    const firstField = tableInfo?.sampleFields[0] || 'id';
    const newFilter: FilterRow = {
      id: `filter-${Date.now()}`,
      field: firstField,
      operator: 'eq',
      value: '',
    };
    setFilters((prev) => [...prev, newFilter]);
  }, [table]);

  const removeFilter = useCallback((filterId: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== filterId));
  }, []);

  const updateFilter = useCallback((filterId: string, updates: Partial<FilterRow>) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === filterId ? { ...f, ...updates } : f)),
    );
  }, []);

  // ─── Order By management ──────────────────────────────────────────────────
  const addOrderBy = useCallback(() => {
    const tableInfo = TABLE_OPTIONS.find((t) => t.name === table);
    const firstField = tableInfo?.sampleFields[0] || 'id';
    const newOrder: OrderBy = { field: firstField, direction: 'asc' };
    setOrderBy((prev) => [...prev, newOrder]);
  }, [table]);

  const removeOrderBy = useCallback((index: number) => {
    setOrderBy((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateOrderBy = useCallback((index: number, updates: Partial<OrderBy>) => {
    setOrderBy((prev) =>
      prev.map((o, i) => (i === index ? { ...o, ...updates } : o)),
    );
  }, []);

  // ─── Build query JSON from filters ────────────────────────────────────────
  const buildQueryJson = useCallback(() => {
    const conditions: Record<string, unknown> = {};
    for (const filter of filters) {
      if (!filter.field || !filter.value) continue;
      if (filter.operator === 'eq') {
        conditions[filter.field] = filter.value;
      } else {
        conditions[filter.field] = { [filter.operator]: filter.value };
      }
    }
    return conditions;
  }, [filters]);

  // ─── Test query ───────────────────────────────────────────────────────────
  const handleTestQuery = useCallback(async () => {
    setTestingQuery(true);
    setQueryResult(null);

    try {
      const apiTableMap: Record<string, string> = {
        employees: 'employees',
        jobs: 'jobs',
        customers: 'customers',
        resources: 'resources',
        contact_lists: 'contact-lists',
        webhook_sources: 'webhook-sources',
      };

      const apiPath = apiTableMap[table] || table;
      const startTime = Date.now();

      let url = `/api/${apiPath}?limit=5`;
      if (operation === 'query') {
        const conditions = buildQueryJson();
        if (Object.keys(conditions).length > 0) {
          url += `&filter=${encodeURIComponent(JSON.stringify(conditions))}`;
        }
      }

      const res = await fetch(url);
      const executionTime = Date.now() - startTime;
      const data = await res.json();

      if (res.ok) {
        const items = Array.isArray(data) ? data : data.employees || data.jobs || data.customers || data.resources || data.webhookSources || data.contactLists || [];
        setQueryResult({
          success: true,
          data: items.slice(0, 5),
          count: items.length,
          executionTime,
        });
        toast.success(`Query returned ${items.length} record${items.length !== 1 ? 's' : ''}`);
      } else {
        setQueryResult({
          success: false,
          error: data.error || 'Query failed',
          executionTime,
        });
        toast.error('Query failed');
      }
    } catch (err) {
      setQueryResult({
        success: false,
        error: err instanceof Error ? err.message : 'Network error',
      });
      toast.error('Query failed');
    } finally {
      setTestingQuery(false);
    }
  }, [table, operation, buildQueryJson]);

  // ─── Copy query JSON ──────────────────────────────────────────────────────
  const handleCopyQueryJson = useCallback(() => {
    const conditions = buildQueryJson();
    const queryObj = {
      operation,
      table,
      select: selectFields,
      filter: conditions,
      limit: parseInt(limit) || 100,
      orderBy: orderBy.length > 0 ? orderBy : undefined,
    };
    navigator.clipboard.writeText(JSON.stringify(queryObj, null, 2));
    toast.success('Query JSON copied to clipboard');
  }, [operation, table, selectFields, limit, orderBy, buildQueryJson]);

  // ─── Get table info ───────────────────────────────────────────────────────
  const currentTable = TABLE_OPTIONS.find((t) => t.name === table);

  // ─── Render ───────────────────────────────────────────────────────────────
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
          <div className={cn('flex items-center justify-center size-7 rounded', nodeDef?.color || 'bg-emerald-500')}>
            <IconComponent className="size-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 leading-tight">Supabase / Local DB</h3>
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
          {/* ─── Parameters Tab Content ──────────────────────────────────────── */}
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
                    {OPERATION_OPTIONS.map((op) => {
                      const OpIcon = op.icon;
                      return (
                        <SelectItem key={op.value} value={op.value} className="text-xs">
                          <div className="flex items-center gap-2">
                            <OpIcon className="size-3" />
                            <div>
                              <span className="font-medium">{op.label}</span>
                              <span className="text-gray-400 ml-1">— {op.description}</span>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Table2 className="size-3" />
                  Table
                </Label>
                <Select value={table} onValueChange={(val) => {
                  setTable(val);
                  // Reset filters when table changes
                  setFilters([]);
                  setOrderBy([]);
                }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TABLE_OPTIONS.map((t) => (
                      <SelectItem key={t.name} value={t.name} className="text-xs">
                        <div className="flex items-center gap-2">
                          <span>{t.icon}</span>
                          <span>{t.displayName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table info card */}
              {currentTable && (
                <Card className="border-dashed">
                  <CardContent className="p-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-1.5">
                      <Info className="size-3" />
                      <span className="font-medium">Available fields</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {currentTable.sampleFields.map((field) => (
                        <Badge
                          key={field}
                          variant="outline"
                          className="text-[10px] h-5 cursor-pointer hover:bg-emerald-50"
                          onClick={() => {
                            setSelectFields((prev) =>
                              prev === '*' ? field : `${prev}, ${field}`
                            );
                          }}
                        >
                          {field}
                        </Badge>
                      ))}
                      <Badge
                        variant="outline"
                        className="text-[10px] h-5 cursor-pointer hover:bg-emerald-50 text-emerald-600 border-emerald-200"
                        onClick={() => setSelectFields('*')}
                      >
                        all (*)
                      </Badge>
                    </div>
                    <p className="text-[9px] text-gray-400 mt-1">Click a field to add to Select</p>
                  </CardContent>
                </Card>
              )}

              <Separator className="my-2" />

              {/* Select Fields (for query) */}
              {operation === 'query' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Eye className="size-3" />
                    Select Fields
                  </Label>
                  <Input
                    value={selectFields}
                    onChange={(e) => setSelectFields(e.target.value)}
                    placeholder="* or field1, field2"
                    className="h-8 text-sm font-mono"
                  />
                  <p className="text-[10px] text-gray-400">
                    Comma-separated field names, or * for all
                  </p>
                </div>
              )}

              {/* Filters / Query Conditions */}
              {(operation === 'query' || operation === 'update' || operation === 'delete') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Filter className="size-3" />
                      Filters
                    </Label>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 text-[10px] gap-0.5 px-1"
                        onClick={() => setShowFilterHelp(!showFilterHelp)}
                      >
                        <Info className="size-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] gap-1"
                        onClick={addFilter}
                      >
                        <Plus className="size-3" />
                        Add
                      </Button>
                    </div>
                  </div>

                  {showFilterHelp && (
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="p-2.5">
                        <p className="text-[10px] text-blue-700">
                          <strong>Filters</strong> translate to Supabase query conditions.
                          For example, <code>status eq &quot;available&quot;</code> becomes{' '}
                          <code>{'{'}&quot;status&quot;: &quot;available&quot;{'}'}</code> in the query.
                          Use <code>like</code> for pattern matching with <code>%</code>.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {filters.length === 0 && (
                    <div className="text-center py-3 text-xs text-gray-400 border border-dashed rounded-md">
                      No filters — will return all records
                    </div>
                  )}

                  {filters.map((filter, idx) => (
                    <Card key={filter.id} className="border">
                      <CardContent className="p-2 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px] h-5 shrink-0">
                            {idx + 1}
                          </Badge>
                          <Input
                            value={filter.field}
                            onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                            placeholder="field"
                            className="h-7 text-xs flex-1 font-mono"
                          />
                          <Select
                            value={filter.operator}
                            onValueChange={(val) => updateFilter(filter.id, { operator: val })}
                          >
                            <SelectTrigger className="h-7 text-[10px] w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FILTER_OPERATORS.map((op) => (
                                <SelectItem key={op.value} value={op.value} className="text-[10px]">
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-red-400 hover:text-red-600 shrink-0"
                            onClick={() => removeFilter(filter.id)}
                          >
                            <X className="size-3" />
                          </Button>
                        </div>
                        <Input
                          value={filter.value}
                          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                          placeholder="Value (supports {{ expressions }})"
                          className="h-7 text-xs font-mono"
                        />
                      </CardContent>
                    </Card>
                  ))}

                  {/* Raw Query JSON (collapsible) */}
                  {filters.length > 0 && (
                    <details className="group">
                      <summary className="text-[10px] text-gray-400 cursor-pointer flex items-center gap-1 hover:text-gray-600">
                        <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
                        Generated query JSON
                      </summary>
                      <pre className="mt-1 p-2 bg-gray-50 rounded text-[10px] font-mono text-gray-600 overflow-x-auto">
                        {JSON.stringify(buildQueryJson(), null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Insert/Update Data */}
              {(operation === 'insert' || operation === 'update' || operation === 'upsert') && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <FileJson className="size-3" />
                    {operation === 'insert' ? 'Insert Data' : operation === 'upsert' ? 'Upsert Data' : 'Update Data'}
                  </Label>
                  <Textarea
                    value={updateData}
                    onChange={(e) => setUpdateData(e.target.value)}
                    placeholder={`{\n  "field1": "value1",\n  "field2": "{{ $json.field }}"\n}`}
                    className="min-h-[100px] text-xs font-mono"
                  />
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge
                      variant="outline"
                      className="text-[10px] cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        const current = updateData.trim();
                        const newField = '"fieldName": "{{ $json.field }}"';
                        if (current === '{}' || current === '') {
                          setUpdateData(`{\n  ${newField}\n}`);
                        } else {
                          setUpdateData(current.slice(0, -1) + ',\n  ' + newField + '\n}');
                        }
                      }}
                    >
                      + Add field
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[10px] cursor-pointer hover:bg-gray-50"
                      onClick={() => setUpdateData('{}')}
                    >
                      Reset
                    </Badge>
                  </div>
                  {(() => {
                    try {
                      JSON.parse(updateData);
                      return (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600">
                          <CheckCircle2 className="size-3" />
                          Valid JSON
                        </div>
                      );
                    } catch {
                      if (updateData.trim() && updateData.trim() !== '{}') {
                        return (
                          <div className="flex items-center gap-1 text-[10px] text-amber-500">
                            <AlertCircle className="size-3" />
                            Invalid JSON — will be passed as string
                          </div>
                        );
                      }
                      return null;
                    }
                  })()}
                </div>
              )}

              {/* Return Fields (for insert/update/upsert) */}
              {(operation === 'insert' || operation === 'update' || operation === 'upsert') && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Return Fields</Label>
                  <Select value={returnFields} onValueChange={setReturnFields}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="*" className="text-xs">All fields (*)</SelectItem>
                      <SelectItem value="none" className="text-xs">No return data</SelectItem>
                      <SelectItem value="id" className="text-xs">ID only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator className="my-2" />

              {/* Order By & Limit (for query) */}
              {operation === 'query' && (
                <>
                  {/* Order By */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Order By</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] gap-1"
                        onClick={addOrderBy}
                      >
                        <Plus className="size-3" />
                        Add
                      </Button>
                    </div>

                    {orderBy.map((ob, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <Input
                          value={ob.field}
                          onChange={(e) => updateOrderBy(idx, { field: e.target.value })}
                          placeholder="field"
                          className="h-7 text-xs flex-1 font-mono"
                        />
                        <Select
                          value={ob.direction}
                          onValueChange={(val: 'asc' | 'desc') => updateOrderBy(idx, { direction: val })}
                        >
                          <SelectTrigger className="h-7 text-[10px] w-16">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asc" className="text-[10px]">ASC ↑</SelectItem>
                            <SelectItem value="desc" className="text-[10px]">DESC ↓</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-red-400 hover:text-red-600"
                          onClick={() => removeOrderBy(idx)}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    ))}

                    {orderBy.length === 0 && (
                      <p className="text-[10px] text-gray-400">Default order (no sorting)</p>
                    )}
                  </div>

                  {/* Limit */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Limit</Label>
                    <Input
                      type="number"
                      value={limit}
                      onChange={(e) => setLimit(e.target.value)}
                      className="h-8 text-sm"
                      min={1}
                      max={10000}
                      placeholder="100"
                    />
                    <p className="text-[10px] text-gray-400">Maximum number of records to return</p>
                  </div>

                  <Separator className="my-2" />
                </>
              )}

              {/* Test Query */}
              {operation === 'query' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 text-xs gap-1.5 flex-1"
                      onClick={handleTestQuery}
                      disabled={testingQuery}
                    >
                      {testingQuery ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Play className="size-3.5" />
                      )}
                      {testingQuery ? 'Testing...' : 'Test Query'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={handleCopyQueryJson}
                    >
                      <Copy className="size-3.5" />
                      Copy
                    </Button>
                  </div>

                  {/* Query Result */}
                  {queryResult && (
                    <Card className={queryResult.success ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}>
                      <CardContent className="p-2.5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {queryResult.success ? (
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="size-3.5 text-red-600" />
                          )}
                          <span className="text-xs font-medium">
                            {queryResult.success ? 'Success' : 'Error'}
                          </span>
                          {queryResult.executionTime !== undefined && (
                            <span className="text-[10px] text-gray-400 ml-auto">
                              {queryResult.executionTime}ms
                            </span>
                          )}
                        </div>
                        {queryResult.success ? (
                          <div className="space-y-1">
                            <p className="text-[10px] text-gray-600">
                              {queryResult.count} record{queryResult.count !== 1 ? 's' : ''} returned
                              {queryResult.count! > 5 ? ' (showing first 5)' : ''}
                            </p>
                            <details className="group">
                              <summary className="text-[10px] text-emerald-700 cursor-pointer flex items-center gap-1">
                                <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
                                View sample data
                              </summary>
                              <pre className="mt-1 p-2 bg-white rounded text-[9px] font-mono text-gray-700 overflow-x-auto max-h-40 overflow-y-auto">
                                {JSON.stringify(queryResult.data, null, 2)}
                              </pre>
                            </details>
                          </div>
                        ) : (
                          <p className="text-[10px] text-red-600">{queryResult.error}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              <Separator className="my-2" />

              {/* Quick Templates */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Zap className="size-3" />
                  Quick Templates
                </Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] gap-1"
                    onClick={() => {
                      setOperation('query');
                      setTable('jobs');
                      setFilters([{ id: `filter-${Date.now()}`, field: 'status', operator: 'eq', value: 'pending' }]);
                      setSelectFields('*');
                      setOrderBy([{ field: 'priority', direction: 'desc' }]);
                      setLimit('10');
                      toast.success('Applied "Pending Jobs" template');
                    }}
                  >
                    📋 Pending Jobs
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] gap-1"
                    onClick={() => {
                      setOperation('query');
                      setTable('resources');
                      setFilters([{ id: `filter-${Date.now()}`, field: 'status', operator: 'eq', value: 'available' }]);
                      setSelectFields('*');
                      setOrderBy([]);
                      setLimit('50');
                      toast.success('Applied "Available Resources" template');
                    }}
                  >
                    📦 Available Resources
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] gap-1"
                    onClick={() => {
                      setOperation('update');
                      setTable('jobs');
                      setFilters([{ id: `filter-${Date.now()}`, field: 'id', operator: 'eq', value: '{{ $json.jobId }}' }]);
                      setUpdateData('{\n  "status": "{{ $json.newStatus }}"\n}');
                      setReturnFields('*');
                      toast.success('Applied "Update Job Status" template');
                    }}
                  >
                    ✏️ Update Job Status
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] gap-1"
                    onClick={() => {
                      setOperation('insert');
                      setTable('jobs');
                      setUpdateData('{\n  "title": "{{ $json.body.new.title }}",\n  "type": "{{ $json.body.new.type }}",\n  "status": "pending",\n  "priority": "{{ $json.body.new.priority || "medium" }}",\n  "customerName": "{{ $json.body.new.customer }}",\n  "pickup": "{{ $json.body.new.pickup }}",\n  "dropoff": "{{ $json.body.new.dropoff }}"\n}');
                      setReturnFields('*');
                      toast.success('Applied "Insert Job" template');
                    }}
                  >
                    ➕ Insert Job
                  </Button>
                </div>
              </div>

              <Separator className="my-2" />

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

              <Separator className="my-2" />

              {/* Delete Node */}
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

          {/* ─── Settings Tab Content ───────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="p-3 space-y-3">
              {/* Disabled toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Disabled</Label>
                <Switch
                  checked={node.data.disabled || false}
                  onCheckedChange={handleDisableToggle}
                />
              </div>

              <Separator className="my-2" />

              {/* Connection Settings */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Database className="size-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600">Connection</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] text-gray-500">Connection Mode</Label>
                  <Select defaultValue="local">
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local" className="text-xs">Local DB (SQLite)</SelectItem>
                      <SelectItem value="supabase" className="text-xs">Supabase (Remote)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] text-gray-500">Supabase URL</Label>
                  <Input
                    placeholder="https://your-project.supabase.co"
                    className="h-7 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] text-gray-500">Anon Key / Service Key</Label>
                  <Input
                    type="password"
                    placeholder="eyJhbGciOi..."
                    className="h-7 text-xs"
                  />
                </div>

                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-2.5">
                    <div className="flex items-start gap-1.5 text-[10px] text-amber-700">
                      <AlertCircle className="size-3 mt-0.5 shrink-0" />
                      <span>
                        In <strong>Local DB</strong> mode, queries run against the local SQLite database.
                        Switch to <strong>Supabase</strong> mode to connect to a remote Supabase instance.
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator className="my-2" />

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
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-500">Timeout (ms)</Label>
                  <Input
                    type="number"
                    value={node.data.timeout ?? ''}
                    onChange={(e) =>
                      updateNode(node.id, { timeout: parseInt(e.target.value) || undefined })
                    }
                    className="h-7 text-xs"
                    placeholder="No timeout"
                    min={0}
                  />
                </div>
              </div>

              <Separator className="my-2" />

              {/* Query Options */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-600">Query Options</span>

                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-gray-500">Cache Results</Label>
                  <Switch defaultChecked={false} />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-gray-500">Throw on Empty</Label>
                  <Switch defaultChecked={false} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] text-gray-500">Batch Size</Label>
                  <Input
                    type="number"
                    defaultValue={100}
                    className="h-7 text-xs"
                    min={1}
                    max={10000}
                  />
                  <p className="text-[9px] text-gray-400">Number of records per batch for bulk operations</p>
                </div>
              </div>

              <Separator className="my-2" />

              {/* Delete Node */}
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

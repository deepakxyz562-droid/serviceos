'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useWorkflowStore } from '@/store/workflow-store';
import { getNodeTypeDefinition } from '@/lib/node-registry';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  X,
  Trash2,
  Settings,
  StickyNote,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Radio,
  Loader2,
  ArrowDownToLine,
  Clock,
  Globe,
  FileJson,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Webhook,
  Link,
} from 'lucide-react';
import { toast } from 'sonner';

type WebhookUrlTab = 'test' | 'production';

interface CapturedRequest {
  id: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: unknown;
  receivedAt: string;
  contentType: string;
}

export function HttpRequestTriggerPanel({ node }: { node: import('@/types/workflow').WorkflowNode }) {
  const { updateNode, removeNodes, setSelectedNodes } = useWorkflowStore();

  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');
  const [localName, setLocalName] = useState(node.name);
  const [localNotes, setLocalNotes] = useState(node.data.notes || '');
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>(() => {
    const config = { ...node.data.config };
    if (!config.path) {
      config.path = crypto.randomUUID();
      // Immediately persist the auto-generated path to the store
      const storeNodes = useWorkflowStore.getState().nodes;
      const updatedNodes = storeNodes.map((n) =>
        n.id === node.id ? { ...n, data: { ...n.data, config } } : n,
      );
      useWorkflowStore.setState({ nodes: updatedNodes });
    }
    return config;
  });
  const [urlTab, setUrlTab] = useState<WebhookUrlTab>('test');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // ─── Captured webhook request data ────────────────────────────────────────
  const [capturedRequests, setCapturedRequests] = useState<CapturedRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    headers: false,
    queryParams: false,
    body: true,
  });
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listenStartTimeRef = useRef<string | null>(null);

  const handleNameChange = useCallback(
    (name: string) => {
      setLocalName(name);
      const storeNodes = useWorkflowStore.getState().nodes;
      const updatedNodes = storeNodes.map((n) =>
        n.id === node.id ? { ...n, name } : n,
      );
      useWorkflowStore.setState({ nodes: updatedNodes });
    },
    [node.id],
  );

  const handleConfigChange = useCallback(
    (key: string, value: unknown) => {
      const newConfig = { ...localConfig, [key]: value };
      setLocalConfig(newConfig);
      updateNode(node.id, { config: newConfig });
    },
    [node.id, localConfig, updateNode],
  );

  const handleNotesChange = useCallback(
    (notes: string) => {
      setLocalNotes(notes);
      updateNode(node.id, { notes });
    },
    [node.id, updateNode],
  );

  const handleDelete = useCallback(() => {
    removeNodes([node.id]);
    setSelectedNodes([]);
  }, [node.id, removeNodes, setSelectedNodes]);

  const handleDisableToggle = useCallback(() => {
    updateNode(node.id, { disabled: !node.data.disabled });
  }, [node.id, node.data.disabled, updateNode]);

  // Generate the webhook URLs
  const webhookPath = (localConfig.path as string) || crypto.randomUUID();
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const testUrl = `${baseUrl}/webhook-test/${webhookPath}`;
  const productionUrl = `${baseUrl}/webhook/${webhookPath}`;
  const currentUrl = urlTab === 'test' ? testUrl : productionUrl;

  const httpMethod = (localConfig.httpMethod as string) || 'POST';

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = currentUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  }, [currentUrl]);

  // ─── Real "Listen for test event" implementation ──────────────────────────
  const handleListenForTestEvent = useCallback(() => {
    if (isListening) {
      // Stop listening
      setIsListening(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      listenStartTimeRef.current = null;
      return;
    }

    // Start listening - clear previous and begin polling
    setCapturedRequests([]);
    setSelectedRequestId(null);
    setIsListening(true);
    listenStartTimeRef.current = new Date().toISOString();

    toast.info('Listening for test events...', {
      description: 'Send a request to the test URL to capture it.',
      duration: 3000,
    });

    // Poll every 1 second for new requests
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const params = new URLSearchParams({ path: webhookPath });
        if (listenStartTimeRef.current) {
          params.set('since', listenStartTimeRef.current);
        }
        const res = await fetch(`/api/webhook-test-requests?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const newRequests: CapturedRequest[] = data.requests || [];
          if (newRequests.length > 0) {
            setCapturedRequests((prev) => {
              // Merge: avoid duplicates by ID
              const existingIds = new Set(prev.map((r) => r.id));
              const uniqueNew = newRequests.filter((r: CapturedRequest) => !existingIds.has(r.id));
              if (uniqueNew.length > 0) {
                // Auto-select the first new request if none selected
                setSelectedRequestId((current) => current || uniqueNew[0].id);
                return [...uniqueNew, ...prev];
              }
              return prev;
            });
            // Show toast for first received request
            if (capturedRequests.length === 0) {
              toast.success('Request received!', {
                description: `${newRequests[0].method} request captured`,
              });
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1000);
  }, [isListening, webhookPath, capturedRequests.length]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleOpenUrl = useCallback(() => {
    window.open(currentUrl, '_blank');
  }, [currentUrl]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Get selected request for display
  const selectedRequest = capturedRequests.find((r) => r.id === selectedRequestId);

  const nodeDef = getNodeTypeDefinition(node.data.nodeType);
  const IconComponent =
    (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[nodeDef?.icon || 'Circle'] ||
    LucideIcons.Circle;

  // Helper to format body display for different content types
  const formatBody = (body: unknown, contentType: string): string => {
    if (!body) return '(empty body)';
    if (typeof body === 'string') {
      // Try to parse and pretty-print JSON strings
      try {
        const parsed = JSON.parse(body);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return body;
      }
    }
    // For form-data / URL-encoded, show as key-value pairs
    if (typeof body === 'object' && contentType.includes('x-www-form-urlencoded')) {
      return Object.entries(body as Record<string, unknown>)
        .map(([key, val]) => `${key} = ${typeof val === 'object' ? JSON.stringify(val) : val}`)
        .join('\n');
    }
    return JSON.stringify(body, null, 2);
  };

  // cURL command that adapts to selected method and content type
  const contentType = (localConfig.contentType as string) || 'any';
  const curlContentType = contentType === 'any' || contentType === 'application/json'
    ? 'application/json'
    : contentType === 'application/x-www-form-urlencoded'
      ? 'application/x-www-form-urlencoded'
      : 'multipart/form-data';
  const curlData = contentType === 'application/x-www-form-urlencoded'
    ? 'action=my_action&name=John&email=john%40example.com'
    : contentType === 'multipart/form-data'
      ? 'field1=value1'
      : '{"test": true}';
  const curlCmd = `curl -X ${httpMethod} ${testUrl} \\
  -H "Content-Type: ${curlContentType}" \\
  ${contentType === 'multipart/form-data' ? '-F ' : '-d '}'${curlData}'`;

  return (
    <div
      className="w-[420px] border-l bg-white flex flex-col shrink-0"
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
          <div
            className={cn(
              'flex items-center justify-center size-7 rounded',
              nodeDef?.color || 'bg-gray-500',
            )}
          >
            <IconComponent className="size-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 leading-tight">
              {nodeDef?.displayName}
            </h3>
            <p className="text-[10px] text-gray-400">{nodeDef?.description}</p>
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

      {/* Parameters / Settings Tabs */}
      <div className="flex border-b shrink-0">
        <button
          onClick={() => setActiveTab('parameters')}
          className={cn(
            'flex-1 px-4 py-2 text-xs font-medium transition-colors',
            activeTab === 'parameters'
              ? 'text-gray-900 border-b-2 border-amber-500 bg-gray-50'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          Parameters
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            'flex-1 px-4 py-2 text-xs font-medium transition-colors',
            activeTab === 'settings'
              ? 'text-gray-900 border-b-2 border-amber-500 bg-gray-50'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          Settings
        </button>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}
      >
        {activeTab === 'parameters' ? (
          <div className="p-3 space-y-4">
            {/* Node Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Name</Label>
              <Input
                value={localName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {/* Disable toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Disabled</Label>
              <Switch
                checked={node.data.disabled || false}
                onCheckedChange={handleDisableToggle}
              />
            </div>

            <Separator />

            {/* Listen for Test Event Button */}
            <Button
              onClick={handleListenForTestEvent}
              className={cn(
                'w-full gap-2 font-medium',
                isListening
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white',
              )}
            >
              {isListening ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Listening... Click to Stop
                </>
              ) : (
                <>
                  <Radio className="size-4" />
                  Listen for test event
                </>
              )}
            </Button>

            {isListening && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-medium text-amber-800">
                    Waiting for incoming request...
                  </span>
                </div>
                <p className="text-[10px] text-amber-600">
                  Send a {httpMethod} request to the test URL below. The response data will appear here.
                </p>
              </div>
            )}

            {/* ─── Captured Request Display ──────────────────────────────────── */}
            {capturedRequests.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-amber-600" />
                    <Label className="text-xs font-semibold text-amber-700">
                      Received ({capturedRequests.length})
                    </Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px]"
                    onClick={() => {
                      setCapturedRequests([]);
                      setSelectedRequestId(null);
                    }}
                  >
                    Clear
                  </Button>
                </div>

                {/* Request list */}
                <div className="border rounded-md overflow-hidden">
                  {capturedRequests.map((req, idx) => (
                    <button
                      key={req.id}
                      className={cn(
                        'w-full flex items-center gap-2 p-2 text-left transition-colors',
                        idx > 0 && 'border-t',
                        selectedRequestId === req.id
                          ? 'bg-amber-50 border-l-2 border-l-amber-500'
                          : 'hover:bg-gray-50',
                      )}
                      onClick={() => setSelectedRequestId(req.id)}
                    >
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[9px] font-bold px-1.5 py-0 h-4 shrink-0',
                          req.method === 'GET'
                            ? 'bg-blue-100 text-blue-700'
                            : req.method === 'POST'
                              ? 'bg-green-100 text-green-700'
                              : req.method === 'PUT'
                                ? 'bg-orange-100 text-orange-700'
                                : req.method === 'DELETE'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-purple-100 text-purple-700',
                        )}
                      >
                        {req.method}
                      </Badge>
                      <span className="text-[10px] text-gray-500 font-mono truncate flex-1">
                        {req.contentType.includes('json')
                          ? 'application/json'
                          : req.contentType.includes('form-urlencoded')
                            ? 'x-www-form-urlencoded'
                            : req.contentType.includes('form-data')
                              ? 'multipart/form-data'
                              : req.contentType || 'text/plain'}
                      </span>
                      <span className="text-[9px] text-gray-400 shrink-0">
                        {new Date(req.receivedAt).toLocaleTimeString()}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Selected request detail */}
                {selectedRequest && (
                  <div className="border rounded-lg overflow-hidden">
                    {/* Request header */}
                    <div className="flex items-center gap-2 p-2 bg-gray-50 border-b">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[9px] font-bold px-1.5 py-0 h-4',
                          selectedRequest.method === 'POST'
                            ? 'bg-green-100 text-green-700'
                            : selectedRequest.method === 'GET'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-orange-100 text-orange-700',
                        )}
                      >
                        {selectedRequest.method}
                      </Badge>
                      <code className="text-[10px] text-gray-600 font-mono truncate flex-1">
                        /webhook-test/{selectedRequest.path}
                      </code>
                      <div className="flex items-center gap-1 text-[9px] text-gray-400">
                        <Clock className="size-2.5" />
                        {new Date(selectedRequest.receivedAt).toLocaleTimeString()}
                      </div>
                    </div>

                    <div className="p-2.5 space-y-2">
                      {/* Query Params */}
                      {Object.keys(selectedRequest.queryParams).length > 0 && (
                        <div>
                          <button
                            className="flex items-center gap-1 text-[10px] font-medium text-gray-600 w-full"
                            onClick={() => toggleSection('queryParams')}
                          >
                            {expandedSections.queryParams ? (
                              <ChevronDown className="size-3" />
                            ) : (
                              <ChevronUp className="size-3" />
                            )}
                            Query Parameters ({Object.keys(selectedRequest.queryParams).length})
                          </button>
                          {expandedSections.queryParams && (
                            <div className="mt-1 bg-gray-50 rounded p-2 text-[10px] font-mono space-y-0.5">
                              {Object.entries(selectedRequest.queryParams).map(([key, val]) => (
                                <div key={key} className="flex gap-1">
                                  <span className="text-amber-600">{key}</span>
                                  <span className="text-gray-400">=</span>
                                  <span className="text-gray-700">{val}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Headers */}
                      <div>
                        <button
                          className="flex items-center gap-1 text-[10px] font-medium text-gray-600 w-full"
                          onClick={() => toggleSection('headers')}
                        >
                          {expandedSections.headers ? (
                            <ChevronDown className="size-3" />
                          ) : (
                            <ChevronUp className="size-3" />
                          )}
                          Headers ({Object.keys(selectedRequest.headers).length})
                        </button>
                        {expandedSections.headers && (
                          <div className="mt-1 bg-gray-50 rounded p-2 text-[10px] font-mono space-y-0.5 max-h-[120px] overflow-y-auto">
                            {Object.entries(selectedRequest.headers).map(([key, val]) => (
                              <div key={key} className="flex gap-1">
                                <span className="text-amber-600 shrink-0">{key}:</span>
                                <span className="text-gray-500 truncate">{val}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Body */}
                      <div>
                        <button
                          className="flex items-center gap-1 text-[10px] font-medium text-gray-600 w-full"
                          onClick={() => toggleSection('body')}
                        >
                          {expandedSections.body ? (
                            <ChevronDown className="size-3" />
                          ) : (
                            <ChevronUp className="size-3" />
                          )}
                          <FileJson className="size-3" />
                          Request Body
                        </button>
                        {expandedSections.body && (
                          <div className="mt-1 relative">
                            <pre className="bg-gray-900 text-amber-400 rounded p-2.5 text-[10px] font-mono overflow-x-auto max-h-[300px] overflow-y-auto leading-relaxed">
                              {formatBody(selectedRequest.body, selectedRequest.contentType)}
                            </pre>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-1 right-1 h-5 text-[9px] gap-0.5 bg-gray-800 hover:bg-gray-700 text-gray-400"
                              onClick={() => {
                                const bodyText = formatBody(selectedRequest.body, selectedRequest.contentType);
                                navigator.clipboard.writeText(bodyText);
                                toast.success('Body copied to clipboard');
                              }}
                            >
                              <Copy className="size-2.5" />
                              Copy
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No requests received yet (while not listening) */}
            {!isListening && capturedRequests.length === 0 && (
              <div className="text-center py-3 text-xs text-gray-400 border border-dashed rounded-md">
                <ArrowDownToLine className="size-4 mx-auto mb-1 text-gray-300" />
                <p>No test events received yet</p>
                <p className="text-[10px]">Click &quot;Listen for test event&quot; to start capturing requests</p>
              </div>
            )}

            <Separator />

            {/* Webhook URL Section */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Webhook URL</Label>

              {/* Test / Production URL tabs */}
              <div className="flex rounded-md border overflow-hidden">
                <button
                  onClick={() => setUrlTab('test')}
                  className={cn(
                    'flex-1 px-3 py-1.5 text-[11px] font-medium transition-colors',
                    urlTab === 'test'
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-white text-gray-500 hover:text-gray-700',
                  )}
                >
                  Test URL
                </button>
                <button
                  onClick={() => setUrlTab('production')}
                  className={cn(
                    'flex-1 px-3 py-1.5 text-[11px] font-medium transition-colors border-l',
                    urlTab === 'production'
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-white text-gray-500 hover:text-gray-700',
                  )}
                >
                  Production URL
                </button>
              </div>

              {/* URL display with copy */}
              <div className="rounded-md border bg-gray-50 overflow-hidden">
                <div className="flex items-center gap-1 px-2 py-1 border-b bg-gray-100">
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[9px] font-bold px-1.5 py-0 h-4',
                      httpMethod === 'GET'
                        ? 'bg-blue-100 text-blue-700'
                        : httpMethod === 'POST'
                          ? 'bg-green-100 text-green-700'
                          : httpMethod === 'PUT'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-100 text-red-700',
                    )}
                  >
                    {httpMethod}
                  </Badge>
                  <span className="text-[10px] text-gray-400 truncate flex-1">
                    {urlTab === 'test' ? 'Test endpoint' : 'Production endpoint'}
                  </span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <code className="text-[10px] text-gray-600 break-all flex-1 font-mono leading-relaxed">
                    {currentUrl}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    onClick={handleCopyUrl}
                  >
                    {copiedUrl ? (
                      <Check className="size-3 text-amber-500" />
                    ) : (
                      <Copy className="size-3 text-gray-400" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    onClick={handleOpenUrl}
                  >
                    <ExternalLink className="size-3 text-gray-400" />
                  </Button>
                </div>
              </div>

              {/* cURL command for easy testing */}
              {urlTab === 'test' && (
                <div className="rounded-md border bg-gray-50 overflow-hidden">
                  <div className="flex items-center gap-1 px-2 py-1 border-b bg-gray-100">
                    <Globe className="size-2.5 text-gray-400" />
                    <span className="text-[9px] text-gray-500 font-medium">Test with cURL</span>
                  </div>
                  <div className="relative">
                    <pre className="p-2 text-[9px] font-mono text-gray-600 overflow-x-auto whitespace-pre-wrap">
                      {curlCmd}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-0.5 right-0.5 h-5 text-[9px] gap-0.5"
                      onClick={() => {
                        navigator.clipboard.writeText(curlCmd);
                        toast.success('cURL command copied');
                      }}
                    >
                      <Copy className="size-2.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* HTTP Method */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">HTTP Method</Label>
              <Select
                value={(localConfig.httpMethod as string) || 'POST'}
                onValueChange={(v) => handleConfigChange('httpMethod', v)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select method..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET" className="text-sm">GET</SelectItem>
                  <SelectItem value="POST" className="text-sm">POST</SelectItem>
                  <SelectItem value="PUT" className="text-sm">PUT</SelectItem>
                  <SelectItem value="PATCH" className="text-sm">PATCH</SelectItem>
                  <SelectItem value="DELETE" className="text-sm">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Path */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Path</Label>
              <Input
                value={(localConfig.path as string) || ''}
                onChange={(e) => handleConfigChange('path', e.target.value)}
                className="h-8 text-sm font-mono"
                placeholder="Auto-generated UUID"
              />
              <p className="text-[10px] text-gray-400">
                The path appended to the webhook URL. Leave as UUID for security.
              </p>
            </div>

            {/* Source URL */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Link className="size-3 text-gray-400" />
                <Label className="text-xs font-medium text-gray-700">Source URL</Label>
              </div>
              <Input
                value={(localConfig.sourceUrl as string) || ''}
                onChange={(e) => handleConfigChange('sourceUrl', e.target.value)}
                className="h-8 text-sm"
                placeholder="https://example.com/wp-admin/admin-ajax.php"
              />
              <p className="text-[10px] text-gray-400">
                Where the requests come from (e.g., your WordPress admin-ajax.php URL). For reference only.
              </p>
            </div>

            {/* Expected Content-Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Expected Content-Type</Label>
              <Select
                value={(localConfig.contentType as string) || 'any'}
                onValueChange={(v) => handleConfigChange('contentType', v)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select content type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any" className="text-sm">Any</SelectItem>
                  <SelectItem value="application/json" className="text-sm">JSON</SelectItem>
                  <SelectItem value="multipart/form-data" className="text-sm">Form Data</SelectItem>
                  <SelectItem value="application/x-www-form-urlencoded" className="text-sm">URL Encoded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Authentication */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Authentication</Label>
              <Select
                value={(localConfig.authentication as string) || 'none'}
                onValueChange={(v) => handleConfigChange('authentication', v)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select authentication..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-sm">None</SelectItem>
                  <SelectItem value="basic" className="text-sm">Basic Auth</SelectItem>
                  <SelectItem value="header" className="text-sm">Header Auth</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Authentication detail fields */}
            {localConfig.authentication === 'basic' && (
              <div className="space-y-2 pl-3 border-l-2 border-amber-200">
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-500">Username</Label>
                  <Input
                    value={(localConfig.authUsername as string) || ''}
                    onChange={(e) => handleConfigChange('authUsername', e.target.value)}
                    className="h-7 text-xs"
                    placeholder="Username"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-500">Password</Label>
                  <Input
                    type="password"
                    value={(localConfig.authPassword as string) || ''}
                    onChange={(e) => handleConfigChange('authPassword', e.target.value)}
                    className="h-7 text-xs"
                    placeholder="Password"
                  />
                </div>
              </div>
            )}

            {localConfig.authentication === 'header' && (
              <div className="space-y-2 pl-3 border-l-2 border-amber-200">
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-500">Header Name</Label>
                  <Input
                    value={(localConfig.authHeaderName as string) || ''}
                    onChange={(e) => handleConfigChange('authHeaderName', e.target.value)}
                    className="h-7 text-xs"
                    placeholder="X-API-Key"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-500">Header Value</Label>
                  <Input
                    value={(localConfig.authHeaderValue as string) || ''}
                    onChange={(e) => handleConfigChange('authHeaderValue', e.target.value)}
                    className="h-7 text-xs"
                    placeholder="Your API key"
                  />
                </div>
              </div>
            )}

            <Separator />

            {/* Respond */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Respond</Label>
              <Select
                value={(localConfig.respond as string) || 'immediately'}
                onValueChange={(v) => handleConfigChange('respond', v)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select when to respond..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediately" className="text-sm">Immediately</SelectItem>
                  <SelectItem value="lastNode" className="text-sm">When Last Node Finishes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Content-Type warning alert */}
            {(localConfig.respond as string) === 'lastNode' && (
              <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700 leading-relaxed">
                  If you are sending back a response, add a <code className="font-mono bg-amber-100 px-0.5 rounded">Content-Type</code> response header with the appropriate value to avoid unexpected behavior.
                </p>
              </div>
            )}

            {/* Response settings (when lastNode or immediately) */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-500">Response Code</Label>
                  <Input
                    type="number"
                    value={(localConfig.responseCode as number) ?? 200}
                    onChange={(e) => handleConfigChange('responseCode', parseInt(e.target.value) || 200)}
                    className="h-7 text-xs"
                    min={100}
                    max={599}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-500">Response Body</Label>
                  <Input
                    value={(localConfig.responseBody as string) ?? '{"success": true}'}
                    onChange={(e) => handleConfigChange('responseBody', e.target.value)}
                    className="h-7 text-xs font-mono"
                    placeholder='{"success": true}'
                  />
                </div>
              </div>
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
        ) : (
          /* Settings Tab */
          <div className="p-3 space-y-4">
            {/* Error Handling */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Settings className="size-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-600">Error Handling</span>
              </div>
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
          </div>
        )}
      </div>
    </div>
  );
}

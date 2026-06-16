'use client';

import { useState, useCallback } from 'react';
import { useWorkflowStore } from '@/store/workflow-store';
import { getNodeTypeDefinition } from '@/lib/node-registry';
import type { NodeProperty } from '@/types/workflow';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Trash2, Settings, StickyNote } from 'lucide-react';
import { WebhookTriggerPanel } from './webhook-trigger-panel';
import { HttpRequestTriggerPanel } from './http-request-trigger-panel';
import { WhatsAppConfigPanel } from './whatsapp-config-panel';
import { DatabaseConfigPanel } from './database-config-panel';
import { CredentialPicker } from './credential-picker';

// Wrapper that uses key to reset inner component when selection changes
export function NodeConfigPanel() {
  const { nodes, selectedNodeIds } = useWorkflowStore();
  const selectedNodeId = selectedNodeIds[0];
  const node = nodes.find((n) => n.id === selectedNodeId);

  if (!node) {
    return (
      <div className="w-80 border-l bg-white flex items-center justify-center text-sm text-gray-400">
        No node selected
      </div>
    );
  }

  // Use specialized panels for certain node types
  if (node.data.nodeType === 'webhookTrigger') {
    return <WebhookTriggerPanel key={node.id} node={node} />;
  }

  if (node.data.nodeType === 'httpRequestTrigger') {
    return <HttpRequestTriggerPanel key={node.id} node={node} />;
  }

  if (node.data.nodeType === 'databaseNode') {
    return <DatabaseConfigPanel key={node.id} node={node} />;
  }

  if (node.data.nodeType === 'whatsappNode') {
    return <WhatsAppConfigPanel key={node.id} node={node} />;
  }

  return <NodeConfigPanelInner key={node.id} node={node} />;
}

function NodeConfigPanelInner({ node }: { node: import('@/types/workflow').WorkflowNode }) {
  const { updateNode, removeNodes, setSelectedNodes, setWorkflowName } = useWorkflowStore();

  const [localName, setLocalName] = useState(node.name);
  const [localNotes, setLocalNotes] = useState(node.data.notes || '');
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({ ...node.data.config });

  const handleNameChange = useCallback(
    (name: string) => {
      setLocalName(name);
      // Use proper store update - update the node name via the store's state
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

  const nodeDef = getNodeTypeDefinition(node.data.nodeType);
  const IconComponent = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[nodeDef?.icon || 'Circle'] || LucideIcons.Circle;

  return (
    <div
      className="w-80 border-l bg-white flex flex-col shrink-0"
      data-config-panel="true"
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.stopPropagation();
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <div className={cn('flex items-center justify-center size-7 rounded', nodeDef?.color || 'bg-gray-500')}>
            <IconComponent className="size-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 leading-tight">{nodeDef?.displayName}</h3>
            <p className="text-[10px] text-gray-400">
              {nodeDef?.category === 'trigger' ? 'Trigger' :
               nodeDef?.category === 'condition' ? 'Condition' :
               nodeDef?.category === 'action' ? 'Action' :
               nodeDef?.category === 'flowControl' ? 'Flow Control' :
               nodeDef?.category === 'ai' ? 'AI' :
               nodeDef?.category === 'utility' ? 'Utility' :
               nodeDef?.category === 'template' ? 'Template' :
               nodeDef?.category}
            </p>
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

      <ScrollArea className="flex-1">
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

          {/* Configuration Properties */}
          {nodeDef && nodeDef.properties.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <Settings className="size-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-600">Configuration</span>
              </div>
              {nodeDef.properties.map((prop) => (
                <PropertyField
                  key={prop.name}
                  property={prop}
                  value={localConfig[prop.name]}
                  onChange={(value) => handleConfigChange(prop.name, value)}
                  credentialTypes={nodeDef?.credentialTypes}
                />
              ))}
            </div>
          )}

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

          {/* Retry Settings */}
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
      </ScrollArea>
    </div>
  );
}

function PropertyField({
  property,
  value,
  onChange,
  credentialTypes,
}: {
  property: NodeProperty;
  value: unknown;
  onChange: (value: unknown) => void;
  credentialTypes?: string[];
}) {
  switch (property.type) {
    case 'string':
      return (
        <div className="space-y-1">
          <Label className="text-[10px] text-gray-500">
            {property.displayName}
            {property.required && <span className="text-red-400 ml-0.5">*</span>}
          </Label>
          <Input
            value={(value as string) ?? (property.default as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={property.placeholder}
            className="h-7 text-xs"
          />
        </div>
      );

    case 'number':
      return (
        <div className="space-y-1">
          <Label className="text-[10px] text-gray-500">
            {property.displayName}
            {property.required && <span className="text-red-400 ml-0.5">*</span>}
          </Label>
          <Input
            type="number"
            value={(value as number) ?? (property.default as number) ?? ''}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="h-7 text-xs"
          />
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-gray-500">{property.displayName}</Label>
          <Switch
            checked={(value as boolean) ?? (property.default as boolean) ?? false}
            onCheckedChange={(checked) => onChange(checked)}
          />
        </div>
      );

    case 'select':
      return (
        <div className="space-y-1">
          <Label className="text-[10px] text-gray-500">
            {property.displayName}
            {property.required && <span className="text-red-400 ml-0.5">*</span>}
          </Label>
          <Select
            value={(value as string) ?? (property.default as string) ?? ''}
            onValueChange={(v) => onChange(v)}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {property.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'json':
      return (
        <div className="space-y-1">
          <Label className="text-[10px] text-gray-500">
            {property.displayName}
            {property.required && <span className="text-red-400 ml-0.5">*</span>}
          </Label>
          <Textarea
            value={
              typeof value === 'string'
                ? value
                : value
                  ? JSON.stringify(value, null, 2)
                  : (property.default as string) ?? ''
            }
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                onChange(e.target.value);
              }
            }}
            className="min-h-[60px] text-xs font-mono"
            placeholder="{}"
          />
        </div>
      );

    case 'code':
      return (
        <div className="space-y-1">
          <Label className="text-[10px] text-gray-500">
            {property.displayName}
            {property.required && <span className="text-red-400 ml-0.5">*</span>}
          </Label>
          <Textarea
            value={(value as string) ?? (property.default as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[80px] text-xs font-mono"
            placeholder="// Write code here..."
          />
        </div>
      );

    case 'expression':
      return (
        <div className="space-y-1">
          <Label className="text-[10px] text-gray-500">
            {property.displayName}
            {property.required && <span className="text-red-400 ml-0.5">*</span>}
          </Label>
          <div className="relative">
            <Input
              value={(value as string) ?? ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={property.placeholder}
              className="h-7 text-xs pr-8"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 font-mono">
              {'{{ }}'}
            </span>
          </div>
        </div>
      );

    case 'text':
      return (
        <div className="space-y-1">
          <Label className="text-[10px] text-gray-500">
            {property.displayName}
            {property.required && <span className="text-red-400 ml-0.5">*</span>}
          </Label>
          <Textarea
            value={(value as string) ?? (property.default as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[60px] text-xs"
            placeholder="Enter text..."
          />
        </div>
      );

    case 'collection':
      return (
        <div className="space-y-1">
          <Label className="text-[10px] text-gray-500">
            {property.displayName}
            {property.required && <span className="text-red-400 ml-0.5">*</span>}
          </Label>
          <div className="border rounded-md p-2 text-xs text-gray-400 bg-gray-50">
            {property.description || 'Configure items in the collection'}
          </div>
        </div>
      );

    case 'credentials':
      return (
        <CredentialPicker
          property={property}
          value={value as string}
          onChange={onChange as (v: string) => void}
          credentialTypes={credentialTypes}
        />
      );

    case 'color':
      return (
        <div className="space-y-1">
          <Label className="text-[10px] text-gray-500">{property.displayName}</Label>
          <Input
            type="color"
            value={(value as string) ?? (property.default as string) ?? '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 w-full"
          />
        </div>
      );

    default:
      return null;
  }
}

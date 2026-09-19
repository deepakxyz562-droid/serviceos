'use client';

/**
 * Fieseros Universal Studio - Structure Navigator Tree
 * First-class Elementor tree navigator allowing hierarchical selection,
 * drag reordering, visibility toggle, lock, duplicate, and delete.
 */

import React, { useState } from 'react';
import {
  Layers,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  SquareDashed,
  Heading,
  FileSpreadsheet,
  Bot,
  CalendarCheck2,
  Table,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudioNode } from '@/lib/studio/schema/node';

interface NavigatorProps {
  rootNode: StudioNode;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onToggleVisibility: (nodeId: string) => void;
  onToggleLock: (nodeId: string) => void;
  onClose?: () => void;
}

export function StudioNavigator({
  rootNode,
  selectedNodeId,
  onSelectNode,
  onDeleteNode,
  onDuplicateNode,
  onToggleVisibility,
  onToggleLock,
  onClose,
}: NavigatorProps) {
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderTreeItem = (node: StudioNode, depth: number = 0) => {
    const isSelected = selectedNodeId === node.id;
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const isCollapsed = collapsedNodes[node.id];
    const isHidden = node.advanced?.isHidden;
    const isLocked = node.advanced?.isLocked;

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => onSelectNode(node.id)}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          className={`group flex items-center justify-between py-1.5 pr-2 rounded-lg text-xs cursor-pointer transition-colors ${
            isSelected
              ? 'bg-primary/10 text-primary font-bold'
              : 'hover:bg-muted/60 text-foreground'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleCollapse(node.id, e)}
                className="p-0.5 hover:bg-muted rounded text-muted-foreground"
              >
                {isCollapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
              </button>
            ) : (
              <span className="size-4 shrink-0" />
            )}
            <span className="truncate max-w-[120px]">
              {node.name || node.widgetType.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility(node.id);
              }}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
              title={isHidden ? 'Show' : 'Hide'}
            >
              {isHidden ? <EyeOff className="size-3 text-muted-foreground/40" /> : <Eye className="size-3" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicateNode(node.id);
              }}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
              title="Duplicate"
            >
              <Copy className="size-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteNode(node.id);
              }}
              className="p-1 hover:bg-rose-50 rounded text-muted-foreground hover:text-rose-600"
              title="Delete"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        </div>

        {hasChildren && !isCollapsed && (
          <div className="space-y-0.5">
            {node.children!.map((child) => renderTreeItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-72 bg-card border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden select-none z-30">
      {/* Header */}
      <div className="p-3 border-b border-border/80 bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <span className="text-xs font-bold text-foreground">Structure Navigator</span>
        </div>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="size-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 max-h-[420px]">
        {renderTreeItem(rootNode)}
      </div>
    </div>
  );
}

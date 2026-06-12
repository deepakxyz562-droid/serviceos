'use client';

import { useState, useCallback } from 'react';
import { nodeCategories, getNodesByCategory, searchNodes } from '@/lib/node-registry';
import type { NodeTypeDefinition } from '@/types/workflow';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, Search, GripVertical } from 'lucide-react';

export function NodeSidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['trigger', 'crmTrigger', 'logic', 'action', 'data', 'communication']),
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

  const onDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const filteredNodes = searchQuery
    ? searchNodes(searchQuery)
    : null;

  // Group filtered results by category
  const filteredByCategory = filteredNodes
    ? nodeCategories.reduce<Record<string, NodeTypeDefinition[]>>((acc, cat) => {
        const catNodes = filteredNodes.filter((n) => n.category === cat.id);
        if (catNodes.length > 0) acc[cat.id] = catNodes;
        return acc;
      }, {})
    : null;

  return (
    <div className="w-64 border-r bg-background flex flex-col shrink-0 h-full overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b shrink-0">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Nodes</h3>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
        </div>
      </div>

      {/* Node list */}
      <ScrollArea className="flex-1 h-0">
        <div className="p-2">
          {filteredByCategory
            ? // Show filtered results
              Object.entries(filteredByCategory).map(([categoryId, catNodes]) => {
                const category = nodeCategories.find((c) => c.id === categoryId);
                if (!category) return null;
                const CategoryIcon = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[category.icon] || LucideIcons.Circle;
                return (
                  <div key={categoryId} className="mb-1">
                    <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <CategoryIcon className="size-3.5" />
                      {category.label}
                      <span className="text-gray-300 font-normal ml-auto">{catNodes.length}</span>
                    </div>
                    {catNodes.map((nodeDef) => (
                      <NodeCard key={nodeDef.type} nodeDef={nodeDef} onDragStart={onDragStart} />
                    ))}
                  </div>
                );
              })
            : // Show all categories
              nodeCategories.map((category) => {
                const catNodes = getNodesByCategory(category.id);
                const isExpanded = expandedCategories.has(category.id);
                const CategoryIcon = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[category.icon] || LucideIcons.Circle;
                return (
                  <div key={category.id} className="mb-1">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/50 rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="size-3.5" />
                      ) : (
                        <ChevronRight className="size-3.5" />
                      )}
                      <CategoryIcon className="size-3.5" />
                      {category.label}
                      <span className="text-gray-300 font-normal ml-auto">{catNodes.length}</span>
                    </button>
                    {isExpanded &&
                      catNodes.map((nodeDef) => (
                        <NodeCard key={nodeDef.type} nodeDef={nodeDef} onDragStart={onDragStart} />
                      ))}
                  </div>
                );
              })}
          {filteredByCategory && Object.keys(filteredByCategory).length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No nodes found matching &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function NodeCard({
  nodeDef,
  onDragStart,
}: {
  nodeDef: NodeTypeDefinition;
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}) {
  const IconComponent =
    (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[nodeDef.icon] || LucideIcons.Circle;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, nodeDef.type)}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 mx-1 rounded-md cursor-grab',
        'hover:bg-muted/50 active:cursor-grabbing active:bg-muted',
        'transition-colors duration-100 group',
      )}
      title={nodeDef.description}
    >
      <GripVertical className="size-3 text-muted-foreground/50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div
        className={cn(
          'flex items-center justify-center size-6 rounded shrink-0',
          nodeDef.color,
        )}
      >
        <IconComponent className="size-3 text-white" />
      </div>
      <span className="text-xs text-foreground truncate">{nodeDef.displayName}</span>
    </div>
  );
}

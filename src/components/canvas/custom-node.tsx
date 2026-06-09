'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { nodeRegistry, getNodeTypeDefinition } from '@/lib/node-registry';
import { useWorkflowStore } from '@/store/workflow-store';
import { useExecutionStore } from '@/store/execution-store';
import type { NodeStatus } from '@/types/workflow';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  idle: 'bg-gray-300',
  running: 'bg-yellow-400 animate-pulse',
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  waiting: 'bg-blue-400 animate-pulse',
};

function CustomNodeComponent({ id, data, selected }: NodeProps) {
  const nodeType = data.nodeType as string;
  const nodeName = (data.name as string) || nodeType;
  const disabled = data.disabled as boolean;
  const configStatus = data.status as NodeStatus | undefined;
  const { setSelectedNodes, selectedNodeIds } = useWorkflowStore();
  const { nodeStatuses } = useExecutionStore();

  const nodeDef = getNodeTypeDefinition(nodeType);
  const IconComponent = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[nodeDef?.icon || 'Circle'] || LucideIcons.Circle;

  // Execution status takes priority, then the node data status
  const currentStatus: NodeStatus = (nodeStatuses[id] as NodeStatus) || configStatus || 'idle';

  const handleNodeClick = () => {
    setSelectedNodes([id]);
  };

  // Calculate handle positions
  const inputs = nodeDef?.inputs || [];
  const outputs = nodeDef?.outputs || [];

  return (
    <div
      onClick={handleNodeClick}
      className={cn(
        'relative bg-white border-2 rounded-xl shadow-md min-w-[160px] max-w-[220px]',
        'transition-all duration-150 cursor-pointer',
        'hover:shadow-lg hover:-translate-y-0.5',
        selected || selectedNodeIds.includes(id)
          ? 'border-emerald-500 shadow-emerald-100 shadow-lg'
          : 'border-gray-200',
        disabled && 'opacity-50 grayscale',
      )}
    >
      {/* Input Handles - LEFT side */}
      {inputs.map((input, index) => {
        const totalInputs = inputs.length;
        const yOffset = totalInputs === 1 ? 0.5 : (index + 1) / (totalInputs + 1);
        return (
          <Handle
            key={input.id}
            type="target"
            position={Position.Left}
            id={input.id}
            style={{
              top: `${yOffset * 100}%`,
              background: '#94a3b8',
              width: 10,
              height: 10,
              border: '2px solid white',
            }}
          >
            <span
              className="absolute text-[9px] text-gray-400 font-medium whitespace-nowrap"
              style={{ left: 14, top: -5 }}
            >
              {input.displayName || input.name}
            </span>
          </Handle>
        );
      })}

      {/* Node body */}
      <div className="flex items-center gap-2.5 p-3">
        {/* Icon */}
        <div
          className={cn(
            'flex items-center justify-center size-9 rounded-lg shrink-0',
            nodeDef?.color || 'bg-gray-500',
          )}
        >
          <IconComponent className="size-[18px] text-white" strokeWidth={2} />
        </div>

        {/* Name & Type */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-semibold text-gray-900 truncate leading-tight">
            {nodeName}
          </span>
          <span className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5">
            {nodeDef?.displayName || nodeType}
          </span>
        </div>

        {/* Status indicator */}
        <div
          className={cn(
            'size-2.5 rounded-full shrink-0',
            statusColors[currentStatus] || statusColors.idle,
          )}
          title={currentStatus}
        />
      </div>

      {/* Output Handles - RIGHT side */}
      {outputs.map((output, index) => {
        const totalOutputs = outputs.length;
        const yOffset = totalOutputs === 1 ? 0.5 : (index + 1) / (totalOutputs + 1);
        return (
          <Handle
            key={output.id}
            type="source"
            position={Position.Right}
            id={output.id}
            style={{
              top: `${yOffset * 100}%`,
              background: '#10b981',
              width: 10,
              height: 10,
              border: '2px solid white',
            }}
          >
            <span
              className="absolute text-[9px] text-gray-400 font-medium whitespace-nowrap"
              style={{ right: 14, top: -5 }}
            >
              {output.displayName || output.name}
            </span>
          </Handle>
        );
      })}
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);

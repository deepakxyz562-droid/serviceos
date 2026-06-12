'use client';

import { ReactFlowProvider } from '@xyflow/react';
import { WorkflowCanvasInner } from '@/components/canvas/workflow-canvas';
import { NodeSidebar } from '@/components/canvas/node-sidebar';
import { NodeConfigPanel } from '@/components/canvas/node-config-panel';
import { ExecutionPanel } from '@/components/canvas/execution-panel';
import { useAppStore } from '@/store/app-store';
import { useWorkflowStore } from '@/store/workflow-store';
import { Button } from '@/components/ui/button';

export function CanvasView() {
  const { currentWorkflowId, setCurrentView } = useAppStore();
  const { selectedNodeIds, workflowId } = useWorkflowStore();

  // If no workflow is selected, show a prompt
  if (!currentWorkflowId && !workflowId) {
    return (
      <div className="flex-1 flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-muted mx-auto">
            <svg
              className="size-8 text-emerald-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground">No Workflow Selected</h2>
          <p className="text-sm max-w-md">
            Select a workflow from the list or create a new one to start editing.
          </p>
          <Button
            onClick={() => setCurrentView('workflows')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Go to Workflows
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] w-full overflow-hidden">
      <NodeSidebar />
      <div className="flex-1 flex flex-col relative min-w-0">
        <ReactFlowProvider>
          <WorkflowCanvasInner />
        </ReactFlowProvider>
        <ExecutionPanel />
      </div>
      {selectedNodeIds.length > 0 && <NodeConfigPanel />}
    </div>
  );
}

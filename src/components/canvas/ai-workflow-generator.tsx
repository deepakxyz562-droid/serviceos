'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, Wand2, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useWorkflowStore } from '@/store/workflow-store';
import { cn } from '@/lib/utils';

const examplePrompts = [
  'Send a Slack message when a new email arrives with "urgent" in the subject',
  'Generate a daily report from database and send via email',
  'Process form submissions, validate data, and notify on Slack',
  'Monitor an RSS feed and save new items to Google Sheets',
  'Create an AI-powered chatbot that responds to customer inquiries',
  'Backup database records to S3 every night at midnight',
];

export function AIWorkflowGenerator() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [open, setOpen] = useState(false);
  const { setCurrentView, setCurrentWorkflowId } = useAppStore();
  const { setWorkflow } = useWorkflowStore();

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);

    try {
      const res = await fetch('/api/ai/generate-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!res.ok) throw new Error('Failed to generate workflow');
      const data = await res.json();

      const workflow = data.workflow;

      // Create the workflow in the database
      const createRes = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workflow.name || `AI: ${prompt.slice(0, 50)}`,
          nodes: workflow.nodes || [],
          edges: workflow.edges || [],
        }),
      });

      if (!createRes.ok) throw new Error('Failed to create workflow');
      const newWorkflow = await createRes.json();

      // Set the workflow in the store and navigate to canvas
      const wfId = newWorkflow.id;
      setWorkflow(
        wfId,
        workflow.name || `AI: ${prompt.slice(0, 50)}`,
        workflow.nodes || [],
        workflow.edges || [],
        {},
        false,
      );
      setCurrentWorkflowId(wfId);
      setCurrentView('canvas');
      setOpen(false);
      setPrompt('');
    } catch (error) {
      console.error('Failed to generate workflow:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, isGenerating, setCurrentView, setCurrentWorkflowId, setWorkflow]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md"
        >
          <Wand2 className="size-4" />
          AI Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-emerald-500" />
            Generate Workflow with AI
          </DialogTitle>
          <DialogDescription>
            Describe what you want to automate and AI will build the workflow for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the workflow you want to create..."
              className="min-h-[100px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleGenerate();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Press Ctrl+Enter to generate
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Try an example:</p>
            <div className="flex flex-wrap gap-2">
              {examplePrompts.slice(0, 4).map((example) => (
                <button
                  key={example}
                  onClick={() => setPrompt(example)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-full border',
                    'hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700',
                    'transition-colors duration-150 text-left',
                    prompt === example
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'text-muted-foreground',
                  )}
                >
                  {example.length > 45 ? example.slice(0, 45) + '...' : example}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full gap-2"
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating Workflow...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Generate Workflow
                <ArrowRight className="size-4 ml-auto" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

/**
 * Submission Assignment (UI)
 * ---------------------------
 * UI to assign a submission to a CRM agent. Server-action helper lives in
 * `src/lib/forms/platform/submission-assignment-server.ts` (a sibling .ts
 * file because 'use server' + JSX cannot mix in the same file).
 *
 * The exported `assignSubmission` here is the client-callable wrapper that
 * delegates to the server action via dynamic import.
 */
import { useState } from 'react';
import { UserCog, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface CrmAgent {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface SubmissionAssignmentProps {
  submissionId: string;
  agents: CrmAgent[];
  currentAssigneeId?: string;
  onAssign?: (agentId: string) => Promise<void> | void;
  className?: string;
}

export async function assignSubmission(submissionId: string, agentId: string): Promise<void> {
  // Client-callable wrapper — delegates to the server action.
  // The server action lives in src/lib/forms/platform/submission-assignment-server.ts
  // (kept in a separate file because 'use server' + JSX cannot coexist).
  const serverModule = await import('@/lib/forms/platform/submission-assignment-server');
  await serverModule.assignSubmissionServer(submissionId, agentId);
}

export function SubmissionAssignment({
  submissionId, agents, currentAssigneeId, onAssign, className,
}: SubmissionAssignmentProps) {
  const [selected, setSelected] = useState<string | undefined>(currentAssigneeId);
  const [busy, setBusy] = useState(false);

  const currentAgent = agents.find((a) => a.id === currentAssigneeId);

  async function handleAssign() {
    if (!selected || !onAssign) return;
    setBusy(true);
    try {
      await onAssign(selected);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCog className="h-4 w-4" />
          Assign Submission
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {currentAgent && (
          <div className="rounded-md bg-muted/40 p-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span className="font-medium">Currently assigned to:</span>
              <Badge variant="secondary" className="text-[10px]">{currentAgent.name}</Badge>
            </div>
            <div className="mt-1 text-muted-foreground">{currentAgent.email}</div>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="assignee">Assign to CRM Agent</Label>
          <select
            id="assignee"
            value={selected ?? ''}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded border bg-background px-3 py-2 text-sm"
          >
            <option value="">— Select agent —</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} {a.role ? `(${a.role})` : ''}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={handleAssign}
          disabled={!selected || busy || !onAssign}
          className="w-full"
        >
          {busy ? 'Assigning...' : 'Assign Submission'}
        </Button>
        <p className="text-[10px] text-muted-foreground">
          Submission ID: <code className="font-mono">{submissionId}</code>
        </p>
      </CardContent>
    </Card>
  );
}

export default SubmissionAssignment;

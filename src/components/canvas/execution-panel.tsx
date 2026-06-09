'use client';

import { useState, useEffect, useRef } from 'react';
import { useExecutionStore, type LogLevel } from '@/store/execution-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

const levelColors: Record<LogLevel, string> = {
  info: 'text-blue-500',
  warn: 'text-yellow-500',
  error: 'text-red-500',
  success: 'text-emerald-500',
};

const levelBgColors: Record<LogLevel, string> = {
  info: 'bg-blue-50',
  warn: 'bg-yellow-50',
  error: 'bg-red-50',
  success: 'bg-emerald-50',
};

export function ExecutionPanel() {
  const { logs, clearLogs, isExecuting } = useExecutionStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (scrollRef.current && !isCollapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isCollapsed]);

  if (logs.length === 0 && !isExecuting) {
    return null;
  }

  return (
    <div
      className="border-t bg-white shrink-0"
      style={{ height: isCollapsed ? '36px' : '200px', transition: 'height 150ms' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-9 border-b bg-gray-50 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="size-3.5 text-gray-500" />
          <span className="text-xs font-semibold text-gray-600">Execution Log</span>
          <span className="text-[10px] text-gray-400">({logs.length})</span>
          {isExecuting && (
            <span className="flex items-center gap-1 text-[10px] text-yellow-600">
              <span className="size-1.5 bg-yellow-400 rounded-full animate-pulse" />
              Running
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={clearLogs}
            title="Clear logs"
          >
            <Trash2 className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>
        </div>
      </div>

      {/* Log entries */}
      {!isCollapsed && (
        <ScrollArea className="h-[calc(100%-36px)]">
          <div ref={scrollRef} className="p-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  'flex items-start gap-2 px-2 py-1 text-xs font-mono rounded',
                  levelBgColors[log.level],
                )}
              >
                <span className="text-gray-300 shrink-0 tabular-nums">
                  {log.timestamp.toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span className={cn('shrink-0 uppercase font-bold w-14', levelColors[log.level])}>
                  {log.level}
                </span>
                {log.nodeName && (
                  <span className="text-gray-600 shrink-0 font-semibold">[{log.nodeName}]</span>
                )}
                <span className="text-gray-700 break-all">{log.message}</span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                No logs yet. Execute the workflow to see output.
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

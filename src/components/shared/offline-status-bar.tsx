'use client';

import { useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OfflineStatusBarProps {
  variant?: 'banner' | 'pill' | 'compact';
  className?: string;
}

export function OfflineStatusBar({ variant = 'banner', className }: OfflineStatusBarProps) {
  const { isOnline, isSyncing, pendingCount, syncNow } = useOfflineSync();
  const [triggering, setTriggering] = useState(false);

  const handleSync = async () => {
    setTriggering(true);
    try {
      const result = await syncNow();
      if (result.successCount > 0) {
        toast.success(`Synced ${result.successCount} pending item${result.successCount > 1 ? 's' : ''}`);
      } else if (result.failureCount > 0) {
        toast.error('Sync failed. Please check your connection.');
      } else {
        toast.info('Everything is up to date.');
      }
    } catch {
      toast.error('Sync error');
    } finally {
      setTriggering(false);
    }
  };

  // Compact badge for app header
  if (variant === 'compact') {
    if (isOnline && pendingCount === 0 && !isSyncing) {
      return null;
    }

    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        {!isOnline ? (
          <Badge
            variant="outline"
            className="h-7 px-2 bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1.5 cursor-pointer hover:bg-amber-500/20"
            onClick={handleSync}
          >
            <WifiOff className="size-3.5 shrink-0" />
            <span className="text-xs font-medium">Offline</span>
            {pendingCount > 0 && (
              <span className="ml-0.5 px-1 py-0.2 bg-amber-500 text-white text-[10px] rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </Badge>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing || triggering}
            className="h-7 px-2 text-xs border-dashed gap-1.5"
          >
            <RefreshCw className={cn('size-3', (isSyncing || triggering) && 'animate-spin')} />
            {isSyncing || triggering ? 'Syncing...' : `Sync (${pendingCount})`}
          </Button>
        )}
      </div>
    );
  }

  // Pill badge
  if (variant === 'pill') {
    if (isOnline && pendingCount === 0 && !isSyncing) return null;

    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border shadow-xs backdrop-blur-xs transition-colors',
          !isOnline
            ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
            : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
          className
        )}
      >
        {!isOnline ? (
          <>
            <WifiOff className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Offline Mode {pendingCount > 0 ? `(${pendingCount} pending)` : ''}</span>
          </>
        ) : (
          <>
            <RefreshCw className={cn('size-3.5 text-blue-600 dark:text-blue-400 shrink-0', (isSyncing || triggering) && 'animate-spin')} />
            <span>{isSyncing || triggering ? 'Syncing changes...' : `${pendingCount} changes to sync`}</span>
          </>
        )}

        {isOnline && pendingCount > 0 && (
          <Button
            variant="ghost"
            size="xs"
            onClick={handleSync}
            disabled={isSyncing || triggering}
            className="h-5 px-1.5 text-[11px] hover:bg-blue-200/50"
          >
            Sync
          </Button>
        )}
      </div>
    );
  }

  // Default Banner View
  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 p-3 rounded-xl border shadow-xs transition-all animate-in fade-in slide-in-from-top-2 duration-200',
        !isOnline
          ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800/50 text-amber-900 dark:text-amber-200'
          : 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50 text-blue-900 dark:text-blue-200',
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {!isOnline ? (
          <WifiOff className="size-4.5 text-amber-600 dark:text-amber-400 shrink-0" />
        ) : (
          <RefreshCw className={cn('size-4.5 text-blue-600 dark:text-blue-400 shrink-0', (isSyncing || triggering) && 'animate-spin')} />
        )}
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold leading-snug">
            {!isOnline
              ? 'You are in Offline Mode'
              : isSyncing || triggering
                ? 'Syncing offline changes...'
                : 'Connection Restored'}
          </p>
          <p className="text-[11px] sm:text-xs opacity-80 truncate">
            {!isOnline
              ? pendingCount > 0
                ? `${pendingCount} change${pendingCount > 1 ? 's' : ''} queued locally and will sync when reconnected.`
                : 'You can continue working. Data is saved locally.'
              : `${pendingCount} pending update${pendingCount > 1 ? 's' : ''} ready to sync.`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isOnline && (
          <Button
            size="sm"
            onClick={handleSync}
            disabled={isSyncing || triggering}
            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-xs"
          >
            <RefreshCw className={cn('size-3.5', (isSyncing || triggering) && 'animate-spin')} />
            {isSyncing || triggering ? 'Syncing...' : 'Sync Now'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default OfflineStatusBar;

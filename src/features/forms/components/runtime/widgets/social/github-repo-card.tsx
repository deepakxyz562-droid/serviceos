'use client';

import React, { useEffect, useState } from 'react';
import { Github, Star, GitFork, Eye, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface GithubRepoValue {
  owner: string;
  repo: string;
  fullName: string;
  description?: string;
  stars?: number;
  forks?: number;
  watchers?: number;
  language?: string;
  url: string;
  fetchedAt?: string;
}

function formatK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function GithubRepoCard({ value, onChange, config, disabled, field }: WidgetProps) {
  const owner = String(config?.owner ?? (value as GithubRepoValue | undefined)?.owner ?? '');
  const repo = String(config?.repo ?? (value as GithubRepoValue | undefined)?.repo ?? '');
  const showStats = Boolean(config?.showStats ?? true);
  const ariaLabel = String(field?.label ?? 'GitHub repo card');

  const current = value as GithubRepoValue | undefined;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GithubRepoValue | null>(
    current && current.fullName ? current : null,
  );

  const fetchRepo = React.useCallback(async () => {
    if (!owner || !repo || disabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const next: GithubRepoValue = {
        owner, repo,
        fullName: json.full_name,
        description: json.description ?? '',
        stars: json.stargazers_count ?? 0,
        forks: json.forks_count ?? 0,
        watchers: json.subscribers_count ?? 0,
        language: json.language ?? '',
        url: json.html_url,
        fetchedAt: new Date().toISOString(),
      };
      setData(next);
      onChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [owner, repo, disabled, onChange]);

  useEffect(() => {
    if (!owner || !repo) return;
    fetchRepo();
     
  }, [owner, repo]);

  if (!owner || !repo) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <Github className="size-6 mx-auto text-muted-foreground" />
        <p className="text-xs mt-2 font-semibold">No repository configured</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.owner</code> &amp; <code>config.repo</code>.</p>
      </div>
    );
  }

  const url = data?.url ?? `https://github.com/${owner}/${repo}`;

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Github className="size-5 mt-0.5 shrink-0 text-foreground" />
          <div className="flex-1 min-w-0">
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold hover:underline truncate inline-flex items-center gap-1">
              <span className="text-muted-foreground">{owner}/</span>{repo}
              <ExternalLink className="size-3 opacity-60" />
            </a>
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
              {loading ? 'Loading description…' : data?.description || 'GitHub repository'}
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded">
            <AlertCircle className="size-3" />
            <span>Could not fetch live data ({error}). Showing static link.</span>
          </div>
        )}

        {showStats && data && (
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {data.language && (
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500" /> {data.language}
              </span>
            )}
            <span className="inline-flex items-center gap-1"><Star className="size-3" /> {formatK(data.stars ?? 0)}</span>
            <span className="inline-flex items-center gap-1"><GitFork className="size-3" /> {formatK(data.forks ?? 0)}</span>
            <span className="inline-flex items-center gap-1"><Eye className="size-3" /> {formatK(data.watchers ?? 0)}</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1 border-t border-border/60">
          <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 flex-1">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Github className="size-3.5" /> View Repository
            </a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || loading}
            onClick={fetchRepo}
            className="text-xs gap-1.5"
            aria-label="Refresh repository data"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Star className="size-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default GithubRepoCard;

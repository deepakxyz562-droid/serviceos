'use client';

import { ExternalLink, Plus, Sparkles, Gift, Check } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AI_PROVIDERS, type AiProvider } from '@/lib/ai-providers';

interface ProviderCatalogProps {
  /**
   * Called when the user clicks "Add Credential" on a provider card.
   * The parent (CredentialsView) opens its create-credential dialog
   * with the provider's `id` preselected as the credential type and
   * the provider's `name` pre-filled as the service name.
   */
  onAddCredential: (provider: AiProvider) => void;
}

/**
 * "AI Providers" catalog — a grid of cards showing every AI provider the
 * BYOK system supports, with quick links to grab an API key, pricing
 * info, and a one-click "Add Credential" button.
 *
 * This is the Phase 5 "Provider Catalog" from the n8n-style BYOK design:
 * it gives users a single place to discover supported providers, see
 * pricing, and jump straight into creating a credential — instead of
 * having to know in advance which providers are supported.
 *
 * The Platform AI card (free tier) is always shown first so users who
 * don't have their own API key can still get started immediately.
 */
export function ProviderCatalog({ onAddCredential }: ProviderCatalogProps) {
  // Sort: Platform AI first, then providers alphabetically.
  const ordered = [
    ...AI_PROVIDERS.filter((p) => p.id === 'platform_ai'),
    ...AI_PROVIDERS.filter((p) => p.id !== 'platform_ai').sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-emerald-600" />
          <div>
            <h3 className="text-sm font-semibold">AI Providers</h3>
            <p className="text-xs text-muted-foreground">
              Bring your own API key — or use Platform AI free tier. Click{' '}
              <span className="font-medium">Add Credential</span> to pre-fill the form.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
          {AI_PROVIDERS.length} providers
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {ordered.map((provider) => {
          const Icon =
            (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[provider.icon] ||
            LucideIcons.Sparkles;
          const isPlatform = provider.id === 'platform_ai';

          return (
            <Card
              key={provider.id}
              className={cn(
                'overflow-hidden transition-all hover:shadow-md flex flex-col',
                isPlatform && 'border-pink-300 bg-gradient-to-br from-pink-50/60 to-white'
              )}
            >
              <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
                {/* Header: icon + name + free-tier badge */}
                <div className="flex items-start gap-2.5">
                  <div
                    className={cn(
                      'flex items-center justify-center size-9 rounded-lg shrink-0 text-white',
                      provider.color
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold truncate flex items-center gap-1.5">
                      {provider.name}
                      {isPlatform && <Gift className="size-3 text-pink-500 shrink-0" />}
                    </h4>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      {provider.tagline}
                    </p>
                  </div>
                </div>

                {/* Highlights */}
                <div className="flex flex-wrap gap-1">
                  {provider.highlights.map((h) => (
                    <Badge
                      key={h}
                      variant="outline"
                      className={cn(
                        'text-[9px] py-0 px-1.5',
                        h.toLowerCase().includes('free')
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {h}
                    </Badge>
                  ))}
                </div>

                {/* Pricing */}
                <div className="rounded-md bg-muted/60 px-2.5 py-1.5 text-[10px] text-muted-foreground">
                  <span className="font-medium text-foreground">Pricing:</span>{' '}
                  {provider.pricing}
                </div>

                {/* Popular models — small print */}
                {provider.popularModels.length > 0 && !isPlatform && (
                  <div className="text-[10px] text-muted-foreground/80">
                    <span className="font-medium">Models:</span>{' '}
                    {provider.popularModels.slice(0, 3).join(', ')}
                    {provider.popularModels.length > 3 && '…'}
                  </div>
                )}

                {/* Footer actions */}
                <div className="mt-auto pt-2 flex items-center gap-1.5 border-t">
                  {!isPlatform ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                    >
                      <a
                        href={provider.dashboardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Get an API key from ${provider.name}`}
                      >
                        <ExternalLink className="size-3 mr-1" /> Get Key
                      </a>
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] text-pink-600 px-2 h-7">
                      <Check className="size-3" /> No key needed
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'h-7 text-[11px] px-2 ml-auto',
                      isPlatform
                        ? 'border-pink-300 text-pink-700 hover:bg-pink-50 hover:text-pink-800'
                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
                    )}
                    onClick={() => onAddCredential(provider)}
                  >
                    <Plus className="size-3 mr-1" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Industry {
  id: string;
  label: string;
  icon: string;
  description: string;
}

const fallbackIndustries: Industry[] = [
  { id: 'plumbing', label: 'Plumbing', icon: '🔧', description: 'Pipe repair, installation and maintenance services' },
  { id: 'hvac', label: 'HVAC', icon: '❄️', description: 'Heating, ventilation and air conditioning' },
  { id: 'electrical', label: 'Electrical', icon: '⚡', description: 'Electrical installation and repair services' },
  { id: 'cleaning', label: 'Cleaning', icon: '🧹', description: 'Residential and commercial cleaning' },
  { id: 'landscaping', label: 'Landscaping', icon: '🌿', description: 'Lawn care, garden design and maintenance' },
  { id: 'painting', label: 'Painting', icon: '🎨', description: 'Interior and exterior painting services' },
  { id: 'moving', label: 'Moving', icon: '📦', description: 'Residential and commercial moving services' },
  { id: 'delivery', label: 'Delivery', icon: '🚚', description: 'Last-mile and express delivery services' },
  { id: 'restaurant', label: 'Restaurant', icon: '🍽️', description: 'Food service and restaurant operations' },
  { id: 'retail', label: 'Retail', icon: '🛍️', description: 'Retail store operations and management' },
  { id: 'healthcare', label: 'Healthcare', icon: '🏥', description: 'Medical and healthcare services' },
];

export function IndustryOnboarding() {
  const { showOnboarding, setShowOnboarding, currentWorkspaceId } = useAppStore();
  const [industries, setIndustries] = useState<Industry[]>(fallbackIndustries);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Fetch industries from API
  useEffect(() => {
    async function fetchIndustries() {
      try {
        const res = await fetch('/api/workspaces/industries');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setIndustries(data);
          }
        }
      } catch {
        // Use fallback industries
      }
    }
    if (showOnboarding) {
      fetchIndustries();
    }
  }, [showOnboarding]);

  const handleSelect = async (industryId: string) => {
    setSelectedIndustry(industryId);
    setSeeding(true);

    try {
      const workspaceId = currentWorkspaceId || 'default';
      const res = await fetch(`/api/workflows/${workspaceId}/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry: industryId }),
      });

      if (res.ok) {
        const industry = industries.find((i) => i.id === industryId);
        toast.success(`Workspace configured for ${industry?.label || industryId}!`);
        setShowOnboarding(false);
        setSelectedIndustry(null);
      } else {
        toast.error('Failed to configure workspace. Please try again.');
        setSelectedIndustry(null);
      }
    } catch {
      toast.error('Failed to configure workspace. Please try again.');
      setSelectedIndustry(null);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Dialog open={showOnboarding} onOpenChange={(open) => {
      // Only allow closing if not seeding
      if (!seeding) {
        setShowOnboarding(open);
      }
    }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" showCloseButton={!seeding}>
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold">
            Welcome to FlowForge! 🎉
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            What industry is your business in? We&apos;ll set up workflows tailored to your needs.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          {industries.map((industry) => {
            const isSelected = selectedIndustry === industry.id;
            const isLoading = seeding && isSelected;

            return (
              <button
                key={industry.id}
                onClick={() => handleSelect(industry.id)}
                disabled={seeding}
                className={cn(
                  'group relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all duration-200',
                  'hover:border-emerald-400/50 hover:shadow-md hover:shadow-emerald-500/5',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 shadow-md shadow-emerald-500/10'
                    : 'border-border bg-card hover:bg-accent/50',
                  seeding && !isSelected && 'opacity-50 cursor-not-allowed'
                )}
              >
                {/* Emoji Icon */}
                <span className="text-3xl leading-none" role="img" aria-label={industry.label}>
                  {industry.icon}
                </span>

                {/* Label */}
                <span className={cn(
                  'font-semibold text-sm',
                  isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'
                )}>
                  {industry.label}
                </span>

                {/* Description */}
                <span className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {industry.description}
                </span>

                {/* Loading overlay */}
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                      <span className="text-sm font-medium text-emerald-600">Setting up...</span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          You can change your industry later in Settings
        </p>
      </DialogContent>
    </Dialog>
  );
}

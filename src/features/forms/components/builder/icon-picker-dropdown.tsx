'use client';

import React, { useState, useMemo } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { resolveIcon } from '@/lib/forms/icon-resolver';
import { cn } from '@/lib/utils';
import {
  Search,
  ChevronDown,
  Check,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

export interface IconPickerDropdownProps {
  value?: string;
  onChange: (iconName: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

interface IconItem {
  name: string;
  category: 'popular' | 'contact' | 'business' | 'services' | 'status' | 'media' | 'arrows' | 'ui';
  tags: string[];
}

const CURATED_ICONS: IconItem[] = [
  // ─── Popular / Core ──────────────────────────────────────────────────────────
  { name: 'Star', category: 'popular', tags: ['rating', 'favorite', 'review', '5-star'] },
  { name: 'Sparkles', category: 'popular', tags: ['magic', 'ai', 'clean', 'new', 'featured'] },
  { name: 'CheckCircle', category: 'popular', tags: ['success', 'done', 'approved', 'verified'] },
  { name: 'CheckCircle2', category: 'popular', tags: ['success', 'done', 'ok'] },
  { name: 'Check', category: 'popular', tags: ['yes', 'correct', 'done'] },
  { name: 'Shield', category: 'popular', tags: ['security', 'warranty', 'guarantee', 'protection'] },
  { name: 'ShieldCheck', category: 'popular', tags: ['insured', 'licensed', 'guarantee', 'safe'] },
  { name: 'Zap', category: 'popular', tags: ['lightning', 'fast', 'instant', 'speed', 'electric'] },
  { name: 'Heart', category: 'popular', tags: ['love', 'like', 'health', 'care'] },
  { name: 'ThumbsUp', category: 'popular', tags: ['like', 'agree', 'recommend', 'good'] },
  { name: 'Award', category: 'popular', tags: ['badge', 'winner', 'quality', 'certificate'] },
  { name: 'Trophy', category: 'popular', tags: ['champion', 'first', 'reward', 'win'] },
  { name: 'Flame', category: 'popular', tags: ['hot', 'fire', 'trending', 'heating'] },
  { name: 'Crown', category: 'popular', tags: ['vip', 'premium', 'best', 'king'] },
  { name: 'BadgeCheck', category: 'popular', tags: ['verified', 'official', 'trust'] },

  // ─── Contact & Communication ────────────────────────────────────────────────
  { name: 'Phone', category: 'contact', tags: ['call', 'cell', 'telephone', 'hotline'] },
  { name: 'PhoneCall', category: 'contact', tags: ['dial', 'contact', 'incoming'] },
  { name: 'Mail', category: 'contact', tags: ['email', 'letter', 'message', 'inbox'] },
  { name: 'MessageSquare', category: 'contact', tags: ['chat', 'comment', 'sms', 'text'] },
  { name: 'MessageCircle', category: 'contact', tags: ['chat', 'whatsapp', 'support'] },
  { name: 'Send', category: 'contact', tags: ['submit', 'paperplane', 'forward'] },
  { name: 'MapPin', category: 'contact', tags: ['location', 'address', 'place', 'gps'] },
  { name: 'Globe', category: 'contact', tags: ['website', 'world', 'internet', 'online'] },
  { name: 'Share2', category: 'contact', tags: ['social', 'forward', 'distribute'] },
  { name: 'Headphones', category: 'contact', tags: ['support', 'help', 'audio', 'customer'] },
  { name: 'AtSign', category: 'contact', tags: ['mention', 'email', 'user'] },

  // ─── Business & Commerce ────────────────────────────────────────────────────
  { name: 'DollarSign', category: 'business', tags: ['money', 'price', 'cost', 'cash', 'payment', 'usd'] },
  { name: 'CreditCard', category: 'business', tags: ['pay', 'visa', 'mastercard', 'stripe', 'checkout'] },
  { name: 'Wallet', category: 'business', tags: ['money', 'account', 'balance'] },
  { name: 'Receipt', category: 'business', tags: ['invoice', 'bill', 'statement', 'order'] },
  { name: 'Calculator', category: 'business', tags: ['estimate', 'quote', 'math', 'total', 'calc'] },
  { name: 'Briefcase', category: 'business', tags: ['work', 'job', 'business', 'portfolio'] },
  { name: 'Building', category: 'business', tags: ['company', 'office', 'commercial', 'agency'] },
  { name: 'Store', category: 'business', tags: ['shop', 'retail', 'market'] },
  { name: 'TrendingUp', category: 'business', tags: ['growth', 'profit', 'chart', 'analytics'] },
  { name: 'Percent', category: 'business', tags: ['discount', 'offer', 'rate', 'promo'] },
  { name: 'Tag', category: 'business', tags: ['label', 'price', 'coupon'] },
  { name: 'ShoppingBag', category: 'business', tags: ['buy', 'cart', 'order', 'ecommerce'] },

  // ─── Services & Trades ──────────────────────────────────────────────────────
  { name: 'Home', category: 'services', tags: ['house', 'residential', 'property', 'roof'] },
  { name: 'Wrench', category: 'services', tags: ['plumbing', 'repair', 'mechanic', 'fix', 'tool'] },
  { name: 'Hammer', category: 'services', tags: ['construction', 'carpentry', 'builder', 'roofing'] },
  { name: 'Truck', category: 'services', tags: ['dispatch', 'delivery', 'towing', 'mover'] },
  { name: 'Car', category: 'services', tags: ['auto', 'vehicle', 'drive'] },
  { name: 'Key', category: 'services', tags: ['locksmith', 'access', 'security'] },
  { name: 'Lock', category: 'services', tags: ['secure', 'private', 'safety'] },
  { name: 'Unlock', category: 'services', tags: ['open', 'access'] },
  { name: 'Paintbrush', category: 'services', tags: ['painting', 'decorating', 'color'] },
  { name: 'Sun', category: 'services', tags: ['solar', 'energy', 'weather', 'light'] },
  { name: 'Droplets', category: 'services', tags: ['water', 'plumbing', 'pressure washing', 'pool'] },
  { name: 'Wind', category: 'services', tags: ['hvac', 'air', 'ventilation', 'climate'] },

  // ─── Status & Feedback ──────────────────────────────────────────────────────
  { name: 'AlertCircle', category: 'status', tags: ['warning', 'error', 'important', 'notice'] },
  { name: 'AlertTriangle', category: 'status', tags: ['danger', 'caution', 'warning'] },
  { name: 'Info', category: 'status', tags: ['help', 'details', 'note'] },
  { name: 'HelpCircle', category: 'status', tags: ['faq', 'question', 'support'] },
  { name: 'XCircle', category: 'status', tags: ['cancel', 'close', 'wrong'] },
  { name: 'Bell', category: 'status', tags: ['notification', 'alert', 'alarm'] },
  { name: 'CheckSquare', category: 'status', tags: ['checklist', 'task', 'complete'] },
  { name: 'Clock', category: 'status', tags: ['time', 'duration', 'schedule', 'hours'] },
  { name: 'Calendar', category: 'status', tags: ['date', 'booking', 'appointment', 'day'] },

  // ─── Media & Files ──────────────────────────────────────────────────────────
  { name: 'Image', category: 'media', tags: ['photo', 'picture', 'gallery'] },
  { name: 'Camera', category: 'media', tags: ['photo', 'snapshot', 'lens'] },
  { name: 'Video', category: 'media', tags: ['movie', 'recording', 'stream'] },
  { name: 'FileText', category: 'media', tags: ['document', 'pdf', 'contract', 'form'] },
  { name: 'Folder', category: 'media', tags: ['directory', 'files', 'storage'] },
  { name: 'Download', category: 'media', tags: ['save', 'export', 'get'] },
  { name: 'Upload', category: 'media', tags: ['import', 'send', 'file'] },
  { name: 'Eye', category: 'media', tags: ['view', 'show', 'preview'] },

  // ─── Arrows & UI ────────────────────────────────────────────────────────────
  { name: 'ArrowRight', category: 'arrows', tags: ['next', 'forward', 'go', 'continue'] },
  { name: 'ArrowLeft', category: 'arrows', tags: ['back', 'previous'] },
  { name: 'ChevronRight', category: 'arrows', tags: ['next', 'sub', 'expand'] },
  { name: 'ExternalLink', category: 'arrows', tags: ['open', 'new tab', 'url', 'link'] },
  { name: 'User', category: 'ui', tags: ['person', 'profile', 'account', 'customer'] },
  { name: 'Users', category: 'ui', tags: ['team', 'group', 'people', 'staff'] },
  { name: 'Settings', category: 'ui', tags: ['gear', 'configure', 'options', 'setup'] },
  { name: 'Sliders', category: 'ui', tags: ['filters', 'adjust', 'tuning'] },
  { name: 'Plus', category: 'ui', tags: ['add', 'new', 'create'] },
  { name: 'Trash2', category: 'ui', tags: ['delete', 'remove', 'trash'] },
  { name: 'Search', category: 'ui', tags: ['find', 'lookup', 'filter'] },
];

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'popular', label: 'Popular' },
  { id: 'contact', label: 'Contact' },
  { id: 'business', label: 'Business' },
  { id: 'services', label: 'Services' },
  { id: 'status', label: 'Status' },
  { id: 'media', label: 'Media' },
  { id: 'ui', label: 'UI' },
];

export function IconPickerDropdown({
  value = 'Star',
  onChange,
  placeholder = 'Select icon...',
  className = '',
  disabled = false,
}: IconPickerDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const selectedIconName = value || 'Star';
  const SelectedIconComp = resolveIcon(selectedIconName);

  const filteredIcons = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CURATED_ICONS.filter((item) => {
      const matchCat = activeCategory === 'all' || item.category === activeCategory;
      if (!matchCat) return false;
      if (!q) return true;
      const matchName = item.name.toLowerCase().includes(q);
      const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
      return matchName || matchTags;
    });
  }, [search, activeCategory]);

  const handleSelect = (iconName: string) => {
    onChange(iconName);
    setOpen(false);
  };

  const isCustomLucideIcon = !CURATED_ICONS.some((i) => i.name.toLowerCase() === selectedIconName.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground shadow-xs transition-colors hover:bg-muted/40 focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-6 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <SelectedIconComp className="size-3.5" />
            </div>
            <span className="font-semibold text-xs truncate">
              {selectedIconName || placeholder}
            </span>
          </div>
          <ChevronDown className="size-3.5 text-muted-foreground shrink-0 opacity-60 ml-2" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[300px] p-0 shadow-2xl rounded-xl border border-border" align="start">
        {/* Search Header */}
        <div className="p-2.5 border-b border-border/60 space-y-2">
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search icons (e.g. star, check, phone, tool)..."
              className="h-8 pl-8 pr-3 text-xs bg-muted/40 rounded-lg"
              autoFocus
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer',
                  activeCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Icons Grid */}
        <ScrollArea className="h-[240px] p-2">
          {filteredIcons.length > 0 ? (
            <div className="grid grid-cols-4 gap-1.5">
              {filteredIcons.map((item) => {
                const IconComponent = resolveIcon(item.name);
                const isSelected = selectedIconName.toLowerCase() === item.name.toLowerCase();
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleSelect(item.name)}
                    className={cn(
                      'flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer group hover:scale-105 active:scale-95',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                        : 'border-border/50 bg-card hover:bg-muted/50 text-foreground hover:border-emerald-500/40'
                    )}
                    title={item.name}
                  >
                    <IconComponent className={cn('size-5 mb-1 shrink-0 transition-transform group-hover:scale-110', isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground')} />
                    <span className="text-[10px] truncate max-w-full font-medium leading-tight">
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center space-y-2">
              <HelpCircle className="size-6 text-muted-foreground mx-auto opacity-40" />
              <p className="text-xs text-muted-foreground">No matching curated icons.</p>
              {search.trim() && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleSelect(search.trim())}
                  className="text-xs h-7 gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                >
                  <Sparkles className="size-3" />
                  Use custom &ldquo;{search.trim()}&rdquo;
                </Button>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer: Custom Icon Input */}
        <div className="p-2 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-muted-foreground truncate">
            <span>Selected:</span>
            <Badge variant="outline" className="text-[10px] font-mono bg-background text-foreground gap-1 px-1.5 py-0">
              <SelectedIconComp className="size-2.5 text-emerald-600" />
              {selectedIconName}
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground/70">
            {CURATED_ICONS.length} icons
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default IconPickerDropdown;

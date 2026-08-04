'use client';

import { Home, Search, Heart, Calendar, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

const TABS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Browse', href: '/marketplace', icon: ShoppingBag },
  { label: 'Search', href: '/marketplace?focus=search', icon: Search },
  { label: 'Saved', href: '/marketplace?filter=saved', icon: Heart },
  { label: 'Bookings', href: '/?redirect=bookings', icon: Calendar },
];

/**
 * Mobile bottom tab bar for the marketplace.
 *
 * Renders only on screens < lg (1024px). On desktop the sidebar + header
 * handle navigation. 5 tabs: Home, Browse, Search, Saved, Bookings.
 *
 * Uses simple `<Link>` (not `usePathname`) so the marketplace page can stay
 * a fully server-rendered route — `MarketplaceMobileNav` is the only client
 * island in the layout.
 */
export function MarketplaceMobileNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Marketplace navigation"
    >
      <div className="grid grid-cols-5 h-14">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 transition-colors text-muted-foreground hover:text-foreground"
              aria-label={tab.label}
            >
              <Icon className="size-[22px]" />
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default MarketplaceMobileNav;

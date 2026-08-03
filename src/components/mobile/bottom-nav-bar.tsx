'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  Calendar,
  FileText,
  User,
  Briefcase,
  Clock,
  Camera,
  LayoutDashboard,
  Truck,
  Receipt,
  Settings,
  LogIn,
} from 'lucide-react';

interface BottomNavBarProps {
  role?: 'customer' | 'employee' | 'owner' | 'visitor';
}

export function BottomNavBar({ role = 'visitor' }: BottomNavBarProps) {
  const pathname = usePathname();

  const getNavItems = () => {
    switch (role) {
      case 'customer':
        return [
          { label: 'Browse', href: '/marketplace', icon: Compass },
          { label: 'Bookings', href: '/portal', icon: Calendar },
          { label: 'Invoices', href: '/portal/invoices', icon: FileText },
          { label: 'Profile', href: '/portal/profile', icon: User },
        ];
      case 'employee':
        return [
          { label: 'My Jobs', href: '/employee', icon: Briefcase },
          { label: 'Time Clock', href: '/employee?tab=clock', icon: Clock },
          { label: 'Photos', href: '/employee?tab=photos', icon: Camera },
          { label: 'Profile', href: '/employee?tab=profile', icon: User },
        ];
      case 'owner':
        return [
          { label: 'CRM', href: '/crm', icon: LayoutDashboard },
          { label: 'Dispatch', href: '/dispatch', icon: Truck },
          { label: 'Invoices', href: '/invoices', icon: Receipt },
          { label: 'Settings', href: '/settings', icon: Settings },
        ];
      default:
        return [
          { label: 'Explore', href: '/marketplace', icon: Compass },
          { label: 'Services', href: '/marketplace/services', icon: Briefcase },
          { label: 'Login', href: '/login', icon: LogIn },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border px-2 py-1 shadow-lg">
      <nav className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all min-h-[44px] ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold scale-105'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="size-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

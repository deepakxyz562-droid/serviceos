'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  variant?: 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showDropdown?: boolean;
}

export function ThemeToggle({
  className,
  variant = 'ghost',
  size = 'icon',
  showDropdown = false,
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn(
          'size-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors',
          className
        )}
        aria-label="Toggle theme"
      >
        <Sun className="size-4 opacity-50" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  const handleSelectTheme = (nextTheme: string) => {
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('theme', nextTheme);
        localStorage.setItem('fieseros_platform_default_theme', nextTheme);
        document.cookie = `fieseros_default_theme=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`;
        window.dispatchEvent(new Event('theme-change'));
      } catch {
        // ignore
      }
    }
  };

  if (showDropdown) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={cn(
              'size-9 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors relative cursor-pointer',
              className
            )}
            aria-label="Select theme"
            title="Select Theme (Light / Dark / System)"
          >
            <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-teal-400" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36 rounded-xl border border-border bg-card text-foreground dark:border-slate-800 dark:bg-slate-900 shadow-xl">
          <DropdownMenuItem
            onClick={() => handleSelectTheme('light')}
            className={cn(
              'gap-2 font-medium cursor-pointer',
              theme === 'light' && 'text-emerald-600 dark:text-emerald-400 font-semibold bg-muted/60'
            )}
          >
            <Sun className="size-4 text-amber-500" />
            <span>Light</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleSelectTheme('dark')}
            className={cn(
              'gap-2 font-medium cursor-pointer',
              theme === 'dark' && 'text-emerald-600 dark:text-emerald-400 font-semibold bg-muted/60'
            )}
          >
            <Moon className="size-4 text-teal-400" />
            <span>Dark</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleSelectTheme('system')}
            className={cn(
              'gap-2 font-medium cursor-pointer',
              theme === 'system' && 'text-emerald-600 dark:text-emerald-400 font-semibold bg-muted/60'
            )}
          >
            <Laptop className="size-4 text-slate-400" />
            <span>System</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => handleSelectTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'size-9 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors relative cursor-pointer',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Sun className="size-4.5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
      <Moon className="absolute size-4.5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-teal-400" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

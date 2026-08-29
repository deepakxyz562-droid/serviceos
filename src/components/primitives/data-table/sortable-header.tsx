"use client";

import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SortableHeaderProps {
  title: string;
  field: string;
  currentSortBy?: string;
  currentSortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}

export function SortableHeader({
  title,
  field,
  currentSortBy,
  currentSortOrder,
  onSort,
}: SortableHeaderProps) {
  const isSorted = currentSortBy === field;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => onSort?.(field)}
    >
      <span>{title}</span>
      {isSorted ? (
        currentSortOrder === 'asc' ? (
          <ArrowUp className="ml-2 h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <ArrowDown className="ml-2 h-3.5 w-3.5 text-emerald-600" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground opacity-50" />
      )}
    </Button>
  );
}

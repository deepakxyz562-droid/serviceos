"use client";

import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { apiFetch } from '@/lib/api/client';

export interface EmployeeOption {
  id: string;
  name: string;
  role?: string | null;
  status?: string | null;
}

interface EmployeeSelectProps {
  value?: string;
  onChange: (employee: EmployeeOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function EmployeeSelect({
  value,
  onChange,
  placeholder = 'Select employee...',
  disabled = false,
}: EmployeeSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const query = search.trim();
        const url = `/api/employees?limit=20${query ? `&search=${encodeURIComponent(query)}` : ''}`;
        const res = await apiFetch<{ data?: EmployeeOption[]; employees?: EmployeeOption[] }>(url);
        const list = res.data || res.employees || [];
        if (active) setOptions(list);
      } catch {
        if (active) setOptions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    if (!value) {
      setSelectedEmployee(null);
      return;
    }
    const found = options.find((e) => e.id === value);
    if (found) {
      setSelectedEmployee(found);
    } else {
      apiFetch<{ employee?: EmployeeOption; data?: EmployeeOption }>(`/api/employees/${value}`)
        .then((res) => {
          const emp = res.employee || res.data;
          if (emp) setSelectedEmployee(emp);
        })
        .catch(() => {});
    }
  }, [value, options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selectedEmployee ? (
            <span className="flex items-center gap-2 truncate">
              <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="truncate">{selectedEmployee.name}</span>
              {selectedEmployee.role && (
                <span className="text-xs text-muted-foreground capitalize truncate">
                  ({selectedEmployee.role})
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search employee..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center p-4 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading team...
              </div>
            )}
            {!loading && options.length === 0 && (
              <CommandEmpty>No employees found.</CommandEmpty>
            )}
            <CommandGroup>
              {options.map((emp) => (
                <CommandItem
                  key={emp.id}
                  value={emp.id}
                  onSelect={() => {
                    setSelectedEmployee(emp);
                    onChange(emp);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === emp.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{emp.name}</span>
                    <span className="text-xs text-muted-foreground capitalize truncate">
                      {emp.role || 'Team Member'} {emp.status ? `• ${emp.status}` : ''}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

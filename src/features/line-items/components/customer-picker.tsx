'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, X, MapPin, ChevronDown, Check, Pencil, Phone, Mail, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authFetch } from '@/lib/api';
import { CreateCustomerDialog } from './create-customer-dialog';
import { CreatePropertyDialog } from './create-property-dialog';

export interface CustomerPickerCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  properties?: any[];
}

export interface CustomerPickerProps {
  /** The selected customer's ID */
  selectedCustomerId?: string;
  /** Full customer record if already available */
  selectedCustomer?: CustomerPickerCustomer | null;
  /** Currently selected service location address string */
  selectedAddress?: string;
  /** Optional customer list override. If not provided, CustomerPicker loads & searches automatically! */
  customers?: CustomerPickerCustomer[];

  /** Called when a customer is chosen */
  onPick: (customer: CustomerPickerCustomer) => void;
  /** Called when the user clicks 'X' to clear the selected customer */
  onClear?: () => void;
  /** Called when an address is switched or selected */
  onAddressSelect?: (address: string) => void;
  /** Called when the user edits the address manually */
  onCustomAddressChange?: (address: string) => void;
  /** Called when a new customer is created */
  onCustomerCreated?: (customer: CustomerPickerCustomer) => void;
  /** Called when a customer property is added or updated */
  onCustomerUpdated?: (customer: CustomerPickerCustomer) => void;

  /** Optional external control for search query */
  query?: string;
  setQuery?: (v: string) => void;
  /** Optional external control for dropdown open state */
  open?: boolean;
  setOpen?: (v: boolean) => void;
  /** Optional external handler when "Create new client" is clicked */
  onCreate?: (nameQuery: string) => void;
  /** Optional external handler for add address click */
  onAddAddressClick?: () => void;

  placeholder?: string;
  className?: string;
}

export function CustomerPicker({
  selectedCustomerId,
  selectedCustomer,
  selectedAddress,
  customers: externalCustomers,
  onPick,
  onClear,
  onAddressSelect,
  onCustomAddressChange,
  onCustomerCreated,
  onCustomerUpdated,
  query: externalQuery,
  setQuery: setExternalQuery,
  open: externalOpen,
  setOpen: setExternalOpen,
  onCreate: externalOnCreate,
  onAddAddressClick: externalOnAddAddressClick,
  placeholder = 'Select a client',
  className,
}: CustomerPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Internal state for self-contained operation
  const [internalQuery, setInternalQuery] = useState('');
  const [internalOpen, setInternalOpen] = useState(false);
  const [internalCustomers, setInternalCustomers] = useState<CustomerPickerCustomer[]>([]);
  const [defaultCustomers, setDefaultCustomers] = useState<CustomerPickerCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [internalAddress, setInternalAddress] = useState<string>('');

  // Modals state (used if external handlers not provided)
  const [showCreateCustomerDialog, setShowCreateCustomerDialog] = useState(false);
  const [createCustomerPrefill, setCreateCustomerPrefill] = useState({ name: '', phone: '', email: '' });
  const [showCreatePropertyDialog, setShowCreatePropertyDialog] = useState(false);

  // Resolved query & open state (controlled or self-contained)
  const query = externalQuery !== undefined ? externalQuery : internalQuery;
  const setQuery = setExternalQuery || setInternalQuery;
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = setExternalOpen || setInternalOpen;

  // Active customer list
  const customers = externalCustomers || internalCustomers;

  // 1. Initial fetch of default top 20 customers if external customers not supplied
  const fetchDefaultCustomers = useCallback(async () => {
    if (externalCustomers) return;
    try {
      const res = await authFetch('/api/customers?limit=20');
      if (res.ok) {
        const data = await res.json();
        const list = data.customers ?? (Array.isArray(data) ? data : []);
        setDefaultCustomers(list);
        setInternalCustomers(list);
      }
    } catch {
      setDefaultCustomers([]);
      setInternalCustomers([]);
    }
  }, [externalCustomers]);

  useEffect(() => {
    fetchDefaultCustomers();
  }, [fetchDefaultCustomers]);

  // 2. Debounced search when query changes (only if self-contained)
  useEffect(() => {
    if (externalCustomers) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);

    const q = query.trim();
    if (q.length < 2) {
      setInternalCustomers(defaultCustomers);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await authFetch(`/api/customers?search=${encodeURIComponent(q)}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          const list = data.customers ?? (Array.isArray(data) ? data : []);
          setInternalCustomers(list);
        }
      } catch {
        setInternalCustomers([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, defaultCustomers, externalCustomers]);

  // Selected customer object resolution — merge selectedCustomer with internal customers cache for full properties
  const matchingCustomer = customers.find((c) => c.id === (selectedCustomerId || selectedCustomer?.id));
  const selected: CustomerPickerCustomer | null = selectedCustomer
    ? {
        ...selectedCustomer,
        properties: (selectedCustomer.properties && selectedCustomer.properties.length > 0)
          ? selectedCustomer.properties
          : (matchingCustomer?.properties || []),
        address: selectedCustomer.address || matchingCustomer?.address || '',
      }
    : (matchingCustomer || null);

  // Auto-fetch full customer properties if missing from selected object
  useEffect(() => {
    if (!selected?.id) return;
    if (selected.properties && selected.properties.length > 0) return;

    let isMounted = true;
    authFetch(`/api/customers/${selected.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.customer?.properties?.length) {
          const fullCust = { ...selected, ...data.customer };
          setDefaultCustomers((prev) => prev.map((x) => (x.id === fullCust.id ? fullCust : x)));
          setInternalCustomers((prev) => prev.map((x) => (x.id === fullCust.id ? fullCust : x)));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [selected?.id, selected?.properties]);

  // Filtered dropdown items
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 10);
    return customers
      .filter((c) =>
        [c.name, c.phone || '', c.email || '', c.address || '']
          .some((f) => (f || '').toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [customers, query]);

  const handlePickCustomer = (c: CustomerPickerCustomer) => {
    onPick(c);
    setOpen(false);
    setQuery('');

    // Auto-select primary property address if available
    const primaryProp = c.properties?.find((p: any) => p.isPrimary) || c.properties?.[0];
    const propertyAddress = primaryProp
      ? [primaryProp.street1, primaryProp.street2, primaryProp.city, primaryProp.province, primaryProp.postalCode, primaryProp.country]
          .filter(Boolean)
          .join(', ')
      : c.address || '';

    setInternalAddress(propertyAddress);
    onAddressSelect?.(propertyAddress);
    onCustomAddressChange?.(propertyAddress);
  };

  const handleAddressChosen = (addr: string) => {
    setInternalAddress(addr);
    setIsEditingCustom(false);
    onAddressSelect?.(addr);
    onCustomAddressChange?.(addr);
  };

  const handleCreateCustomerClick = () => {
    if (externalOnCreate) {
      externalOnCreate(query);
      setOpen(false);
    } else {
      setCreateCustomerPrefill({ name: query.trim(), phone: '', email: '' });
      setShowCreateCustomerDialog(true);
      setOpen(false);
    }
  };

  const handleCustomerCreatedInternal = (newCust: CustomerPickerCustomer) => {
    setDefaultCustomers((prev) => [newCust, ...prev.filter((x) => x.id !== newCust.id)]);
    setInternalCustomers((prev) => [newCust, ...prev.filter((x) => x.id !== newCust.id)]);
    handlePickCustomer(newCust);
    onCustomerCreated?.(newCust);
  };

  const handleAddLocationClick = () => {
    if (externalOnAddAddressClick) {
      externalOnAddAddressClick();
    } else {
      setShowCreatePropertyDialog(true);
    }
  };

  const handlePropertyCreatedInternal = (updatedCust: CustomerPickerCustomer, newAddr: string) => {
    setDefaultCustomers((prev) => prev.map((x) => (x.id === updatedCust.id ? updatedCust : x)));
    setInternalCustomers((prev) => prev.map((x) => (x.id === updatedCust.id ? updatedCust : x)));
    onPick(updatedCust);
    onCustomerUpdated?.(updatedCust);
    if (newAddr) {
      handleAddressChosen(newAddr);
    }
  };

  // ── 1. SELECTED STATE: Comprehensive, slick Client & Address card ───────────
  if (selected) {
    const properties: any[] = selected.properties || [];
    const currentAddress = selectedAddress !== undefined
      ? selectedAddress
      : (internalAddress || selected.address || (properties[0] ? [properties[0].street1, properties[0].street2, properties[0].city, properties[0].province, properties[0].postalCode, properties[0].country].filter(Boolean).join(', ') : ''));

    return (
      <div className={`rounded-lg border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30 p-3 space-y-2.5 shadow-xs transition-all ${className || ''}`}>
        {/* Top Header: Client name, Contact info, and Clear action */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-emerald-950 dark:text-emerald-200 truncate">
                {selected.name}
              </p>
              {properties.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-200/70 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                  {properties.length} {properties.length === 1 ? 'saved address' : 'saved addresses'}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-emerald-700 dark:text-emerald-400">
              {selected.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3 opacity-70" />
                  {selected.phone}
                </span>
              )}
              {selected.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="size-3 opacity-70" />
                  {selected.email}
                </span>
              )}
            </div>
          </div>

          {onClear && (
            <button
              type="button"
              onClick={() => {
                setIsEditingCustom(false);
                setInternalAddress('');
                onClear();
                inputRef.current?.focus();
              }}
              className="text-emerald-700 hover:text-emerald-950 dark:text-emerald-400 dark:hover:text-emerald-200 p-1 -mr-1 -mt-1 rounded-md hover:bg-emerald-100/60 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
              title="Change client"
              aria-label="Clear selected customer"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Location & Service Address Sub-Box */}
        <div className="rounded-md border border-emerald-200/80 bg-white/80 dark:border-emerald-900/50 dark:bg-black/20 p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                Service Location
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {properties.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] font-medium text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/90 dark:text-emerald-300 dark:bg-emerald-900/60 px-2 gap-1 rounded cursor-pointer"
                    >
                      <span>Change Address</span>
                      <ChevronDown className="size-3 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground">
                      Client Saved Properties ({properties.length})
                    </div>
                    {properties.map((prop, idx) => {
                      const propAddr = [prop.street1, prop.street2, prop.city, prop.province, prop.postalCode, prop.country]
                        .filter(Boolean)
                        .join(', ');
                      const isSelected = currentAddress === propAddr || currentAddress === prop.street1;

                      return (
                        <DropdownMenuItem
                          key={prop.id || idx}
                          onClick={() => handleAddressChosen(propAddr)}
                          className="flex items-start justify-between gap-2 cursor-pointer py-2"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-xs text-foreground flex items-center gap-1">
                              {prop.label || `Address ${idx + 1}`}
                              {prop.isPrimary && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground font-normal">
                                  Primary
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">{propAddr || prop.street1}</p>
                          </div>
                          {isSelected && <Check className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleAddLocationClick}
                      className="text-emerald-700 dark:text-emerald-400 font-medium text-xs cursor-pointer gap-1.5"
                    >
                      <Plus className="size-3.5" /> Add new property address
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddLocationClick}
                className="h-6 text-[11px] font-medium text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/90 dark:text-emerald-300 dark:bg-emerald-900/60 px-2 gap-1 rounded cursor-pointer"
              >
                <Plus className="size-3" />
                <span>Add Location</span>
              </Button>

              <button
                type="button"
                onClick={() => setIsEditingCustom((v) => !v)}
                className="text-emerald-700 hover:text-emerald-950 dark:text-emerald-400 p-1 rounded hover:bg-emerald-100/50 transition-colors cursor-pointer"
                title={isEditingCustom ? 'Done editing' : 'Edit address manually'}
              >
                <Pencil className="size-3" />
              </button>
            </div>
          </div>

          {/* Address Display / Inline Edit Mode */}
          {isEditingCustom ? (
            <div className="pt-1">
              <Input
                value={currentAddress}
                onChange={(e) => handleAddressChosen(e.target.value)}
                placeholder="Enter service location address"
                className="h-8 text-xs bg-white dark:bg-background border-emerald-300 focus-visible:ring-emerald-500"
                autoFocus
              />
            </div>
          ) : (
            <p className="text-xs text-foreground/90 font-medium leading-relaxed pl-5 -mt-0.5 break-words">
              {currentAddress || (
                <span className="text-muted-foreground italic font-normal">
                  No service location specified.{' '}
                  <button
                    type="button"
                    onClick={handleAddLocationClick}
                    className="text-emerald-700 dark:text-emerald-400 underline font-medium cursor-pointer"
                  >
                    Click here to add one.
                  </button>
                </span>
              )}
            </p>
          )}
        </div>

        {/* Embedded Property Add Modal */}
        {!externalOnAddAddressClick && showCreatePropertyDialog && (
          <CreatePropertyDialog
            open={showCreatePropertyDialog}
            onOpenChange={setShowCreatePropertyDialog}
            customerId={selected.id}
            customerName={selected.name}
            existingProperties={selected.properties || []}
            onPropertyCreated={handlePropertyCreatedInternal}
          />
        )}
      </div>
    );
  }

  // ── 2. UNSELECTED STATE: Search input + dropdown list + Create Action ───────
  return (
    <div className={`relative ${className || ''}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        )}
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-72 overflow-y-auto">
          {filtered.length === 0 && !loading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matching client found</div>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handlePickCustomer(c)}
              className="w-full text-left px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border-b border-border last:border-b-0 transition-colors cursor-pointer"
            >
              <p className="font-medium text-sm text-foreground">{c.name}</p>
              {c.address && <p className="text-xs text-muted-foreground truncate">{c.address}</p>}
              <p className="text-xs text-muted-foreground truncate">
                {c.email ? `${c.email} · ` : ''}
                {c.phone}
              </p>
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCreateCustomerClick}
            className="w-full text-left px-3 py-2 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-medium text-sm flex items-center gap-2 border-t border-border cursor-pointer"
          >
            <span className="flex items-center justify-center size-5 rounded-full bg-emerald-600 text-white">
              <Plus className="size-3.5" />
            </span>
            Create new client{query.trim() ? ` "${query.trim()}"` : ''}
          </button>
        </div>
      )}

      {/* Embedded Client Create Modal */}
      {!externalOnCreate && showCreateCustomerDialog && (
        <CreateCustomerDialog
          open={showCreateCustomerDialog}
          onOpenChange={setShowCreateCustomerDialog}
          prefillName={createCustomerPrefill.name}
          prefillPhone={createCustomerPrefill.phone}
          prefillEmail={createCustomerPrefill.email}
          onCreated={handleCustomerCreatedInternal}
        />
      )}
    </div>
  );
}

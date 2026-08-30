'use client';

/**
 * useCustomer360Actions — write-action handlers for the Customer 360° view.
 *
 * Extracted from src/components/views/customer-360-view.tsx (Phase 6B2).
 *
 * Bundles the 5 mutation handlers that the main view used to own inline:
 *   • createBooking        — POST /api/bookings
 *   • createInvoice        — POST /api/invoices
 *   • convertQuoteToJob    — POST /api/quotes/[id]/convert-to-job
 *   • addNote              — POST /api/customers/[id]/timeline
 *   • editNote             — PUT  /api/customers/[id]/timeline/[entryId]
 *   • deleteNote           — DELETE /api/customers/[id]/timeline/[entryId]
 *
 * Each handler invalidates the relevant React Query keys after a successful
 * mutation (always `['customer360', customerId]`, plus `['bookings']` for
 * the booking-create path). Toasts surface success/failure to the user.
 *
 * The hook owns the in-flight flags (`creatingBooking`, `creatingInvoice`,
 * `addingNote`, `convertingQuoteId`) so the parent doesn't have to wire
 * 4 extra `useState` calls + 4 `setX(false)` finally blocks. The parent
 * still owns the form-field state (booking title, invoice items, note text,
 * etc.) because the dialogs are controlled and need the values to render.
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { InvoiceLineItem, NoteEditState } from '../types';

interface UseCustomer360ActionsArgs {
  customerId: string | null;
  customer: any;
  /** Used to clear the booking form after a successful submit. */
  resetBookingForm: () => void;
  /** Used to clear the invoice form after a successful submit. */
  resetInvoiceForm: () => void;
  /** Used to clear the note textarea after a successful submit. */
  resetNoteText: () => void;
}

export function useCustomer360Actions({
  customerId,
  customer,
  resetBookingForm,
  resetInvoiceForm,
  resetNoteText,
}: UseCustomer360ActionsArgs) {
  const queryClient = useQueryClient();
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [convertingQuoteId, setConvertingQuoteId] = useState<string | null>(null);

  const invalidate360 = useCallback(() => {
    if (customerId) {
      queryClient.invalidateQueries({ queryKey: ['customer360', customerId] });
    }
  }, [queryClient, customerId]);

  const createBooking = useCallback(
    async (fields: {
      title: string;
      scheduledAt: string;
      address: string;
      notes: string;
    }) => {
      if (!customer || !fields.title.trim()) {
        toast.error('Title is required');
        return;
      }
      setCreatingBooking(true);
      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: fields.title.trim(),
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerEmail: customer.email,
            scheduledAt: fields.scheduledAt || undefined,
            address: fields.address.trim() || undefined,
            notes: fields.notes.trim() || undefined,
            source: 'manual',
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to create booking');
        }
        toast.success('Booking created successfully');
        resetBookingForm();
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        queryClient.invalidateQueries({ queryKey: ['customer360', customer.id] });
      } catch (e: any) {
        toast.error(e.message || 'Failed to create booking');
      } finally {
        setCreatingBooking(false);
      }
    },
    [customer, resetBookingForm, queryClient]
  );

  const createInvoice = useCallback(
    async (params: {
      items: InvoiceLineItem[];
      dueDate: string;
      notes: string;
    }) => {
      if (!customer) return;
      const validItems = params.items.filter(
        (it) => it.description.trim() && it.quantity > 0 && it.rate >= 0
      );
      if (validItems.length === 0) {
        toast.error('Add at least one valid line item');
        return;
      }
      setCreatingInvoice(true);
      try {
        const res = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: customer.id,
            items: validItems,
            dueDate: params.dueDate || undefined,
            notes: params.notes.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to create invoice');
        }
        toast.success('Invoice created successfully');
        resetInvoiceForm();
        queryClient.invalidateQueries({ queryKey: ['customer360', customer.id] });
      } catch (e: any) {
        toast.error(e.message || 'Failed to create invoice');
      } finally {
        setCreatingInvoice(false);
      }
    },
    [customer, resetInvoiceForm, queryClient]
  );

  const convertQuoteToJob = useCallback(
    async (quoteId: string) => {
      setConvertingQuoteId(quoteId);
      try {
        const res = await fetch(`/api/quotes/${quoteId}/convert-to-job`, {
          method: 'POST',
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 409 && data.jobId) {
            toast.info('This quote was already converted to a job');
          } else {
            toast.error(data.error || 'Failed to convert quote to job');
          }
        } else {
          toast.success('Quote converted to job successfully');
        }
        invalidate360();
      } catch {
        toast.error('Failed to convert quote to job');
      } finally {
        setConvertingQuoteId(null);
      }
    },
    [invalidate360]
  );

  const addNote = useCallback(
    async (text: string) => {
      if (!text.trim() || !customerId) return;
      setAddingNote(true);
      try {
        const res = await fetch(`/api/customers/${customerId}/timeline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entryType: 'note',
            title: text.trim().slice(0, 200),
            description: text.trim(),
          }),
        });
        if (!res.ok) throw new Error('Failed to add note');
        toast.success('Note added');
        resetNoteText();
        invalidate360();
      } catch {
        toast.error('Failed to add note');
      } finally {
        setAddingNote(false);
      }
    },
    [customerId, resetNoteText, invalidate360]
  );

  const editNote = useCallback(
    async (note: NoteEditState) => {
      if (!note || !customerId) return;
      try {
        const res = await fetch(`/api/customers/${customerId}/timeline/${note.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: note.title, description: note.description }),
        });
        if (!res.ok) throw new Error('Failed to edit note');
        toast.success('Note updated');
        invalidate360();
      } catch {
        toast.error('Failed to edit note');
      }
    },
    [customerId, invalidate360]
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      if (!noteId || !customerId) return;
      try {
        const res = await fetch(`/api/customers/${customerId}/timeline/${noteId}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete note');
        toast.success('Note deleted');
        invalidate360();
      } catch {
        toast.error('Failed to delete note');
      }
    },
    [customerId, invalidate360]
  );

  return {
    creatingBooking,
    creatingInvoice,
    addingNote,
    convertingQuoteId,
    createBooking,
    createInvoice,
    convertQuoteToJob,
    addNote,
    editNote,
    deleteNote,
  };
}

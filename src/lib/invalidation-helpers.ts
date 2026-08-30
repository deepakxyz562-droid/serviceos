/**
 * invalidation-helpers.ts
 * =======================
 * Dependency-aware cache invalidation functions for CRM mutations.
 *
 * ─── Why this exists ─────────────────────────────────────────────────────────
 * The user's principle (Phase 1.4):
 *
 *   "Don't create a static invalidation-map.ts with entries like:
 *    create: [qk.jobs.all, qk.dashboard.all, qk.jobs.calendar.all()]
 *    because some dependencies depend on runtime IDs:
 *      job → customerId
 *      job → employeeId
 *      invoice → customerId
 *      booking → employeeId
 *    Instead, make it a dependency function:
 *      getJobInvalidations({ mutation: 'update', customerId, employeeId })
 *    which returns the exact query keys required."
 *
 * ─── How it works ────────────────────────────────────────────────────────────
 * Each function accepts:
 *   - mutation: the type of mutation ('create' | 'update' | 'delete' | ...)
 *   - data: the response from the API (may contain IDs like customerId, assigneeId)
 *   - variables: the request body (may contain IDs)
 *
 * The function extracts the relevant IDs from data/variables and returns ONLY
 * the query keys that are actually affected. For example, createJob only
 * invalidates the customer's detail if the job has a customerId — it doesn't
 * blanket-invalidate all customers.
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 * In a useCrmMutation hook:
 *
 *   const createJob = useCrmMutation({
 *     url: '/api/jobs',
 *     method: 'POST',
 *     invalidate: ({ data, variables }) =>
 *       getJobInvalidations({ mutation: 'create', data, variables }),
 *   });
 *
 * Or inline in a useMutation's onSuccess:
 *
 *   onSuccess: (data, variables) => {
 *     for (const key of getJobInvalidations({ mutation: 'create', data, variables })) {
 *       qc.invalidateQueries({ queryKey: key });
 *     }
 *   }
 *
 * ─── Adding a new entity ─────────────────────────────────────────────────────
 * 1. Add a function: getXxxInvalidations(opts)
 * 2. List every query that COULD be affected by a mutation on that entity
 * 3. For each affected query, determine if it depends on a runtime ID
 * 4. Only include the query key if the runtime ID is present
 */

import { qk, type QueryKey } from '@/lib/query-keys';

// ─── Shared types ────────────────────────────────────────────────────────────

/** Context passed to every invalidation function. */
export interface InvalidationContext<TData = any, TVariables = any> {
  /** The type of mutation that triggered the invalidation. */
  mutation: string;
  /** The response data from the API (may contain IDs like customerId, assigneeId). */
  data?: TData;
  /** The request body / variables passed to the mutation (may contain IDs). */
  variables?: TVariables;
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

/**
 * Dependency-aware invalidation for Job mutations.
 *
 * Affected queries:
 *   - jobs list (always — any job mutation affects the list)
 *   - dashboard (always — job count/KPI changes)
 *   - calendar (always — jobs appear on calendar)
 *   - dispatch (always — dispatch board shows live job status)
 *   - job detail (only for update/delete — the specific job's detail cache)
 *   - customer detail (only if the job has a customerId)
 *   - employee detail (only if the job has an assigneeId/employeeId)
 *
 * @param opts.mutation 'create' | 'update' | 'delete' | 'assign' | 'status'
 * @param opts.data     The API response (job object with customerId, assigneeId, etc.)
 * @param opts.variables The request body (may contain customerId, assigneeId, id)
 */
export function getJobInvalidations(opts: InvalidationContext): QueryKey[] {
  const { mutation, data, variables } = opts;
  const keys: QueryKey[] = [qk.jobs.all, qk.dashboard.all, qk.jobs.calendar.all(), qk.dispatch.all];

  // Job detail — only for update/delete (create doesn't have a cached detail yet,
  // and 'assign'/'status' are sub-types of update)
  const jobId = data?.id ?? variables?.id;
  if ((mutation === 'update' || mutation === 'delete' || mutation === 'assign' || mutation === 'status') && jobId) {
    keys.push(qk.jobs.detail(jobId));
  }

  // Customer detail — only if the job is associated with a customer
  const customerId = data?.customerId ?? variables?.customerId;
  if (customerId) {
    keys.push(qk.customers.detail(customerId));
  }

  // Employee detail — only if the job is assigned to an employee
  const employeeId = data?.assigneeId ?? data?.employeeId ?? variables?.assigneeId ?? variables?.employeeId;
  if (employeeId) {
    keys.push(qk.employees.detail(employeeId));
  }

  // For reassignment, invalidate the OLD employee's detail too
  const oldEmployeeId = variables?.oldAssigneeId ?? variables?.previousEmployeeId;
  if (oldEmployeeId && oldEmployeeId !== employeeId) {
    keys.push(qk.employees.detail(oldEmployeeId));
  }

  return keys;
}

// ─── Invoices ────────────────────────────────────────────────────────────────

/**
 * Dependency-aware invalidation for Invoice mutations.
 *
 * ─── Mutation types ─────────────────────────────────────────────────────────
 * 'create'     → invoices.all (new draft — NO dashboard, draft isn't 'paid')
 * 'duplicate'  → invoices.all (new draft — NO dashboard)
 * 'update'     → invoices.all + invoices.detail(id) + dashboard.all + customers.detail(id)
 * 'delete'     → invoices.all + invoices.detail(id) + dashboard.all + customers.detail(id)
 * 'status'     → invoices.all + invoices.detail(id) + dashboard.all + customers.detail(id)
 * 'mark_paid'  → invoices.all + invoices.detail(id) + dashboard.all + customers.detail(id)
 * 'reopen'     → invoices.all + invoices.detail(id) + dashboard.all + customers.detail(id)
 * 'send'       → invoices.all + invoices.detail(id) (NO dashboard)
 * 'reminder'   → invoices.all + invoices.detail(id) (NO dashboard)
 * 'approve'    → invoices.all + invoices.detail(id) (NO dashboard)
 *
 * ─── Dashboard consumption (verified Phase 1.9d audit) ──────────────────────
 * Dashboard aggregates ONLY 'paid' invoices: db.invoice.aggregate({status:'paid'}).
 * So dashboard invalidation is required ONLY for mutations that change status
 * to/from 'paid', change total of a paid invoice, or delete a paid invoice.
 *
 * ─── Customer detail consumption (verified Phase 1.9d audit) ────────────────
 * /api/customers/[id] returns invoices + computes totalRevenue, outstandingBalance,
 * totalInvoices. So customer detail IS affected by mutations that change invoice
 * status/total/existence.
 *
 * ─── Payments: NOT invalidated ──────────────────────────────────────────────
 * No /api/payments route. No usePayments hook. qk.payments.* has zero consumers.
 *
 * ─── Invoice RQ cache: NOT YET ACTIVE ───────────────────────────────────────
 * invoices-view uses local state (useState + authFetch), NOT React Query. So
 * qk.invoices.* invalidations are currently no-ops. Caller MUST keep its
 * existing setInvoices(prev => ...) local state updates.
 */
export function getInvoiceInvalidations(opts: InvalidationContext): QueryKey[] {
  const { mutation, data, variables } = opts;
  const keys: QueryKey[] = [];

  const invoiceId = data?.id ?? variables?.id;
  const customerId = data?.customerId ?? variables?.customerId;

  // Mutations that DON'T affect dashboard (create draft, duplicate draft, send/reminder/approve)
  const noDashboardMutations = ['create', 'duplicate', 'send', 'reminder', 'approve'];
  if (noDashboardMutations.includes(mutation)) {
    keys.push(qk.invoices.all);
    if (invoiceId) keys.push(qk.invoices.detail(invoiceId));
    return keys;
  }

  // Mutations that DO affect dashboard (update, delete, status, mark_paid, reopen)
  keys.push(qk.invoices.all, qk.dashboard.all);
  if (invoiceId) keys.push(qk.invoices.detail(invoiceId));
  if (customerId) keys.push(qk.customers.detail(customerId));

  return keys;
}

// ─── Leads ───────────────────────────────────────────────────────────────────

/**
 * Dependency-aware invalidation for Lead mutations.
 *
 * ─── Mutation types ─────────────────────────────────────────────────────────
 * 'create'       → leads.all + dashboard.all (new lead affects count + groupBy + recent)
 * 'update'       → leads.all + leads.detail(id) + dashboard.all (status/source/value changes)
 * 'delete'       → leads.all + leads.detail(id) + dashboard.all (count + groupBy change)
 * 'status'       → leads.all + leads.detail(id) + dashboard.all (groupBy status change)
 * 'convert'      → leads.all + leads.detail(id) + dashboard.all + customers.all +
 *                  customers.detail(newCustomerId) + jobs.all + jobs.detail(newJobId) +
 *                  jobs.calendar.all() + dispatch.all
 * 'note'         → leads.detail(id) ONLY (notesJson not consumed by dashboard or list)
 *
 * ─── Dashboard consumption (verified Phase 1.9c audit) ──────────────────────
 * The dashboard API consumes: lead.count, lead.groupBy(status), lead.groupBy(source),
 * lead.findMany(recent 5). NONE of these read notesJson. So note-only updates
 * must NOT invalidate qk.dashboard.all.
 *
 * ─── Conversion (verified Phase 1.9c audit) ─────────────────────────────────
 * /api/leads/convert creates a Customer + Job and updates the Lead (status→won).
 * Response returns { customer: {id}, job: {id}, lead } so detail IDs are available.
 */
export function getLeadInvalidations(opts: InvalidationContext): QueryKey[] {
  const { mutation, data, variables } = opts;

  const leadId = data?.id ?? variables?.id;

  // 'note' — narrowest scope: only detail (notes don't affect list or dashboard)
  if (mutation === 'note') {
    if (leadId) return [qk.leads.detail(leadId)];
    return [];
  }

  const keys: QueryKey[] = [qk.leads.all, qk.dashboard.all];

  // Lead detail — for update/delete/status/convert
  if ((mutation === 'update' || mutation === 'delete' || mutation === 'status' || mutation === 'convert') && leadId) {
    keys.push(qk.leads.detail(leadId));
  }

  // Convert mutation affects multiple entities (creates Customer + Job)
  if (mutation === 'convert') {
    keys.push(
      qk.customers.all,
      qk.jobs.all,
      qk.jobs.calendar.all(),
      qk.dispatch.all,
    );
    // Invalidate the newly-created customer's detail
    const newCustomerId = data?.customerId ?? data?.customer?.id;
    if (newCustomerId) keys.push(qk.customers.detail(newCustomerId));
    // Invalidate the newly-created job's detail
    const newJobId = data?.jobId ?? data?.job?.id;
    if (newJobId) keys.push(qk.jobs.detail(newJobId));
  }

  return keys;
}

// ─── Customers ───────────────────────────────────────────────────────────────

/**
 * Dependency-aware invalidation for Customer mutations.
 *
 * ─── Mutation types ─────────────────────────────────────────────────────────
 * 'create'  → customers.all (new customer appears in list)
 * 'update'  → customers.all + customers.detail(id)
 * 'delete'  → customers.all + customers.detail(id)
 * 'portal'  → customers.all + customers.detail(id) (enable/disable/resend)
 * 'note'    → customers.detail(id) ONLY (notes don't affect list)
 *
 * ─── Dashboard: NOT invalidated ─────────────────────────────────────────────
 * The dashboard API (/api/dashboard/bootstrap) does NOT consume the Customer
 * model — it only consumes lead, invoice, job, employee, workspace,
 * appNotification. So customer mutations must NOT invalidate qk.dashboard.all.
 * This was incorrectly included in Phase 1.9a and corrected in Phase 1.9b
 * after the contacts-view audit verified the dashboard's actual data consumption.
 *
 * ─── Note on timeline refresh ────────────────────────────────────────────────
 * The 'note' mutation invalidates qk.customers.detail(id), which prefix-matches
 * the timeline cache key ['customers','detail',id,'timeline']. HOWEVER, the
 * crm-view's timeline is currently local state (manual authFetch + useState),
 * NOT a React Query cache entry. So the invalidation alone won't refresh it.
 * The caller (crm-view) must keep its existing manual timeline refetch:
 *   fetch timeline → setTimeline(...)
 * This dual responsibility is intentional — see Phase 1.9 audit.
 */
export function getCustomerInvalidations(opts: InvalidationContext): QueryKey[] {
  const { mutation, data, variables } = opts;
  const keys: QueryKey[] = [];

  const customerId = data?.id ?? variables?.id;

  if (mutation === 'note') {
    // Narrowest scope — only detail (which catches timeline via prefix match
    // IF timeline is an RQ query; crm-view's timeline is local state, so the
    // caller must also do a manual refetch).
    if (customerId) keys.push(qk.customers.detail(customerId));
    return keys;
  }

  // create / update / delete / portal — affects list + detail (NO dashboard)
  keys.push(qk.customers.all);
  if (customerId) keys.push(qk.customers.detail(customerId));

  return keys;
}

// ─── Contacts ────────────────────────────────────────────────────────────────

/**
 * Dependency-aware invalidation for Contact mutations.
 *
 * ─── Mutation types ─────────────────────────────────────────────────────────
 * 'create'      → contacts.all
 * 'update'      → contacts.all + contacts.detail(id)
 * 'delete'      → contacts.all + contacts.detail(id)
 * 'bulk'        → contacts.all (bulk tag/group/status changes)
 * 'bulk-delete' → contacts.all (bulk delete — individual IDs not reliably available)
 * 'import'      → contacts.all (CSV/FormData import)
 *
 * ─── Dashboard: NOT invalidated ─────────────────────────────────────────────
 * The dashboard API (/api/dashboard/bootstrap) does NOT consume the Contact
 * model — it only consumes lead, invoice, job, employee, workspace,
 * appNotification. So contact mutations must NOT invalidate qk.dashboard.all.
 * Verified during Phase 1.9b audit via grep of db.* calls in dashboard route.
 *
 * ─── Bulk operations ────────────────────────────────────────────────────────
 * Bulk mutations return only a success count, not individual IDs. So we
 * invalidate qk.contacts.all (catches all list variants) but do NOT attempt
 * to invalidate individual detail caches. If a detail cache exists for a
 * bulk-affected contact, it will be refreshed on next access via staleTime.
 */
export function getContactInvalidations(opts: InvalidationContext): QueryKey[] {
  const { mutation, data, variables } = opts;
  const keys: QueryKey[] = [qk.contacts.all];

  const contactId = data?.id ?? variables?.id;
  if ((mutation === 'update' || mutation === 'delete') && contactId) {
    keys.push(qk.contacts.detail(contactId));
  }

  // 'bulk', 'bulk-delete', 'import' → only contacts.all (no individual details)
  // 'create' → only contacts.all (no detail cache yet)
  return keys;
}

// ─── Bookings ────────────────────────────────────────────────────────────────

/**
 * Dependency-aware invalidation for Booking mutations.
 *
 * Affected queries:
 *   - bookings list (always)
 *   - dashboard (always)
 *   - calendar (always — bookings appear on calendar)
 *   - booking detail (only for update/delete)
 *   - customer detail (only if the booking has a customerId)
 *   - employee detail (only if the booking has an employeeId)
 */
export function getBookingInvalidations(opts: InvalidationContext): QueryKey[] {
  const { mutation, data, variables } = opts;
  // Dashboard does NOT consume bookings (verified Phase 1.x review).
  // Bookings appear on calendar + affect customer/employee detail.
  const keys: QueryKey[] = [qk.bookings.all, qk.jobs.calendar.all()];

  const bookingId = data?.id ?? variables?.id;
  if ((mutation === 'update' || mutation === 'delete') && bookingId) {
    keys.push(qk.bookings.detail(bookingId));
  }

  const customerId = data?.customerId ?? variables?.customerId;
  if (customerId) keys.push(qk.customers.detail(customerId));

  const employeeId = data?.employeeId ?? variables?.employeeId;
  if (employeeId) keys.push(qk.employees.detail(employeeId));

  return keys;
}

// ─── Employees ───────────────────────────────────────────────────────────────

/**
 * Dependency-aware invalidation for Employee mutations.
 *
 * Affected queries:
 *   - employees list (always)
 *   - dashboard (always — employee count KPI changes)
 *   - employee detail (only for update — invalidates ALL tabs for that employee
 *     because the detail key is a prefix of all tab keys)
 */
export function getEmployeeInvalidations(opts: InvalidationContext): QueryKey[] {
  const { mutation, data, variables } = opts;
  const keys: QueryKey[] = [qk.employees.all, qk.dashboard.all];

  const employeeId = data?.id ?? variables?.id;
  if ((mutation === 'update' || mutation === 'delete') && employeeId) {
    // qk.employees.detail(id) is a PREFIX of qk.employees.detail(id).tab(id, tabName),
    // so invalidating the detail catches ALL tabs (jobs, shifts, equipment, etc.)
    keys.push(qk.employees.detail(employeeId));
  }

  return keys;
}

// ─── Expenses ────────────────────────────────────────────────────────────────

/**
 * Dependency-aware invalidation for Expense mutations.
 *
 * Affected queries:
 *   - expenses list (always)
 *   - dashboard (always — expense total KPI changes)
 *   - expense detail (only for update/delete)
 */
export function getExpenseInvalidations(opts: InvalidationContext): QueryKey[] {
  const { mutation, data, variables } = opts;
  // Dashboard does NOT consume expenses (verified Phase 1.x review).
  // Only invalidate expenses cache + detail.
  const keys: QueryKey[] = [qk.expenses.all];

  const expenseId = data?.id ?? variables?.id;
  if ((mutation === 'update' || mutation === 'delete') && expenseId) {
    keys.push(qk.expenses.detail(expenseId));
  }

  return keys;
}

// ─── Quotes ──────────────────────────────────────────────────────────────────

/**
 * Dependency-aware invalidation for Quote mutations.
 *
 * Affected queries:
 *   - quotes list (always)
 *   - dashboard (always — quote count KPI changes)
 *   - quote detail (only for update/delete)
 *   - jobs list (only for convert-to-job)
 *   - customer detail (only if the quote has a customerId)
 */
export function getQuoteInvalidations(opts: InvalidationContext): QueryKey[] {
  const { mutation, data, variables } = opts;
  // Dashboard does NOT consume quotes (verified Phase  1.x review).
  const keys: QueryKey[] = [qk.quotes.all];

  const quoteId = data?.id ?? variables?.id;
  if ((mutation === 'update' || mutation === 'delete') && quoteId) {
    keys.push(qk.quotes.detail(quoteId));
  }

  // Convert-to-job creates a job, so invalidate jobs + calendar + dispatch
  if (mutation === 'convert-to-job' || mutation === 'convert') {
    keys.push(qk.jobs.all, qk.jobs.calendar.all(), qk.dispatch.all);
    const newJobId = data?.jobId ?? data?.job?.id;
    if (newJobId) keys.push(qk.jobs.detail(newJobId));
  }

  const customerId = data?.customerId ?? variables?.customerId;
  if (customerId) keys.push(qk.customers.detail(customerId));

  return keys;
}

// ─── Notifications ───────────────────────────────────────────────────────────

/**
 * Dependency-aware invalidation for Notification mutations.
 *
 * Affected queries:
 *   - notifications list (always)
 *   - unread count (always — mark-read/mark-all-read changes the badge)
 */
export function getNotificationInvalidations(opts: InvalidationContext): QueryKey[] {
  // Notifications don't have a detail cache (they're mutated in-place in the list)
  // The unread count is always affected by mark-read/mark-all-read/archive/delete
  return [qk.notifications.all, qk.notifications.unread()];
}

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
 * Affected queries:
 *   - invoices list (always)
 *   - dashboard (always — revenue KPI changes)
 *   - invoice detail (only for update/delete/payment)
 *   - customer detail (only if the invoice has a customerId)
 *   - payments (only for payment mutations)
 */
export function getInvoiceInvalidations(opts: InvalidationContext): QueryKey[] {
  const { mutation, data, variables } = opts;
  const keys: QueryKey[] = [qk.invoices.all, qk.dashboard.all];

  // Invoice detail
  const invoiceId = data?.id ?? variables?.id;
  if ((mutation === 'update' || mutation === 'delete' || mutation === 'payment') && invoiceId) {
    keys.push(qk.invoices.detail(invoiceId));
  }

  // Customer detail — invoice affects customer balance
  const customerId = data?.customerId ?? variables?.customerId;
  if (customerId) {
    keys.push(qk.customers.detail(customerId));
  }

  // Payments — only for payment-related mutations
  if (mutation === 'payment' || mutation === 'refund') {
    keys.push(qk.payments.all);
    if (customerId) keys.push(qk.payments.forCustomer(customerId));
    if (invoiceId) keys.push(qk.payments.forInvoice(invoiceId));
  }

  return keys;
}

// ─── Leads ───────────────────────────────────────────────────────────────────

/**
 * Dependency-aware invalidation for Lead mutations.
 *
 * Affected queries:
 *   - leads list (always)
 *   - dashboard (always — lead count KPI changes)
 *   - lead detail (only for update/delete)
 *   - customers list (only for convert — lead→customer conversion)
 *   - jobs list (only for convert — lead→job conversion)
 *   - customer detail (only for convert, if a customer was created)
 *   - job detail (only for convert, if a job was created)
 */
export function getLeadInvalidations(opts: InvalidationContext): QueryKey[] {
  const { mutation, data, variables } = opts;
  const keys: QueryKey[] = [qk.leads.all, qk.dashboard.all];

  // Lead detail
  const leadId = data?.id ?? variables?.id;
  if ((mutation === 'update' || mutation === 'delete') && leadId) {
    keys.push(qk.leads.detail(leadId));
  }

  // Convert mutation affects multiple entities
  if (mutation === 'convert') {
    keys.push(qk.customers.all, qk.jobs.all, qk.jobs.calendar.all());
    // If the conversion created a customer, invalidate its detail
    const newCustomerId = data?.customerId ?? data?.customer?.id;
    if (newCustomerId) keys.push(qk.customers.detail(newCustomerId));
    // If the conversion created a job, invalidate its detail
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
  const keys: QueryKey[] = [qk.bookings.all, qk.dashboard.all, qk.jobs.calendar.all()];

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
  const keys: QueryKey[] = [qk.expenses.all, qk.dashboard.all];

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
  const keys: QueryKey[] = [qk.quotes.all, qk.dashboard.all];

  const quoteId = data?.id ?? variables?.id;
  if ((mutation === 'update' || mutation === 'delete') && quoteId) {
    keys.push(qk.quotes.detail(quoteId));
  }

  // Convert-to-job creates a job, so invalidate jobs + calendar
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

/**
 * CA Invoice Agent — Dashboard API Service
 *
 * Calls the runtime pod directly via nginx proxy:
 *   /api/{path} → 127.0.0.1:8080/api/{path}
 *
 * No subscriptionId needed — this dashboard runs on the agent's own pod.
 */

import { apiClient } from '@/lib/apiClient';

// ─── Types ─────────────────────────────────────────────────────────

export interface CaClient {
  id: string;
  name: string;
  gstin?: string;
  pan?: string;
  address?: string;
  state_code?: string;
  financial_year?: string;
  phones?: Array<{ number: string; label: string; branch_id?: string }>;
  created_at: string;
  updated_at: string;
}

export interface CaBranch {
  id: string;
  client_id: string;
  name: string;
  address?: string;
  state_code?: string;
  phone_numbers: string[];
  created_at: string;
}

export interface CaInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  invoice_type: string;
  supply_type: string;
  reverse_charge: boolean;
  voucher_type: string;
  seller_name: string;
  seller_gstin?: string;
  seller_state_code?: string;
  seller_state_name?: string;
  buyer_name: string;
  buyer_gstin?: string;
  buyer_state_code?: string;
  buyer_state_name?: string;
  line_items: InvoiceLineItem[];
  totals: InvoiceTotals;
  status: 'pending_review' | 'approved' | 'rejected' | 'exported';
  client_id?: string;
  client_name?: string;
  sender_phone: string;
  confidence_score: number;
  extraction_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  description: string;
  hsn_sac_code: string;
  quantity: number;
  unit: string;
  rate: number;
  taxable_amount: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  total_amount: number;
}

export interface InvoiceTotals {
  taxable_amount: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  cess_total: number;
  round_off: number;
  grand_total: number;
  amount_in_words?: string;
}

export interface UnknownSender {
  id: string;
  phone_number: string;
  sender_name: string;
  message_count: number;
  first_message_at: string;
  last_message_at: string;
  status: 'pending' | 'assigned' | 'ignored';
}

export interface DashboardStats {
  total_invoices: number;
  pending_review: number;
  approved: number;
  exported: number;
  total_clients: number;
  unknown_senders: number;
  total_amount: number;
  total_taxable: number;
  total_gst: number;
}

export interface DlqItem {
  id: string;
  operation: string;
  error: string;
  sender_phone: string;
  wa_message_id: string;
  media_id: string;
  status: 'unprocessed' | 'pending_reprocess' | 'dismissed';
  retry_count: number;
  created_at: string;
}

// ─── Dashboard ─────────────────────────────────────────────────────

async function getDashboardStats(): Promise<DashboardStats> {
  const resp = await apiClient.get('/api/dashboard/stats');
  return resp.data?.data || resp.data;
}

// ─── Clients ───────────────────────────────────────────────────────

async function listClients(
  params?: { search?: string; limit?: number; offset?: number }
): Promise<{ data: CaClient[]; total: number }> {
  const resp = await apiClient.get('/api/clients', { params });
  return resp.data;
}

async function getClient(clientId: string): Promise<CaClient> {
  const resp = await apiClient.get(`/api/clients/${clientId}`);
  return resp.data?.data || resp.data;
}

async function createClient(data: Partial<CaClient>): Promise<CaClient> {
  const resp = await apiClient.post('/api/clients', data);
  return resp.data?.data || resp.data;
}

async function updateClient(clientId: string, data: Partial<CaClient>): Promise<void> {
  await apiClient.put(`/api/clients/${clientId}`, data);
}

async function deleteClient(clientId: string): Promise<void> {
  await apiClient.delete(`/api/clients/${clientId}`);
}

// ─── Phones ────────────────────────────────────────────────────────

async function addPhoneToClient(
  clientId: string,
  data: { phone_number: string; label?: string; branch_id?: string }
): Promise<void> {
  await apiClient.post(`/api/clients/${clientId}/phones`, data);
}

async function removePhoneFromClient(clientId: string, phoneNumber: string): Promise<void> {
  await apiClient.delete(`/api/clients/${clientId}/phones/${phoneNumber}`);
}

// ─── Branches ──────────────────────────────────────────────────────

async function listBranches(clientId: string): Promise<CaBranch[]> {
  const resp = await apiClient.get(`/api/clients/${clientId}/branches`);
  return resp.data?.data || [];
}

async function createBranch(
  clientId: string,
  data: { name: string; address?: string; state_code?: string }
): Promise<CaBranch> {
  const resp = await apiClient.post(`/api/clients/${clientId}/branches`, data);
  return resp.data?.data || resp.data;
}

// ─── Unknown Senders ───────────────────────────────────────────────

async function listUnknownSenders(status: string = 'pending'): Promise<UnknownSender[]> {
  const resp = await apiClient.get('/api/unknown-senders', { params: { status } });
  return resp.data?.data || [];
}

async function assignUnknownSender(
  senderId: string,
  data: { client_id: string; branch_id?: string }
): Promise<void> {
  await apiClient.post(`/api/unknown-senders/${senderId}/assign`, data);
}

async function ignoreUnknownSender(senderId: string): Promise<void> {
  await apiClient.post(`/api/unknown-senders/${senderId}/ignore`);
}

// ─── Invoices ──────────────────────────────────────────────────────

async function listInvoices(
  params?: {
    client_id?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    limit?: number;
    offset?: number;
    sort_by?: string;
    sort_order?: number;
  }
): Promise<{ data: CaInvoice[]; total: number }> {
  const resp = await apiClient.get('/api/invoices', { params });
  return resp.data;
}

async function getInvoice(invoiceId: string): Promise<CaInvoice> {
  const resp = await apiClient.get(`/api/invoices/${invoiceId}`);
  return resp.data?.data || resp.data;
}

async function updateInvoice(invoiceId: string, data: Partial<CaInvoice>): Promise<void> {
  await apiClient.put(`/api/invoices/${invoiceId}`, data);
}

async function approveInvoice(invoiceId: string): Promise<void> {
  await apiClient.post(`/api/invoices/${invoiceId}/approve`);
}

async function rejectInvoice(invoiceId: string): Promise<void> {
  await apiClient.post(`/api/invoices/${invoiceId}/reject`);
}

async function bulkApproveInvoices(invoiceIds: string[]): Promise<{ modified_count: number }> {
  const resp = await apiClient.post('/api/invoices/bulk-approve', invoiceIds);
  return resp.data;
}

// ─── Export ────────────────────────────────────────────────────────

async function exportTally(params: {
  invoice_ids?: string[];
  client_id?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
  tally_company?: string;
}): Promise<{ xml: string; invoice_count: number }> {
  const resp = await apiClient.post('/api/export/tally', params);
  return resp.data;
}

async function exportCsv(params: {
  invoice_ids?: string[];
  client_id?: string;
  date_from?: string;
  date_to?: string;
}): Promise<{ csv: string; invoice_count: number }> {
  const resp = await apiClient.post('/api/export/csv', params);
  return resp.data;
}

// ─── Dead Letter Queue ────────────────────────────────────────────

async function listDlqItems(status: string = 'unprocessed'): Promise<DlqItem[]> {
  const resp = await apiClient.get('/api/dlq', { params: { status } });
  return resp.data?.data || [];
}

async function reprocessDlqItem(itemId: string): Promise<void> {
  await apiClient.post(`/api/dlq/${itemId}/reprocess`);
}

async function dismissDlqItem(itemId: string): Promise<void> {
  await apiClient.post(`/api/dlq/${itemId}/dismiss`);
}

// ─── Service Object ────────────────────────────────────────────────

export const caInvoiceService = {
  getDashboardStats,
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  addPhoneToClient,
  removePhoneFromClient,
  listBranches,
  createBranch,
  listUnknownSenders,
  assignUnknownSender,
  ignoreUnknownSender,
  listInvoices,
  getInvoice,
  updateInvoice,
  approveInvoice,
  rejectInvoice,
  bulkApproveInvoices,
  exportTally,
  exportCsv,
  listDlqItems,
  reprocessDlqItem,
  dismissDlqItem,
};

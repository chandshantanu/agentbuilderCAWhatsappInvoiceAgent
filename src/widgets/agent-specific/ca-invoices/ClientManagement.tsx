import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronRight,
  FileText,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  caInvoiceService,
  type CaClient,
  type CaBranch,
  type CaInvoice,
  type UnknownSender,
} from '@/services/caInvoiceService';

/* ─── Helpers ──────────────────────────────────────── */

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

/* ─── Client Stats (inline mini-cards) ─────────────── */

function ClientStats({ clientId }: { clientId: string }) {
  const [stats, setStats] = useState<{ invoiceCount: number; pendingCount: number; totalAmount: number; lastDate: string | null }>({
    invoiceCount: 0, pendingCount: 0, totalAmount: 0, lastDate: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [all, pending] = await Promise.all([
          caInvoiceService.listInvoices({ client_id: clientId, limit: 1 }),
          caInvoiceService.listInvoices({ client_id: clientId, status: 'pending_review', limit: 1 }),
        ]);
        // Fetch first page for amount calc
        const invoices = await caInvoiceService.listInvoices({ client_id: clientId, limit: 100 });
        if (cancelled) return;
        const totalAmt = (invoices.data || []).reduce((s, inv) => s + (inv.totals?.grand_total || 0), 0);
        const lastInv = (invoices.data || [])[0];
        setStats({
          invoiceCount: all.total || 0,
          pendingCount: pending.total || 0,
          totalAmount: totalAmt,
          lastDate: lastInv?.invoice_date || null,
        });
      } catch {
        // Silently fail stats
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  if (loading) return <div className="grid grid-cols-2 gap-3"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>;

  const items = [
    { label: 'Total Invoices', value: stats.invoiceCount },
    { label: 'Pending Review', value: stats.pendingCount },
    { label: 'Total Amount', value: formatCurrency(stats.totalAmount) },
    { label: 'Last Invoice', value: stats.lastDate || 'N/A' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label} className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">{item.label}</p>
          <p className="font-semibold text-gray-900 mt-0.5">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Branch Card ──────────────────────────────────── */

function BranchCard({
  branch,
  onAddPhone,
  onRemovePhone,
}: {
  branch: CaBranch;
  onAddPhone: (branchId: string) => void;
  onRemovePhone: (branchId: string, phone: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2.5">
          <Building2 className="h-4 w-4 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900">{branch.name}</p>
            {branch.address && <p className="text-xs text-gray-500">{branch.address}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{branch.phone_numbers?.length || 0} phones</Badge>
          {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          <div className="mt-2 space-y-1.5">
            {branch.state_code && (
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> State Code: {branch.state_code}
              </p>
            )}
            {(branch.phone_numbers || []).length > 0 ? (
              <div className="space-y-1">
                {branch.phone_numbers.map((phone) => (
                  <div key={phone} className="flex items-center justify-between bg-gray-50 rounded px-2.5 py-1.5">
                    <span className="text-xs font-mono text-gray-700 flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-gray-400" /> {phone}
                    </span>
                    <button
                      onClick={() => onRemovePhone(branch.id, phone)}
                      className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remove phone"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No phone numbers mapped</p>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-xs gap-1 mt-1"
              onClick={() => onAddPhone(branch.id)}
            >
              <Plus className="h-3 w-3" /> Add Phone
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Recent Invoices ──────────────────────────────── */

function RecentInvoices({ clientId }: { clientId: string }) {
  const [invoices, setInvoices] = useState<CaInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await caInvoiceService.listInvoices({ client_id: clientId, limit: 5 });
        if (!cancelled) setInvoices(resp.data || []);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  if (loading) return <Skeleton className="h-24" />;
  if (invoices.length === 0) return <p className="text-xs text-gray-400 italic py-3">No invoices yet</p>;

  const STATUS_COLORS: Record<string, string> = {
    pending_review: 'bg-orange-100 text-orange-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    exported: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="space-y-1.5">
      {invoices.map((inv) => (
        <div key={inv.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{inv.invoice_number || 'No #'}</p>
              <p className="text-[10px] text-gray-500">{inv.invoice_date}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono text-gray-700">
              {formatCurrency(inv.totals?.grand_total || 0)}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[inv.status] || ''}`}>
              {inv.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Client Detail Panel ──────────────────────────── */

function ClientDetail({
  client,
  onBack,
  onRefresh,
}: {
  client: CaClient;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [branches, setBranches] = useState<CaBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(client.name);
  const [editGstin, setEditGstin] = useState(client.gstin || '');
  const [editPan, setEditPan] = useState(client.pan || '');
  const [editAddress, setEditAddress] = useState(client.address || '');
  const [editStateCode, setEditStateCode] = useState(client.state_code || '');

  // Dialogs
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [showAddPhone, setShowAddPhone] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchStateCode, setBranchStateCode] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await caInvoiceService.listBranches(client.id);
      setBranches(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleSaveInfo = async () => {
    try {
      await caInvoiceService.updateClient(client.id, {
        name: editName,
        gstin: editGstin || undefined,
        pan: editPan || undefined,
        address: editAddress || undefined,
        state_code: editStateCode || undefined,
      });
      toast({ title: 'Client updated' });
      setEditing(false);
      onRefresh();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCreateBranch = async () => {
    if (!branchName) return;
    try {
      await caInvoiceService.createBranch(client.id, {
        name: branchName,
        address: branchAddress || undefined,
        state_code: branchStateCode || undefined,
      });
      toast({ title: 'Branch created' });
      setShowAddBranch(false);
      setBranchName('');
      setBranchAddress('');
      setBranchStateCode('');
      fetchBranches();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleAddPhone = async () => {
    if (!showAddPhone || !phoneInput) return;
    try {
      await caInvoiceService.addPhoneToClient(client.id, {
        phone_number: phoneInput,
        branch_id: showAddPhone,
      });
      toast({ title: 'Phone added' });
      setShowAddPhone(null);
      setPhoneInput('');
      fetchBranches();
      onRefresh();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleRemovePhone = async (_branchId: string, phone: string) => {
    try {
      await caInvoiceService.removePhoneFromClient(client.id, phone);
      toast({ title: 'Phone removed' });
      fetchBranches();
      onRefresh();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button (mobile) + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors md:hidden"
          aria-label="Back to client list"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{client.name}</h2>
          {client.gstin && <p className="text-xs font-mono text-gray-500">{client.gstin}</p>}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditing(!editing)}
          className="gap-1.5 shrink-0"
        >
          <Pencil className="h-3.5 w-3.5" />
          {editing ? 'Cancel' : 'Edit'}
        </Button>
      </div>

      {/* Info Section */}
      {editing ? (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div>
              <Label className="text-xs">Company Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">GSTIN</Label>
                <Input value={editGstin} onChange={(e) => setEditGstin(e.target.value.toUpperCase())} maxLength={15} className="mt-1 font-mono text-xs" />
              </div>
              <div>
                <Label className="text-xs">PAN</Label>
                <Input value={editPan} onChange={(e) => setEditPan(e.target.value.toUpperCase())} maxLength={10} className="mt-1 font-mono text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">State Code</Label>
              <Input value={editStateCode} onChange={(e) => setEditStateCode(e.target.value)} maxLength={2} className="mt-1 w-20" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSaveInfo}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {client.pan && (
            <div>
              <p className="text-xs text-gray-500">PAN</p>
              <p className="font-mono text-xs">{client.pan}</p>
            </div>
          )}
          {client.address && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500">Address</p>
              <p className="text-sm">{client.address}</p>
            </div>
          )}
          {client.state_code && (
            <div>
              <p className="text-xs text-gray-500">State Code</p>
              <p>{client.state_code}</p>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Statistics</p>
        <ClientStats clientId={client.id} />
      </div>

      {/* Branches */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Branches</p>
          <Button size="sm" variant="outline" onClick={() => setShowAddBranch(true)} className="gap-1 text-xs">
            <Plus className="h-3 w-3" /> Add Branch
          </Button>
        </div>
        {loading ? (
          <div className="space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
        ) : branches.length > 0 ? (
          <div className="space-y-2">
            {branches.map((branch) => (
              <BranchCard
                key={branch.id}
                branch={branch}
                onAddPhone={setShowAddPhone}
                onRemovePhone={handleRemovePhone}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No branches yet</p>
            <p className="text-xs text-gray-400 mt-1">Add a branch to organize phone numbers by location</p>
          </div>
        )}

        {/* Direct phones (not mapped to branches) */}
        {(client.phones || []).filter((p) => !p.branch_id).length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1.5">Direct phones (no branch)</p>
            <div className="space-y-1">
              {client.phones!
                .filter((p) => !p.branch_id)
                .map((p) => (
                  <div key={p.number} className="flex items-center gap-2 bg-gray-50 rounded px-2.5 py-1.5">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span className="text-xs font-mono text-gray-700">{p.number}</span>
                    <Badge variant="outline" className="text-[10px]">{p.label}</Badge>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Invoices */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Invoices</p>
        <RecentInvoices clientId={client.id} />
      </div>

      {/* Add Branch Dialog */}
      <Dialog open={showAddBranch} onOpenChange={setShowAddBranch}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Branch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Branch Name *</Label>
              <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="Head Office" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} />
            </div>
            <div>
              <Label>State Code</Label>
              <Input value={branchStateCode} onChange={(e) => setBranchStateCode(e.target.value)} maxLength={2} className="w-20" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBranch(false)}>Cancel</Button>
            <Button onClick={handleCreateBranch} disabled={!branchName}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Phone to Branch Dialog */}
      <Dialog open={!!showAddPhone} onOpenChange={() => setShowAddPhone(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Phone Number</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Phone Number</Label>
            <Input value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="9876543210" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPhone(null)}>Cancel</Button>
            <Button onClick={handleAddPhone} disabled={!phoneInput}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Client Card (left panel) ─────────────────────── */

function ClientCard({
  client,
  isSelected,
  onClick,
}: {
  client: CaClient;
  isSelected: boolean;
  onClick: () => void;
}) {
  const phoneCount = client.phones?.length || 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3.5 rounded-lg border transition-all ${
        isSelected
          ? 'border-blue-300 bg-blue-50/50 shadow-sm'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm text-gray-900 truncate">{client.name}</p>
          {client.gstin && (
            <p className="text-[10px] font-mono text-gray-500 mt-0.5">{client.gstin}</p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
      </div>
      <div className="flex items-center gap-3 mt-2">
        {phoneCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <Phone className="h-3 w-3" /> {phoneCount}
          </span>
        )}
        {client.state_code && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <MapPin className="h-3 w-3" /> {client.state_code}
          </span>
        )}
      </div>
    </button>
  );
}

/* ─── Main Component ───────────────────────────────── */

export default function ClientManagement({ config }: { config: Record<string, unknown> }) {
  const { toast } = useToast();
  const [clients, setClients] = useState<CaClient[]>([]);
  const [unknownSenders, setUnknownSenders] = useState<UnknownSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<CaClient | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState<UnknownSender | null>(null);

  // Create form
  const [formName, setFormName] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formPan, setFormPan] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formStateCode, setFormStateCode] = useState('');

  // Assign form
  const [assignClientId, setAssignClientId] = useState('');
  const [assignBranchId, setAssignBranchId] = useState('');
  const [assignBranches, setAssignBranches] = useState<CaBranch[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsResp, senders] = await Promise.all([
        caInvoiceService.listClients({ search: search || undefined }),
        caInvoiceService.listUnknownSenders(),
      ]);
      setClients(clientsResp.data || []);
      setUnknownSenders(senders || []);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load branches when assigning to a specific client
  useEffect(() => {
    if (!assignClientId) {
      setAssignBranches([]);
      return;
    }
    caInvoiceService.listBranches(assignClientId).then(setAssignBranches).catch(() => {});
  }, [assignClientId]);

  const handleCreateClient = async () => {
    try {
      const newClient = await caInvoiceService.createClient({
        name: formName,
        gstin: formGstin || undefined,
        pan: formPan || undefined,
        address: formAddress || undefined,
        state_code: formStateCode || undefined,
      });
      toast({ title: 'Client created' });
      setShowCreate(false);
      resetForm();
      fetchData();
      if (newClient?.id) {
        setSelectedClient(newClient);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleAssignSender = async () => {
    if (!showAssign || !assignClientId) return;
    try {
      await caInvoiceService.assignUnknownSender(showAssign.id, {
        client_id: assignClientId,
        branch_id: assignBranchId || undefined,
      });
      toast({ title: `Phone ${showAssign.phone_number} assigned` });
      setShowAssign(null);
      setAssignClientId('');
      setAssignBranchId('');
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleIgnoreSender = async (sender: UnknownSender) => {
    try {
      await caInvoiceService.ignoreUnknownSender(sender.id);
      toast({ title: 'Sender ignored' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      await caInvoiceService.deleteClient(clientId);
      toast({ title: 'Client deleted' });
      if (selectedClient?.id === clientId) setSelectedClient(null);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormName(''); setFormGstin(''); setFormPan('');
    setFormAddress(''); setFormStateCode('');
  };

  return (
    <div className="space-y-4">
      {/* Unknown Senders Banner */}
      {unknownSenders.length > 0 && (
        <Card className="border-orange-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Unknown Senders
              <Badge variant="destructive" className="text-xs">{unknownSenders.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unknownSenders.map((sender) => (
                <div key={sender.id} className="flex items-center justify-between bg-orange-50/50 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <Phone className="h-4 w-4 text-orange-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-mono font-medium text-gray-900">{sender.phone_number}</p>
                      <p className="text-xs text-gray-500">
                        {sender.sender_name || 'Unknown'} &middot; {sender.message_count} messages &middot; Last: {new Date(sender.last_message_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowAssign(sender)}>
                      Assign
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs text-gray-500" onClick={() => handleIgnoreSender(sender)}>
                      Ignore
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Two-Panel Layout */}
      <div className="flex gap-4 min-h-[500px]">
        {/* Left Panel — Client List */}
        <div
          className={`${
            selectedClient ? 'hidden md:flex' : 'flex'
          } flex-col w-full md:w-[340px] md:min-w-[340px] shrink-0`}
        >
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Clients
                  <Badge variant="outline" className="text-xs">{clients.length}</Badge>
                </CardTitle>
                <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search clients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-2 pb-4">
              {loading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
              ) : clients.length > 0 ? (
                clients.map((client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    isSelected={selectedClient?.id === client.id}
                    onClick={() => setSelectedClient(client)}
                  />
                ))
              ) : (
                <div className="text-center py-10">
                  <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No clients yet</p>
                  <p className="text-xs text-gray-400 mt-1">Add your first client to start mapping phone numbers</p>
                  <Button size="sm" variant="outline" className="mt-4" onClick={() => setShowCreate(true)}>
                    Add Client
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel — Client Detail */}
        <div
          className={`${
            selectedClient ? 'flex' : 'hidden md:flex'
          } flex-col flex-1`}
        >
          <Card className="flex-1">
            <CardContent className="pt-5">
              {selectedClient ? (
                <ClientDetail
                  key={selectedClient.id}
                  client={selectedClient}
                  onBack={() => setSelectedClient(null)}
                  onRefresh={fetchData}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                  <Users className="h-12 w-12 text-gray-200 mb-3" />
                  <p className="text-sm text-gray-500">Select a client to view details</p>
                  <p className="text-xs text-gray-400 mt-1">Client info, branches, phones, and invoices will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Client Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client / Company Name *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="ABC Enterprises" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>GSTIN</Label>
                <Input value={formGstin} onChange={(e) => setFormGstin(e.target.value.toUpperCase())} placeholder="27ABCDE1234F1Z5" maxLength={15} />
              </div>
              <div>
                <Label>PAN</Label>
                <Input value={formPan} onChange={(e) => setFormPan(e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
            </div>
            <div>
              <Label>State Code</Label>
              <Input value={formStateCode} onChange={(e) => setFormStateCode(e.target.value)} placeholder="27" maxLength={2} className="w-20" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreateClient} disabled={!formName}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Sender Dialog (with branch selection) */}
      <Dialog open={!!showAssign} onOpenChange={() => setShowAssign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {showAssign?.phone_number} to Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Client</Label>
              <Select value={assignClientId} onValueChange={(v) => { setAssignClientId(v); setAssignBranchId(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {assignBranches.length > 0 && (
              <div>
                <Label>Branch (optional)</Label>
                <Select value={assignBranchId} onValueChange={setAssignBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No branch</SelectItem>
                    {assignBranches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(null)}>Cancel</Button>
            <Button onClick={handleAssignSender} disabled={!assignClientId}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

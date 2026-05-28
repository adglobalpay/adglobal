import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, Building2, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Copy, FileText,
  Link2, Mail, MapPin, Pencil, Phone, Plus, Save, Trash2, UserRound, Users, X
} from 'lucide-react';
import { apiFetch } from '../../lib/auth';

interface LinkedClient {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  documentId: string | null;
  country: string;
}

interface RecipientTransaction {
  id: string;
  fecha: string;
  ingresoUSD: number;
  montoVES: number;
  estado: string;
  metodo: string;
  client: {
    id: string;
    firstName: string;
    lastName: string | null;
  } | null;
  recipient: {
    id: string;
    name: string;
    bank: string;
  } | null;
}

interface RecipientDetail {
  id: string;
  clientId: string;
  name: string;
  relationship: string;
  phone: string | null;
  bank: string;
  accountNumber: string;
  accountType: string;
  identification: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  client: LinkedClient;
  linkedClients: LinkedClient[];
  linkedClientsCount: number;
  groupedRecipientIds: string[];
  duplicateRecordsCount: number;
  _count: {
    transactions: number;
  };
  transactions: RecipientTransaction[];
}

interface AccountTypeItem {
  id: string;
  name: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

const RELACIONES = ['Familiar', 'Hermano/a', 'Prima/o', 'Tío/a', 'Amigo/a', 'Colega', 'Cliente', 'Otro'];
const HISTORY_PAGE_SIZE = 8;

const TX_STATUS_MAP: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: 'Completado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PROCESSING: { label: 'Procesando', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  PENDING: { label: 'Pendiente', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  FAILED: { label: 'Fallido', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  REJECTED: { label: 'Rechazado', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  CANCELLED: { label: 'Cancelado', className: 'bg-slate-100 text-slate-600 border-slate-200' }
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getClientFullName(client: LinkedClient | null | undefined) {
  if (!client) return 'Sin cliente asociado';
  return `${client.firstName} ${client.lastName || ''}`.trim();
}

function getStoredRecipientProfile(): (Partial<RecipientDetail> & { selectedAt?: number }) | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem('adglobal_selected_recipient_profile');
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.id || !parsed?.name) return null;

    const selectedAt = Number(parsed.selectedAt || 0);
    if (selectedAt && Date.now() - selectedAt > 10 * 60 * 1000) return null;

    return parsed;
  } catch {
    return null;
  }
}

function setStoredRecipientProfile(recipient: Partial<RecipientDetail>) {
  if (typeof window === 'undefined' || !recipient?.id || !recipient?.name) return;

  sessionStorage.setItem('adglobal_selected_recipient_profile', JSON.stringify({
    ...recipient,
    selectedAt: Date.now()
  }));
}

function getInitialRecipientId(recipientIdProp: string) {
  if (recipientIdProp) return recipientIdProp;
  if (typeof window === 'undefined') return '';

  const urlId = new URLSearchParams(window.location.search).get('id') || '';
  if (urlId) return urlId;

  return getStoredRecipientProfile()?.id || '';
}

function mergeSelectedRecipient(
  data: RecipientDetail,
  selected: (Partial<RecipientDetail> & { selectedAt?: number }) | null,
  requestedId: string
): RecipientDetail {
  if (!selected?.id || selected.id !== requestedId) return data;

  const apiReturnedRequestedRecipient = data.id === selected.id;
  if (apiReturnedRequestedRecipient) return data;

  return {
    ...data,
    id: selected.id,
    clientId: selected.clientId || data.clientId,
    name: selected.name || data.name,
    relationship: selected.relationship || data.relationship,
    phone: typeof selected.phone !== 'undefined' ? selected.phone : data.phone,
    bank: selected.bank || data.bank,
    accountNumber: selected.accountNumber || data.accountNumber,
    accountType: selected.accountType || data.accountType,
    identification: typeof selected.identification !== 'undefined' ? selected.identification : data.identification,
    notes: typeof selected.notes !== 'undefined' ? selected.notes : data.notes,
    isActive: typeof selected.isActive === 'boolean' ? selected.isActive : data.isActive,
    createdAt: selected.createdAt || data.createdAt,
    updatedAt: selected.updatedAt || data.updatedAt,
    client: selected.client || data.client,
    linkedClients: selected.linkedClients && selected.linkedClients.length > 0 ? selected.linkedClients : data.linkedClients,
    linkedClientsCount: selected.linkedClientsCount || data.linkedClientsCount,
    groupedRecipientIds: selected.groupedRecipientIds && selected.groupedRecipientIds.length > 0 ? selected.groupedRecipientIds : data.groupedRecipientIds,
    duplicateRecordsCount: selected.duplicateRecordsCount || data.duplicateRecordsCount,
    _count: selected._count || data._count,
    transactions: apiReturnedRequestedRecipient ? data.transactions : []
  };
}

export default function RecipientDetailPage({ recipientId: recipientIdProp }: { recipientId: string }) {
  const [recipient, setRecipient] = useState<RecipientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banks, setBanks] = useState<string[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountTypeItem[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const [recipientId, setRecipientId] = useState(() => getInitialRecipientId(recipientIdProp));

  const [form, setForm] = useState({
    name: '',
    relationship: 'Familiar',
    phone: '',
    bank: '',
    accountNumber: '',
    accountType: '',
    identification: '',
    notes: ''
  });

  const loadRecipient = useCallback(async () => {
    if (!recipientId) {
      setRecipient(null);
      setError('Falta el identificador del destinatario');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/api/recipients/${recipientId}`);
      const resolvedRecipient = mergeSelectedRecipient(data, getStoredRecipientProfile(), recipientId);
      setRecipient(resolvedRecipient);
      setStoredRecipientProfile(resolvedRecipient);
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar el destinatario');
    } finally {
      setLoading(false);
    }
  }, [recipientId]);

  useEffect(() => {
    setRecipientId(getInitialRecipientId(recipientIdProp));
  }, [recipientIdProp]);

  useEffect(() => {
    loadRecipient();
    apiFetch('/api/banks')
      .then((data) => setBanks(data.filter((item: any) => item.isActive !== false).map((item: any) => item.label)))
      .catch(() => setBanks([]));
    apiFetch('/api/account-types')
      .then((data) => setAccountTypes(data))
      .catch(() => setAccountTypes([]));
  }, [loadRecipient]);

  const activeAccountTypeLabels = useMemo(
    () => accountTypes.filter((type) => type.isActive !== false).map((type) => type.label),
    [accountTypes]
  );
  const historyTotalPages = useMemo(
    () => Math.max(1, Math.ceil((recipient?.transactions.length || 0) / HISTORY_PAGE_SIZE)),
    [recipient?.transactions.length]
  );
  const paginatedTransactions = useMemo(() => {
    if (!recipient) return [];
    const start = (historyPage - 1) * HISTORY_PAGE_SIZE;
    return recipient.transactions.slice(start, start + HISTORY_PAGE_SIZE);
  }, [historyPage, recipient]);

  useEffect(() => {
    setHistoryPage(1);
  }, [recipient?.id]);

  useEffect(() => {
    if (historyPage > historyTotalPages) {
      setHistoryPage(historyTotalPages);
    }
  }, [historyPage, historyTotalPages]);

  const openEditModal = () => {
    if (!recipient) return;
    setForm({
      name: recipient.name,
      relationship: recipient.relationship,
      phone: recipient.phone || '',
      bank: recipient.bank,
      accountNumber: recipient.accountNumber,
      accountType: recipient.accountType,
      identification: recipient.identification || '',
      notes: recipient.notes || ''
    });
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    if (isSaving) return;
    setIsEditOpen(false);
  };

  useEffect(() => {
    if (!isEditOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        setIsEditOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditOpen, isSaving]);

  const handleCopy = (value: string, label: string) => {
    navigator.clipboard.writeText(value).then(() => {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: 'Copiado', description: `${label} copiado al portapapeles.` }
      }));
    });
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recipient) return;

    setIsSaving(true);
    try {
      await apiFetch(`/api/recipients/${recipient.id}`, {
        method: 'PATCH',
        body: JSON.stringify(form)
      });

      setIsEditOpen(false);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: 'Destinatario actualizado', description: 'La ficha fue actualizada correctamente.' }
      }));
      await loadRecipient();
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'Error', description: err.message }
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!recipient) return;
    if (!confirm('¿Eliminar este destinatario? Esta acción afecta el registro principal de esta ficha.')) return;

    try {
      await apiFetch(`/api/recipients/${recipient.id}`, { method: 'DELETE' });
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: 'Destinatario eliminado', description: 'El registro principal fue eliminado correctamente.' }
      }));
      window.location.href = '/admin/clientes';
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'Error', description: err.message }
      }));
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-8 h-40 shimmer" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="bg-white rounded-2xl p-5 h-28 shimmer" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 h-72 shimmer" />
          <div className="bg-white rounded-2xl p-6 h-72 shimmer" />
        </div>
      </div>
    );
  }

  if (error || !recipient) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-red-700 text-sm font-medium">
          Error al cargar destinatario: {error || 'No encontrado'}
        </div>
      </div>
    );
  }

  const primaryClientName = getClientFullName(recipient.client);
  const duplicateNotice = recipient.duplicateRecordsCount > 1;
  const primaryTransactionClientId = recipient.client?.id || recipient.linkedClients[0]?.id || '';

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        <nav className="flex items-center gap-2 text-xs md:text-sm text-slate-400 font-medium anim-fade-in-up stagger-1">
          <a href="/admin/clientes" className="hover:text-indigo-600 transition-colors">Clientes</a>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-700 font-semibold">Destinatarios</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-700 font-semibold">{recipient.name}</span>
        </nav>

        <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 md:p-8 anim-fade-in-up stagger-2 card-hover">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#0f172a_30%,#06b6d4_100%)] flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-lg shadow-cyan-500/20 shrink-0">
                {recipient.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">{recipient.name}</h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border bg-cyan-50 text-cyan-700 border-cyan-200">
                    <Users className="w-3.5 h-3.5" /> {recipient.linkedClientsCount} cliente{recipient.linkedClientsCount === 1 ? '' : 's'}
                  </span>
                  {duplicateNotice && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200">
                      <Link2 className="w-3.5 h-3.5" /> {recipient.duplicateRecordsCount} registros agrupados
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-500 font-medium">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[0.65rem] font-black uppercase tracking-wider border border-slate-200">
                    {recipient.relationship}
                  </span>
                  {recipient.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />{recipient.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />{recipient.bank}
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[0.65rem] font-black uppercase tracking-wider border border-indigo-100">
                    {recipient.accountType}
                  </span>
                  {recipient.identification && (
                    <span className="flex items-center gap-1.5">
                      <UserRound className="w-3.5 h-3.5" />{recipient.identification}
                    </span>
                  )}
                </div>

                {recipient.notes && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl text-sm text-slate-600 font-medium border border-slate-100">
                    📝 {recipient.notes}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                onClick={openEditModal}
                className="btn-interactive inline-flex items-center gap-2 px-4 py-2.5 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_48%,#eff6ff_100%)] text-slate-800 rounded-xl font-bold text-sm border border-slate-200 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] hover:border-cyan-200"
              >
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900 text-white shadow-sm">
                  <Pencil className="w-3.5 h-3.5" />
                </span>
                Editar
              </button>
              <button
                onClick={handleDelete}
                className="btn-interactive inline-flex items-center justify-center w-[42px] h-[42px] bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-xl transition-colors shrink-0"
                title="Eliminar destinatario"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <a
                href={primaryTransactionClientId ? `/admin/transacciones/nueva?clienteId=${primaryTransactionClientId}&destinatarioId=${recipient.id}` : `/admin/transacciones?destinatario=${recipient.id}`}
                className="btn-interactive inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25"
              >
                <Plus className="w-4 h-4" /> Nueva transacción
              </a>
            </div>
          </div>

          {duplicateNotice && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,1)_0%,rgba(255,255,255,1)_100%)] px-4 py-3 text-sm text-amber-800 shadow-[0_18px_45px_-32px_rgba(245,158,11,0.55)]">
              Esta ficha agrupa registros heredados que comparten la misma cuenta, teléfono o identificación. Aquí se muestran juntos los clientes vinculados y el historial consolidado.
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 anim-fade-in-up stagger-3">
          {[
            { label: 'Transacciones', value: String(recipient._count?.transactions || 0), icon: <FileText className="w-5 h-5" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Clientes vinculados', value: String(recipient.linkedClientsCount), icon: <Users className="w-5 h-5" />, color: 'text-cyan-600', bg: 'bg-cyan-50' },
            { label: 'Registros', value: String(recipient.duplicateRecordsCount), icon: <Link2 className="w-5 h-5" />, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Actualizado', value: formatDate(recipient.updatedAt), icon: <CalendarDays className="w-5 h-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' }
          ].map((stat, index) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-200/60 p-4 md:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] card-hover anim-fade-in-up" style={{ animationDelay: `${0.25 + index * 0.05}s` }}>
              <div className={`w-9 h-9 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-3`}>{stat.icon}</div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
              <p className="text-xl md:text-2xl font-bold text-slate-800 mt-1 tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6">
          <section className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 md:p-6 card-hover anim-fade-in-up stagger-4">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center"><Users className="w-5 h-5" /></div>
                <div>
                  <h2 className="text-base md:text-lg font-bold text-slate-800">Clientes vinculados</h2>
                  <p className="text-xs text-slate-400 font-medium">{recipient.linkedClientsCount} relacionados con este destinatario</p>
                </div>
              </div>
            </div>

            <div className="max-h-[34rem] overflow-y-auto pr-1 md:pr-2">
              <div className="grid grid-cols-1 gap-3">
              {recipient.linkedClients.map((client) => {
                const isPrimaryOwner = client.id === recipient.clientId;
                const fullName = getClientFullName(client);

                return (
                  <div key={client.id} className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.35)]">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-sm text-slate-800">{fullName}</p>
                          {isPrimaryOwner && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-slate-600">
                              Principal
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 rounded-md border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-cyan-700">
                            <MapPin className="w-3 h-3" /> {client.country.toUpperCase()}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                          {client.email && (
                            <span className="inline-flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5" /> {client.email}
                            </span>
                          )}
                          {client.phone && (
                            <span className="inline-flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5" /> {client.phone}
                            </span>
                          )}
                          {client.documentId && (
                            <span className="inline-flex items-center gap-1.5">
                              <UserRound className="w-3.5 h-3.5" /> {client.documentId}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 shrink-0">
                        <a href={`/admin/clientes/perfil?id=${client.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-all">
                          Perfil cliente <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                        <a href={`/admin/clientes/destinatarios?id=${client.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-all">
                          Gestionar vínculo
                        </a>
                        <a href={`/admin/transacciones/nueva?clienteId=${client.id}&destinatarioId=${recipient.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg transition-all">
                          <Plus className="w-3.5 h-3.5" /> Enviar
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 md:p-6 card-hover anim-fade-in-up stagger-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
              <div>
                <h2 className="text-base md:text-lg font-bold text-slate-800">Datos bancarios</h2>
                <p className="text-xs text-slate-400 font-medium">Referencia central del destinatario</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1">Cuenta o pago móvil</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-700">{recipient.accountNumber}</code>
                  <button onClick={() => handleCopy(recipient.accountNumber, 'Número de cuenta')} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                    <Copy className="w-3.5 h-3.5" /> Copiar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1">Banco</p>
                  <p className="text-sm font-bold text-slate-800">{recipient.bank}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1">Tipo de cuenta</p>
                  <p className="text-sm font-bold text-slate-800">{recipient.accountType}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1">Cliente principal</p>
                  <p className="text-sm font-bold text-slate-800">{primaryClientName}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1">Creado</p>
                  <p className="text-sm font-bold text-slate-800">{formatDateTime(recipient.createdAt)}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 md:p-6 anim-fade-in-up stagger-6 card-hover">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
              <div>
                <h2 className="text-base md:text-lg font-bold text-slate-800">Historial consolidado</h2>
                <p className="text-xs text-slate-400 font-medium">{recipient.transactions.length} movimientos de esta ficha</p>
              </div>
            </div>
            <a href={`/admin/transacciones?destinatario=${recipient.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-all">
              Ver todo <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="text-left text-slate-400 text-[0.6rem] font-bold uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                  <th className="py-3 pl-4 md:pl-6 pr-3">Fecha</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Método</th>
                  <th className="py-3 px-3">Monto USD</th>
                  <th className="py-3 px-3">Monto VES</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 pr-4 md:pr-6 pl-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedTransactions.map((tx) => {
                  const txStatus = TX_STATUS_MAP[tx.estado] || TX_STATUS_MAP.PENDING;
                  const txClientName = tx.client ? `${tx.client.firstName} ${tx.client.lastName || ''}`.trim() : '—';

                  return (
                    <tr key={tx.id} className="group">
                      <td className="py-3 pl-4 md:pl-6 pr-3 text-sm font-semibold text-slate-700">{formatDate(tx.fecha)}</td>
                      <td className="py-3 px-3 text-sm text-slate-600 font-medium">{txClientName}</td>
                      <td className="py-3 px-3 text-sm text-slate-500 font-semibold">{tx.metodo}</td>
                      <td className="py-3 px-3 text-sm font-bold text-slate-800 font-mono">${Number(tx.ingresoUSD).toLocaleString()}</td>
                      <td className="py-3 px-3 text-sm text-slate-500 font-mono">Bs. {Number(tx.montoVES).toLocaleString()}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.6rem] font-bold uppercase tracking-wider border ${txStatus.className}`}>
                          {tx.estado === 'COMPLETED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {txStatus.label}
                        </span>
                      </td>
                      <td className="py-3 pr-4 md:pr-6 pl-3 text-right">
                        <a href={`/admin/transacciones/detalle?id=${encodeURIComponent(tx.id)}`} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-all">
                          Ver <ArrowRight className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {paginatedTransactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm font-medium text-slate-400">
                      Todavía no hay transacciones para este destinatario.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {recipient.transactions.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-slate-400">
                Mostrando {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}-
                {Math.min(historyPage * HISTORY_PAGE_SIZE, recipient.transactions.length)} de {recipient.transactions.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                  disabled={historyPage === 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: historyTotalPages }, (_, index) => index + 1)
                    .filter((page) => historyTotalPages <= 5 || page === 1 || page === historyTotalPages || Math.abs(page - historyPage) <= 1)
                    .map((page, index, pages) => (
                      <React.Fragment key={page}>
                        {index > 0 && pages[index - 1] !== page - 1 && (
                          <span className="px-1 text-slate-300">…</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setHistoryPage(page)}
                          className={`inline-flex min-w-[2.25rem] items-center justify-center rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                            page === historyPage
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                              : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryPage((page) => Math.min(historyTotalPages, page + 1))}
                  disabled={historyPage === historyTotalPages}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto px-3 py-4 sm:px-4 sm:py-6 md:items-center" role="dialog" aria-modal="true">
          <button type="button" aria-label="Cerrar modal" className="fixed inset-0 bg-slate-950/60 backdrop-blur-lg" onClick={closeEditModal} />

          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_80px_-20px_rgba(2,6,23,0.35)] transition-all duration-200">
            <div className="relative bg-slate-900 px-5 py-6 sm:px-8 sm:py-7">
              <div className="absolute inset-0 opacity-40">
                <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl" />
                <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl" />
              </div>
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-xl font-black text-cyan-300 shadow-inner ring-1 ring-white/10">
                    {recipient.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-cyan-300/80">Editar destinatario</p>
                    <h2 className="mt-0.5 text-lg sm:text-2xl font-bold tracking-tight text-white">{recipient.name}</h2>
                    <p className="mt-1 max-w-lg text-xs sm:text-sm font-medium text-slate-400 leading-relaxed">
                      Ajusta los datos bancarios y de contacto del destinatario principal de esta ficha.
                    </p>
                  </div>
                </div>
                <button type="button" onClick={closeEditModal} className="inline-flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-400 transition-all hover:bg-slate-700 hover:text-white ring-1 ring-white/10">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-5 p-5 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="block text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1.5">Nombre completo</span>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/15"
                  />
                </label>

                <label className="block">
                  <span className="block text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1.5">Relación</span>
                  <select
                    value={form.relationship}
                    onChange={(e) => setForm((prev) => ({ ...prev, relationship: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-cyan-400"
                  >
                    {RELACIONES.map((relationship) => (
                      <option key={relationship} value={relationship}>{relationship}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1.5">Teléfono</span>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/15"
                  />
                </label>

                <label className="block">
                  <span className="block text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1.5">Banco</span>
                  <select
                    required
                    value={form.bank}
                    onChange={(e) => setForm((prev) => ({ ...prev, bank: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-cyan-400"
                  >
                    <option value="">Seleccionar...</option>
                    {banks.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1.5">Tipo de cuenta</span>
                  <select
                    value={form.accountType}
                    onChange={(e) => setForm((prev) => ({ ...prev, accountType: e.target.value }))}
                    disabled={activeAccountTypeLabels.length === 0 && !form.accountType}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-cyan-400 disabled:opacity-60"
                  >
                    {form.accountType && !activeAccountTypeLabels.includes(form.accountType) && (
                      <option value={form.accountType}>{form.accountType}</option>
                    )}
                    {activeAccountTypeLabels.length === 0 ? (
                      <option value="">Sin tipos disponibles</option>
                    ) : (
                      activeAccountTypeLabels.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))
                    )}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1.5">Identificación</span>
                  <input
                    type="text"
                    value={form.identification}
                    onChange={(e) => setForm((prev) => ({ ...prev, identification: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/15"
                  />
                </label>
              </div>

              <label className="block">
                <span className="block text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1.5">Cuenta o pago móvil</span>
                <input
                  type="text"
                  required
                  value={form.accountNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium font-mono text-slate-800 outline-none transition-all focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/15"
                />
              </label>

              <label className="block">
                <span className="block text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1.5">Notas</span>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/15 resize-none"
                />
              </label>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-5">
                <button type="button" onClick={closeEditModal} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition-all hover:bg-cyan-700 disabled:opacity-60">
                  <Save className="w-3.5 h-3.5" /> {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

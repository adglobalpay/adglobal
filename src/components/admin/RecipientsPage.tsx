import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Plus, Download, Upload, X, Pencil, Trash2, Send,
  ArrowRight, History, UserPlus, MapPin, Phone, Building,
  FileText, AlertTriangle
} from 'lucide-react';
import { apiFetch } from '../../lib/auth';

interface Recipient {
  id: string;
  name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  bank: string;
  accountNumber: string;
  accountType: string;
  identification: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { transactions: number };
}

interface Client {
  id: string;
  firstName: string;
  lastName: string | null;
  country: string;
}

interface AccountTypeItem {
  id: string;
  name: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

const RELACIONES = ['Familiar', 'Hermano/a', 'Prima/o', 'Tío/a', 'Amigo/a', 'Colega', 'Cliente', 'Otro'];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function downloadCSV(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const csv = ['\uFEFF' + headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function RecipientsPage({ clientId: clientIdProp }: { clientId: string }) {
  const urlClientId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') || '' : '';
  const [client, setClient] = useState<Client | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterBanco, setFilterBanco] = useState('');
  const [filterRelacion, setFilterRelacion] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [banks, setBanks] = useState<string[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountTypeItem[]>([]);
  const [saving, setSaving] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const clientId = clientIdProp || urlClientId;
  const fullName = client ? `${client.firstName} ${client.lastName || ''}`.trim() : '—';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [clientData, recipientsData] = await Promise.all([
        apiFetch(`/api/clients/${clientId}`),
        apiFetch(`/api/clients/${clientId}/recipients`)
      ]);
      setClient(clientData);
      setRecipients(recipientsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
    apiFetch('/api/banks')
      .then(data => setBanks(data.filter((b: any) => b.isActive !== false).map((b: any) => b.label)))
      .catch(() => setBanks([]));
    apiFetch('/api/account-types')
      .then(data => setAccountTypes(data))
      .catch(() => setAccountTypes([]));
  }, [loadData]);

  const bancos = useMemo(() => [...new Set(recipients.map(r => r.bank))], [recipients]);
  const relaciones = useMemo(() => [...new Set(recipients.map(r => r.relationship))], [recipients]);
  const activeAccountTypeLabels = useMemo(
    () => accountTypes.filter(type => type.isActive !== false).map(type => type.label),
    [accountTypes]
  );
  const defaultAccountType = activeAccountTypeLabels[0] || 'Corriente';

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return recipients.filter(r => {
      const matchQ = !q || r.name.toLowerCase().includes(q) || (r.phone || '').includes(q);
      const matchBanco = !filterBanco || r.bank === filterBanco;
      const matchRelacion = !filterRelacion || r.relationship === filterRelacion;
      return matchQ && matchBanco && matchRelacion;
    });
  }, [recipients, searchQuery, filterBanco, filterRelacion]);

  const stats = useMemo(() => {
    const activos = recipients.filter(r => (r._count?.transactions || 0) > 0).length;
    return {
      total: recipients.length,
      activos,
      bancos: bancos.length
    };
  }, [recipients, bancos]);

  const [form, setForm] = useState({
    name: '',
    relationship: 'Familiar',
    phone: '',
    email: '',
    bank: '',
    accountNumber: '',
    accountType: '',
    identification: '',
    notes: ''
  });

  const openNew = () => {
    setEditingId(null);
    setForm({
      name: '',
      relationship: 'Familiar',
      phone: '',
      email: '',
      bank: '',
      accountNumber: '',
      accountType: defaultAccountType,
      identification: '',
      notes: ''
    });
    setShowModal(true);
  };

  const openEdit = (recipient: Recipient) => {
    setEditingId(recipient.id);
    setForm({
      name: recipient.name,
      relationship: recipient.relationship,
      phone: recipient.phone || '',
      email: recipient.email || '',
      bank: recipient.bank,
      accountNumber: recipient.accountNumber,
      accountType: recipient.accountType,
      identification: recipient.identification || '',
      notes: recipient.notes || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await apiFetch(`/api/recipients/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(form)
        });
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { type: 'success', message: 'Destinatario actualizado', description: 'Los cambios fueron guardados correctamente.' }
        }));
      } else {
        const result = await apiFetch(`/api/clients/${clientId}/recipients`, {
          method: 'POST',
          body: JSON.stringify(form)
        });
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            type: 'success',
            message: result?.linkedExisting ? 'Destinatario vinculado' : 'Destinatario creado',
            description: result?.linkedExisting
              ? 'El destinatario existente quedó asociado a este cliente.'
              : 'Nuevo destinatario registrado exitosamente.'
          }
        }));
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'Error', description: err.message }
      }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Quitar este destinatario de este cliente?')) return;
    try {
      await apiFetch(`/api/clients/${clientId}/recipients/${id}`, { method: 'DELETE' });
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: 'Desvinculado', description: 'El destinatario ya no está asociado a este cliente.' }
      }));
      loadData();
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'Error', description: err.message }
      }));
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'warning', message: 'Sin datos', description: 'No hay destinatarios para exportar.' }
      }));
      return;
    }
    const headers = ['Nombre', 'Relación', 'Teléfono', 'Banco', 'Cuenta', 'Tipo', 'Identificación', 'Notas'];
    const rows = filtered.map(r => [
      r.name, r.relationship, r.phone || '', r.bank, r.accountNumber,
      r.accountType, r.identification || '', r.notes || ''
    ]);
    downloadCSV(`destinatarios_${clientId}_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { type: 'success', message: 'CSV exportado', description: `${filtered.length} destinatarios exportados.` }
    }));
  };

  const handleImport = async () => {
    if (!importFile) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'warning', message: 'Sin archivo', description: 'Selecciona un archivo CSV primero.' }
      }));
      return;
    }
    const text = await importFile.text();
    const lines = text.split('\n').filter(l => l.trim());
    let created = 0;
    for (const line of lines.slice(1)) {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 5) continue;
      try {
        await apiFetch(`/api/clients/${clientId}/recipients`, {
          method: 'POST',
          body: JSON.stringify({
            name: cols[0],
            relationship: cols[1] || 'Familiar',
            phone: cols[2] || null,
            bank: cols[3],
            accountNumber: cols[4],
            accountType: cols[5] || defaultAccountType,
            identification: cols[6] || null,
            notes: cols[7] || null
          })
        });
        created++;
      } catch {
        // skip failed rows
      }
    }
    setShowImportModal(false);
    setImportFile(null);
    loadData();
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { type: 'success', message: 'Importación completada', description: `${created} destinatarios importados.` }
    }));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-8 h-24 shimmer" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-2xl p-5 h-28 shimmer" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl p-6 h-64 shimmer" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-red-700 text-sm font-medium">
          Error al cargar destinatarios: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs md:text-sm text-slate-400 font-medium anim-fade-in-up stagger-1">
        <a href="/admin/clientes" className="hover:text-indigo-600 transition-colors">Clientes</a>
        <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
        <a href={`/admin/clientes/perfil?id=${clientId}`} className="hover:text-indigo-600 transition-colors">{fullName}</a>
        <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-700 font-semibold">Destinatarios</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 anim-fade-in-up stagger-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Destinatarios de {fullName}</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Gestiona las personas que reciben los envíos de este cliente</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all shadow-sm">
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button onClick={openNew}
            className="btn-interactive inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/25">
            <Plus className="w-4 h-4" /> Nuevo destinatario
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 anim-fade-in-up stagger-3">
        {[
          { label: 'Total', value: stats.total.toString(), icon: <UserPlus className="w-5 h-5" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Activos', value: stats.activos.toString(), icon: <Send className="w-5 h-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Inactivos', value: (stats.total - stats.activos).toString(), icon: <AlertTriangle className="w-5 h-5" />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Bancos', value: stats.bancos.toString(), icon: <Building className="w-5 h-5" />, color: 'text-cyan-600', bg: 'bg-cyan-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200/60 p-4 md:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] card-hover anim-fade-in-up" style={{ animationDelay: `${0.3 + i * 0.05}s` }}>
            <div className={`w-9 h-9 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-3`}>{stat.icon}</div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
            <p className="text-xl md:text-2xl font-bold text-slate-800 mt-1 tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 md:p-5 anim-fade-in-up stagger-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, teléfono o banco..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 font-medium placeholder:text-slate-400 text-sm" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={filterBanco} onChange={e => setFilterBanco(e.target.value)}
              className="custom-select px-4 py-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium cursor-pointer transition-all">
              <option value="">Todos los bancos</option>
              {bancos.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={filterRelacion} onChange={e => setFilterRelacion(e.target.value)}
              className="custom-select px-4 py-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium cursor-pointer transition-all">
              <option value="">Todas las relaciones</option>
              {relaciones.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <button onClick={handleExport}
              className="h-11 px-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Destinatarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 anim-fade-in-up stagger-5">
        {filtered.map((dest, idx) => (
          <div key={dest.id}
            className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 md:p-6 card-hover group anim-fade-in-up"
            style={{ animationDelay: `${0.4 + idx * 0.07}s` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0 group-hover:scale-105 transition-transform">
                  {dest.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-800 truncate">{dest.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[0.6rem] font-black uppercase tracking-wider border border-slate-200">{dest.relationship}</span>
                    {(dest._count?.transactions || 0) > 0 && (
                      <span className="text-[0.65rem] text-slate-400 font-semibold">{dest._count?.transactions} envíos</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(dest)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50 transition-all" title="Editar">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(dest.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 transition-all" title="Eliminar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
              {dest.phone && (
                <div>
                  <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-0.5">Teléfono</p>
                  <p className="font-mono font-semibold text-slate-700 text-[0.8rem]">{dest.phone}</p>
                </div>
              )}
              {dest.email && (
                <div>
                  <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-0.5">Correo</p>
                  <p className="font-semibold text-slate-700 text-[0.8rem] truncate">{dest.email}</p>
                </div>
              )}
              <div>
                <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-0.5">Banco</p>
                <p className="font-semibold text-slate-700 text-[0.8rem]">{dest.bank}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-0.5">Cuenta</p>
                <p className="font-mono font-semibold text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 text-[0.75rem]">{dest.accountNumber}</p>
              </div>
              <div>
                <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-0.5">Tipo</p>
                <p className="font-semibold text-slate-700">{dest.accountType}</p>
              </div>
              {dest.identification && (
                <div>
                  <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-0.5">ID</p>
                  <p className="font-mono font-semibold text-slate-700">{dest.identification}</p>
                </div>
              )}
            </div>

            {dest.notes && (
              <div className="mt-3 p-2.5 bg-amber-50/60 rounded-xl border border-amber-100 text-xs text-amber-700 font-medium">
                📝 {dest.notes}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-3">
              <a href={`/admin/destinatarios/perfil?id=${dest.id}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-all">
                Ficha <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <a href={`/admin/transacciones/nueva?clienteId=${clientId}&destinatarioId=${dest.id}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-all">
                <Plus className="w-3.5 h-3.5" /> Enviar
              </a>
              <a href={`/admin/transacciones?destinatario=${dest.id}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-all">
                <History className="w-3.5 h-3.5" /> Historial
              </a>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 anim-fade-in-up">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-sm font-bold text-slate-500">No se encontraron destinatarios</p>
          <p className="text-xs text-slate-400 mt-1">Intenta con otros filtros</p>
        </div>
      )}

      {/* Modal Nuevo/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative z-10 flex items-end md:items-center justify-center min-h-full p-0 md:p-4">
            <div className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl p-6 md:p-8 max-h-[85vh] overflow-y-auto anim-modal"
              onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-slate-800 mb-5">{editingId ? 'Editar destinatario' : 'Nuevo destinatario'}</h2>
              <form className="space-y-4" onSubmit={handleSave}>
                <div>
                  <label className="block text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-1.5">Nombre completo *</label>
                  <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-1.5">Relación</label>
                    <select value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })}
                      className="custom-select w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium cursor-pointer">
                      {RELACIONES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-1.5">Teléfono *</label>
                    <input type="text" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium" placeholder="+58 412 1234567" />
                  </div>
                </div>
                <div>
                  <label className="block text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-1.5">Correo</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium" placeholder="destinatario@email.com" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-1.5">Banco *</label>
                    <select required value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })}
                      className="custom-select w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium cursor-pointer">
                      <option value="">Seleccionar...</option>
                      {banks.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-1.5">Tipo cuenta</label>
                    <select value={form.accountType} onChange={e => setForm({ ...form, accountType: e.target.value })}
                      disabled={activeAccountTypeLabels.length === 0 && !form.accountType}
                      className="custom-select w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                      {form.accountType && !activeAccountTypeLabels.includes(form.accountType) && (
                        <option value={form.accountType}>{form.accountType}</option>
                      )}
                      {activeAccountTypeLabels.length === 0 ? (
                        <option value="">Sin tipos disponibles</option>
                      ) : (
                        activeAccountTypeLabels.map(type => <option key={type} value={type}>{type}</option>)
                      )}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-1.5">Número de cuenta *</label>
                  <input type="text" required value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium font-mono" placeholder="0102-1234-56-78901234" />
                </div>
                <div>
                  <label className="block text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-1.5">Identificación</label>
                  <input type="text" value={form.identification} onChange={e => setForm({ ...form, identification: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium" placeholder="V-12345678" />
                </div>
                <div>
                  <label className="block text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-1.5">Notas</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium resize-none" />
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all">Cancelar</button>
                  <button type="submit" disabled={saving}
                    className="btn-interactive px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/25 disabled:opacity-60">
                    {saving ? 'Guardando...' : (editingId ? 'Guardar cambios' : 'Guardar destinatario')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar */}
      {showImportModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />
          <div className="relative z-10 flex items-end md:items-center justify-center min-h-full p-0 md:p-4">
            <div className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl p-6 md:p-8 anim-modal"
              onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Importar destinatarios</h2>
              <p className="text-sm text-slate-500 font-medium mb-5">Sube un archivo CSV con la lista de destinatarios</p>
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer"
                onClick={() => document.getElementById('archivoImportar')?.click()}>
                <input type="file" id="archivoImportar" accept=".csv" className="hidden"
                  onChange={e => setImportFile(e.target.files?.[0] || null)} />
                <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-indigo-600">{importFile ? importFile.name : 'Seleccionar archivo'}</p>
                <p className="text-xs text-slate-400 mt-1">o arrastra y suelta aquí</p>
              </div>
              <p className="text-[0.65rem] text-slate-400 mt-4 font-medium">Formato: nombre,relación,telefono,banco,cuenta,tipo_cuenta,identificacion</p>
              <div className="flex justify-end gap-2 pt-5 border-t border-slate-100 mt-5">
                <button onClick={() => { setShowImportModal(false); setImportFile(null); }}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all">Cancelar</button>
                <button onClick={handleImport}
                  className="btn-interactive px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/25">
                  Importar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

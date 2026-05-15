import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeftRight, Download, Filter, Search, CheckCircle2, Clock,
  PauseCircle, XCircle, Paperclip, ExternalLink, Plus, ArrowDownToLine,
  ArrowUpFromLine, ArrowRight, AlertCircle, ChevronLeft, ChevronRight,
  ChevronFirst, ChevronLast, FileText
} from 'lucide-react';
import { apiFetch } from '../../lib/auth';

interface Transaction {
  id: string;
  clientId: string;
  fecha: string;
  ingresoUSD: number;
  salidaUSDT: number;
  tasa: number;
  montoVES: number;
  metodo: string;
  estado: string;
  verificadorId?: string | null;
  fechaVerificacion?: string | null;
  comprobantePago: string | null;
  comprobanteAdmin: string | null;
  client?: { id: string; firstName: string; lastName: string | null; email: string };
  recipient?: { name: string; bank: string };
}

const ADMIN_PENDING_FILTER = 'ADMIN_PENDING';
const TRANSACTIONS_CACHE_TTL_MS = 2 * 60 * 1000;

interface TransactionsCacheEntry {
  data: Transaction[];
  total: number;
  cachedAt: number;
}

function getTransactionsCacheKey(clienteFilter: string) {
  return `adglobal_transactions_cache:${clienteFilter || 'all'}`;
}

function readTransactionsCache(clienteFilter: string): TransactionsCacheEntry | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(getTransactionsCacheKey(clienteFilter));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as TransactionsCacheEntry;
    if (!Array.isArray(parsed.data) || typeof parsed.cachedAt !== 'number') return null;

    return parsed;
  } catch {
    return null;
  }
}

function writeTransactionsCache(clienteFilter: string, entry: TransactionsCacheEntry) {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(getTransactionsCacheKey(clienteFilter), JSON.stringify(entry));
  } catch {
    // Storage can fail in private mode or when quota is full; the live fetch still works.
  }
}

const ESTADOS_MAP: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  COMPLETED: {
    label: 'Completado',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="w-3 h-3" />
  },
  PROCESSING: {
    label: 'Procesando',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Clock className="w-3 h-3" />
  },
  PENDING: {
    label: 'Pendiente',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <PauseCircle className="w-3 h-3" />
  },
  FAILED: {
    label: 'Fallido',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: <XCircle className="w-3 h-3" />
  },
  REJECTED: {
    label: 'Rechazado',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: <XCircle className="w-3 h-3" />
  }
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMethod(method: string) {
  return method
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = ['\uFEFF' + headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
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

export default function TransactionsPage() {
  const urlParams = useMemo(
    () => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''),
    []
  );
  const clienteFilter = urlParams.get('cliente') || '';
  const initialCache = useMemo(() => readTransactionsCache(clienteFilter), [clienteFilter]);
  const hasFreshInitialCache = Boolean(
    initialCache && Date.now() - initialCache.cachedAt < TRANSACTIONS_CACHE_TTL_MS
  );

  const [transactions, setTransactions] = useState<Transaction[]>(() => initialCache?.data || []);
  const [totalCount, setTotalCount] = useState(() => initialCache?.total || 0);
  const [loading, setLoading] = useState(() => !initialCache);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [periodoFilter, setPeriodoFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadData = useCallback(async (options: { showLoader?: boolean; resetPage?: boolean } = {}) => {
    const { showLoader = true, resetPage = true } = options;
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError('');
    try {
      let url = '/api/transactions?limit=500';
      if (clienteFilter) url += '&cliente=' + encodeURIComponent(clienteFilter);
      const data = await apiFetch(url);
      const nextTransactions = data.data || [];
      const nextTotal = data.total || 0;
      setTransactions(nextTransactions);
      setTotalCount(nextTotal);
      writeTransactionsCache(clienteFilter, {
        data: nextTransactions,
        total: nextTotal,
        cachedAt: Date.now()
      });
      if (resetPage) setCurrentPage(1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clienteFilter]);

  useEffect(() => {
    if (hasFreshInitialCache) return;
    loadData({ showLoader: !initialCache, resetPage: false });
  }, [hasFreshInitialCache, initialCache, loadData]);

  const filtered = useMemo(() => {
    let result = [...transactions];

    if (clienteFilter) {
      result = result.filter(t => t.clientId === clienteFilter || t.client?.id === clienteFilter);
    }

    // Filtro de período
    if (periodoFilter !== 'all') {
      const days = parseInt(periodoFilter);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      result = result.filter(t => new Date(t.fecha) >= cutoff);
    }

    // Filtro de estado
    if (estadoFilter) {
      if (estadoFilter === ADMIN_PENDING_FILTER) {
        result = result.filter(t => t.estado === 'PENDING' || t.estado === 'PROCESSING');
      } else {
        result = result.filter(t => t.estado === estadoFilter);
      }
    }

    // Búsqueda
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(t => {
        const cliente = t.client ? `${t.client.firstName} ${t.client.lastName || ''}`.trim().toLowerCase() : '';
        const email = (t.client?.email || '').toLowerCase();
        const banco = (t.recipient?.bank || '').toLowerCase();
        const metodo = (t.metodo || '').toLowerCase();
        const id = t.id.toLowerCase();
        return cliente.includes(q) || email.includes(q) || banco.includes(q) || metodo.includes(q) || id.includes(q);
      });
    }

    return result;
  }, [transactions, searchQuery, estadoFilter, periodoFilter, clienteFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  const kpis = useMemo(() => {
    const totalIngreso = filtered.reduce((s, t) => s + Number(t.ingresoUSD || 0), 0);
    const totalSalida = filtered.reduce((s, t) => s + Number(t.salidaUSDT || 0), 0);
    const tasaSum = filtered.reduce((s, t) => s + Number(t.tasa || 0), 0);
    const promedioTasa = filtered.length > 0 ? (tasaSum / filtered.length) : 0;
    const promedioMonto = filtered.length > 0 ? (totalIngreso / filtered.length) : 0;
    const pendientes = filtered.filter(t => t.estado === 'PENDING' || t.estado === 'PROCESSING').length;
    const validadoAdmin = filtered.reduce((s, t) => {
      return s + (t.verificadorId ? Number(t.ingresoUSD || 0) : 0);
    }, 0);
    return { totalIngreso, totalSalida, promedioTasa, promedioMonto, pendientes, validadoAdmin };
  }, [filtered]);

  const handleExport = () => {
    if (filtered.length === 0) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'warning', message: 'Sin datos para exportar', description: 'No hay transacciones para exportar.' }
      }));
      return;
    }
    const headers = ['ID', 'Fecha', 'Cliente', 'Email', 'Ingreso USD', 'Salida USDT', 'Tasa', 'Monto VES', 'Método', 'Banco', 'Estado'];
    const rows = filtered.map(t => [
      t.id,
      formatDate(t.fecha),
      t.client ? `${t.client.firstName} ${t.client.lastName || ''}`.trim() : '—',
      t.client?.email || '',
      t.ingresoUSD || 0,
      t.salidaUSDT || 0,
      t.tasa || 0,
      t.montoVES || 0,
      t.metodo,
      t.recipient?.bank || '',
      t.estado
    ]);
    downloadCSV(`transacciones_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { type: 'success', message: 'CSV exportado', description: `${filtered.length} transacciones exportadas.` }
    }));
  };

  const goToPage = (p: number) => {
    if (p >= 1 && p <= totalPages) setCurrentPage(p);
  };

  const handleDownloadPdf = async (tx: Transaction) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('adglobal_token') : null;
      const API_URL = import.meta.env.VITE_API_URL || 'https://backend-global-production.up.railway.app';
      const res = await fetch(`${API_URL}/api/transactions/${tx.id}/comprobantes.pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error al generar PDF' }));
        throw new Error(err.error || 'Error al generar PDF');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobantes-${tx.id.substring(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: 'PDF descargado', description: 'Comprobantes descargados correctamente.' }
      }));
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'Error al descargar PDF', description: err.message }
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <ArrowLeftRight className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-slate-500 font-medium">Cargando transacciones...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-red-700 text-sm font-medium">
        Error al cargar transacciones: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-slate-200 pb-6 anim-fade-in">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3" style={{ fontFamily: 'var(--font-heading)' }}>
            <div className="p-2 md:p-2.5 bg-indigo-50 text-indigo-600 rounded-xl transition-transform hover:scale-110 duration-300">
              <ArrowLeftRight className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            Registro de Operaciones
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm md:text-base">Monitorea y gestiona el flujo de envíos, tasas y estados en tiempo real.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/transacciones/nueva"
            className="flex-1 md:flex-none bg-emerald-600 text-white px-4 md:px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-all duration-300 font-bold text-sm flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(16,185,129,0.2)] btn-interactive"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nueva transacción</span>
          </a>
          <button
            onClick={handleExport}
            className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-700 px-4 md:px-5 py-2.5 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 font-bold text-sm flex items-center justify-center gap-2 shadow-sm btn-interactive"
          >
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Exportar CSV</span>
          </button>
          <button
            onClick={() => loadData({ showLoader: transactions.length === 0 })}
            disabled={refreshing}
            className="flex-1 md:flex-none bg-indigo-600 text-white px-4 md:px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-70 disabled:hover:bg-indigo-600 transition-all duration-300 font-bold text-sm flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(79,70,229,0.2)] btn-interactive"
          >
            <Filter className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> <span className="hidden sm:inline">{refreshing ? 'Actualizando' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-indigo-900/50 text-white relative overflow-hidden group card-hover anim-fade-in stagger-1">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 group-hover:opacity-40 transition-all duration-500">
            <ArrowDownToLine className="w-12 h-12 md:w-16 md:h-16" />
          </div>
          <p className="text-indigo-200 text-[0.65rem] font-bold uppercase tracking-widest mb-1 relative z-10">Ingreso Total</p>
          <p className="text-2xl md:text-3xl font-extrabold font-mono tracking-tight relative z-10">
            <span className="text-indigo-400 text-lg md:text-xl mr-1">$</span>{kpis.totalIngreso.toLocaleString()}
          </p>
          <p className="text-indigo-300 text-xs font-semibold mt-2 relative z-10">Capital recibido en USD</p>
          <div className="relative z-10 mt-4 grid max-w-xs grid-cols-2 gap-4">
            <div>
              <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-indigo-200/75">Tasa promedio</p>
              <p className="mt-1 text-base font-extrabold text-white">{kpis.promedioTasa.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-indigo-200/75">Monto promedio</p>
              <p className="mt-1 text-base font-extrabold text-white">${kpis.promedioMonto.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-emerald-950 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-emerald-900/50 text-white relative overflow-hidden group card-hover anim-fade-in stagger-2">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 group-hover:opacity-40 transition-all duration-500">
            <ArrowUpFromLine className="w-12 h-12 md:w-16 md:h-16" />
          </div>
          <p className="text-emerald-200 text-[0.65rem] font-bold uppercase tracking-widest mb-1 relative z-10">Salida Total</p>
          <p className="text-2xl md:text-3xl font-extrabold font-mono tracking-tight relative z-10">
            <span className="text-emerald-400 text-lg md:text-xl mr-1">₮</span>{kpis.totalSalida.toLocaleString()}
          </p>
          <p className="text-emerald-300 text-xs font-semibold mt-2 relative z-10">USDT entregados</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEstadoFilter(estadoFilter === ADMIN_PENDING_FILTER ? '' : ADMIN_PENDING_FILTER);
            setCurrentPage(1);
          }}
          className={`text-left bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border relative overflow-hidden group card-hover anim-fade-in stagger-3 transition-all ${
            estadoFilter === ADMIN_PENDING_FILTER
              ? 'border-amber-300 ring-2 ring-amber-100'
              : 'border-slate-200/60 hover:border-amber-200'
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <p className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-widest">Pendientes</p>
            <div className={kpis.pendientes > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-300'}><AlertCircle className="w-5 h-5" /></div>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold font-mono text-slate-800 tracking-tight">{kpis.pendientes}</p>
          <p className="text-amber-600 text-xs font-bold mt-2">Toca para ver lo pendiente por revisar</p>
        </button>

        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 relative overflow-hidden group card-hover anim-fade-in stagger-4">
          <div className="flex justify-between items-start mb-1">
            <p className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-widest">Admin</p>
            <div className="text-emerald-500"><CheckCircle2 className="w-5 h-5" /></div>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold font-mono text-slate-800 tracking-tight">
            <span className="text-emerald-500 text-lg md:text-xl mr-1">$</span>{kpis.validadoAdmin.toLocaleString()}
          </p>
          <p className="text-emerald-600 text-xs font-bold mt-2">Total validado por admin</p>
        </div>
      </div>

      {/* Tabs de período */}
      <div className="flex items-center justify-between anim-fade-in stagger-5">
        <div className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 p-1 shadow-sm">
          {[
            { key: 'all', label: 'Todos' },
            { key: '1', label: 'Hoy' },
            { key: '7', label: 'Semana' }
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => { setPeriodoFilter(p.key); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                periodoFilter === p.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Indicador de filtro por cliente */}
      {clienteFilter && filtered.length > 0 && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3 anim-fade-in">
          <span className="text-sm font-bold text-indigo-700">
            Transacciones de: {filtered[0].client ? `${filtered[0].client.firstName} ${filtered[0].client.lastName || ''}`.trim() : 'Cliente seleccionado'}
          </span>
          <a
            href="/admin/transacciones"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-all"
          >
            Ver todas
          </a>
        </div>
      )}

      {/* Barra de búsqueda y filtros de estado */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-4 md:p-5 anim-fade-in stagger-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Búsqueda */}
          <div className="relative w-full sm:max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Buscar por cliente, ID o banco..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-[3px] focus:ring-slate-200 focus:border-slate-400 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white"
            />
          </div>

          {/* Estado */}
          <div className="flex items-center gap-2">
            <span className="text-[0.6rem] font-black uppercase tracking-[0.15em] text-slate-400 shrink-0">Estado</span>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { key: '', label: 'Todos', dot: 'bg-slate-400' },
                { key: ADMIN_PENDING_FILTER, label: 'Por revisar', dot: 'bg-amber-400' },
                { key: 'PENDING', label: 'Pendiente', dot: 'bg-blue-400' },
                { key: 'PROCESSING', label: 'Procesando', dot: 'bg-amber-500' },
                { key: 'COMPLETED', label: 'Completado', dot: 'bg-emerald-400' }
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => { setEstadoFilter(s.key); setCurrentPage(1); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    estadoFilter === s.key
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden card-hover anim-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="text-left text-slate-400 text-[0.65rem] font-bold uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                <th className="py-3 md:py-4 pl-4 md:pl-6 pr-3 whitespace-nowrap">Fecha</th>
                <th className="py-3 md:py-4 px-3">Cliente</th>
                <th className="py-3 md:py-4 px-3 whitespace-nowrap">Monto Envío</th>
                <th className="py-3 md:py-4 px-3 whitespace-nowrap">Monto Destino</th>
                <th className="py-3 md:py-4 px-3">Tasa</th>
                <th className="py-3 md:py-4 px-3">Logística</th>
                <th className="py-3 md:py-4 px-3">Estado</th>
                <th className="py-3 md:py-4 px-3">Doc</th>
                <th className="py-3 md:py-4 pr-4 md:pr-6 pl-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.map((tx, idx) => {
                const cfg = ESTADOS_MAP[tx.estado] || { label: tx.estado, className: 'bg-slate-100 text-slate-700 border-slate-200', icon: null };
                const clienteNombre = tx.client ? `${tx.client.firstName} ${tx.client.lastName || ''}`.trim() : '—';
                const hasDoc = tx.comprobantePago || tx.comprobanteAdmin;

                return (
                  <tr key={tx.id} className="table-row-anim group" style={{ animationDelay: `${idx * 50}ms` }}>
                    <td className="py-3 md:py-4 pl-4 md:pl-6 pr-3 align-top">
                      <div className="font-semibold text-[0.8rem] text-slate-600">{formatDate(tx.fecha)}</div>
                      <div className="text-[0.65rem] font-mono text-slate-400 mt-0.5">#{tx.id.substring(0, 8).toUpperCase()}</div>
                    </td>
                    <td className="py-3 md:py-4 px-3 align-top">
                      <div className="font-bold text-[0.9rem] text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">{clienteNombre}</div>
                      <div className="text-[0.7rem] text-slate-500 font-semibold mt-0.5">{tx.client?.email || '—'}</div>
                    </td>
                    <td className="py-3 md:py-4 px-3 align-top">
                      <div className="font-bold font-mono text-[0.9rem] text-emerald-600">
                        ${Number(tx.ingresoUSD || 0).toLocaleString()} <span className="text-[0.65rem] text-emerald-600/70 font-sans tracking-widest uppercase">USD</span>
                      </div>
                    </td>
                    <td className="py-3 md:py-4 px-3 align-top">
                      <div className="font-bold font-mono text-[0.9rem] text-slate-700">
                        {Number(tx.montoVES || 0).toLocaleString()} <span className="text-[0.65rem] text-slate-400 font-sans tracking-widest uppercase">VES</span>
                      </div>
                    </td>
                    <td className="py-3 md:py-4 px-3 align-top">
                      <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[0.75rem] font-bold border border-slate-200 font-mono transition-all hover:bg-slate-200">
                        {Number(tx.tasa || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 md:py-4 px-3 align-top">
                      <div className="inline-flex items-center gap-1.5 rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 text-[0.72rem] font-bold text-slate-700 transition-all hover:bg-indigo-100">
                        <span className="text-indigo-600">{formatMethod(tx.metodo || '')}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        <span className="uppercase tracking-wide text-slate-700">{tx.recipient?.bank || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 md:py-4 px-3 align-top">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[0.65rem] font-bold uppercase tracking-wider border gap-1 transition-all hover:opacity-80 ${cfg.className}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td className="py-3 md:py-4 px-3 align-top">
                      {hasDoc ? (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={tx.comprobantePago || tx.comprobanteAdmin || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-500 hover:text-indigo-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                            title="Ver comprobante"
                          >
                            <Paperclip className="w-4 h-4 pointer-events-none group-hover:-rotate-12 transition-transform" />
                          </a>
                          <button
                            onClick={() => handleDownloadPdf(tx)}
                            className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-500 hover:text-emerald-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                            title="Descargar PDF con comprobantes"
                          >
                            <FileText className="w-4 h-4 pointer-events-none transition-transform" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-sm font-black">—</span>
                      )}
                    </td>
                    <td className="py-3 md:py-4 pr-4 md:pr-6 pl-3 align-top text-right">
                      <a
                        href={`/admin/transacciones/detalle?id=${encodeURIComponent(tx.id)}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-300 hover:scale-110"
                        title="Ver detalles completos"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 font-medium">No se encontraron transacciones</div>
        )}

        {/* Paginación */}
        <div className="px-4 md:px-6 py-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50">
          <span className="text-[0.75rem] font-bold text-slate-400 uppercase tracking-wider">
            Mostrando <span className="text-slate-700">{filtered.length > 0 ? startIndex + 1 : 0}–{Math.min(startIndex + itemsPerPage, filtered.length)}</span> de <span className="text-slate-700">{filtered.length}</span>
          </span>
          <div className="flex gap-1.5">
            <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 hover:border-slate-300 shadow-sm transition-all font-black text-xs hover:scale-105 active:scale-95 disabled:opacity-30">
              <ChevronFirst className="w-4 h-4" />
            </button>
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 hover:border-slate-300 shadow-sm transition-all font-black text-xs hover:scale-105 active:scale-95 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                if (totalPages <= 5) return true;
                if (page === 1 || page === totalPages) return true;
                if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                return false;
              })
              .map((page, idx, arr) => (
                <React.Fragment key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && (
                    <span className="text-slate-300 text-sm px-1">…</span>
                  )}
                  <button
                    onClick={() => goToPage(page)}
                    className={`min-w-[2rem] h-8 px-2 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                      page === currentPage ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 hover:border-slate-300 shadow-sm transition-all font-black text-xs hover:scale-105 active:scale-95 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 hover:border-slate-300 shadow-sm transition-all font-black text-xs hover:scale-105 active:scale-95 disabled:opacity-30">
              <ChevronLast className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeftRight, Download, Filter, Search, CheckCircle2, Clock,
  PauseCircle, XCircle, ExternalLink, Plus, ArrowDownToLine,
  ArrowUpFromLine, ArrowRight, AlertCircle, ChevronLeft, ChevronRight,
  ChevronFirst, ChevronLast
} from 'lucide-react';
import { apiFetch } from '../../lib/auth';
import {
  isExcludedTransactionStatus,
  isFailedTransactionStatus,
  isPendingReviewTransactionStatus,
  normalizeTransactionStatus
} from '../../lib/transactionStatus';

interface Transaction {
  id: string;
  clientId: string;
  fecha: string;
  ingresoUSD: number;
  salidaUSDT: number;
  profitUSD?: number | null;
  tasa: number;
  montoVES: number;
  metodo: string;
  estado: string;
  verificadorId?: string | null;
  fechaVerificacion?: string | null;
  comprobantePago: string | null;
  comprobanteAdmin: string | null;
  multipleGroupId?: string | null;
  multipleGroupIndex?: number | null;
  multipleGroup?: {
    key: string;
    displayId: string;
    count: number;
    index: number | null;
    isMultiple: boolean;
    source: 'explicit' | 'proof';
  } | null;
  client?: { id: string; firstName: string; lastName: string | null; email: string; kycStatus?: string; ofacStatus?: string };
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
    label: 'Pendiente de revisión',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <PauseCircle className="w-3 h-3" />
  },
  PENDING: {
    label: 'Pendiente de revisión',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <PauseCircle className="w-3 h-3" />
  },
  FAILED: {
    label: 'Fallido',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: <XCircle className="w-3 h-3" />
  },
  REJECTED: {
    label: 'Fallido',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: <XCircle className="w-3 h-3" />
  },
  CANCELLED: {
    label: 'Cancelado',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
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

function getMultipleGroupLabel(tx: Transaction) {
  if (!tx.multipleGroup?.isMultiple) return null;
  const part = tx.multipleGroup.index ? `${tx.multipleGroup.index}/${tx.multipleGroup.count}` : `${tx.multipleGroup.count} tx`;
  return {
    id: tx.multipleGroup.displayId,
    part,
    count: tx.multipleGroup.count
  };
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
  const [periodoFilter, setPeriodoFilter] = useState('month');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [costRate, setCostRate] = useState(2.9);

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

  useEffect(() => {
    apiFetch('/api/config')
      .then((config: any) => {
        const rate = parseFloat(config['profit.tasa_costo']);
        if (!isNaN(rate)) setCostRate(rate);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let result = [...transactions];

    if (clienteFilter) {
      result = result.filter(t => t.clientId === clienteFilter || t.client?.id === clienteFilter);
    }

    // Filtro de período
    if (periodoFilter !== 'all') {
      const now = new Date();
      if (periodoFilter === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        result = result.filter(t => {
          const d = new Date(t.fecha);
          return d >= monthStart && d <= monthEnd;
        });
      } else if (periodoFilter === 'last_month') {
        const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        result = result.filter(t => {
          const d = new Date(t.fecha);
          return d >= lmStart && d <= lmEnd;
        });
      } else {
        const days = parseInt(periodoFilter);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        result = result.filter(t => new Date(t.fecha) >= cutoff);
      }
    }

    // Filtro de estado
    if (estadoFilter) {
      if (estadoFilter === ADMIN_PENDING_FILTER) {
        result = result.filter(t => isPendingReviewTransactionStatus(t.estado));
      } else if (estadoFilter === 'FAILED') {
        result = result.filter(t => isFailedTransactionStatus(t.estado));
      } else {
        result = result.filter(t => normalizeTransactionStatus(t.estado) === estadoFilter);
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
    const validas = filtered.filter(t => !isExcludedTransactionStatus(t.estado));
    const totalIngreso = validas.reduce((s, t) => s + Number(t.ingresoUSD || 0), 0);
    const totalSalida = validas.reduce((s, t) => s + Number(t.salidaUSDT || 0), 0);
    const tasaSum = validas.reduce((s, t) => s + Number(t.tasa || 0), 0);
    const promedioTasa = validas.length > 0 ? (tasaSum / validas.length) : 0;
    const promedioMonto = validas.length > 0 ? (totalIngreso / validas.length) : 0;
    const pendientes = validas.filter(t => isPendingReviewTransactionStatus(t.estado)).length;
    const validadoAdmin = validas.reduce((s, t) => {
      const profit = t.profitUSD !== null && t.profitUSD !== undefined
        ? Number(t.profitUSD)
        : Number(t.ingresoUSD || 0) - Number(t.salidaUSDT || 0);
      return s + (t.verificadorId ? profit : 0);
    }, 0);
    const volumen = validas.reduce((s, t) => s + Number(t.ingresoUSD || 0), 0);
    const costoOperativo = volumen * (costRate / 100);
    const profitGlobal = validadoAdmin - costoOperativo;
    return { totalIngreso, totalSalida, promedioTasa, promedioMonto, pendientes, validadoAdmin, costoOperativo, profitGlobal };
  }, [filtered, costRate]);

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

        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 relative overflow-hidden group card-hover anim-fade-in stagger-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-1">
            <p className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-widest">Admin</p>
            <div className="text-emerald-500"><CheckCircle2 className="w-5 h-5" /></div>
          </div>

          <div className="mt-auto flex flex-col items-end">
            <div className="space-y-0.5 text-right mb-3">
              <p className="text-xs font-semibold text-slate-500">
                <span className="text-emerald-600 font-extrabold">$</span>{kpis.validadoAdmin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-slate-400 font-medium">admin profit</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                <span className="text-rose-500 font-extrabold">-$</span>{kpis.costoOperativo.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-slate-400 font-medium">costo operativo</span>
              </p>
            </div>

            <div className="text-right">
              <p className="text-3xl md:text-4xl font-extrabold font-mono text-slate-900 tracking-tight">
                <span className="text-emerald-600 text-xl md:text-2xl mr-1">$</span>{kpis.profitGlobal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400 mt-1">Profit Global</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs de período */}
      <div className="flex items-center justify-between anim-fade-in stagger-5">
        <div className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 p-1 shadow-sm">
          {[
            { key: 'month', label: 'Mes' },
            { key: '1', label: 'Hoy' },
            { key: '7', label: 'Semana' },
            { key: 'last_month', label: 'Mes pasado' },
            { key: 'all', label: 'Todos' }
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
                { key: ADMIN_PENDING_FILTER, label: 'Pendiente de revisión', dot: 'bg-blue-400' },
                { key: 'COMPLETED', label: 'Completado', dot: 'bg-emerald-400' },
                { key: 'FAILED', label: 'Fallido', dot: 'bg-red-500' },
                { key: 'CANCELLED', label: 'Cancelado', dot: 'bg-slate-500' }
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
                <th className="py-3 md:py-4 px-3 text-center">KYC / OFAC</th>
                <th className="py-3 md:py-4 px-3">Profit</th>
                <th className="py-3 md:py-4 pr-4 md:pr-6 pl-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.map((tx, idx) => {
                const cfg = ESTADOS_MAP[tx.estado] || { label: tx.estado, className: 'bg-slate-100 text-slate-700 border-slate-200', icon: null };
                const clienteNombre = tx.client ? `${tx.client.firstName} ${tx.client.lastName || ''}`.trim() : '—';
                const multipleGroup = getMultipleGroupLabel(tx);

                return (
                  <tr key={tx.id} className="table-row-anim group" style={{ animationDelay: `${idx * 50}ms` }}>
                    <td className="py-3 md:py-4 pl-4 md:pl-6 pr-3 align-top">
                      <div className="font-semibold text-[0.8rem] text-slate-600">{formatDate(tx.fecha)}</div>
                      <div className="text-[0.65rem] font-mono text-slate-400 mt-0.5">#{tx.id.substring(0, 8).toUpperCase()}</div>
                      {multipleGroup && (
                        <div className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.12em] text-amber-700">
                          <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
                          Múltiple
                          <span className="font-mono tracking-normal text-amber-800">{multipleGroup.part}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 md:py-4 px-3 align-top">
                      <div className="font-bold text-[0.9rem] text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">{clienteNombre}</div>
                      <div className="text-[0.7rem] text-slate-500 font-semibold mt-0.5">{tx.client?.email || '—'}</div>
                      {multipleGroup && (
                        <div className="mt-2 text-[0.68rem] font-mono font-bold text-amber-700">
                          {multipleGroup.id}
                        </div>
                      )}
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
                      <div className="flex flex-col gap-1 items-center">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[0.6rem] font-bold uppercase tracking-wider border ${tx.client?.kycStatus === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          KYC
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[0.6rem] font-bold uppercase tracking-wider border ${tx.client?.ofacStatus === 'OK' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : tx.client?.ofacStatus === 'BLOCKED' || tx.client?.ofacStatus === 'REVIEW' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          OFAC
                        </span>
                      </div>
                    </td>
                    <td className="py-3 md:py-4 px-3 align-top">
                      {(() => {
                        const profit = tx.profitUSD !== null && tx.profitUSD !== undefined
                          ? Number(tx.profitUSD)
                          : Number(tx.ingresoUSD || 0) - Number(tx.salidaUSDT || 0);
                        return profit > 0 ? (
                          <div className="font-bold font-mono text-[0.9rem] text-emerald-600">
                            ${profit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-sm font-black">—</span>
                        );
                      })()}
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

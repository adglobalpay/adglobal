import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, Download, Globe, Trophy, FileText, TrendingUp,
  Users, CreditCard, Target, ArrowRight, Loader2, Activity
} from 'lucide-react';
import { apiFetch } from '../../lib/auth';
import { isExcludedTransactionStatus, normalizeTransactionStatus } from '../../lib/transactionStatus';

interface Transaction {
  id: string;
  fecha: string;
  ingresoUSD: number;
  salidaUSDT: number;
  tasa: number;
  montoVES: number;
  estado: string;
  clientId: string;
  client?: { firstName: string; lastName: string | null };
  recipient?: { name: string; bank: string };
  reportTag?: ReportTag | null;
}

interface ReportTag {
  id: string;
  name: string;
  label: string;
  color: string;
  isActive?: boolean;
}

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

function formatDateFull(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

export default function ReportsDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<ReportTag[]>([]);
  const [selectedReportTag, setSelectedReportTag] = useState('all');
  const [scope, setScope] = useState<{ role: string; reportTagId: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('mes');

  const getDaysBack = (p: string) => {
    switch (p) {
      case 'hoy': return 0;
      case 'ayer': return 1;
      case 'semana': return 7;
      case 'mes': return 30;
      case 'all': return 0;
      default: return 30;
    }
  };

  const getLabel = (p: string) => {
    switch (p) {
      case 'hoy': return 'Hoy';
      case 'ayer': return 'Ayer';
      case 'semana': return 'Semana';
      case 'mes': return 'Mes';
      case 'all': return 'Todo';
      default: return 'Mes';
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '500' });
      if (selectedReportTag && selectedReportTag !== 'all') params.set('reportTagId', selectedReportTag);
      const txData = await apiFetch(`/api/reports/transactions?${params.toString()}`);
      setTransactions(txData.data || []);
      setTags(txData.tags || []);
      setScope(txData.scope || null);
      if (txData.scope?.role === 'AUDITOR' && txData.scope.reportTagId) {
        setSelectedReportTag(txData.scope.reportTagId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedReportTag]);

  const daysBack = getDaysBack(period);
  const cutoffDate = useMemo(() => {
    if (period === 'all') return new Date('2000-01-01');
    if (daysBack === 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    }
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [daysBack, period]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => new Date(t.fecha) >= cutoffDate)
      .filter(t => !isExcludedTransactionStatus(t.estado));
  }, [transactions, cutoffDate]);

  const totalClientsInScope = useMemo(() => {
    return new Set(transactions.map(t => t.clientId).filter(Boolean)).size;
  }, [transactions]);

  const currentTag = useMemo(() => {
    if (selectedReportTag === 'all') return null;
    return tags.find(tag => tag.id === selectedReportTag) || null;
  }, [selectedReportTag, tags]);

  const isAuditor = scope?.role === 'AUDITOR';

  const reporteGeneral = useMemo(() => {
    const total = filteredTransactions.length;
    const volumenUSD = filteredTransactions.reduce((s, t) => s + (t.ingresoUSD || 0), 0);
    const volumenVES = filteredTransactions.reduce((s, t) => s + (t.montoVES || 0), 0);
    const avgTasa = total > 0
      ? filteredTransactions.reduce((s, t) => s + (t.tasa || 0), 0) / total
      : 0;
    const activeClients = new Set(filteredTransactions.map(t => t.clientId)).size;
    return {
      total_transacciones: total,
      volumen_total_usd: Math.round(volumenUSD),
      volumen_total_ves: Math.round(volumenVES),
      tasa_promedio: avgTasa.toFixed(1),
      clientes_activos: activeClients
    };
  }, [filteredTransactions]);

  const transaccionesPorDia = useMemo(() => {
    const map: Record<string, { fecha: string; cantidad: number; volumen: number }> = {};
    if (daysBack === 0) {
      const now = new Date();
      const month = now.toISOString().slice(0, 7);
      map[month] = { fecha: month, cantidad: 0, volumen: 0 };
    } else {
      for (let i = daysBack - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        map[key] = { fecha: key, cantidad: 0, volumen: 0 };
      }
    }
    filteredTransactions.forEach(t => {
      const key = daysBack === 0
        ? new Date(t.fecha).toISOString().slice(0, 7)
        : new Date(t.fecha).toISOString().split('T')[0];
      if (map[key]) {
        map[key].cantidad += 1;
        map[key].volumen += t.ingresoUSD || 0;
      }
    });
    return Object.values(map);
  }, [filteredTransactions, daysBack]);

  const maxVolumen = useMemo(() => {
    return Math.max(...transaccionesPorDia.map(d => d.volumen), 1);
  }, [transaccionesPorDia]);

  const volumenPorDestino = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      const dest = t.recipient?.bank || 'Otro';
      map[dest] = (map[dest] || 0) + (t.ingresoUSD || 0);
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(map)
      .map(([pais, volumen]) => ({ pais, volumen: Math.round(volumen), porcentaje: Math.round((volumen / total) * 100) }))
      .sort((a, b) => b.volumen - a.volumen);
  }, [filteredTransactions]);

  const topClientes = useMemo(() => {
    const map: Record<string, { nombre: string; transacciones: number; volumen: number }> = {};
    filteredTransactions.forEach(t => {
      const name = t.client ? `${t.client.firstName} ${t.client.lastName || ''}`.trim() : 'Desconocido';
      if (!map[name]) map[name] = { nombre: name, transacciones: 0, volumen: 0 };
      map[name].transacciones += 1;
      map[name].volumen += t.ingresoUSD || 0;
    });
    return Object.values(map)
      .sort((a, b) => b.volumen - a.volumen)
      .slice(0, 5);
  }, [filteredTransactions]);

  const handleExportActividad = () => {
    const headers = ['Fecha', 'Cantidad', 'Volumen USD'];
    const rows = transaccionesPorDia.map(d => [d.fecha, d.cantidad, d.volumen]);
    downloadCSV(`actividad_diaria_${getLabel(period)}.csv`, headers, rows);
    showToast('success', 'CSV exportado', 'Actividad diaria descargada.');
  };

  const handleExportDestino = () => {
    const headers = ['Destino', 'Volumen USD', 'Porcentaje'];
    const rows = volumenPorDestino.map(d => [d.pais, d.volumen, `${d.porcentaje}%`]);
    downloadCSV(`volumen_destino_${getLabel(period)}.csv`, headers, rows);
    showToast('success', 'CSV exportado', 'Volumen por destino descargado.');
  };

  const handleExportTopClientes = () => {
    const headers = ['Cliente', 'Transacciones', 'Volumen USD'];
    const rows = topClientes.map(c => [c.nombre, c.transacciones, Math.round(c.volumen)]);
    downloadCSV(`top_clientes_${getLabel(period)}.csv`, headers, rows);
    showToast('success', 'CSV exportado', 'Top clientes descargado.');
  };

  const handleExportTabla = () => {
    const headers = ['Fecha', 'Cliente', 'Etiqueta', 'USD', 'USDT', 'Tasa', 'VES', 'Estado', 'Destinatario'];
    const rows = filteredTransactions.map(t => [
      formatDateFull(t.fecha),
      t.client ? `${t.client.firstName} ${t.client.lastName || ''}`.trim() : '',
      t.reportTag?.label || '',
      t.ingresoUSD || 0,
      t.salidaUSDT || 0,
      t.tasa || 0,
      t.montoVES || 0,
      normalizeTransactionStatus(t.estado),
      t.recipient?.name || ''
    ]);
    downloadCSV(`transacciones_${getLabel(period)}.csv`, headers, rows);
    showToast('success', 'CSV exportado', `${filteredTransactions.length} transacciones descargadas.`);
  };

  const showToast = (type: string, message: string, description?: string) => {
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { type, message, description }
    }));
  };

  

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-slate-500 font-medium">Cargando reportes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-red-700 text-sm font-medium">
        Error al cargar reportes: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-slate-200 pb-6 anim-fade-in">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3" style={{ fontFamily: 'var(--font-heading)' }}>
            <div className="p-2 md:p-2.5 bg-indigo-50 text-indigo-600 rounded-xl transition-transform hover:scale-110 duration-300">
              <BarChart3 className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            Reportes y Métricas
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm md:text-base">Analiza el rendimiento global de las operaciones y las tendencias de volumen.</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: currentTag?.color || '#6366f1' }}></span>
            {currentTag ? currentTag.label : 'Todas las etiquetas'}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedReportTag}
            onChange={e => setSelectedReportTag(e.target.value)}
            disabled={isAuditor}
            className="custom-select flex-1 md:flex-none border-slate-200 bg-white text-slate-700 rounded-xl px-4 md:px-5 py-2.5 font-bold text-sm shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          >
            {!isAuditor && <option value="all">Todas las etiquetas</option>}
            {tags.map(tag => (
              <option key={tag.id} value={tag.id}>{tag.label}</option>
            ))}
          </select>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="custom-select flex-1 md:flex-none border-slate-200 bg-white text-slate-700 rounded-xl px-4 md:px-5 py-2.5 font-bold text-sm shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer hover:bg-slate-50 hover:shadow-md"
          >
            <option value="hoy">Hoy</option>
            <option value="ayer">Ayer</option>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
            <option value="all">Todo</option>
          </select>
          <button
            onClick={loadData}
            className="bg-indigo-600 text-white px-5 md:px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all duration-300 font-bold text-sm shadow-[0_4px_12px_rgba(79,70,229,0.2)] hover:shadow-[0_4px_16px_rgba(79,70,229,0.3)] btn-interactive"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-[0_8px_30px_rgba(79,70,229,0.2)] relative overflow-hidden group card-hover anim-fade-in stagger-1">
          <div className="absolute -right-4 -bottom-4 text-indigo-500/30 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500 pointer-events-none">
            <CreditCard className="w-20 h-20 md:w-28 md:h-28" />
          </div>
          <div className="relative z-10">
            <p className="text-indigo-200 text-[0.65rem] font-bold uppercase tracking-widest mb-2">Volumen Total USD</p>
            <p className="text-3xl md:text-4xl font-extrabold font-mono tracking-tight flex items-baseline">
              <span className="text-xl md:text-2xl text-indigo-400 mr-1">$</span>{reporteGeneral.volumen_total_usd.toLocaleString()}
            </p>
            <p className="text-indigo-300 text-xs font-semibold mt-2">{reporteGeneral.volumen_total_ves.toLocaleString()} VES</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 relative overflow-hidden group card-hover anim-fade-in stagger-2">
          <div className="absolute -right-4 -bottom-4 text-slate-100 group-hover:text-emerald-50 transition-colors duration-500 pointer-events-none">
            <TrendingUp className="w-20 h-20 md:w-28 md:h-28" />
          </div>
          <div className="relative z-10">
            <p className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-widest mb-2">Transacciones</p>
            <p className="text-3xl md:text-4xl font-extrabold text-slate-900 font-mono tracking-tight">{reporteGeneral.total_transacciones}</p>
            <p className="text-emerald-600 text-xs font-bold mt-2 bg-emerald-50 inline-block px-2 py-1 rounded border border-emerald-100/50">{period === 'all' ? 'totales' : `en ${getLabel(period).toLowerCase()}`}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 relative overflow-hidden group card-hover anim-fade-in stagger-3">
          <div className="absolute -right-4 -bottom-4 text-slate-100 group-hover:text-indigo-50 transition-colors duration-500 pointer-events-none">
            <Users className="w-20 h-20 md:w-28 md:h-28" />
          </div>
          <div className="relative z-10">
            <p className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-widest mb-2">Clientes activos</p>
            <p className="text-3xl md:text-4xl font-extrabold text-slate-900 font-mono tracking-tight">{reporteGeneral.clientes_activos}</p>
            <p className="text-indigo-600 text-xs font-bold mt-2 bg-indigo-50 inline-block px-2 py-1 rounded border border-indigo-100/50">de {totalClientsInScope} en alcance</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 relative overflow-hidden group card-hover anim-fade-in stagger-4">
          <div className="absolute -right-4 -bottom-4 text-slate-100 group-hover:text-slate-200 transition-colors duration-500 pointer-events-none">
            <Target className="w-20 h-20 md:w-28 md:h-28" />
          </div>
          <div className="relative z-10">
            <p className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-widest mb-2">Tasa promedio</p>
            <p className="text-3xl md:text-4xl font-extrabold text-slate-900 font-mono tracking-tight">{reporteGeneral.tasa_promedio}</p>
            <p className="text-slate-500 text-xs font-bold mt-2 bg-slate-100 inline-block px-2 py-1 rounded uppercase tracking-widest">USD → VES</p>
          </div>
        </div>
      </div>

{/* Profit Global - Gráfico de volumen mensual */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 card-hover anim-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-10 gap-3">
          <h2 className="text-lg md:text-xl text-slate-800 font-extrabold tracking-tight flex items-center gap-2.5" style={{ fontFamily: 'var(--font-heading)' }}>
            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg transition-transform hover:scale-110 duration-300">
              <BarChart3 className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            Profit Global
          </h2>
          <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">{getLabel(period)}</span>
        </div>

        {transaccionesPorDia.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium">Sin actividad en este período</div>
        ) : (
          <div className="relative h-48 md:h-64 flex items-center justify-center">
            <div className="absolute left-0 right-0 flex flex-col justify-center h-full">
              <div className="flex items-center gap-4 md:gap-6 w-full overflow-x-auto px-4">
                {transaccionesPorDia.map((dia, idx) => (
                  <div key={dia.fecha} className="flex flex-col items-center group relative flex-shrink-0">
                    <div className="relative">
                      <div
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-[0_4px 16px_rgba(99,102,241,0.3)] group-hover:scale-125 transition-all duration-500 cursor-pointer flex items-center justify-center"
                      >
                        <span className="text-white font-bold text-xs">{dia.cantidad}</span>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-14 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs font-bold rounded-xl py-2 px-3 whitespace-nowrap shadow-xl transition-all z-20 pointer-events-none text-center">
                        ${dia.volumen.toLocaleString()}
                        <span className="block text-[0.65rem] text-slate-400 font-medium mt-0.5">{dia.cantidad} ops</span>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                      </div>
                    </div>
                    <span className="text-[0.6rem] md:text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest mt-3 group-hover:text-indigo-500 transition-colors">
                      {daysBack === 0 ? dia.fecha.slice(5, 7) : dia.fecha.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 border-t border-slate-100"></div>
            <div className="absolute left-0 top-0 bottom-0 border-l border-slate-100"></div>
          </div>
        )}
      </div>

      {/* Actividad diaria */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 card-hover anim-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-10 gap-3">
          <h2 className="text-lg md:text-xl text-slate-800 font-extrabold tracking-tight flex items-center gap-2.5" style={{ fontFamily: 'var(--font-heading)' }}>
            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg transition-transform hover:scale-110 duration-300">
              <Activity className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            Actividad diaria
          </h2>
          <button
            onClick={handleExportActividad}
            className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 hover:shadow-sm flex items-center gap-2 btn-interactive"
          >
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>

        {transaccionesPorDia.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium">Sin actividad en este período</div>
        ) : (
          <div className="h-48 md:h-64 flex items-end justify-between gap-2 md:gap-3 relative border-b border-slate-100 pt-4 md:pt-6">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-0">
              {[1,2,3,4].map(() => <div className="w-full border-t border-slate-100 border-dashed"></div>)}
              <div></div>
            </div>

            {transaccionesPorDia.map((dia) => (
              <div key={dia.fecha} className="flex-1 flex flex-col items-center group relative z-10 w-full">
                <div className="w-full flex justify-center h-full items-end pb-2">
                  <div
                    className="w-full max-w-[36px] md:max-w-[56px] bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-xl hover:from-indigo-400 hover:to-cyan-400 transition-all duration-500 cursor-pointer relative shadow-[0_4px_12px_rgba(99,102,241,0.2)] group-hover:scale-y-[1.05] origin-bottom"
                    style={{ height: `${(dia.volumen / maxVolumen) * 100}%`, minHeight: dia.volumen > 0 ? '4px' : '0px' }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-12 md:-top-14 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs font-bold rounded-xl py-1.5 md:py-2 px-2 md:px-3 whitespace-nowrap shadow-xl transition-all z-20 pointer-events-none">
                      ${dia.volumen.toLocaleString()}
                      <span className="block text-[0.65rem] text-slate-400 font-medium mt-0.5">{dia.cantidad} ops</span>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                    </div>
                  </div>
                </div>
                <span className="text-[0.6rem] md:text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest mt-2 group-hover:text-indigo-500 transition-colors">{formatDate(dia.fecha)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid de 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Volumen por destino */}
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 card-hover anim-fade-in stagger-1">
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl text-slate-800 font-extrabold tracking-tight flex items-center gap-2.5" style={{ fontFamily: 'var(--font-heading)' }}>
              <Globe className="w-5 h-5 text-indigo-500" />
              Volumen por destino
            </h2>
            <button
              onClick={handleExportDestino}
              className="text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-300 hover:scale-110"
            >
              <Download className="w-4 h-4 pointer-events-none" />
            </button>
          </div>

          {volumenPorDestino.length === 0 ? (
            <div className="text-center py-8 text-slate-400 font-medium">Sin datos de destino</div>
          ) : (
            <div className="space-y-5 md:space-y-6">
              {volumenPorDestino.map((destino, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm md:text-[0.85rem] mb-2">
                    <span className="font-bold text-slate-700">{destino.pais}</span>
                    <span className="font-semibold text-slate-500">${destino.volumen.toLocaleString()} <span className="text-indigo-600 font-bold">({destino.porcentaje}%)</span></span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 md:h-2.5 overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full progress-anim" style={{ width: `${destino.porcentaje}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top clientes */}
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 card-hover anim-fade-in stagger-2">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl text-slate-800 font-extrabold tracking-tight flex items-center gap-2.5" style={{ fontFamily: 'var(--font-heading)' }}>
              <Trophy className="w-5 h-5 text-amber-500" />
              Top clientes
            </h2>
            <button
              onClick={handleExportTopClientes}
              className="text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-300 hover:scale-110"
            >
              <Download className="w-4 h-4 pointer-events-none" />
            </button>
          </div>

          {topClientes.length === 0 ? (
            <div className="text-center py-8 text-slate-400 font-medium">Sin clientes activos</div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {topClientes.map((cliente, index) => (
                <div key={index} className="flex items-center justify-between p-3 md:p-4 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl transition-all duration-300 group cursor-pointer hover:shadow-sm" style={{ animationDelay: `${index * 60}ms` }}>
                  <div className="flex items-center gap-3 md:gap-4">
                    <span className={`w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center text-xs md:text-sm font-extrabold shadow-sm transition-transform duration-300 group-hover:scale-110 ${
                      index === 0 ? 'bg-gradient-to-br from-amber-200 to-amber-400 text-amber-900 border border-amber-300' :
                      index === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 border border-slate-300' :
                      index === 2 ? 'bg-gradient-to-br from-orange-200 to-orange-400 text-orange-900 border border-orange-300' :
                      'bg-white text-slate-500 border border-slate-200'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-bold text-sm md:text-[0.9rem] text-slate-800 group-hover:text-indigo-600 transition-colors">{cliente.nombre}</p>
                      <p className="text-[0.65rem] md:text-[0.7rem] text-slate-500 font-semibold">{cliente.transacciones} transacciones</p>
                    </div>
                  </div>
                  <span className="font-mono font-extrabold text-slate-700 group-hover:text-indigo-600 transition-colors text-sm md:text-base">${Math.round(cliente.volumen).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabla de transacciones */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 card-hover anim-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3">
          <h2 className="text-lg md:text-xl text-slate-800 font-extrabold tracking-tight flex items-center gap-2.5" style={{ fontFamily: 'var(--font-heading)' }}>
            <FileText className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />
            Detalle de transacciones
          </h2>
          <button
            onClick={handleExportTabla}
            className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 px-4 md:px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 hover:shadow-md btn-interactive"
          >
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Exportar tabla</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="text-left text-slate-400 text-[0.65rem] font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="pb-3 md:pb-4 pl-2 md:pl-3">Fecha</th>
                <th className="pb-3 md:pb-4">Cliente</th>
                <th className="pb-3 md:pb-4">Etiqueta</th>
                <th className="pb-3 md:pb-4">Monto USD</th>
                <th className="pb-3 md:pb-4">Monto VES</th>
                <th className="pb-3 md:pb-4">Tasa</th>
                <th className="pb-3 md:pb-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.slice(0, 10).map((tx, idx) => {
                const normalizedStatus = normalizeTransactionStatus(tx.estado);
                return (
                <tr key={tx.id} className="table-row-anim group" style={{ animationDelay: `${idx * 50}ms` }}>
                  <td className="py-3 md:py-4 pl-2 md:pl-3 text-[0.8rem] text-slate-500 font-semibold">{formatDateFull(tx.fecha)}</td>
                  <td className="py-3 md:py-4 font-bold text-slate-800 text-sm md:text-[0.9rem] tracking-tight group-hover:text-indigo-600 transition-colors">
                    {tx.client ? `${tx.client.firstName} ${tx.client.lastName || ''}`.trim() : '—'}
                  </td>
                  <td className="py-3 md:py-4">
                    {tx.reportTag ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[0.65rem] font-bold text-slate-600">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tx.reportTag.color }}></span>
                        {tx.reportTag.label}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-300">—</span>
                    )}
                  </td>
                  <td className="py-3 md:py-4 font-mono font-bold text-emerald-600 text-sm md:text-base">${tx.ingresoUSD || 0}</td>
                  <td className="py-3 md:py-4 font-mono font-semibold text-slate-600 text-sm md:text-base">{tx.montoVES?.toLocaleString() || 0}</td>
                  <td className="py-3 md:py-4 text-[0.8rem] font-semibold text-slate-500 bg-slate-50 rounded my-2 px-2 py-1 inline-block transition-all hover:bg-slate-100">{tx.tasa || 0}</td>
                  <td className="py-3 md:py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[0.65rem] font-bold uppercase tracking-wider border ${
                      normalizedStatus === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      normalizedStatus === 'PENDING' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      normalizedStatus === 'FAILED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      normalizedStatus === 'CANCELLED' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {normalizedStatus === 'PENDING' ? 'Pendiente de revisión' : normalizedStatus === 'FAILED' ? 'Fallido' : normalizedStatus === 'CANCELLED' ? 'Cancelado' : 'Completado'}
                    </span>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        <div className="mt-4 md:mt-6 pt-4 md:pt-5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center px-2 gap-3">
          <span className="text-[0.75rem] font-bold text-slate-400 tracking-wide">
            Mostrando {Math.min(10, filteredTransactions.length)} de <span className="text-indigo-600">{filteredTransactions.length}</span> transacciones
          </span>
          <a href="/admin/transacciones" className="text-[0.8rem] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group transition-colors">
            Ver todas <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </div>
  );
}

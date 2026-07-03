import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, History, Settings, ChevronRight, X, ArrowUpRight, Search, Download, Filter } from 'lucide-react';
import { apiFetch } from '../../lib/auth';

interface CapitalData {
  binanceBalance: number;
  fiatAvailable: number;
  lastUpdate: string;
}

interface Movimiento {
  id: string;
  fecha: string;
  descripcion: string;
  tipo: string;
  montoUSD: number;
  montoFiat: number | null;
  cobertura: string;
  balanceAfter: number;
  rate: number | null;
  fee: number | null;
  metodo: string | null;
}

interface CapitalAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

export default function CapitalOperador() {
  const [capital, setCapital] = useState<CapitalData>({
    binanceBalance: 0,
    fiatAvailable: 0,
    lastUpdate: ''
  });
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState('todo');

  useEffect(() => {
    async function fetchCapital() {
      try {
        setLoading(true);
        const accounts: CapitalAccount[] = await apiFetch('/api/capital');
        const binance = accounts.find(a => a.type === 'binance');
        const fiat = accounts.find(a => a.type === 'fiat');

        setCapital({
          binanceBalance: binance ? Number(binance.balance) : 0,
          fiatAvailable: fiat ? Number(fiat.balance) : 0,
          lastUpdate: new Date().toLocaleTimeString()
        });

        const historyAccount = binance;
        if (historyAccount) {
          const movs: Movimiento[] = await apiFetch(`/api/capital/${historyAccount.id}/movements`);
          setMovimientos(movs);
        }
      } catch (error) {
        console.error('Error cargando capital:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCapital();
    const interval = setInterval(fetchCapital, 300000);
    return () => clearInterval(interval);
  }, []);

  const getFilteredMovimientos = () => {
    if (filter === 'todo') return movimientos;
    return movimientos.filter(m => m.cobertura.toLowerCase() === filter);
  };

  const itemsPerPage = 12;
  const filtered = getFilteredMovimientos();
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentMovimientos = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

  const handleExport = () => {
    if (filtered.length === 0) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'warning', message: 'Sin datos para exportar', description: 'No hay movimientos para exportar.' }
      }));
      return;
    }
    const headers = ['Fecha', 'Descripción', 'Tipo', 'Monto USD', 'Monto Fiat', 'Cobertura', 'Balance Final', 'Tasa', 'Fee', 'Método'];
    const rows = filtered.map(m => [
      new Date(m.fecha).toLocaleString('es-ES'),
      m.descripcion,
      m.tipo,
      m.montoUSD,
      m.montoFiat ?? '',
      m.cobertura,
      m.balanceAfter,
      m.rate ?? '',
      m.fee ?? '',
      m.metodo ?? ''
    ]);
    downloadCSV(`movimientos_capital_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { type: 'success', message: 'CSV exportado', description: `${filtered.length} movimientos exportados.` }
    }));
  };

  return (
    <div className="p-2 lg:p-3 border-t border-white/5 bg-slate-950">
      <div 
        className="rounded-xl p-3 lg:p-4 cursor-pointer transition-all bg-gradient-to-b from-slate-900 to-slate-900/50 border border-slate-800 hover:border-indigo-500/30 group relative overflow-hidden"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none transition-all group-hover:bg-indigo-500/10"></div>
        
        <div className="flex items-center justify-between mb-2 lg:mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Wallet size={14} className="lg:w-4 lg:h-4" />
            </div>
            <span className="text-xs lg:text-sm font-semibold tracking-tight text-slate-200" style={{ fontFamily: 'var(--font-heading)' }}>Capital Operativo</span>
          </div>
          {loading ? (
            <div className="w-4 h-4 border-2 border-slate-700 border-t-indigo-400 rounded-full animate-spin"></div>
          ) : (
            <ChevronRight size={16} className={`text-slate-500 transition-transform duration-300 ${showDetails ? 'rotate-90' : ''}`} />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 lg:gap-3 mb-1 relative z-10">
          <div className="bg-slate-950 p-2 lg:p-2.5 rounded-lg border border-slate-800/60">
            <p className="text-[0.55rem] lg:text-[0.6rem] uppercase tracking-wider text-slate-500 font-medium mb-0.5 lg:mb-1">Binance (USDT)</p>
            <p className="text-sm lg:text-base font-bold text-indigo-400 font-mono tracking-tight flex items-baseline gap-0.5">
              <span className="text-[0.65rem] lg:text-[0.7rem] text-indigo-500/70">$</span>
              {capital.binanceBalance.toLocaleString()}
            </p>
          </div>

          <div className="bg-slate-950 p-2 lg:p-2.5 rounded-lg border border-slate-800/60">
            <p className="text-[0.55rem] lg:text-[0.6rem] uppercase tracking-wider text-slate-500 font-medium mb-0.5 lg:mb-1">Fiat Disponible</p>
            <p className={`text-sm lg:text-base font-bold font-mono tracking-tight ${capital.fiatAvailable < 100000 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {capital.fiatAvailable.toLocaleString()}
            </p>
          </div>

        </div>

        {showDetails && !loading && (
          <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-3 relative z-10 animate-[fadeIn_0.2s_ease-out]">
            <p className="text-[0.65rem] text-slate-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {capital.lastUpdate}
            </p>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHistory(true);
                }}
                className="flex-1 min-w-[80px] justify-center text-xs bg-slate-800 text-slate-200 px-3 py-2 rounded-lg hover:bg-slate-700 hover:text-white flex items-center gap-1.5 transition-colors border border-slate-700 font-medium"
              >
                <History size={14} /> Historial
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = '/admin/config';
                }}
                className="flex-1 min-w-[80px] justify-center text-xs bg-transparent border border-slate-700 text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 transition-colors font-medium"
              >
                <Settings size={14} /> Config
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Historial - Renderizado via Portal para salir del Sidebar */}
      {showHistory && createPortal(
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 sm:p-6" onClick={() => setShowHistory(false)}>
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-[scaleIn_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  <History size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>Historial de Operaciones</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    ({filtered.length} registros encontrados)
                  </p>
                </div>
              </div>
              <button onClick={() => setShowHistory(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Toolbar: Filtros & Búsqueda */}
            <div className="px-6 py-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {['todo', 'red', 'p2p', 'pay'].map(f => (
                  <button
                    key={f}
                    onClick={() => { setFilter(f); setCurrentPage(1); }}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md uppercase tracking-wider transition-all ${filter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar referencia..." 
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium placeholder-slate-400"
                  />
                </div>
                <button onClick={handleExport} className="h-9 px-3 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium transition-colors">
                  <Download size={16} /> <span className="hidden sm:inline">Exportar</span>
                </button>
              </div>
            </div>

            {/* Tabla */}
            <div className="overflow-auto flex-1 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 sticky top-0 backdrop-blur-sm shadow-[0_1px_rgba(226,232,240,1)] z-10">
                  <tr className="text-left">
                    <th className="px-6 py-4 text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider w-40">Fecha</th>
                    <th className="px-6 py-4 text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">Concepto</th>
                    <th className="px-6 py-4 text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">Operación</th>
                    <th className="px-6 py-4 text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider text-right">Monto</th>
                    <th className="px-6 py-4 text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider text-center">Protocolo</th>
                    <th className="px-6 py-4 text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider text-right">Balance final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentMovimientos.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs font-medium">
                        {new Date(mov.fecha).toLocaleString('es-ES').split(',').map((p,i) => <span key={i} className={i===1?'block text-[0.65rem] mt-0.5 opacity-70':''}>{p}</span>)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{mov.descripcion}</div>
                        <div className="flex items-center gap-2 mt-1 text-[0.65rem] font-medium">
                          <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{mov.metodo || 'N/A'}</span>
                          <span className="text-slate-400">USDT/VES</span>
                          <span className="text-slate-400 border-l border-slate-200 pl-2">RATE {mov.rate}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-[0.65rem] font-bold uppercase tracking-widest border border-emerald-100">
                          <ArrowUpRight size={10} strokeWidth={3} /> {mov.tipo}
                        </span>
                        <div className="text-[0.65rem] text-slate-400 uppercase tracking-wider font-semibold mt-1.5">Trade Buy</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-bold text-emerald-600 font-mono tracking-tight">+${Number(mov.montoUSD).toFixed(2)}</div>
                        <div className="text-[0.65rem] uppercase tracking-wider text-slate-500 font-medium mt-1">{mov.montoFiat ? mov.montoFiat.toLocaleString() : '—'} VES</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[0.65rem] font-bold uppercase tracking-wider border border-indigo-100">{mov.cobertura}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-bold text-slate-800 font-mono tracking-tight">${Number(mov.balanceAfter).toLocaleString()}</div>
                        <div className="text-[0.7rem] text-slate-400 font-medium mt-1 leading-none">Disponible</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-between items-center shrink-0 rounded-b-2xl">
              <div className="text-xs text-slate-500 font-medium">
                Página <strong className="text-slate-800">{currentPage}</strong> de {totalPages || 1}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p-1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p+1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

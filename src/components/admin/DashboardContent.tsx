import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe, BarChart3, TrendingUp, Zap, UserPlus, Wallet, FileBox,
  ArrowRight, AlertTriangle, Activity, CheckCircle2, Clock, PauseCircle,
  BellRing
} from 'lucide-react';
import { apiFetch } from '../../lib/auth';

interface DashboardStats {
  totalClients: number;
  totalTransactions: number;
  todayTransactions: number;
  pendingKyc: number;
  reviewOfac: number;
  totalVolume: number;
  pendingTransactions: number;
}

interface Transaction {
  id: string;
  fecha: string;
  ingresoUSD: number;
  montoVES: number;
  tasa: number;
  estado: string;
  metodo: string;
  client: { firstName: string; lastName: string | null; email: string } | null;
  recipient: { bank: string } | null;
}

interface ConfigData {
  porcentaje_operador?: string;
  comision_global?: string;
  tasa_costo?: string;
  meta_operador?: string;
  volumen_mensual?: string;
  profit_global?: string;
}

const ESTADOS_MAP: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  COMPLETED: { label: 'Completado', className: 'bg-emerald-50 text-emerald-700 border-emerald-100 group-hover:bg-emerald-100', icon: <CheckCircle2 className="w-3 h-3" /> },
  PROCESSING: { label: 'Procesando', className: 'bg-amber-50 text-amber-700 border-amber-100 group-hover:bg-amber-100', icon: <Clock className="w-3 h-3" /> },
  PENDING: { label: 'Pendiente', className: 'bg-indigo-50 text-indigo-700 border-indigo-100 group-hover:bg-indigo-100', icon: <PauseCircle className="w-3 h-3" /> },
  FAILED: { label: 'Fallido', className: 'bg-red-50 text-red-700 border-red-100 group-hover:bg-red-100', icon: <AlertTriangle className="w-3 h-3" /> },
  REJECTED: { label: 'Rechazado', className: 'bg-red-50 text-red-700 border-red-100 group-hover:bg-red-100', icon: <AlertTriangle className="w-3 h-3" /> }
};

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

export default function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [config, setConfig] = useState<ConfigData>({});
  const [activity, setActivity] = useState<{ dia: string; cantidad: number; volumen: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Admin');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('adglobal_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUserName(`${u.firstName} ${u.lastName || ''}`.trim());
      }
    } catch {}

    async function loadAll() {
      setLoading(true);
      try {
        const [statsData, txData, configData] = await Promise.all([
          apiFetch('/api/stats/dashboard').catch(() => null),
          apiFetch('/api/transactions?limit=5').catch(() => ({ data: [] })),
          apiFetch('/api/config').catch(() => ({}))
        ]);

        if (statsData) setStats(statsData);
        setRecentTx(txData.data || []);
        setConfig(configData || {});

        // Build weekly activity from transactions
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const hoy = new Date();
        const semana = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(hoy);
          d.setDate(d.getDate() - (6 - i));
          return d;
        });

        const txs = txData.data || [];
        const actividad = semana.map(d => {
          const diaTxs = txs.filter((t: Transaction) => {
            const tf = new Date(t.fecha);
            return tf.getFullYear() === d.getFullYear() && tf.getMonth() === d.getMonth() && tf.getDate() === d.getDate();
          });
          return {
            dia: dias[d.getDay()],
            cantidad: diaTxs.length,
            volumen: diaTxs.reduce((s: number, t: Transaction) => s + Number(t.ingresoUSD || 0), 0)
          };
        });
        setActivity(actividad);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, []);

  const profit = useMemo(() => {
    const porcentaje = Number(config.porcentaje_operador || 36);
    const comision = Number(config.comision_global || 8.5);
    const tasaCosto = Number(config.tasa_costo || 2.9);
    const meta = Number(config.meta_operador || 5000);
    const volumen = stats?.totalVolume || Number(config.volumen_mensual || 0);
    const profitGlobal = Number(config.profit_global || stats?.totalVolume ? stats.totalVolume * 0.15 : 0);
    const costoOperativo = volumen * (tasaCosto / 100);
    const profitOperador = Math.round(profitGlobal * (porcentaje / 100));
    return { porcentaje, comision, tasaCosto, meta, volumen, profitGlobal, costoOperativo, profitOperador };
  }, [config, stats]);

  const alertas = useMemo(() => {
    const list: { tipo: string; mensaje: string; link: string }[] = [];
    if (stats && stats.pendingKyc > 0) {
      list.push({ tipo: 'kyc', mensaje: `${stats.pendingKyc} clientes pendientes de verificación KYC`, link: '/admin/clientes?filtro=kyc' });
    }
    if (stats && stats.reviewOfac > 0) {
      list.push({ tipo: 'ofac', mensaje: `${stats.reviewOfac} posibles coincidencias OFAC por revisar`, link: '/admin/clientes?filtro=ofac' });
    }
    if (stats && stats.pendingTransactions > 0) {
      list.push({ tipo: 'transaccion', mensaje: `${stats.pendingTransactions} transacciones pendientes de procesar`, link: '/admin/transacciones?filtro=pendientes' });
    }
    return list;
  }, [stats]);

  const fechaHoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const maxVolumen = Math.max(...activity.map(a => a.volumen), 1);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="bg-white rounded-2xl p-8 h-24 shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 h-64 shimmer" />
          <div className="bg-white rounded-3xl p-6 h-64 shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-slate-200 pb-6 anim-fade-in">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-2 font-medium">Bienvenido de nuevo, {userName}. Aquí está el resumen de tu negocio.</p>
        </div>
        <div className="text-left md:text-right bg-white px-5 py-3 rounded-2xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 anim-fade-in stagger-1">
          <p className="text-sm font-bold text-slate-700 capitalize tracking-wide">{fechaHoy}</p>
        </div>
      </div>

      {/* Profit Global */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-indigo-900/50 relative overflow-hidden group card-hover anim-fade-in stagger-2">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-700"></div>
          <div className="flex justify-between items-center mb-6 relative z-10">
            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Globe className="w-4 h-4" /> Profit Global</p>
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-4 h-4 text-indigo-300" />
            </div>
          </div>
          <p className="text-5xl font-extrabold font-mono tracking-tighter relative z-10 flex items-baseline">
            <span className="text-3xl text-indigo-400 mr-1">$</span>{profit.profitGlobal.toLocaleString()}
          </p>
          <div className="flex justify-between items-center mt-8 pt-4 border-t border-white/10 relative z-10">
            <div className="transition-transform duration-300 hover:scale-105">
              <p className="text-[0.65rem] text-indigo-400 uppercase tracking-wider mb-1 font-semibold">Comisión Global</p>
              <p className="font-bold text-lg">{profit.comision}%</p>
            </div>
            <div className="text-right transition-transform duration-300 hover:scale-105">
              <p className="text-[0.65rem] text-indigo-400 uppercase tracking-wider mb-1 font-semibold">Costo Total</p>
              <p className="font-bold text-lg flex items-center justify-end gap-1">
                <span className="text-indigo-400 text-sm">$</span>{Math.round(profit.costoOperativo).toLocaleString()} <span className="text-sm font-normal text-indigo-400/80">({profit.tasaCosto}%)</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-emerald-900/50 relative overflow-hidden group card-hover anim-fade-in stagger-3">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-700"></div>
          <div className="flex justify-between items-center mb-6 relative z-10">
            <p className="text-emerald-200 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Profit Operador</p>
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Zap className="w-4 h-4 text-emerald-300" />
            </div>
          </div>
          <p className="text-5xl font-extrabold font-mono tracking-tighter relative z-10 flex items-baseline">
            <span className="text-3xl text-emerald-400 mr-1">$</span>{profit.profitOperador.toLocaleString()}
          </p>
          <div className="mt-6 pt-4 border-t border-white/10 relative z-10">
            <div className="flex justify-between items-end mb-2">
              <p className="text-[0.65rem] text-emerald-400 uppercase tracking-wider font-semibold">Porcentaje: {profit.porcentaje}% del global</p>
              <div className="text-right">
                <p className="text-[0.65rem] text-emerald-400/80 uppercase tracking-wider mb-0.5 font-semibold">Meta Mensual</p>
                <p className="font-mono font-bold text-sm tracking-tight">${profit.meta.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-slate-800/80 rounded-full h-2.5 overflow-hidden border border-slate-700/50 mt-1.5">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full progress-anim" style={{ width: `${Math.min((profit.profitOperador / profit.meta) * 100, 100)}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 rounded-2xl p-5 shadow-sm anim-fade-in stagger-4 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner transition-transform duration-300 hover:scale-110">
              <AlertTriangle className="w-5 h-5 pointer-events-none" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900 tracking-wide uppercase">Atención requerida</h3>
              <div className="mt-3">
                <ul className="space-y-2">
                  {alertas.map((alerta, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm text-amber-800 bg-white/60 px-4 py-2.5 rounded-xl border border-amber-200/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm hover:bg-white/80 cursor-pointer group" style={{ animationDelay: `${idx * 100}ms` }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 group-hover:scale-150 transition-transform"></span>
                      <a href={alerta.link} className="hover:text-amber-900 font-medium flex-1">{alerta.mensaje}</a>
                      <ArrowRight className="w-4 h-4 text-amber-500/70 group-hover:translate-x-1 transition-transform" />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de actividad */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 card-hover anim-fade-in stagger-5">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl text-slate-800 font-extrabold tracking-tight flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Activity className="w-5 h-5" /></div>
              Actividad de la semana
            </h2>
          </div>
          <div className="flex items-end justify-between gap-3 h-56 pt-6 relative border-b border-slate-100">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-0">
              {[1, 2, 3, 4].map(() => <div className="w-full border-t border-slate-100 border-dashed"></div>)}
              <div></div>
            </div>
            {activity.map((dia, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center group relative z-10 w-full">
                <div className="w-full flex justify-center h-full items-end pb-2">
                  <div className="w-[85%] max-w-[48px] bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-xl hover:from-indigo-400 hover:to-cyan-400 transition-all duration-500 cursor-pointer relative shadow-[0_4px_12px_rgba(99,102,241,0.2)] group-hover:shadow-[0_8px_24px_rgba(99,102,241,0.3)] group-hover:scale-y-[1.05] origin-bottom"
                    style={{ height: `${(dia.volumen / Math.max(maxVolumen, 1)) * 100}%` }}>
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-14 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs font-bold rounded-xl py-2 px-3 whitespace-nowrap shadow-xl transition-all z-20 pointer-events-none">
                      ${dia.volumen.toLocaleString()}
                      <span className="block text-[0.65rem] text-slate-400 font-medium mt-0.5">{dia.cantidad} ops</span>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                    </div>
                  </div>
                </div>
                <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest mt-2 group-hover:text-indigo-500 transition-colors">{dia.dia}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-8 mt-6 pt-2 text-sm text-slate-500 font-semibold">
            <span className="flex items-center gap-2"><span className="w-3 h-3 bg-gradient-to-t from-indigo-500 to-indigo-400 rounded"></span> Volumen</span>
            <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-slate-400" /> Promedio diario: ${Math.round(activity.reduce((s, a) => s + a.volumen, 0) / 7).toLocaleString()}</span>
          </div>
        </div>

        {/* Tarjetas de resumen rápido */}
        <div className="space-y-4 flex flex-col justify-between h-full lg:h-auto">
          <div className="bg-gradient-to-br from-indigo-50 to-white rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-indigo-100 flex-1 relative overflow-hidden card-hover anim-fade-in stagger-6 group">
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-indigo-900 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6"><TrendingUp className="w-32 h-32" /></div>
            <p className="text-[0.65rem] uppercase tracking-widest text-indigo-600 font-bold mb-2">Volumen hoy</p>
            <p className="text-4xl font-extrabold text-slate-900 font-mono tracking-tight">${(stats?.todayTransactions ? stats.todayTransactions * 200 : 0).toLocaleString()}</p>
            <p className="text-sm font-semibold text-slate-500 mt-3 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md text-xs font-black">{stats?.todayTransactions || 0}</span> transacciones
            </p>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 flex-1 card-hover anim-fade-in stagger-7">
            <p className="text-[0.65rem] uppercase tracking-widest text-slate-500 font-bold mb-2">Volumen total</p>
            <p className="text-3xl font-extrabold text-slate-800 font-mono tracking-tight">${(stats?.totalVolume || 0).toLocaleString()}</p>
            <p className="text-xs font-bold text-emerald-600 mt-3 bg-emerald-50 inline-block px-2.5 py-1 rounded-md border border-emerald-100/50">↑ Acumulado histórico</p>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 flex-1 card-hover anim-fade-in stagger-8">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[0.65rem] uppercase tracking-widest text-slate-500 font-bold mb-2">Tasa promedio</p>
                <p className="text-3xl font-extrabold text-slate-800 font-mono tracking-tight">
                  {recentTx.length > 0 ? (recentTx.reduce((s, t) => s + Number(t.tasa || 0), 0) / recentTx.length).toFixed(1) : '—'}
                </p>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl text-slate-400 border border-slate-100 transition-all hover:scale-110 hover:text-indigo-500 hover:border-indigo-200"><TrendingUp className="w-5 h-5 pointer-events-none" /></div>
            </div>
            <p className="text-xs font-bold text-slate-400 mt-3 uppercase tracking-wider bg-slate-50 inline-block px-2 py-1 rounded-md">USD → VES</p>
          </div>
        </div>
      </div>

      {/* Grid secundario */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transacciones recientes */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 card-hover anim-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl text-slate-800 font-extrabold tracking-tight">Transacciones recientes</h2>
            <a href="/admin/transacciones" className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 hover:shadow-sm">Ver todas</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-400 text-[0.65rem] font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="pb-4 pl-3">Fecha</th>
                  <th className="pb-4">Cliente</th>
                  <th className="pb-4">Monto (USD)</th>
                  <th className="pb-4">Estado</th>
                  <th className="pb-4 text-right pr-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentTx.map((tx, idx) => {
                  const cfg = ESTADOS_MAP[tx.estado] || { label: tx.estado, className: 'bg-slate-100 text-slate-700 border-slate-200 group-hover:bg-slate-100', icon: null };
                  return (
                    <tr key={tx.id} className="table-row-anim group" style={{ animationDelay: `${idx * 50}ms` }}>
                      <td className="py-4 pl-3 text-[0.8rem] text-slate-500 font-semibold">{formatDateShort(tx.fecha)}</td>
                      <td className="py-4 font-bold text-slate-800 text-[0.9rem] tracking-tight">{tx.client ? `${tx.client.firstName} ${tx.client.lastName || ''}`.trim() : '—'}</td>
                      <td className="py-4 font-mono font-bold text-slate-700">${Number(tx.ingresoUSD).toLocaleString()}</td>
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[0.65rem] font-bold uppercase tracking-wider border transition-all duration-300 gap-1 ${cfg.className}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-3">
                        <a href={`/admin/transacciones/${tx.id}`} className="w-8 h-8 inline-flex items-center justify-center rounded-xl text-slate-400 border border-transparent hover:border-indigo-100 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-300 group-hover:scale-110">
                          <ArrowRight className="w-4 h-4 pointer-events-none" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {recentTx.length === 0 && (
            <div className="text-center py-12 text-slate-400 font-medium">No hay transacciones recientes</div>
          )}
        </div>

        {/* Acciones rápidas */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 card-hover anim-fade-in stagger-1">
            <h2 className="text-lg text-slate-800 font-extrabold tracking-tight mb-5">Acciones rápidas</h2>
            <div className="space-y-3">
              <a href="/admin/clientes" className="w-full text-left px-5 py-4 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 rounded-2xl transition-all duration-300 group flex items-center gap-4 btn-interactive">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"><UserPlus className="w-4 h-4 pointer-events-none" /></div>
                <div><p className="font-bold text-slate-800 text-[0.9rem]">Nuevo cliente</p><p className="text-[0.7rem] text-slate-500 font-semibold mt-0.5">Registro manual</p></div>
              </a>
              <a href="/admin/transacciones/nueva" className="w-full text-left px-5 py-4 bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-100 rounded-2xl transition-all duration-300 group flex items-center gap-4 btn-interactive">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"><Wallet className="w-4 h-4 pointer-events-none" /></div>
                <div><p className="font-bold text-slate-800 text-[0.9rem]">Nueva operación</p><p className="text-[0.7rem] text-slate-500 font-semibold mt-0.5">Capturar giro</p></div>
              </a>
              <a href="/admin/reportes" className="w-full text-left px-5 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 rounded-2xl transition-all duration-300 group flex items-center gap-4 btn-interactive">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"><FileBox className="w-4 h-4 pointer-events-none" /></div>
                <div><p className="font-bold text-slate-800 text-[0.9rem]">Reportes</p><p className="text-[0.7rem] text-slate-500 font-semibold mt-0.5">Exportar métricas</p></div>
              </a>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgba(99,102,241,0.3)] text-white relative overflow-hidden group card-hover anim-fade-in stagger-2">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 text-indigo-400/30 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-700 pointer-events-none"><BellRing className="w-32 h-32" /></div>
            <div className="relative z-10">
              <h2 className="text-[0.65rem] font-black uppercase tracking-widest text-indigo-200 mb-3 flex items-center gap-2"><Zap className="w-3 h-3 text-amber-300 pointer-events-none" /> Recordatorio</h2>
              <p className="text-lg font-semibold leading-tight mb-5 opacity-90">
                Tienes <strong className="font-black text-white text-2xl">{stats?.pendingKyc || 0}</strong> clientes pendientes de KYC.
              </p>
              <a href="/admin/clientes?filtro=kyc" className="inline-flex items-center gap-2 text-[0.8rem] bg-white text-indigo-600 font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition-all duration-300 shadow-sm hover:shadow-md group/btn">
                Revisar ahora <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 pb-4 text-[0.65rem] font-bold text-slate-400 border-t border-slate-200 uppercase tracking-widest anim-fade-in">
        <div className="flex gap-6">
          <span>Transacciones: <span className="text-slate-600">{stats?.totalTransactions || 0}</span></span>
          <span>Volumen: <span className="text-slate-600 font-mono">${(stats?.totalVolume || 0).toLocaleString()}</span></span>
        </div>
        <div>AD Global Pay <span className="text-slate-300">v2.0.1</span></div>
      </div>
    </div>
  );
}

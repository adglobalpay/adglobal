import React, { useState, useEffect } from 'react';
import { Users, Coins, TrendingUp, UserCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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

export default function StatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await apiFetch('/api/stats/dashboard');
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 h-32 shimmer" />
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-700 text-sm font-medium">
        Error al cargar estadísticas: {error || 'Datos no disponibles'}
      </div>
    );
  }

  const cards = [
    { label: 'Clientes totales', value: stats.totalClients.toString(), change: '+12%', isPositive: true, icon: <Users size={20} className="text-blue-500" />, bgLight: 'bg-blue-50', bgIcon: 'bg-blue-100/50' },
    { label: 'Transacciones hoy', value: stats.todayTransactions.toString(), change: '+5%', isPositive: true, icon: <Coins size={20} className="text-emerald-500" />, bgLight: 'bg-emerald-50', bgIcon: 'bg-emerald-100/50' },
    { label: 'Volumen total', value: `$${Number(stats.totalVolume).toLocaleString()}`, change: '+8%', isPositive: true, icon: <TrendingUp size={20} className="text-indigo-500" />, bgLight: 'bg-indigo-50', bgIcon: 'bg-indigo-100/50' },
    { label: 'KYC por revisar', value: stats.pendingKyc.toString(), change: stats.pendingKyc > 0 ? `+${stats.pendingKyc}` : '0', isPositive: stats.pendingKyc === 0, icon: <UserCheck size={20} className="text-amber-500" />, bgLight: 'bg-amber-50', bgIcon: 'bg-amber-100/50' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((stat, index) => (
        <div key={index} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 hover:shadow-md hover:border-slate-300 transition-all group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-[0.03] pointer-events-none group-hover:scale-150 transition-transform duration-500 bg-current"></div>
          
          <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bgLight} ${stat.bgIcon} border border-white/50 backdrop-blur-sm shadow-inner`}>
              {stat.icon}
            </div>
            
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${stat.isPositive ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-rose-600 bg-rose-50 border border-rose-100'}`}>
              {stat.isPositive ? <ArrowUpRight size={12} strokeWidth={3} /> : <ArrowDownRight size={12} strokeWidth={3} />}
              {stat.change}
            </div>
          </div>
          
          <div className="text-3xl font-extrabold text-slate-800 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            {stat.value}
          </div>
          <div className="text-slate-500 text-xs font-semibold mt-1 uppercase tracking-wider">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}

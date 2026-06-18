import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, BarChart3 } from 'lucide-react';
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
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ReportsDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<ReportTag[]>([]);
  const [selectedReportTag, setSelectedReportTag] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [txData, tagsData] = await Promise.all([
          apiFetch('/api/transactions'),
          apiFetch('/api/report-tags').catch(() => [])
        ]);
        if (!mounted) return;
        setTransactions(Array.isArray(txData) ? txData : []);
        setTags(Array.isArray(tagsData) ? tagsData.filter((t: ReportTag) => t.isActive !== false) : []);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Error cargando operaciones');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    if (selectedReportTag === 'all') return transactions;
    return transactions.filter((tx) => tx.reportTag?.id === selectedReportTag);
  }, [transactions, selectedReportTag]);

  const totals = useMemo(() => {
    const valid = filtered.filter((tx) => !isExcludedTransactionStatus(tx.estado));
    const ingresoUSD = valid.reduce((acc, tx) => acc + (Number(tx.ingresoUSD) || 0), 0);
    const salidaUSDT = valid.reduce((acc, tx) => acc + (Number(tx.salidaUSDT) || 0), 0);
    return {
      count: valid.length,
      ingresoUSD,
      salidaUSDT
    };
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-sm font-bold text-slate-500">Cargando reportes...</span>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600 md:p-2.5">
              <BarChart3 className="h-5 w-5 md:h-6 md:w-6" />
            </span>
            Reportes
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500 md:text-base">Vista de solo lectura. Filtra las operaciones por etiqueta.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[0.65rem] font-black uppercase tracking-wider text-slate-500">Etiqueta</label>
          <select
            value={selectedReportTag}
            onChange={(e) => setSelectedReportTag(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          >
            <option value="all">Todas las etiquetas</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>{tag.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-400">Operaciones</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-800">{totals.count}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">en el periodo</p>
        </div>
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-400">Ingreso total</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-800">$ {totals.ingresoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">USD</p>
        </div>
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-400">Salida total</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-800">₮ {totals.salidaUSDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">USDT</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100 text-left text-[0.65rem] font-black uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Destinatario</th>
                <th className="px-4 py-3 text-right">Ingreso USD</th>
                <th className="px-4 py-3 text-right">Salida USDT</th>
                <th className="px-4 py-3 text-right">Tasa</th>
                <th className="px-4 py-3 text-right">Monto VES</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Etiqueta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((tx) => {
                const clientName = tx.client ? `${tx.client.firstName} ${tx.client.lastName || ''}`.trim() : '-';
                const recipientName = tx.recipient?.name || '-';
                return (
                  <tr key={tx.id} className="text-sm">
                    <td className="px-4 py-3 font-semibold text-slate-600">{formatDate(tx.fecha)}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-800">{clientName}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{recipientName}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">${(Number(tx.ingresoUSD) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">{(Number(tx.salidaUSDT) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">{(Number(tx.tasa) || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">{(Number(tx.montoVES) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{normalizeTransactionStatus(tx.estado)}</td>
                    <td className="px-4 py-3">
                      {tx.reportTag ? (
                        <span className={`inline-flex rounded-md border px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wider ${tx.reportTag.color}`}>
                          {tx.reportTag.label}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-300">Sin tag</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-10 text-center text-sm font-bold text-slate-400">No hay operaciones con este filtro.</div>
          )}
        </div>
      </div>
    </div>
  );
}

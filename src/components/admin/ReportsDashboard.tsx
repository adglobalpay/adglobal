import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, BarChart3, ArrowDownToLine, ArrowUpFromLine, FileText, Tags, CalendarDays } from 'lucide-react';
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
  client?: { firstName: string; lastName: string | null; reportTag?: ReportTag | null };
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

function getEffectiveReportTag(tx: Transaction) {
  return tx.reportTag || tx.client?.reportTag || null;
}

function statusClasses(status: string) {
  const normalized = normalizeTransactionStatus(status);
  if (normalized === 'COMPLETED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === 'PENDING') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (normalized === 'FAILED') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (normalized === 'CANCELLED') return 'border-slate-200 bg-slate-100 text-slate-600';
  return 'border-slate-200 bg-slate-50 text-slate-700';
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
        const params = new URLSearchParams({ limit: '5000' });
        if (selectedReportTag !== 'all') params.set('reportTagId', selectedReportTag);
        const [txData, tagsData] = await Promise.all([
          apiFetch(`/api/reports/transactions?${params.toString()}`),
          apiFetch('/api/report-tags').catch(() => [])
        ]);
        if (!mounted) return;
        setTransactions(Array.isArray(txData?.data) ? txData.data : Array.isArray(txData) ? txData : []);
        setTags(Array.isArray(tagsData) ? tagsData.filter((t: ReportTag) => t.isActive !== false) : []);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Error cargando operaciones');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedReportTag]);

  const filtered = useMemo(() => {
    return transactions;
  }, [transactions]);

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
    <div className="space-y-7">
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
            <span className="grid h-14 w-14 place-items-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600 shadow-sm">
              <BarChart3 className="h-5 w-5 md:h-6 md:w-6" />
            </span>
            Reportes
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500 md:text-lg">Vista de solo lectura. Filtra las operaciones por etiqueta.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-500">Etiqueta</label>
          <select
            value={selectedReportTag}
            onChange={(e) => setSelectedReportTag(e.target.value)}
            className="min-w-[220px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 shadow-sm outline-none transition-all hover:border-indigo-200 hover:shadow-md focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          >
            <option value="all">Todas las etiquetas</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>{tag.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(15,23,42,0.09)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-slate-900/5" />
          <div className="mb-5 flex items-center justify-between">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-400">Operaciones</p>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
              <FileText className="h-4 w-4" />
            </span>
          </div>
          <p className="text-4xl font-black tracking-tight text-slate-900">{totals.count}</p>
          <p className="mt-2 text-xs font-bold text-slate-500">en el periodo</p>
        </div>
        <div className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(15,23,42,0.09)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-indigo-500/10" />
          <div className="mb-5 flex items-center justify-between">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-400">Ingreso total</p>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
              <ArrowDownToLine className="h-4 w-4" />
            </span>
          </div>
          <p className="font-mono text-4xl font-black tracking-tight text-slate-900">$ {totals.ingresoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="mt-2 text-xs font-bold text-slate-500">USD</p>
        </div>
        <div className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(15,23,42,0.09)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500/10" />
          <div className="mb-5 flex items-center justify-between">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-400">Salida total</p>
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600">
              <ArrowUpFromLine className="h-4 w-4" />
            </span>
          </div>
          <p className="font-mono text-4xl font-black tracking-tight text-slate-900">₮ {totals.salidaUSDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="mt-2 text-xs font-bold text-slate-500">USDT</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100 text-left text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-400">
                <th className="px-5 py-4">Fecha</th>
                <th className="px-5 py-4">Cliente</th>
                <th className="px-5 py-4">Destinatario</th>
                <th className="px-5 py-4 text-right">Ingreso USD</th>
                <th className="px-5 py-4 text-right">Salida USDT</th>
                <th className="px-5 py-4 text-right">Tasa</th>
                <th className="px-5 py-4 text-right">Monto VES</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4">Etiqueta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((tx) => {
                const clientName = tx.client ? `${tx.client.firstName} ${tx.client.lastName || ''}`.trim() : '-';
                const recipientName = tx.recipient?.name || '-';
                const reportTag = getEffectiveReportTag(tx);
                return (
                  <tr key={tx.id} className="text-sm transition-colors duration-200 hover:bg-slate-50/80">
                    <td className="px-5 py-4 font-bold text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        {formatDate(tx.fecha)}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-black text-slate-800">{clientName}</td>
                    <td className="px-5 py-4 font-bold text-slate-600">{recipientName}</td>
                    <td className="px-5 py-4 text-right font-mono font-black text-slate-800">${(Number(tx.ingresoUSD) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-5 py-4 text-right font-mono font-black text-slate-700">{(Number(tx.salidaUSDT) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-slate-500">{(Number(tx.tasa) || 0).toFixed(2)}</td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-slate-500">{(Number(tx.montoVES) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] ${statusClasses(tx.estado)}`}>
                        {normalizeTransactionStatus(tx.estado)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {reportTag ? (
                        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] ${reportTag.color}`}>
                          <Tags className="h-3 w-3" />
                          {reportTag.label}
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
            <div className="py-14 text-center text-sm font-bold text-slate-400">No hay operaciones con este filtro.</div>
          )}
        </div>
      </div>
    </div>
  );
}

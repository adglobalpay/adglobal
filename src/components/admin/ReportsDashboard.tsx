import React, { useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  BarChart3,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  Tags,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Clock3
} from 'lucide-react';
import { apiFetch } from '../../lib/auth';
import { isExcludedTransactionStatus, normalizeTransactionStatus } from '../../lib/transactionStatus';

interface Transaction {
  id: string;
  fecha: string;
  ingresoUSD: number;
  salidaUSDT: number;
  profitUSD?: number | null;
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

interface ReportsSummary {
  count: number;
  ingresoUSD: number;
  salidaUSDT: number;
  profitUSD: number;
  operatorPercentage: number;
  operatorProfit: number;
}

interface ReportsScope {
  role: string;
  reportTag: ReportTag | null;
  isReadOnly: boolean;
}

type PeriodMode = 'day' | 'week' | 'month' | 'custom';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime());
}

function toDateInputValue(date: Date) {
  if (!isValidDate(date)) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseInputDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return isValidDate(date) ? date : null;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateLabel(date: Date) {
  if (!isValidDate(date)) return 'Fecha';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMonthLabel(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number);
  if (!year || !month) return 'Mes seleccionado';
  return new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function formatMoney(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getWeekRange(anchorValue: string) {
  const anchor = parseInputDate(anchorValue) || new Date();
  const day = anchor.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(anchor);
  start.setDate(anchor.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function addDays(value: string, days: number) {
  const date = parseInputDate(value) || new Date();
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

function addMonths(value: string, months: number) {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(year || new Date().getFullYear(), (month || 1) - 1 + months, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
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
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<ReportTag[]>([]);
  const [selectedReportTag, setSelectedReportTag] = useState('all');
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [selectedDay, setSelectedDay] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [weekAnchor, setWeekAnchor] = useState(today);
  const [customFrom, setCustomFrom] = useState(`${today.slice(0, 7)}-01`);
  const [customTo, setCustomTo] = useState(today);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [scope, setScope] = useState<ReportsScope | null>(null);
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const periodRange = useMemo(() => {
    if (periodMode === 'day') {
      return { dateFrom: selectedDay, dateTo: selectedDay, label: formatDateLabel(parseInputDate(selectedDay) || new Date()) };
    }

    if (periodMode === 'week') {
      const range = getWeekRange(weekAnchor);
      return {
        dateFrom: toDateInputValue(range.start),
        dateTo: toDateInputValue(range.end),
        label: `${formatDateLabel(range.start)} - ${formatDateLabel(range.end)}`
      };
    }

    if (periodMode === 'month') {
      const [year, month] = selectedMonth.split('-').map(Number);
      if (!year || !month) {
        return { dateFrom: '', dateTo: '', label: 'Mes seleccionado' };
      }
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return {
        dateFrom: toDateInputValue(start),
        dateTo: toDateInputValue(end),
        label: formatMonthLabel(selectedMonth)
      };
    }

    const fromDate = parseInputDate(customFrom);
    const toDate = parseInputDate(customTo);
    if (fromDate && toDate && fromDate > toDate) {
      return {
        dateFrom: customTo,
        dateTo: customFrom,
        label: `${formatDateLabel(toDate)} - ${formatDateLabel(fromDate)}`
      };
    }
    return {
      dateFrom: customFrom,
      dateTo: customTo,
      label: `${fromDate ? formatDateLabel(fromDate) : 'Inicio'} - ${toDate ? formatDateLabel(toDate) : 'Fin'}`
    };
  }, [periodMode, selectedDay, selectedMonth, weekAnchor, customFrom, customTo]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ limit: '5000' });
        params.set('dateFrom', periodRange.dateFrom);
        params.set('dateTo', periodRange.dateTo);
        if (selectedReportTag !== 'all') params.set('reportTagId', selectedReportTag);
        const txData = await apiFetch(`/api/reports/transactions?${params.toString()}`);
        if (!mounted) return;
        setTransactions(Array.isArray(txData?.data) ? txData.data : Array.isArray(txData) ? txData : []);
        setTags(Array.isArray(txData?.tags) ? txData.tags.filter((t: ReportTag) => t.isActive !== false) : []);
        setScope(txData?.scope || null);
        setSummary(txData?.summary || null);
        setCurrentPage(1);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Error cargando operaciones');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedReportTag, periodRange.dateFrom, periodRange.dateTo]);

  const filtered = useMemo(() => transactions, [transactions]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);
  const firstItem = filtered.length === 0 ? 0 : startIndex + 1;
  const lastItem = Math.min(startIndex + pageSize, filtered.length);

  const totals = useMemo(() => {
    const valid = filtered.filter((tx) => !isExcludedTransactionStatus(tx.estado));
    const ingresoUSD = summary?.ingresoUSD ?? valid.reduce((acc, tx) => acc + (Number(tx.ingresoUSD) || 0), 0);
    const salidaUSDT = summary?.salidaUSDT ?? valid.reduce((acc, tx) => acc + (Number(tx.salidaUSDT) || 0), 0);
    const profitUSD = summary?.profitUSD ?? valid.reduce((acc, tx) => acc + (Number(tx.profitUSD) || ((Number(tx.ingresoUSD) || 0) - (Number(tx.salidaUSDT) || 0))), 0);
    const operatorPercentage = summary?.operatorPercentage ?? 0;
    const operatorProfit = summary?.operatorProfit ?? (profitUSD * (operatorPercentage / 100));
    const operatorLabel = scope?.reportTag?.label || (selectedReportTag === 'all' ? 'Todas las etiquetas' : 'Operador');
    return {
      count: summary?.count ?? valid.length,
      ingresoUSD,
      salidaUSDT,
      profitUSD,
      operatorPercentage,
      operatorProfit,
      operatorLabel
    };
  }, [filtered, summary, scope, selectedReportTag]);

  function shiftPeriod(direction: -1 | 1) {
    if (periodMode === 'day') setSelectedDay((value) => addDays(value, direction));
    if (periodMode === 'week') setWeekAnchor((value) => addDays(value, direction * 7));
    if (periodMode === 'month') setSelectedMonth((value) => addMonths(value, direction));
  }

  function goToPage(page: number) {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  }

  const summaryCards = [
    {
      label: 'Operaciones',
      value: String(totals.count),
      note: 'en el periodo',
      icon: FileText,
      accent: 'from-slate-600 to-slate-900',
      soft: 'bg-slate-50 text-slate-600 border-slate-200'
    },
    {
      label: 'Ingreso total',
      value: `$ ${formatMoney(totals.ingresoUSD)}`,
      note: 'USD recibido',
      icon: ArrowDownToLine,
      accent: 'from-indigo-500 to-blue-600',
      soft: 'bg-indigo-50 text-indigo-600 border-indigo-100'
    },
    {
      label: 'Salida total',
      value: `₮ ${formatMoney(totals.salidaUSDT)}`,
      note: 'USDT enviado',
      icon: ArrowUpFromLine,
      accent: 'from-emerald-500 to-teal-600',
      soft: 'bg-emerald-50 text-emerald-600 border-emerald-100'
    },
    {
      label: 'Profit',
      value: `$ ${formatMoney(totals.profitUSD)}`,
      note: 'profit acumulado',
      icon: BarChart3,
      accent: 'from-amber-400 to-orange-500',
      soft: 'bg-amber-50 text-amber-600 border-amber-100'
    }
  ];

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
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-500 via-emerald-400 to-amber-400" />
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              <span className="grid h-14 w-14 place-items-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600 shadow-sm">
                <BarChart3 className="h-5 w-5 md:h-6 md:w-6" />
              </span>
              Reportes
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500 md:text-base">
              Revisa operaciones por etiqueta y por periodo para calcular lo que corresponde pagar.
            </p>
          </div>

          {scope?.isReadOnly ? (
            <div className="flex flex-col gap-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-500">Etiqueta</label>
              <div className="inline-flex min-w-[220px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-extrabold text-slate-700">
                {scope.reportTag?.label || 'Sin etiqueta'}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
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
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/70 p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="inline-flex w-full flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm sm:w-auto">
              {[
                { key: 'day', label: 'Día' },
                { key: 'week', label: 'Semana' },
                { key: 'month', label: 'Mes' },
                { key: 'custom', label: 'Rango' }
              ].map((period) => (
                <button
                  key={period.key}
                  type="button"
                  onClick={() => setPeriodMode(period.key as PeriodMode)}
                  className={`min-h-10 rounded-xl px-4 text-sm font-black transition-all ${
                    periodMode === period.key
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex items-center gap-2">
                {periodMode !== 'custom' && (
                  <button
                    type="button"
                    onClick={() => shiftPeriod(-1)}
                    className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-indigo-200 hover:text-indigo-600"
                    aria-label="Periodo anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}

                <div className="flex min-h-11 min-w-[230px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm">
                  <CalendarRange className="h-4 w-4 text-indigo-500" />
                  <span className="truncate capitalize">{periodRange.label}</span>
                </div>

                {periodMode !== 'custom' && (
                  <button
                    type="button"
                    onClick={() => shiftPeriod(1)}
                    className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-indigo-200 hover:text-indigo-600"
                    aria-label="Periodo siguiente"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>

              {periodMode === 'day' && (
                <input
                  type="date"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              )}

              {periodMode === 'week' && (
                <input
                  type="date"
                  value={weekAnchor}
                  onChange={(e) => setWeekAnchor(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              )}

              {periodMode === 'month' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              )}

              {periodMode === 'custom' && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(15,23,42,0.09)]">
                <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${card.accent}`} />
                <div className="mb-5 flex items-center justify-between gap-3">
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border ${card.soft}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="break-words font-mono text-3xl font-black tracking-tight text-slate-900 xl:text-[2rem]">{card.value}</p>
                <p className="mt-2 text-xs font-bold text-slate-500">{card.note}</p>
              </div>
            );
          })}
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-cyan-100 bg-cyan-950 p-6 text-white shadow-[0_20px_55px_rgba(8,145,178,0.18)]">
          <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-[4rem] bg-cyan-400/20" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-cyan-200">A pagar</p>
              <h2 className="mt-2 text-xl font-black text-white">{totals.operatorLabel}</h2>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/10 text-cyan-100">
              <DollarSign className="h-5 w-5" />
            </span>
          </div>
          <p className="relative mt-6 font-mono text-5xl font-black tracking-tight">$ {formatMoney(totals.operatorProfit)}</p>
          <div className="relative mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-cyan-200">Porcentaje</p>
              <p className="mt-1 font-black">{totals.operatorPercentage}%</p>
            </div>
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-cyan-200">Periodo</p>
              <p className="mt-1 font-black capitalize">{periodRange.label}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">Operaciones del periodo</h2>
            <p className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-500">
              <Clock3 className="h-3.5 w-3.5 text-indigo-500" />
              <span className="capitalize">{periodRange.label}</span>
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            {totals.count} registros
          </div>
        </div>

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
              {paginated.map((tx) => {
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
                    <td className="px-5 py-4 text-right font-mono font-black text-slate-800">${formatMoney(Number(tx.ingresoUSD) || 0)}</td>
                    <td className="px-5 py-4 text-right font-mono font-black text-slate-700">{formatMoney(Number(tx.salidaUSDT) || 0)}</td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-slate-500">{(Number(tx.tasa) || 0).toFixed(2)}</td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-slate-500">{formatMoney(Number(tx.montoVES) || 0)}</td>
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

        {filtered.length > 0 && (
          <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/80 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-black text-slate-700">
                Mostrando {firstItem}-{lastItem} de {filtered.length}
              </p>
              <p className="text-xs font-bold text-slate-400">Los totales de arriba incluyen todo el periodo filtrado.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Filas
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black normal-case tracking-normal text-slate-700 shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>

              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => goToPage(safeCurrentPage - 1)}
                  disabled={safeCurrentPage <= 1}
                  className="grid h-10 w-10 place-items-center rounded-xl text-slate-600 transition-all hover:bg-slate-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                  aria-label="Pagina anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[96px] text-center text-sm font-black text-slate-700">
                  {safeCurrentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(safeCurrentPage + 1)}
                  disabled={safeCurrentPage >= totalPages}
                  className="grid h-10 w-10 place-items-center rounded-xl text-slate-600 transition-all hover:bg-slate-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                  aria-label="Pagina siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

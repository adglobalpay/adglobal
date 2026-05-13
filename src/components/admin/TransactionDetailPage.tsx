import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Printer, Download, Phone, Mail, MapPin, Banknote,
  CheckCircle2, Clock, AlertTriangle, XCircle, FileText, Save, Upload
} from 'lucide-react';
import { apiFetch, getUser } from '../../lib/auth';

interface TransactionDetail {
  id: string;
  fecha: string;
  ingresoUSD: number;
  salidaUSDT: number;
  montoVES: number;
  tasa: number;
  metodo: string;
  estado: string;
  comprobantePago: string | null;
  comprobanteAdmin: string | null;
  profitUSD: number | null;
  adminComision: number | null;
  notasAdmin: string | null;
  fechaVerificacion: string | null;
  verificador: { firstName: string; lastName: string | null } | null;
  client: {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string | null;
    email: string | null;
    country: string;
  } | null;
  recipient: {
    id: string;
    name: string;
    phone: string | null;
    bank: string;
    accountNumber: string;
    accountType: string;
  } | null;
  documents: Array<{
    id: string;
    tipo: string;
    nombre: string;
    url: string;
    mimeType: string | null;
  }>;
}

const ESTADO_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; icon: React.ReactNode }> = {
  PENDING: {
    bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Pendiente',
    icon: <Clock className="w-3 h-3" />
  },
  PROCESSING: {
    bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Procesando',
    icon: <Clock className="w-3 h-3" />
  },
  COMPLETED: {
    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Completado',
    icon: <CheckCircle2 className="w-3 h-3" />
  },
  FAILED: {
    bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Fallido',
    icon: <XCircle className="w-3 h-3" />
  },
  REJECTED: {
    bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Rechazado',
    icon: <XCircle className="w-3 h-3" />
  },
  CANCELLED: {
    bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'Cancelado',
    icon: <AlertTriangle className="w-3 h-3" />
  }
};

export default function TransactionDetailPage({ txId: txIdProp }: { txId: string }) {
  const [tx, setTx] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [estado, setEstado] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const txId = (txIdProp && txIdProp !== 'placeholder')
    ? txIdProp
    : (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') || '' : '');
  const currentUser = getUser();
  const isAdminReviewer = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const loadTx = useCallback(async () => {
    if (!txId) {
      setTx(null);
      setError('ID de transacción no encontrado en la URL.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/api/transactions/${txId}`);
      setTx(data);
      setEstado(data.estado);
      setNotas(data.notasAdmin || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [txId]);

  useEffect(() => {
    loadTx();
  }, [loadTx]);

  const handleSave = async () => {
    if (!isAdminReviewer) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'warning', message: 'Acceso restringido', description: 'Solo admin puede validar o cambiar el estado de esta operación.' }
      }));
      return;
    }

    setSaving(true);
    try {
      await apiFetch(`/api/transactions/${txId}`, {
        method: 'PATCH',
        body: JSON.stringify({ estado, notasAdmin: notas })
      });
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: 'Guardado', description: 'Transacción actualizada correctamente.' }
      }));
      loadTx();
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'Error', description: err.message }
      }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-8 h-24 shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 h-48 shimmer" />
          <div className="bg-white rounded-2xl p-6 h-48 shimmer" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-2xl p-5 h-28 shimmer" />)}
        </div>
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-red-700 text-sm font-medium">
          Error al cargar transacción: {error || 'No encontrada'}
        </div>
      </div>
    );
  }

  const est = ESTADO_CONFIG[tx.estado] || ESTADO_CONFIG.PENDING;
  const fechaStr = new Date(tx.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs md:text-sm text-slate-400 font-medium anim-fade-in-up stagger-1">
        <a href="/admin/transacciones" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Transacciones
        </a>
        <ArrowLeft className="w-3.5 h-3.5 text-slate-300 rotate-180" />
        <span className="text-slate-700 font-semibold">Transacción #{tx.id.substring(0, 8).toUpperCase()}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 anim-fade-in-up stagger-2">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Detalle de Transacción</h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${est.bg} ${est.text} ${est.border}`}>
              {est.icon} {est.label}
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium">{fechaStr} · Método: <span className="font-bold text-slate-700">{tx.metodo}</span></p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all shadow-sm">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'info', message: 'Próximamente', description: 'Descarga PDF en desarrollo.' } }))}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/25 btn-interactive">
            <Download className="w-4 h-4" /> Descargar
          </button>
        </div>
      </div>

      {/* Remitente / Destinatario */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 anim-fade-in-up stagger-3">
        {/* Remitente */}
        <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 md:p-6 card-hover">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Phone className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-800">Remitente</h2>
              <p className="text-xs text-slate-400 font-medium">Datos del envío</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-0.5">Nombre</p>
              <p className="text-sm font-bold text-slate-800">
                {tx.client ? `${tx.client.firstName} ${tx.client.lastName || ''}`.trim() : '—'}
              </p>
            </div>
            {tx.client?.phone && (
              <div>
                <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-0.5">Teléfono</p>
                <p className="text-sm font-mono font-semibold text-slate-700">{tx.client.phone}</p>
              </div>
            )}
            {tx.client?.email && (
              <div>
                <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-0.5">Correo</p>
                <p className="text-sm font-semibold text-slate-700">{tx.client.email}</p>
              </div>
            )}
            {tx.client?.country && (
              <div>
                <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-0.5">País</p>
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />{tx.client.country.toUpperCase()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Destinatario */}
        <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 md:p-6 card-hover">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Banknote className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-800">Destinatario</h2>
              <p className="text-xs text-slate-400 font-medium">Datos de recepción</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-0.5">Nombre</p>
              <p className="text-sm font-bold text-slate-800">{tx.recipient?.name || '—'}</p>
            </div>
            {tx.recipient?.phone && (
              <div>
                <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-0.5">Teléfono</p>
                <p className="text-sm font-mono font-semibold text-slate-700">{tx.recipient.phone}</p>
              </div>
            )}
            {tx.recipient?.bank && (
              <div>
                <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-0.5">Banco</p>
                <p className="text-sm font-semibold text-slate-700">{tx.recipient.bank}</p>
              </div>
            )}
            {tx.recipient?.accountNumber && (
              <div>
                <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-0.5">Cuenta</p>
                <p className="text-sm font-mono font-semibold text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">{tx.recipient.accountNumber}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Montos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 anim-fade-in-up stagger-4">
        {[
          { label: 'Ingreso USD', value: `$${Number(tx.ingresoUSD).toFixed(2)}`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Salida USDT', value: `$${Number(tx.salidaUSDT).toFixed(2)}`, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Monto enviado (Bs)', value: `Bs. ${Number(tx.montoVES || (tx.salidaUSDT * tx.tasa)).toLocaleString()}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Tasa de cambio', value: `Bs. ${Number(tx.tasa).toFixed(2)}`, sub: tx.metodo, color: 'text-cyan-600', bg: 'bg-cyan-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200/60 p-4 md:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] card-hover anim-fade-in-up" style={{ animationDelay: `${0.35 + i * 0.05}s` }}>
            <div className={`w-9 h-9 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-3`}>
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
            <p className="text-lg md:text-xl font-bold text-slate-800 mt-1 tracking-tight">{stat.value}</p>
            {stat.sub && <p className="text-[0.65rem] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{stat.sub}</p>}
          </div>
        ))}
      </div>

      {/* Profit + Comisión */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 anim-fade-in-up stagger-5">
        <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 md:p-6 card-hover">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Banknote className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-800">Profit</h2>
              <p className="text-xs text-slate-400 font-medium">Ganancia neta</p>
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-emerald-600 tracking-tight">${Number(tx.profitUSD || 0).toFixed(2)} <span className="text-sm text-emerald-500/70">USD</span></p>
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 md:p-6 card-hover">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-800">Comisión Admin</h2>
              <p className="text-xs text-slate-400 font-medium">Retención del operador</p>
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-indigo-600 tracking-tight">${Number(tx.adminComision || 0).toFixed(2)} <span className="text-sm text-indigo-500/70">USD</span></p>
        </div>
      </div>

      {/* Verificación Administrativa */}
      <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 md:p-6 anim-fade-in-up stagger-6 card-hover">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-800">Verificación Administrativa</h2>
            <p className="text-xs text-slate-400 font-medium">Comprobantes y control de estado</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
          {/* Comprobantes */}
          <div className="space-y-3">
            <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400">Comprobantes</p>
            {[
              { key: 'comprobantePago' as const, label: 'Comprobante de pago' },
              { key: 'comprobanteAdmin' as const, label: 'Comprobante administrativo' }
            ].map(doc => (
              <div key={doc.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0"><FileText className="w-4 h-4" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700">{doc.label}</p>
                    <p className="text-xs text-slate-400 font-medium truncate">{tx[doc.key] || 'No disponible'}</p>
                  </div>
                </div>
                {tx[doc.key] ? (
                  <button onClick={() => window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'info', message: 'Comprobante', description: 'Visualización próximamente.' } }))}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all border border-indigo-100 shrink-0">Ver</button>
                ) : (
                  <span className="text-xs text-slate-300 font-bold shrink-0">—</span>
                )}
              </div>
            ))}
            {tx.documents.length > 0 && tx.documents.map(d => (
              <div key={d.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0"><FileText className="w-4 h-4" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700">{d.nombre}</p>
                    <p className="text-xs text-slate-400 font-medium truncate">{d.tipo}</p>
                  </div>
                </div>
                <button onClick={() => window.open(d.url, '_blank')} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all border border-indigo-100 shrink-0">Ver</button>
              </div>
            ))}
          </div>

          {/* Acciones de verificación */}
          <div className="space-y-4">
            <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400">Acciones de verificación</p>

            <div>
              <label className="block text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-1.5">Cambiar estado</label>
              <select value={estado} onChange={e => setEstado(e.target.value)} disabled={!isAdminReviewer}
                className="custom-select w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm disabled:cursor-not-allowed disabled:opacity-60">
                <option value="PENDING">Pendiente revisión</option>
                <option value="PROCESSING">En verificación</option>
                <option value="COMPLETED">Completado</option>
                <option value="FAILED">Fallido</option>
                <option value="REJECTED">Rechazado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-1.5">Notas de verificación</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3} disabled={!isAdminReviewer}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium resize-none disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Agregar notas sobre la verificación..." />
            </div>

            {!isAdminReviewer && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-xs font-bold text-amber-700">Solo un usuario con rol ADMIN o SUPER_ADMIN puede validar esta operación.</p>
              </div>
            )}

            {tx.fechaVerificacion && tx.verificador && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs font-bold text-emerald-700">Verificado por {tx.verificador.firstName} {tx.verificador.lastName || ''}</p>
                </div>
                <p className="text-[0.65rem] text-emerald-600/70 font-medium mt-0.5">{new Date(tx.fechaVerificacion).toLocaleString('es-ES')}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={saving || !isAdminReviewer}
                className="btn-interactive flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 disabled:opacity-60">
                <Save className="w-3.5 h-3.5" /> {saving ? 'Guardando...' : 'Guardar verificación'}
              </button>
              <button onClick={() => window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'info', message: 'Próximamente', description: 'Subida de comprobantes en desarrollo.' } }))}
                className="px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Subir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

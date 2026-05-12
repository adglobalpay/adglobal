import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRight, Phone, Mail, MapPin, CheckCircle2, Clock, ExternalLink,
  UserPlus, Wallet, FileText, ShieldCheck, Eye, Copy, Send, Upload,
  AlertTriangle, Trash2
} from 'lucide-react';
import { apiFetch } from '../../lib/auth';

interface Recipient {
  id: string;
  name: string;
  relationship: string;
  phone: string | null;
  bank: string;
  accountNumber: string;
  accountType: string;
  identification: string | null;
  notes: string | null;
  isActive: boolean;
  _count?: { transactions: number };
}

interface Transaction {
  id: string;
  fecha: string;
  ingresoUSD: number;
  montoVES: number;
  tasa: number;
  estado: string;
  metodo: string;
  recipient: { name: string } | null;
}

interface KycRequest {
  id: string;
  status: string;
  token: string;
  createdAt: string;
  expiresAt: string | null;
  completedAt: string | null;
}

interface OfacCheck {
  id: string;
  status: string;
  checkedAt: string | null;
  notes: string | null;
  checkedBy: { firstName: string; lastName: string | null } | null;
}

interface ClientDetail {
  id: string;
  country: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  preferredMethod: string | null;
  notes: string | null;
  kycStatus: string;
  ofacStatus: string;
  referralCode: string | null;
  referredById: string | null;
  status: string;
  createdAt: string;
  recipients: Recipient[];
  transactions: Transaction[];
  kycRequests: KycRequest[];
  ofacChecks: OfacCheck[];
  referredBy: { id: string; firstName: string; lastName: string | null } | null;
  referrals: { id: string; firstName: string; lastName: string | null }[];
  _count?: { transactions: number; recipients: number; referrals: number };
}

const ESTADO_MAP: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Activo', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  INACTIVE: { label: 'Inactivo', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  SUSPENDED: { label: 'Suspendido', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  BLOCKED: { label: 'Bloqueado', className: 'bg-rose-50 text-rose-700 border-rose-200' }
};

const KYC_MAP: Record<string, { label: string; className: string }> = {
  VERIFIED: { label: 'Verificado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PENDING: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  PROCESSING: { label: 'Procesando', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  REJECTED: { label: 'Rechazado', className: 'bg-rose-50 text-rose-700 border-rose-200' }
};

const OFAC_MAP: Record<string, { label: string; className: string }> = {
  OK: { label: 'Sin coincidencias', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PENDING: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  REVIEW: { label: 'En revisión', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  BLOCKED: { label: 'Bloqueado', className: 'bg-rose-50 text-rose-700 border-rose-200' }
};

const TX_ESTADO_MAP: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: 'Completado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PROCESSING: { label: 'Procesando', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  PENDING: { label: 'Pendiente', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  FAILED: { label: 'Fallido', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  REJECTED: { label: 'Rechazado', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  CANCELLED: { label: 'Cancelado', className: 'bg-slate-100 text-slate-600 border-slate-200' }
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getLevelInfo(totalTx: number) {
  if (totalTx >= 8) return { name: 'Diamante', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: '💎' };
  if (totalTx >= 5) return { name: 'Platino', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: '🏆' };
  if (totalTx >= 3) return { name: 'Oro', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: '🥇' };
  if (totalTx >= 1) return { name: 'Plata', color: 'bg-slate-100 text-slate-700 border-slate-300', icon: '🥈' };
  return { name: 'Bronce', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: '🥉' };
}

export default function ClientDetailPage({ clientId: clientIdProp }: { clientId: string }) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const clientId = clientIdProp || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') || '' : '');

  const loadClient = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/api/clients/${clientId}`);
      setClient(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  const handleCopy = (texto: string) => {
    navigator.clipboard.writeText(texto).then(() => {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: 'Copiado', description: `"${texto}" copiado al portapapeles.` }
      }));
    });
  };

  const getKycLink = (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://adglobalpay.com';
    return `${origin}/kyc/?token=${token}`;
  };

  const handleSendKyc = async () => {
    if (!client) return;
    try {
      // 1. Crear solicitud KYC
      const kyc = await apiFetch('/api/kyc', {
        method: 'POST',
        body: JSON.stringify({ clientId: client.id })
      });

      // 2. Generar link
      const link = getKycLink(kyc.token);

      // 3. Enviar email via Brevo
      if (client.email) {
        try {
          await apiFetch('/api/kyc/send-email', {
            method: 'POST',
            body: JSON.stringify({ clientId: client.id, token: kyc.token, link })
          });
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { type: 'success', message: 'KYC enviado', description: `Solicitud enviada a ${client.email}` }
          }));
        } catch (emailErr: any) {
          // El email falló pero el KYC se creó — mostrar warning
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { type: 'warning', message: 'Email no enviado', description: `${emailErr.message}. El link fue generado, copialo manualmente.` }
          }));
        }
      } else {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { type: 'info', message: 'Link generado', description: 'El cliente no tiene email. Copia y comparte el link manualmente.' }
        }));
      }

      loadClient();
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'Error', description: err.message }
      }));
    }
  };

  const handleCopyKycLink = async () => {
    if (!client) return;
    let token = latestKyc?.token;
    if (!token) {
      try {
        const kyc = await apiFetch('/api/kyc', {
          method: 'POST',
          body: JSON.stringify({ clientId: client.id })
        });
        token = kyc.token;
        loadClient();
      } catch (err: any) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { type: 'error', message: 'Error', description: err.message }
        }));
        return;
      }
    }
    const link = getKycLink(token);
    navigator.clipboard.writeText(link).then(() => {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: 'Link copiado', description: 'El link KYC fue copiado al portapapeles.' }
      }));
    });
  };

  const handleMarkOfacOk = async () => {
    try {
      await apiFetch('/api/ofac', {
        method: 'POST',
        body: JSON.stringify({ clientId: client?.id, status: 'OK' })
      });
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: 'OFAC verificado', description: 'Cliente marcado sin coincidencias.' }
      }));
      loadClient();
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'Error', description: err.message }
      }));
    }
  };

  const handleDeleteClient = async () => {
    if (!client) return;
    if (!confirm('¿Está seguro de querer eliminar este cliente? Esta acción no se puede deshacer.')) return;
    try {
      await apiFetch(`/api/clients/${client.id}`, {
        method: 'DELETE'
      });
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: 'Cliente eliminado', description: 'El cliente ha sido eliminado exitosamente.' }
      }));
      window.location.href = '/admin/clientes';
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'Error', description: err.message }
      }));
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!client) return;
    try {
      await apiFetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: 'Estado actualizado', description: 'El estado del cliente ha sido actualizado.' }
      }));
      loadClient();
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'Error', description: err.message }
      }));
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-8 h-40 shimmer" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-2xl p-5 h-28 shimmer" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 h-64 shimmer" />
          <div className="bg-white rounded-2xl p-6 h-64 shimmer" />
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-red-700 text-sm font-medium">
          Error al cargar cliente: {error || 'No encontrado'}
        </div>
      </div>
    );
  }

  const fullName = client.lastName ? `${client.firstName} ${client.lastName}` : client.firstName;
  const totalUsd = client.transactions.reduce((sum, t) => sum + Number(t.ingresoUSD || 0), 0);
  const totalTx = client.transactions.length;
  const levelInfo = getLevelInfo(totalTx);
  const kycCfg = KYC_MAP[client.kycStatus] || KYC_MAP.PENDING;
  const ofacCfg = OFAC_MAP[client.ofacStatus] || OFAC_MAP.PENDING;
  const statusCfg = ESTADO_MAP[client.status] || ESTADO_MAP.ACTIVE;
  const latestKyc = client.kycRequests[0];
  const latestOfac = client.ofacChecks[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs md:text-sm text-slate-400 font-medium anim-fade-in-up stagger-1">
        <a href="/admin/clientes" className="hover:text-indigo-600 transition-colors">Clientes</a>
        <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-700 font-semibold">{fullName}</span>
      </nav>

      {/* Header Card */}
      <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 md:p-8 anim-fade-in-up stagger-2 card-hover">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-lg shadow-indigo-500/20 shrink-0 float-anim">
              {fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">{fullName}</h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${levelInfo.color}`}>
                  <span>{levelInfo.icon}</span> {levelInfo.name}
                </span>
                  <select
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[0.65rem] font-bold border uppercase tracking-wider appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${statusCfg.className}`}
                    value={client.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                  >
                    {Object.entries(ESTADO_MAP).map(([key, cfg]) => (
                      <option key={key} value={key} className="text-slate-700 bg-white">
                        {cfg.label}
                      </option>
                    ))}
                  </select>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-500 font-medium">
                {client.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />{client.email}
                  </span>
                )}
                {client.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />{client.phone}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[0.65rem] font-black uppercase tracking-wider border border-slate-200">
                  <MapPin className="w-3 h-3" />{client.country.toUpperCase()}
                </span>
                {client.preferredMethod && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[0.65rem] font-black uppercase tracking-wider border border-indigo-100">
                    {client.preferredMethod}
                  </span>
                )}
              </div>
              {client.notes && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl text-sm text-slate-600 font-medium border border-slate-100">
                  📝 {client.notes}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={handleDeleteClient} className="btn-interactive inline-flex items-center justify-center w-[42px] h-[42px] bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-xl transition-colors shrink-0" title="Eliminar cliente">
              <Trash2 className="w-5 h-5" />
            </button>
            <a href={`/admin/transacciones/nueva?clienteId=${client.id}`} className="btn-interactive inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25">
              <Wallet className="w-4 h-4" /> Nueva transacción
            </a>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 anim-fade-in-up stagger-3">
        {[
          { label: 'Transacciones', value: totalTx.toString(), icon: <FileText className="w-5 h-5" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Total enviado', value: `$${totalUsd.toLocaleString()}`, icon: <Wallet className="w-5 h-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Destinatarios', value: client.recipients.length.toString(), icon: <UserPlus className="w-5 h-5" />, color: 'text-cyan-600', bg: 'bg-cyan-50' },
          { label: 'Referidos', value: (client._count?.referrals || client.referrals.length).toString(), icon: <ArrowRight className="w-5 h-5" />, color: 'text-amber-600', bg: 'bg-amber-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200/60 p-4 md:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] card-hover anim-fade-in-up" style={{ animationDelay: `${0.3 + i * 0.05}s` }}>
            <div className={`w-9 h-9 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-3`}>{stat.icon}</div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
            <p className="text-xl md:text-2xl font-bold text-slate-800 mt-1 tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* KYC + OFAC Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 anim-fade-in-up stagger-4">
        {/* KYC */}
        <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 md:p-6 card-hover">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Eye className="w-5 h-5" /></div>
              <div>
                <h2 className="text-base md:text-lg font-bold text-slate-800">Verificación KYC</h2>
                <p className="text-xs text-slate-400 font-medium">Identidad validada</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSendKyc} className="btn-interactive px-3 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" /> Enviar link
              </button>
              <button onClick={handleCopyKycLink} className="btn-interactive px-3 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg font-bold text-xs hover:bg-indigo-50 transition-all flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5" /> Copiar link
              </button>
              <button onClick={() => {
                const input = document.createElement('input');
                input.type = 'file'; input.accept = 'image/*,application/pdf'; input.multiple = true;
                input.onchange = (e: any) => {
                  if (e.target.files.length > 0) {
                    window.dispatchEvent(new CustomEvent('show-toast', {
                      detail: { type: 'info', message: 'Documentos seleccionados', description: `${e.target.files.length} archivo(s) listos para subir.` }
                    }));
                  }
                };
                input.click();
              }} className="px-3 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Subir
              </button>
            </div>
          </div>

          {/* Link KYC visible */}
          {latestKyc && (
            <div className="mb-5 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <p className="text-[0.6rem] font-black uppercase tracking-wider text-indigo-400 mb-2">Link de verificación KYC</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded-lg border border-indigo-200 text-sm font-mono text-slate-700 truncate">
                  {getKycLink(latestKyc.token)}
                </code>
                <button onClick={handleCopyKycLink} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-1.5 shrink-0">
                  <Copy className="w-3.5 h-3.5" /> Copiar
                </button>
              </div>
              <p className="text-[0.65rem] text-indigo-400 font-medium mt-2">Comparte este link con el cliente para que complete su verificación.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-1">Estado</p>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border ${kycCfg.className}`}>
                {client.kycStatus === 'VERIFIED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {kycCfg.label}
              </span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-1">Fecha</p>
              <p className="text-sm font-bold text-slate-700">{latestKyc ? formatDateTime(latestKyc.createdAt) : '—'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-1">Método</p>
              <p className="text-sm font-bold text-slate-700">{latestKyc ? 'Manual' : '—'}</p>
            </div>
          </div>
        </div>

        {/* OFAC */}
        <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 md:p-6 card-hover">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
              <div>
                <h2 className="text-base md:text-lg font-bold text-slate-800">Verificación OFAC</h2>
                <p className="text-xs text-slate-400 font-medium">Listas de sanciones</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a href="https://sanctionssearch.ofac.treas.gov/" target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> OFAC
              </a>
              <button onClick={handleMarkOfacOk} className={`px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 border ${ofacCfg.className}`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Marcar OK
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400">Estado actual</span>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border ${ofacCfg.className}`}>
                {client.ofacStatus === 'OK' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {ofacCfg.label}
              </span>
            </div>
            <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-2">Nombre para búsqueda</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono text-slate-700">{fullName}</code>
              <button onClick={() => handleCopy(fullName)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-1.5 shrink-0">
                <Copy className="w-3.5 h-3.5" /> Copiar
              </button>
            </div>
          </div>

          {latestOfac && (
            <div>
              <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400 mb-2">Última verificación</p>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                <span>{latestOfac.checkedAt ? formatDateTime(latestOfac.checkedAt) : formatDateTime(latestOfac.createdAt)}</span>
                <span className="text-emerald-600 font-bold">— {ofacCfg.label}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Destinatarios */}
      <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 md:p-6 anim-fade-in-up stagger-5 card-hover">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center"><UserPlus className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-800">Destinatarios</h2>
              <p className="text-xs text-slate-400 font-medium">{client.recipients.length} registrados</p>
            </div>
          </div>
          <a href={`/admin/clientes/destinatarios?id=${client.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-all">
            Ver todos <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {client.recipients.map((dest) => (
            <div key={dest.id} className="group p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all duration-300">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
                    {dest.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-800 truncate">{dest.name}</p>
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-white rounded text-[0.6rem] font-black uppercase tracking-wider text-slate-500 border border-slate-200">{dest.relationship}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {dest.phone && (
                  <div>
                    <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400">Teléfono</p>
                    <p className="font-mono font-medium text-slate-700">{dest.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400">Banco</p>
                  <p className="font-medium text-slate-700">{dest.bank}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400">Cuenta</p>
                  <p className="font-mono font-medium text-slate-700 bg-white px-2 py-1 rounded border border-slate-100 mt-0.5">{dest.accountNumber}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Badges / Referrals */}
      {(client.referrals.length > 0 || client.referredBy) && (
        <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 md:p-6 anim-fade-in-up stagger-6 card-hover">
          <h2 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">🏆 Logros</h2>
          <div className="flex flex-wrap gap-2">
            {client.referrals.length > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 text-sm font-bold">
                <ArrowRight className="w-4 h-4" /> Referidor · {client.referrals.length} clientes
              </div>
            )}
            {client.referredBy && (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 text-sm font-bold">
                <UserPlus className="w-4 h-4" /> Cliente referido por {client.referredBy.firstName} {client.referredBy.lastName || ''}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historial de transacciones */}
      <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 md:p-6 anim-fade-in-up stagger-7 card-hover">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-800">Historial de transacciones</h2>
              <p className="text-xs text-slate-400 font-medium">{totalTx} envíos registrados</p>
            </div>
          </div>
          <a href={`/admin/transacciones?cliente=${client.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-all">
            Ver todas <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="text-left text-slate-400 text-[0.6rem] font-bold uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                <th className="py-3 pl-4 md:pl-6 pr-3">Fecha</th>
                <th className="py-3 px-3">Destinatario</th>
                <th className="py-3 px-3">Monto USD</th>
                <th className="py-3 px-3">Monto VES</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 pr-4 md:pr-6 pl-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {client.transactions.map((tx, idx) => {
                const txCfg = TX_ESTADO_MAP[tx.estado] || TX_ESTADO_MAP.PENDING;
                return (
                  <tr key={tx.id} className="table-row-anim group" style={{ animationDelay: `${idx * 50}ms` }}>
                    <td className="py-3 pl-4 md:pl-6 pr-3 text-sm font-semibold text-slate-700">{formatDate(tx.fecha)}</td>
                    <td className="py-3 px-3 text-sm text-slate-600 font-medium">{tx.recipient?.name || '—'}</td>
                    <td className="py-3 px-3 text-sm font-bold text-slate-800 font-mono">${Number(tx.ingresoUSD).toLocaleString()}</td>
                    <td className="py-3 px-3 text-sm text-slate-500 font-mono">Bs. {Number(tx.montoVES).toLocaleString()}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[0.6rem] font-bold uppercase tracking-wider border gap-1 ${txCfg.className}`}>
                        {tx.estado === 'COMPLETED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {txCfg.label}
                      </span>
                    </td>
                    <td className="py-3 pr-4 md:pr-6 pl-3 text-right">
                      <a href={`/admin/transacciones/detalle?id=${encodeURIComponent(tx.id)}`} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-all">
                        Ver <ArrowRight className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

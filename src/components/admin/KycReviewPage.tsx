import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, Clock, ExternalLink, FileCheck2, Fingerprint, RefreshCw,
  ShieldAlert, XCircle
} from 'lucide-react';
import { apiFetch } from '../../lib/auth';

interface KycDocument {
  id: string;
  documentType: string;
  status: string | null;
  url: string | null;
  uploadedAt: string;
}

interface KycRequest {
  id: string;
  token: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  client: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    kycStatus: string;
  };
  documents: KycDocument[];
}

const STATUS_MAP: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
  PROCESSING: { label: 'Por revisar', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  VERIFIED: { label: 'Aprobado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  REJECTED: { label: 'Rechazado', className: 'bg-rose-50 text-rose-700 border-rose-200', icon: <XCircle className="w-3.5 h-3.5" /> }
};

const DOC_LABELS: Record<string, string> = {
  signature: 'Firma',
  selfie: 'Rostro',
  id_front: 'Cedula'
};

function formatDate(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function clientName(request: KycRequest) {
  return `${request.client.firstName} ${request.client.lastName || ''}`.trim();
}

export default function KycReviewPage() {
  const [requests, setRequests] = useState<KycRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('PROCESSING');
  const [reviewing, setReviewing] = useState('');

  const loadKyc = useCallback(async (preferredId?: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/kyc');
      setRequests(data || []);

      // Si hay un kycId en la URL, seleccionarlo
      const params = new URLSearchParams(window.location.search);
      const urlKycId = params.get('kycId');
      if (urlKycId) {
        const found = (data || []).find((r: KycRequest) => r.id === urlKycId);
        if (found) {
          setFilter('ALL');
          setSelectedId(preferredId || found.id);
        } else {
          setSelectedId((current: string) => preferredId || current || data?.[0]?.id || '');
        }
      } else {
        setSelectedId((current: string) => preferredId || current || data?.[0]?.id || '');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKyc();
  }, [loadKyc]);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return requests;
    return requests.filter((request) => request.status === filter);
  }, [requests, filter]);

  const selected = useMemo(() => {
    return filtered.find((request) => request.id === selectedId) || filtered[0] || null;
  }, [selectedId, filtered]);

  const stats = useMemo(() => ({
    processing: requests.filter((request) => request.status === 'PROCESSING').length,
    verified: requests.filter((request) => request.status === 'VERIFIED').length,
    rejected: requests.filter((request) => request.status === 'REJECTED').length,
    total: requests.length
  }), [requests]);

  const reviewRequest = async (status: 'VERIFIED' | 'REJECTED') => {
    if (!selected) return;
    const notes = status === 'REJECTED'
      ? window.prompt('Motivo del rechazo', 'Documento ilegible o datos incompletos') || ''
      : '';

    setReviewing(status);
    try {
      await apiFetch(`/api/kyc/${selected.id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes })
      });
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          type: 'success',
          message: status === 'VERIFIED' ? 'KYC aprobado' : 'KYC rechazado',
          description: `${clientName(selected)} actualizado correctamente.`
        }
      }));
      await loadKyc(selected.id);
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'Error', description: err.message }
      }));
    } finally {
      setReviewing('');
    }
  };

  const getKycLink = (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://adglobalpay.com';
    return `${origin}/kyc/?token=${token}`;
  };

  const requestKycCorrection = async () => {
    if (!selected) return;

    setReviewing('CORRECTION');
    try {
      const kyc = await apiFetch('/api/kyc', {
        method: 'POST',
        body: JSON.stringify({ clientId: selected.client.id })
      });

      const link = getKycLink(kyc.token);

      try {
        await navigator.clipboard.writeText(link);
      } catch {
        // Clipboard can be blocked by the browser; the correction flow should continue anyway.
      }

      if (selected.client.email) {
        try {
          await apiFetch('/api/kyc/send-email', {
            method: 'POST',
            body: JSON.stringify({ clientId: selected.client.id, token: kyc.token, link })
          });
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: {
              type: 'success',
              message: 'Corrección KYC enviada',
              description: `Se envió un nuevo link de actualización a ${selected.client.email}.`
            }
          }));
        } catch (emailErr: any) {
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: {
              type: 'warning',
              message: 'Link generado',
              description: `${emailErr.message}. El nuevo link KYC quedó copiado al portapapeles.`
            }
          }));
        }
      } else {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            type: 'info',
            message: 'Link generado',
            description: 'El cliente no tiene email. El nuevo link KYC quedó copiado al portapapeles.'
          }
        }));
      }

      setFilter('PROCESSING');
      await loadKyc(kyc.id);
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'Error', description: err.message }
      }));
    } finally {
      setReviewing('');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-3xl h-40 shimmer" />
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
          <div className="bg-white rounded-3xl h-96 shimmer" />
          <div className="bg-white rounded-3xl h-96 shimmer" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-red-700 text-sm font-medium">
        Error al cargar solicitudes KYC: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6 anim-fade-in">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3" style={{ fontFamily: 'var(--font-heading)' }}>
            <div className="p-2 md:p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Fingerprint className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            Revisión KYC
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm md:text-base">Verifica manualmente firmas, selfies y cédulas enviadas por los clientes.</p>
        </div>
        <button
          onClick={loadKyc}
          className="btn-interactive bg-indigo-600 text-white px-4 md:px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all font-bold text-sm flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(79,70,229,0.2)]"
        >
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Por revisar', value: stats.processing, className: 'text-blue-600 bg-blue-50' },
          { label: 'Aprobados', value: stats.verified, className: 'text-emerald-600 bg-emerald-50' },
          { label: 'Rechazados', value: stats.rejected, className: 'text-rose-600 bg-rose-50' },
          { label: 'Total', value: stats.total, className: 'text-indigo-600 bg-indigo-50' }
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className={`w-9 h-9 rounded-xl ${stat.className} flex items-center justify-center mb-3`}>
              <FileCheck2 className="w-5 h-5" />
            </div>
            <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-400">{stat.label}</p>
            <p className="text-2xl font-extrabold text-slate-800 font-mono">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['PROCESSING', 'Por revisar'],
          ['PENDING', 'Pendientes'],
          ['VERIFIED', 'Aprobados'],
          ['REJECTED', 'Rechazados'],
          ['ALL', 'Todos']
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
              filter === key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
        <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <p className="text-[0.7rem] font-black uppercase tracking-wider text-slate-400">Solicitudes</p>
          </div>
          <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
            {filtered.map((request) => {
              const cfg = STATUS_MAP[request.status] || STATUS_MAP.PENDING;
              return (
                <button
                  key={request.id}
                  onClick={() => setSelectedId(request.id)}
                  className={`w-full text-left p-4 transition-all hover:bg-indigo-50/40 ${selected?.id === request.id ? 'bg-indigo-50' : 'bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-800 truncate">{clientName(request)}</p>
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{request.client.email || 'Sin email'}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[0.65rem] font-bold border whitespace-nowrap ${cfg.className}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
                    <span>{request.documents.length} documentos</span>
                    <span>{formatDate(request.completedAt || request.createdAt)}</span>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm font-semibold text-slate-400">
                No hay solicitudes en este filtro.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 md:p-6 min-h-[520px]">
          {selected ? (
            <div className="space-y-5">
              {selected.status === 'VERIFIED' && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  Este KYC ya fue aprobado. Si necesitas actualizar firma, selfie o cédula, usa <span className="font-extrabold">Corregir KYC</span> para generar un nuevo enlace de carga.
                </div>
              )}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">{clientName(selected)}</h2>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${STATUS_MAP[selected.status]?.className || STATUS_MAP.PENDING.className}`}>
                      {STATUS_MAP[selected.status]?.icon} {STATUS_MAP[selected.status]?.label || selected.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium mt-1">{selected.client.email || 'Sin email registrado'}</p>
                  <p className="text-xs text-slate-400 font-semibold mt-2">Enviado: {formatDate(selected.completedAt || selected.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => reviewRequest('REJECTED')}
                    disabled={!!reviewing}
                    className="px-4 py-2.5 bg-white text-rose-600 border border-rose-200 rounded-xl font-bold text-sm hover:bg-rose-50 transition-colors disabled:opacity-60"
                  >
                    {reviewing === 'REJECTED' ? 'Guardando...' : 'Rechazar'}
                  </button>
                  <button
                    onClick={() => selected.status === 'VERIFIED' ? requestKycCorrection() : reviewRequest('VERIFIED')}
                    disabled={!!reviewing}
                    className={`btn-interactive px-4 py-2.5 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60 ${
                      selected.status === 'VERIFIED'
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {reviewing === 'VERIFIED'
                      ? 'Guardando...'
                      : reviewing === 'CORRECTION'
                        ? 'Preparando...'
                        : selected.status === 'VERIFIED'
                          ? 'Corregir KYC'
                          : 'Aprobar KYC'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {['signature', 'selfie', 'id_front'].map((type) => {
                  const doc = selected.documents.find((item) => item.documentType === type);
                  return (
                    <div key={type} className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500">{DOC_LABELS[type]}</p>
                        {doc?.url && (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      {doc?.url ? (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="block bg-white">
                          <img src={doc.url} alt={DOC_LABELS[type]} className="w-full h-72 object-contain bg-white" />
                        </a>
                      ) : (
                        <div className="h-72 flex items-center justify-center text-sm font-semibold text-slate-400">
                          No enviado
                        </div>
                      )}
                      <div className="px-4 py-3 text-[0.7rem] font-semibold text-slate-400">
                        {doc ? `Subido: ${formatDate(doc.uploadedAt)}` : 'Pendiente de carga'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center text-slate-400">
              <Fingerprint className="w-12 h-12 mb-3" />
              <p className="font-bold text-slate-500">Selecciona una solicitud</p>
              <p className="text-sm font-medium mt-1">Aquí verás la firma, selfie y cédula.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock, CheckCircle2, ExternalLink, FileCheck2, FileText, Fingerprint, History, RefreshCw,
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

interface KycWebhookData {
  submittedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  manualReview?: {
    status?: string;
    notes?: string | null;
    reviewedAt?: string;
    reviewedById?: string;
  };
}

interface KycRequest {
  id: string;
  token: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  webhookData?: KycWebhookData | null;
  client: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    kycStatus: string;
    clientType: 'NATURAL' | 'JURIDICO';
  };
  documents: KycDocument[];
}

const STATUS_MAP: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Por revisar', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  PROCESSING: { label: 'Por revisar', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  VERIFIED: { label: 'Aprobado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  REJECTED: { label: 'Rechazado', className: 'bg-rose-50 text-rose-700 border-rose-200', icon: <XCircle className="w-3.5 h-3.5" /> },
  CANCELED: { label: 'Cancelado', className: 'bg-slate-100 text-slate-600 border-slate-200', icon: <XCircle className="w-3.5 h-3.5" /> }
};

const DOC_LABELS: Record<string, string> = {
  signature: 'Firma',
  selfie: 'Rostro',
  id_front: 'Documento frente',
  id_back: 'Documento reverso',
  articles_of_organization: 'Articles of Organization',
  ein_letter: 'EIN Letter',
  representante_id: 'Documento del dueno o representante'
};

const NATURAL_REVIEW_DOC_TYPES = ['signature', 'selfie', 'id_front', 'id_back'] as const;
const JURIDICO_REVIEW_DOC_TYPES = ['signature', 'selfie', 'articles_of_organization', 'ein_letter', 'representante_id'] as const;

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

function normalizeKycStatus(status: string) {
  return status === 'PENDING' ? 'PROCESSING' : status;
}

function isExpiredDraft(request: KycRequest) {
  if (!request.expiresAt || request.completedAt) return false;
  if (['VERIFIED', 'REJECTED'].includes(request.status)) return false;
  return new Date(request.expiresAt).getTime() < Date.now();
}

function getDisplayStatus(request: KycRequest) {
  return isExpiredDraft(request) ? 'CANCELED' : normalizeKycStatus(request.status);
}

function getReviewNotes(request: KycRequest) {
  return request.webhookData?.manualReview?.notes?.trim() || '';
}

function getReviewDate(request: KycRequest) {
  return request.webhookData?.manualReview?.reviewedAt || null;
}

function getSubmittedDate(request: KycRequest) {
  return request.webhookData?.submittedAt || request.completedAt || request.createdAt;
}

function getReviewDocTypes(request: KycRequest) {
  return request.client.clientType === 'JURIDICO' ? JURIDICO_REVIEW_DOC_TYPES : NATURAL_REVIEW_DOC_TYPES;
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
    return requests.filter((request) => normalizeKycStatus(request.status) === filter);
  }, [requests, filter]);

  const selected = useMemo(() => {
    return filtered.find((request) => request.id === selectedId) || filtered[0] || null;
  }, [selectedId, filtered]);

  const selectedHistory = useMemo(() => {
    if (!selected) return [];
    return [...requests]
      .filter((request) => request.client.id === selected.client.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requests, selected]);

  const stats = useMemo(() => ({
    processing: requests.filter((request) => getDisplayStatus(request) === 'PROCESSING').length,
    verified: requests.filter((request) => request.status === 'VERIFIED').length,
    rejected: requests.filter((request) => request.status === 'REJECTED').length,
    total: requests.length
  }), [requests]);

  const reviewRequest = async (status: 'VERIFIED' | 'REJECTED') => {
    if (!selected) return;

    let notes = '';
    if (status === 'REJECTED') {
      const reason = window.prompt('Motivo del rechazo', 'Documento ilegible o datos incompletos');
      if (reason === null) return; // Usuario canceló el prompt, abortar acción
      notes = reason;
    }

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
      // Cambiar al tab correspondiente para que el usuario vea el resultado
      setFilter(status === 'VERIFIED' ? 'VERIFIED' : 'REJECTED');
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

  const downloadKycPdf = async () => {
    if (!selected) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('adglobal_token') : null;
      const API_URL = import.meta.env.VITE_API_URL || 'https://backend-global-production.up.railway.app';
      const res = await fetch(`${API_URL}/api/clients/${selected.client.id}/kyc.pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        if (contentType.includes('text/html')) {
          throw new Error('El backend no reconoce esta ruta. Asegurate de que este desplegada la ultima version del backend.');
        }
        const err = await res.json().catch(() => ({ error: 'Error al generar PDF' }));
        throw new Error(err.error || 'Error al generar PDF');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kyc-${selected.client.id.substring(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: 'PDF descargado', description: 'Documentos KYC descargados correctamente.' }
      }));
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'Error al descargar PDF', description: err.message }
      }));
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
          <p className="text-slate-500 mt-2 font-medium text-sm md:text-base">Verifica manualmente firmas y los documentos requeridos según el tipo de cliente: natural o jurídico.</p>
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
              const normalizedStatus = normalizeKycStatus(request.status);
              const cfg = STATUS_MAP[normalizedStatus] || STATUS_MAP.PROCESSING;
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
              {getDisplayStatus(selected) === 'VERIFIED' && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  Este KYC ya fue aprobado. Si necesitas actualizar firma o los documentos cargados, usa <span className="font-extrabold">Corregir KYC</span> para generar un nuevo enlace de carga.
                </div>
              )}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">{clientName(selected)}</h2>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${STATUS_MAP[getDisplayStatus(selected)]?.className || STATUS_MAP.PROCESSING.className}`}>
                      {STATUS_MAP[getDisplayStatus(selected)]?.icon} {STATUS_MAP[getDisplayStatus(selected)]?.label || getDisplayStatus(selected)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium mt-1">{selected.client.email || 'Sin email registrado'}</p>
                  <p className="text-xs text-cyan-700 font-bold mt-2 uppercase tracking-wider">{selected.client.clientType === 'JURIDICO' ? 'Cliente jurídico' : 'Cliente natural'}</p>
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
                    onClick={downloadKycPdf}
                    disabled={!!reviewing}
                    className="px-4 py-2.5 bg-white text-emerald-600 border border-emerald-200 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                  >
                    <FileText className="w-4 h-4" /> Descargar PDF
                  </button>
                  <button
                    onClick={() => getDisplayStatus(selected) === 'VERIFIED' ? requestKycCorrection() : reviewRequest('VERIFIED')}
                    disabled={!!reviewing}
                    className={`btn-interactive px-4 py-2.5 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60 ${
                      getDisplayStatus(selected) === 'VERIFIED'
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {reviewing === 'VERIFIED'
                      ? 'Guardando...'
                      : reviewing === 'CORRECTION'
                        ? 'Preparando...'
                        : getDisplayStatus(selected) === 'VERIFIED'
                          ? 'Corregir KYC'
                          : 'Aprobar KYC'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {getReviewDocTypes(selected).map((type) => {
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

              <section className="pt-5 border-t border-slate-100">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 mb-4">
                  <div>
                    <div className="flex items-center gap-2 text-slate-800">
                      <History className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-lg font-extrabold">Historial</h3>
                    </div>
                    <p className="text-sm text-slate-400 font-medium mt-1">Solicitudes anteriores, documentos cargados, fechas y notas de revisión.</p>
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">{selectedHistory.length} registros</span>
                </div>

                <div className="space-y-3">
                  {selectedHistory.map((historyItem) => {
                    const statusKey = getDisplayStatus(historyItem);
                    const status = STATUS_MAP[statusKey] || STATUS_MAP.PROCESSING;
                    const notes = getReviewNotes(historyItem);
                    const reviewedAt = getReviewDate(historyItem);
                    const isCurrent = historyItem.id === selected.id;

                    return (
                      <article
                        key={historyItem.id}
                        className={`rounded-2xl border p-4 transition-all ${
                          isCurrent
                            ? 'border-indigo-200 bg-indigo-50/50 shadow-[0_16px_32px_-24px_rgba(79,70,229,0.35)]'
                            : 'border-slate-200 bg-white shadow-[0_12px_28px_-24px_rgba(15,23,42,0.28)]'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${status.className}`}>
                                {status.icon} {status.label}
                              </span>
                              {isCurrent && <span className="text-[0.65rem] font-black uppercase tracking-wider text-indigo-600">Actual</span>}
                            </div>
                            <div className="mt-3 grid gap-1 text-xs font-semibold text-slate-500">
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                                Creado: {formatDate(historyItem.createdAt)}
                              </span>
                              <span>Enviado: {formatDate(getSubmittedDate(historyItem))}</span>
                              {reviewedAt && <span>Revisado: {formatDate(reviewedAt)}</span>}
                              {historyItem.expiresAt && statusKey === 'CANCELED' && <span>Expiró: {formatDate(historyItem.expiresAt)}</span>}
                            </div>
                          </div>

                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => setSelectedId(historyItem.id)}
                              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                              Ver detalle
                            </button>
                          )}
                        </div>

                        {notes && (
                          <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
                            <p className="text-[0.65rem] font-black uppercase tracking-wider text-rose-400 mb-1">Motivo de rechazo</p>
                            <p className="text-sm font-semibold text-rose-700">{notes}</p>
                          </div>
                        )}

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                          {getReviewDocTypes(historyItem).map((type) => {
                            const doc = historyItem.documents.find((item) => item.documentType === type);
                            return (
                              <div key={type} className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-100">
                                  <span className="text-[0.62rem] font-black uppercase tracking-wider text-slate-500">{DOC_LABELS[type]}</span>
                                  {doc?.url && (
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700" aria-label={`Abrir ${DOC_LABELS[type]}`}>
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                                {doc?.url ? (
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="block bg-white">
                                    <img src={doc.url} alt={DOC_LABELS[type]} className="h-24 w-full object-cover bg-white" />
                                  </a>
                                ) : (
                                  <div className="h-24 flex items-center justify-center text-[0.7rem] font-bold text-slate-300">No enviado</div>
                                )}
                                <div className="px-3 py-2 text-[0.65rem] font-semibold text-slate-400">
                                  {doc ? formatDate(doc.uploadedAt) : 'Sin archivo'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : (
            <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center text-slate-400">
              <Fingerprint className="w-12 h-12 mb-3" />
              <p className="font-bold text-slate-500">Selecciona una solicitud</p>
              <p className="text-sm font-medium mt-1">Aquí verás la firma, selfie y el documento por frente y reverso.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

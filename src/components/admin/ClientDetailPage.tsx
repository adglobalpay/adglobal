import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRight, Phone, Mail, MapPin, CheckCircle2, Clock, ExternalLink,
  UserPlus, Wallet, FileText, ShieldCheck, Eye, Copy, Send, Upload,
  AlertTriangle, Trash2, Pencil, Save, LoaderCircle, X, Fingerprint
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

interface KycDocument {
  id: string;
  documentType: string;
  url: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  status: string | null;
  uploadedAt: string;
}

interface KycRequest {
  id: string;
  status: string;
  token: string;
  createdAt: string;
  expiresAt: string | null;
  completedAt: string | null;
  documents: KycDocument[];
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
  ofacPdfUrl: string | null;
  createdAt: string;
  recipients: Recipient[];
  transactions: Transaction[];
  kycRequests: KycRequest[];
  ofacChecks: OfacCheck[];
  referredBy: { id: string; firstName: string; lastName: string | null } | null;
  referrals: { id: string; firstName: string; lastName: string | null }[];
  _count?: { transactions: number; recipients: number; referrals: number };
}

interface EditClientForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  preferredMethod: string[];
  notes: string;
  status: string;
}

function parsePreferredMethod(method: string | null): string[] {
  if (!method) return [];
  return method.split(',').map(m => m.trim()).filter(Boolean);
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

const COUNTRY_OPTIONS = [
  { value: 'us', label: 'Estados Unidos' },
  { value: 've', label: 'Venezuela' },
  { value: 'co', label: 'Colombia' },
  { value: 'pa', label: 'Panamá' },
  { value: 'pe', label: 'Perú' },
  { value: 'ec', label: 'Ecuador' },
  { value: 'cl', label: 'Chile' },
  { value: 'ar', label: 'Argentina' },
  { value: 'es', label: 'España' },
  { value: 'mx', label: 'México' }
];

const PAYMENT_METHOD_OPTIONS = [
  'ZELLE',
  'USDT',
  'WIRE',
  'PAYPAL',
  'TRANSFERENCIA',
  'EFECTIVO',
  'PAGO_MOVIL'
];

function createEditForm(client: ClientDetail): EditClientForm {
  return {
    firstName: client.firstName || '',
    lastName: client.lastName || '',
    email: client.email || '',
    phone: client.phone || '',
    country: client.country || 'us',
    preferredMethod: parsePreferredMethod(client.preferredMethod),
    notes: client.notes || '',
    status: client.status || 'ACTIVE'
  };
}

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
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<EditClientForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: 'us',
    preferredMethod: [],
    notes: '',
    status: 'ACTIVE'
  });
  const [isOfacModalOpen, setIsOfacModalOpen] = useState(false);
  const [isUploadingOfac, setIsUploadingOfac] = useState(false);

  // Modal subir documentos KYC
  const [isKycUploadOpen, setIsKycUploadOpen] = useState(false);
  const [kycUploadType, setKycUploadType] = useState('id_front');
  const [kycUploadFile, setKycUploadFile] = useState<File | null>(null);
  const [isUploadingKycDoc, setIsUploadingKycDoc] = useState(false);

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

  useEffect(() => {
    if (!isEditOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingEdit) {
        setIsEditOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditOpen, isSavingEdit]);

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

  const handleUploadKycDoc = async () => {
    if (!client || !latestKyc || !kycUploadFile) return;
    setIsUploadingKycDoc(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('adglobal_token') : null;
      const API_URL = import.meta.env.VITE_API_URL || 'https://backend-global-production.up.railway.app';
      const formData = new FormData();
      formData.append('file', kycUploadFile);
      formData.append('documentType', kycUploadType);
      const res = await fetch(`${API_URL}/api/kyc/${latestKyc.id}/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error al subir' }));
        throw new Error(err.error || 'Error al subir documento');
      }
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: 'Documento subido', description: 'El documento KYC fue guardado correctamente.' }
      }));
      setIsKycUploadOpen(false);
      setKycUploadFile(null);
      loadClient();
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'Error', description: err.message }
      }));
    } finally {
      setIsUploadingKycDoc(false);
    }
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

  const handleUploadOfacPdf = async (file: File) => {
    if (!client) return;
    setIsUploadingOfac(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = typeof window !== 'undefined' ? localStorage.getItem('adglobal_token') : null;
      const API_URL = import.meta.env.VITE_API_URL || 'https://backend-global-production.up.railway.app';
      const res = await fetch(`${API_URL}/api/clients/${client.id}/ofac-pdf`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Error al subir PDF');
      }
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: 'PDF subido', description: 'Documento OFAC guardado correctamente.' }
      }));
      loadClient();
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'Error al subir PDF', description: err.message }
      }));
    } finally {
      setIsUploadingOfac(false);
    }
  };

  const handleDeleteOfacPdf = async () => {
    if (!client) return;
    if (!confirm('¿Eliminar el PDF de OFAC?')) return;
    try {
      await apiFetch(`/api/clients/${client.id}/ofac-pdf`, { method: 'DELETE' });
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: 'PDF eliminado', description: 'Documento OFAC eliminado correctamente.' }
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

  const openEditModal = () => {
    if (!client) return;
    setEditForm(createEditForm(client));
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    if (isSavingEdit) return;
    setIsEditOpen(false);
  };

  const handleEditFieldChange = (
    field: keyof EditClientForm,
    value: string
  ) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
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
  const transaccionesValidas = client.transactions.filter(t => !['FAILED','REJECTED','CANCELLED'].includes(t.estado));
  const totalUsd = transaccionesValidas.reduce((sum, t) => sum + Number(t.ingresoUSD || 0), 0);
  const totalTx = transaccionesValidas.length;
  const levelInfo = getLevelInfo(totalTx);
  const kycCfg = KYC_MAP[client.kycStatus] || KYC_MAP.PENDING;
  const ofacCfg = OFAC_MAP[client.ofacStatus] || OFAC_MAP.PENDING;
  const statusCfg = ESTADO_MAP[client.status] || ESTADO_MAP.ACTIVE;
  const latestKyc = client.kycRequests[0];
  const latestOfac = client.ofacChecks[0];
  const countryOptions = COUNTRY_OPTIONS.some(option => option.value === client.country)
    ? COUNTRY_OPTIONS
    : [{ value: client.country, label: client.country.toUpperCase() }, ...COUNTRY_OPTIONS];
  const clientMethods = parsePreferredMethod(client.preferredMethod);
  const extraMethods = clientMethods.filter(m => !PAYMENT_METHOD_OPTIONS.includes(m));
  const paymentMethodOptions = extraMethods.length > 0
    ? [...extraMethods, ...PAYMENT_METHOD_OPTIONS]
    : PAYMENT_METHOD_OPTIONS;

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client) return;

    if (!editForm.firstName.trim()) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'warning', message: 'Nombre requerido', description: 'El nombre del cliente no puede quedar vacío.' }
      }));
      return;
    }

    setIsSavingEdit(true);
    try {
      await apiFetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          phone: editForm.phone,
          country: editForm.country,
          preferredMethod: editForm.preferredMethod,
          notes: editForm.notes,
          status: editForm.status
        })
      });

      setIsEditOpen(false);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: 'Cliente actualizado', description: 'La ficha fue editada y sincronizada correctamente.' }
      }));
      await loadClient();
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'Error', description: err.message }
      }));
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <>
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
                  {clientMethods.map((method) => (
                    <span key={method} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[0.65rem] font-black uppercase tracking-wider border border-indigo-100">
                      {method}
                    </span>
                  ))}
                </div>
                {client.notes && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl text-sm text-slate-600 font-medium border border-slate-100">
                    📝 {client.notes}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                onClick={openEditModal}
                className="btn-interactive inline-flex items-center gap-2 px-4 py-2.5 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_48%,#eff6ff_100%)] text-slate-800 rounded-xl font-bold text-sm border border-slate-200 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] hover:border-indigo-200"
                title="Editar cliente"
              >
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900 text-white shadow-sm">
                  <Pencil className="w-3.5 h-3.5" />
                </span>
                Editar
              </button>
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
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleSendKyc} className="btn-interactive px-3 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" /> Enviar link
              </button>
              {latestKyc && (
                <>
                  <a
                    href={`/admin/kyc?kycId=${latestKyc.id}`}
                    className="px-3 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg font-bold text-xs hover:bg-indigo-50 transition-all flex items-center gap-1.5"
                  >
                    <Fingerprint className="w-3.5 h-3.5" /> Ver KYC
                  </a>
                  <button
                    onClick={() => setIsKycUploadOpen(true)}
                    className="px-3 py-2 bg-white text-emerald-600 border border-emerald-200 rounded-lg font-bold text-xs hover:bg-emerald-50 transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> Subir doc
                  </button>
                </>
              )}
              <button
                onClick={async () => {
                  try {
                    const token = typeof window !== 'undefined' ? localStorage.getItem('adglobal_token') : null;
                    const API_URL = import.meta.env.VITE_API_URL || 'https://backend-global-production.up.railway.app';
                    const res = await fetch(`${API_URL}/api/clients/${client.id}/kyc.pdf`, {
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
                    a.download = `kyc-${client.id.substring(0, 8).toUpperCase()}.pdf`;
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
                }}
                className="px-3 py-2 bg-white text-emerald-600 border border-emerald-200 rounded-lg font-bold text-xs hover:bg-emerald-50 transition-all flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" /> Descargar PDF
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

          {/* Documentos KYC subidos */}
          {latestKyc && latestKyc.documents.length > 0 && (
            <div className="space-y-2">
              <p className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400">Documentos cargados</p>
              <div className="grid grid-cols-1 gap-2">
                {latestKyc.documents.map(doc => {
                  const labels: Record<string, string> = {
                    id_front: 'Cédula / Pasaporte (frente)',
                    id_back: 'Cédula / Pasaporte (reverso)',
                    selfie: 'Foto de rostro',
                    signature: 'Firma digital',
                    proof_address: 'Comprobante de domicilio',
                    company_cert: 'Certificado de empresa',
                    representante_id: 'ID del representante'
                  };
                  return (
                    <a
                      key={doc.id}
                      href={doc.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-all">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-700 truncate">{labels[doc.documentType] || doc.documentType}</p>
                          <p className="text-[0.65rem] text-slate-400 font-medium">{doc.status || 'Cargado'}</p>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-indigo-600 transition-all" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
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
              <a
                href="https://sanctionssearch.ofac.treas.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> OFAC
              </a>
              <button
                onClick={() => setIsOfacModalOpen(true)}
                className="px-3 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg font-bold text-xs hover:bg-indigo-50 transition-all flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Subir OFAC
              </button>
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

      {isEditOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto px-3 py-4 sm:px-4 sm:py-6 md:items-center"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Cerrar modal"
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-lg"
            onClick={closeEditModal}
          />

          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_80px_-20px_rgba(2,6,23,0.35)] transition-all duration-200">
            {/* Header oscuro con acento ámbar */}
            <div className="relative bg-slate-900 px-5 py-6 sm:px-8 sm:py-7">
              <div className="absolute inset-0 opacity-40">
                <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-amber-500/20 blur-3xl" />
                <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />
              </div>
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-xl font-black text-amber-400 shadow-inner ring-1 ring-white/10">
                    {fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-amber-400/80">Editar cliente</p>
                    <h2 className="mt-0.5 text-lg sm:text-2xl font-bold tracking-tight text-white">{fullName}</h2>
                    <p className="mt-1 max-w-lg text-xs sm:text-sm font-medium text-slate-400 leading-relaxed">
                      Modifica los datos de contacto, ubicación y preferencias. Los cambios se aplican inmediatamente.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="inline-flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-400 transition-all hover:bg-slate-700 hover:text-white ring-1 ring-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="relative">
              <div className="grid gap-0 md:grid-cols-[1fr_280px]">
                {/* Formulario principal */}
                <div className="space-y-5 p-5 sm:p-8">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block group">
                      <span className="mb-1.5 block text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-500">Nombre</span>
                      <input
                        value={editForm.firstName}
                        onChange={(e) => handleEditFieldChange('firstName', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:bg-white hover:border-slate-300 focus:border-amber-400 focus:bg-white focus:ring-[3px] focus:ring-amber-500/10"
                        placeholder="Ej. Alexander"
                        required
                      />
                    </label>
                    <label className="block group">
                      <span className="mb-1.5 block text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-500">Apellido</span>
                      <input
                        value={editForm.lastName}
                        onChange={(e) => handleEditFieldChange('lastName', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:bg-white hover:border-slate-300 focus:border-amber-400 focus:bg-white focus:ring-[3px] focus:ring-amber-500/10"
                        placeholder="Ej. Jimenez"
                      />
                    </label>
                    <label className="block group">
                      <span className="mb-1.5 block text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-500">Email</span>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => handleEditFieldChange('email', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:bg-white hover:border-slate-300 focus:border-amber-400 focus:bg-white focus:ring-[3px] focus:ring-amber-500/10"
                        placeholder="cliente@email.com"
                      />
                    </label>
                    <label className="block group">
                      <span className="mb-1.5 block text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-500">Teléfono</span>
                      <input
                        value={editForm.phone}
                        onChange={(e) => handleEditFieldChange('phone', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:bg-white hover:border-slate-300 focus:border-amber-400 focus:bg-white focus:ring-[3px] focus:ring-amber-500/10"
                        placeholder="+1 305 000 0000"
                      />
                    </label>
                    <label className="block group">
                      <span className="mb-1.5 block text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-500">País</span>
                      <select
                        value={editForm.country}
                        onChange={(e) => handleEditFieldChange('country', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all hover:bg-white hover:border-slate-300 focus:border-amber-400 focus:bg-white focus:ring-[3px] focus:ring-amber-500/10"
                      >
                        {countryOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block group">
                      <span className="mb-1.5 block text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-500">Métodos de pago</span>
                      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3 transition-all hover:bg-white hover:border-slate-300 focus-within:border-amber-400 focus-within:bg-white focus-within:ring-[3px] focus-within:ring-amber-500/10">
                        {paymentMethodOptions.map((option) => {
                          const checked = editForm.preferredMethod.includes(option);
                          return (
                            <label
                              key={option}
                              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all select-none ${
                                checked
                                  ? 'border-amber-400 bg-amber-50 text-amber-700'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={checked}
                                onChange={() => {
                                  setEditForm((prev) => ({
                                    ...prev,
                                    preferredMethod: checked
                                      ? prev.preferredMethod.filter((m) => m !== option)
                                      : [...prev.preferredMethod, option]
                                  }));
                                }}
                              />
                              {checked && <CheckCircle2 className="w-3.5 h-3.5" />}
                              {option}
                            </label>
                          );
                        })}
                      </div>
                    </label>
                    <label className="block sm:col-span-2 group">
                      <span className="mb-1.5 block text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-500">Notas internas</span>
                      <textarea
                        rows={3}
                        value={editForm.notes}
                        onChange={(e) => handleEditFieldChange('notes', e.target.value)}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:bg-white hover:border-slate-300 focus:border-amber-400 focus:bg-white focus:ring-[3px] focus:ring-amber-500/10"
                        placeholder="Información útil para el equipo operativo..."
                      />
                    </label>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="border-t md:border-t-0 md:border-l border-slate-100 bg-slate-50/40 p-5 sm:p-6">
                  <div className="space-y-5">
                    {/* Tarjeta de resumen */}
                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                      <div className="bg-slate-900 px-4 py-3">
                        <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-amber-400/80">Vista previa</p>
                        <p className="mt-1 text-base font-bold text-white truncate">
                          {[editForm.firstName.trim(), editForm.lastName.trim()].filter(Boolean).join(' ') || 'Sin nombre'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wider text-white/70">
                            {(editForm.country || 'us').toUpperCase()}
                          </span>
                          {editForm.preferredMethod.map((method) => (
                            <span key={method} className="inline-flex items-center rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wider text-amber-300">
                              {method}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <label className="block">
                          <span className="mb-1.5 block text-[0.6rem] font-black uppercase tracking-[0.18em] text-slate-500">Estado del cliente</span>
                          <select
                            value={editForm.status}
                            onChange={(e) => handleEditFieldChange('status', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none transition-all focus:border-amber-400 focus:ring-[3px] focus:ring-amber-500/10"
                          >
                            {Object.entries(ESTADO_MAP).map(([key, cfg]) => (
                              <option key={key} value={key}>{cfg.label}</option>
                            ))}
                          </select>
                        </label>

                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3">
                          <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-slate-400">Validaciones</p>
                          <ul className="mt-2 space-y-1.5">
                            <li className="flex items-center gap-2 text-xs font-medium text-slate-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                              Nombre obligatorio
                            </li>
                            <li className="flex items-center gap-2 text-xs font-medium text-slate-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                              Se sincroniza al guardar
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Botones */}
                    <div className="flex flex-col gap-2.5">
                      <button
                        type="submit"
                        disabled={isSavingEdit}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSavingEdit ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Guardar cambios
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={closeEditModal}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal subir documento KYC */}
      {isKycUploadOpen && client && latestKyc && (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto px-3 py-4 sm:px-4 sm:py-6 md:items-center"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Cerrar modal"
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-lg"
            onClick={() => { setIsKycUploadOpen(false); setKycUploadFile(null); }}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_80px_-20px_rgba(2,6,23,0.35)] transition-all duration-200">
            <div className="relative bg-slate-900 px-5 py-6 sm:px-8 sm:py-7">
              <div className="absolute inset-0 opacity-40">
                <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
              </div>
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-indigo-400/80">Documento KYC</p>
                  <h2 className="mt-0.5 text-lg sm:text-xl font-bold tracking-tight text-white">Subir identificación</h2>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsKycUploadOpen(false); setKycUploadFile(null); }}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-400 transition-all hover:bg-slate-700 hover:text-white ring-1 ring-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-5 sm:p-8 space-y-5">
              <div>
                <label className="mb-1.5 block text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-500">Tipo de documento</label>
                <select
                  value={kycUploadType}
                  onChange={e => setKycUploadType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all hover:bg-white hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-[3px] focus:ring-indigo-500/10"
                >
                  <option value="id_front">Cédula / Pasaporte (frente)</option>
                  <option value="id_back">Cédula / Pasaporte (reverso)</option>
                  <option value="selfie">Foto de rostro (selfie)</option>
                  <option value="proof_address">Comprobante de domicilio</option>
                  <option value="company_cert">Certificado de empresa</option>
                  <option value="representante_id">ID del representante</option>
                </select>
              </div>

              {kycUploadFile ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-500 mb-2">Archivo seleccionado</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 truncate">{kycUploadFile.name}</p>
                      <p className="text-xs text-slate-400 font-medium">{(kycUploadFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      onClick={() => setKycUploadFile(null)}
                      className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center transition-all hover:border-indigo-300 hover:bg-indigo-50/30"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) setKycUploadFile(file);
                  }}
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Arrastra una imagen aquí</p>
                  <p className="text-xs text-slate-400 font-medium mt-1">o</p>
                  <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-[0.98]">
                    Seleccionar archivo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setKycUploadFile(file);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>
              )}

              {isUploadingKycDoc && (
                <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-500">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Subiendo...
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setIsKycUploadOpen(false); setKycUploadFile(null); }}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUploadKycDoc}
                  disabled={!kycUploadFile || isUploadingKycDoc}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  Subir documento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isOfacModalOpen && client && (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto px-3 py-4 sm:px-4 sm:py-6 md:items-center"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Cerrar modal"
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-lg"
            onClick={() => setIsOfacModalOpen(false)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_80px_-20px_rgba(2,6,23,0.35)] transition-all duration-200">
            <div className="relative bg-slate-900 px-5 py-6 sm:px-8 sm:py-7">
              <div className="absolute inset-0 opacity-40">
                <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
                <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />
              </div>
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-emerald-400/80">Documento OFAC</p>
                  <h2 className="mt-0.5 text-lg sm:text-xl font-bold tracking-tight text-white">PDF de verificación</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOfacModalOpen(false)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-400 transition-all hover:bg-slate-700 hover:text-white ring-1 ring-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-5 sm:p-8 space-y-5">
              {client.ofacPdfUrl ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-500 mb-2">Archivo actual</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">ofac.pdf</p>
                        <a
                          href={client.ofacPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 font-bold hover:underline"
                        >
                          Ver en S3
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-[0.98]">
                      <Upload className="h-4 w-4" />
                      Reemplazar
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadOfacPdf(file);
                          e.currentTarget.value = '';
                        }}
                      />
                    </label>
                    <button
                      onClick={handleDeleteOfacPdf}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600 transition-all hover:bg-rose-100 hover:text-rose-700 active:scale-[0.98]"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center transition-all hover:border-emerald-300 hover:bg-emerald-50/30"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file && file.type === 'application/pdf') {
                        handleUploadOfacPdf(file);
                      } else {
                        window.dispatchEvent(new CustomEvent('show-toast', {
                          detail: { type: 'warning', message: 'Formato no válido', description: 'Solo se permiten archivos PDF.' }
                        }));
                      }
                    }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Arrastra un PDF aquí</p>
                    <p className="text-xs text-slate-400 font-medium mt-1">o</p>
                    <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-[0.98]">
                      Seleccionar archivo
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadOfacPdf(file);
                          e.currentTarget.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              )}
              {isUploadingOfac && (
                <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-500">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Subiendo...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

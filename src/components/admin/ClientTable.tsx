import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Trophy, Medal, Crown, Award, Gem, Star, ThumbsUp, Megaphone,
  Repeat, Coins, UserPlus, ShieldCheck, Clock, AlertCircle, FileText,
  Users, ChevronRight, Plus, ChevronLeft, ChevronFirst, ChevronLast,
  Search
} from 'lucide-react';
import { apiFetch } from '../../lib/auth';

interface ApiClient {
  id: string;
  country: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  documentId?: string | null;
  preferredMethod: string | null;
  notes: string | null;
  kycStatus: string;
  ofacStatus: string;
  referredById: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    transactions: number;
    recipients: number;
    referrals: number;
  };
  matchedRecipient?: {
    id: string;
    name: string;
    bank: string;
    accountNumber: string;
    phone: string | null;
    identification: string | null;
  } | null;
  matchedRecipientsCount?: number;
  searchMatchScope?: 'client' | 'recipient' | 'both';
  transactions?: Array<{ amount: number; date: string }>;
}

interface RecipientDirectoryItem {
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
  createdAt: string;
  updatedAt: string;
  _count?: {
    transactions: number;
  };
  client: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    documentId: string | null;
    country: string;
  };
}

type SearchScope = 'all' | 'client' | 'recipient';

const LEVEL_THRESHOLDS = {
  BRONCE: {
    minTransactions: 1, maxTransactions: 5, minAmount: 1, maxAmount: 1000,
    name: 'Bronce',
    icon: <Medal className="w-3.5 h-3.5 mr-1 text-amber-600" />,
    color: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  PLATA: {
    minTransactions: 6, maxTransactions: 15, minAmount: 1001, maxAmount: 3000,
    name: 'Plata',
    icon: <Medal className="w-3.5 h-3.5 mr-1 text-slate-500" />,
    color: 'bg-slate-100 text-slate-700 border-slate-300'
  },
  ORO: {
    minTransactions: 16, maxTransactions: 30, minAmount: 3001, maxAmount: 8000,
    name: 'Oro',
    icon: <Trophy className="w-3.5 h-3.5 mr-1 text-yellow-500" />,
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200'
  },
  PLATINO: {
    minTransactions: 31, maxTransactions: 50, minAmount: 8001, maxAmount: 15000,
    name: 'Platino',
    icon: <Award className="w-3.5 h-3.5 mr-1 text-indigo-500" />,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  DIAMANTE: {
    minTransactions: 51, maxTransactions: Infinity, minAmount: 15001, maxAmount: Infinity,
    name: 'Diamante',
    icon: <Gem className="w-3.5 h-3.5 mr-1 text-cyan-500" />,
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200'
  }
};

const getSpecialBadges = (client: ApiClient) => {
  const badges = [];
  const referredCount = client._count?.referrals || 0;
  const totalTransactions = client._count?.transactions || 0;
  const totalAmount = client.transactions?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;

  if (referredCount > 0) {
    if (referredCount >= 10) badges.push({ icon: <Crown className="w-3.5 h-3.5 mr-1" />, name: 'Embajador', color: 'bg-purple-50 text-purple-700 border-purple-200', tooltip: `Ha referido a ${referredCount} clientes` });
    else if (referredCount >= 5) badges.push({ icon: <Star className="w-3.5 h-3.5 mr-1" />, name: 'Influencer', color: 'bg-orange-50 text-orange-700 border-orange-200', tooltip: `Ha referido a ${referredCount} clientes` });
    else if (referredCount >= 1) badges.push({ icon: <ThumbsUp className="w-3.5 h-3.5 mr-1" />, name: 'Referidor', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', tooltip: `Ha referido a ${referredCount} clientes` });
  }
  if (client.referredById) badges.push({ icon: <Megaphone className="w-3.5 h-3.5 mr-1" />, name: 'Referido', color: 'bg-blue-50 text-blue-700 border-blue-200', tooltip: 'Recomendado por otro' });
  if (totalTransactions >= 20) badges.push({ icon: <Repeat className="w-3.5 h-3.5 mr-1" />, name: 'Frecuente', color: 'bg-teal-50 text-teal-700 border-teal-200', tooltip: `${totalTransactions} transacciones` });
  if (totalAmount >= 10000) badges.push({ icon: <Coins className="w-3.5 h-3.5 mr-1" />, name: 'VIP', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', tooltip: `$${totalAmount.toLocaleString()} enviados` });
  return badges;
};

const getClientLevel = (transactions: Array<{amount: number}> | undefined) => {
  const totalTransactions = transactions?.length || 0;
  const totalAmount = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
  if (totalAmount >= LEVEL_THRESHOLDS.DIAMANTE.minAmount || totalTransactions >= LEVEL_THRESHOLDS.DIAMANTE.minTransactions) return { ...LEVEL_THRESHOLDS.DIAMANTE, description: `${totalTransactions} txn · $${totalAmount.toLocaleString()}` };
  if (totalAmount >= LEVEL_THRESHOLDS.PLATINO.minAmount || totalTransactions >= LEVEL_THRESHOLDS.PLATINO.minTransactions) return { ...LEVEL_THRESHOLDS.PLATINO, description: `${totalTransactions} txn · $${totalAmount.toLocaleString()}` };
  if (totalAmount >= LEVEL_THRESHOLDS.ORO.minAmount || totalTransactions >= LEVEL_THRESHOLDS.ORO.minTransactions) return { ...LEVEL_THRESHOLDS.ORO, description: `${totalTransactions} txn · $${totalAmount.toLocaleString()}` };
  if (totalAmount >= LEVEL_THRESHOLDS.PLATA.minAmount || totalTransactions >= LEVEL_THRESHOLDS.PLATA.minTransactions) return { ...LEVEL_THRESHOLDS.PLATA, description: `${totalTransactions} txn · $${totalAmount.toLocaleString()}` };
  if (totalTransactions > 0) return { ...LEVEL_THRESHOLDS.BRONCE, description: `${totalTransactions} txn · $${totalAmount.toLocaleString()}` };
  return { name: 'Nuevo', icon: <UserPlus className="w-3.5 h-3.5 text-blue-500 mr-1" />, color: 'bg-blue-50 text-blue-700 border-blue-200', description: 'Sin envíos todavía' };
};

const getLastTransaction = (transactions: Array<{date: string, amount: number}> | undefined) => {
  if (!transactions || transactions.length === 0) return null;
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return sorted[0];
};

interface Props {
  limit?: number;
}

export default function ClientTable({ limit }: Props) {
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [filteredClients, setFilteredClients] = useState<ApiClient[]>([]);
  const [recipientRows, setRecipientRows] = useState<RecipientDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const itemsPerPage = 10;
  const searchRequestId = useRef(0);

  const applyPresetFilter = useCallback((source: ApiClient[]) => {
    if (typeof window === 'undefined') return source;
    const params = new URLSearchParams(window.location.search);
    const filtro = params.get('filtro');

    if (filtro === 'kyc') {
      return source.filter(c => c.kycStatus === 'PENDING' || c.kycStatus === 'PROCESSING');
    }
    if (filtro === 'ofac') {
      return source.filter(c => c.ofacStatus === 'REVIEW');
    }
    return source;
  }, []);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
        const data = await apiFetch('/api/clients');
        const all = limit ? data.slice(0, limit) : data;
        setClients(all);
        setFilteredClients(applyPresetFilter(all));
        setCurrentPage(1);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
  }, [applyPresetFilter, limit]);

  const loadRecipients = useCallback(async (query = '') => {
    const params = new URLSearchParams({
      limit: '100'
    });
    if (query.trim()) {
      params.set('search', query.trim());
    }

    const data = await apiFetch(`/api/recipients?${params.toString()}`);
    return Array.isArray(data?.items) ? data.items as RecipientDirectoryItem[] : [];
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Escuchar evento de refresh desde el formulario de creación
  useEffect(() => {
    const handler = () => {
      if (searchScope === 'recipient') {
        setSearchLoading(true);
        setError('');
        void loadRecipients(searchQuery)
          .then((items) => setRecipientRows(items))
          .catch((err: any) => {
            setError(err.message || 'No se pudieron cargar los destinatarios');
            setRecipientRows([]);
          })
          .finally(() => setSearchLoading(false));
        return;
      }

      loadClients();
    };
    window.addEventListener('clients:refresh', handler);
    return () => window.removeEventListener('clients:refresh', handler);
  }, [loadClients, loadRecipients, searchQuery, searchScope]);

  // Escuchar evento de búsqueda desde SearchBar
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const query = String(detail?.query || '').trim();
      const scope: SearchScope = detail?.scope === 'client' || detail?.scope === 'recipient' ? detail.scope : 'all';
      setSearchQuery(query);
      setSearchScope(scope);
      setCurrentPage(1);

      if (scope === 'recipient') {
        const requestId = ++searchRequestId.current;
        setSearchLoading(true);
        setError('');
        setFilteredClients([]);

        void loadRecipients(query)
          .then((items) => {
            if (searchRequestId.current !== requestId) return;
            setRecipientRows(items);
          })
          .catch((err: any) => {
            if (searchRequestId.current !== requestId) return;
            setError(err.message || 'No se pudo completar la búsqueda de destinatarios');
            setRecipientRows([]);
          })
          .finally(() => {
            if (searchRequestId.current === requestId) {
              setSearchLoading(false);
            }
          });
        return;
      }

      if (!query) {
        searchRequestId.current += 1;
        setSearchLoading(false);
        setError('');
        setRecipientRows([]);
        setFilteredClients(applyPresetFilter(clients));
        return;
      }

      const requestId = ++searchRequestId.current;
      setSearchLoading(true);
      setError('');

      void (async () => {
        try {
          const params = new URLSearchParams({
            q: query,
            scope,
            limit: '100'
          });
          const data = await apiFetch(`/api/clients/search?${params.toString()}`);
          if (searchRequestId.current !== requestId) return;
          setRecipientRows([]);
          setFilteredClients(Array.isArray(data) ? data : []);
        } catch (err: any) {
          if (searchRequestId.current !== requestId) return;
          setError(err.message || 'No se pudo completar la búsqueda');
          setRecipientRows([]);
          setFilteredClients([]);
        } finally {
          if (searchRequestId.current === requestId) {
            setSearchLoading(false);
          }
        }
      })();
    };
    window.addEventListener('clients:search', handler);
    return () => window.removeEventListener('clients:search', handler);
  }, [applyPresetFilter, clients, loadRecipients]);

  // Escuchar evento de exportar CSV
  useEffect(() => {
    const handler = () => {
      if (searchScope === 'recipient') {
        if (recipientRows.length === 0) {
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { type: 'warning', message: 'Sin datos para exportar', description: 'No hay destinatarios para exportar.' }
          }));
          return;
        }

        const headers = ['ID Destinatario', 'Destinatario', 'Cliente vinculado', 'Telefono destinatario', 'Banco', 'Cuenta', 'Tipo', 'Identificacion', 'Relacion', 'Transacciones'];
        const rows = recipientRows.map((recipient) => [
          recipient.id,
          recipient.name,
          `${recipient.client.firstName} ${recipient.client.lastName || ''}`.trim(),
          recipient.phone || '',
          recipient.bank,
          recipient.accountNumber,
          recipient.accountType,
          recipient.identification || '',
          recipient.relationship,
          recipient._count?.transactions || 0
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `destinatarios_adglobal_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { type: 'success', message: 'CSV exportado', description: `${recipientRows.length} destinatarios exportados.` }
        }));
        return;
      }

      const dataToExport = searchQuery ? filteredClients : clients;
      if (dataToExport.length === 0) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { type: 'warning', message: 'Sin datos para exportar', description: 'No hay clientes para exportar.' }
        }));
        return;
      }

      const headers = ['ID', 'Nombre', 'Apellido', 'Teléfono', 'Email', 'País', 'Método', 'KYC', 'OFAC', 'Transacciones', 'Destinatarios', 'Notas'];
      const rows = dataToExport.map(c => [
        c.id,
        c.firstName,
        c.lastName || '',
        c.phone || '',
        c.email || '',
        c.country,
        c.preferredMethod || '',
        c.kycStatus,
        c.ofacStatus,
        c._count?.transactions || 0,
        c._count?.recipients || 0,
        (c.notes || '').replace(/\n/g, ' ')
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clientes_adglobal_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: 'CSV exportado', description: `${dataToExport.length} clientes exportados.` }
      }));
    };
    window.addEventListener('clients:export', handler);
    return () => window.removeEventListener('clients:export', handler);
  }, [clients, filteredClients, recipientRows, searchQuery, searchScope]);

  const totalItems = searchScope === 'recipient' ? recipientRows.length : filteredClients.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecipients = recipientRows.slice(startIndex, startIndex + itemsPerPage);
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);
  const searchScopeLabel = searchScope === 'client' ? 'clientes' : searchScope === 'recipient' ? 'destinatarios' : 'clientes o destinatarios';

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="overflow-x-auto rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] bg-white p-8">
        <div className="space-y-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-16 shimmer rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-red-700 text-sm font-medium">
        Error al cargar clientes: {error}
      </div>
    );
  }

  const getStatusBadge = (status: string, typeLabel?: string) => {
    switch(status) {
      case 'VERIFIED': case 'OK':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.65rem] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200"><ShieldCheck className="w-3 h-3 mr-1" />Verificado</span>;
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[0.65rem] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            {typeLabel === 'KYC' ? 'Por revisar' : 'Pendiente'}
            {typeLabel && <span className="text-[0.6rem] font-black text-amber-600/80 bg-amber-100 px-1 py-0.5 rounded">{typeLabel}</span>}
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[0.65rem] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" />
            {typeLabel === 'KYC' ? 'Por revisar' : 'Procesando'}
            {typeLabel && <span className="text-[0.6rem] font-black text-amber-600/80 bg-amber-100 px-1 py-0.5 rounded">{typeLabel}</span>}
          </span>
        );
      case 'REVIEW':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.65rem] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200"><AlertCircle className="w-3 h-3 mr-1" />Revisar</span>;
      case 'COMPLETED': case 'DONE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.65rem] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200"><FileText className="w-3 h-3 mr-1" />Completado</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.65rem] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  if (!loading && !error && totalItems === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">No se encontraron resultados</h3>
          <p className="text-sm text-slate-400 font-medium">
            {searchScope === 'recipient'
              ? (searchQuery
                  ? `No hubo coincidencias en destinatarios para "${searchQuery}"`
                  : 'No hay destinatarios registrados')
              : (searchQuery
                  ? `No hubo coincidencias en ${searchScopeLabel} para "${searchQuery}"`
                  : 'No hay clientes registrados')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {searchQuery && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white rounded-2xl border border-slate-200/60 px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div className="text-sm text-slate-500 font-medium">
            Buscando en <span className="font-bold text-slate-700 capitalize">{searchScopeLabel}</span>:
            <span className="font-bold text-indigo-600"> {searchQuery}</span>
          </div>
          {searchLoading && (
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-500">
              Buscando...
            </div>
          )}
        </div>
      )}

      {searchScope === 'recipient' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-cyan-200/80 bg-cyan-50 px-4 py-3 shadow-[0_2px_12px_rgba(8,145,178,0.08)]">
          <div className="text-sm font-medium text-cyan-800">
            Mostrando destinatarios con su cliente vinculado.
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-600">
            {totalItems} destinatario{totalItems === 1 ? '' : 's'}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] bg-white">
        {searchScope === 'recipient' ? (
          <table className="w-full">
            <thead>
              <tr className="text-left text-slate-400 text-[0.65rem] font-bold uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                <th className="py-4 pl-6 pr-3">Destinatario</th>
                <th className="py-4 px-3">Cliente vinculado</th>
                <th className="py-4 px-3">Banco</th>
                <th className="py-4 px-3">Cuenta</th>
                <th className="py-4 px-3">Detalle</th>
                <th className="py-4 px-3">Historial</th>
                <th className="py-4 px-6 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedRecipients.map((recipient) => {
                const linkedClientName = `${recipient.client.firstName} ${recipient.client.lastName || ''}`.trim();
                return (
                  <tr key={recipient.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 pl-6 pr-3 align-top">
                      <div className="font-bold text-[0.9rem] text-slate-800 tracking-tight">{recipient.name}</div>
                      <div className="text-[0.7rem] text-slate-500 font-semibold">{recipient.phone || 'Sin teléfono asociado'}</div>
                      <div className="text-[0.7rem] text-slate-500 font-mono mt-0.5">{recipient.identification || '—'}</div>
                    </td>
                    <td className="py-4 px-3 align-top">
                      <div className="font-bold text-[0.85rem] text-slate-800">{linkedClientName}</div>
                      <div className="text-[0.7rem] text-slate-500 font-semibold">{recipient.client.email || 'Sin correo asociado'}</div>
                      <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-slate-600">
                        {recipient.client.country}
                      </div>
                    </td>
                    <td className="py-4 px-3 align-top">
                      <div className="font-semibold text-[0.8rem] text-slate-700">{recipient.bank}</div>
                      <div className="text-[0.7rem] text-slate-400 mt-1">{recipient.accountType}</div>
                    </td>
                    <td className="py-4 px-3 align-top">
                      <div className="font-mono font-bold text-[0.8rem] text-slate-700">{recipient.accountNumber}</div>
                    </td>
                    <td className="py-4 px-3 align-top">
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className="inline-flex items-center rounded-md border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-cyan-700">
                          {recipient.relationship}
                        </span>
                        <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-slate-600">
                          {recipient._count?.transactions || 0} tx
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-3 align-top">
                      <span className="text-[0.8rem] font-semibold text-slate-700">{recipient._count?.transactions || 0}</span>
                      <div className="text-[0.7rem] text-slate-400 mt-1">transacciones</div>
                    </td>
                    <td className="py-4 pr-6 pl-3 align-top text-right">
                      <div className="flex flex-col items-end gap-2">
                        <a href={`/admin/clientes/perfil?id=${recipient.client.id}`} className="inline-flex items-center gap-1 text-[0.75rem] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                          Cliente <ChevronRight className="w-3 h-3" />
                        </a>
                        <div className="flex items-center gap-1.5 mt-1">
                          <a href={`/admin/clientes/destinatarios?id=${recipient.client.id}`} className="w-7 h-7 inline-flex items-center justify-center rounded-md bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors border border-slate-200" title="Ver destinatarios del cliente">
                            <Users className="w-3.5 h-3.5" />
                          </a>
                          <a href={`/admin/transacciones?destinatario=${recipient.id}`} className="w-7 h-7 inline-flex items-center justify-center rounded-md bg-cyan-50 text-cyan-600 hover:bg-cyan-100 hover:text-cyan-700 transition-colors border border-cyan-200" title="Historial del destinatario">
                            <FileText className="w-3.5 h-3.5" />
                          </a>
                          <a href={`/admin/transacciones/nueva?clienteId=${recipient.client.id}&destinatarioId=${recipient.id}`} className="w-7 h-7 inline-flex items-center justify-center rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors border border-emerald-200" title="Nueva transacción">
                            <Plus className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-slate-400 text-[0.65rem] font-bold uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                <th className="py-4 pl-6 pr-3">Cliente</th>
                <th className="py-4 px-3">Programa</th>
                <th className="py-4 px-3">Logros</th>
                <th className="py-4 px-3">Detalle</th>
                <th className="py-4 px-3">Estado</th>
                <th className="py-4 px-3">Última Tx</th>
                <th className="py-4 px-6 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedClients.map((client) => {
                const fullName = client.lastName ? `${client.firstName} ${client.lastName}` : client.firstName;
                const level = getClientLevel(client.transactions);
                const badges = getSpecialBadges(client);
                const lastTx = getLastTransaction(client.transactions);
                const showRecipientMatch = client.searchMatchScope === 'recipient' || client.searchMatchScope === 'both';
                const matchedRecipientLabel = client.matchedRecipient
                  ? `${client.matchedRecipient.name} · ${client.matchedRecipient.bank}`
                  : '';
                const extraMatchedRecipients = Math.max((client.matchedRecipientsCount || 0) - 1, 0);

                return (
                  <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 pl-6 pr-3 align-top">
                      <div className="font-bold text-[0.9rem] text-slate-800 tracking-tight">{fullName}</div>
                      <div className="text-[0.7rem] text-slate-500 font-semibold">{client.email || 'Sin correo asociado'}</div>
                      <div className="text-[0.7rem] text-slate-500 font-mono mt-0.5">{client.phone || '—'}</div>
                      {showRecipientMatch && matchedRecipientLabel && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1 text-[0.65rem] font-bold text-cyan-700">
                          <span>Destinatario:</span>
                          <span className="text-cyan-800">{matchedRecipientLabel}</span>
                          {extraMatchedRecipients > 0 && <span className="text-cyan-500">+{extraMatchedRecipients}</span>}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-3 align-top w-48">
                      <div className={`inline-flex items-center px-2 py-1 rounded-md text-[0.7rem] font-bold border ${(level as any).color}`}>
                        {(level as any).icon} {(level as any).name}
                      </div>
                      <div className="text-[0.65rem] text-slate-400 mt-2 font-medium">{(level as any).description}</div>
                    </td>
                    <td className="py-4 px-3 align-top w-48">
                      <div className="flex flex-wrap gap-1.5">
                        {badges.map((badge, index) => (
                          <div key={index} className={`inline-flex items-center px-2 py-0.5 rounded text-[0.65rem] font-bold border ${badge.color}`} title={badge.tooltip}>
                            {badge.icon} {badge.name}
                          </div>
                        ))}
                        {badges.length === 0 && (
                          <span className="text-[0.65rem] text-slate-300 font-medium tracking-wide">ESTÁNDAR</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-3 align-top">
                      <div className="space-y-1">
                        <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[0.65rem] font-black uppercase tracking-wider border border-slate-200">{client.country}</span>
                        <br/>
                        {(client.preferredMethod || '').split(',').filter(Boolean).map(m => m.trim()).slice(0, 3).map((m, i) => (
                          <span key={i} className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[0.65rem] font-black uppercase tracking-wider border border-slate-200">{m}</span>
                        ))}
                        {(client.preferredMethod || '').split(',').filter(Boolean).length > 3 && (
                          <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[0.65rem] font-black uppercase tracking-wider border border-slate-200">+{(client.preferredMethod || '').split(',').filter(Boolean).length - 3}</span>
                        )}
                        {!(client.preferredMethod || '').split(',').filter(Boolean).length && (
                          <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[0.65rem] font-black uppercase tracking-wider border border-slate-200">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-3 align-top">
                      <div className="flex flex-col gap-1.5 items-start">
                        {getStatusBadge(client.kycStatus, 'KYC')}
                        {getStatusBadge(client.ofacStatus, 'OFAC')}
                      </div>
                    </td>
                    <td className="py-4 px-3 align-top">
                      {lastTx ? (
                        <div>
                          <div className="font-semibold text-slate-700 text-[0.8rem]">
                            {new Date(lastTx.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                          </div>
                          <div className="text-[0.8rem] font-mono font-bold text-slate-500 mt-1">${lastTx.amount}</div>
                        </div>
                      ) : (
                        <span className="text-[0.7rem] font-semibold text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-4 pr-6 pl-3 align-top text-right">
                      <div className="flex flex-col items-end gap-2">
                        <a href={`/admin/clientes/perfil?id=${client.id}`} className="inline-flex items-center gap-1 text-[0.75rem] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                          Perfil <ChevronRight className="w-3 h-3" />
                        </a>
                        <div className="flex items-center gap-1.5 mt-1">
                          <a href={`/admin/clientes/destinatarios?id=${client.id}`} className="w-7 h-7 inline-flex items-center justify-center rounded-md bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors border border-slate-200 group relative" title="Ver destinatarios">
                            <Users className="w-3.5 h-3.5" />
                            <span className="absolute -top-1.5 -right-1.5 bg-slate-800 text-white text-[0.55rem] font-bold px-1.5 rounded-full z-10">{client._count.recipients}</span>
                          </a>
                          <a href={`/admin/transacciones/nueva?clienteId=${client.id}`} className="w-7 h-7 inline-flex items-center justify-center rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors border border-emerald-200" title="Nueva transacción">
                            <Plus className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {!limit && totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/60 px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div className="text-sm text-slate-500 font-medium">
            Mostrando <span className="font-bold text-slate-700">{startIndex + 1}</span>–<span className="font-bold text-slate-700">{Math.min(startIndex + itemsPerPage, totalItems)}</span> de <span className="font-bold text-slate-700">{totalItems}</span> {searchScope === 'recipient' ? 'destinatarios' : 'clientes'}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Primera página"
            >
              <ChevronFirst className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                if (totalPages <= 5) return true;
                if (page === 1 || page === totalPages) return true;
                if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                return false;
              })
              .map((page, idx, arr) => (
                <React.Fragment key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && (
                    <span className="text-slate-300 text-sm px-1">…</span>
                  )}
                  <button
                    onClick={() => goToPage(page)}
                    className={`min-w-[2rem] h-8 px-2 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                      page === currentPage
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Última página"
            >
              <ChevronLast className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

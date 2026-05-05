import React, { useEffect, useState } from 'react';
import { 
  Trophy, 
  Medal, 
  Crown, 
  Award, 
  Gem, 
  Star, 
  ThumbsUp, 
  Megaphone,
  Repeat, 
  Coins, 
  UserPlus, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  FileText, 
  Users, 
  ChevronRight,
  Plus
} from 'lucide-react';

const clients = [
  {
    id: '00ef1c93-3d56-4e87-8cc8-e0ea68b88b66',
    country: 'us',
    first_name: 'Luisa',
    last_name: 'Ideas Creativas',
    phone: '4242459151',
    email: '',
    metod: 'BsS',
    referred_by: null,
    referred_count: 2,
    transactions: [
      { amount: 150, date: '2026-03-19' },
      { amount: 200, date: '2026-03-10' },
      { amount: 100, date: '2026-03-01' }
    ],
    notes: 'Cliente frecuente, envía los viernes',
    kyc: 'verified',
    ofac: 'ok',
    destinatarios: 3
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    country: 'us',
    first_name: 'Cartaya',
    last_name: 'Auto Sales',
    phone: '3055551234',
    email: 'cartaya@autos.com',
    metod: 'Zelle',
    referred_by: '00ef1c93-3d56-4e87-8cc8-e0ea68b88b66',
    referred_count: 1,
    transactions: [
      { amount: 500, date: '2026-03-18' },
      { amount: 450, date: '2026-03-15' },
      { amount: 600, date: '2026-03-10' },
      { amount: 550, date: '2026-03-05' },
      { amount: 400, date: '2026-02-28' },
      { amount: 700, date: '2026-02-20' },
      { amount: 300, date: '2026-02-15' },
      { amount: 650, date: '2026-02-10' }
    ],
    notes: 'Empresa, envía a varios familiares',
    kyc: 'verified',
    ofac: 'ok',
    destinatarios: 5
  },
  {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    country: 'us',
    first_name: 'María',
    last_name: 'Josefina',
    phone: '7865556789',
    email: 'maria.j@email.com',
    metod: 'Zelle',
    referred_by: null,
    referred_count: 0,
    transactions: [],
    notes: 'Cliente nuevo',
    kyc: 'pending',
    ofac: 'review',
    destinatarios: 1
  },
  {
    id: '8c9e4f5a-2d3b-4e6f-8a1b-9c2d3e4f5a6b',
    country: 'us',
    first_name: 'Importaciones',
    last_name: 'Miami Corp',
    phone: '3055559999',
    email: 'ventas@importaciones.com',
    metod: 'Wire',
    referred_by: null,
    referred_count: 5,
    transactions: [
      { amount: 5000, date: '2026-03-19' },
      { amount: 4500, date: '2026-03-12' },
      { amount: 6000, date: '2026-03-05' },
      { amount: 5500, date: '2026-02-27' },
      { amount: 4000, date: '2026-02-20' },
      { amount: 7000, date: '2026-02-13' },
      { amount: 3500, date: '2026-02-06' }
    ],
    notes: 'Cliente corporativo, envíos grandes',
    kyc: 'verified',
    ofac: 'ok',
    destinatarios: 2
  }
];

const LEVEL_THRESHOLDS = {
  BRONCE: {
    minTransactions: 1,
    maxTransactions: 5,
    minAmount: 1,
    maxAmount: 1000,
    name: 'Bronce',
    icon: <Medal className="w-3.5 h-3.5 mr-1 text-amber-600" />,
    color: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  PLATA: {
    minTransactions: 6,
    maxTransactions: 15,
    minAmount: 1001,
    maxAmount: 3000,
    name: 'Plata',
    icon: <Medal className="w-3.5 h-3.5 mr-1 text-slate-500" />,
    color: 'bg-slate-100 text-slate-700 border-slate-300'
  },
  ORO: {
    minTransactions: 16,
    maxTransactions: 30,
    minAmount: 3001,
    maxAmount: 8000,
    name: 'Oro',
    icon: <Trophy className="w-3.5 h-3.5 mr-1 text-yellow-500" />,
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200'
  },
  PLATINO: {
    minTransactions: 31,
    maxTransactions: 50,
    minAmount: 8001,
    maxAmount: 15000,
    name: 'Platino',
    icon: <Award className="w-3.5 h-3.5 mr-1 text-indigo-500" />,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  DIAMANTE: {
    minTransactions: 51,
    maxTransactions: Infinity,
    minAmount: 15001,
    maxAmount: Infinity,
    name: 'Diamante',
    icon: <Gem className="w-3.5 h-3.5 mr-1 text-cyan-500" />,
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200'
  }
};

const getSpecialBadges = (client: any) => {
  const badges = [];
  
  if (client.referred_count > 0) {
    if (client.referred_count >= 10) {
      badges.push({
        icon: <Crown className="w-3.5 h-3.5 mr-1" />,
        name: 'Embajador',
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        tooltip: `Ha referido a ${client.referred_count} clientes`
      });
    } else if (client.referred_count >= 5) {
      badges.push({
        icon: <Star className="w-3.5 h-3.5 mr-1" />,
        name: 'Influencer',
        color: 'bg-orange-50 text-orange-700 border-orange-200',
        tooltip: `Ha referido a ${client.referred_count} clientes`
      });
    } else if (client.referred_count >= 1) {
      badges.push({
        icon: <ThumbsUp className="w-3.5 h-3.5 mr-1" />,
        name: 'Referidor',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        tooltip: `Ha referido a ${client.referred_count} clientes`
      });
    }
  }
  
  if (client.referred_by) {
    badges.push({
      icon: <Megaphone className="w-3.5 h-3.5 mr-1" />,
      name: 'Referido',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      tooltip: 'Recomendado por otro'
    });
  }
  
  if (client.transactions.length >= 20) {
    badges.push({
      icon: <Repeat className="w-3.5 h-3.5 mr-1" />,
      name: 'Frecuente',
      color: 'bg-teal-50 text-teal-700 border-teal-200',
      tooltip: `${client.transactions.length} transacciones`
    });
  }
  
  const totalAmount = client.transactions.reduce((sum: number, t: any) => sum + t.amount, 0);
  if (totalAmount >= 10000) {
    badges.push({
      icon: <Coins className="w-3.5 h-3.5 mr-1" />,
      name: 'VIP',
      color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      tooltip: `$${totalAmount.toLocaleString()} enviados`
    });
  }
  
  return badges;
};

const getClientLevel = (transactions: Array<{amount: number}>) => {
  const totalTransactions = transactions.length;
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  
  if (totalAmount >= LEVEL_THRESHOLDS.DIAMANTE.minAmount || totalTransactions >= LEVEL_THRESHOLDS.DIAMANTE.minTransactions) {
    return { ...LEVEL_THRESHOLDS.DIAMANTE, description: `${totalTransactions} txn · $${totalAmount.toLocaleString()}` };
  } else if (totalAmount >= LEVEL_THRESHOLDS.PLATINO.minAmount || totalTransactions >= LEVEL_THRESHOLDS.PLATINO.minTransactions) {
    return { ...LEVEL_THRESHOLDS.PLATINO, description: `${totalTransactions} txn · $${totalAmount.toLocaleString()}` };
  } else if (totalAmount >= LEVEL_THRESHOLDS.ORO.minAmount || totalTransactions >= LEVEL_THRESHOLDS.ORO.minTransactions) {
    return { ...LEVEL_THRESHOLDS.ORO, description: `${totalTransactions} txn · $${totalAmount.toLocaleString()}` };
  } else if (totalAmount >= LEVEL_THRESHOLDS.PLATA.minAmount || totalTransactions >= LEVEL_THRESHOLDS.PLATA.minTransactions) {
    return { ...LEVEL_THRESHOLDS.PLATA, description: `${totalTransactions} txn · $${totalAmount.toLocaleString()}` };
  } else if (totalTransactions > 0) {
    return { ...LEVEL_THRESHOLDS.BRONCE, description: `${totalTransactions} txn · $${totalAmount.toLocaleString()}` };
  } else {
    return {
      name: 'Nuevo',
      icon: <UserPlus className="w-3.5 h-3.5 text-blue-500 mr-1" />,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Sin envíos todavía'
    };
  }
};

const getLastTransaction = (transactions: Array<{date: string, amount: number}>) => {
  if (transactions.length === 0) return null;
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return sorted[0];
};

interface Props {
  limit?: number;
}

export default function ClientTable({ limit }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const displayedClients = limit ? clients.slice(0, limit) : clients;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'verified':
      case 'ok':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.6rem] md:text-[0.65rem] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 transition-all hover:bg-emerald-100">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Verificado
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.6rem] md:text-[0.65rem] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 transition-all hover:bg-amber-100">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </span>
        );
      case 'review':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.6rem] md:text-[0.65rem] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 transition-all hover:bg-red-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            Revisar
          </span>
        );
      case 'done':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.6rem] md:text-[0.65rem] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 transition-all hover:bg-blue-100">
            <FileText className="w-3 h-3 mr-1" />
            PDF
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[0.6rem] md:text-[0.65rem] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto rounded-2xl md:rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] bg-white">
      <table className="w-full min-w-[900px]">
        <thead>
          <tr className="text-left text-slate-400 text-[0.6rem] md:text-[0.65rem] font-bold uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
            <th className="py-3 md:py-4 pl-4 md:pl-6 pr-3">Cliente</th>
            <th className="py-3 md:py-4 px-3">Programa</th>
            <th className="py-3 md:py-4 px-3">Logros</th>
            <th className="py-3 md:py-4 px-3">Detalle</th>
            <th className="py-3 md:py-4 px-3">Estado</th>
            <th className="py-3 md:py-4 px-3">Última Tx</th>
            <th className="py-3 md:py-4 pr-4 md:pr-6 pl-3 text-right">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {displayedClients.map((client, idx) => {
            const fullName = client.last_name ? `${client.first_name} ${client.last_name}` : client.first_name;
            const level = getClientLevel(client.transactions);
            const badges = getSpecialBadges(client);
            const lastTx = getLastTransaction(client.transactions);

            return (
              <tr 
                key={client.id} 
                className="table-row-anim group"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateX(0)' : 'translateX(-8px)',
                  transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 60}ms`
                }}
              >
                <td className="py-3 md:py-4 pl-4 md:pl-6 pr-3 align-top">
                  <div className="font-bold text-sm md:text-[0.9rem] text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">{fullName}</div>
                  <div className="text-[0.65rem] md:text-[0.7rem] text-slate-500 font-semibold">{client.email || 'Sin correo asociado'}</div>
                  <div className="text-[0.65rem] md:text-[0.7rem] text-slate-500 font-mono mt-0.5">{client.phone}</div>
                </td>
                
                <td className="py-3 md:py-4 px-3 align-top w-36 md:w-48">
                  <div className={`inline-flex items-center px-2 py-1 rounded-md text-[0.65rem] md:text-[0.7rem] font-bold border transition-all duration-300 hover:scale-105 ${level.color}`}>
                    {level.icon} {level.name}
                  </div>
                  <div className="text-[0.6rem] md:text-[0.65rem] text-slate-400 mt-2 font-medium">{level.description}</div>
                </td>
                
                <td className="py-3 md:py-4 px-3 align-top w-36 md:w-48">
                  <div className="flex flex-wrap gap-1 md:gap-1.5">
                    {badges.map((badge, index) => (
                      <div
                        key={index}
                        className={`inline-flex items-center px-1.5 md:px-2 py-0.5 rounded text-[0.6rem] md:text-[0.65rem] font-bold border transition-all duration-300 hover:scale-105 cursor-help ${badge.color}`}
                        title={badge.tooltip}
                      >
                        {badge.icon} {badge.name}
                      </div>
                    ))}
                    {badges.length === 0 && (
                      <span className="text-[0.6rem] md:text-[0.65rem] text-slate-300 font-medium tracking-wide">ESTÁNDAR</span>
                    )}
                  </div>
                </td>
                
                <td className="py-3 md:py-4 px-3 align-top">
                  <div className="space-y-1">
                    <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[0.6rem] md:text-[0.65rem] font-black uppercase tracking-wider border border-slate-200 transition-all hover:bg-slate-200">
                      {client.country}
                    </span>
                    <br/>
                    <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[0.6rem] md:text-[0.65rem] font-black uppercase tracking-wider border border-slate-200 transition-all hover:bg-slate-200">
                      {client.metod || 'N/A'}
                    </span>
                  </div>
                </td>
                
                <td className="py-3 md:py-4 px-3 align-top">
                  <div className="flex flex-col gap-1 md:gap-1.5 items-start">
                    {getStatusBadge(client.kyc)}
                    {getStatusBadge(client.ofac)}
                  </div>
                </td>
                
                <td className="py-3 md:py-4 px-3 align-top">
                  {lastTx ? (
                    <div>
                      <div className="font-semibold text-slate-700 text-[0.75rem] md:text-[0.8rem]">
                        {new Date(lastTx.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </div>
                      <div className="text-[0.75rem] md:text-[0.8rem] font-mono font-bold text-slate-500 mt-1">${lastTx.amount}</div>
                    </div>
                  ) : (
                    <span className="text-[0.65rem] md:text-[0.7rem] font-semibold text-slate-400">—</span>
                  )}
                </td>
                
                <td className="py-3 md:py-4 pr-4 md:pr-6 pl-3 align-top text-right">
                  <div className="flex flex-col items-end gap-2">
                    <a
                      href={`/admin/clientes/${client.id}`}
                      className="inline-flex items-center gap-1 text-[0.7rem] md:text-[0.75rem] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg transition-all duration-300 hover:shadow-sm group/link"
                    >
                      Perfil <ChevronRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                    </a>
                    <div className="flex items-center gap-1.5 mt-1">
                      <a
                        href={`/admin/clientes/${client.id}/destinatarios`}
                        className="w-6 h-6 md:w-7 md:h-7 inline-flex items-center justify-center rounded-md bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all duration-300 border border-slate-200 group relative hover:scale-110"
                        title="Ver destinatarios"
                      >
                        <Users className="w-3 md:w-3.5 h-3 md:h-3.5" />
                        <span className="absolute -top-1.5 -right-1.5 bg-slate-800 text-white text-[0.5rem] md:text-[0.55rem] font-bold px-1 md:px-1.5 rounded-full z-10">{client.destinatarios}</span>
                      </a>
                      <a
                        href={`/admin/transacciones/nueva?clienteId=${client.id}`}
                        className="w-6 h-6 md:w-7 md:h-7 inline-flex items-center justify-center rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition-all duration-300 border border-emerald-200 hover:scale-110"
                        title="Nueva transacción"
                      >
                        <Plus className="w-3.5 md:w-4 h-3.5 md:h-4" />
                      </a>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

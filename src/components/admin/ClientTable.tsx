import React from 'react';

// Datos basados en tu estructura real
const clients = [
  {
    id: '00ef1c93-3d56-4e87-8cc8-e0ea68b88b66',
    country: 'us',
    first_name: 'Luisa',
    last_name: 'Ideas Creativas',
    phone: '4242459151',
    email: '',
    metod: 'BsS',
    referred_by: null, // No fue referido
    referred_count: 2, // Ha referido a 2 clientes
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
    referred_by: '00ef1c93-3d56-4e87-8cc8-e0ea68b88b66', // Referido por Luisa
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
    referred_count: 5, // Ha referido a 5 clientes
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

// ============================================
// THRESHOLDS AJUSTADOS A TU CRITERIO
// ============================================
const LEVEL_THRESHOLDS = {
  BRONCE: {
    minTransactions: 1,
    maxTransactions: 5,
    minAmount: 1,
    maxAmount: 1000,
    name: 'Bronce',
    icon: '🥉',
    color: 'bg-gradient-to-r from-amber-700 to-amber-600 text-white'
  },
  PLATA: {
    minTransactions: 6,
    maxTransactions: 15,
    minAmount: 1001,
    maxAmount: 3000,
    name: 'Plata',
    icon: '🥈',
    color: 'bg-gradient-to-r from-gray-400 to-gray-300 text-white'
  },
  ORO: {
    minTransactions: 16,
    maxTransactions: 30,
    minAmount: 3001,
    maxAmount: 8000,
    name: 'Oro',
    icon: '🥇',
    color: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white'
  },
  PLATINO: {
    minTransactions: 31,
    maxTransactions: 50,
    minAmount: 8001,
    maxAmount: 15000,
    name: 'Platino',
    icon: '💎',
    color: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
  },
  DIAMANTE: {
    minTransactions: 51,
    maxTransactions: Infinity,
    minAmount: 15001,
    maxAmount: Infinity,
    name: 'Diamante',
    icon: '💎✨',
    color: 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white'
  }
};

// ============================================
// BADGES ESPECIALES
// ============================================
const getSpecialBadges = (client: any) => {
  const badges = [];
  
  // Badge de referidor (si ha referido a otros)
  if (client.referred_count > 0) {
    if (client.referred_count >= 10) {
      badges.push({
        icon: '👑',
        name: 'Embajador',
        color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
        tooltip: `Ha referido a ${client.referred_count} clientes`
      });
    } else if (client.referred_count >= 5) {
      badges.push({
        icon: '⭐',
        name: 'Influencer',
        color: 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white',
        tooltip: `Ha referido a ${client.referred_count} clientes`
      });
    } else if (client.referred_count >= 1) {
      badges.push({
        icon: '🤝',
        name: 'Referidor',
        color: 'bg-gradient-to-r from-green-400 to-emerald-400 text-white',
        tooltip: `Ha referido a ${client.referred_count} clientes`
      });
    }
  }
  
  // Badge de referido (si fue referido por alguien)
  if (client.referred_by) {
    badges.push({
      icon: '📢',
      name: 'Recomendado',
      color: 'bg-gradient-to-r from-blue-400 to-indigo-400 text-white',
      tooltip: 'Cliente recomendado por otro cliente'
    });
  }
  
  // Badge de cliente frecuente (más de 20 transacciones)
  if (client.transactions.length >= 20) {
    badges.push({
      icon: '🔄',
      name: 'Frecuente',
      color: 'bg-gradient-to-r from-teal-400 to-cyan-400 text-white',
      tooltip: `${client.transactions.length} transacciones realizadas`
    });
  }
  
  // Badge de alto volumen (más de $10,000)
  const totalAmount = client.transactions.reduce((sum: number, t: any) => sum + t.amount, 0);
  if (totalAmount >= 10000) {
    badges.push({
      icon: '💰',
      name: 'Alto Volumen',
      color: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white',
      tooltip: `$${totalAmount.toLocaleString()} enviados`
    });
  }
  
  return badges;
};

// Función para calcular nivel del cliente
const getClientLevel = (transactions: Array<{amount: number}>) => {
  const totalTransactions = transactions.length;
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  
  if (totalAmount >= LEVEL_THRESHOLDS.DIAMANTE.minAmount || totalTransactions >= LEVEL_THRESHOLDS.DIAMANTE.minTransactions) {
    return {
      ...LEVEL_THRESHOLDS.DIAMANTE,
      description: `${totalTransactions} transacciones · $${totalAmount.toLocaleString()}`
    };
  } else if (totalAmount >= LEVEL_THRESHOLDS.PLATINO.minAmount || totalTransactions >= LEVEL_THRESHOLDS.PLATINO.minTransactions) {
    return {
      ...LEVEL_THRESHOLDS.PLATINO,
      description: `${totalTransactions} transacciones · $${totalAmount.toLocaleString()}`
    };
  } else if (totalAmount >= LEVEL_THRESHOLDS.ORO.minAmount || totalTransactions >= LEVEL_THRESHOLDS.ORO.minTransactions) {
    return {
      ...LEVEL_THRESHOLDS.ORO,
      description: `${totalTransactions} transacciones · $${totalAmount.toLocaleString()}`
    };
  } else if (totalAmount >= LEVEL_THRESHOLDS.PLATA.minAmount || totalTransactions >= LEVEL_THRESHOLDS.PLATA.minTransactions) {
    return {
      ...LEVEL_THRESHOLDS.PLATA,
      description: `${totalTransactions} transacciones · $${totalAmount.toLocaleString()}`
    };
  } else if (totalTransactions > 0) {
    return {
      ...LEVEL_THRESHOLDS.BRONCE,
      description: `${totalTransactions} transacciones · $${totalAmount.toLocaleString()}`
    };
  } else {
    return {
      name: 'Nuevo',
      icon: '🆕',
      color: 'bg-gradient-to-r from-blue-500 to-blue-400 text-white',
      description: 'Cliente nuevo'
    };
  }
};

// Función para obtener últimas transacciones
const getLastTransaction = (transactions: Array<{date: string, amount: number}>) => {
  if (transactions.length === 0) return null;
  const sorted = [...transactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return sorted[0];
};

interface Props {
  limit?: number;
}

export default function ClientTable({ limit }: Props) {
  const displayedClients = limit ? clients.slice(0, limit) : clients;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      verified: 'bg-green-100 text-green-700',
      ok: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      review: 'bg-orange-100 text-orange-700',
      done: 'bg-blue-100 text-blue-700',
    };

    const labels: Record<string, string> = {
      verified: '✅ Verificado',
      ok: '✅ OK',
      pending: '⏳ Pendiente',
      review: '⚠️ Revisar',
      done: '📄 PDF',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-gray-500 text-sm border-b">
            <th className="pb-3 font-medium">Cliente</th>
            <th className="pb-3 font-medium">Nivel</th>
            <th className="pb-3 font-medium">Badges</th>
            <th className="pb-3 font-medium">País</th>
            <th className="pb-3 font-medium">Contacto</th>
            <th className="pb-3 font-medium">Método</th>
            <th className="pb-3 font-medium">KYC/OFAC</th>
            <th className="pb-3 font-medium">Destinos</th>
            <th className="pb-3 font-medium">Último envío</th>
            <th className="pb-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {displayedClients.map((client) => {
            const fullName = client.last_name 
              ? `${client.first_name} ${client.last_name}`
              : client.first_name;
            
            const level = getClientLevel(client.transactions);
            const badges = getSpecialBadges(client);
            const lastTx = getLastTransaction(client.transactions);

            return (
              <tr key={client.id} className="border-b hover:bg-gray-50 transition-colors group">
                <td className="py-4">
                  <div className="font-medium">{fullName}</div>
                  {client.notes && (
                    <div className="text-xs text-gray-400 italic max-w-[150px] group-hover:text-gray-600" title={client.notes}>
                      {client.notes.substring(0, 30)}...
                    </div>
                  )}
                </td>
                
                <td className="py-4">
                  <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${level.color}`}>
                    <span>{level.icon}</span>
                    <span>{level.name}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{level.description}</div>
                </td>
                
                <td className="py-4">
                  <div className="flex flex-col gap-1">
                    {badges.map((badge, index) => (
                      <div
                        key={index}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color} cursor-help`}
                        title={badge.tooltip}
                      >
                        <span>{badge.icon}</span>
                        <span>{badge.name}</span>
                      </div>
                    ))}
                    {badges.length === 0 && (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                </td>
                
                <td className="py-4">
                  <span className="uppercase text-sm font-medium">{client.country}</span>
                </td>
                
                <td className="py-4">
                  <div className="font-medium text-sm">{client.email || '—'}</div>
                  <div className="text-sm text-gray-500">{client.phone}</div>
                </td>
                
                <td className="py-4">
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                    {client.metod || '—'}
                  </span>
                </td>
                
                <td className="py-4">
                  <div className="flex flex-col gap-1">
                    {getStatusBadge(client.kyc)}
                    {getStatusBadge(client.ofac)}
                  </div>
                </td>
                
                <td className="py-4">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-lg">{client.destinatarios}</span>
                    <button 
                      onClick={() => alert(`Ver destinatarios de ${fullName}`)}
                      className="ml-1 text-blue-600 hover:text-blue-800 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Gestionar destinatarios"
                    >
                      👥
                    </button>
                  </div>
                </td>
                
                <td className="py-4">
                  {lastTx ? (
                    <div>
                      <div className="font-medium">{new Date(lastTx.date).toLocaleDateString('es-ES')}</div>
                      <div className="text-sm text-gray-500">${lastTx.amount}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                
                <td className="py-4">
                  <div className="flex flex-col gap-2">
                    <a
                      href={`/admin/clientes/${client.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Ver detalles →
                    </a>
                    <div className="flex items-center gap-2 text-xs">
                      <a
                        href={`/admin/clientes/${client.id}/destinatarios`}
                        className="text-purple-600 hover:text-purple-800"
                      >
                        Destinos
                      </a>
                      <span className="text-gray-300">|</span>
                      <a
                        href={`/admin/transacciones/nueva?clienteId=${client.id}`}
                        className="text-green-600 hover:text-green-800 font-bold text-base"
                        title="Nueva transacción"
                      >
                        +
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
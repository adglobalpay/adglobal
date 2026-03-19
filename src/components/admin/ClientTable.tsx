import React from 'react';

// Datos estáticos de ejemplo
const clients = [
  {
    id: 1,
    name: 'Juan Pérez',
    email: 'juan.perez@email.com',
    phone: '+58 412 1234567',
    account: 'BOFA ****1234',
    kyc: 'verified',
    ofac: 'ok',
    origen: 'done',
    lastTx: '15/03/2026',
    lastAmount: 200,
  },
  {
    id: 2,
    name: 'María Gómez',
    email: 'maria.gomez@email.com',
    phone: '+58 414 7654321',
    account: 'Chase ****5678',
    kyc: 'pending',
    ofac: 'review',
    origen: 'pending',
    lastTx: null,
    lastAmount: null,
  },
  {
    id: 3,
    name: 'Carlos Rodríguez',
    email: 'carlos.r@email.com',
    phone: '+1 305 5551234',
    account: 'Wells Fargo ****9012',
    kyc: 'verified',
    ofac: 'ok',
    origen: 'done',
    lastTx: '10/03/2026',
    lastAmount: 350,
  },
  {
    id: 4,
    name: 'Ana Martínez',
    email: 'ana.m@email.com',
    phone: '+58 424 9876543',
    account: 'BOFA ****4321',
    kyc: 'verified',
    ofac: 'ok',
    origen: 'done',
    lastTx: '12/03/2026',
    lastAmount: 150,
  },
];

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
            <th className="pb-3 font-medium">Nombre</th>
            <th className="pb-3 font-medium">Contacto</th>
            <th className="pb-3 font-medium">Recipiente</th>
            <th className="pb-3 font-medium">KYC</th>
            <th className="pb-3 font-medium">OFAC</th>
            <th className="pb-3 font-medium">Origen</th>
            <th className="pb-3 font-medium">Último giro</th>
            <th className="pb-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {displayedClients.map((client) => (
            <tr key={client.id} className="border-b hover:bg-gray-50 transition-colors">
              <td className="py-4 font-medium">{client.name}</td>
              <td className="py-4">
                <div className="font-medium">{client.email}</div>
                <div className="text-sm text-gray-500">{client.phone}</div>
              </td>
              <td className="py-4 text-sm text-gray-600">{client.account}</td>
              <td className="py-4">{getStatusBadge(client.kyc)}</td>
              <td className="py-4">{getStatusBadge(client.ofac)}</td>
              <td className="py-4">{getStatusBadge(client.origen)}</td>
              <td className="py-4">
                {client.lastTx ? (
                  <>
                    <div className="font-medium">{client.lastTx}</div>
                    <div className="text-sm text-gray-500">${client.lastAmount}</div>
                  </>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="py-4">
                <a
                  href={`/admin/clientes/${client.id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm mr-3 font-medium transition-colors"
                >
                  Ver
                </a>
                <button 
                  onClick={() => alert(`Link enviado a ${client.name}`)}
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  Link
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
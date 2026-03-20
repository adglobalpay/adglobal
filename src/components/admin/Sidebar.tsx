import React, { useState, useEffect } from 'react';
import CapitalOperador from './CapitalOperador';

interface NavItem {
  name: string;
  path: string;
  icon: string;
  badge?: number;
}

interface InactiveClient {
  id: number;
  name: string;
  lastTx: string;
  days: number;
  phone?: string;
}

// Función para simular clientes inactivos (luego vendrá de tu backend)
const getClientesInactivos = (): InactiveClient[] => {
  return [
    { id: 1, name: 'María Josefina', lastTx: '01/03/2026', days: 18, phone: '584247776543' },
    { id: 2, name: 'Carlos Rodríguez', lastTx: '05/03/2026', days: 14, phone: '584129876543' },
    { id: 3, name: 'Ana Martínez', lastTx: '28/02/2026', days: 19, phone: '584249876543' }
  ].filter(c => c.days > 15);
};

// Función para generar link de WhatsApp
const getWhatsAppLink = (phone: string, name: string) => {
  const message = encodeURIComponent(`Hola ${name}, ¿cómo estás? Te escribimos porque notamos que hace varios días no realizas envíos. ¿Necesitas ayuda con algo?`);
  return `https://wa.me/${phone}?text=${message}`;
};

export default function Sidebar() {
  const [currentPath, setCurrentPath] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [inactiveClients, setInactiveClients] = useState<InactiveClient[]>([]);

  useEffect(() => {
    setCurrentPath(window.location.pathname);
    setInactiveClients(getClientesInactivos());
  }, []);

  const navItems: NavItem[] = [
    { name: 'Dashboard', path: '/admin', icon: '📊' },
    { name: 'Clientes', path: '/admin/clientes', icon: '👥', badge: inactiveClients.length },
    { name: 'Transacciones', path: '/admin/transacciones', icon: '💰' },
    { name: 'Reportes', path: '/admin/reportes', icon: '📄' },
    { name: 'Configuración', path: '/admin/config', icon: '⚙️' },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen relative">
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-xl font-bold">AD GLOBAL PAY</h2>
        <span className="text-sm text-gray-400">Panel Administrativo</span>
      </div>
      
      <nav className="flex-1 p-4">
        {navItems.map((item) => (
          <a
            key={item.path}
            href={item.path}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
              currentPath === item.path
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <span>{item.icon}</span>
              {item.name}
            </div>
            {item.badge ? (
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  setShowNotifications(!showNotifications);
                }}
                className="relative focus:outline-none"
                title="Clientes inactivos"
              >
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {item.badge}
                </span>
              </button>
            ) : null}
          </a>
        ))}
      </nav>

      {/* Espaciador flexible para empujar el capital hacia abajo */}
      <div className="flex-1"></div>

      {/* Componente de Capital del Operador */}
      <CapitalOperador />

      {/* Panel de notificaciones desplegable - CON WHATSAPP */}
      {showNotifications && (
        <div className="absolute left-64 bottom-48 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-bold text-gray-800">⏰ Clientes inactivos</h3>
            <p className="text-xs text-gray-500">Más de 15 días sin girar</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {inactiveClients.length > 0 ? (
              inactiveClients.map(client => (
                <div
                  key={client.id}
                  className="block p-4 border-b hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-800">{client.name}</p>
                      <p className="text-sm text-gray-500">
                        Último giro: {client.lastTx} · {client.days} días
                      </p>
                    </div>
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                      Inactivo
                    </span>
                  </div>
                  
                  {/* Botón de WhatsApp */}
                  {client.phone && (
                    <a
                      href={getWhatsAppLink(client.phone, client.name.split(' ')[0])}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 mt-2 p-2 bg-green-50 rounded-lg transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-lg">💬</span>
                      <span>Enviar WhatsApp</span>
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <span className="text-4xl block mb-2">🎉</span>
                Todos los clientes están activos
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            CM
          </div>
          <div>
            <p className="text-white font-medium">Carlos Martinez</p>
            <p className="text-sm text-gray-400">Administrador</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
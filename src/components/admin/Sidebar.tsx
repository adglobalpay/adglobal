import React, { useState, useEffect } from 'react';

interface NavItem {
  name: string;
  path: string;
  icon: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/admin', icon: '📊' },
  { name: 'Clientes', path: '/admin/clientes', icon: '👥' },
  { name: 'Transacciones', path: '/admin/transacciones', icon: '💰' },
  { name: 'Reportes', path: '/admin/reportes', icon: '📄' },
  { name: 'Configuración', path: '/admin/config', icon: '⚙️' },
];

export default function Sidebar() {
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen">
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-xl font-bold">AD GLOBAL PAY</h2>
        <span className="text-sm text-gray-400">Panel Administrativo</span>
      </div>
      
      <nav className="flex-1 p-4">
        {navItems.map((item) => (
          <a
            key={item.path}
            href={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
              currentPath === item.path
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <span>{item.icon}</span>
            {item.name}
          </a>
        ))}
      </nav>
      
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
import React from 'react';

const stats = [
  { label: 'Clientes totales', value: '156', change: '+12%', icon: '👥' },
  { label: 'Transacciones hoy', value: '23', change: '+5%', icon: '💰' },
  { label: 'Volumen hoy', value: '$4,850', change: '+8%', icon: '📊' },
  { label: 'Pendientes KYC', value: '8', change: '-3', icon: '⏳' },
];

export default function StatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl">{stat.icon}</span>
            <span className={`text-sm font-medium ${
              stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
            }`}>
              {stat.change}
            </span>
          </div>
          <div className="text-3xl font-bold mb-1">{stat.value}</div>
          <div className="text-gray-500 text-sm">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
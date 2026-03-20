import React, { useState, useEffect } from 'react';

interface CapitalData {
  balance: number;
  status: 'normal' | 'atencion' | 'critico';
  lastUpdate: string;
}

export default function CapitalOperador() {
  const [capital, setCapital] = useState<CapitalData>({
    balance: 0,
    status: 'normal',
    lastUpdate: new Date().toLocaleTimeString()
  });
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);

  // Simular consulta a API (luego se reemplaza con llamada real a Binance)
  useEffect(() => {
    const fetchCapital = () => {
      setLoading(true);
      
      // SIMULACIÓN: Esto se reemplazará con la llamada real a Binance API
      setTimeout(() => {
        // Valores de ejemplo: 1800 (crítico), 2500 (atención), 3500 (normal)
        const mockBalance = 1850; // Cambia esto para probar los estados
        const mockStatus = mockBalance < 2000 ? 'critico' : mockBalance < 3000 ? 'atencion' : 'normal';
        
        setCapital({
          balance: mockBalance,
          status: mockStatus,
          lastUpdate: new Date().toLocaleTimeString()
        });
        setLoading(false);
      }, 1000);
    };

    fetchCapital();
    // Actualizar cada 5 minutos (300000 ms)
    const interval = setInterval(fetchCapital, 300000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusConfig = () => {
    switch(capital.status) {
      case 'critico':
        return {
          bg: 'bg-red-500',
          bgLight: 'bg-red-50',
          text: 'text-red-600',
          border: 'border-red-200',
          icon: '🔴',
          message: '¡Capital crítico! Recargar urgente'
        };
      case 'atencion':
        return {
          bg: 'bg-yellow-500',
          bgLight: 'bg-yellow-50',
          text: 'text-yellow-600',
          border: 'border-yellow-200',
          icon: '🟡',
          message: 'Capital bajo. Prepara recarga'
        };
      default:
        return {
          bg: 'bg-green-500',
          bgLight: 'bg-green-50',
          text: 'text-green-600',
          border: 'border-green-200',
          icon: '🟢',
          message: 'Capital normal'
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="p-4 border-t border-gray-800">
      <div 
        className={`rounded-lg p-3 cursor-pointer transition-all ${statusConfig.bgLight} border ${statusConfig.border}`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{statusConfig.icon}</span>
            <span className="text-sm font-medium text-gray-700">Capital Operador</span>
          </div>
          {loading ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          ) : (
            <span className={`font-bold ${statusConfig.text}`}>
              ${capital.balance.toLocaleString()}
            </span>
          )}
        </div>

        {showDetails && !loading && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
            <p className="text-xs text-gray-600">{statusConfig.message}</p>
            <p className="text-xs text-gray-400">Última actualización: {capital.lastUpdate}</p>
            
            {/* Barra de progreso visual */}
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block text-blue-600">
                    Límite: $2,000
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-blue-600">
                    {Math.min(100, Math.round((capital.balance / 5000) * 100))}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                <div
                  style={{ width: `${Math.min(100, (capital.balance / 5000) * 100)}%` }}
                  className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                    capital.status === 'critico' ? 'bg-red-500' : 
                    capital.status === 'atencion' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                ></div>
              </div>
            </div>

            {/* Botones de acción rápida */}
            <div className="flex gap-2 pt-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  alert('Actualizando saldo...');
                }}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
              >
                ↻ Actualizar
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = '/admin/config#binance';
                }}
                className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-50"
              >
                ⚙️ Configurar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
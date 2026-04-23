import React, { useState, useEffect } from 'react';

interface CapitalData {
  binanceBalance: number;    // Saldo en Binance (USDT)
  fiatAvailable: number;      // Fiat disponible para operar
  lastUpdate: string;
}

interface Movimiento {
  id: string;
  fecha: string;
  descripcion: string;
  tipo: string;
  montoUSD: number;
  montoFiat: number;
  cobertura: string;
  balance: number;
  rate: number;
  fee: number;
  metodo: string;
}

export default function CapitalOperador() {
  const [capital, setCapital] = useState<CapitalData>({
    binanceBalance: 0,
    fiatAvailable: 0,
    lastUpdate: new Date().toLocaleTimeString()
  });
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState('todo');

  // Simular consulta a API
  useEffect(() => {
    const fetchCapital = () => {
      setLoading(true);
      
      setTimeout(() => {
        const mockBinanceBalance = 3250;
        const mockFiatAvailable = 0;
        
        setCapital({
          binanceBalance: mockBinanceBalance,
          fiatAvailable: mockFiatAvailable,
          lastUpdate: new Date().toLocaleTimeString()
        });
        setLoading(false);
      }, 1000);
    };

    const fetchMovimientos = () => {
      // Simular movimientos desde tu API
      const mockMovimientos: Movimiento[] = [
        {
          id: '1',
          fecha: '04/23/2026, 05:33 PM',
          descripcion: 'P2P***',
          tipo: 'Entrada',
          montoUSD: 46.08,
          montoFiat: 29000,
          cobertura: 'P2P',
          balance: 2492.09,
          rate: 628.20,
          fee: 0.08,
          metodo: 'MERCANTIL'
        },
        {
          id: '2',
          fecha: '04/23/2026, 05:33 PM',
          descripcion: 'GLO***',
          tipo: 'Entrada',
          montoUSD: 44.89,
          montoFiat: 28250,
          cobertura: 'P2P',
          balance: 2446.01,
          rate: 628.20,
          fee: 0.07,
          metodo: 'MERCANTIL'
        },
        {
          id: '3',
          fecha: '04/23/2026, 05:32 PM',
          descripcion: 'Jos***',
          tipo: 'Entrada',
          montoUSD: 39.73,
          montoFiat: 25000,
          cobertura: 'P2P',
          balance: 2401.12,
          rate: 628.20,
          fee: 0.06,
          metodo: 'MERCANTIL'
        },
        {
          id: '4',
          fecha: '04/23/2026, 05:16 PM',
          descripcion: 'Ale***',
          tipo: 'Entrada',
          montoUSD: 59.78,
          montoFiat: 37616.56,
          cobertura: 'P2P',
          balance: 2361.39,
          rate: 628.20,
          fee: 0.10,
          metodo: 'MERCANTIL'
        },
        {
          id: '5',
          fecha: '04/23/2026, 05:16 PM',
          descripcion: 'Sep***',
          tipo: 'Entrada',
          montoUSD: 44.87,
          montoFiat: 28231.26,
          cobertura: 'P2P',
          balance: 2301.61,
          rate: 628.20,
          fee: 0.07,
          metodo: 'MERCANTIL'
        },
        {
          id: '6',
          fecha: '04/23/2026, 05:14 PM',
          descripcion: 'Mis***',
          tipo: 'Entrada',
          montoUSD: 91.68,
          montoFiat: 57700,
          cobertura: 'P2P',
          balance: 2256.74,
          rate: 628.20,
          fee: 0.16,
          metodo: 'MERCANTIL'
        }
      ];
      
      setMovimientos(mockMovimientos);
    };

    fetchCapital();
    fetchMovimientos();
    const interval = setInterval(fetchCapital, 300000);
    
    return () => clearInterval(interval);
  }, []);

  const getFilteredMovimientos = () => {
    if (filter === 'todo') return movimientos;
    return movimientos.filter(m => m.cobertura.toLowerCase() === filter);
  };

  const itemsPerPage = 12;
  const filtered = getFilteredMovimientos();
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentMovimientos = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-4 border-t border-gray-800">
      <div 
        className="rounded-lg p-3 cursor-pointer transition-all bg-gray-50 border border-gray-200"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <span className="text-sm font-medium text-gray-700">Capital Operador</span>
          </div>
          {loading && (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          )}
        </div>

        {/* Dos métricas principales */}
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <p className="text-xs text-gray-500">Binance (USDT)</p>
            <p className="text-xl font-bold text-blue-600">
              ${capital.binanceBalance.toLocaleString()}
            </p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500">Fiat Disponible</p>
            <p className={`text-xl font-bold ${capital.fiatAvailable < 100000 ? 'text-red-500' : 'text-green-600'}`}>
              {capital.fiatAvailable.toLocaleString()}
            </p>
          </div>
        </div>

        {showDetails && !loading && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
            <p className="text-xs text-gray-400">Última actualización: {capital.lastUpdate}</p>

            {/* Botones */}
            <div className="flex gap-2 pt-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHistory(true);
                }}
                className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 flex items-center gap-1"
              >
                📜 Historial
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

      {/* Modal de Historial */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowHistory(false)}>
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Historial de Movimientos</h2>
                <p className="text-xs text-gray-500">
                  Página {currentPage} / {totalPages} | Mostrando {filtered.length} movimientos de {movimientos.length}
                </p>
              </div>
              <button onClick={() => setShowHistory(false)} className="text-2xl">&times;</button>
            </div>

            {/* Filtros */}
            <div className="p-4 border-b flex gap-2 flex-wrap">
              <div className="flex gap-2">
                <button
                  onClick={() => { setFilter('todo'); setCurrentPage(1); }}
                  className={`px-3 py-1 text-sm rounded ${filter === 'todo' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                >
                  Todo
                </button>
                <button
                  onClick={() => { setFilter('red'); setCurrentPage(1); }}
                  className={`px-3 py-1 text-sm rounded ${filter === 'red' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                >
                  Red
                </button>
                <button
                  onClick={() => { setFilter('p2p'); setCurrentPage(1); }}
                  className={`px-3 py-1 text-sm rounded ${filter === 'p2p' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                >
                  P2P
                </button>
                <button
                  onClick={() => { setFilter('pay'); setCurrentPage(1); }}
                  className={`px-3 py-1 text-sm rounded ${filter === 'pay' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                >
                  Pay
                </button>
              </div>
              <div className="flex-1"></div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-sm border rounded hover:bg-gray-50">Today</button>
                <button className="px-3 py-1 text-sm border rounded hover:bg-gray-50">Last One</button>
                <button className="px-3 py-1 text-sm border rounded hover:bg-gray-50">Prev</button>
                <button className="px-3 py-1 text-sm border rounded hover:bg-gray-50">Next</button>
              </div>
            </div>

            {/* Buscador */}
            <div className="p-4 border-b">
              <input 
                type="text" 
                placeholder="Buscar orden, referencia o descripcion..." 
                className="border rounded px-3 py-2 text-sm w-full"
              />
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr className="text-left text-xs text-gray-500">
                    <th className="p-3">FECHA</th>
                    <th className="p-3">DESCRIPCIÓN</th>
                    <th className="p-3">TIPO</th>
                    <th className="p-3">MONTO</th>
                    <th className="p-3">COBERTURA</th>
                    <th className="p-3">BALANCE</th>
                   </tr>
                </thead>
                <tbody>
                  {currentMovimientos.map((mov) => (
                    <tr key={mov.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-xs">{mov.fecha}</td>
                      <td className="p-3">
                        <div className="font-medium">{mov.descripcion}</div>
                        <div className="text-xs text-gray-500">{mov.metodo} • USDT/VES • RATE {mov.rate} • FEE ${mov.fee}</div>
                      </td>
                      <td className="p-3">
                        <span className="text-green-600">+ {mov.tipo}</span>
                        <div className="text-xs text-gray-500">TRADE BUY MAKER</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">+${mov.montoUSD}</div>
                        <div className="text-xs text-gray-500">{mov.montoFiat.toLocaleString()} FIAT</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{mov.cobertura}</span>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">${mov.balance.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">Balance disponible</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="p-4 border-t flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Mostrando {currentMovimientos.length} de {filtered.length} movimientos
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p-1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                >
                  Anterior
                </button>
                <span className="px-3 py-1 text-sm">
                  Página {currentPage} de {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { Search, Download, Filter } from 'lucide-react';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Buscando: ${query} (función por implementar)`);
  };

  return (
    <div className="flex flex-col md:flex-row gap-3 md:gap-4 justify-between items-stretch md:items-center w-full">
      <form onSubmit={handleSearch} className="flex-1 w-full max-w-full md:max-w-xl relative group">
        <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-all duration-300 ${isFocused ? 'text-indigo-500' : 'text-slate-400'}`}>
          <Search className="h-5 w-5 transition-transform duration-300 group-focus-within:scale-110" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Buscar por nombre, email, país o nivel..."
          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 font-medium placeholder:text-slate-400 shadow-sm hover:bg-white hover:shadow-md"
        />
        <button
          type="submit"
          className="absolute inset-y-1.5 right-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
        >
          Buscar
        </button>
      </form>

      <div className="flex gap-2 md:gap-3 w-full md:w-auto">
        <button
          type="button"
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 rounded-xl font-bold text-sm transition-all duration-300 shadow-sm hover:shadow-md active:scale-95"
        >
          <Filter className="w-4 h-4 transition-transform hover:rotate-12" />
          <span className="hidden sm:inline">Filtros</span>
        </button>
        <button
          type="button"
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 rounded-xl font-bold text-sm transition-all duration-300 shadow-sm hover:shadow-md active:scale-95"
          onClick={() => alert('Función de exportación en desarrollo')}
        >
          <Download className="w-4 h-4 transition-transform hover:-translate-y-0.5" />
          <span className="hidden sm:inline">Exportar CSV</span>
        </button>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Search, Download, Filter, X } from 'lucide-react';

type SearchScope = 'all' | 'client' | 'recipient';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [scope, setScope] = useState<SearchScope>('all');

  const scopeOptions: Array<{ value: SearchScope; label: string }> = [
    { value: 'all', label: 'Todo' },
    { value: 'client', label: 'Clientes' },
    { value: 'recipient', label: 'Destinatarios' }
  ];

  const placeholderByScope: Record<SearchScope, string> = {
    all: 'Buscar cliente o destinatario...',
    client: 'Buscar por nombre, email, teléfono o ID del cliente...',
    recipient: 'Buscar por nombre, banco, teléfono, cuenta o ID del destinatario...'
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('clients:search', {
      detail: { query: query.trim(), scope }
    }));
  };

  const handleExport = () => {
    window.dispatchEvent(new CustomEvent('clients:export'));
  };

  const clearSearch = () => {
    setQuery('');
    window.dispatchEvent(new CustomEvent('clients:search', {
      detail: { query: '', scope }
    }));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {scopeOptions.map((option) => {
          const active = scope === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setScope(option.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 ${
                active
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-[0_6px_16px_rgba(79,70,229,0.25)]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:gap-4 justify-between items-stretch md:items-center w-full">
        <form onSubmit={handleSearch} className="flex-1 w-full max-w-full md:max-w-xl relative group flex items-center">
          <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-all duration-300 ${isFocused ? 'text-indigo-500' : 'text-slate-400'}`}>
            <Search className="h-5 w-5 transition-transform duration-300 group-focus-within:scale-110" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholderByScope[scope]}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 font-medium placeholder:text-slate-400 shadow-sm hover:bg-white hover:shadow-md"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="mr-2 flex items-center text-slate-400 hover:text-slate-600 transition-colors z-10 px-1 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="mr-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 shrink-0"
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
            onClick={handleExport}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 rounded-xl font-bold text-sm transition-all duration-300 shadow-sm hover:shadow-md active:scale-95"
          >
            <Download className="w-4 h-4 transition-transform hover:-translate-y-0.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
}

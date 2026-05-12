import React, { useState, useEffect } from 'react';
import {
  Settings, DollarSign, Scale, Clock, BarChart3, ShieldCheck, Users,
  Building, Save, Eye, EyeOff, Plug, Mail, AlertTriangle, CheckCircle,
  FileText, ArrowRight, CreditCard, Landmark, Plus, Trash2, Pencil, GripVertical
} from 'lucide-react';
import { apiFetch } from '../../lib/auth';

interface SystemUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface ConfigMap {
  [key: string]: string;
}

interface PaymentMethodItem {
  id: string;
  name: string;
  label: string;
  letter: string;
  classes: string;
  subtitle: string | null;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

interface BankItem {
  id: string;
  name: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

export default function ConfigPage() {
  const [config, setConfig] = useState<ConfigMap>({});
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [pmLoading, setPmLoading] = useState(false);
  const [pmForm, setPmForm] = useState({ name: '', label: '', letter: '', color: 'bg-slate-100 text-slate-600', sortOrder: 0, isActive: true });
  const [pmEditing, setPmEditing] = useState<string | null>(null);

  // Banks state
  const [banks, setBanks] = useState<BankItem[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankForm, setBankForm] = useState({ name: '', label: '', sortOrder: 0, isActive: true });
  const [bankEditing, setBankEditing] = useState<string | null>(null);

  // Local form state for all fields
  const [form, setForm] = useState({
    usd_ves_compra: '49.50',
    usd_ves_venta: '50.30',
    margen: '0.8',
    max_por_transaccion: '1000',
    min_por_transaccion: '10',
    max_diario_por_cliente: '3000',
    max_mensual_por_cliente: '15000',
    hora_inicio: '08:00',
    hora_fin: '18:00',
    zona_horaria: 'America/New_York',
    dias_laborales: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'] as string[],
    porcentaje_operador: '36',
    comision_global: '8.5',
    tasa_costo: '2.9',
    meta_operador: '5000',
    volumen_mensual: '45890',
    profit_global: '12580',
    binance_api_key: '',
    binance_api_secret: '',
    binance_alert_limit: '2000',
    binance_alert_email: 'carlos@adglobalpay.com',
    binance_check_frequency: '5',
    session_timeout: '30',
    twofa_enabled: true,
    audit_enabled: true,
  });

  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [cfgData, usersData, monthlyStats] = await Promise.all([
          apiFetch('/api/config').catch(() => ({} as ConfigMap)),
          apiFetch('/api/users').catch(() => ([] as SystemUser[])),
          apiFetch('/api/stats/monthly').catch(() => ({ profitGlobal: 0, volumenMensual: 0 }))
        ]);
        setConfig(cfgData);
        setUsers(usersData);

        // Map backend config keys to form
        setForm(prev => {
          // Parsear dias laborales como JSON si viene del backend
          let diasLaborales = prev.dias_laborales;
          if (cfgData['schedule.dias_laborales']) {
            try {
              const parsed = JSON.parse(cfgData['schedule.dias_laborales']);
              if (Array.isArray(parsed)) diasLaborales = parsed;
            } catch { /* ignorar */ }
          }

          return {
            ...prev,
            usd_ves_compra: cfgData['rates.usd_ves_compra'] || prev.usd_ves_compra,
            usd_ves_venta: cfgData['rates.usd_ves_venta'] || prev.usd_ves_venta,
            margen: cfgData['rates.margen'] || prev.margen,
            max_por_transaccion: cfgData['limits.max_por_transaccion'] || prev.max_por_transaccion,
            min_por_transaccion: cfgData['limits.min_por_transaccion'] || prev.min_por_transaccion,
            max_diario_por_cliente: cfgData['limits.max_diario_por_cliente'] || prev.max_diario_por_cliente,
            max_mensual_por_cliente: cfgData['limits.max_mensual_por_cliente'] || prev.max_mensual_por_cliente,
            hora_inicio: cfgData['schedule.hora_inicio'] || prev.hora_inicio,
            hora_fin: cfgData['schedule.hora_fin'] || prev.hora_fin,
            zona_horaria: cfgData['schedule.zona_horaria'] || prev.zona_horaria,
            dias_laborales: diasLaborales,
            porcentaje_operador: cfgData['profit.porcentaje_operador'] || prev.porcentaje_operador,
            comision_global: cfgData['profit.comision_global'] || prev.comision_global,
            tasa_costo: cfgData['profit.tasa_costo'] || prev.tasa_costo,
            meta_operador: cfgData['profit.meta_operador'] || prev.meta_operador,
          volumen_mensual: String(monthlyStats.volumenMensual || 0),
          profit_global: String(monthlyStats.profitGlobal || 0),
            binance_api_key: cfgData['binance.api_key'] || prev.binance_api_key,
            binance_api_secret: cfgData['binance.api_secret'] || prev.binance_api_secret,
            binance_alert_limit: cfgData['binance.alert_limit'] || prev.binance_alert_limit,
            binance_alert_email: cfgData['binance.alert_email'] || prev.binance_alert_email,
            binance_check_frequency: cfgData['binance.check_frequency'] || prev.binance_check_frequency,
            session_timeout: cfgData['security.session_timeout'] || prev.session_timeout,
            twofa_enabled: cfgData['security.twofa_enabled'] === 'true',
            audit_enabled: cfgData['security.audit_enabled'] === 'true',
          };
        });
      } catch (err) {
        console.error('Error cargando config:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const updateField = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleDia = (dia: string) => {
    setForm(prev => ({
      ...prev,
      dias_laborales: prev.dias_laborales.includes(dia)
        ? prev.dias_laborales.filter(d => d !== dia)
        : [...prev.dias_laborales, dia]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        'rates.usd_ves_compra': form.usd_ves_compra,
        'rates.usd_ves_venta': form.usd_ves_venta,
        'rates.margen': form.margen,
        'limits.max_por_transaccion': form.max_por_transaccion,
        'limits.min_por_transaccion': form.min_por_transaccion,
        'limits.max_diario_por_cliente': form.max_diario_por_cliente,
        'limits.max_mensual_por_cliente': form.max_mensual_por_cliente,
        'schedule.hora_inicio': form.hora_inicio,
        'schedule.hora_fin': form.hora_fin,
        'schedule.zona_horaria': form.zona_horaria,
        'schedule.dias_laborales': JSON.stringify(form.dias_laborales),
        'profit.porcentaje_operador': form.porcentaje_operador,
        'profit.comision_global': form.comision_global,
        'profit.tasa_costo': form.tasa_costo,
        'profit.meta_operador': form.meta_operador,
        'binance.api_key': form.binance_api_key,
        'binance.api_secret': form.binance_api_secret,
        'binance.alert_limit': form.binance_alert_limit,
        'binance.alert_email': form.binance_alert_email,
        'binance.check_frequency': form.binance_check_frequency,
        'security.session_timeout': form.session_timeout,
        'security.twofa_enabled': String(form.twofa_enabled),
        'security.audit_enabled': String(form.audit_enabled),
      };

      await apiFetch('/api/config/bulk', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'success', message: 'Configuración guardada', description: 'Los cambios fueron guardados correctamente.' }
      }));
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { type: 'error', message: 'Error', description: err.message }
      }));
    } finally {
      setSaving(false);
    }
  };

  // Payment Methods CRUD
  const loadPaymentMethods = async () => {
    setPmLoading(true);
    try {
      const data = await apiFetch('/api/payment-methods');
      setPaymentMethods(data);
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', message: 'Error', description: err.message } }));
    } finally {
      setPmLoading(false);
    }
  };

  const savePaymentMethod = async () => {
    if (!pmForm.name || !pmForm.label) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'warning', message: 'Campos requeridos', description: 'Nombre y etiqueta son obligatorios.' } }));
      return;
    }
    try {
      if (pmEditing) {
        await apiFetch(`/api/payment-methods/${pmEditing}`, { method: 'PATCH', body: JSON.stringify(pmForm) });
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', message: 'Actualizado', description: 'Método de pago actualizado.' } }));
      } else {
        await apiFetch('/api/payment-methods', { method: 'POST', body: JSON.stringify(pmForm) });
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', message: 'Creado', description: 'Método de pago creado.' } }));
      }
      setPmForm({ name: '', label: '', letter: '', color: 'bg-slate-100 text-slate-600', sortOrder: 0, isActive: true });
      setPmEditing(null);
      loadPaymentMethods();
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', message: 'Error', description: err.message } }));
    }
  };

  const editPaymentMethod = (pm: PaymentMethodItem) => {
    setPmForm({ name: pm.name, label: pm.label, letter: pm.letter, color: pm.color, sortOrder: pm.sortOrder, isActive: pm.isActive });
    setPmEditing(pm.id);
  };

  const deletePaymentMethod = async (id: string) => {
    if (!confirm('¿Eliminar este método de pago?')) return;
    try {
      await apiFetch(`/api/payment-methods/${id}`, { method: 'DELETE' });
      loadPaymentMethods();
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', message: 'Eliminado', description: 'Método de pago eliminado.' } }));
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', message: 'Error', description: err.message } }));
    }
  };

  // Banks CRUD
  const loadBanks = async () => {
    setBankLoading(true);
    try {
      const data = await apiFetch('/api/banks');
      setBanks(data);
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', message: 'Error', description: err.message } }));
    } finally {
      setBankLoading(false);
    }
  };

  const saveBank = async () => {
    if (!bankForm.name || !bankForm.label) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'warning', message: 'Campos requeridos', description: 'Nombre y etiqueta son obligatorios.' } }));
      return;
    }
    try {
      if (bankEditing) {
        await apiFetch(`/api/banks/${bankEditing}`, { method: 'PATCH', body: JSON.stringify(bankForm) });
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', message: 'Actualizado', description: 'Banco actualizado.' } }));
      } else {
        await apiFetch('/api/banks', { method: 'POST', body: JSON.stringify(bankForm) });
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', message: 'Creado', description: 'Banco creado.' } }));
      }
      setBankForm({ name: '', label: '', sortOrder: 0, isActive: true });
      setBankEditing(null);
      loadBanks();
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', message: 'Error', description: err.message } }));
    }
  };

  const editBank = (bank: BankItem) => {
    setBankForm({ name: bank.name, label: bank.label, sortOrder: bank.sortOrder, isActive: bank.isActive });
    setBankEditing(bank.id);
  };

  const deleteBank = async (id: string) => {
    if (!confirm('¿Eliminar este banco?')) return;
    try {
      await apiFetch(`/api/banks/${id}`, { method: 'DELETE' });
      loadBanks();
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', message: 'Eliminado', description: 'Banco eliminado.' } }));
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', message: 'Error', description: err.message } }));
    }
  };

  useEffect(() => {
    loadPaymentMethods();
    loadBanks();
  }, []);

  const costoOperativo = Math.round(Number(form.volumen_mensual) * (Number(form.tasa_costo) / 100));
  const profitOperador = Math.round(Number(form.profit_global) * (Number(form.porcentaje_operador) / 100));

  if (loading) {
    return (
      <div className="space-y-6 md:space-y-8 max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl p-8 h-24 shimmer" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white rounded-2xl p-6 h-64 shimmer" />
          <div className="bg-white rounded-2xl p-6 h-64 shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-slate-200 pb-6 anim-fade-in">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 md:p-2.5 bg-indigo-50 text-indigo-600 rounded-xl transition-transform hover:scale-110 duration-300 hover:rotate-6">
              <Settings className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            Configuraciones
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm md:text-base">Gestiona tasas, límites, usuarios e integraciones del sistema.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-5 md:px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all duration-300 font-bold text-sm flex items-center gap-2 shadow-[0_4px_12px_rgba(79,70,229,0.2)] btn-interactive w-full md:w-auto justify-center disabled:opacity-60"
        >
          <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Tasas */}
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 card-hover anim-fade-in stagger-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><DollarSign className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base md:text-lg font-extrabold text-slate-800 tracking-tight">Tasas de cambio</h2>
              <p className="text-xs text-slate-400 font-medium">Configuración actual del mercado</p>
            </div>
          </div>
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1.5">USD → VES (Compra)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Bs.</span>
                  <input type="number" step="0.01" value={form.usd_ves_compra} onChange={e => updateField('usd_ves_compra', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-mono font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all hover:bg-white hover:shadow-sm" />
                </div>
              </div>
              <div>
                <label className="block text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1.5">USD → VES (Venta)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Bs.</span>
                  <input type="number" step="0.01" value={form.usd_ves_venta} onChange={e => updateField('usd_ves_venta', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-mono font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all hover:bg-white hover:shadow-sm" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Margen (%)</label>
              <input type="number" step="0.1" value={form.margen} onChange={e => updateField('margen', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-mono font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all hover:bg-white hover:shadow-sm" />
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-xs text-slate-400 font-medium">Última actualización: <span className="text-slate-600 font-semibold">{new Date().toLocaleString('es-ES')}</span></p>
            </div>
          </div>
        </div>

        {/* Límites */}
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 card-hover anim-fade-in stagger-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Scale className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base md:text-lg font-extrabold text-slate-800 tracking-tight">Límites operativos</h2>
              <p className="text-xs text-slate-400 font-medium">Restricciones por transacción y cliente</p>
            </div>
          </div>
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'max_por_transaccion', label: 'Máx. por txn' },
                { key: 'min_por_transaccion', label: 'Mín. por txn' },
                { key: 'max_diario_por_cliente', label: 'Máx. diario/cliente' },
                { key: 'max_mensual_por_cliente', label: 'Máx. mensual/cliente' }
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{field.label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                    <input type="number" value={(form as any)[field.key]} onChange={e => updateField(field.key, e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-mono font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all hover:bg-white hover:shadow-sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Horarios */}
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 card-hover anim-fade-in stagger-3">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center"><Clock className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base md:text-lg font-extrabold text-slate-800 tracking-tight">Horarios de operación</h2>
              <p className="text-xs text-slate-400 font-medium">Días y horas de atención</p>
            </div>
          </div>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hora inicio</label>
                <input type="time" value={form.hora_inicio} onChange={e => updateField('hora_inicio', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all hover:bg-white hover:shadow-sm" />
              </div>
              <div>
                <label className="block text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hora fin</label>
                <input type="time" value={form.hora_fin} onChange={e => updateField('hora_fin', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all hover:bg-white hover:shadow-sm" />
              </div>
            </div>
            <div>
              <label className="block text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Zona horaria</label>
              <select value={form.zona_horaria} onChange={e => updateField('zona_horaria', e.target.value)}
                className="custom-select w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all hover:bg-white hover:shadow-sm cursor-pointer">
                <option>America/New_York</option>
                <option>America/Chicago</option>
                <option>America/Denver</option>
                <option>America/Los_Angeles</option>
                <option>America/Caracas</option>
              </select>
            </div>
            <div>
              <label className="block text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-2">Días laborales</label>
              <div className="flex gap-2 flex-wrap">
                {diasSemana.map(dia => (
                  <label key={dia} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 ${form.dias_laborales.includes(dia) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                    <input type="checkbox" checked={form.dias_laborales.includes(dia)} onChange={() => toggleDia(dia)} className="rounded accent-indigo-600" />
                    <span className="text-sm font-semibold">{dia}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Profit */}
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 card-hover anim-fade-in stagger-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><BarChart3 className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base md:text-lg font-extrabold text-slate-800 tracking-tight">Configuración de Profit</h2>
              <p className="text-xs text-slate-400 font-medium">Distribución y metas de ganancia</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4">
              {[
                { key: 'porcentaje_operador', label: '% del Operador', suffix: '%', min: 0, max: 100, step: 1 },
                { key: 'comision_global', label: 'Comisión Global', suffix: '%', min: 0, max: 100, step: 0.1 },
                { key: 'tasa_costo', label: 'Tasa de Costo Operativo', suffix: '%', min: 0, max: 100, step: 0.1 }
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{field.label}</label>
                  <div className="relative">
                    <input type="number" value={(form as any)[field.key]} onChange={e => updateField(field.key, e.target.value)}
                      min={field.min} max={field.max} step={field.step}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-mono font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all hover:bg-white hover:shadow-sm" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{field.suffix}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Meta Mensual del Operador</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                  <input type="number" value={form.meta_operador} onChange={e => updateField('meta_operador', e.target.value)}
                    min={0} step={100}
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-mono font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all hover:bg-white hover:shadow-sm" />
                </div>
              </div>
              <div>
                <label className="block text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Volumen Mensual</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                  <input type="number" value={form.volumen_mensual} disabled
                    className="w-full pl-8 pr-4 py-3 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl font-mono font-semibold outline-none cursor-not-allowed" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.6rem] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">AUTO</span>
                </div>
                <p className="text-[0.65rem] text-slate-400 mt-1 font-medium">Suma de ingresos del mes en curso</p>
              </div>
              <div>
                <label className="block text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Profit Global</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                  <input type="number" value={form.profit_global} disabled
                    className="w-full pl-8 pr-4 py-3 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl font-mono font-semibold outline-none cursor-not-allowed" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.6rem] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">AUTO</span>
                </div>
                <p className="text-[0.65rem] text-slate-400 mt-1 font-medium">Suma de profits del mes en curso</p>
              </div>
            </div>
          </div>
          <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100">
            <h3 className="font-bold text-indigo-800 mb-3 text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Vista previa de cálculos</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 text-sm">
              <div className="bg-white/70 rounded-xl p-3 border border-indigo-100/50">
                <span className="text-indigo-500 text-xs font-bold uppercase">Costo operativo</span>
                <p className="font-mono font-bold text-slate-800 mt-1">${costoOperativo.toLocaleString()}</p>
              </div>
              <div className="bg-white/70 rounded-xl p-3 border border-indigo-100/50">
                <span className="text-indigo-500 text-xs font-bold uppercase">Profit operador</span>
                <p className="font-mono font-bold text-slate-800 mt-1">${profitOperador.toLocaleString()}</p>
              </div>
              <div className="bg-white/70 rounded-xl p-3 border border-indigo-100/50">
                <span className="text-indigo-500 text-xs font-bold uppercase">% vs meta</span>
                <p className="font-mono font-bold text-slate-800 mt-1">{Math.round((profitOperador / Number(form.meta_operador || 1)) * 100)}%</p>
              </div>
              <div className="bg-white/70 rounded-xl p-3 border border-indigo-100/50">
                <span className="text-indigo-500 text-xs font-bold uppercase">Comisión</span>
                <p className="font-mono font-bold text-slate-800 mt-1">{form.comision_global}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Binance */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 card-hover anim-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Plug className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base md:text-lg font-extrabold text-slate-800 tracking-tight">Integración Binance</h2>
              <p className="text-xs text-slate-400 font-medium">Conexión con API de Binance para balances</p>
            </div>
          </div>
          <div className="sm:ml-auto flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            Conectado
          </div>
        </div>
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-xl mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800 font-semibold">Importante</p>
              <p className="text-sm text-amber-700 mt-1">Usa una API key con permisos de SOLO LECTURA. Nunca compartas tu API Secret.</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <div>
            <label className="block text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1.5">API Key</label>
            <div className="flex gap-2">
              <input type={showApiKey ? 'text' : 'password'} value={form.binance_api_key} onChange={e => updateField('binance_api_key', e.target.value)}
                placeholder="********************"
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all hover:bg-white" />
              <button onClick={() => setShowApiKey(!showApiKey)} className="px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-all hover:scale-105">
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1.5">API Secret</label>
            <div className="flex gap-2">
              <input type={showApiSecret ? 'text' : 'password'} value={form.binance_api_secret} onChange={e => updateField('binance_api_secret', e.target.value)}
                placeholder="********************"
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all hover:bg-white" />
              <button onClick={() => setShowApiSecret(!showApiSecret)} className="px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-all hover:scale-105">
                {showApiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <div>
            <label className="block text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Límite de alerta ($)</label>
            <input type="number" value={form.binance_alert_limit} onChange={e => updateField('binance_alert_limit', e.target.value)} min={500} step={100}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-mono font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all hover:bg-white hover:shadow-sm" />
          </div>
          <div>
            <label className="block text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email para notificaciones</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="email" value={form.binance_alert_email} onChange={e => updateField('binance_alert_email', e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all hover:bg-white hover:shadow-sm" />
            </div>
          </div>
          <div>
            <label className="block text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Frecuencia de verificación</label>
            <select value={form.binance_check_frequency} onChange={e => updateField('binance_check_frequency', e.target.value)}
              className="custom-select w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all hover:bg-white hover:shadow-sm cursor-pointer">
              <option value="5">Cada 5 minutos</option>
              <option value="10">Cada 10 minutos</option>
              <option value="15">Cada 15 minutos</option>
              <option value="30">Cada 30 minutos</option>
              <option value="60">Cada 1 hora</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'info', message: 'Probando conexión', description: 'Verificando conexión con Binance API...' } }))}
            className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 font-bold text-sm transition-all btn-interactive flex items-center justify-center gap-2">
            <Plug className="w-4 h-4" /> Probar conexión
          </button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'info', message: 'Notificación de prueba', description: 'Enviando notificación de prueba...' } }))}
            className="flex-1 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-50 font-bold text-sm transition-all flex items-center justify-center gap-2">
            <Mail className="w-4 h-4" /> Probar alerta
          </button>
        </div>
      </div>

      {/* Usuarios */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 card-hover anim-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><Users className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base md:text-lg font-extrabold text-slate-800 tracking-tight">Usuarios del sistema</h2>
              <p className="text-xs text-slate-400 font-medium">Gestión de accesos y roles</p>
            </div>
          </div>
          <button onClick={() => window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'info', message: 'Nuevo usuario', description: 'Funcionalidad para agregar usuarios próximamente.' } }))}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 font-bold text-sm transition-all btn-interactive flex items-center gap-2">
            <Users className="w-4 h-4" /> Nuevo
          </button>
        </div>
        <div className="space-y-3">
          {users.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm font-medium">No hay usuarios registrados</div>
          )}
          {users.map((user, idx) => {
            const color = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'
              ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
              : 'bg-emerald-100 text-emerald-700 border-emerald-200';
            return (
              <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-4 bg-slate-50 hover:bg-indigo-50/30 rounded-2xl transition-all duration-300 group cursor-pointer hover:shadow-sm gap-3 sm:gap-0" style={{ animationDelay: `${idx * 60}ms` }}>
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-bold text-sm border transition-transform group-hover:scale-110 ${color}`}>
                    {user.firstName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm md:text-base">{user.firstName} {user.lastName || ''}</p>
                    <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${color}`}>
                    {user.role}
                  </span>
                  <p className="text-xs text-slate-400 mt-1 font-medium">{user.isActive ? 'Activo' : 'Inactivo'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seguridad */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 card-hover anim-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
          <div>
            <h2 className="text-base md:text-lg font-extrabold text-slate-800 tracking-tight">Seguridad y compliance</h2>
            <p className="text-xs text-slate-400 font-medium">Configuraciones de seguridad del sistema</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 md:p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all duration-300 hover:shadow-sm group">
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
              <p className="font-bold text-slate-800">Verificación 2FA</p>
            </div>
            <p className="text-sm text-slate-500 mb-4">Requerir autenticación de dos factores para administradores</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only peer" checked={form.twofa_enabled} onChange={e => updateField('twofa_enabled', e.target.checked)} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </div>
              <span className="text-sm font-semibold text-slate-700">{form.twofa_enabled ? 'Habilitado' : 'Deshabilitado'}</span>
            </label>
          </div>
          <div className="p-4 md:p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all duration-300 hover:shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-indigo-500" />
              <p className="font-bold text-slate-800">Sesiones</p>
            </div>
            <p className="text-sm text-slate-500 mb-4">Tiempo de expiración de sesión activa</p>
            <select value={form.session_timeout} onChange={e => updateField('session_timeout', e.target.value)}
              className="custom-select w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all hover:shadow-sm cursor-pointer">
              <option value="30">30 minutos</option>
              <option value="60">1 hora</option>
              <option value="240">4 horas</option>
              <option value="480">8 horas</option>
            </select>
          </div>
          <div className="p-4 md:p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all duration-300 hover:shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-5 h-5 text-indigo-500" />
              <p className="font-bold text-slate-800">Auditoría</p>
            </div>
            <p className="text-sm text-slate-500 mb-4">Registro de acciones del sistema</p>
            <button onClick={() => window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'info', message: 'Auditoría', description: 'Logs de auditoría disponibles próximamente.' } }))}
              className="text-indigo-600 hover:text-indigo-800 font-bold text-sm flex items-center gap-1 group/link transition-all">
              Ver logs completos <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Métodos de pago */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 card-hover anim-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><CreditCard className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base md:text-lg font-extrabold text-slate-800 tracking-tight">Métodos de pago</h2>
              <p className="text-xs text-slate-400 font-medium">Gestiona los métodos disponibles para transacciones</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1">Nombre (ID)</label>
                <input type="text" value={pmForm.name} onChange={e => setPmForm({ ...pmForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="zelle" />
              </div>
              <div>
                <label className="block text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1">Etiqueta</label>
                <input type="text" value={pmForm.label} onChange={e => setPmForm({ ...pmForm, label: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="Zelle" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1">Letra</label>
                <input type="text" value={pmForm.letter} onChange={e => setPmForm({ ...pmForm, letter: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="Z" />
              </div>
              <div>
                <label className="block text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1">Color</label>
                <select value={pmForm.color} onChange={e => setPmForm({ ...pmForm, color: e.target.value })}
                  className="custom-select w-full px-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer">
                  <option value="bg-slate-100 text-slate-600">Gris</option>
                  <option value="bg-indigo-100 text-indigo-600">Indigo</option>
                  <option value="bg-emerald-100 text-emerald-600">Verde</option>
                  <option value="bg-amber-100 text-amber-600">Ámbar</option>
                  <option value="bg-rose-100 text-rose-600">Rojo</option>
                  <option value="bg-cyan-100 text-cyan-600">Cyan</option>
                  <option value="bg-purple-100 text-purple-600">Púrpura</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={pmForm.isActive} onChange={e => setPmForm({ ...pmForm, isActive: e.target.checked })} className="rounded accent-indigo-600 w-4 h-4" />
                <span className="text-sm font-semibold text-slate-700">Activo</span>
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={savePaymentMethod} className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all btn-interactive flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> {pmEditing ? 'Actualizar' : 'Agregar'}
              </button>
              {pmEditing && (
                <button onClick={() => { setPmEditing(null); setPmForm({ name: '', label: '', letter: '', color: 'bg-slate-100 text-slate-600', sortOrder: 0, isActive: true }); }} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all">
                  Cancelar
                </button>
              )}
            </div>
          </div>
          {/* List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {pmLoading ? (
              <div className="text-center py-8 text-slate-400 text-sm">Cargando...</div>
            ) : paymentMethods.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm font-medium">No hay métodos de pago</div>
            ) : (
              paymentMethods.map(pm => (
                <div key={pm.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${pm.color} flex items-center justify-center text-xs font-bold`}>{pm.letter || pm.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{pm.label}</p>
                      <p className="text-[0.65rem] text-slate-400 font-medium">{pm.name} · Orden {pm.sortOrder}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => editPaymentMethod(pm)} className="w-8 h-8 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-all" title="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deletePaymentMethod(pm.id)} className="w-8 h-8 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bancos */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/60 card-hover anim-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Landmark className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base md:text-lg font-extrabold text-slate-800 tracking-tight">Bancos de destino</h2>
              <p className="text-xs text-slate-400 font-medium">Gestiona los bancos disponibles para destinatarios</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1">Nombre (ID)</label>
                <input type="text" value={bankForm.name} onChange={e => setBankForm({ ...bankForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="banesco" />
              </div>
              <div>
                <label className="block text-[0.65rem] font-black uppercase tracking-wider text-slate-400 mb-1">Etiqueta</label>
                <input type="text" value={bankForm.label} onChange={e => setBankForm({ ...bankForm, label: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="Banesco" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={bankForm.isActive} onChange={e => setBankForm({ ...bankForm, isActive: e.target.checked })} className="rounded accent-indigo-600 w-4 h-4" />
                <span className="text-sm font-semibold text-slate-700">Activo</span>
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveBank} className="flex-1 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all btn-interactive flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> {bankEditing ? 'Actualizar' : 'Agregar'}
              </button>
              {bankEditing && (
                <button onClick={() => { setBankEditing(null); setBankForm({ name: '', label: '', sortOrder: 0, isActive: true }); }} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all">
                  Cancelar
                </button>
              )}
            </div>
          </div>
          {/* List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {bankLoading ? (
              <div className="text-center py-8 text-slate-400 text-sm">Cargando...</div>
            ) : banks.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm font-medium">No hay bancos registrados</div>
            ) : (
              banks.map(bank => (
                <div key={bank.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-emerald-200 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">{bank.label.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{bank.label}</p>
                      <p className="text-[0.65rem] text-slate-400 font-medium">{bank.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => editBank(bank)} className="w-8 h-8 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 flex items-center justify-center transition-all" title="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteBank(bank.id)} className="w-8 h-8 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Empresa */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-700/50 text-white card-hover anim-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><Building className="w-5 h-5 text-indigo-300" /></div>
          <div>
            <h2 className="text-base md:text-lg font-extrabold tracking-tight">Información de la empresa</h2>
            <p className="text-xs text-slate-400 font-medium">Datos registrales y legales</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: 'Razón social', value: 'AD GLOBAL SERVICES LLC' },
            { label: 'EIN', value: '41-4044809' },
            { label: 'Registro FinCEN', value: 'MRX26-00003351' },
            { label: 'Documento Florida', value: 'L25000297675' }
          ].map(item => (
            <div key={item.label} className="p-3 md:p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">{item.label}</p>
              <p className="font-bold text-sm">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

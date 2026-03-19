import React, { useState } from 'react';

interface FormData {
  fecha: string;
  remitente_nombre: string;
  remitente_telefono: string;
  destinatario_nombre: string;
  destinatario_telefono: string;
  destinatario_banco: string;
  ingreso_usd: number;
  salida_usdt: number;
  tasa: number;
  monto_ves: number;
  metodo: 'USDT' | 'EFECTIVO' | 'TRANSFERENCIA';
}

export default function NuevaTransaccionForm() {
  const [form, setForm] = useState<FormData>({
    fecha: new Date().toISOString().split('T')[0],
    remitente_nombre: '',
    remitente_telefono: '',
    destinatario_nombre: '',
    destinatario_telefono: '',
    destinatario_banco: '',
    ingreso_usd: 0,
    salida_usdt: 0,
    tasa: 0,
    monto_ves: 0,
    metodo: 'USDT'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí se guardará en base de datos después
    console.log('Transacción a guardar:', form);
    alert('Transacción guardada (simulación)');
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-4 max-w-2xl">
      <h2 class="text-xl font-bold">Nueva Transacción</h2>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm mb-1">Fecha</label>
          <input
            type="date"
            value={form.fecha}
            onChange={e => setForm({...form, fecha: e.target.value})}
            class="w-full border p-2 rounded"
          />
        </div>
      </div>

      <div class="border-t pt-4">
        <h3 class="font-semibold mb-2">Remitente</h3>
        <div class="grid grid-cols-2 gap-4">
          <input
            placeholder="Nombre"
            value={form.remitente_nombre}
            onChange={e => setForm({...form, remitente_nombre: e.target.value})}
            class="border p-2 rounded"
          />
          <input
            placeholder="Teléfono"
            value={form.remitente_telefono}
            onChange={e => setForm({...form, remitente_telefono: e.target.value})}
            class="border p-2 rounded"
          />
        </div>
      </div>

      <div class="border-t pt-4">
        <h3 class="font-semibold mb-2">Destinatario</h3>
        <div class="grid grid-cols-2 gap-4">
          <input
            placeholder="Nombre"
            value={form.destinatario_nombre}
            onChange={e => setForm({...form, destinatario_nombre: e.target.value})}
            class="border p-2 rounded"
          />
          <input
            placeholder="Teléfono"
            value={form.destinatario_telefono}
            onChange={e => setForm({...form, destinatario_telefono: e.target.value})}
            class="border p-2 rounded"
          />
          <input
            placeholder="Banco destino"
            value={form.destinatario_banco}
            onChange={e => setForm({...form, destinatario_banco: e.target.value})}
            class="border p-2 rounded col-span-2"
          />
        </div>
      </div>

      <div class="border-t pt-4">
        <h3 class="font-semibold mb-2">Montos</h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm">Ingreso USD</label>
            <input
              type="number"
              step="0.01"
              value={form.ingreso_usd}
              onChange={e => setForm({...form, ingreso_usd: parseFloat(e.target.value)})}
              class="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label class="text-sm">Salida USDT</label>
            <input
              type="number"
              step="0.01"
              value={form.salida_usdt}
              onChange={e => setForm({...form, salida_usdt: parseFloat(e.target.value)})}
              class="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label class="text-sm">Tasa Bs/USD</label>
            <input
              type="number"
              step="0.01"
              value={form.tasa}
              onChange={e => setForm({...form, tasa: parseFloat(e.target.value)})}
              class="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label class="text-sm">Monto VES entregado</label>
            <input
              type="number"
              value={form.monto_ves}
              onChange={e => setForm({...form, monto_ves: parseFloat(e.target.value)})}
              class="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label class="text-sm">Método</label>
            <select
              value={form.metodo}
              onChange={e => setForm({...form, metodo: e.target.value as any})}
              class="w-full border p-2 rounded"
            >
              <option>USDT</option>
              <option>EFECTIVO</option>
              <option>TRANSFERENCIA</option>
            </select>
          </div>
        </div>
      </div>

      <button
        type="submit"
        class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
      >
        Guardar Transacción
      </button>
    </form>
  );
}
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileSignature, Loader2, RefreshCw, Save, ExternalLink, Search } from 'lucide-react';
import { apiFetch } from '../../lib/auth';

interface Operator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  reportTag?: { id: string; label: string; color: string } | null;
}

interface ReportTag {
  id: string;
  label: string;
  color: string;
}

interface Contract {
  id: string;
  templateName: string;
  templateVersion: string;
  signerName: string;
  signerEmail: string | null;
  signerDocument: string | null;
  signerTagLabel: string | null;
  pdfUrl: string | null;
  signedAt: string;
  signer: Operator;
  createdBy?: { firstName: string; lastName: string | null } | null;
}

const emptyTemplate = `CONTRATO DE SERVICIOS AD GLOBAL PAY

Entre AD Global Services LLC y {{signerName}}, identificado como {{signerRole}} con tag {{signerTagLabel}}, se acuerda la prestacion de servicios de intermediacion, gestion y soporte operativo para pagos, remesas y operaciones relacionadas.

El firmante declara que la informacion suministrada es verdadera, que los fondos utilizados provienen de fuentes licitas y que acepta cumplir los procesos de verificacion KYC, OFAC y validacion administrativa requeridos por AD Global Pay.

AD Global Pay podra solicitar comprobantes, documentos adicionales o suspender una operacion cuando existan alertas de cumplimiento, inconsistencias de datos o requerimientos regulatorios.

El firmante acepta la plantilla vigente, autoriza el tratamiento de sus datos operativos para ejecutar el servicio y reconoce que la firma digital registrada en este documento tiene validez como aceptacion expresa.`;

export default function ContractsPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasSignatureRef = useRef(false);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [templateName, setTemplateName] = useState('Contrato AD Global Pay');
  const [templateVersion, setTemplateVersion] = useState('v1');
  const [templateContent, setTemplateContent] = useState(emptyTemplate);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedOperator = useMemo(
    () => operators.find((op) => op.id === selectedOperatorId) || null,
    [operators, selectedOperatorId]
  );

  const filteredOperators = useMemo(() => {
    const q = query.trim().toLowerCase();
    const active = operators.filter((op) => op.isActive && op.role === 'OPERATOR');
    if (!q) return active;
    return active.filter((op) => {
      const name = `${op.firstName} ${op.lastName}`.toLowerCase();
      return [name, op.email || '', op.reportTag?.label || '']
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [operators, query]);

  const showToast = (type: string, message: string, description?: string) => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { type, message, description } }));
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersData, contractsData, templateData] = await Promise.all([
        apiFetch('/api/users'),
        apiFetch('/api/contracts'),
        apiFetch('/api/contracts/template/default').catch(() => null)
      ]);
      const operatorsList = Array.isArray(usersData)
        ? (usersData as Operator[]).filter((u) => u.role === 'OPERATOR')
        : [];
      setOperators(operatorsList);
      setContracts(Array.isArray(contractsData) ? contractsData : []);
      if (templateData?.templateContent) {
        setTemplateName(templateData.templateName || 'Contrato AD Global Pay');
        setTemplateVersion(templateData.templateVersion || 'v1');
        setTemplateContent(templateData.templateContent);
      }
    } catch (err: any) {
      setError(err.message || 'Error cargando contratos');
    } finally {
      setLoading(false);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const scale = window.devicePixelRatio || 1;
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    hasSignatureRef.current = false;
  };

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * scale));
    canvas.height = Math.max(1, Math.floor(rect.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(scale, scale);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    hasSignatureRef.current = false;
  };

  const pointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const { x, y } = pointerPosition(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pointerPosition(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasSignatureRef.current = true;
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  const resetForm = () => {
    setAcceptedTerms(false);
    clearSignature();
  };

  const saveContract = async () => {
    if (!selectedOperator) {
      showToast('warning', 'Operador requerido', 'Selecciona un operador para generar el contrato.');
      return;
    }
    if (!acceptedTerms || !hasSignatureRef.current) {
      showToast('warning', 'Firma incompleta', 'Aceptacion y firma digital son obligatorias.');
      return;
    }

    setSaving(true);
    try {
      const signatureDataUrl = canvasRef.current!.toDataURL('image/png');
      const signerName = `${selectedOperator.firstName} ${selectedOperator.lastName}`.trim();
      const contract = await apiFetch('/api/contracts', {
        method: 'POST',
        body: JSON.stringify({
          signerId: selectedOperator.id,
          templateName,
          templateVersion,
          templateContent,
          signerName,
          signerEmail: selectedOperator.email,
          signerDocument: selectedOperator.reportTag?.label || null,
          acceptedTerms,
          signatureDataUrl
        })
      });
      setContracts((prev) => [contract, ...prev]);
      resetForm();
      showToast('success', 'Contrato firmado', 'El PDF fue generado y guardado.');
    } catch (err: any) {
      showToast('error', 'Error al crear contrato', err.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setupCanvas();
    const onResize = () => setupCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-sm font-bold text-slate-500">Cargando contratos...</span>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">{error}</div>;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600 md:p-2.5">
              <FileSignature className="h-5 w-5 md:h-6 md:w-6" />
            </span>
            Contratos
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500 md:text-base">Firma digital de operadores, plantilla y PDF contractual.</p>
        </div>
        <button onClick={loadData} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div className="mb-4">
            <h2 className="text-base font-extrabold text-slate-800">Operador firmante</h2>
            <p className="text-xs font-medium text-slate-400">Busca y selecciona el operador que firma.</p>
          </div>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              placeholder="Nombre, email, tag..."
            />
          </div>
          <div className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
            {filteredOperators.map((op) => {
              const active = selectedOperatorId === op.id;
              const name = `${op.firstName} ${op.lastName}`.trim();
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setSelectedOperatorId(op.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition-all ${
                    active ? 'border-indigo-300 bg-indigo-50 shadow-sm' : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white'
                  }`}
                >
                  <p className="text-sm font-extrabold text-slate-800">{name}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">{op.email || 'Sin email'}</p>
                  {op.reportTag && (
                    <span className={`mt-2 inline-flex rounded-md border px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wider ${op.reportTag.color}`}>
                      {op.reportTag.label}
                    </span>
                  )}
                </button>
              );
            })}
            {filteredOperators.length === 0 && (
              <div className="py-8 text-center text-xs font-bold text-slate-400">No hay operadores disponibles.</div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] md:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[0.65rem] font-black uppercase tracking-wider text-slate-400">Nombre plantilla</span>
              <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[0.65rem] font-black uppercase tracking-wider text-slate-400">Versión</span>
              <input value={templateVersion} onChange={(e) => setTemplateVersion(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[0.65rem] font-black uppercase tracking-wider text-slate-400">Plantilla</span>
              <textarea value={templateContent} onChange={(e) => setTemplateContent(e.target.value)} rows={9} className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium leading-6 text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10" />
            </label>
          </div>

          {selectedOperator && (
            <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              <p className="text-[0.65rem] font-black uppercase tracking-wider text-indigo-500">Firmante</p>
              <p className="mt-1 text-base font-extrabold text-slate-800">{selectedOperator.firstName} {selectedOperator.lastName}</p>
              <p className="text-xs font-semibold text-slate-500">{selectedOperator.email}</p>
              {selectedOperator.reportTag && (
                <span className={`mt-2 inline-flex rounded-md border px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wider ${selectedOperator.reportTag.color}`}>
                  {selectedOperator.reportTag.label}
                </span>
              )}
            </div>
          )}

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[0.65rem] font-black uppercase tracking-wider text-slate-400">Firma digital</span>
            </div>
            <canvas
              ref={canvasRef}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
              className="h-40 w-full touch-none rounded-2xl border-2 border-dashed border-slate-200 bg-white"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="h-4 w-4 rounded accent-indigo-600" />
              Acepta la plantilla y firma digitalmente
            </label>
            <button disabled={saving} onClick={saveContract} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar contrato
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] md:p-6">
        <h2 className="mb-4 text-lg font-extrabold text-slate-800">Contratos firmados</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[0.65rem] font-black uppercase tracking-wider text-slate-400">
                <th className="pb-3">Fecha</th>
                <th className="pb-3">Operador</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Plantilla</th>
                <th className="pb-3">Tag</th>
                <th className="pb-3 text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {contracts.map((contract) => (
                <tr key={contract.id} className="text-sm">
                  <td className="py-3 font-semibold text-slate-500">{new Date(contract.signedAt).toLocaleDateString('es-ES')}</td>
                  <td className="py-3 font-extrabold text-slate-800">{contract.signer.firstName} {contract.signer.lastName}</td>
                  <td className="py-3 font-semibold text-slate-600">{contract.signer.email}</td>
                  <td className="py-3 text-slate-500">{contract.templateName} · {contract.templateVersion}</td>
                  <td className="py-3">
                    {contract.signerTagLabel ? (
                      <span className="inline-flex rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wider text-indigo-700">
                        {contract.signerTagLabel}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-300">Sin tag</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    {contract.pdfUrl ? (
                      <a href={contract.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100">
                        Abrir <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs font-bold text-slate-300">Pendiente</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {contracts.length === 0 && (
            <div className="py-10 text-center text-sm font-bold text-slate-400">Todavia no hay contratos firmados.</div>
          )}
        </div>
      </section>
    </div>
  );
}

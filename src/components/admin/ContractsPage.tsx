import React, { useEffect, useMemo, useState } from 'react';
import { FileSignature, Loader2, RefreshCw, Send, FileText, Search, ExternalLink, CheckCircle2, Clock, AlertCircle, X } from 'lucide-react';
import { apiFetch } from '../../lib/auth';

type InvitationStatus = 'NONE' | 'SENT' | 'SIGNED' | 'EXPIRED' | 'CANCELLED';

interface Operator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  reportTag?: { id: string; label: string; color: string } | null;
}

interface InvitationState {
  status: InvitationStatus;
  sentAt?: string;
  expiresAt?: string;
  signedAt?: string;
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
  const [operators, setOperators] = useState<Operator[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invitations, setInvitations] = useState<Record<string, InvitationState>>({});
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [templateName, setTemplateName] = useState('Contrato AD Global Pay');
  const [templateVersion, setTemplateVersion] = useState('v1');
  const [templateContent, setTemplateContent] = useState(emptyTemplate);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [previewContract, setPreviewContract] = useState<Contract | null>(null);

  const selectedOperator = useMemo(
    () => operators.find((op) => op.id === selectedOperatorId) || null,
    [operators, selectedOperatorId]
  );

  const signedOperatorIds = useMemo(() => {
    return new Set(contracts.map((c) => c.signer.id));
  }, [contracts]);

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

  const loadInvitations = async (ops: Operator[]) => {
    const results = await Promise.all(
      ops.map(async (op) => {
        try {
          const data = await apiFetch(`/api/contracts/invitations/status/${op.id}`);
          return [op.id, (data || { status: 'NONE' }) as InvitationState] as const;
        } catch {
          return [op.id, { status: 'NONE' } as InvitationState] as const;
        }
      })
    );
    const map: Record<string, InvitationState> = {};
    for (const [id, state] of results) map[id] = state;
    setInvitations(map);
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
        ? (usersData as Operator[]).filter((u) => u.role === 'OPERATOR' && u.isActive)
        : [];
      setOperators(operatorsList);
      setContracts(Array.isArray(contractsData) ? contractsData : []);
      if (templateData?.templateContent) {
        setTemplateName(templateData.templateName || 'Contrato AD Global Pay');
        setTemplateVersion(templateData.templateVersion || 'v1');
        setTemplateContent(templateData.templateContent);
      }
      await loadInvitations(operatorsList);
    } catch (err: any) {
      setError(err.message || 'Error cargando contratos');
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async (op: Operator) => {
    setSendingId(op.id);
    try {
      const invitation = await apiFetch('/api/contracts/invitations', {
        method: 'POST',
        body: JSON.stringify({
          signerId: op.id,
          templateName,
          templateVersion,
          templateContent
        })
      });
      setInvitations((prev) => ({
        ...prev,
        [op.id]: {
          status: invitation.status || 'SENT',
          sentAt: invitation.sentAt,
          expiresAt: invitation.expiresAt
        }
      }));
      showToast('success', 'Invitacion enviada', `Se envio el contrato a ${op.firstName} ${op.lastName}.`);
    } catch (err: any) {
      showToast('error', 'No se pudo enviar', err.message);
    } finally {
      setSendingId(null);
    }
  };

  const getStatus = (op: Operator): { key: 'signed' | 'sent' | 'none' | 'expired'; label: string; tone: 'green' | 'amber' | 'red' } => {
    if (signedOperatorIds.has(op.id)) return { key: 'signed', label: 'Firmado', tone: 'green' };
    const inv = invitations[op.id];
    if (inv?.status === 'SENT') return { key: 'sent', label: 'Invitacion enviada', tone: 'amber' };
    if (inv?.status === 'EXPIRED' || inv?.status === 'CANCELLED') return { key: 'expired', label: 'Sin contrato', tone: 'red' };
    return { key: 'none', label: 'Sin contrato', tone: 'red' };
  };

  useEffect(() => {
    void loadData();
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
          <p className="mt-2 text-sm font-medium text-slate-500 md:text-base">Estado de contratos por operador, invitaciones por correo y PDF contractual.</p>
        </div>
        <button onClick={loadData} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div className="mb-4">
            <h2 className="text-base font-extrabold text-slate-800">Operadores</h2>
            <p className="text-xs font-medium text-slate-400">Estado del contrato por operador.</p>
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
          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {filteredOperators.map((op) => {
              const status = getStatus(op);
              const name = `${op.firstName} ${op.lastName}`.trim();
              const isSending = sendingId === op.id;
              const toneClasses = {
                green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                amber: 'bg-amber-50 text-amber-700 border-amber-200',
                red: 'bg-rose-50 text-rose-700 border-rose-200'
              }[status.tone];
              const iconNode =
                status.tone === 'green' ? <CheckCircle2 className="h-4 w-4" /> :
                status.tone === 'amber' ? <Clock className="h-4 w-4" /> :
                <AlertCircle className="h-4 w-4" />;
              return (
                <div
                  key={op.id}
                  className={`rounded-2xl border p-3 transition-all ${
                    selectedOperatorId === op.id ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedOperatorId(op.id)}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-extrabold text-slate-800">{name}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">{op.email}</p>
                      {op.reportTag && (
                        <span className={`mt-2 inline-flex rounded-md border px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wider ${op.reportTag.color}`}>
                          {op.reportTag.label}
                        </span>
                      )}
                    </button>
                    <div className="flex flex-col items-end gap-2">
                      {status.key === 'signed' ? (
                        <button
                          type="button"
                          onClick={() => {
                            const c = contracts.find((ct) => ct.signer.id === op.id);
                            if (c) setPreviewContract(c);
                          }}
                          title={status.label}
                          className={`inline-flex items-center justify-center rounded-full border p-1.5 transition-all hover:scale-110 ${toneClasses}`}
                        >
                          {iconNode}
                        </button>
                      ) : (
                        <span
                          title={status.label}
                          className={`inline-flex items-center justify-center rounded-full border p-1.5 ${toneClasses}`}
                        >
                          {iconNode}
                        </span>
                      )}
                      {status.key !== 'signed' && (
                        <button
                          type="button"
                          onClick={() => sendInvitation(op)}
                          disabled={isSending}
                          title="Enviar contrato por correo"
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-[0.65rem] font-black uppercase tracking-wider text-indigo-700 transition-all hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          {status.key === 'sent' ? 'Reenviar' : 'Enviar'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredOperators.length === 0 && (
              <div className="py-8 text-center text-xs font-bold text-slate-400">No hay operadores disponibles.</div>
            )}
          </div>

          <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-[0.65rem] font-bold text-slate-500">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Verde: contrato firmado</div>
            <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-amber-600" /> Amarillo: invitacion enviada</div>
            <div className="flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5 text-rose-600" /> Rojo: pendiente de enviar</div>
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
              <textarea value={templateContent} onChange={(e) => setTemplateContent(e.target.value)} rows={11} className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium leading-6 text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10" />
            </label>
          </div>

          {selectedOperator && (
            <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              <p className="text-[0.65rem] font-black uppercase tracking-wider text-indigo-500">Operador seleccionado</p>
              <p className="mt-1 text-base font-extrabold text-slate-800">{selectedOperator.firstName} {selectedOperator.lastName}</p>
              <p className="text-xs font-semibold text-slate-500">{selectedOperator.email}</p>
              {(() => {
                const status = getStatus(selectedOperator);
                const toneClasses = {
                  green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                  amber: 'bg-amber-100 text-amber-700 border-amber-200',
                  red: 'bg-rose-100 text-rose-700 border-rose-200'
                }[status.tone];
                return (
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wider ${toneClasses}`}>
                      {status.tone === 'green' ? <CheckCircle2 className="h-3 w-3" /> :
                       status.tone === 'amber' ? <Clock className="h-3 w-3" /> :
                       <AlertCircle className="h-3 w-3" />}
                      {status.label}
                    </span>
                    {status.key !== 'signed' && (
                      <button
                        type="button"
                        onClick={() => sendInvitation(selectedOperator)}
                        disabled={sendingId === selectedOperator.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {sendingId === selectedOperator.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        {status.key === 'sent' ? 'Reenviar invitacion' : 'Enviar invitacion'}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
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

      {previewContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4" onClick={() => setPreviewContract(null)}>
          <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-400">{previewContract.templateName} · {previewContract.templateVersion}</p>
                <h3 className="text-lg font-extrabold text-slate-800">{previewContract.signer.firstName} {previewContract.signer.lastName}</h3>
                <p className="text-xs font-semibold text-slate-500">Firmado el {new Date(previewContract.signedAt).toLocaleString('es-ES')}</p>
              </div>
              <div className="flex items-center gap-2">
                {previewContract.pdfUrl && (
                  <a
                    href={previewContract.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                  >
                    Abrir en nueva pestaña <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewContract(null)}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>
            <div className="flex-1 bg-slate-100">
              {previewContract.pdfUrl ? (
                <iframe
                  src={previewContract.pdfUrl}
                  title="Contrato firmado"
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">PDF no disponible todavia.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

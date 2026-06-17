import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, FileSignature, Loader2 } from 'lucide-react';

interface InvitationData {
  id: string;
  status: 'SENT' | 'SIGNED' | 'EXPIRED' | 'CANCELLED';
  templateName: string;
  templateVersion: string;
  templateContent: string;
  signer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    reportTag?: { id: string; label: string; color: string } | null;
  };
  sentAt: string;
  expiresAt: string;
  signedAt: string | null;
}

interface PublicContractSignerProps {
  apiUrl: string;
}

export default function PublicContractSigner({ apiUrl }: PublicContractSignerProps) {
  const [token, setToken] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasSignatureRef = useRef(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [signed, setSigned] = useState(false);

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

  const submit = async () => {
    if (!invitation) return;
    if (!acceptedTerms || !hasSignatureRef.current) {
      setSubmitError('Debes aceptar los terminos y firmar antes de enviar.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const signatureDataUrl = canvasRef.current!.toDataURL('image/png');
      const resp = await fetch(`${apiUrl.replace(/\/$/, '')}/api/contracts/invitations/sign-by-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signatureDataUrl, acceptedTerms: true })
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `Error ${resp.status}`);
      }
      setSigned(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Error al firmar');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setLoadError('Falta el token de invitacion en la URL.');
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const resp = await fetch(`${apiUrl.replace(/\/$/, '')}/api/contracts/invitations/by-token/${token}`);
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.error || `Error ${resp.status}`);
        }
        const data = (await resp.json()) as InvitationData;
        if (mounted) setInvitation(data);
      } catch (err: any) {
        if (mounted) setLoadError(err.message || 'No se pudo cargar la invitacion');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token, apiUrl]);

  useEffect(() => {
    if (invitation && invitation.status === 'SENT') {
      setupCanvas();
      const onResize = () => setupCanvas();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
  }, [invitation?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-sm font-bold text-slate-500">Cargando invitacion...</span>
      </div>
    );
  }

  if (loadError || !invitation) {
    return (
      <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-rose-500" />
        <h1 className="mt-4 text-xl font-extrabold text-rose-700">No pudimos cargar la invitacion</h1>
        <p className="mt-2 text-sm text-rose-600">{loadError || 'El enlace puede haber expirado o ya no es valido.'}</p>
      </div>
    );
  }

  if (signed || invitation.status === 'SIGNED') {
    return (
      <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="mt-4 text-2xl font-extrabold text-emerald-700">Contrato firmado</h1>
        <p className="mt-2 text-sm text-emerald-700">
          Gracias, {invitation.signer.firstName}. Hemos registrado tu firma digital exitosamente. Te enviamos una copia del PDF a {invitation.signer.email}.
        </p>
      </div>
    );
  }

  if (invitation.status === 'EXPIRED' || invitation.status === 'CANCELLED') {
    return (
      <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="mt-4 text-xl font-extrabold text-amber-700">Invitacion no disponible</h1>
        <p className="mt-2 text-sm text-amber-700">
          Esta invitacion ha {invitation.status === 'EXPIRED' ? 'expirado' : 'sido cancelada'}. Solicita una nueva desde el panel de administracion.
        </p>
      </div>
    );
  }

  const expiresDate = new Date(invitation.expiresAt).toLocaleString('es-ES');

  return (
    <div className="mx-auto mt-8 max-w-3xl space-y-6">
      <header className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-8 text-white">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-white/10 p-2">
            <FileSignature className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">AD Global Pay</p>
            <h1 className="text-2xl font-extrabold">Firma tu contrato</h1>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-200">
          Hola <strong className="text-white">{invitation.signer.firstName} {invitation.signer.lastName}</strong>, te enviamos tu contrato de servicios para firma digital. El enlace es valido hasta {expiresDate}.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[0.65rem] font-black uppercase tracking-wider text-slate-400">{invitation.templateName} · {invitation.templateVersion}</p>
        <pre className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{invitation.templateContent}</pre>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-2 text-[0.65rem] font-black uppercase tracking-wider text-slate-400">Firma digital</p>
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          className="h-44 w-full touch-none rounded-2xl border-2 border-dashed border-slate-200 bg-white"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={clearSignature}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Limpiar firma
          </button>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="h-4 w-4 rounded accent-indigo-600" />
            Acepto el contrato y firmo digitalmente
          </label>
        </div>
        {submitError && <p className="mt-3 text-sm font-bold text-rose-600">{submitError}</p>}
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
          Enviar firma
        </button>
      </section>
    </div>
  );
}

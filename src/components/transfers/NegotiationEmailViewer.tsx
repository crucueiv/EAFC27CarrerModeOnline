"use client";

export interface NegotiationEmailViewerProps {
  fromName: string;
  subject: string;
  body: string;
  deliveredAtIso?: string;
  onAccept: () => void;
  onDeny: () => void;
  onCounter: () => void;
  disabled?: boolean;
  counterDisabled?: boolean;
}

export function NegotiationEmailViewer(props: NegotiationEmailViewerProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">De</p>
          <p className="text-sm font-semibold text-slate-100">{props.fromName}</p>
        </div>
        {props.deliveredAtIso ? (
          <p className="text-[10px] text-slate-500">
            Entregado: {new Date(props.deliveredAtIso).toLocaleString("es-ES")}
          </p>
        ) : null}
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1">Asunto</p>
        <p className="text-sm text-slate-100 bg-slate-800/60 rounded px-3 py-2">{props.subject}</p>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1">Cuerpo</p>
        <pre className="text-sm text-slate-200 whitespace-pre-wrap bg-slate-800/60 rounded px-3 py-2 font-sans">
          {props.body}
        </pre>
      </div>
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          onClick={props.onDeny}
          disabled={props.disabled}
          className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold"
        >
          Denegar
        </button>
        <button
          type="button"
          onClick={props.onCounter}
          disabled={props.disabled || props.counterDisabled}
          className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold"
        >
          Contraofertar
        </button>
        <button
          type="button"
          onClick={props.onAccept}
          disabled={props.disabled}
          className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}

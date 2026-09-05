"use client";
import { useMemo, useState } from "react";
import {
  NEGOTIATION_EMAIL_TEMPLATES,
  type NegotiationEmailContext,
  type NegotiationEmailTemplateId,
} from "@/lib/transfers/emailTemplates";

export interface NegotiationEmailComposerProps {
  context: NegotiationEmailContext;
  onSend: (args: {
    templateId: NegotiationEmailTemplateId;
    subject: string;
    body: string;
  }) => Promise<void> | void;
  disabled?: boolean;
  defaultTemplateId?: NegotiationEmailTemplateId;
  excludedTemplateId?: NegotiationEmailTemplateId | null;
}

export function NegotiationEmailComposer(props: NegotiationEmailComposerProps) {
  const allowedKinds: ("TRANSFER" | "LOAN" | "BOTH")[] =
    props.context.kind === "TRANSFER"
      ? ["TRANSFER", "BOTH"]
      : ["LOAN", "BOTH"];
  const candidates = useMemo(() => {
    const filtered = NEGOTIATION_EMAIL_TEMPLATES.filter(
      (t) => allowedKinds.includes(t.kind),
    );
    return props.excludedTemplateId
      ? filtered.filter((t) => t.id !== props.excludedTemplateId)
      : filtered;
  }, [props.excludedTemplateId, props.context.kind]);

  const [templateId, setTemplateId] = useState<NegotiationEmailTemplateId>(() => {
    if (
      props.defaultTemplateId &&
      candidates.some((t) => t.id === props.defaultTemplateId)
    ) {
      return props.defaultTemplateId;
    }
    if (props.context.kind === "LOAN") return "BRIEF";
    return candidates[0]?.id ?? "FORMAL_DS";
  });

  const template = useMemo(
    () => NEGOTIATION_EMAIL_TEMPLATES.find((t) => t.id === templateId) ?? candidates[0],
    [templateId, candidates],
  );

  if (!template) return null;

  const subject = template.subject(props.context);
  const body = template.body(props.context);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-400">Plantilla:</label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value as NegotiationEmailTemplateId)}
          disabled={props.disabled}
          className="bg-slate-800 text-slate-100 text-sm rounded px-2 py-1 border border-slate-700"
        >
          {candidates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1">Asunto</p>
        <p className="text-sm text-slate-100 bg-slate-800/60 rounded px-3 py-2">{subject}</p>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1">Cuerpo</p>
        <pre className="text-sm text-slate-200 whitespace-pre-wrap bg-slate-800/60 rounded px-3 py-2 font-sans">
          {body}
        </pre>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={props.disabled}
          onClick={() => props.onSend({ templateId, subject, body })}
          className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold"
        >
          Enviar correo
        </button>
      </div>
    </div>
  );
}

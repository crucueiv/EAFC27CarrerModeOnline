"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { TransferPlayerResult } from "@/lib/transfers/search";
import type { PlayerScoutingData } from "@/lib/scouting/getPlayerScoutingData";
import PlayerOverallBadge from "@/components/players/PlayerOverallBadge";
import { ClubNegotiationModal } from "./ClubNegotiationModal";
import LoanNegotiationModal from "./LoanNegotiationModal";
import { NegotiationEmailComposer } from "./NegotiationEmailComposer";
import { HumanEmailLoanDialog } from "./HumanEmailLoanDialog";
import type { NegotiationEmailContext } from "@/lib/transfers/emailTemplates";

const statLabels = [
  ["pace", "PAC"],
  ["shooting", "SHO"],
  ["passing", "PAS"],
  ["dribbling", "DRI"],
  ["defending", "DEF"],
  ["physical", "PHY"]
] as const;

function formatPrice(price: number) {
  if (price <= 0) return "€0";
  if (price >= 1_000_000) return `€${(price / 1_000_000).toFixed(price >= 10_000_000 ? 0 : 1)}M`;
  if (price >= 1_000) return `€${Math.round(price / 1000)}K`;
  return `€${Math.round(price)}`;
}

function formatSalary(salary: number) {
  return `${formatPrice(salary)}/sem`;
}

type TransferPhase = "IDLE" | "CONTRACT_PENDING" | "OWN_PLAYER";

export default function PlayerDetailModal({
  player,
  onClose,
  ownClubTeamId = null,
}: {
  player: TransferPlayerResult;
  onClose: () => void;
  ownClubTeamId?: string | null;
}) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [scouting, setScouting] = useState<PlayerScoutingData | null>(null);
  const [loadingScouting, setLoadingScouting] = useState(true);
  const [budgetInfo, setBudgetInfo] = useState<{
    total: number;
    committed: number;
    free: number;
  }>({ total: 0, committed: 0, free: 0 });
  const [userTeam, setUserTeam] = useState<{
    id: string | null;
    name: string | null;
    imageUrl: string | null;
    primaryColor: string | null;
    shortName: string | null;
  } | null>(null);

  // Modal dialog states
  const [activeDialog, setActiveDialog] = useState<"NONE" | "CLAUSE_CONFIRM" | "HUMAN_EMAIL" | "LOAN" | "LOAN_FORM" | "BUYOUT_RESULT">(
    "NONE"
  );
  const [buyoutResultMsg, setBuyoutResultMsg] = useState("");
  const [processingBuyout, setProcessingBuyout] = useState(false);
  const [loanProposalData, setLoanProposalData] = useState<any>(null);
  const [loadingLoanProposal, setLoadingLoanProposal] = useState(false);
  const [loanError, setLoanError] = useState<string | null>(null);
  const [humanEmailError, setHumanEmailError] = useState<string | null>(null);
  const [humanEmailSending, setHumanEmailSending] = useState(false);
  const [rivalManagerName, setRivalManagerName] = useState<string | null>(null);
  const [rivalManagerAvatarUrl, setRivalManagerAvatarUrl] = useState<string | null>(null);

  const isHumanRival = Boolean(player.currentTeam?.managerId);

  // Bloquea re-negociación con el club tras cerrar un acuerdo o pagar cláusula.
  // Solo permite abrir el diálogo de inicio de contrato (que ya no es con el club).
  const [transferPhase, setTransferPhase] = useState<TransferPhase>("IDLE");

  // BUG FIX (bug 1): marca si ya hay una cesión activa para este jugador
  // y bloquea el botón "Contactar para cesión" en consecuencia. Se consulta
  // en paralelo al estado de transferencia.
  const [activeLoanId, setActiveLoanId] = useState<string | null>(null);
  const [activeLoanStatus, setActiveLoanStatus] = useState<string | null>(null);

  // Mientras se consulta el estado del transfer, mostramos un placeholder neutro
  // para no exponer los botones de "Contactar para transferencia/cesión" durante
  // el flash entre montaje y respuesta de /api/transfers/active.
  const [isLoadingPhase, setIsLoadingPhase] = useState(true);

  const isFreeAgent = player.currentTeam?.eaId === "FREE_AGENTS";
  const sellerTeamName = isFreeAgent ? "Agente libre" : (player.currentTeam?.name || "Club Propietario");
  const isOwnPlayer = Boolean(
    ownClubTeamId && player.currentTeam?.id === ownClubTeamId,
  );

  useEffect(() => {
    let isMounted = true;
    setLoadingScouting(true);
    fetch(`/api/players/${player.id}/scouting`)
      .then((res) => res.json())
      .then((data: PlayerScoutingData) => {
        if (isMounted) {
          setScouting(data);
          setLoadingScouting(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setScouting({
            hasData: false,
            matchesPlayed: 0,
            goals: 0,
            assists: 0,
            yellowCards: 0,
            redCards: 0,
            positionPercentages: []
          });
          setLoadingScouting(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [player.id]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/team/own")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: {
        ownClubTeamId?: string | null;
        ownClubTeamName?: string | null;
        ownClubTeamImageUrl?: string | null;
        ownClubTeamPrimaryColor?: string | null;
        ownClubTeamShortName?: string | null;
        ownClubTeamBudget?: number;
        ownClubTeamCommittedBudget?: number;
        ownClubTeamFreeBudget?: number;
      } | null) => {
        if (cancelled) return;
        if (!data || !data.ownClubTeamId) {
          setUserTeam(null);
          setBudgetInfo({ total: 0, committed: 0, free: 0 });
          return;
        }
        setUserTeam({
          id: data.ownClubTeamId,
          name: data.ownClubTeamName ?? null,
          imageUrl: data.ownClubTeamImageUrl ?? null,
          primaryColor: data.ownClubTeamPrimaryColor ?? null,
          shortName: data.ownClubTeamShortName ?? null,
        });
        setBudgetInfo({
          total: Number(data.ownClubTeamBudget ?? 0),
          committed: Number(data.ownClubTeamCommittedBudget ?? 0),
          free: Number(data.ownClubTeamFreeBudget ?? 0),
        });
      })
      .catch(() => {
        if (!cancelled) {
          setUserTeam(null);
          setBudgetInfo({ total: 0, committed: 0, free: 0 });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pre-carga el manager del club rival para que esté disponible al abrir los
  // modales de transferencia y cesión. Sin esto, los modales arrancan con
  // "Cargando Mánager..." y un avatar vacío hasta que hacen su propio fetch,
  // lo que provoca parpadeos y, en algunos casos, que no se muestren los datos
  // del manager aunque existan en la DB.
  useEffect(() => {
    let cancelled = false;
    const teamId = player.currentTeam?.id;
    if (!teamId || isFreeAgent) {
      setRivalManagerName(null);
      setRivalManagerAvatarUrl(null);
      return () => {
        cancelled = true;
      };
    }
    setRivalManagerName(null);
    setRivalManagerAvatarUrl(null);
    fetch(`/api/managers/${encodeURIComponent(teamId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((mgr: { name?: string; avatarUrl?: string | null } | null) => {
        if (cancelled || !mgr) return;
        if (mgr.name) setRivalManagerName(mgr.name);
        if (mgr.avatarUrl) setRivalManagerAvatarUrl(mgr.avatarUrl);
      })
      .catch(() => {
        /* fallback inside modal */
      });
    return () => {
      cancelled = true;
    };
  }, [player.currentTeam?.id, isFreeAgent]);

  const avatar =
    player.avatarUrl ||
    (player.eaId
      ? `https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p${player.eaId}.png`
      : "/player-placeholder.svg");

  // Comprueba si ya hay un transfer activo para evitar re-negociación con el club.
  // Si lo hay, vamos directamente a fase de contrato.
  useEffect(() => {
    let cancelled = false;
    if (isOwnPlayer) {
      setIsLoadingPhase(false);
      setActiveLoanId(null);
      setActiveLoanStatus(null);
      return;
    }
    setIsLoadingPhase(true);
    setTransferPhase("IDLE");
    setActiveLoanId(null);
    setActiveLoanStatus(null);
    const transferParams = new URLSearchParams({ playerId: player.id });
    const loanParams = new URLSearchParams({ playerId: player.id });

    Promise.all([
      fetch(`/api/transfers/active?${transferParams.toString()}`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
      fetch(`/api/loans/active?${loanParams.toString()}`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    ])
      .then(([transferData, loanData]) => {
        if (cancelled) return;
        if (transferData?.active) {
          setTransferPhase("CONTRACT_PENDING");
        }
        if (loanData?.hasActiveForPlayer) {
          setActiveLoanId(loanData.playerLoanId ?? null);
          setActiveLoanStatus(loanData.playerLoanStatus ?? null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPhase(false);
      });
    return () => {
      cancelled = true;
    };
  }, [player.id, isOwnPlayer]);

  const handleTransferClick = () => {
    if (isOwnPlayer) return;
    if (transferPhase !== "IDLE") {
      // Hay un transfer activo: la UI ya muestra el estado de negociación de contrato,
      // no se debe permitir reabrir el flujo de pago de cláusula o de club.
      return;
    }
    if (isFreeAgent) {
      // Los agentes libres no se compran: van directo a negociación de contrato.
      setActiveDialog("CLAUSE_CONFIRM");
      return;
    }
    if (budgetInfo.free >= player.releaseClause) {
      setActiveDialog("CLAUSE_CONFIRM");
    } else if (isHumanRival) {
      // El club no tiene suficiente dinero para pagar la cláusula: solo se permite
      // negociar el precio con el club vendedor. Como el rival es humano, primero
      // creamos la negociación (POST /api/transfers/complete) y luego abrimos el
      // dialog de correo con plantillas. Si falla, mostramos el error en el dialog.
      setHumanEmailError(null);
      void (async () => {
        try {
          const res = await fetch("/api/transfers/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              playerId: player.id,
              sellerTeamId: player.currentTeam?.id,
              agreedPrice: 0,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            setHumanEmailError(data.error ?? "No se pudo preparar la negociación con el club rival.");
            setActiveDialog("HUMAN_EMAIL");
            return;
          }
          if (data.canal !== "HUMAN_EMAIL") {
            setHumanEmailError("El club rival no está gestionado por un usuario humano.");
            setActiveDialog("HUMAN_EMAIL");
            return;
          }
          setPendingNegotiationId(data.negotiationId);
          setActiveDialog("HUMAN_EMAIL");
        } catch (e) {
          console.error("[PlayerDetailModal] openHumanEmailDialog failed:", e);
          setHumanEmailError("Error de red al preparar la negociación.");
          setActiveDialog("HUMAN_EMAIL");
        }
      })();
    } else {
      // IA: abre directamente la negociación telefónica.
      setActiveDialog("HUMAN_EMAIL");
    }
  };

  const canAffordClause = isFreeAgent
    ? true
    : budgetInfo.free >= player.releaseClause;

  const transferButtonLabel = isFreeAgent
    ? `Iniciar negociación de contrato con ${player.name}`
    : canAffordClause
      ? `Pagar cláusula de ${formatPrice(player.releaseClause)} a ${sellerTeamName}`
      : `Negociar precio con ${sellerTeamName}`;

  const handleLoanClick = async () => {
    if (isOwnPlayer || transferPhase !== "IDLE") return;
    if (activeLoanId) {
      setLoanError("Ya tienes una cesión activa para este jugador. Revisa tu Sección de Correos para aceptarla o rechazarla.");
      setActiveDialog("NONE");
      return;
    }
    if (isHumanRival && !isFreeAgent) {
      setLoanError(null);
      setActiveDialog("LOAN_FORM");
      return;
    }
    setActiveDialog("LOAN");
    setLoadingLoanProposal(true);
    setLoanError(null);
    try {
      const res = await fetch("/api/loans/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          duration: "ONE_YEAR",
          wageShareBuyerPct: 50,
          hasBuyOption: false,
        }),
      });
      const data = await res.json();
      setLoadingLoanProposal(false);
      if (data.error) {
        if (data.error === "loan-already-active") {
          setActiveLoanId(data.loanId ?? null);
          setActiveLoanStatus(data.status ?? null);
          setLoanError(
            data.reason || "Ya tienes una cesión activa para este jugador.",
          );
          setActiveDialog("NONE");
          return;
        }
        setLoanError(
          data.reason ||
            (data.error === "transfer-window-closed"
              ? "El mercado de fichajes está cerrado."
              : `Error al solicitar cesión: ${data.error}`)
        );
      } else {
        setLoanProposalData(data);
      }
    } catch {
      setLoadingLoanProposal(false);
      setLoanError("Ocurrió un error al intentar iniciar las negociaciones de cesión.");
    }
  };

  const handleSendHumanLoan = async (args: {
    duration: "SHORT_TERM" | "ONE_YEAR" | "TWO_YEARS";
    wageShareBuyerPct: number;
    hasBuyOption: boolean;
    buyOptionPrice: number | null;
  }) => {
    setLoadingLoanProposal(true);
    setLoanError(null);
    try {
      const res = await fetch("/api/loans/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          duration: args.duration,
          wageShareBuyerPct: args.wageShareBuyerPct,
          hasBuyOption: args.hasBuyOption,
          buyOptionPrice: args.buyOptionPrice,
        }),
      });
      const data = await res.json();
      setLoadingLoanProposal(false);
      if (data.error) {
        if (data.error === "loan-already-active") {
          setActiveLoanId(data.loanId ?? null);
          setActiveLoanStatus(data.status ?? null);
          setLoanError(
            data.reason || "Ya tienes una cesión activa para este jugador.",
          );
          setActiveDialog("NONE");
          return;
        }
        setLoanError(
          data.reason ||
            (data.error === "transfer-window-closed"
              ? "El mercado de fichajes está cerrado."
              : `Error al solicitar cesión: ${data.error}`),
        );
        return;
      }
      if (data.canal === "HUMAN_EMAIL") {
        setTransferPhase("CONTRACT_PENDING");
        setBuyoutResultMsg(
          `Correo enviado a ${sellerTeamName} con tu propuesta de cesión. Espera su respuesta en tu Sección de Correos.`,
        );
        setActiveDialog("BUYOUT_RESULT");
        return;
      }
      if (data.ineligible) {
        setLoanProposalData(data);
        setActiveDialog("LOAN");
        return;
      }
      setLoanProposalData(data);
      setActiveDialog("LOAN");
    } catch {
      setLoadingLoanProposal(false);
      setLoanError("Ocurrió un error al intentar iniciar las negociaciones de cesión.");
    }
  };

  const handleConfirmBuyoutYes = async () => {
    setProcessingBuyout(true);
    try {
      const res = await fetch("/api/transfers/buyout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          releaseClause: isFreeAgent ? 0 : player.releaseClause
        })
      });

      const data = await res.json();
      setProcessingBuyout(false);

      if (data.success) {
        if (data.remainingBudget !== undefined) {
          setBudgetInfo((prev) => ({
            total: data.remainingBudget,
            committed: 0,
            free: data.remainingBudget,
          }));
        }
        setTransferPhase("CONTRACT_PENDING");

        setBuyoutResultMsg(
          isFreeAgent
            ? `Has iniciado la negociación de contrato con el agente libre. Se ha enviado una notificación a tu Sección de Correos para definir las condiciones salariales con el jugador.`
            : `¡Cláusula abonada! Has pagado la cláusula de rescisión de ${formatPrice(
                player.releaseClause
              )}. Se ha enviado una notificación formal a tu Sección de Correos para iniciar la negociación de contrato con el agente del jugador.`
        );
      } else {
        setBuyoutResultMsg(data.message || "No se pudo procesar la compra por cláusula.");
      }
    } catch {
      setProcessingBuyout(false);
      setBuyoutResultMsg("Ocurrió un error al intentar pagar la cláusula.");
    }
    setActiveDialog("BUYOUT_RESULT");
  };

  const handleConfirmBuyoutNo = () => {
    if (isFreeAgent || transferPhase !== "IDLE") {
      setActiveDialog("NONE");
      return;
    }
    if (isHumanRival) {
      // Reutilizamos la misma lógica inline para abrir el flujo de correo.
      setHumanEmailError(null);
      void (async () => {
        try {
          const res = await fetch("/api/transfers/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              playerId: player.id,
              sellerTeamId: player.currentTeam?.id,
              agreedPrice: 0,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            setHumanEmailError(data.error ?? "No se pudo preparar la negociación con el club rival.");
            setActiveDialog("HUMAN_EMAIL");
            return;
          }
          if (data.canal !== "HUMAN_EMAIL") {
            setHumanEmailError("El club rival no está gestionado por un usuario humano.");
            setActiveDialog("HUMAN_EMAIL");
            return;
          }
          setPendingNegotiationId(data.negotiationId);
          setActiveDialog("HUMAN_EMAIL");
        } catch (e) {
          console.error("[PlayerDetailModal] openHumanEmailDialog failed:", e);
          setHumanEmailError("Error de red al preparar la negociación.");
          setActiveDialog("HUMAN_EMAIL");
        }
      })();
    } else {
      setActiveDialog("HUMAN_EMAIL");
    }
  };

  const handleAgreementReached = async (agreedPrice: number) => {
    const finalPrice = Math.min(agreedPrice, budgetInfo.free);

    try {
      const res = await fetch("/api/transfers/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          sellerTeamId: player.currentTeam?.id,
          agreedPrice: finalPrice,
        }),
      });

      const data = await res.json();
      if (data.success && data.remainingBudget !== undefined) {
        setBudgetInfo((prev) => ({
          total: data.remainingBudget,
          committed: 0,
          free: data.remainingBudget,
        }));
      }
      if (data.success) {
        if (data.canal === "HUMAN_EMAIL") {
          setTransferPhase("CONTRACT_PENDING");
          setBuyoutResultMsg(
            `Correo enviado a ${sellerTeamName} con tu oferta de traspaso. Cuando el club rival responda, recibirás la confirmación en tu Sección de Correos.`
          );
          setActiveDialog("BUYOUT_RESULT");
          return;
        }
        setTransferPhase("CONTRACT_PENDING");
        setBuyoutResultMsg(
          `Acuerdo de traspaso alcanzado con ${sellerTeamName}. Se ha enviado una notificación a tu Sección de Correos para iniciar la negociación de contrato con el jugador.`
        );
        setActiveDialog("BUYOUT_RESULT");
      }
    } catch (error) {
      console.error("Error al completar el traspaso:", error);
    }
  };

  const handleSendHumanEmail = async (args: { oferta: { dinero: number; jugadoresOfrecidos: string[] } }) => {
    if (!player.currentTeam?.managerId) {
      setHumanEmailError("El club rival no está gestionado por un usuario humano.");
      return;
    }
    setHumanEmailSending(true);
    setHumanEmailError(null);
    try {
      const res = await fetch("/api/transfers/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          negotiationId: pendingNegotiationId,
          receiverUserId: player.currentTeam.managerId,
          oferta: args.oferta,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setHumanEmailError(data.error ?? "No se pudo enviar el correo.");
        return;
      }
      setTransferPhase("CONTRACT_PENDING");
      setBuyoutResultMsg(
        `Correo enviado a ${sellerTeamName} con tu oferta. Espera la respuesta del club rival en tu Sección de Correos.`
      );
      setActiveDialog("BUYOUT_RESULT");
    } catch (e) {
      console.error("[PlayerDetailModal] human email send failed:", e);
      setHumanEmailError("Error de red al enviar el correo.");
    } finally {
      setHumanEmailSending(false);
    }
  };

  const [pendingNegotiationId, setPendingNegotiationId] = useState<string | null>(null);

  const loanLabel = isFreeAgent
    ? "Cesión no disponible para agentes libres"
    : activeLoanId
      ? "Cesión ya en curso para este jugador"
      : `Contactar con ${sellerTeamName} para cesión`;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 shadow-2xl transition-all">
        {/* Botón de Cierre */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-[var(--theme-background)] text-[var(--theme-muted)] hover:opacity-90"
          aria-label="Cerrar"
        >
          ✕
        </button>

        {/* Encabezado del Modal */}
        <div className="flex flex-wrap items-center gap-4 border-b border-[var(--theme-border)] pb-5">
          <div className="relative h-20 w-20 overflow-hidden rounded-full bg-[var(--theme-background)] shadow-inner ring-1 ring-[var(--theme-border)]">
            <Image
              src={avatarFailed ? "/player-placeholder.svg" : avatar}
              alt={`${player.name} avatar`}
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
              onError={() => setAvatarFailed(true)}
            />
          </div>

          <PlayerOverallBadge overall={player.overall} size="lg" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-2xl font-bold text-[var(--theme-foreground)]">{player.name}</h2>
              <span className="rounded bg-[var(--theme-background)] px-2.5 py-0.5 text-xs font-bold text-[var(--theme-muted)]">
                {player.position}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className={`font-bold ${isFreeAgent ? "text-[var(--theme-accent)]" : "text-emerald-600"}`}>
                {formatPrice(isFreeAgent ? 0 : player.price)}
              </span>
              <span className="font-medium text-[var(--theme-muted)]">{formatSalary(player.salary)}</span>
              {!isFreeAgent && (
                <span className="text-[var(--theme-muted)]">Cláusula {formatPrice(player.releaseClause)}</span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--theme-muted)]">
              <span className={`flex items-center gap-1.5 font-medium ${isFreeAgent ? "text-amber-700 dark:text-amber-400" : ""}`}>
                {isFreeAgent ? (
                  <img src="https://www.fifacm.com/content/media/imgs/fifa21/teams/256/l111592.png" alt="" className="h-4 w-4 object-contain" />
                ) : player.currentTeam?.imageUrl ? (
                  <img src={player.currentTeam.imageUrl} alt="" className="h-4 w-4 object-contain" />
                ) : null}
                {sellerTeamName}
              </span>
              <span>Potencial: <strong className="text-[var(--theme-foreground)]">{player.potential}</strong></span>
            </div>
          </div>
        </div>

        {/* 6 Estadísticas Principales */}
        <div className="my-4 grid grid-cols-3 gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-3 sm:grid-cols-6">
          {statLabels.map(([key, label]) => (
            <div key={key} className="min-w-0 text-center">
              <div className="flex justify-between text-[11px] font-bold text-[var(--theme-muted)]">
                <span>{label}</span>
                <span className="text-[var(--theme-foreground)]">{player.stats[key]}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--theme-muted-soft)]">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.max(0, Math.min(100, player.stats[key]))}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Sección de Ojeo */}
        <div className="mb-4 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--theme-muted)]">
            Estadísticas en los últimos 7 partidos
          </h3>

          {loadingScouting ? (
            <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-6 text-center text-sm text-[var(--theme-muted)]">
              Cargando datos de ojeo...
            </div>
          ) : !scouting || !scouting.hasData || scouting.matchesPlayed === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-center font-medium text-amber-900 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
              Aún no se ha podido ojear a este jugador, intente más tarde
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card-alt)] p-3 text-center shadow-sm">
                  <span className="block text-2xl font-black text-[var(--theme-foreground)]">{scouting.goals}</span>
                  <span className="text-xs font-semibold text-[var(--theme-muted)]">⚽ Goles</span>
                </div>
                <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card-alt)] p-3 text-center shadow-sm">
                  <span className="block text-2xl font-black text-[var(--theme-foreground)]">{scouting.assists}</span>
                  <span className="text-xs font-semibold text-[var(--theme-muted)]">🎯 Asistencias</span>
                </div>
                <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card-alt)] p-3 text-center shadow-sm">
                  <span className="block text-2xl font-black text-amber-600 dark:text-amber-400">{scouting.yellowCards}</span>
                  <span className="text-xs font-semibold text-[var(--theme-muted)]">🟨 Amarillas</span>
                </div>
                <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card-alt)] p-3 text-center shadow-sm">
                  <span className="block text-2xl font-black text-rose-600 dark:text-rose-400">{scouting.redCards}</span>
                  <span className="text-xs font-semibold text-[var(--theme-muted)]">🟥 Rojas</span>
                </div>
              </div>

              {scouting.positionPercentages.length > 0 && (
                <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card-alt)] p-3.5 shadow-sm">
                  <h4 className="mb-2 text-xs font-bold uppercase text-[var(--theme-muted)]">
                    Porcentaje de posición donde ha jugado
                  </h4>
                  <div className="space-y-2">
                    {scouting.positionPercentages.map((item) => (
                      <div key={item.position} className="flex items-center gap-3 text-xs font-medium">
                        <span className="w-10 font-bold text-[var(--theme-foreground)]">{item.position}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--theme-muted-soft)]">
                          <div
                            className="h-full rounded-full bg-indigo-600"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-[var(--theme-muted)]">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        {isLoadingPhase ? (
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-3.5 text-center text-sm text-[var(--theme-muted)]">
            Comprobando el estado de la operación...
          </div>
        ) : isOwnPlayer ? (
          <div className="rounded-xl border border-indigo-300 bg-indigo-50 p-3.5 text-center font-bold text-indigo-900 shadow-sm dark:border-indigo-500/40 dark:bg-indigo-950/40 dark:text-indigo-200">
            Este jugador ya pertenece a tu plantilla. No puedes volver a negociar por él.
          </div>
        ) : transferPhase === "CONTRACT_PENDING" ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-center font-bold text-amber-900 shadow-sm dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200">
              Esperando a negociaciones de contrato. Mira tu correo para iniciar la firma con el jugador.
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-[var(--theme-primary)] px-4 py-3 text-center font-bold text-[var(--theme-on-primary)] shadow hover:opacity-90 active:scale-[0.99] transition"
            >
              Entendido
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              onClick={handleTransferClick}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-center font-bold text-white shadow hover:bg-emerald-700 active:scale-[0.99] transition"
            >
              {transferButtonLabel}
            </button>
            <button
              onClick={handleLoanClick}
              disabled={isFreeAgent || Boolean(activeLoanId)}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-center font-bold text-white shadow hover:bg-indigo-700 active:scale-[0.99] transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loanLabel}
            </button>
          </div>
        )}
      </div>

      {/* Sub-Modal: Confirmación de Cláusula */}
      {activeDialog === "CLAUSE_CONFIRM" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 shadow-2xl space-y-5 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
              💶
            </div>
            <p className="text-base font-semibold text-[var(--theme-foreground)]">
              {isFreeAgent
                ? `Vas a iniciar la negociación de contrato con ${player.name}. Se enviará una notificación a tu Sección de Correos para definir las condiciones salariales.`
                : `El jugador tiene una cláusula de ${formatPrice(player.releaseClause)}. ¿Quieres pagarla y saltarte las negociaciones con ${sellerTeamName}?`}
            </p>
            <div className="flex justify-center gap-4 pt-2">
              <button
                disabled={processingBuyout}
                onClick={handleConfirmBuyoutYes}
                className="w-28 rounded-xl bg-emerald-600 py-2.5 font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
              >
                {processingBuyout ? "Procesando..." : "Sí"}
              </button>
              <button
                disabled={processingBuyout}
                onClick={handleConfirmBuyoutNo}
                className="w-28 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] py-2.5 font-bold text-[var(--theme-foreground)] hover:opacity-90 disabled:opacity-50"
              >
                {isFreeAgent ? "Cancelar" : "No"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Modal Telefónico de Negociación (IA) o Correo (Humano) */}
      {activeDialog === "HUMAN_EMAIL" && isHumanRival && (
        <HumanEmailTransferDialog
          context={{
            playerName: player.name,
            sourceTeamName: userTeam?.name ?? "Tu club",
            targetTeamName: sellerTeamName,
            amount: "",
            counterparties: [],
            kind: "TRANSFER",
            senderName: userTeam?.name ?? "Tu club",
          }}
          onCancel={() => setActiveDialog("NONE")}
          onSend={async ({ oferta }) => {
            await handleSendHumanEmail({ oferta });
          }}
          sending={humanEmailSending}
          errorMessage={humanEmailError}
        />
      )}
      {activeDialog === "HUMAN_EMAIL" && !isHumanRival && (
        <ClubNegotiationModal
          isOpen={true}
          player={{
            ...player,
            teamId: player.currentTeam?.id,
            teamName: sellerTeamName,
            managerName: rivalManagerName ?? undefined,
            managerAvatarUrl: rivalManagerAvatarUrl ?? undefined,
            teamCrestUrl: player.currentTeam?.imageUrl ?? null,
            teamPrimaryColor: player.currentTeam?.primaryColor ?? null,
            teamShortName: player.currentTeam?.shortName ?? null,
          }}
          maxOfferLimit={budgetInfo.free}
          totalBudget={budgetInfo.total}
          committedBudget={budgetInfo.committed}
          disabled={isOwnPlayer}
          disabledReason="Este jugador ya pertenece a tu club."
          onClose={() => setActiveDialog("NONE")}
          onAgreementReached={handleAgreementReached}
        />
      )}

      {/* Sub-Modal: Formulario de cesión para club rival humano */}
      {activeDialog === "LOAN_FORM" && isHumanRival && (
        <HumanEmailLoanDialog
          context={{
            playerName: player.name,
            sourceTeamName: userTeam?.name ?? "Tu club",
            targetTeamName: sellerTeamName,
            amount: "0",
            counterparties: [],
            kind: "LOAN",
            senderName: userTeam?.name ?? "Tu club",
          }}
          onCancel={() => setActiveDialog("NONE")}
          onSend={async (args) => {
            await handleSendHumanLoan(args);
          }}
          sending={loadingLoanProposal}
          errorMessage={loanError}
        />
      )}

      {/* Sub-Modal: Solicitud de Cesión */}
      {activeDialog === "LOAN" && (
        loadingLoanProposal ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 shadow-2xl space-y-4 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
              <h4 className="text-lg font-bold text-[var(--theme-foreground)]">Contactando con {sellerTeamName}...</h4>
              <p className="text-sm text-[var(--theme-muted)]">Iniciando negociación telefónica para la cesión de <strong>{player.name}</strong>.</p>
            </div>
          </div>
        ) : loanError ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[var(--theme-card)] p-6 shadow-2xl space-y-4 text-center">
              <h4 className="text-lg font-bold text-rose-500">No se pudo iniciar la cesión</h4>
              <p className="text-sm text-[var(--theme-muted)]">{loanError}</p>
              <button
                onClick={() => setActiveDialog("NONE")}
                className="mt-3 rounded-xl bg-slate-900 py-2.5 px-6 font-bold text-white hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : loanProposalData?.canal === "HUMAN_EMAIL" ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-[var(--theme-card)] p-6 shadow-2xl space-y-4 text-center">
              <h4 className="text-lg font-bold text-emerald-400">Correo enviado a {sellerTeamName}</h4>
              <p className="text-sm text-[var(--theme-muted)]">
                Has enviado una propuesta de cesión por <strong>{player.name}</strong> al club rival. Espera su respuesta en tu Sección de Correos.
              </p>
              <button
                onClick={() => {
                  setActiveDialog("NONE");
                  setLoanProposalData(null);
                  onClose();
                }}
                className="mt-3 rounded-xl bg-emerald-600 py-2.5 px-6 font-bold text-white hover:bg-emerald-700"
              >
                Entendido
              </button>
            </div>
          </div>
        ) : loanProposalData ? (
          <LoanNegotiationModal
            open={true}
            playerName={player.name}
            sellerTeamName={sellerTeamName}
            sellerTeamId={player.currentTeam?.id}
            sellerTeamCrestUrl={player.currentTeam?.imageUrl ?? null}
            sellerTeamPrimaryColor={player.currentTeam?.primaryColor ?? null}
            sellerTeamShortName={player.currentTeam?.shortName ?? null}
            managerName={rivalManagerName ?? undefined}
            managerAvatarUrl={rivalManagerAvatarUrl ?? undefined}
            initialMessage={loanProposalData.greeting}
            schedule={loanProposalData.schedule}
            totalWageCost={loanProposalData.totalWageCost}
            weeklyWage={loanProposalData.weeklyWage ?? 0}
            buyerWeeklyWageCost={loanProposalData.buyerWeeklyWageCost ?? 0}
            loanId={loanProposalData.loanId}
            buyerFreeBudget={budgetInfo.free}
            buyerTotalBudget={budgetInfo.total}
            buyerCommittedBudget={budgetInfo.committed}
            onClose={() => setActiveDialog("NONE")}
            onCompleted={() => {
              setActiveDialog("NONE");
              setTransferPhase("OWN_PLAYER");
              setBuyoutResultMsg(
                `¡Cesión activada! ${player.name} pasa a tu plantilla con el contrato que ya tenía en ${sellerTeamName}.`
              );
            }}
          />
        ) : null
      )}

      {/* Sub-Modal: Resultado de Cláusula */}
      {activeDialog === "BUYOUT_RESULT" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 shadow-2xl space-y-4 text-center">
            <h4 className="text-lg font-bold text-[var(--theme-foreground)]">Resultado de la Operación</h4>
            <p className="text-sm text-[var(--theme-muted)]">{buyoutResultMsg}</p>
            <button
              onClick={() => {
                setActiveDialog("NONE");
                onClose();
              }}
              className="mt-3 rounded-xl bg-emerald-600 py-2.5 px-6 font-bold text-white hover:bg-emerald-700"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HumanEmailTransferDialog({
  context,
  onCancel,
  onSend,
  sending,
  errorMessage,
}: {
  context: NegotiationEmailContext;
  onCancel: () => void;
  onSend: (args: { oferta: { dinero: number; jugadoresOfrecidos: string[] } }) => Promise<void> | void;
  sending: boolean;
  errorMessage: string | null;
}) {
  const [ofertaDinero, setOfertaDinero] = useState<string>("");
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 shadow-2xl space-y-4">
        <h4 className="text-lg font-bold text-[var(--theme-foreground)]">
          Enviar oferta a {context.targetTeamName}
        </h4>
        <p className="text-xs text-[var(--theme-muted)]">
          Estás negociando con un club gestionado por otra persona. Redacta tu oferta y envíala por correo.
        </p>
        <label className="block text-[11px] font-bold uppercase text-slate-400">
          Importe (€)
        </label>
        <input
          type="number"
          min={0}
          step={100000}
          value={ofertaDinero}
          onChange={(e) => setOfertaDinero(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          placeholder="Ej. 15000000"
        />
        <NegotiationEmailComposer
          context={{
            ...context,
            amount: ofertaDinero || "0",
            counterparties: [],
            senderName: "Tu club",
          }}
          onSend={async () => {
            const dinero = Number.parseInt(ofertaDinero, 10) || 0;
            await onSend({ oferta: { dinero, jugadoresOfrecidos: [] } });
          }}
          disabled={sending}
        />
        {errorMessage ? (
          <p className="text-xs text-rose-400">{errorMessage}</p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={sending}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { TransferPlayerResult } from "@/lib/transfers/search";
import type { PlayerScoutingData } from "@/lib/scouting/getPlayerScoutingData";
import { addClauseBuyoutEmail } from "@/lib/inbox/inboxStore";
import { ClubNegotiationModal } from "./ClubNegotiationModal";

const statLabels = [
  ["pace", "PAC"],
  ["shooting", "SHO"],
  ["passing", "PAS"],
  ["dribbling", "DRI"],
  ["defending", "DEF"],
  ["physical", "PHY"]
] as const;

function formatPrice(price: number) {
  if (price >= 1_000_000) return `€${(price / 1_000_000).toFixed(price >= 10_000_000 ? 0 : 1)}M`;
  if (price >= 1_000) return `€${Math.round(price / 1000)}K`;
  return `€${Math.round(price)}`;
}

function formatSalary(salary: number) {
  return `${formatPrice(salary)}/sem`;
}

function overallStyle(overall: number) {
  if (overall >= 90) return { color: "#A855F7", background: "bg-gradient-to-br from-amber-200 via-purple-100 to-indigo-200", elite: true };
  if (overall > 85) return { color: "#EAB308", background: "bg-yellow-500/10" };
  if (overall >= 75) return { color: "#94A3B8", background: "bg-slate-300/20" };
  return { color: "#B45309", background: "bg-amber-700/10" };
}

export default function PlayerDetailModal({
  player,
  onClose,
  userBudget = 50_000_000
}: {
  player: TransferPlayerResult;
  onClose: () => void;
  userBudget?: number;
}) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [scouting, setScouting] = useState<PlayerScoutingData | null>(null);
  const [loadingScouting, setLoadingScouting] = useState(true);
  const [currentBudget, setCurrentBudget] = useState(userBudget);

  // Modal dialog states
  const [activeDialog, setActiveDialog] = useState<"NONE" | "CLAUSE_CONFIRM" | "NEGOTIATE" | "LOAN" | "BUYOUT_RESULT">(
    "NONE"
  );
  const [buyoutResultMsg, setBuyoutResultMsg] = useState("");
  const [processingBuyout, setProcessingBuyout] = useState(false);

  const teamNameLower = (player.currentTeam?.name || "").toLowerCase();
  const teamShortUpper = (player.currentTeam?.shortName || "").toUpperCase();
  const sellerTeamName = player.currentTeam?.name || "Club Propietario";
  const isOwnPlayer = teamNameLower.includes("northbridge") || teamShortUpper === "NFC";

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

  const avatar =
    player.avatarUrl ||
    (player.eaId
      ? `https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p${player.eaId}.png`
      : "/player-placeholder.svg");

  const overall = Math.max(0, Math.min(99, player.overall));
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - overall / 99);
  const style = overallStyle(overall);
  const eliteRingId = `modal-elite-ring-${player.id}`;

  const handleTransferClick = () => {
    if (isOwnPlayer) return;
    if (currentBudget >= player.releaseClause) {
      setActiveDialog("CLAUSE_CONFIRM");
    } else {
      setActiveDialog("NEGOTIATE");
    }
  };

  const handleLoanClick = () => {
    if (isOwnPlayer) return;
    setActiveDialog("LOAN");
  };

  const handleConfirmBuyoutYes = async () => {
    setProcessingBuyout(true);
    try {
      const res = await fetch("/api/transfers/buyout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          releaseClause: player.releaseClause
        })
      });

      const data = await res.json();
      setProcessingBuyout(false);

      if (data.success) {
        if (data.remainingBudget !== undefined) {
          setCurrentBudget(data.remainingBudget);
        }

        addClauseBuyoutEmail({
          id: player.id,
          name: player.name,
          avatarUrl: player.avatarUrl,
          releaseClause: player.releaseClause,
          currentTeamName: sellerTeamName
        });

        setBuyoutResultMsg(
          `¡Cláusula abonada! Has pagado la cláusula de rescisión de ${formatPrice(
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
    setActiveDialog("NEGOTIATE");
  };

  const handleAgreementReached = async (agreedPrice: number) => {
    // Si la oferta pactada supera el presupuesto del usuario, se ajusta al límite máximo disponible
    const finalPrice = Math.min(agreedPrice, currentBudget);

    try {
      await fetch("/api/mailbox/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Acuerdo Alcanzado: ${player.name}`,
          content: `El club ${sellerTeamName} ha aceptado la oferta de ${finalPrice.toLocaleString("es-ES")} € por el traspaso de ${player.name}. Accede a la sección de contratos para formalizar el sueldo del jugador.`,
          category: "TRANSFER_AGREEMENT",
          playerId: player.id,
          agreedPrice: finalPrice,
        }),
      });
    } catch (error) {
      console.error("Error al registrar el acuerdo en la bandeja de entrada:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl transition-all">
        {/* Botón de Cierre */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
          aria-label="Cerrar"
        >
          ✕
        </button>

        {/* Encabezado del Modal */}
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 pb-5">
          <div className="relative h-20 w-20 overflow-hidden rounded-full bg-slate-100 shadow-inner">
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

          <div className={`relative h-20 w-20 overflow-hidden rounded-full ${style.background}`}>
            <svg className="-rotate-90 h-20 w-20" viewBox="0 0 64 64" aria-hidden="true">
              {style.elite && (
                <defs>
                  <linearGradient id={eliteRingId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="25%" stopColor="#A855F7" />
                    <stop offset="50%" stopColor="#EC4899" />
                    <stop offset="75%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
              )}
              <circle cx="32" cy="32" r={radius} fill="none" className="stroke-slate-200/60" strokeWidth="4" />
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                stroke={style.elite ? `url(#${eliteRingId})` : style.color}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <span className="absolute inset-0 z-10 grid place-items-center text-2xl font-black text-black select-none">
              {player.overall}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-2xl font-bold text-slate-900">{player.name}</h2>
              <span className="rounded bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                {player.position}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-bold text-emerald-600">{formatPrice(player.price)}</span>
              <span className="text-slate-500 font-medium">{formatSalary(player.salary)}</span>
              <span className="text-slate-500">Cláusula {formatPrice(player.releaseClause)}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                {player.currentTeam?.imageUrl ? (
                  <img src={player.currentTeam.imageUrl} alt="" className="h-4 w-4 object-contain" />
                ) : null}
                {sellerTeamName}
              </span>
              <span>Potencial: <strong className="text-slate-800">{player.potential}</strong></span>
            </div>
          </div>
        </div>

        {/* 6 Estadísticas Principales */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 bg-slate-50 p-3 rounded-xl border border-slate-100 my-4">
          {statLabels.map(([key, label]) => (
            <div key={key} className="min-w-0 text-center">
              <div className="flex justify-between text-[11px] font-bold text-slate-500">
                <span>{label}</span>
                <span className="text-slate-800">{player.stats[key]}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.max(0, Math.min(100, player.stats[key]))}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Sección de Ojeo */}
        <div className="space-y-3 mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Estadísticas en los últimos 7 partidos
          </h3>

          {loadingScouting ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Cargando datos de ojeo...
            </div>
          ) : !scouting || !scouting.hasData || scouting.matchesPlayed === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-center font-medium text-amber-900 shadow-sm">
              Aún no se ha podido ojear a este jugador, intente más tarde
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                  <span className="block text-2xl font-black text-slate-800">{scouting.goals}</span>
                  <span className="text-xs font-semibold text-slate-500">⚽ Goles</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                  <span className="block text-2xl font-black text-slate-800">{scouting.assists}</span>
                  <span className="text-xs font-semibold text-slate-500">🎯 Asistencias</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                  <span className="block text-2xl font-black text-amber-600">{scouting.yellowCards}</span>
                  <span className="text-xs font-semibold text-slate-500">🟨 Amarillas</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                  <span className="block text-2xl font-black text-rose-600">{scouting.redCards}</span>
                  <span className="text-xs font-semibold text-slate-500">🟥 Rojas</span>
                </div>
              </div>

              {scouting.positionPercentages.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                  <h4 className="mb-2 text-xs font-bold text-slate-500 uppercase">
                    Porcentaje de posición donde ha jugado
                  </h4>
                  <div className="space-y-2">
                    {scouting.positionPercentages.map((item) => (
                      <div key={item.position} className="flex items-center gap-3 text-xs font-medium">
                        <span className="w-10 font-bold text-slate-700">{item.position}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-indigo-600"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-slate-600">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        {isOwnPlayer ? (
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-3.5 text-center font-bold text-slate-600">
            Este jugador ya pertenece a tu plantilla
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              onClick={handleTransferClick}
              className="flex-1 rounded-xl bg-emerald-600 py-3 px-4 text-center font-bold text-white shadow hover:bg-emerald-700 active:scale-[0.99] transition"
            >
              Contactar con {sellerTeamName} para transferencia
            </button>
            <button
              onClick={handleLoanClick}
              className="flex-1 rounded-xl bg-indigo-600 py-3 px-4 text-center font-bold text-white shadow hover:bg-indigo-700 active:scale-[0.99] transition"
            >
              Contactar con {sellerTeamName} para cesión
            </button>
          </div>
        )}
      </div>

      {/* Sub-Modal: Confirmación de Cláusula */}
      {activeDialog === "CLAUSE_CONFIRM" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600 text-xl font-bold">
              💶
            </div>
            <p className="text-base font-semibold text-slate-800">
              El jugador tiene una cláusula de {formatPrice(player.releaseClause)}. ¿Quieres pagarla y saltarte las negociaciones con {sellerTeamName}?
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
                className="w-28 rounded-xl border border-slate-300 bg-white py-2.5 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Modal Telefónico de Negociación */}
      <ClubNegotiationModal
        isOpen={activeDialog === "NEGOTIATE"}
        player={{
          ...player,
          teamId: player.currentTeam?.id,
          teamName: sellerTeamName,
        }}
        maxOfferLimit={currentBudget}
        onClose={() => setActiveDialog("NONE")}
        onAgreementReached={handleAgreementReached}
      />

      {/* Sub-Modal: Solicitud de Cesión */}
      {activeDialog === "LOAN" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-center">
            <h4 className="text-lg font-bold text-slate-900">Solicitud de Cesión</h4>
            <p className="text-sm text-slate-600">
              Contactando con <strong>{sellerTeamName}</strong> para la cesión de <strong>{player.name}</strong>. Las condiciones de la cesión se acordarán en negociaciones posteriores.
            </p>
            <button
              onClick={() => setActiveDialog("NONE")}
              className="mt-3 rounded-xl bg-slate-900 py-2.5 px-6 font-bold text-white hover:bg-slate-800"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Sub-Modal: Resultado de Cláusula */}
      {activeDialog === "BUYOUT_RESULT" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-center">
            <h4 className="text-lg font-bold text-slate-900">Resultado de la Operación</h4>
            <p className="text-sm text-slate-700">{buyoutResultMsg}</p>
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
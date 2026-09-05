'use client';

import React, { useState, useEffect } from 'react';
import { PhoneOff, PhoneCall, Send, AlertTriangle } from 'lucide-react';
import type { TransferPlayerResult } from '@/lib/transfers/search';
import {
  getRandomQuote,
  generateFakePhoneNumber,
  calculateNegotiationParams,
} from '@/lib/transfers/negotiationEngine';
import { getManagerAction } from '@/app/api/managers/managers';
import { RivalManagerCard } from './RivalManagerCard';

const FALLBACK_AVATAR = '/default-avatar.svg';

export interface ClubNegotiationModalProps {
  isOpen: boolean;
  player: TransferPlayerResult & {
    teamId?: string;
    teamName?: string;
    managerName?: string;
    managerAvatarUrl?: string;
    teamCrestUrl?: string | null;
    teamPrimaryColor?: string | null;
    teamShortName?: string | null;
  };
  negotiationId?: string;
  initialTension?: number;
  maxOfferLimit?: number;
  disabled?: boolean;
  disabledReason?: string;
  onClose: () => void;
  onAgreementReached: (agreedPrice: number) => void;
  onHangup?: (outcome: 'HANGUP_LOWBALL' | 'HANGUP_TENSION', tensionAtHangup: number) => Promise<void> | void;
}

type CallStatus = 'active' | 'hangup_lowball' | 'hangup_tension' | 'accepted';

export const ClubNegotiationModal: React.FC<ClubNegotiationModalProps> = ({
  isOpen,
  player,
  negotiationId,
  initialTension = 0,
  maxOfferLimit,
  disabled = false,
  disabledReason,
  onClose,
  onAgreementReached,
  onHangup,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [tension, setTension] = useState(initialTension);
  const [currentCounterPrice, setCurrentCounterPrice] = useState(0);
  const [lowballThreshold, setLowballThreshold] = useState(0);
  const [dialogue, setDialogue] = useState('');
  const [userOffer, setUserOffer] = useState<string>('');
  const [callStatus, setCallStatus] = useState<CallStatus>('active');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [managerName, setManagerName] = useState<string>(player.managerName || 'Cargando Mánager...');
  const [managerAvatar, setManagerAvatar] = useState<string | null>(player.managerAvatarUrl || null);
  const [isLoadingManager, setIsLoadingManager] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const initialPhone = generateFakePhoneNumber();
    const params = calculateNegotiationParams(player);
    setPhoneNumber(initialPhone);
    setSecondsElapsed(0);
    setTension(initialTension);
    setLowballThreshold(params.lowballThreshold);
    setCurrentCounterPrice(params.targetPrice);
    setCallStatus('active');
    setUserOffer('');
    setErrorMessage(null);
    setDialogue(getRandomQuote('greeting', { player: player.name }));

    const isFreeAgentTransfer = player.currentTeam?.eaId === 'FREE_AGENTS' || !player.teamId;
    if (!isFreeAgentTransfer && player.teamId) {
      setManagerName(player.managerName || 'Cargando Mánager...');
      setManagerAvatar(player.managerAvatarUrl || null);
      setIsLoadingManager(true);
      getManagerAction(player.teamId)
        .then((mgr) => {
          if (cancelled) return;
          setManagerName(mgr.name);
          setManagerAvatar(mgr.avatarUrl);
        })
        .catch((err) => {
          if (cancelled) return;
          console.error('Error al obtener mánager:', err);
          setManagerName(player.managerName || `Cuerpo técnico de ${player.teamName ?? 'club rival'}`);
          setManagerAvatar(player.managerAvatarUrl || FALLBACK_AVATAR);
        })
        .finally(() => {
          if (!cancelled) setIsLoadingManager(false);
        });
    } else {
      setManagerName(player.managerName || 'Agente libre');
      setManagerAvatar(player.managerAvatarUrl || null);
      setIsLoadingManager(false);
    }
    return () => {
      cancelled = true;
    };
  }, [isOpen, player, initialTension]);

  useEffect(() => {
    if (!isOpen || callStatus !== 'active') return;
    const timer = setInterval(() => setSecondsElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [isOpen, callStatus]);

  async function persistTensionDelta(delta: number) {
    if (!negotiationId) return;
    try {
      await fetch('/api/transfers/offer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ negotiationId, outcome: 'TENSION_UPDATE', tensionDelta: delta }),
      });
    } catch (e) {
      console.error('[ClubNegotiationModal] tension persist failed:', e);
    }
  }

  async function persistHangup(outcome: 'HANGUP_LOWBALL' | 'HANGUP_TENSION') {
    if (!negotiationId) return;
    try {
      await fetch('/api/transfers/offer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ negotiationId, outcome }),
      });
    } catch (e) {
      console.error('[ClubNegotiationModal] hangup persist failed:', e);
    }
  }

  if (!isOpen) return null;

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSendOffer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const offerNum = parseFloat(userOffer);
    if (isNaN(offerNum) || offerNum <= 0) return;
    if (maxOfferLimit && offerNum > maxOfferLimit) {
      setErrorMessage(`Tu presupuesto máximo disponible es de ${maxOfferLimit.toLocaleString('es-ES')} €.`);
      return;
    }
    if (offerNum < lowballThreshold) {
      setCallStatus('hangup_lowball');
      setTension(100);
      setDialogue(getRandomQuote('lowballAnger', { player: player.name }));
      void persistHangup('HANGUP_LOWBALL');
      void onHangup?.('HANGUP_LOWBALL', 100);
      return;
    }
    if (offerNum >= currentCounterPrice) {
      setCallStatus('accepted');
      setDialogue(
        getRandomQuote('accepted', {
          player: player.name,
          counter: `${offerNum.toLocaleString('es-ES')} €`,
        }),
      );
      onAgreementReached(offerNum);
      return;
    }
    const gapRatio = (currentCounterPrice - offerNum) / currentCounterPrice;
    let tensionIncrement = 15;
    if (gapRatio > 0.25) tensionIncrement = 35;
    else if (gapRatio > 0.15) tensionIncrement = 25;
    const newTension = Math.min(100, tension + tensionIncrement);
    setTension(newTension);
    void persistTensionDelta(tensionIncrement);
    if (newTension >= 100) {
      setCallStatus('hangup_tension');
      setDialogue(getRandomQuote('maxTensionHangup', { player: player.name }));
      void persistHangup('HANGUP_TENSION');
      void onHangup?.('HANGUP_TENSION', 100);
      return;
    }
    const newCounter = Math.max(
      lowballThreshold,
      currentCounterPrice - Math.round((currentCounterPrice - offerNum) * 0.35),
    );
    setCurrentCounterPrice(newCounter);
    const formattedCounter = `${newCounter.toLocaleString('es-ES')} €`;
    if (newTension >= 75) {
      setDialogue(
        getRandomQuote('highTensionWarning', { player: player.name, counter: formattedCounter }),
      );
    } else {
      setDialogue(
        getRandomQuote('counterOffer', { player: player.name, counter: formattedCounter }),
      );
    }
    setUserOffer('');
  };

  const getTensionColor = () => {
    if (tension < 40) return 'bg-emerald-500';
    if (tension < 75) return 'bg-amber-500';
    return 'bg-rose-600';
  };

  const teamName = player.teamName || 'Club Rival';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">

        <div className="bg-slate-950 p-4 border-b border-slate-800/80">
          <RivalManagerCard
            managerName={managerName}
            managerAvatarUrl={managerAvatar}
            teamName={teamName}
            teamCrestUrl={player.teamCrestUrl ?? null}
            teamPrimaryColor={player.teamPrimaryColor ?? null}
            teamShortName={player.teamShortName ?? null}
            phoneNumber={phoneNumber}
            isLive={callStatus === 'active'}
            isFinished={callStatus !== 'active'}
            secondsElapsed={callStatus === 'active' ? secondsElapsed : undefined}
            subtitle={isLoadingManager ? 'Cargando rival...' : 'Negociación de club'}
          />
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-semibold text-emerald-400">
            <PhoneCall size={14} className={callStatus === 'active' ? 'animate-pulse' : ''} />
            <span>{callStatus === 'active' ? formatTimer(secondsElapsed) : 'Llamada Finalizada'}</span>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-900/90 border-b border-slate-800">
          <div className="flex justify-between items-center text-xs font-semibold mb-1">
            <span className="text-slate-400 flex items-center gap-1">
              <AlertTriangle size={13} className="text-amber-400" /> Tensión de la Negociación
            </span>
            <span className="text-slate-200">{tension}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getTensionColor()}`}
              style={{ width: `${tension}%` }}
            />
          </div>
        </div>

        <div className="p-6 flex-1 min-h-[140px] flex items-center justify-center bg-slate-950/40">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 text-slate-200 text-sm leading-relaxed text-center shadow-inner w-full">
            "{dialogue}"
          </div>
        </div>

        <div className="p-6 bg-slate-950 border-t border-slate-800">
          {callStatus === 'active' ? (
            <form onSubmit={handleSendOffer} className="space-y-4">
              {disabled && (
                <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">
                  {disabledReason ?? "No puedes iniciar una negociación por este jugador."}
                </p>
              )}
              <div>
                <div className="relative">
                  <input
                    type="number"
                    max={maxOfferLimit}
                    placeholder={`Precio estimado: ${player.price.toLocaleString('es-ES')} €`}
                    value={userOffer}
                    onChange={(e) => setUserOffer(e.target.value)}
                    disabled={disabled}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm disabled:opacity-50"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">EUR</span>
                </div>
                {maxOfferLimit ? (
                  <p className="text-xs text-slate-400 mt-1.5 flex justify-between px-1">
                    <span>Límite disponible:</span>
                    <span className="font-semibold text-slate-300">{maxOfferLimit.toLocaleString('es-ES')} €</span>
                  </p>
                ) : null}
                {errorMessage ? <p className="text-xs text-rose-400 mt-1 px-1 font-medium">{errorMessage}</p> : null}
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={disabled}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} /> Enviar Oferta
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 p-3 rounded-xl transition flex items-center justify-center"
                  title="Colgar llamada"
                >
                  <PhoneOff size={20} />
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div
                className={`p-3 rounded-xl text-sm font-semibold ${
                  callStatus === 'accepted'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {callStatus === 'accepted'
                  ? 'Acuerdos de traspaso alcanzados. Esperando a negociaciones de contrato: mira tu correo.'
                  : 'La llamada ha finalizado sin acuerdo.'}
              </div>
              {callStatus === 'accepted' ? (
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-inbox'));
                    onClose();
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition text-sm"
                >
                  Ir al correo
                </button>
              ) : null}
              <button
                onClick={onClose}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition text-sm"
              >
                Cerrar Llamada
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

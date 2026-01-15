// SessionTimer.tsx
import { useMemo } from 'react';

interface SessionTimerProps {
    pledge: any; // Sebaiknya gunakan tipe dari wagmi/contract type
    sessionStatus: 'NO_SESSION' | 'SESSION_RUNNING' | 'SESSION_COMPLETED';
    sessionTimeLeft: { hours: number; minutes: number; seconds: number } | null;
    cooldownTimeLeft: { hours: number; minutes: number; seconds: number } | null;
    isLate: boolean;
    canStartSession: boolean;
    isPending: boolean; // Transaksi sedang berjalan?
    onStartSession: () => void;
    onCheckIn: () => void;
    onSurrender: () => void;
    onClaim: () => void;
    onRedeem: () => void;
    onShowCreate: () => void;
    onFreeze: boolean;
}

export default function SessionTimer({
    pledge,
    sessionStatus,
    sessionTimeLeft,
    cooldownTimeLeft,
    isLate,
    canStartSession,
    isPending,
    onFreeze,
    onStartSession,
    onCheckIn,
    onSurrender,
    onClaim,
    onRedeem,
    onShowCreate
}: SessionTimerProps) {

    // Helper untuk format waktu 00:00:00
    const formatTime = (t: { hours: number, minutes: number, seconds: number }) =>
        `${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}:${String(t.seconds).padStart(2, '0')}`;

    // 1. NO ACTIVE PLEDGE
    if (!pledge || (pledge.status !== "ACTIVE" && pledge.status !== "REDEEMING" && pledge.status !== "FROZEN")) {
        return (
            <div className="w-80 h-80 rounded-full border-4 border-gray-700 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(55,65,81,0.3)]">
                <h3 className="text-3xl font-bold mb-4">No Active Pledge</h3>
                <button onClick={onShowCreate} className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-full font-semibold">
                    + New Pledge
                </button>

                {/* Surrender Option */}
                {pledge && pledge.status === "ACTIVE" && ( // Added pledge check to prevent error if pledge is null/undefined
                    <div className="mt-6 flex justify-center">
                        <button
                            onClick={onSurrender}
                            className="text-xs text-red-500/50 hover:text-red-500 transition-colors flex items-center gap-1 group"
                        >
                            <svg className="w-3 h-3 group-hover" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-8a2 2 0 012-2h14a2 2 0 012 2v8M12 3v18" />
                            </svg>
                            Surrender...
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // 1.5 FROZEN STATE (Early Fail) - Themed to match FrozenPledges
    if (pledge.status === "FROZEN" && pledge.completedDays < pledge.targetDays) {
        return (
            <div className="flex flex-col items-center">
                <div className="w-80 h-80 rounded-full border-4 border-red-600 bg-black flex flex-col items-center justify-center relative overflow-hidden shadow-[0_0_30px_rgba(220,38,38,0.4)]">
                    {/* Background Texture */}
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(220,38,38,0.05)_10px,rgba(220,38,38,0.05)_20px)] pointer-events-none" />

                    <div className="z-10 text-center ">
                        <div className="text-6xl mb-4 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-pulse">🔒</div>
                        <h3 className="text-4xl font-black text-red-600 tracking-widest uppercase drop-shadow-lg">LOCKED</h3>
                        <p className="text-red-400 text-xs font-bold mt-2 px-6 uppercase tracking-wider">Asset Recovery Required</p>
                    </div>
                </div>
                <button onClick={onRedeem} disabled={isPending} className="mt-8 bg-red-600 hover:bg-red-700 text-white px-12 py-4 rounded-xl font-bold transition-all shadow-lg shadow-red-900/20 uppercase tracking-wider hover:scale-105 active:scale-95">
                    {isPending ? 'Processing...' : 'Start Redemption'}
                </button>
            </div>
        );
    }

    // 2. CHALLENGE COMPLETED
    if (pledge.completedDays >= pledge.targetDays) {
        return (
            <div className="flex flex-col items-center">
                <div className="w-80 h-80 rounded-full border-4 border-yellow-500 flex flex-col items-center justify-center">
                    <h3 className="text-4xl font-bold text-yellow-400 mb-2">Complete!</h3>
                    <p className="text-gray-400 text-sm">You did it!</p>
                </div>
                {pledge.status === 'FROZEN' ? (
                    <button onClick={onRedeem} disabled={isPending} className="mt-8 bg-yellow-600 px-12 py-4 rounded-xl font-bold">
                        {isPending ? 'Processing...' : 'Start Redemption'}
                    </button>
                ) : (
                    <button onClick={onClaim} disabled={isPending} className="mt-8 bg-yellow-600 px-12 py-4 rounded-xl font-bold">
                        {isPending ? 'Processing...' : 'Claim Stake'}
                    </button>
                )}
            </div>
        );
    }

    // 3. COOLDOWN
    if (cooldownTimeLeft) {
        return (
            <div className="flex flex-col items-center">
                <div className="w-80 h-80 rounded-full border-4 border-yellow-500 flex flex-col items-center justify-center">
                    <div className="text-sm text-yellow-400 uppercase">Cooldown</div>
                    <div className="text-6xl font-mono font-bold">{formatTime(cooldownTimeLeft)}</div>
                </div>
                <button disabled className="mt-8 bg-gray-700 px-12 py-4 rounded-xl font-bold cursor-not-allowed">
                    Cooldown...
                </button>
            </div>
        );
    }

    // 4. REDEEMING
    const isRedeeming = pledge.status === 'REDEEMING';
    // Fix: Only show this specific "Start Redemption" screen if NO session is currently running.
    // If a session IS running, we skip this block so the code below can render the timer.
    if (isRedeeming && sessionStatus === 'NO_SESSION') {
        return (
            <div className="flex flex-col items-center">
                <div className="w-80 h-80 rounded-full border-4 border-yellow-500 flex flex-col items-center justify-center animate-pulse">
                    <h3 className="text-3xl font-bold text-yellow-400">Redemption</h3>
                    <p className="text-gray-400 text-sm mt-2 px-6">Redemption Session.</p>
                </div>
                <button onClick={onStartSession} disabled={isPending} className="mt-8 bg-blue-600 hover:bg-blue-700 px-12 py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20">
                    {isPending ? 'Processing...' : 'Start Redemption Session'}
                </button>
            </div>
        )
    }


    // 5. MISSED DEADLINE (LATE)
    // We strictly assume that if we are REDEEMING, we are "late" but we want to show the session timer,
    // so we exclude isRedeeming from this block.
    if (isLate && !isRedeeming) {
        return (
            <div className="flex flex-col items-center">
                <div className="w-80 h-80 rounded-full border-4 border-red-600 bg-black flex flex-col items-center justify-center relative overflow-hidden shadow-[0_0_30px_rgba(220,38,38,0.4)]">
                    {/* Background Texture */}
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(220,38,38,0.05)_10px,rgba(220,38,38,0.05)_20px)] pointer-events-none" />

                    <div className="z-10 text-center">
                        <div className="text-6xl mb-4 animate-bounce">⚠️</div>
                        <h3 className="text-4xl font-black text-red-600 tracking-widest uppercase">MISSED</h3>
                        <p className="text-red-400 text-xs font-bold mt-2 px-6 uppercase tracking-wider">Protocol Violation</p>
                    </div>
                </div>
                {onFreeze ? (
                    <div className="text-center mt-8">
                        <p className="text-red-500 text-sm mb-3 font-bold uppercase tracking-widest">
                            Action Required
                        </p>
                        <button
                            onClick={onCheckIn}
                            disabled={false}
                            className="bg-black border-2 border-red-600 text-red-500 px-10 py-4 rounded-xl font-bold hover:bg-red-900/20 transition-all uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:scale-105"
                        >
                            🔒 Lock Balance
                        </button>
                    </div>
                ) : (
                    <button disabled className="mt-8 bg-black text-gray-500 border border-gray-800 px-12 py-4 rounded-xl font-bold cursor-not-allowed uppercase tracking-wider">
                        Check-in Disabled
                    </button>
                )}
            </div>
        );
    }


    // 6. DEFAULT
    const borderColor = isRedeeming ? 'border-yellow-500' : 'border-gray-600';
    const textColor = isRedeeming ? 'text-yellow-500' : 'text-white';

    return (
        <div className="flex flex-col items-center">
            {sessionStatus === 'NO_SESSION' && (
                <>
                    <div className={`w-80 h-80 rounded-full border-4 ${borderColor} flex flex-col items-center justify-center relative`}>
                        {isRedeeming && (
                            <div className="absolute top-16 bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-yellow-500/50">
                                Redemption Mode
                            </div>
                        )}
                        <h3 className={`text-3xl font-bold ${textColor}`}>Ready?</h3>
                        <p className="text-gray-400 text-sm">{Math.floor(pledge.sessionDuration / 60)} min session</p>
                    </div>
                    <button onClick={onStartSession} disabled={!canStartSession || isPending} className={`mt-8 ${isRedeeming ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'} px-12 py-4 rounded-xl font-bold transition-colors`}>
                        {isRedeeming ? 'Start Recovery Session' : 'Start Session'}
                    </button>
                </>
            )}

            {sessionStatus === 'SESSION_RUNNING' && sessionTimeLeft && (
                <>
                    <div className="w-80 h-80 rounded-full border-4 border-blue-500 flex flex-col items-center justify-center">
                        <div className="text-xl mb-4 text-blue-400">Focus Session</div>
                        <div className="text-7xl font-mono font-bold">{formatTime(sessionTimeLeft)}</div>
                    </div>
                    <button onClick={onSurrender} className="mt-8 bg-red-600 hover:bg-red-700 px-12 py-4 rounded-xl font-bold">
                        Surrender
                    </button>
                </>
            )}

            {sessionStatus === 'SESSION_COMPLETED' && (
                <>
                    <div className="w-80 h-80 rounded-full border-4 border-green-500 flex flex-col items-center justify-center">
                        <h3 className="text-4xl font-bold text-green-400">Done!</h3>
                        <p className="text-gray-400 text-sm">Time to check in</p>
                    </div>
                    <button onClick={onCheckIn} disabled={isPending} className="mt-8 bg-green-600 hover:bg-green-700 px-12 py-4 rounded-xl font-bold shadow-lg">
                        {isPending ? 'Signing...' : 'Check In'}
                    </button>
                </>
            )}
        </div>
    );
}
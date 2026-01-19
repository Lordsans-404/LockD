'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { LOCKD_ABI, LOCKD_ADDRESS } from '@/config/contract';
import { useLockDRead, STATUS_MAP } from '@/hooks/useLockdRead';
import { useLockDActions } from '@/hooks/useLockdActions';
import { usePledgeMetadata } from '@/hooks/usePledgeMetadata';

// Import komponen pecahan
import SessionTimer from '@/components/dashboard/SessionTimer';
import StatsOverview from '@/components/dashboard/StatsOverview';
// import ActivityHistory from '@/components/dashboard/ActivityHIstory'; // Unused
import CreatePledgeModal from '@/components/dashboard/CreatePledgeModal';
import FrozenPledges from '@/components/dashboard/FrozenPledges';
import Navbar, { NotificationItem } from '@/components/dashboard/Navbar';


export default function LockDDashboard() {
  /* ---------------- STATE & HOOKS (SAMA PERSIS) ---------------- */
  const { address, isConnected } = useAccount();
  const router = useRouter(); // Initialize router

  // Route Protection: Redirect to Landing Page if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  const [activePledgeId, setActivePledgeId] = useState<bigint | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNewCommitment, setShowNewCommitment] = useState(false); // UI State toggle
  const [pledgeIds, setPledgeIds] = useState<bigint[]>([]);
  const [customNotifications, setCustomNotifications] = useState<NotificationItem[]>([]);

  // Notification Helper
  const addNotification = (title: string, msg: string, type: 'info' | 'warning' | 'error' | 'success', persist = false) => {
    const newNote = { title, msg, type };
    if (persist) {
      const existing = JSON.parse(localStorage.getItem('lockd_notifications') || '[]');
      existing.push(newNote);
      localStorage.setItem('lockd_notifications', JSON.stringify(existing));
    } else {
      setCustomNotifications(prev => [...prev, newNote]);
    }
  };

  // Error Handler Helper - User-friendly messages, technical details in console
  const handleError = (title: string, err: any) => {
    const msg = err.message || JSON.stringify(err);

    // Always log full error to console for debugging
    console.error(`[${title}]`, err);

    if (msg.includes("User rejected") || msg.includes("User denied")) {
      addNotification(title, "Transaction was cancelled", "info");
    } else if (msg.includes("ContractFunctionExecutionError") || msg.includes("reverted") || msg.includes("Internal JSON-RPC")) {
      // Contract/RPC errors - show friendly retry message
      addNotification(
        "⚠️ Network Busy",
        "Please wait a moment and try again. The network might be congested.",
        "warning"
      );
    } else if (msg.includes("insufficient funds")) {
      addNotification(title, "Insufficient funds for this transaction", "error");
    } else {
      // Generic fallback - still friendly
      addNotification(
        "⚠️ Something went wrong",
        "Please try again in a few seconds.",
        "warning"
      );
    }
  };

  // Load Persisted Notifications
  useEffect(() => {
    const persisted = localStorage.getItem('lockd_notifications');
    if (persisted) {
      try {
        const notes = JSON.parse(persisted);
        if (Array.isArray(notes)) {
          setCustomNotifications(prev => [...prev, ...notes]);
        }
        localStorage.removeItem('lockd_notifications');
      } catch (e) {
        localStorage.removeItem('lockd_notifications');
      }
    }
  }, []);

  // Metadata & Contract Reads
  const { metadata, isLoading: metaLoading } = usePledgeMetadata(activePledgeId);
  const { pledge, cooldown, gracePeriod } = useLockDRead(activePledgeId ?? undefined);

  // Contract Actions
  const { createPledge, checkIn, startRedemption, claimPledge, surrender, isPending } = useLockDActions();

  /* ---------------- TIMER TICK (SAMA PERSIS) ---------------- */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const now = useMemo(() => Math.floor(Date.now() / 1000), [tick]);

  /* ---------------- SESSION LOGIC (SAMA PERSIS) ---------------- */
  type SessionStatus = 'NO_SESSION' | 'SESSION_RUNNING' | 'SESSION_COMPLETED';
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('NO_SESSION');
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Load Session from LocalStorage
  useEffect(() => {
    if (!activePledgeId) return;
    const saved = localStorage.getItem(`lockd_session_${activePledgeId}`);
    if (saved) {
      try {
        const session = JSON.parse(saved);
        setSessionStartTime(session.startTime);
        setSessionStatus('SESSION_RUNNING');
      } catch (e) { localStorage.removeItem(`lockd_session_${activePledgeId}`); }
    }
  }, [activePledgeId]);

  // Calculate Session Remaining
  const sessionTimeLeft = useMemo(() => {
    if (sessionStatus !== 'SESSION_RUNNING' || !sessionStartTime || !pledge) return null;
    const elapsed = now - sessionStartTime;
    const remaining = Math.max(0, pledge.sessionDuration - elapsed);
    return {
      hours: Math.floor(remaining / 3600),
      minutes: Math.floor((remaining % 3600) / 60),
      seconds: remaining % 60,
    };
  }, [sessionStatus, sessionStartTime, pledge, now]);

  // Auto Complete Session
  useEffect(() => {
    if (sessionStatus === 'SESSION_RUNNING' && sessionTimeLeft?.hours === 0 && sessionTimeLeft?.minutes === 0 && sessionTimeLeft?.seconds === 0) {
      setSessionStatus('SESSION_COMPLETED');
    }
  }, [sessionStatus, sessionTimeLeft]);

  // Dynamic Title Effect
  useEffect(() => {
    if (sessionStatus === 'SESSION_RUNNING' && sessionTimeLeft) {
      const h = sessionTimeLeft.hours > 0 ? `${sessionTimeLeft.hours}:` : '';
      const m = sessionTimeLeft.minutes.toString().padStart(2, '0');
      const s = sessionTimeLeft.seconds.toString().padStart(2, '0');
      document.title = `(${h}${m}:${s}) LockD Focus`;
    } else if (pledge?.status === 'REDEEMING') {
      document.title = '(Redeeming) LockD';
    } else if (pledge?.status === 'CLAIMED') {
      document.title = '(Claimed) LockD | Well Done!';
    } else if (pledge?.status === 'LIQUIDATED') {
      document.title = '(Liquidated) LockD | Game Over';
    } else {
      document.title = 'LockD | Commit to your goals';
    }

    return () => {
      document.title = 'LockD | Commit to your goals';
    };
  }, [sessionStatus, sessionTimeLeft, pledge?.status]);

  /* ---------------- COOLDOWN & LATE LOGIC (SAMA PERSIS) ---------------- */
  const cooldownTimeLeft = useMemo(() => {
    if (!pledge?.lastCheckIn || !cooldown) return null;
    const end = pledge.lastCheckIn + Number(cooldown);
    const remaining = end - now;
    return remaining <= 0 ? null : {
      hours: Math.floor(remaining / 3600),
      minutes: Math.floor((remaining % 3600) / 60),
      seconds: remaining % 60,
    };
  }, [pledge, cooldown, now]);

  const isLate = useMemo(() => {
    if (!pledge?.lastCheckIn || !gracePeriod) return false;
    return now > (pledge.lastCheckIn + Number(gracePeriod));
  }, [pledge, gracePeriod, now]);

  const needsFreeze = useMemo(() => {
    return isLate && pledge?.status === 'ACTIVE';
  }, [isLate, pledge]);
  const canStartSession = !cooldownTimeLeft && !isLate;

  /* ---------------- FETCH PLEDGES (SAMA PERSIS) ---------------- */
  /* ---------------- FETCH PLEDGES & INTELLIGENT SELECTION ---------------- */
  // 1. Fetch IDs via API
  useEffect(() => {
    if (!address) return;
    fetch(`/api/user-pledges?address=${address}`)
      .then(res => res.json())
      .then(data => {
        const ids = data.pledgeIds.map((id: string) => BigInt(id));
        // Only set IDs if they change to avoid infinite loops
        setPledgeIds(prev => {
          if (prev.length !== ids.length) return ids;
          const isSame = prev.every((val, index) => val === ids[index]);
          return isSame ? prev : ids;
        });
      });
  }, [address]);

  // 2. Fetch Statuses for sorting
  const { data: allPledgesData } = useReadContracts({
    contracts: pledgeIds.map((id) => ({
      abi: LOCKD_ABI,
      address: LOCKD_ADDRESS,
      functionName: 'pledges',
      args: [id],
    })),
    query: {
      enabled: pledgeIds.length > 0,
    }
  });

  // 3. Determine Active Pledge ID
  useEffect(() => {
    if (!allPledgesData || pledgeIds.length === 0) return;

    // Helper: Parse status from result
    const getStatus = (index: number) => {
      const result = allPledgesData[index];
      if (result.status !== 'success') return 'UNKNOWN';
      const p = result.result as any;
      return STATUS_MAP[Number(p[7])];
    };

    let selectedId = pledgeIds[pledgeIds.length - 1]; // Default: Latest

    // Priority 1: Find REDEEMING
    const redeemingIndex = pledgeIds.findIndex((_, idx) => getStatus(idx) === 'REDEEMING');
    if (redeemingIndex !== -1) {
      selectedId = pledgeIds[redeemingIndex];
    } else {
      // Priority 2: Find ACTIVE
      const activeIndex = pledgeIds.findIndex((_, idx) => getStatus(idx) === 'ACTIVE');
      // We might want the *latest* active if multiple exist, so maybe don't just take first.
      // Let's stick to "Latest pledge is default, but override if there is a REDEEMING one" logic for now,
      // or "Latest Active".
      // The simplest valid logic for user: Show what I need to work on.

      // If latest check is frozen/liquidated, look for earlier active ones? 
      // For now, let's just prioritize REDEEMING. If no REDEEMING, fall back to default behavior (Latest).
    }

    setActivePledgeId(selectedId);

  }, [allPledgesData, pledgeIds]);


  /* ---------------- HANDLERS (SAMA PERSIS) ---------------- */
  const handleStartSession = async () => {
    if (!activePledgeId || !pledge) return;
    try {
      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pledgeId: activePledgeId.toString(), userAddress: address }),
      });
      const { startTime } = await res.json();

      localStorage.setItem(`lockd_session_${activePledgeId}`, JSON.stringify({ startTime }));
      setSessionStartTime(startTime);
      setSessionStatus('SESSION_RUNNING');
      addNotification("🎯 Session Started", "Focus mode is active. Good luck!", "info");
    } catch (err: any) { handleError("Start Failed", err); }
  };

  const handleCheckIn = async () => {
    if (!activePledgeId || isPending) return; // Prevent double-click
    try {
      const res = await fetch("/api/checkin-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pledgeId: activePledgeId.toString(), userAddress: address }),
      });
      const { signature } = await res.json();
      const tx = await checkIn({ pledgeId: activePledgeId, signature });

      localStorage.removeItem(`lockd_session_${activePledgeId}`);
      const shortTx = `${tx.slice(0, 6)}...${tx.slice(-4)}`;
      addNotification("✅ Check-in Success", `Transaction sent: ${shortTx}`, "success", true);
      window.location.reload();
    } catch (err: any) { handleError("Check-in Failed", err); }
  };

  const handleClaim = async () => {
    if (!activePledgeId || isPending) return; // Prevent double-click
    try {
      const tx = await claimPledge(activePledgeId);

      localStorage.setItem('lockd_claim_success', 'true');
      const shortTx = `${tx.slice(0, 6)}...${tx.slice(-4)}`;
      addNotification("🎉 Claim Initiated", `Transaction sent: ${shortTx}`, "success", true);
      window.location.reload();
    } catch (err: any) {
      handleError("Claim Failed", err);
    }
  }

  // Effect: Check for Claim Success Flag
  useEffect(() => {
    const isClaimSuccess = localStorage.getItem('lockd_claim_success');
    if (isClaimSuccess) {
      localStorage.removeItem('lockd_claim_success');
      // Fire Confetti
      const duration = 3000;
      const end = Date.now() + duration;

      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#22c55e', '#eab308'] // Green and Yellow
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    }
  }, []);



  // Effect: Check for Claim Success Flag
  useEffect(() => {
    const isClaimSuccess = localStorage.getItem('lockd_claim_success');
    if (isClaimSuccess) {
      localStorage.removeItem('lockd_claim_success');
      // Fire Confetti
      const duration = 3000;
      const end = Date.now() + duration;

      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#22c55e', '#eab308'] // Green and Yellow
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    }
  }, []);

  /* ---------------- SURRENDER HANDLER ---------------- */
  const handleSurrender = async () => {
    if (!activePledgeId || !pledge) return;

    // Check progress for Mercy Rule logic
    const completed = Number(pledge.completedDays);
    const target = Number(pledge.targetDays);
    const progress = completed / target;
    const isMercy = completed > (target / 2);

    const message = isMercy
      ? `Progress: ${completed}/${target} days.\nMercy Rule Active: You will receive a partial refund based on your progress.`
      : `Progress: ${completed}/${target} days.\n⚠️ Warning: Progress <= 50%. Your assets will be FROZEN. You must redeem to recover them.`;

    if (!confirm(`Are you sure you want to surrender?\n\n${message}`)) return;

    try {
      const tx = await surrender(activePledgeId);
      const shortTx = `${tx.slice(0, 6)}...${tx.slice(-4)}`;
      addNotification("🏳️ Surrender Initiated", `Transaction sent: ${shortTx}`, "warning", true);

      // Cleanup local verification
      localStorage.removeItem(`lockd_session_${activePledgeId}`);
      setSessionStatus('NO_SESSION');
      window.location.reload();

    } catch (err: any) {
      handleError("Surrender Failed", err);
    }
  };

  // Helper untuk warna status (Copy dari original)
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-500';
      case 'FROZEN': return 'text-red-500 font-black'; // Updated to Red + Effect
      case 'REDEEMING': return 'text-yellow-500';
      case 'CLAIMED': return 'text-purple-500';
      case 'LIQUIDATED': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  /* ---------------- RENDER ---------------- */
  if (!isConnected) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Connect Wallet</div>;
  if (metaLoading) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
      <video autoPlay loop muted className="w-40 h-40 rounded-full object-cover">
        <source src="/loading-cat.webm" type="video/webm" />
      </video>
      <div className="text-xl font-bold animate-pulse text-gray-400">Loading your commitment...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <Navbar pledge={pledge} isLate={isLate} activePledgeId={activePledgeId} customNotifications={customNotifications} />


      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 pt-32 pb-12">
        {/* Title */}
        <h2 className={`text-4xl font-bold text-center mb-8 transition-all duration-300 ${pledge?.status === 'CLAIMED' || pledge?.status === 'LIQUIDATED'
          ? 'text-gray-500 drop-shadow-[0_0_5px_rgba(255,255,255,0.1)]'
          : 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]'
          }`}>
          {metaLoading ? "Loading..." : metadata?.title || "Lock Your Commitment"}
        </h2>

        {/* Status Badge (Ini yang saya tambahkan kembali agar 100% sama) */}
        <div className="flex justify-center mb-8 gap-4">
          <div className="flex items-center gap-2 bg-gray-900 rounded-full px-6 py-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className={`text-sm font-bold ${getStatusColor(pledge?.status)}`}>
              STATUS: {pledge?.status || 'INACTIVE'}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-gray-900 rounded-full px-6 py-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className={`text-sm font-bold ${getStatusColor(pledge?.status)}`}>
              Pledge ID: {activePledgeId ? activePledgeId.toString() : "~"}
            </span>
          </div>
        </div>

        {/* Component: SESSION TIMER CIRCLE */}
        <div className="flex justify-center mb-12">
          <SessionTimer
            pledge={pledge}
            sessionStatus={sessionStatus}
            sessionTimeLeft={sessionTimeLeft}
            cooldownTimeLeft={cooldownTimeLeft}
            isLate={isLate}
            canStartSession={canStartSession}
            isPending={isPending}
            onStartSession={handleStartSession}
            onCheckIn={handleCheckIn}
            onSurrender={handleSurrender}
            onClaim={handleClaim}
            onRedeem={async () => {
              if (!activePledgeId) return;
              try {
                await startRedemption(activePledgeId);
                addNotification("Redemption Started", "Recovery mode active.", "warning", true);
                window.location.reload();
              } catch (e: any) { handleError("Redemption Failed", e); }
            }}
            onShowCreate={() => setShowCreateModal(true)}
            onFreeze={needsFreeze}
          />
        </div>

        {/* Component: STATS & HISTORY */}
        {pledge && (
          <StatsOverview pledge={pledge} />
        )}

        {/* Frozen Pledges Section */}
        {pledgeIds.length > 0 && <FrozenPledges pledgeIds={pledgeIds} />}

        {/* New Commitment Accordion (UI asli di bagian bawah) */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden mt-8">
          <button
            onClick={() => setShowNewCommitment(!showNewCommitment)}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-2xl">+</div>
              <div className="text-left">
                <h3 className="font-semibold text-lg">New Commitment</h3>
                <p className="text-gray-400 text-sm">Stake ETH to lock in focus</p>
              </div>
            </div>
            <div className={`transform transition-transform ${showNewCommitment ? 'rotate-180' : ''}`}>▲</div>
          </button>

          {showNewCommitment && (
            <div className="p-6 pt-0 border-t border-gray-800">
              <p className="text-gray-400 text-sm mb-4">
                Create a new commitment by staking ETH...
              </p>
              <button onClick={() => setShowCreateModal(true)} className="bg-green-600 px-6 py-2 rounded-lg font-bold">
                Open Form
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Component: MODAL */}
      {showCreateModal && (
        <CreatePledgeModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  );
}
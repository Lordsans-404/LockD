'use client'

import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { useLockDRead } from '@/hooks/useLockdRead';
import { useLockDActions } from '@/hooks/useLockdActions';
import { usePledgeMetadata } from '@/hooks/usePledgeMetadata';

/**
 * Dashboard utama LockD
 * - Ambil pledge user
 * - Tentuin pledge yang aktif
 * - Hitung countdown check-in dari data on-chain
 */
export default function LockDDashboard() {
  /* ---------------- WALLET ---------------- */
  // Data wallet user
  const { address, isConnected } = useAccount();

  /* ---------------- STATE ---------------- */
  // Semua pledgeId milik user (hasil index dari event)
  const [pledgeIds, setPledgeIds] = useState<bigint[]>([]);

  // Pledge yang lagi aktif (dipakai buat dashboard)
  const [activePledgeId, setActivePledgeId] = useState<bigint | null>(null);

  // UI state
  const [showNewCommitment, setShowNewCommitment] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { metadata, isLoading: metaLoading } =
    usePledgeMetadata(activePledgeId);


  // Data form create pledge (sebagian off-chain)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    stakeAmount: '',
    sessionDuration: '',
    targetDays: 7 as 1 | 3 | 7,
  });

  /* ---------------- CONTRACT HOOKS ---------------- */
  // Read state pledge + cooldown dari smart contract
  const { pledge, canCheckIn, isLoading, cooldown, gracePeriod } =
    useLockDRead(activePledgeId ?? undefined);

  // Semua action write (tx)
  const { createPledge, checkIn, startRedemption, claimPledge, isPending } =
    useLockDActions();

  /* ---------------- TIMER HEARTBEAT ---------------- */
  // Tick ini cuma buat maksa re-render tiap 1 detik
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);

    return () => clearInterval(id);
  }, []);

  // Waktu sekarang (update tiap tick)
  const now = useMemo(() => {
    return Math.floor(Date.now() / 1000);
  }, [tick]);

  /* ---------------- SESSION STATE ---------------- */
  type SessionStatus = 'NO_SESSION' | 'SESSION_RUNNING' | 'SESSION_COMPLETED';
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('NO_SESSION');
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  /* ---------------- COOLDOWN LOGIC ---------------- */

  const cooldownTimeLeft = useMemo(() => {
    // Ensure pledge and cooldown data are available
    if (!pledge || !pledge.lastCheckIn || pledge.lastCheckIn === 0 || !cooldown) {
      return null; // No check-in yet or data loading
    }

    const cooldownSeconds = Number(cooldown);
    const cooldownEnd = pledge.lastCheckIn + cooldownSeconds;
    const remaining = cooldownEnd - now;

    if (remaining <= 0) {
      return null; // Cooldown finished
    }

    return {
      hours: Math.floor(remaining / 3600),
      minutes: Math.floor((remaining % 3600) / 60),
      seconds: remaining % 60,
    };
  }, [pledge, cooldown, now]);

  const isLate = useMemo(() => {
    if (!pledge || !pledge.lastCheckIn || pledge.lastCheckIn === 0 || !gracePeriod) {
      return false;
    }
    const graceSeconds = Number(gracePeriod);
    const deadline = pledge.lastCheckIn + graceSeconds;
    return now > deadline;
  }, [pledge, gracePeriod, now]);

  // canCheckIn derived from cooldown validity
  const canStartSession = useMemo(() => {
    return cooldownTimeLeft === null && !isLate;
  }, [cooldownTimeLeft, isLate]);

  /* ---------------- FETCH USER PLEDGES ---------------- */
  // Ambil pledgeId milik user dari backend (hasil index event)
  useEffect(() => {
    if (!address) return;

    fetch(`/api/user-pledges?address=${address}`)
      .then(res => res.json())
      .then(data => {
        setPledgeIds(data.pledgeIds.map((id: string) => BigInt(id)));
      });
  }, [address]);

  /* ---------------- ACTIVE PLEDGE ---------------- */
  // Tentuin pledge aktif (sementara ambil yang terakhir dibuat)
  useEffect(() => {
    if (!pledgeIds.length) return;

    setActivePledgeId(pledgeIds[pledgeIds.length - 1]);
  }, [pledgeIds]);

  /* ---------------- SESSION MANAGEMENT ---------------- */
  // Load session from localStorage on mount
  useEffect(() => {
    if (!activePledgeId) return;

    const saved = localStorage.getItem(`lockd_session_${activePledgeId}`);
    if (saved) {
      try {
        const session = JSON.parse(saved);
        setSessionStartTime(session.startTime);
        setSessionStatus('SESSION_RUNNING');
        console.log('Loaded session from localStorage:', session);
      } catch (err) {
        console.error('Failed to load session', err);
        localStorage.removeItem(`lockd_session_${activePledgeId}`);
      }
    }
  }, [activePledgeId]);

  // Calculate session countdown
  const sessionTimeLeft = useMemo(() => {
    if (sessionStatus !== 'SESSION_RUNNING' || !sessionStartTime || !pledge) {
      return null;
    }

    const elapsed = now - sessionStartTime;
    const remaining = Math.max(0, pledge.sessionDuration - elapsed);

    return {
      hours: Math.floor(remaining / 3600),
      minutes: Math.floor((remaining % 3600) / 60),
      seconds: remaining % 60,
    };
  }, [sessionStatus, sessionStartTime, pledge, now]);

  // Auto-complete session when timer reaches 0
  useEffect(() => {
    if (
      sessionStatus === 'SESSION_RUNNING' &&
      sessionTimeLeft &&
      sessionTimeLeft.hours === 0 &&
      sessionTimeLeft.minutes === 0 &&
      sessionTimeLeft.seconds === 0
    ) {
      setSessionStatus('SESSION_COMPLETED');
      console.log('✅ Session completed!');
    }
  }, [sessionStatus, sessionTimeLeft]);


  // Activity history data (mock)
  const activityHistory = [
    ['idle', 'idle', 'focus', 'idle', 'focus', 'idle', 'focus', 'idle', 'idle', 'idle', 'idle'],
    ['idle', 'idle', 'focus', 'fail', 'focus', 'idle', 'focus', 'idle', 'idle', 'idle', 'idle'],
  ];

  /* ---------------- SESSION HANDLERS ---------------- */

  const handleStartSession = async () => {
    if (!activePledgeId || !address || !pledge) return;

    try {
      console.log("=== STARTING SESSION ===");

      // Call backend to record session start
      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pledgeId: activePledgeId.toString(),
          userAddress: address,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to start session");
      }

      const { startTime } = await res.json();

      // Save to localStorage
      localStorage.setItem(
        `lockd_session_${activePledgeId}`,
        JSON.stringify({
          pledgeId: activePledgeId.toString(),
          startTime,
          sessionDuration: pledge.sessionDuration,
        })
      );

      setSessionStartTime(startTime);
      setSessionStatus('SESSION_RUNNING');

      console.log("✅ Session started!");
      console.log("Duration:", pledge.sessionDuration, "seconds");

      alert(`🎯 Session Started!\n\nStay focused for ${Math.floor(pledge.sessionDuration / 60)} minutes.`);
    } catch (error: any) {
      console.error("❌ START SESSION FAILED:", error);
      alert(`Failed to start session: ${error.message}`);
    }
  };

  const handleSurrender = () => {
    if (!activePledgeId) return;

    const confirmed = confirm("⚠️ Are you sure you want to surrender this session?\n\nYou'll need to start over.");

    if (!confirmed) return;

    // Clear session
    localStorage.removeItem(`lockd_session_${activePledgeId}`);
    setSessionStartTime(null);
    setSessionStatus('NO_SESSION');

    console.log("Session surrendered");
    alert("Session surrendered. Take a break and try again when ready!");
  };

  const handleCheckIn = async () => {
    if (!activePledgeId || !pledge) return;

    // Must have completed session
    if (sessionStatus !== 'SESSION_COMPLETED') {
      alert("You need to complete your focus session first!");
      return;
    }

    try {
      // Get signature from backend
      const res = await fetch("/api/checkin-sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pledgeId: activePledgeId.toString(),
          userAddress: address,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to get signature");
      }

      const { signature } = await res.json();

      console.log("=== CHECK-IN ===");
      console.log("Signature:", signature);
      console.log("Pledge ID:", activePledgeId.toString());

      // Submit check-in transaction
      const tx = await checkIn({
        pledgeId: activePledgeId,
        signature,
      });

      console.log("✅ Transaction submitted:", tx);

      // Wait for blockchain confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Show success message
      const explorerUrl = `https://sepolia.basescan.org/tx/${tx}`;
      const message = `✅ Check-in Berhasil!\n\n` +
        `Completed Days: ${pledge.completedDays} → ${pledge.completedDays + 1}\n\n` +
        `Transaction Hash:\n${tx}\n\n` +
        `View on Explorer:\n${explorerUrl}\n\n` +
        `Halaman akan di-refresh untuk update data...`;

      alert(message);

      // Clear session from storage to prevent it from loading again
      localStorage.removeItem(`lockd_session_${activePledgeId}`);

      // Reload page to show updated data
      window.location.reload();
    } catch (err) {
      console.error("❌ CHECK-IN FAILED:", err);
      alert(`❌ Check-in failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleStartRedemption = async () => {
    if (!pledge) return;

    try {
      if (!activePledgeId || !canCheckIn || !pledge) return;
      await startRedemption(activePledgeId);
    } catch (error) {
      console.error('Start redemption failed:', error);
    }
  };

  const handleClaim = async () => {
    if (!activePledgeId || !canCheckIn || !pledge) return;
    try {
      await claimPledge(activePledgeId);
    } catch (error) {
      console.error('Claim failed:', error);
    }
  };

  const handleCreatePledge = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const stakeAmount = parseEther(formData.stakeAmount);

      console.log("=== CREATING PLEDGE ===");
      console.log("Target Days:", formData.targetDays);
      console.log("Session Duration:", formData.sessionDuration);
      console.log("Stake Amount:", formData.stakeAmount, "ETH");

      // Create pledge on blockchain
      const result = await createPledge({
        targetDays: formData.targetDays,
        sessionDuration: Number(formData.sessionDuration),
        stakeAmount,
      });

      console.log("✅ Pledge created on blockchain");
      console.log("Pledge ID:", result.pledgeId.toString());
      console.log("Transaction Hash:", result.txHash);

      // Validate pledgeId
      if (!result.pledgeId || result.pledgeId === undefined) {
        throw new Error("Failed to get pledge ID from transaction");
      }

      const pledgeIdString = result.pledgeId.toString();

      // Save metadata to Firebase
      console.log("Saving metadata to Firebase...");
      const firestoreRes = await fetch("/api/pledges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pledgeId: pledgeIdString,
          title: formData.title || "Untitled Pledge",
          description: formData.description || "",
          owner: address,
        }),
      });

      if (!firestoreRes.ok) {
        console.warn("Failed to save metadata, but pledge created successfully");
      } else {
        console.log("✅ Metadata saved to Firebase");
      }

      // Set as active pledge
      setActivePledgeId(result.pledgeId);
      setShowCreateModal(false);

      // Success message
      alert(`🎉 Pledge Created Successfully!\n\nPledge ID: ${pledgeIdString}\nTransaction: ${result.txHash}\n\nRefreshing...`);

      // Reload to show new pledge
      window.location.reload();
    } catch (error: any) {
      console.error("❌ CREATE PLEDGE FAILED:", error);
      alert(`Failed to create pledge: ${error.message || 'Unknown error'}`);
    }
  };

  const formatEth = (wei: bigint) => {
    return (Number(wei) / 1e18).toFixed(4);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-500';
      case 'FROZEN': return 'text-blue-500';
      case 'REDEEMING': return 'text-yellow-500';
      case 'CLAIMED': return 'text-purple-500';
      case 'LIQUIDATED': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to access LockD</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⏳</div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🔒</div>
          <h1 className="text-2xl font-bold">LockD</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-900 rounded-full px-4 py-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-mono">
              {address ? `${address.slice(0, 5)}...${address.slice(-3)}` : ''}
            </span>
          </div>
          <button className="bg-gray-900 p-2 rounded-full hover:bg-gray-800 transition-colors">
            🔔
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Title */}
        <h2 className="text-4xl font-bold text-center mb-8">
          {metaLoading
            ? "Loading..."
            : metadata?.title || "Your Commitment"}
        </h2>

        {/* Status Badge */}
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
              Pledge ID: {activePledgeId || "~"}
            </span>
          </div>
        </div>

        {/* Timer Circle */}
        <div className="flex justify-center mb-12">
          <div className="relative">
            {/* CASE 1: No Active Pledge */}
            {(!pledge || (pledge.status !== "ACTIVE" && pledge.status !== "REDEEMING")) && (
              <div className="w-80 h-80 rounded-full border-4 border-gray-700 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(55,65,81,0.3)]">
                <h3 className="text-3xl font-bold mb-4">No Active Pledge</h3>
                <p className="text-gray-400 text-sm mb-6 text-center px-8">
                  Create a new pledge to start your focus journey
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-full font-semibold transition-colors flex items-center gap-2"
                >
                  <span className="text-xl">+</span>
                  New Pledge
                </button>
              </div>
            )}

            {/* CASE 2: Active or Redeeming Pledge */}
            {pledge && (pledge.status === "ACTIVE" || pledge.status === "REDEEMING") && (
              <>
                {/* SUB-CASE: Challenge Completed */}
                {pledge.completedDays >= pledge.targetDays ? (
                  <div className="flex flex-col items-center">
                    <div className="w-80 h-80 rounded-full border-4 border-yellow-500 flex flex-col items-center justify-center shadow-[0_0_80px_rgba(234,179,8,0.6)] animate-pulse">
                      <h3 className="text-4xl font-bold text-yellow-400 mb-4">Challenge Complete!</h3>
                      <p className="text-gray-400 text-sm text-center px-8">
                        You completed {pledge.completedDays}/{pledge.targetDays} days!
                      </p>
                      <p className="text-yellow-500 text-lg font-bold mt-4">
                        Claim your {formatEth(pledge.stakedAmount)} ETH
                      </p>
                    </div>
                    <button
                      onClick={handleClaim}
                      disabled={isPending}
                      className="mt-8 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-12 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
                    >
                      {isPending ? 'Processing...' : 'Claim Rewards'}
                    </button>
                  </div>
                ) : (
                  /* SUB-CASE: Active Session Logic */
                  <div className="flex flex-col items-center">
                    {/* COOLDOWN STATE */}
                    {cooldownTimeLeft ? (
                      <>
                        <div className="w-80 h-80 rounded-full border-4 border-yellow-500 flex flex-col items-center justify-center shadow-[0_0_80px_rgba(234,179,8,0.4)] transition-all">
                          <div className="text-sm mb-2 text-yellow-400 uppercase tracking-wide">Cooldown Period</div>
                          <div className="text-6xl font-mono font-bold tracking-tight">
                            {String(cooldownTimeLeft.hours).padStart(2, '0')}:
                            {String(cooldownTimeLeft.minutes).padStart(2, '0')}:
                            {String(cooldownTimeLeft.seconds).padStart(2, '0')}
                          </div>
                          <div className="text-yellow-400 text-sm mt-4 font-semibold">
                            Next session available soon
                          </div>
                        </div>
                        <button
                          disabled
                          className="mt-8 bg-gray-700 cursor-not-allowed px-12 py-4 rounded-xl font-bold text-lg transition-all"
                        >
                          Start Session
                        </button>
                      </>
                    ) : isLate ? (
                      /* LATE / MISSED DEADLINE STATE */
                      <>
                        <div className="w-80 h-80 rounded-full border-4 border-red-600 flex flex-col items-center justify-center shadow-[0_0_80px_rgba(220,38,38,0.5)] transition-all">
                          <div className="text-5xl mb-4">⚠️</div>
                          <h3 className="text-3xl font-bold text-red-500 mb-2">Missed Deadline</h3>
                          <p className="text-red-400 text-sm text-center px-8">
                            You missed the check-in window. Your pledge is at risk!
                          </p>
                        </div>
                        <button
                          disabled
                          className="mt-8 bg-gray-800 text-red-500 cursor-not-allowed border border-red-900/50 px-12 py-4 rounded-xl font-bold text-lg transition-all"
                        >
                          Check-in Disabled
                        </button>
                      </>
                    ) : (
                      <>
                        {/* SESSION STATE: NO_SESSION */}
                        {sessionStatus === 'NO_SESSION' && (
                          <>
                            <div className="w-80 h-80 rounded-full border-4 border-gray-600 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(75,85,99,0.3)] transition-all">
                              <h3 className="text-3xl font-bold mb-4">Ready to Focus?</h3>
                              <p className="text-gray-400 text-sm text-center px-8">
                                Start a {Math.floor((pledge.sessionDuration || 0) / 60)} minute focus session
                              </p>
                            </div>
                            <button
                              onClick={handleStartSession}
                              disabled={!canStartSession || isPending}
                              className="mt-8 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-12 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105"
                            >
                              Start Session
                            </button>
                          </>
                        )}

                        {/* SESSION STATE: SESSION_RUNNING */}
                        {sessionStatus === 'SESSION_RUNNING' && sessionTimeLeft && (
                          <>
                            {/* Safeguard: If time is up but status update is pending, show completed UI anyway? 
                                Actually, let's just show Running UI with 00:00:00 if it happens to lag.
                                But better: if hours=0, minutes=0, seconds=0, Render 'Complete' immediately.
                            */}
                            {sessionTimeLeft.hours === 0 && sessionTimeLeft.minutes === 0 && sessionTimeLeft.seconds === 0 ? (
                              /* Redirect visual to completed state immediately */
                              <div className="w-80 h-80 rounded-full border-4 border-green-500 flex flex-col items-center justify-center shadow-[0_0_80px_rgba(34,197,94,0.6)] transition-all">
                                <h3 className="text-4xl font-bold text-green-400 mb-4">Session Complete!</h3>
                                <p className="text-gray-400 text-sm">
                                  You stayed focused. Time to check in!
                                </p>
                                <button
                                  onClick={handleCheckIn}
                                  disabled={isPending}
                                  className="mt-8 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-700 disabled:cursor-not-allowed px-12 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
                                >
                                  {isPending ? 'Processing...' : 'Check In'}
                                </button>
                              </div>
                            ) : (
                              /* Normal Running UI */
                              <>
                                <div className="w-80 h-80 rounded-full border-4 border-blue-500 flex flex-col items-center justify-center shadow-[0_0_80px_rgba(59,130,246,0.5)] animate-pulse transition-all">
                                  <div className="text-xl mb-4 text-blue-400">Focus Session</div>
                                  <div className="text-7xl font-mono font-bold tracking-tight">
                                    {String(sessionTimeLeft.hours).padStart(2, '0')}:
                                    {String(sessionTimeLeft.minutes).padStart(2, '0')}:
                                    {String(sessionTimeLeft.seconds).padStart(2, '0')}
                                  </div>
                                  <div className="text-blue-400 text-sm mt-4 font-semibold uppercase tracking-wide">
                                    Stay Focused!
                                  </div>
                                </div>
                                <button
                                  onClick={handleSurrender}
                                  className="mt-8 bg-red-600 hover:bg-red-700 px-12 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105"
                                >
                                  Surrender
                                </button>
                              </>
                            )}
                          </>
                        )}

                        {/* SESSION STATE: SESSION_COMPLETED */}
                        {sessionStatus === 'SESSION_COMPLETED' && (
                          <>
                            <div className="w-80 h-80 rounded-full border-4 border-green-500 flex flex-col items-center justify-center shadow-[0_0_80px_rgba(34,197,94,0.6)] transition-all">
                              <h3 className="text-4xl font-bold text-green-400 mb-4">Session Complete!</h3>
                              <p className="text-gray-400 text-sm">
                                You stayed focused. Time to check in!
                              </p>
                            </div>
                            <button
                              onClick={handleCheckIn}
                              disabled={isPending}
                              className="mt-8 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-12 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
                            >
                              {isPending ? 'Processing...' : 'Check In'}
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 7-Day Challenge Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">7-Day Challenge</h3>
            <span className="text-green-500 font-semibold">
              Day {pledge?.completedDays || 0} / {pledge?.targetDays || 7}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${((pledge?.completedDays || 0) / (pledge?.targetDays || 7)) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Daily Streak */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="text-3xl">🔥</div>
              <div className="text-gray-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
            <div className="text-gray-400 text-sm mb-1">Daily Streak</div>
            <div className="text-3xl font-bold">{pledge?.completedDays || 0} Days</div>
          </div>

          {/* Hostaged Assets */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="text-3xl text-red-500">⚠️</div>
              <div className="text-gray-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <div className="text-gray-400 text-sm mb-1">Hostaged Assets</div>
            <div className="text-3xl font-bold text-red-500">
              {pledge ? `-${formatEth(pledge.stakedAmount)} ETH` : '0 ETH'}
            </div>
          </div>
        </div>

        {/* Activity History */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Activity History</h3>
            <button className="text-green-500 text-sm hover:text-green-400 transition-colors">
              View All
            </button>
          </div>

          <div className="flex gap-2">
            {activityHistory.map((column, colIdx) => (
              <div key={colIdx} className="flex flex-col gap-2">
                {column.map((status, rowIdx) => (
                  <div
                    key={rowIdx}
                    className={`w-8 h-8 rounded ${status === 'focus'
                      ? 'bg-green-500'
                      : status === 'fail'
                        ? 'bg-red-500'
                        : 'bg-gray-800'
                      }`}
                  ></div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-4 mt-4 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-800 rounded"></div>
              <span>Idle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Focus</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Fail</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {pledge?.status === 'ACTIVE' && pledge.completedDays >= pledge.targetDays && (
          <div className="flex gap-4 mb-8">
            <button
              onClick={handleStartRedemption}
              disabled={isPending}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 py-3 rounded-xl font-semibold transition-colors"
            >
              Start Redemption
            </button>
          </div>
        )}

        {pledge?.status === 'REDEEMING' && (
          <div className="flex gap-4 mb-8">
            <button
              onClick={handleClaim}
              disabled={isPending}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 py-3 rounded-xl font-semibold transition-colors"
            >
              Claim Pledge
            </button>
          </div>
        )}

        {/* New Commitment */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <button
            onClick={() => setShowNewCommitment(!showNewCommitment)}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-2xl">
                +
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-lg">New Commitment</h3>
                <p className="text-gray-400 text-sm">Stake ETH to lock in focus</p>
              </div>
            </div>
            <div className={`transform transition-transform ${showNewCommitment ? 'rotate-180' : ''}`}>
              ▲
            </div>
          </button>

          {showNewCommitment && (
            <div className="p-6 pt-0 border-t border-gray-800">
              <p className="text-gray-400 text-sm">
                Create a new commitment by staking ETH. Choose your challenge duration and session length to stay focused!
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Create Pledge Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-2xl font-bold">Create New Pledge</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreatePledge} className="p-6">
              {/* Pledge Title */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">
                  Pledge Title
                  <span className="text-gray-500 font-normal ml-2">(Off-chain)</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Mastering Solidity"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 transition-colors"
                />
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">
                  Description
                  <span className="text-gray-500 font-normal ml-2">(Off-chain)</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your focus goal..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 transition-colors resize-none"
                />
              </div>

              {/* Target Days */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">
                  Target Days
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 3, 7].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setFormData({ ...formData, targetDays: days as 1 | 3 | 7 })}
                      className={`py-3 rounded-xl font-semibold transition-colors ${formData.targetDays === days
                        ? 'bg-green-600 border-2 border-green-500'
                        : 'bg-gray-800 border-2 border-gray-700 hover:border-gray-600'
                        }`}
                    >
                      {days} {days === 1 ? 'Day' : 'Days'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stake Amount */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">
                  Stake Amount (ETH)
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={formData.stakeAmount}
                    onChange={(e) => setFormData({ ...formData, stakeAmount: e.target.value })}
                    placeholder="0.05"
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    ETH
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This amount will be locked during your pledge
                </p>
              </div>

              {/* Session Duration */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">
                  Session Duration (seconds)
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  min="60"
                  value={formData.sessionDuration}
                  onChange={(e) => setFormData({ ...formData, sessionDuration: e.target.value })}
                  placeholder="3600"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Minimum focus duration per session (e.g., 3600 = 1 hour)
                </p>
              </div>

              {/* Summary */}
              <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
                <h3 className="text-sm font-semibold mb-3 text-gray-400">Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Challenge Duration:</span>
                    <span className="font-semibold">{formData.targetDays} {formData.targetDays === 1 ? 'Day' : 'Days'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Stake Amount:</span>
                    <span className="font-semibold">{formData.stakeAmount || '0'} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Session Duration:</span>
                    <span className="font-semibold">
                      {formData.sessionDuration
                        ? `${Math.floor(parseInt(formData.sessionDuration) / 3600)}h ${Math.floor((parseInt(formData.sessionDuration) % 3600) / 60)}m`
                        : '0m'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 py-3 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !formData.stakeAmount || !formData.sessionDuration}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed py-3 rounded-xl font-semibold transition-colors"
                >
                  {isPending ? 'Creating...' : 'Create Pledge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
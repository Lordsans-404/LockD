'use client'

import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { useLockDRead } from '@/hooks/useLockdRead';
import { useLockDActions } from '@/hooks/useLockdActions';

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

  // Peninggalan kode AI
  const [currentPledgeId, setCurrentPledgeId] = useState<bigint>(BigInt(1));

  // UI state
  const [showNewCommitment, setShowNewCommitment] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
  const { pledge, canCheckIn, isLoading, cooldown } =
    useLockDRead(activePledgeId ?? undefined);

  // Semua action write (tx)
  const { createPledge, checkIn, startRedemption, claimPledge, isPending } =
    useLockDActions();

  /* ---------------- TIMER HEARTBEAT ---------------- */
  // Tick ini cuma buat maksa re-render tiap 1 detik
  // BUKAN buat nyimpen waktu
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

  /* ---------------- COUNTDOWN LOGIC ---------------- */
  // Deadline check-in berikutnya (berdasarkan data on-chain)
  const nextDeadline = useMemo(() => {
    if (!pledge || !cooldown) return null;

    const cooldownSeconds = Number(cooldown);

    // Kalau belum pernah check-in → hitung dari startTime
    // Kalau sudah → hitung dari lastCheckIn
    return pledge.lastCheckIn === 0
      ? pledge.startTime + cooldownSeconds
      : pledge.lastCheckIn + cooldownSeconds;
  }, [pledge, cooldown]);

  // Waktu tersisa (pure derived, tidak disimpan di state)
  const timeLeft = useMemo(() => {
    if (!nextDeadline) {
      return { hours: 0, minutes: 0, seconds: 0 };
    }

    const remaining = Math.max(0, nextDeadline - now);

    return {
      hours: Math.floor(remaining / 3600),
      minutes: Math.floor((remaining % 3600) / 60),
      seconds: remaining % 60,
    };
  }, [nextDeadline, now]);

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


  // Activity history data (mock)
  const activityHistory = [
    ['idle', 'idle', 'focus', 'idle', 'focus', 'idle', 'focus', 'idle', 'idle', 'idle', 'idle'],
    ['idle', 'idle', 'focus', 'fail', 'focus', 'idle', 'focus', 'idle', 'idle', 'idle', 'idle'],
    ['idle', 'idle', 'focus', 'idle', 'focus', 'idle', 'fail', 'idle', 'idle', 'idle', 'idle'],
    ['idle', 'focus', 'idle', 'idle', 'idle', 'idle', 'idle', 'idle', 'idle', 'idle', 'idle'],
    ['idle', 'idle', 'idle', 'idle', 'focus', 'idle', 'idle', 'idle', 'idle', 'idle', 'idle'],
  ];

  const handleCheckIn = async () => {
    if (!canCheckIn || !pledge) return;

    // In real implementation, you would generate signature from backend
    const mockSignature = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

    try {
      await checkIn({
        pledgeId: currentPledgeId,
        signature: mockSignature,
      });
    } catch (error) {
      console.error('Check-in failed:', error);
    }
  };

  const handleStartRedemption = async () => {
    if (!pledge) return;

    try {
      await startRedemption(currentPledgeId);
    } catch (error) {
      console.error('Start redemption failed:', error);
    }
  };

  const handleClaim = async () => {
    if (!pledge) return;

    try {
      await claimPledge(currentPledgeId);
    } catch (error) {
      console.error('Claim failed:', error);
    }
  };

  const handleCreatePledge = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.stakeAmount || !formData.sessionDuration) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const stakeAmount = parseEther(formData.stakeAmount);
      const sessionDuration = parseInt(formData.sessionDuration);

      await createPledge({
        targetDays: formData.targetDays,
        sessionDuration,
        stakeAmount,
      });

      // Save off-chain data (title, description) to your backend here
      console.log('Off-chain data:', {
        title: formData.title,
        description: formData.description,
      });

      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        stakeAmount: '',
        sessionDuration: '',
        targetDays: 7,
      });
    } catch (error) {
      console.error('Create pledge failed:', error);
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
          Mastering Solidity
        </h2>

        {/* Status Badge */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 bg-gray-900 rounded-full px-6 py-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className={`text-sm font-bold ${getStatusColor(pledge?.status)}`}>
              STATUS: {pledge?.status || 'INACTIVE'}
            </span>
          </div>
        </div>

        {/* Timer Circle */}
        <div className="flex justify-center mb-12">
          <div className="relative">
            {pledge && (pledge.status === "ACTIVE" || pledge.status === "REDEEMING") ? (
              // Active Pledge - Show Timer
              <div className="w-80 h-80 rounded-full border-4 border-green-500 flex flex-col items-center justify-center shadow-[0_0_80px_rgba(34,197,94,0.4)]">
                <div className="text-xl mb-2">⏳</div>
                <div className="text-6xl font-bold tracking-tight">
                  {String(timeLeft?.hours).padStart(2, '0')}:
                  {String(timeLeft?.minutes).padStart(2, '0')}:
                  {String(timeLeft?.seconds).padStart(2, '0')}
                </div>
                <div className="text-green-500 text-sm mt-2 font-semibold">
                  TO FAILURE
                </div>
                <button
                  onClick={handleCheckIn}
                  disabled={!canCheckIn || isPending}
                  className="mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-8 py-2 rounded-full font-semibold transition-colors"
                >
                  {isPending ? 'Processing...' : canCheckIn ? 'Check In' : 'Start Now'}
                </button>
              </div>
            ) : (
              // No Active Pledge - Show Create Button
              <div className="w-80 h-80 rounded-full border-4 border-gray-700 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(55,65,81,0.3)]">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-2xl font-bold mb-2">No Active Pledge</h3>
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
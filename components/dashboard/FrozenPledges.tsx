import { useReadContracts, usePublicClient } from 'wagmi';
import { LOCKD_ABI, LOCKD_ADDRESS } from '@/config/contract';
import { STATUS_MAP } from '@/hooks/useLockdRead';
import { useLockDActions } from '@/hooks/useLockdActions';
import { useMemo, useState } from 'react';

interface FrozenPledgesProps {
    pledgeIds: bigint[];
}

export default function FrozenPledges({ pledgeIds }: FrozenPledgesProps) {
    const { startRedemption, isPending: isWritePending } = useLockDActions();
    const publicClient = usePublicClient();
    const [redeemingId, setRedeemingId] = useState<bigint | null>(null);

    const handleRedeem = async (id: bigint) => {
        if (!publicClient) return;
        setRedeemingId(id);
        try {
            const hash = await startRedemption(id);
            await publicClient.waitForTransactionReceipt({ hash });
            window.location.reload();
        } catch (error) {
            console.error("Redemption error:", error);
            // Silent catch to prevent ugly alerts, standardizing with User Rejection behavior
        } finally {
            setRedeemingId(null);
        }
    };

    // 1. Fetch ALL pledges
    const { data: pledgesData, isLoading } = useReadContracts({
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

    // 2. Filter Frozen Pledges
    const frozenPledges = useMemo(() => {
        if (!pledgesData) return [];

        return pledgesData
            .map((result, index) => {
                if (result.status !== 'success' || !result.result) return null;

                // Result is likely an array/tuple based on ABI
                // [owner, stakedAmount, startTime, lastCheckIn, sessionDuration, targetDays, completedDays, status]
                const p = result.result as any;
                const statusIndex = Number(p[7]); // 8th item is status
                const status = STATUS_MAP[statusIndex];

                if (status === 'FROZEN') {
                    return {
                        id: pledgeIds[index],
                        stakedAmount: p[1],
                        completedDays: p[6],
                        targetDays: p[5],
                        status: status
                    };
                }
                return null;
            })
            .filter((p): p is NonNullable<typeof p> => p !== null);
    }, [pledgesData, pledgeIds]);

    if (isLoading) return null; // Or visual skeleton
    if (frozenPledges.length === 0) return null;

    return (
        <div className="relative overflow-hidden bg-black border-2 border-red-600 rounded-2xl p-8 mt-8 shadow-[0_0_50px_rgba(220,38,38,0.3)] animate-pulse">

            {/* Background Effects */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(220,38,38,0.1)_10px,rgba(220,38,38,0.1)_20px)] pointer-events-none" />

            <div className="relative z-10 text-center">
                <div className="mb-6">
                    <h3 className="text-3xl font-black text-red-600 uppercase tracking-[0.2em] animate-bounce">
                        ⚠️ ASSETS FROZEN ⚠️
                    </h3>
                    <p className="text-red-400 font-bold mt-2 uppercase tracking-widest text-sm">
                        Immediate Action Required
                    </p>
                </div>

                <div className="space-y-8">
                    {frozenPledges.map((pledge) => (
                        <div key={pledge.id.toString()} className="bg-red-950/50 backdrop-blur-sm rounded-xl p-6 border border-red-500/50 flex flex-col items-center gap-6 group hover:bg-red-900/50 transition-colors">

                            {/* PLEDGE ID */}
                            <div className="font-mono text-xs text-red-500 bg-red-950 px-3 py-1 rounded-full border border-red-800">
                                PLEDGE ID: #{pledge.id.toString()}
                            </div>

                            {/* HOSTAGED STAKE - CENTERPIECE */}
                            <div className="flex flex-col items-center">
                                <span className="text-sm text-red-400 uppercase font-bold tracking-widest mb-1">
                                    Hostaged Stake
                                </span>
                                <div className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 filter drop-shadow-[0_0_10px_rgba(220,38,38,0.8)] font-mono animate-pulse">
                                    {(Number(pledge.stakedAmount) / 1e18).toFixed(4)} ETH
                                </div>
                            </div>

                            {/* PROGRESS & BUTTON */}
                            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-red-900/50">
                                <div className="text-red-400 text-sm font-semibold">
                                    Progress Halted: <span className="text-white">{pledge.completedDays}/{pledge.targetDays} Days</span>
                                </div>

                                <button
                                    onClick={() => handleRedeem(pledge.id)}
                                    disabled={isWritePending || redeemingId === pledge.id}
                                    className="w-full md:w-auto bg-red-600 hover:bg-red-500 text-white text-lg px-8 py-3 rounded-xl font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:shadow-[0_0_40px_rgba(220,38,38,0.8)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale mb-1"
                                >
                                    {redeemingId === pledge.id ? 'CONFIRMING...' : (isWritePending ? 'CHECK WALLET...' : 'START REDEMPTION')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { parseEther, formatEther } from 'viem';
import { useAccount } from 'wagmi';
import { useLockDActions } from '@/hooks/useLockdActions';
import { useLockDRead } from '@/hooks/useLockdRead';

interface CreatePledgeModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreatePledgeModal({ onClose, onSuccess }: CreatePledgeModalProps) {
    const { address } = useAccount();
    const { createPledge, isPending } = useLockDActions();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        stakeAmount: '',
        sessionDuration: '',
        targetDays: 7 as 1 | 3 | 7,
    });
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const { minStake, minSessionDuration, maxSessionDuration } = useLockDRead();

    // Validation Logic
    const isStakeValid = !formData.stakeAmount || !minStake || parseEther(formData.stakeAmount) >= (minStake as bigint);

    // Duration is valid if empty (initial) OR within range [min, max]
    const isDurationValid = !formData.sessionDuration || (
        (!minSessionDuration || Number(formData.sessionDuration) >= Number(minSessionDuration)) &&
        (!maxSessionDuration || Number(formData.sessionDuration) <= Number(maxSessionDuration))
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null); // Clear previous errors
        try {
            if (!formData.stakeAmount || !formData.sessionDuration) return;

            const stakeAmount = parseEther(formData.stakeAmount);

            console.log("=== CREATING PLEDGE ===");

            // 1. Blockchain Tx
            const result = await createPledge({
                targetDays: formData.targetDays,
                sessionDuration: Number(formData.sessionDuration),
                stakeAmount,
            });

            if (!result.pledgeId) throw new Error("Failed to get pledge ID");

            // 2. Metadata Save (Off-chain)
            await fetch("/api/pledges", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pledgeId: result.pledgeId.toString(),
                    title: formData.title || "Untitled Pledge",
                    description: formData.description || "",
                    owner: address,
                }),
            });

            // 🔧 FIXED: Store success flag for parent to handle
            localStorage.setItem('lockd_pledge_created', result.pledgeId.toString());
            onSuccess();
        } catch (error: any) {
            console.error("Create Pledge Failed:", error);
            const msg = error.message || "";

            if (msg.includes("User rejected") || msg.includes("User denied")) {
                setErrorMessage("Transaction was cancelled");
            } else if (msg.includes("ContractFunctionExecutionError") || msg.includes("reverted") || msg.includes("Internal JSON-RPC")) {
                setErrorMessage("Network is busy. Please wait a moment and try again.");
            } else if (msg.includes("insufficient funds")) {
                setErrorMessage("Insufficient funds for this transaction");
            } else {
                setErrorMessage("Something went wrong. Please try again.");
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                    <h2 className="text-2xl font-bold">Create New Pledge</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
                        ×
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} className="p-6">
                    {/* Pledge Title */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold mb-2">
                            Pledge Title <span className="text-gray-500 font-normal ml-2">(Off-chain)</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., Mastering Solidity"
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 transition-colors"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold mb-2">
                            Description <span className="text-gray-500 font-normal ml-2">(Off-chain)</span>
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Describe your focus goal..."
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 transition-colors resize-none"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    {/* Target Days Selector */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold mb-2">
                            Target Days <span className="text-red-500 ml-1">*</span>
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

                    {/* Inputs for Stake & Duration */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {/* Stake Amount */}
                        <div>
                            <label className="block text-sm font-semibold mb-2">
                                Stake (ETH) <span className="text-red-500 ml-1">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number" step="0.001" min="0" placeholder="0.05" required
                                    className={`w-full bg-gray-800 border rounded-xl px-4 py-3 focus:outline-none transition-colors ${isStakeValid ? 'border-gray-700 focus:border-green-500' : 'border-red-500 focus:border-red-500'
                                        }`}
                                    value={formData.stakeAmount}
                                    onChange={e => setFormData({ ...formData, stakeAmount: e.target.value })}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">ETH</span>
                            </div>
                            {!isStakeValid && minStake && (
                                <p className="text-red-500 text-xs mt-1">
                                    Min stake: {formatEther(minStake as bigint)} ETH
                                </p>
                            )}
                        </div>

                        {/* Session Duration */}
                        <div>
                            <label className="block text-sm font-semibold mb-2">
                                Duration (Sec) <span className="text-red-500 ml-1">*</span>
                            </label>
                            <input
                                type="number" min="60" placeholder="3600" required
                                className={`w-full bg-gray-800 border rounded-xl px-4 py-3 focus:outline-none transition-colors ${isDurationValid ? 'border-gray-700 focus:border-green-500' : 'border-red-500 focus:border-red-500'
                                    }`}
                                value={formData.sessionDuration}
                                onChange={e => setFormData({ ...formData, sessionDuration: e.target.value })}
                            />
                            {!isDurationValid && (
                                <p className="text-red-500 text-xs mt-1">
                                    {minSessionDuration && Number(formData.sessionDuration) < Number(minSessionDuration)
                                        ? `Min: ${Number(minSessionDuration) / 60} mins`
                                        : maxSessionDuration && Number(formData.sessionDuration) > Number(maxSessionDuration)
                                            ? `Max: ${Number(maxSessionDuration) / 3600} hours`
                                            : "Invalid duration"}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Summary Box */}
                    <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
                        <h3 className="text-sm font-semibold mb-3 text-gray-400">Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Challenge:</span>
                                <span className="font-semibold">{formData.targetDays} Days</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Stake:</span>
                                <span className="font-semibold">{formData.stakeAmount || '0'} ETH</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Session:</span>
                                <span className="font-semibold">
                                    {formData.sessionDuration
                                        ? `${Math.floor(parseInt(formData.sessionDuration) / 60)} mins`
                                        : '0 mins'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {errorMessage && (
                        <div className="bg-yellow-900/30 border border-yellow-600 rounded-xl p-4 mb-6 text-center">
                            <p className="text-yellow-400 font-medium">⚠️ {errorMessage}</p>
                            <p className="text-gray-400 text-sm mt-1">Click the button below to try again</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 py-3 rounded-xl font-semibold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || !formData.stakeAmount || !formData.sessionDuration || !isStakeValid || !isDurationValid}
                            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed py-3 rounded-xl font-semibold transition-colors"
                        >
                            {isPending ? 'Creating...' : 'Create Pledge'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
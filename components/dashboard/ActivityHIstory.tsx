import { useMemo } from 'react';

interface ActivityHistoryProps {
    targetDays: number;
    completedDays: number;
    status: string; // 'ACTIVE' | 'LIQUIDATED' | 'CLAIMED' | 'REDEEMING' | 'FROZEN'
}

export default function ActivityHistory({ targetDays, completedDays, status }: ActivityHistoryProps) {

    // Logic untuk menentukan status visual setiap hari (kotak)
    const days = useMemo(() => {
        return Array.from({ length: targetDays }, (_, index) => {
            const dayNumber = index + 1;

            // Case 1: Sudah selesai (Past)
            if (index < completedDays) {
                return { status: 'COMPLETED', label: dayNumber };
            }

            // Case 2: Hari ini/Sedang berjalan (Current)
            if (index === completedDays) {
                if (status === 'LIQUIDATED') return { status: 'FAILED', label: dayNumber };
                if (status === 'ACTIVE' || status === 'REDEEMING') return { status: 'CURRENT', label: dayNumber };
                // Jika status CLAIMED/REDEEMING tapi index == completedDays, berarti sudah selesai semua
                if (status === 'CLAIMED') return { status: 'COMPLETED', label: dayNumber };
            }

            // Case 3: Masa depan (Future)
            return { status: 'LOCKED', label: dayNumber };
        });
    }, [targetDays, completedDays, status]);

    // Helper untuk styling berdasarkan status
    const getStyle = (itemStatus: string) => {
        switch (itemStatus) {
            case 'COMPLETED':
                return 'bg-gray-900 border-green-500 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]';
            case 'CURRENT':
                return 'border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]';
            case 'FAILED':
                return 'bg-gray-900 border-red-500 text-red-500';
            case 'LOCKED':
            default:
                return 'bg-gray-900 border-gray-700 text-gray-600';
        }
    };

    const getIcon = (itemStatus: string) => {
        switch (itemStatus) {
            case 'COMPLETED': return (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
            );
            case 'CURRENT': return (
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_currentColor]" />
            );
            case 'FAILED': return (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
            );
            default: return ( // Locked Icon
                <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            );
        }
    };

    return (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h3 className="text-lg font-semibold text-white">Focus Journey</h3>
                    <p className="text-sm text-gray-400 mt-1">Keep the streak alive</p>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-bold text-white">{completedDays}</span>
                    <span className="text-gray-500 text-sm">/{targetDays} Days</span>
                </div>
            </div>

            {/* Timeline Container */}
            <div className="relative w-full py-4 px-2">

                {/* Connector Line Base */}
                <div className="absolute top-1/2 left-4 right-4 h-1 bg-gray-800 -translate-y-1/2 rounded-full -z-0" />

                {/* Connector Line Progress */}
                <div
                    className="absolute top-1/2 left-4 h-1 bg-gradient-to-r from-green-500 to-blue-500 -translate-y-1/2 rounded-full -z-0 transition-all duration-700"
                    style={{ width: `calc(${Math.min((completedDays / (targetDays - 1 || 1)) * 100, 100)}% - 2rem)` }} // Approx logic for visual progress
                />

                {/* Steps Container */}
                <div className={`flex items-center w-full z-10 ${targetDays <= 3 ? 'justify-evenly' : 'justify-between'}`}>
                    {days.map((day, idx) => (
                        <div
                            key={idx}
                            className={`
                                relative group flex flex-col items-center justify-center
                                w-12 h-12 md:w-14 md:h-14 rounded-full border-2 transition-all duration-300 z-10
                                ${day.status === 'CURRENT' ? 'scale-110 ring-4 ring-blue-500/20 bg-gray-900' : 'bg-gray-900'}
                                ${getStyle(day.status)}
                            `}
                        >
                            {/* Day Number */}
                            <span className="text-sm md:text-base font-bold">{day.label}</span>

                            {/* Status Icon Indicator (Absolute Bottom - optional or integrated) */}
                            {day.status === 'COMPLETED' && (
                                <div className="absolute -bottom-1 -right-1 bg-green-500 text-black rounded-full p-0.5">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}

                            {/* Tooltip on Hover */}
                            <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-gray-800 px-2 py-1 rounded text-white whitespace-nowrap pointer-events-none">
                                {day.status}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Current Target Indicator */}
            {status === 'ACTIVE' && (
                <div className="mt-8 text-center">
                    <p className="text-gray-400 text-sm">
                        Today's Target: <span className="text-white font-bold">Session {completedDays + 1}</span>
                    </p>
                </div>
            )}
        </div>
    );
}
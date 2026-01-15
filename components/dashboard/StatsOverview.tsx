import ActivityHistory from './ActivityHIstory';

interface StatsOverviewProps {
    pledge: any;
}

export default function StatsOverview({ pledge }: StatsOverviewProps) {
    const formatEth = (wei: bigint) => (Number(wei) / 1e18).toFixed(4);

    return (
        <>
            {/* 7-Day Challenge Progress */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold">
                        {pledge?.status === 'REDEEMING' ? 'Redemption Progress ⚠️' : 'Challenge Progress'}
                    </h3>
                    <span className={pledge?.status === 'REDEEMING' ? 'text-yellow-500 font-semibold' : 'text-green-500 font-semibold'}>
                        Day {pledge?.completedDays || 0} / {pledge?.targetDays || 7}
                    </span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ${pledge?.status === 'REDEEMING' ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${((pledge?.completedDays || 0) / (pledge?.targetDays || 1)) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                    <div className="text-gray-400 text-sm mb-1">Daily Streak</div>
                    <div className="text-3xl font-bold">{pledge?.completedDays || 0} Days</div>
                </div>
                <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                    <div className="text-gray-400 text-sm mb-1">Hostaged Assets</div>
                    <div className="text-3xl font-bold text-red-500">
                        {pledge ? `-${formatEth(pledge.stakedAmount)} ETH` : '0 ETH'}
                    </div>
                </div>
            </div>

            {/* Activity History Grid */}
            {pledge && (
                <ActivityHistory
                    targetDays={Number(pledge.targetDays)}
                    completedDays={Number(pledge.completedDays)}
                    status={pledge.status || 'INACTIVE'}
                />
            )}
        </>
    );
}
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import Image from 'next/image';
import { useState, useMemo } from 'react';

export interface NotificationItem {
    title: string;
    msg: string;
    type: 'info' | 'warning' | 'error' | 'success';
}

interface NavbarProps {
    pledge?: any; // Consider typing this properly if possible
    isLate?: boolean;
    activePledgeId?: bigint | null;
    customNotifications?: NotificationItem[];
}

export default function Navbar({ pledge, isLate, activePledgeId, customNotifications = [] }: NavbarProps) {
    const { address, isConnected } = useAccount();
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();
    const [showMenu, setShowMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    const handleConnect = () => {
        connect({ connector: injected() });
    };

    const handleDisconnect = () => {
        disconnect();
        setShowMenu(false);
    };

    // Notification Logic
    const notifications = useMemo(() => {
        const list = [];

        if (pledge) {
            if (pledge.status === 'ACTIVE') {
                list.push({
                    title: 'Keep Going! 🔥',
                    msg: `Day ${pledge.completedDays} of ${pledge.targetDays}. You're doing great!`,
                    type: 'info'
                });
                if (isLate) {
                    list.push({
                        title: 'Missed Deadline ⚠️',
                        msg: 'You are late for check-in! Do it now before it freezes!',
                        type: 'warning'
                    });
                }
            } else if (pledge.status === 'FROZEN') {
                list.push({
                    title: 'Assets Frozen ❄️',
                    msg: 'You missed a check-in. Redemption is required to recover assets.',
                    type: 'error'
                });
            } else if (pledge.status === 'REDEEMING') {
                list.push({
                    title: 'Redemption Mode 🛠️',
                    msg: 'You are in recovery mode. Complete sessions to unfreeze.',
                    type: 'warning'
                });
            } else if (pledge.status === 'CLAIMED') {
                list.push({
                    title: 'Pledge Claimed 🎉',
                    msg: 'Success! You have claimed your pledge.',
                    type: 'success'
                });
            }
        }

        return [...customNotifications, ...list];
    }, [pledge, isLate, customNotifications]);

    const hasUnread = notifications.length > 0;

    return (
        <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-50">
            <div className="backdrop-blur-md bg-gray-900/70 border border-gray-700/50 rounded-2xl shadow-2xl px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo Section */}
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="relative w-32 h-6 transition-transform duration-300 group-hover:scale-105">
                            <Image
                                src="/logo-lockd.png"
                                alt="LockD Logo"
                                fill
                                sizes="128px"
                                className="object-contain" // Use contain to show full logo
                                priority
                            />
                        </div>
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center gap-4">
                        {isConnected ? (
                            <>
                                {/* Wallet Address */}
                                <div className="relative">
                                    <button
                                        onClick={() => {
                                            setShowMenu(!showMenu);
                                            setShowNotifications(false);
                                        }}
                                        className="flex items-center gap-2 md:gap-3 bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-full px-3 md:px-5 py-2.5 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
                                    >
                                        {/* Mobile: Wallet Icon Only */}
                                        <svg className="w-5 h-5 text-gray-300 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>

                                        {/* Desktop: Status Dot & Address */}
                                        <div className="hidden md:block w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                                        <span className="hidden md:block text-sm font-mono text-gray-300">
                                            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                                        </span>

                                        <svg
                                            className={`w-4 h-4 transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {showMenu && (
                                        <div className="absolute right-0 mt-2 w-48 backdrop-blur-md bg-gray-900/90 border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden">
                                            <button
                                                onClick={handleDisconnect}
                                                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors duration-200 flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                </svg>
                                                Disconnect
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Notification Button */}
                                <div className="relative">
                                    <button
                                        onClick={() => {
                                            setShowNotifications(!showNotifications);
                                            setShowMenu(false);
                                        }}
                                        className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm p-2.5 rounded-full border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 hover:scale-110 relative"
                                    >
                                        {hasUnread && (
                                            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-gray-900"></span>
                                        )}
                                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    </button>

                                    {/* Notifications Dropdown */}
                                    {showNotifications && (
                                        <div className="absolute right-0 mt-2 w-72 backdrop-blur-md bg-gray-900/95 border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-50">
                                            <div className="px-4 py-3 border-b border-gray-800">
                                                <h3 className="text-sm font-semibold text-gray-200">Notifications</h3>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto">
                                                {notifications.length > 0 ? (
                                                    notifications.map((note, idx) => (
                                                        <div key={idx} className="px-4 py-3 border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <h4 className={`text-sm font-bold ${note.type === 'error' ? 'text-red-400' :
                                                                    note.type === 'warning' ? 'text-yellow-400' :
                                                                        note.type === 'success' ? 'text-green-400' : 'text-blue-400'
                                                                    }`}>{note.title}</h4>
                                                            </div>
                                                            <p className="text-xs text-gray-400">{note.msg}</p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-6 text-center text-gray-500 text-sm">
                                                        No new notifications
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Connect Button */
                            <button
                                onClick={handleConnect}
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-6 py-2.5 rounded-full font-semibold text-white shadow-lg hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 hover:scale-105 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Connect Wallet
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
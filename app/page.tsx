'use client'
import { useState, useEffect } from 'react';
import { Check, Target, Zap, Lock, Wallet, Eye, Key, Code, Edit, Users, LogOut } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const LockIDLanding = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  /* 
  // Disable Auto-Redirect so users can see the Landing Page
  useEffect(() => {
    if (isConnected) {
      router.push('/dashboard');
    }
  }, [isConnected, router]); 
  */

  const handleConnect = (connector: any) => {
    connect({ connector });
    setShowConnectModal(false);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const ConnectButton = ({ className }: { className: string }) => {
    if (isConnected) {
      return (
        <button
          onClick={handleDisconnect}
          className={className}
        >
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          {formatAddress(address!)}
          <LogOut className="w-4 h-4" />
        </button>
      );
    }

    return (
      <button
        onClick={() => setShowConnectModal(true)}
        className={className}
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>
    );
  };

  const ConnectModal = () => {
    if (!showConnectModal) return null;

    return (
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => setShowConnectModal(false)}
      >
        <div
          className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold">Connect Wallet</h3>
            <button
              onClick={() => setShowConnectModal(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => handleConnect(connector)}
                className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition border border-slate-600 hover:border-teal-500"
              >
                <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-teal-400" />
                </div>
                <span className="font-semibold">Connect {connector.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Connect Wallet Modal */}
      <ConnectModal />

      {/* Header */}
      {/* Header - Floating Capsule Style */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-50">
        <div className="backdrop-blur-md bg-gray-900/80 border border-gray-700/50 rounded-2xl shadow-2xl px-6 py-4">
          <nav className="flex items-center justify-between">
            {/* Logo */}
            <div className="relative w-32 h-8 cursor-pointer transition-transform hover:scale-105">
              <Image
                src="/logo-lockd.png"
                alt="LockD Logo"
                fill
                className="object-contain"
                priority
              />
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8 bg-black/20 px-6 py-2 rounded-full border border-gray-700/30 backdrop-blur-sm">
              <a href="#how" className="text-sm font-medium text-gray-300 hover:text-teal-400 transition-colors">How It Works</a>
              <a href="#why" className="text-sm font-medium text-gray-300 hover:text-teal-400 transition-colors">Why LockID</a>
              <a href="#community" className="text-sm font-medium text-gray-300 hover:text-teal-400 transition-colors">Community</a>
            </div>

            <div className="flex items-center gap-4">
              <ConnectButton className="hidden md:flex px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-full transition-all shadow-lg hover:shadow-teal-500/20 items-center gap-2 text-sm" />

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 text-gray-300 hover:text-white"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? "✕" : "☰"}
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile Menu Dropdown (Outside capsule for space) */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 mx-auto w-full bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl p-4 shadow-2xl flex flex-col space-y-4 animate-in fade-in slide-in-from-top-4">
            <a href="#how" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-teal-400 font-medium py-2 px-4 rounded-lg hover:bg-slate-800 transition">How It Works</a>
            <a href="#why" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-teal-400 font-medium py-2 px-4 rounded-lg hover:bg-slate-800 transition">Why LockID</a>
            <a href="#community" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-teal-400 font-medium py-2 px-4 rounded-lg hover:bg-slate-800 transition">Community</a>
            <ConnectButton className="px-6 py-3 bg-teal-500 text-black font-bold rounded-xl active:bg-teal-600 transition flex items-center justify-center gap-2 w-full" />
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>

              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Stop Relying on <span className="text-gray-400">Motivation.</span>
              </h1>

              <p className="text-gray-300 mb-8 text-lg">
                Put real stakes behind your focus. Lock money as a self-pledge.
                Complete your tasks to get it back. Build discipline that actually lasts.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                {isConnected ? (
                  <>
                    <a
                      href="/dashboard"
                      className="px-8 py-3 bg-teal-500 rounded-full hover:bg-teal-600 transition flex items-center justify-center gap-2"
                    >
                      Dashboard →
                    </a>
                    <button
                      onClick={handleDisconnect}
                      className="px-8 py-3 bg-transparent border border-gray-600 rounded-full hover:border-red-400 transition flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-5 h-5" />
                      Disconnect
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setShowConnectModal(true)}
                      className="px-8 py-3 bg-teal-500 rounded-full hover:bg-teal-600 transition flex items-center justify-center gap-2"
                    >
                      <Wallet className="w-5 h-5" />
                      Connect Wallet →
                    </button>
                    <button className="px-8 py-3 bg-transparent border border-gray-600 rounded-full hover:border-teal-400 transition flex items-center justify-center gap-2">
                      <Eye className="w-5 h-5" />
                      Watch Demo
                    </button>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-teal-400" />
                  Self-Pledging
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-teal-400" />
                  Verifiable Tasks
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-teal-400" />
                  No Hidden Fees
                </div>
              </div>
            </div>

            {/* Pledge Card */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                    📚
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Current Pledge</div>
                    <div className="font-semibold">Study for Exam</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-400 font-bold">$50.00 Locked</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Time Remaining</span>
                  <span className="text-white">03:45:22</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-teal-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4 mb-4 flex items-center justify-center gap-2">
                <Lock className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300">Focus Mode Active</span>
              </div>

              <button className="w-full py-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition">
                Verify Completion
              </button>

              <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
                <Check className="w-4 h-4 text-green-400" />
                <span>+15% Power Score</span>
                <span className="ml-auto">Streak: 7 Days</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-20 px-4 bg-slate-900/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-400">Three simple steps to build unshakeable discipline</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-8 border border-slate-700 hover:border-teal-500 transition">
              <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center mb-6">
                <Target className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold mb-4">Create a Pledge</h3>
              <p className="text-gray-400">
                Set your focus duration and lock ETH as a commitment.
                The amount should be enough to make you care.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-8 border border-slate-700 hover:border-teal-500 transition">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold mb-4">Focus Session Starts</h3>
              <p className="text-gray-400">
                The timer runs. No distractions. No excuses.
                Your funds are locked in the smart contract with the session ends.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-8 border border-slate-700 hover:border-teal-500 transition">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-6">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-4">Finish or Fail</h3>
              <p className="text-gray-400">
                Finish the task = money back. Fail a session?
                Money lost to the treasury. You only lose if you quit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why LockID */}
      <section id="why" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why LockID?</h2>
            <p className="text-gray-400">Most productivity tools are suggestions. LockID is a commitment.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-8 border border-slate-700">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">📱</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-3 text-blue-400">NOT A TO-DO APP</h3>
                  <p className="text-gray-400">
                    We don't manage lists. We enforce execution on the one thing that matters right now.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-8 border border-slate-700">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🚫</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-3 text-red-400">NOT MOTIVATION</h3>
                  <p className="text-gray-400">
                    Quotes and hype lose shine. We rely on tangible stakes that matter.
                    You feel loss if it fails.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-8 border border-slate-700">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">⚖️</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-3 text-purple-400">NOT PUNISHMENT</h3>
                  <p className="text-gray-400">
                    You aren't here to fail, but. Your funds are simply held and only given back to fulfill the work.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-8 border border-slate-700">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">✅</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-3 text-green-400">REAL ACCOUNTABILITY</h3>
                  <p className="text-gray-400">
                    Smart contracts serve as an unbiased accountability partner
                    that cuts across, depends with real stakes, reported data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="py-20 px-4 bg-slate-900/50">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            "Motivation fades. <br />
            <span className="text-gray-400">Consequences don't."</span>
          </h2>
          <p className="text-gray-400 mt-6">Build a system that works even on your worst days</p>
        </div>
      </section>

      {/* Trust & Transparency */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Built on Trust & Transparency</h2>
            <p className="text-gray-400">Verifiable, secure, and entirely under your control</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-teal-400" />
              </div>
              <h3 className="font-bold mb-2">Non-custodial</h3>
              <p className="text-sm text-gray-400">
                We never touch your crypto directly. You maintain ownership. Or your wallet.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8 text-teal-400" />
              </div>
              <h3 className="font-bold mb-2">Smart Contract</h3>
              <p className="text-sm text-gray-400">
                All logic is executed on-chain. We trust math & transparent and open-source.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-teal-400" />
              </div>
              <h3 className="font-bold mb-2">No Hidden Fees</h3>
              <p className="text-sm text-gray-400">
                What you lock is what you get back. We don't charge fees for success.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-teal-400" />
              </div>
              <h3 className="font-bold mb-2">You Control Funds</h3>
              <p className="text-sm text-gray-400">
                Funds are only released based on the on-chain result. We can't prevent.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Built for Builders */}
      <section className="py-20 px-4 bg-slate-900/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Built for those who build</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🎓</span>
              </div>
              <h3 className="font-bold mb-2">Students</h3>
              <p className="text-sm text-gray-400">
                Lock funds when: Study for Exam. Complete assignments.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <Code className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-bold mb-2">Builders</h3>
              <p className="text-sm text-gray-400">
                Ship your code. Spend less. Hours go coding, every day.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
                <Edit className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="font-bold mb-2">Writers</h3>
              <p className="text-sm text-gray-400">
                Hit your word count. Finish the essay. Start Writers block.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="font-bold mb-2">Everyone</h3>
              <p className="text-sm text-gray-400">
                Anyone struggling with Consistency can use it to level up.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-4 bg-gradient-to-b from-slate-900 to-teal-900/20">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            Make a promise your future self can't ignore.
          </h2>
          {isConnected ? (
            <a
              href="/dashboard"
              className="px-12 py-4 bg-white text-slate-900 rounded-full hover:bg-gray-100 transition font-semibold text-lg flex items-center gap-2 mx-auto"
            >
              Go to Dashboard →
            </a>
          ) : (
            <button
              onClick={() => setShowConnectModal(true)}
              className="px-12 py-4 bg-white text-slate-900 rounded-full hover:bg-gray-100 transition font-semibold text-lg flex items-center gap-2 mx-auto"
            >
              <Wallet className="w-5 h-5" />
              Connect Wallet & Start
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-slate-800">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-2xl font-bold">
              Lock<span className="text-teal-400">ID</span>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-400">
              <a href="#" className="hover:text-teal-400 transition">Privacy Policy</a>
              <a href="#" className="hover:text-teal-400 transition">Terms of Service</a>
              <a href="#" className="hover:text-teal-400 transition">Twitter</a>
              <a href="#" className="hover:text-teal-400 transition">Discord</a>
            </div>

            <div className="text-sm text-gray-500">
              © 2025 LockID Protocol. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LockIDLanding;
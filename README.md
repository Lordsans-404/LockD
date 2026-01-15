# 🔒 LockD: Decentralized Commitment Protocol

> **"Your assets, held hostage by your discipline."**

LockD is a Web3 productivity enforcer that uses **Loss Aversion psychology** to cure procrastination. Users stake crypto assets into a Smart Contract to lock a commitment. If they fail to check in, the assets are frozen.

### 🚩 The Problem
Self-discipline is hard because there are no immediate consequences for skipping a day. Most habit trackers are passive; they only show you what you missed.

### ⚡ The Solution
LockD moves the pain of failure to the present. We don't just track your habits; **we take your crypto hostage.** You only get it back if you complete your streak.

---

## 🏆 Key Features (Why LockD?)

Unlike generic habit trackers, LockD implements **Game Theory** mechanics directly on-chain:

### 1. 💀 Sudden Death Mechanism
There are no "partial" failures. If you miss your check-in window (> 24 hours + grace period), your status flips to **FROZEN** immediately via passive logic checks.

### 2. ❄️ Hostaged Stake & Redemption Arc
A frozen pledge isn't lost... yet.
* **The Freeze:** Your funds are locked. You cannot withdraw.
* **The Redemption:** You are forced into a **3-Day Redemption Mission**.
* **The Cost:** If you succeed in redemption, you only recover **80%** of your funds (20% penalty goes to the protocol). If you fail again? **100% Liquidation.**

### 3. ⛽ Gas-Optimized Architecture
Built for efficiency. The Smart Contract uses **Variable Packing** (fitting `address`, `uint96`, `uint40`, and `enums` into just 2 storage slots) to minimize gas costs for users while maintaining complex state logic.

### 4. 🛡️ Trustless Verification
* **No Backend required:** Core logic lives entirely on EVM.
* **Anti-Cheat:** Enforces minimum cooldowns (cannot spam check-ins) and maximum session durations.

---

## ⚙️ How It Works

1.  **Commit:** User selects a duration (1, 3, or 7 days) and stakes crypto (e.g., $5 USDC).
2.  **Focus:** User completes offline tasks and clicks "Check-In" daily.
3.  **Validation:** Smart Contract verifies the `block.timestamp` against the `lastCheckIn` time.
4.  **Settlement:**
    * **Success:** Withdraw 100% of Stake.
    * **Late:** Assets Frozen -> User must start **Redemption**.
    * **Abandon:** Anyone can trigger `liquidateAbandonedPledge()` to clear stale states.

---

## 🛠 Tech Stack

* **Smart Contract:** Solidity (OpenZeppelin ReentrancyGuard, IERC20).
* **Frontend:** Next JS, TailwindCSS.
* **Web3 Integration:** Wagmi, Viem.
* **Network:** Arbitrum Sepolia

---

## 🚀 Deployment Info

* **Contract Address:** `0x9a911648a0e069d1D8198Db9E30a50d6f4269a48`
* **Network:** `ArbitrumSepolia`
* **Token Used:** `ETH`

---

## 📦 Local Development

1.  **Clone the repo**
    ```bash
    git clone [https://github.com/lordsans-404/lockd.git](https://github.com/lordsans-404/lockd.git)
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run frontend**
    ```bash
    npm run dev
    ```

---

*Built by Lordsans-404*
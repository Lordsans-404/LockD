# LockD – Web3 Commitment DApp

LockD adalah dApp berbasis Next.js yang memungkinkan user membuat komitmen (pledge) dengan staking ETH.
Smart contract adalah **source of truth**, Firebase hanya menyimpan **metadata off-chain**.

---

## 🛠 Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Web3:** wagmi, viem
- **Smart Contract:** Solidity
- **Database:** Firebase Firestore

---

## 🔗 Smart Contract (LockD)

### Read (View)
- `COOLDOWN`: Durasi waktu tunggu antar check-in.
- `GRACE_PERIOD`: Batas waktu toleransi.
- `nextPledgeId`: Counter ID untuk pledge.
- `pledges(uint256)`: Mapping data pledge.

### Write (Transaction)
- `createPledge(uint8 targetDays, uint32 sessionDuration)`
- `checkIn(uint256 pledgeId, bytes signature)`
- `startRedemption(uint256 pledgeId)`
- `claimPledge(uint256 pledgeId)`

### 🔐 Security
- `checkIn` membutuhkan signature ECDSA.
- Private key signer **hanya ada di backend**.
- Frontend **tidak pernah** sign message check-in.

---

## 🪝 Frontend Hooks

### `useLockDRead`
Hook read-only untuk ambil data dari smart contract.

**Menyediakan:**
- `pledge`
- `cooldown`
- `gracePeriod`
- `canCheckIn`
- derived state (status, progress)

**Kegunaan:**
- Status pledge di dashboard.
- Logic tombol check-in.
- Countdown visual.

### `useLockDActions`
Hook write untuk semua transaksi user.

**Menyediakan:**
- `createPledge`
- `checkIn`
- `startRedemption`
- `claimPledge`

> **Note:** Hook ini **tidak meng-handle signature**.

---

## 📡 Backend (Next.js API)

### `/api/checkin-sign`
- Generate signature untuk fungsi `checkIn`.
- Menggunakan private key signer.
- **Validasi:** Owner pledge & State pledge.
- **Return:** `signature`.

**Flow:** Request signature → Receive signature → Call checkIn()

### `/api/user-pledges`
- Index pledge milik user menggunakan event `PledgeCreated`.
- **Return:** `pledgeId[]`.
- Digunakan untuk render list dashboard.

---

## ⏳ Countdown Logic

- Countdown **tidak disimpan di state**.
- Countdown adalah derived data dari: `startTime`, `lastCheckIn`, `COOLDOWN` (on-chain).

**Implementasi:** Re-render tiap detik menggunakan `tick`.

```ts
const [tick, setTick] = useState(0);

useEffect(() => {
  const id = setInterval(() => setTick(t => t + 1), 1000);
  return () => clearInterval(id);
}, []);
```

---

## 🔥 Firebase (Off-chain Metadata)

Firebase hanya menyimpan data UI, tanpa logic bisnis.

### Struktur Dokumen
```ts
{
  pledgeId: number | null,
  owner: string,
  title: string,
  description: string,
  createdAt: timestamp
}
```

❌ **Tidak menyimpan:** `stake`, `status`, `reward`, `duration` (Ini semua ada di Blockchain).

### Alur Data

**Create Pledge:**
1. User submit form
2. `createPledge` tx (Blockchain)
3. Tx Sukses
4. Simpan Title & Desc ke Firebase

**Check-In:**
1. User klik Check-In
2. Request signature ke Backend
3. Backend sign & return signature
4. Frontend call `checkIn()` ke Contract

---

## ✅ Status Progres

- [x] Smart contract ABI integrated
- [x] Read hooks
- [x] Write hooks
- [x] Backend signer
- [x] Event indexing
- [x] Countdown on-chain
- [x] Firebase metadata minimal
- [x] Dashboard terhubung end-to-end

---

## 🏛 Catatan Arsitektur

| Komponen | Peran |
| :--- | :--- |
| **Frontend** | UX & Visualisasi |
| **Backend** | Security & Signer |
| **Blockchain** | Source of Truth |
| **Firebase** | Metadata UI |
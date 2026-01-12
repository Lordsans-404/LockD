/**
 * Script ini cuma buat:
 * - bikin collection `pledgeMetadata`
 * - memastikan struktur field konsisten
 *
 * Firestore akan otomatis create collection saat addDoc pertama
 */

import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import dotenv from "dotenv";

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

async function init() {
  await addDoc(collection(db, "pledgeMetadata"), {
    pledgeId: null,
    owner: "0x0000000000000000000000000000000000000000",
    title: "__INIT__",
    description: "Init document to create collection",
    createdAt: serverTimestamp(),
  });

  console.log("✅ Firestore collection `pledgeMetadata` initialized");
  process.exit(0);
}

init().catch((err) => {
  console.error("❌ Failed to init Firestore:", err);
  process.exit(1);
});

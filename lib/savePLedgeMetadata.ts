import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

type SavePledgeMetadataParams = {
  owner: string;
  title: string;
  description: string;
  pledgeId?: number | null;
};

export async function savePledgeMetadata({
  owner,
  title,
  description,
  pledgeId = null,
}: SavePledgeMetadataParams) {
  return addDoc(collection(db, "pledgeMetadata"), {
    owner,
    title,
    description,
    pledgeId,
    createdAt: serverTimestamp(),
  });
}

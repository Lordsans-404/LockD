import { NextRequest } from "next/server";
import { publicClient } from "@/lib/viem-server";
import { LOCKD_ABI, LOCKD_ADDRESS } from "@/config/contract";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user = searchParams.get("address");

  if (!user) {
    return Response.json({ error: "Missing address" }, { status: 400 });
  }
  const blockNumber = await publicClient.getBlockNumber();
  // Mundur 90.000 block
  const fromBlock = blockNumber - 90000n;

  const logs = await publicClient.getLogs({
    address: LOCKD_ADDRESS,
    event: {
      type: "event",
      name: "PledgeCreated",
      inputs: [
        { indexed: true, name: "pledgeId", type: "uint256" },
        { indexed: true, name: "owner", type: "address" },
        { indexed: false, name: "amount", type: "uint256" },
      ],
    },
    args: { owner: user as `0x${string}` },
    fromBlock: fromBlock > 0n ? fromBlock : 0n,
    toBlock: "latest",
  });

  const pledgeIds = logs.map((log) => log.args.pledgeId?.toString());

  return Response.json({ pledgeIds });
}

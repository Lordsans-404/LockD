"use client";

import { useEffect, useState } from "react";

export interface PledgeMetadata {
  pledgeId: string;
  title: string;
  description: string;
  owner: string;
  createdAt: string;
}

export function usePledgeMetadata(pledgeId: bigint | null) {
  const [data, setData] = useState<PledgeMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pledgeId) {
      setData(null);
      return;
    }

    const controller = new AbortController();

    async function fetchMetadata() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/pledges?pledgeId=${pledgeId?.toString()}`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          throw new Error("Failed to fetch pledge metadata");
        }

        const json = await res.json();
        setData(json);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetadata();

    return () => controller.abort();
  }, [pledgeId]);

  return {
    metadata: data,
    isLoading,
    error,
  };
}

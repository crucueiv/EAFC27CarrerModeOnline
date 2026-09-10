"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TransfersRefresh() {
  const router = useRouter();
  useEffect(() => {
    const handler = () => router.refresh();
    window.addEventListener("loan-completed", handler);
    return () => window.removeEventListener("loan-completed", handler);
  }, [router]);
  return null;
}

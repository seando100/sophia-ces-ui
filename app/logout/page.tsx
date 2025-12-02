"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      await fetch("/api/logout", { method: "POST" });
      router.replace("/login");
    };
    run();
  }, [router]);

  return (
    <div style={{ color: "white", padding: 40 }}>
      Logging out...
    </div>
  );
}

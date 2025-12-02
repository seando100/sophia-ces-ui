"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password })
    });

    if (res.ok) {
      router.push("/ces");
    } else {
      setError("Incorrect password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a1029]">
      <form
        onSubmit={handleSubmit}
        className="bg-[#1a1f36] p-6 rounded-lg shadow-lg space-y-4 w-80"
      >
        <h2 className="text-white text-center">Enter CES Access Password</h2>

        <input
          type="password"
          className="w-full p-2 rounded bg-[#0f1425] text-white focus:outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded"
        >
          Enter
        </button>
      </form>
    </div>
  );
}

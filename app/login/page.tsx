"use client";
import { useState } from "react";

export default function LoginPage() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const attemptLogin = async () => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: input }),
    });

    if (res.ok) {
      window.location.href = "/ces";
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      justifyContent: "center",
      alignItems: "center",
      background: "#0c1220",
      color: "white",
      fontFamily: "sans-serif"
    }}>
      <div style={{
        background: "#1a1f2e",
        padding: "40px",
        borderRadius: "12px",
        width: "320px",
        boxShadow: "0 6px 18px rgba(0,0,0,0.3)"
      }}>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          Enter CES Access Password
        </h2>

        <input
          type="password"
          value={input}
          placeholder="Password"
          onChange={(e) => setInput(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #333",
            background: "#11151f",
            color: "white",
            marginBottom: "10px"
          }}
        />

        {error && (
          <p style={{ color: "#ff5f5f", marginBottom: "12px", textAlign: "center" }}>
            {error}
          </p>
        )}

        <button
          onClick={attemptLogin}
          style={{
            width: "100%",
            padding: "12px",
            background: "#3f7aff",
            borderRadius: "8px",
            border: "none",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          Enter
        </button>
      </div>
    </div>
  );
}

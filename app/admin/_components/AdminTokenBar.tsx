"use client";

import { useEffect, useState } from "react";

export default function AdminTokenBar({
  onTokenChange,
}: {
  onTokenChange?: (token: string) => void;
}) {
  const [token, setToken] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedToken = typeof window !== "undefined" ? localStorage.getItem("admin_token") : "";
    if (savedToken) {
      setToken(savedToken);
      onTokenChange?.(savedToken);
    }
  }, [onTokenChange]);

  const save = () => {
    if (typeof window === "undefined") return;
    const next = token.trim();
    if (next) {
      localStorage.setItem("admin_token", next);
    } else {
      localStorage.removeItem("admin_token");
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
    onTokenChange?.(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="管理员令牌"
        className="h-10 w-56 rounded-full border border-[#f3d4e8] bg-white px-4 text-sm text-[#2f2a2a] shadow-lg placeholder:text-[#b380b0] focus:border-accent focus:outline-none"
      />
      <button
        className="h-10 rounded-full border border-[#f3d4e8] bg-white px-4 text-sm font-semibold text-[#ff6ba6] hover:border-accent"
        onClick={save}
      >
        保存
      </button>
      {saved && <span className="text-xs font-semibold text-emerald-600">已保存</span>}
    </div>
  );
}

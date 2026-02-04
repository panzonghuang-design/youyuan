"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

type Stats = {
  daily_new_users: number;
  total_users: number;
  daily_matches: number;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const fetchStats = async (adminToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: adminToken ? { "x-admin-token": adminToken } : undefined,
      });
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== "undefined") localStorage.removeItem("admin_token");
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "获取统计失败");
      }
      const data = await res.json();
      setStats(data);
    } catch (e: any) {
      setError(e.message || "获取统计失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = typeof window !== "undefined" ? localStorage.getItem("admin_token") : "";
    if (!savedToken) {
      router.replace("/admin/login");
      return;
    }
    setToken(savedToken);
    setChecking(false);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    fetchStats(token);
  }, [token]);

  if (checking) {
    return (
      <main className="mx-auto max-w-5xl px-4 pb-10 pt-6">
        <div className="card text-center text-sm font-semibold text-[#7a4a7c]">检查权限中...</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-10 pt-6 space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2f2a2a]">管理员仪表盘</h1>
          <p className="text-sm font-semibold text-[#7a4a7c]">当日数据与用户概览</p>
        </div>
        <button
          className="rounded-full border border-[#f3d4e8] bg-white px-4 py-2 text-sm font-semibold text-[#ff6ba6] hover:border-accent"
          onClick={() => {
            if (typeof window !== "undefined") localStorage.removeItem("admin_token");
            router.replace("/admin/login");
          }}
        >
          退出登录
        </button>
      </div>

      {error && (
        <div className="card border-red-300/60 bg-red-50/80 text-red-700">
          <p className="text-sm font-semibold">{error}</p>
          <p className="mt-1 text-xs text-red-600/80">如果已配置 `ADMIN_TOKEN`，请先在上方保存令牌。</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "当日新增用户",
            value: stats?.daily_new_users ?? (loading ? "…" : 0),
            accent: "from-emerald-200/70 to-emerald-50/60",
          },
          {
            label: "当前总用户",
            value: stats?.total_users ?? (loading ? "…" : 0),
            accent: "from-[#ffd7f2]/80 to-white/70",
          },
          {
            label: "当日匹配次数",
            value: stats?.daily_matches ?? (loading ? "…" : 0),
            accent: "from-[#cfe8ff]/80 to-white/70",
          },
        ].map((item) => (
          <div key={item.label} className={`rounded-3xl border border-[#f3d4e8] bg-gradient-to-br ${item.accent} p-5 shadow-glow`}>
            <p className="text-sm font-semibold text-[#7a4a7c]">{item.label}</p>
            <p className="mt-2 text-3xl font-extrabold text-[#2f2a2a]">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-[#2f2a2a]">用户管理</h2>
          <p className="text-sm font-semibold text-[#7a4a7c]">查看用户详情与匹配开关</p>
        </div>
        <a
          href="/admin/users"
          className="rounded-full border border-[#f3d4e8] bg-white px-4 py-2 text-sm font-semibold text-[#ff6ba6] hover:border-accent"
        >
          进入用户管理
        </a>
      </div>
    </main>
  );
}

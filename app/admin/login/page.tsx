"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, FormCard } from "../../components/ui";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function AdminLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyToken = async (value: string) => {
    const res = await fetch(`${API_BASE}/api/admin/stats`, {
      headers: { "x-admin-token": value },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "管理员令牌无效");
    }
  };

  return (
    <main className="mx-auto max-w-xl px-4 pb-10 pt-12 space-y-6">
      <div className="flex flex-col items-center gap-4">
        <FormCard
          title="管理员登录"
          subtitle="登录后才能进入管理员页面"
          cta={loading ? "验证中..." : "进入后台"}
          onSubmit={async () => {
            if (loading) return;
            const next = token.trim();
            if (!next) {
              setError("请输入管理员令牌");
              return;
            }
            setError(null);
            setLoading(true);
            try {
              await verifyToken(next);
              if (typeof window !== "undefined") {
                localStorage.setItem("admin_token", next);
              }
              router.replace("/admin");
            } catch (e: any) {
              setError(e.message || "登录失败");
            } finally {
              setLoading(false);
            }
          }}
        >
          <Field
            label="管理员令牌"
            type="password"
            placeholder="请输入管理员令牌"
            labelClass="text-[#2f2a2a] font-bold"
            inputClass="border-[#f3d4e8] placeholder:text-[#b380b0] h-[44px] py-2.5"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          {error && <p className="text-center text-sm text-red-500 font-semibold">{error}</p>}
        </FormCard>
      </div>
    </main>
  );
}

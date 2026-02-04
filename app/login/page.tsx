"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormCard, Field } from "../components/ui";
import { photoPool } from "../lib/data";

export default function LoginPage() {
  const router = useRouter();
  const [phoneCode, setPhoneCode] = useState("+86");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
  const profileCacheKey = "profile_cache_v1";

  const writeProfileCache = (data: any) => {
    if (typeof window === "undefined" || !data) return;
    const cache = {
      name: typeof data.name === "string" ? data.name : "",
      avatar_url: data.avatar_url ?? null,
      phone_code: data.phone_code ?? "",
      phone: data.phone ?? "",
      age: data.age ?? null,
      gender: data.gender ?? null,
      zodiac: data.zodiac ?? null,
      nationality: data.nationality ?? "",
      region: data.region ?? "",
      personality: data.personality ?? "",
      hobby: data.hobby ?? "",
      photos: Array.isArray(data.photos) ? data.photos.slice(0, 5) : [],
    };
    localStorage.setItem(profileCacheKey, JSON.stringify(cache));
  };

  const prefetchMe = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      writeProfileCache(data);
    } catch {
      // ignore
    }
  };

  return (
    <main className="mx-auto max-w-xl px-3 pb-8 pt-8 space-y-6 sm:px-4 sm:pb-10 sm:pt-12">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-14 w-14 rounded-full border border-[#f3d4e8] bg-white/90 shadow-md"
          style={{
            backgroundImage: "url(/avatars/tubiao.png)",
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <FormCard
          title="欢迎使用缘遇！"
          subtitle="一起美好 ❤ 缘自遇见"
          cta={loading ? "登录中..." : "进入缘遇"}
          onSubmit={async () => {
            if (loading) return;
            if (!phone.trim() || !password.trim()) {
              setError("请填写手机号和密码");
              return;
            }
            setError(null);
            setLoading(true);
            try {
              const res = await fetch(`${API_BASE}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phoneCode, phone, password }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "登录失败");
              if (typeof window !== "undefined") localStorage.setItem("token", data.token);
              if (data?.token) {
                void prefetchMe(data.token);
              }
              router.push("/explore");
            } catch (e: any) {
              setError(e.message || "登录失败");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="grid gap-2 text-sm text-muted">
            <span className="text-[#2f2a2a] font-bold">手机号</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative w-full sm:w-28">
                <select
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  className="w-full h-[44px] appearance-none rounded-2xl border border-[#f3d4e8] bg-white px-3 pr-8 text-base font-semibold text-[#2f2a2a] focus:border-accent focus:outline-none"
                >
                  {["+86", "+852", "+853", "+886", "+81", "+82", "+60", "+65", "+1", "+44", "+33", "+49", "+61", "+64", "+91", "+971"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#ff6ba6] text-lg">⌄</span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
                className="w-full flex-1 rounded-2xl border border-[#f3d4e8] bg-white px-4 py-2.5 text-base font-semibold text-[#2f2a2a] placeholder:text-[#b380b0] focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <Field
            label="密码"
            type="password"
            placeholder="请输入密码"
            labelClass="text-[#2f2a2a] font-bold"
            inputClass="border-[#f3d4e8] placeholder:text-[#b380b0] h-[44px] py-2.5"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-center text-sm text-red-500 font-semibold">{error}</p>}
          <p className="text-sm text-[#7a4a7c] font-semibold text-center">
            还没有账号？{" "}
            <button className="text-[#ff6ba6] font-extrabold underline underline-offset-4" onClick={() => router.push("/register")}>
              去注册
            </button>
          </p>
        </FormCard>
      </div>
      <div className="w-full overflow-hidden rounded-full border border-white/40 bg-white/30 shadow-inner">
        <div className="relative">
          <div className="flex gap-4 py-3 animate-[login-marquee_18s_linear_infinite]">
            {[...photoPool.slice(0, 12), ...photoPool.slice(0, 12)].map((src, idx) => (
              <div
                key={src + idx}
                className="h-12 w-12 flex-shrink-0 rounded-full border border-white/80 bg-center bg-cover"
                style={{ backgroundImage: `url(${src})` }}
              />
            ))}
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes login-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </main>
  );
}

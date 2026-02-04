"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

type AdminUser = {
  id: number;
  phone_code: string;
  phone: string;
  name: string;
  avatar_url: string | null;
  age: number | null;
  gender: string | null;
  zodiac: string | null;
  personality: string | null;
  hobby: string | null;
  photos: string[];
  match_enabled: boolean;
  created_at?: string;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);
  const [search, setSearch] = useState("");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");

  const AutoFitText = ({ text }: { text: string }) => {
    const ref = useRef<HTMLParagraphElement | null>(null);
    useLayoutEffect(() => {
      const el = ref.current;
      if (!el) return;
      const minSize = 10;
      let size = 13;
      const apply = (val: number) => {
        el.style.fontSize = `${val}px`;
        el.style.lineHeight = `${Math.max(val + 3, 12)}px`;
      };
      apply(size);
      let guard = 30;
      while (guard > 0 && el.scrollHeight > el.clientHeight && size > minSize) {
        size -= 1;
        apply(size);
        guard -= 1;
      }
    }, [text]);
    return (
      <p ref={ref} className="mt-1 whitespace-pre-wrap break-words">
        {text}
      </p>
    );
  };

  const headers = useMemo(() => (token ? { "x-admin-token": token } : undefined), [token]);
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => (u.name || "").toLowerCase().includes(term));
  }, [users, search]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, { headers });
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== "undefined") localStorage.removeItem("admin_token");
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "获取用户失败");
      }
      const data = await res.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e: any) {
      setError(e.message || "获取用户失败");
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
    fetchUsers();
  }, [headers, token]);

  if (checking) {
    return (
      <main className="mx-auto max-w-6xl px-4 pb-10 pt-6">
        <div className="card text-center text-sm font-semibold text-[#7a4a7c]">检查权限中...</div>
      </main>
    );
  }

  const toggleMatch = async (userId: number, next: boolean) => {
    setSavingId(userId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/match`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(headers ?? {}),
        },
        body: JSON.stringify({ match_enabled: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "更新失败");
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, match_enabled: next } : u)));
    } catch (e: any) {
      alert(e.message || "更新失败");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2f2a2a]">用户管理</h1>
          <p className="text-sm font-semibold text-[#7a4a7c]">头像、资料与匹配开关</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索用户昵称"
            className="h-10 w-48 rounded-full border border-[#f3d4e8] bg-white px-4 text-sm font-semibold text-[#2f2a2a] placeholder:text-[#b380b0] focus:border-accent focus:outline-none"
          />
          <a
            href="/admin"
            className="rounded-full border border-[#f3d4e8] bg-white px-4 py-2 text-sm font-semibold text-[#ff6ba6] hover:border-accent"
          >
            返回仪表盘
          </a>
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
      </div>

      {error && (
        <div className="card border-red-300/60 bg-red-50/80 text-red-700">
          <p className="text-sm font-semibold">{error}</p>
          <p className="mt-1 text-xs text-red-600/80">如果已配置 `ADMIN_TOKEN`，请先在上方保存令牌。</p>
        </div>
      )}

      {loading ? (
        <div className="card text-center text-sm font-semibold text-[#7a4a7c]">加载中...</div>
      ) : users.length === 0 ? (
        <div className="card text-center text-sm font-semibold text-[#7a4a7c]">暂无用户</div>
      ) : filteredUsers.length === 0 ? (
        <div className="card text-center text-sm font-semibold text-[#7a4a7c]">未找到匹配用户</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {filteredUsers.map((u) => (
            <div key={u.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-full border border-[#f3d4e8] bg-white">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs font-semibold text-[#b380b0]">无头像</div>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-[#2f2a2a]">{u.name || "未命名"}</p>
                    <p className="text-[11px] text-[#7a4a7c]">ID: {u.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!u.match_enabled && (!u.photos || u.photos.length === 0) && (
                    <span className="text-[10px] font-semibold text-rose-500">相册为空</span>
                  )}
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={u.match_enabled}
                      onChange={(e) => toggleMatch(u.id, e.target.checked)}
                      disabled={savingId === u.id || (!u.match_enabled && (!u.photos || u.photos.length === 0))}
                    />
                    <div className="h-6 w-11 rounded-full bg-[#f3d4e8] transition peer-checked:bg-emerald-400/80"></div>
                    <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5"></div>
                  </label>
                </div>
              </div>

              <div className="mt-3 flex items-start justify-between gap-3 text-[11px] text-[#7a4a7c]">
                <div className="space-y-1">
                  <p>{u.phone_code} {u.phone}</p>
                  <p>{u.gender || "--"} · {u.age ?? "--"}岁 · {u.zodiac || "--"}</p>
                </div>
                <div className="text-right">
                  <p>注册时间</p>
                  <p className="text-[#2f2a2a]">{u.created_at ? new Date(u.created_at).toLocaleString() : "--"}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div className="rounded-2xl border border-[#f3d4e8] bg-white/70 p-3 text-[#2f2a2a] h-[98px] overflow-hidden">
                  <p className="font-semibold text-[#7a4a7c]">性格描述</p>
                  <AutoFitText text={u.personality || "--"} />
                </div>
                <div className="rounded-2xl border border-[#f3d4e8] bg-white/70 p-3 text-[#2f2a2a] h-[98px] overflow-hidden">
                  <p className="font-semibold text-[#7a4a7c]">爱好描述</p>
                  <AutoFitText text={u.hobby || "--"} />
                </div>
              </div>

              <div className="mt-3">
                <p className="text-[11px] font-semibold text-[#7a4a7c]">相册</p>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const src = u.photos?.[idx];
                    return (
                      <div key={idx} className="h-14 w-14 overflow-hidden rounded-xl border border-[#f3d4e8] bg-white">
                        {src ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewSrc(src);
                              setPreviewName(u.name || "");
                            }}
                            className="h-full w-full"
                            aria-label="查看照片"
                          >
                            <img src={src} alt="photo" className="h-full w-full object-cover" />
                          </button>
                        ) : (
                          <div className="grid h-full w-full place-items-center text-[10px] text-[#b380b0]">空</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {previewSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
          onClick={() => setPreviewSrc(null)}
        >
          <div
            className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-700">{previewName || "照片预览"}</p>
              <button
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                onClick={() => setPreviewSrc(null)}
              >
                关闭
              </button>
            </div>
            <div className="bg-slate-50 p-3">
              <img src={previewSrc} alt="preview" className="h-auto w-full rounded-2xl object-contain" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

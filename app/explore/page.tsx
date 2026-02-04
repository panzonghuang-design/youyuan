"use client";

import { useEffect, useRef, useState } from "react";
import { profiles, photoPool, fallbackNamePool } from "../lib/data";
import { ChatBubbleIcon, UserLineIcon } from "../components/ui";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

type MatchProfile = {
  id: number;
  name: string;
  photo: string;
  zodiac?: string | null;
  hobby?: string | null;
};

export default function ExplorePage() {
  const ONLINE_MIN = 25303;
  const ONLINE_MAX = 26570;
  const [onlineCount, setOnlineCount] = useState(ONLINE_MIN);
  const [shoutNames, setShoutNames] = useState<string[]>([]);
  const shoutVariants = ["正在匹配", "上线了", "匹配成功"];
  const [shoutIdx, setShoutIdx] = useState(0);
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchProfile | null>(null);
  const [matchGallery, setMatchGallery] = useState<string[]>([]);
  const [matchGalleryIdx, setMatchGalleryIdx] = useState(0);
  const [guestLimitOpen, setGuestLimitOpen] = useState(false);

  useEffect(() => {
    // 首次渲染后再随机，避免 SSR 与客户端不一致
    setOnlineCount(Math.floor(ONLINE_MIN + Math.random() * (ONLINE_MAX - ONLINE_MIN)));
    const id = setInterval(() => {
      setOnlineCount((prev) => {
        const delta = Math.floor(Math.random() * 180 - 90);
        return Math.min(ONLINE_MAX, Math.max(ONLINE_MIN, prev + delta));
      });
    }, 2500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const names = shuffleNames(profiles.map((p) => p.name));
    setShoutNames(names);
    const id = setInterval(() => setShoutIdx((i) => (i + 1) % names.length), 6000);
    return () => clearInterval(id);
  }, []);

  const [bubbleSpots, setBubbleSpots] = useState<BubbleSpot[]>([]);

  useEffect(() => {
    // 仅客户端生成气泡，避免 SSR/CSR 随机不一致
    setBubbleSpots(generateBubbles(photoPool, profiles, fallbackNamePool));
  }, []);

  const requestMatch = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const ensureGuestToken = () => {
      if (typeof window === "undefined") return null;
      const cached = localStorage.getItem("guest_token");
      const token = cached
        ? cached
        : typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `g_${crypto.randomUUID()}`
        : `g_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      if (!cached) localStorage.setItem("guest_token", token);
      if (!localStorage.getItem("guest_session_started")) {
        localStorage.setItem("guest_session_started", String(Date.now()));
      }
      return token;
    };
    const guestToken = ensureGuestToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (guestToken) headers["x-guest-token"] = guestToken;
    const res = await fetch(`${API_BASE}/api/match`, {
      headers: Object.keys(headers).length ? headers : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "匹配失败");
    }
    const data = await res.json();
    return data.user as {
      id: number;
      name?: string;
      avatar_url?: string | null;
      photos?: string[];
      zodiac?: string | null;
      hobby?: string | null;
    };
  };

  const preloadImage = (src?: string | null) => {
    if (!src) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      const img = new Image();
      const done = () => resolve(true);
      img.onload = done;
      img.onerror = done;
      img.src = src;
      const decoder = (img as HTMLImageElement & { decode?: () => Promise<void> }).decode;
      if (typeof decoder === "function") {
        decoder.call(img).then(done).catch(done);
      }
    });
  };

  return (
    <main className="mx-auto max-w-4xl px-3 pb-6 pt-3 space-y-3 sm:px-4 sm:pt-4">
      <div className="mx-auto w-full max-w-xs rounded-3xl bg-gradient-to-r from-white/90 via-white/95 to-white/85 px-5 py-4 shadow-glow text-center sm:max-w-[260px] sm:px-6">
        <p className="text-base font-bold text-[#2f2a2a] flex items-center justify-center gap-2 sm:text-lg">
          <span aria-hidden className="text-[#ff6ba6] text-2xl inline-block" style={{ animation: "pulse-heart 1.8s ease-in-out infinite" }}>
            ❤
          </span>
          匹配你喜欢的对象吧
        </p>
        <p className="text-xs text-[#7a7080] mt-1 sm:text-sm">
          当前 <span className="font-semibold text-[#ff6ba6]">{onlineCount.toLocaleString()}</span> 人在线
        </p>
      </div>

      <div className="relative mx-auto h-[360px] w-full max-w-xl overflow-visible -mt-2 sm:h-[420px] sm:-mt-4">
        <div className="relative h-[320px] w-full overflow-hidden mx-auto sm:h-[380px]">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative h-[280px] w-[280px] max-w-full sm:h-[380px] sm:w-[380px]">
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0)_70%)]" />
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "radial-gradient(circle at 50% 50%, rgba(255,116,158,0.15), rgba(107,123,255,0.12))",
                  filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.25))",
                }}
              />
              <div className="absolute inset-0 rounded-full border border-white/25" />
              <div className="absolute inset-[10%] rounded-full border border-white/12" />
            </div>
          </div>
        {bubbleSpots.map((spot, idx) => {
          const avatarBg =
            spot.isAvatar && spot.avatarIndex !== undefined && spot.avatarIndex >= 0
              ? {
                  backgroundImage: `url(${photoPool[spot.avatarIndex % photoPool.length]})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {};
          return (
            <div
              key={`bubble-${idx}`}
              className="absolute flex flex-col items-center"
              style={{
                left: `${spot.x}%`,
                top: `${spot.y}%`,
                animation: `floatyParallax ${spot.duration}s ease-in-out ${spot.delay}s infinite`,
                transform: "translate(-50%, -50%)",
                ["--dx" as any]: spot.dx,
                ["--dy" as any]: spot.dy,
                ["--scale" as any]: spot.scale,
              }}
            >
              <div
                className="grid place-items-center rounded-full border border-white/30 shadow-glow"
                style={{
                  width: `${spot.size}px`,
                  height: `${spot.size}px`,
                  background: spot.isAvatar ? "white" : spot.color,
                  ...avatarBg,
                }}
              ></div>
              <span className="mt-1 text-[10px] text-ink font-semibold bg-white/70 px-2 py-0.5 rounded-full whitespace-nowrap">
                {spot.displayName}
              </span>
            </div>
          );
        })}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-1 px-2 text-xs font-medium text-[#b06a7e] -mt-2 sm:-mt-4 sm:px-3 sm:text-sm">
        <button className="flex flex-col items-center gap-1 text-[#e14f6f] transition hover:text-[#ff6ba6] hover:scale-[1.05]" onClick={() => (window.location.href = "/chat")}>
          <span className="text-2xl"><ChatBubbleIcon /></span>
          <span>消息</span>
        </button>
        <p className="flex-1 text-center text-sm text-[#9a7a8d] sm:text-base" suppressHydrationWarning>
          {(() => {
            if (shoutNames.length === 0) return "心动用户 正在匹配中…";
            const name = shoutNames[shoutIdx % shoutNames.length] ?? "心动用户";
            const status = shoutVariants[shoutIdx % shoutVariants.length] ?? "正在匹配";
            const suffix = status === "正在匹配" ? "中…" : status === "匹配成功" ? "！" : "";
            return `${name} ${status}${suffix}`;
          })()}
        </p>
        <button
          className="flex flex-col items-center gap-1 text-[#e14f6f] transition hover:text-[#ff6ba6] hover:scale-[1.05]"
          onClick={() => {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            window.location.href = token ? "/profile" : "/login";
          }}
        >
          <span className="text-2xl"><UserLineIcon /></span>
          <span>我的</span>
        </button>
      </div>

      <div className="flex items-center justify-center -mt-2 sm:-mt-3">
        <button
          className="mx-auto flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(120deg,#ff5f9d,#ff6ba6,#ff7f73,#ff9063)] px-9 py-3 text-base font-semibold text-white shadow-[0_12px_28px_rgba(255,107,166,0.35)] hover:brightness-110 transition sm:px-12 sm:py-3.5 sm:text-lg"
          onClick={() => {
            setIsMatching(true);
            const delay = new Promise((resolve) => setTimeout(resolve, 1200));
            (async () => {
              try {
                const [user] = await Promise.all([requestMatch(), delay]);
                const album = Array.isArray(user.photos) ? user.photos.filter(Boolean) : [];
                const avatar = user.avatar_url || album[0] || photoPool[0];
                const gallery = album.length ? album : [avatar];
                setMatchGallery(gallery);
                setMatchGalleryIdx(0);
                const primary = gallery[0] || avatar;
                await preloadImage(primary);
                setMatchResult({
                  id: user.id,
                  name: user.name || "未命名",
                  photo: avatar,
                  zodiac: user.zodiac || "--",
                  hobby: user.hobby || "暂无爱好描述",
                });
                gallery.slice(1).forEach((src) => {
                  void preloadImage(src);
                });
                if (avatar && avatar !== primary) {
                  void preloadImage(avatar);
                }
              } catch (e: any) {
                await delay;
                if (String(e?.message || "").includes("游客仅允许匹配一次")) {
                  setGuestLimitOpen(true);
                } else {
                  alert(e.message || "匹配失败");
                }
                setMatchResult(null);
              } finally {
                setIsMatching(false);
              }
            })();
          }}
        >
          <span aria-hidden className="text-xl">❤</span>
          <span>立即匹配</span>
        </button>
      </div>

      {isMatching && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5">
            <div className="loader m-0" />
            <p className="text-white text-sm leading-tight">正在匹配中<span className="inline-block animate-pulse">···</span></p>
          </div>
        </div>
      )}

      {matchResult && !isMatching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl border border-white/10 bg-black">
            <div
              className="aspect-[9/16] w-full"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.78) 100%), url(${matchGallery[matchGalleryIdx] ?? matchResult.photo})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            {matchGallery.length > 1 && (
              <>
                <button
                  className="absolute left-3 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white/90 hover:bg-black/70"
                  onClick={() => setMatchGalleryIdx((i) => (i - 1 + matchGallery.length) % matchGallery.length)}
                  aria-label="上一张"
                >
                  ‹
                </button>
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white/90 hover:bg-black/70"
                  onClick={() => setMatchGalleryIdx((i) => (i + 1) % matchGallery.length)}
                  aria-label="下一张"
                >
                  ›
                </button>
                <div className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-xs text-white">
                  {matchGalleryIdx + 1}/{matchGallery.length}
                </div>
              </>
            )}
            <button
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white/90 hover:text-white"
              aria-label="关闭匹配结果"
              onClick={() => setMatchResult(null)}
            >
              ×
            </button>
            <div className="absolute left-1/2 top-4 -translate-x-1/2">
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-lg">
                <span aria-hidden>❤</span>
                匹配成功
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-20 px-4 text-white drop-shadow-lg">
              <div className="flex items-start gap-3">
                <div
                  className="mt-1 h-12 w-12 rounded-full border-2 border-white/70 bg-white/10 flex-shrink-0"
                  style={{ backgroundImage: `url(${matchResult.photo})`, backgroundSize: "cover", backgroundPosition: "center" }}
                />
                <div className="flex-1">
                  <div className="flex flex-col items-start">
                    <h3 className="text-xl font-semibold">{matchResult.name}</h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-white/90">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        在线
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1">
                        {matchResult.zodiac || "--"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-white/90 text-left w-full">
                      {matchResult.hobby || "暂无爱好描述"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-4 px-4 pb-3">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent2 py-3 text-base font-semibold text-ink shadow-xl"
                onClick={async () => {
                  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
                  const ensureGuestToken = () => {
                    if (typeof window === "undefined") return null;
                    const cached = localStorage.getItem("guest_token");
                    const next =
                      cached ||
                      (typeof crypto !== "undefined" && "randomUUID" in crypto
                        ? `g_${crypto.randomUUID()}`
                        : `g_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
                    if (!cached) localStorage.setItem("guest_token", next);
                    if (!localStorage.getItem("guest_session_started")) {
                      localStorage.setItem("guest_session_started", String(Date.now()));
                    }
                    return next;
                  };
                  const guestToken = ensureGuestToken();
                  const headers: Record<string, string> = { "Content-Type": "application/json" };
                  if (token) headers.Authorization = `Bearer ${token}`;
                  else if (guestToken) headers["x-guest-token"] = guestToken;
                  if (!matchResult?.id) return;
                  try {
                    const res = await fetch(`${API_BASE}/api/chats`, {
                      method: "POST",
                      headers: {
                        ...headers,
                      },
                      body: JSON.stringify({ target_user_id: matchResult.id, auto_hello: true, allow_self: true }),
                    });
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      throw new Error(data.error || "发起对话失败");
                    }
                    const data = await res.json();
                    if (typeof window !== "undefined" && data?.chat_id) {
                      try {
                        const prefill = {
                          chat: data.chat || null,
                          messages: data.message ? [data.message] : [],
                        };
                        sessionStorage.setItem(`chat_prefill_${data.chat_id}`, JSON.stringify(prefill));
                      } catch {
                        // ignore
                      }
                    }
                    if (!token && guestToken && typeof window !== "undefined") {
                      if (!localStorage.getItem("guest_chat_started")) {
                        localStorage.setItem("guest_chat_started", String(Date.now()));
                      }
                    }
                    window.location.href = `/chat?chat_id=${data.chat_id}`;
                  } catch (e: any) {
                    alert(e.message || "发起对话失败");
                  }
                }}
              >
                <span aria-hidden>💬</span> 发起对话
              </button>
            </div>
          </div>
        </div>
      )}
      {guestLimitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600 text-2xl font-extrabold">
              !
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">游客仅可匹配一次</h3>
            <p className="mt-2 text-sm text-slate-600">
              注册绑定账号后即可继续匹配。
            </p>
            <button
              className="mt-4 w-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400 py-2.5 text-sm font-semibold text-white shadow-lg hover:brightness-110"
              onClick={() => (window.location.href = "/register")}
            >
              立即注册
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function shuffleNames(list: string[]) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type BubbleSpot = ReturnType<typeof generateBubbles>[number];

function generateBubbles(pool: string[], profs: typeof profiles, fallback: string[]) {
  const spots = Array.from({ length: 42 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const cluster = Math.random() < 0.4;
    const baseR = cluster ? Math.random() * 22 : Math.sqrt(Math.random()) * 46;
    const x = 50 + Math.cos(angle) * baseR + (cluster ? Math.random() * 6 - 3 : 0);
    const y = 50 + Math.sin(angle) * baseR + (cluster ? Math.random() * 6 - 3 : 0);
    const size = 12 + Math.random() * 26;
    const duration = 3 + Math.random() * 2.5;
    const delay = Math.random() * 2;
    const dx = (Math.random() * 18 - 9).toFixed(1) + "px";
    const dy = (Math.random() * 18 - 9).toFixed(1) + "px";
    const scale = 0.65 + Math.random() * 0.8;
    const color = `hsl(${Math.random() * 360},70%,70%)`;
    return { x, y, size, duration, delay, dx, dy, scale, color, avatarIndex: -1 };
  });

  const avatarCount = Math.min(pool.length, spots.length);
  const sortedIdx = Array.from(spots.keys()).sort((a, b) => spots[b].size - spots[a].size);
  sortedIdx.slice(0, avatarCount).forEach((idx, i) => {
    spots[idx].avatarIndex = i;
  });
  const avatarIdxs = sortedIdx.slice(0, avatarCount);
  for (let iter = 0; iter < 18; iter++) {
    for (let a = 0; a < avatarIdxs.length; a++) {
      for (let b = a + 1; b < avatarIdxs.length; b++) {
        const ia = avatarIdxs[a];
        const ib = avatarIdxs[b];
        const sa = spots[ia];
        const sb = spots[ib];
        const dxNum = sa.x - sb.x;
        const dyNum = sa.y - sb.y;
        const dist = Math.hypot(dxNum, dyNum);
        const minDist = (sa.size + sb.size) * 0.55;
        if (dist < minDist && dist > 0.001) {
          const push = (minDist - dist) / dist * 0.6;
          const px = dxNum * push;
          const py = dyNum * push;
          sa.x = Math.min(92, Math.max(8, sa.x + px));
          sa.y = Math.min(92, Math.max(8, sa.y + py));
          sb.x = Math.min(92, Math.max(8, sb.x - px));
          sb.y = Math.min(92, Math.max(8, sb.y - py));
        }
      }
    }
  }

  for (let iter = 0; iter < 10; iter++) {
    for (let a = 0; a < spots.length; a++) {
      for (let b = a + 1; b < spots.length; b++) {
        const sa = spots[a];
        const sb = spots[b];
        const dxNum = sa.x - sb.x;
        const dyNum = sa.y - sb.y;
        const dist = Math.hypot(dxNum, dyNum);
        const minDist = (sa.size + sb.size) * 0.45;
        if (dist < minDist && dist > 0.001) {
          const push = (minDist - dist) / dist * 0.35;
          const px = dxNum * push;
          const py = dyNum * push;
          sa.x += px;
          sa.y += py;
          sb.x -= px;
          sb.y -= py;
        }
      }
    }
  }

  spots.forEach((spot) => {
    const dx = spot.x - 50;
    const dy = spot.y - 50;
    const r = Math.hypot(dx, dy);
    const maxR = Math.max(0, 50 - spot.size * 0.5 - 0.5);
    if (r > maxR && r > 0) {
      const scale = maxR / r;
      spot.x = 50 + dx * scale;
      spot.y = 50 + dy * scale;
    }
    spot.x = Math.min(99, Math.max(1, spot.x));
    spot.y = Math.min(99, Math.max(1, spot.y));
  });

  const fallbackNames = shuffleNames(fallback);
  let fallbackCursor = 0;

  return spots.map((spot, i) => ({
    ...spot,
    isAvatar: spot.avatarIndex >= 0,
    displayName:
      spot.avatarIndex >= 0
        ? profiles[spot.avatarIndex % profiles.length].name
        : fallbackNames[fallbackCursor++ % fallbackNames.length],
  }));
}

"use client";

import { useEffect, useRef, useState } from "react";
import { PenIcon, SaveIcon } from "../components/ui";
import AvatarUploader from "../components/AvatarUploader";

export default function ProfilePage() {
  const [authed, setAuthed] = useState(true);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [tempUsername, setTempUsername] = useState("");
  const [usernameReadOnly, setUsernameReadOnly] = useState(true);
  const [gender, setGender] = useState<string | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [zodiac, setZodiac] = useState<string | null>(null);
  const [personality, setPersonality] = useState("");
  const [hobby, setHobby] = useState("");
  const [region, setRegion] = useState("");
  const [tempRegion, setTempRegion] = useState("");
  const [regionEditing, setRegionEditing] = useState(false);
  const [tempPersonality, setTempPersonality] = useState(personality);
  const [tempHobby, setTempHobby] = useState(hobby);
  const [personalityEditing, setPersonalityEditing] = useState(false);
  const [hobbyEditing, setHobbyEditing] = useState(false);
  const [nationality, setNationality] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phone, setPhone] = useState("");
  const [album, setAlbum] = useState<string[]>([]);
  const albumInputRef = useRef<HTMLInputElement | null>(null);
  const [saveTip, setSaveTip] = useState<string | null>(null);
  const [albumUploading, setAlbumUploading] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const profileCacheKey = "profile_cache_v1";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "0px";
    return () => {
      document.body.style.paddingBottom = prev;
    };
  }, []);

  const readProfileCache = () => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(profileCacheKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

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

  const mergeProfileCache = (patch: Record<string, any>) => {
    const prev = readProfileCache() || {};
    localStorage.setItem(profileCacheKey, JSON.stringify({ ...prev, ...patch }));
  };

  const applyProfile = (data: any) => {
    if (!data) return;
    setUsername(typeof data.name === "string" ? data.name : "");
    setTempUsername(typeof data.name === "string" ? data.name : "");
    setAvatarUrl(data.avatar_url ?? null);
    setPhone(data.phone ?? "");
    setPhoneCode(data.phone_code ?? "");
    setAge(data.age ?? null);
    setGender(data.gender ?? null);
    setZodiac(data.zodiac ?? null);
    setNationality(data.nationality ?? "");
    setRegion(data.region ?? "");
    setTempRegion(data.region ?? "");
    setPersonality(data.personality ?? "");
    setTempPersonality(data.personality ?? "");
    setHobby(data.hobby ?? "");
    setTempHobby(data.hobby ?? "");
    setAlbum(Array.isArray(data.photos) ? data.photos.slice(0, 5) : []);
  };

  const confirmDeletePhoto = async () => {
    if (deleteIndex === null) return;
    const next = album.filter((_, i) => i !== deleteIndex);
    setDeleteLoading(true);
    try {
      await updateMe({ photos: next });
      setAlbum(next);
      mergeProfileCache({ photos: next });
      showSaved("删除成功");
    } catch (e: any) {
      alert(e.message || "保存失败");
    } finally {
      setDeleteLoading(false);
      setDeleteIndex(null);
    }
  };

  const showSaved = (msg = "保存成功") => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveTip(msg);
    saveTimer.current = setTimeout(() => setSaveTip(null), 1500);
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
  const updateMe = async (payload: Record<string, any>) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const res = await fetch(`${API_BASE}/api/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "保存失败");
    }
    const data = await res.json();
    writeProfileCache(data);
    return data;
  };

  const uploadAlbumPhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("请上传图片文件");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("图片需小于 2MB");
      return;
    }
    if (album.length >= 5) {
      alert("相册最多 5 张");
      return;
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const form = new FormData();
    form.append("photo", file);
    setAlbumUploading(true);
    try {
      const res = await fetch(`${API_BASE}/api/me/photos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "上传失败");
      }
      const data = await res.json();
      const nextPhotos = Array.isArray(data.photos)
        ? data.photos.slice(0, 5)
        : album;
      setAlbum(nextPhotos);
      mergeProfileCache({ photos: nextPhotos });
      showSaved("照片已添加");
    } catch (err: any) {
      alert(err.message || "上传失败");
    } finally {
      setAlbumUploading(false);
      if (albumInputRef.current) albumInputRef.current.value = "";
    }
  };

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setAuthed(false);
      alert("请先登录或注册账户");
      window.location.href = "/login";
      return;
    }
    setAuthed(true);
    const cached = readProfileCache();
    if (cached) applyProfile(cached);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        applyProfile(data);
        writeProfileCache(data);
      } catch (e) {
        // ignore
      }
    })();
  }, [API_BASE]);

  return (
    <>
    <main className="mx-auto w-full max-w-none px-0 pb-0 pt-0 overflow-hidden sm:max-w-lg sm:px-4 sm:pb-12 sm:pt-6">
      <div className="relative mx-auto mt-0 flex w-full min-h-screen flex-col items-center gap-4 bg-white/95 text-sm text-[#2f2a2a] border-b border-[#f3d4e8] px-4 pt-4 pb-0 rounded-none shadow-none sm:min-h-0 sm:mt-6 sm:gap-8 sm:rounded-3xl sm:border sm:border-border sm:shadow-glow sm:backdrop-blur sm:p-5">
        <button
          className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-white/10 text-black shadow-glow hover:border-accent hover:text-accent"
          onClick={() => (window.location.href = "/explore")}
          aria-label="返回邂逅"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </button>

        {/* 头像 */}
        <div className="flex flex-col items-center gap-2 pt-1">
          <AvatarUploader
            value={avatarUrl}
            onChange={(url) => {
              setAvatarUrl(url);
              mergeProfileCache({ avatar_url: url });
              showSaved("头像已更新");
            }}
          />
        </div>

        {/* 用户名 */}
        <div className="space-y-1 pt-0 text-center">
          <div className="flex items-center justify-center">
            <div className="relative inline-flex items-center">
              <div className="inline-flex items-center gap-2 pb-1 border-b-4 border-white justify-center">
                {usernameReadOnly ? (
                  <span className="text-xl font-semibold">{username}</span>
                ) : (
                  <input
                    value={tempUsername}
                    onChange={(e) => setTempUsername(e.target.value)}
                    autoFocus
                    className="w-40 bg-transparent px-1 text-base font-semibold text-[#2f2a2a] focus:outline-none text-center"
                  />
                )}
              </div>
              <button
                aria-label="修改用户名"
                className="ml-2 grid h-6 w-6 place-items-center text-sm text-[#2f2a2a] hover:text-accent bg-transparent border-none"
                onClick={() => {
                  if (usernameReadOnly) {
                    setTempUsername(username);
                    setUsernameReadOnly(false);
                  } else {
                    const next = tempUsername.trim();
                    if (!next) {
                      alert("昵称不能为空");
                      return;
                    }
                    if (next === username.trim()) {
                      setUsernameReadOnly(true);
                      return;
                    }
                    updateMe({ name: next })
                      .then(() => {
                        setUsername(next);
                        setUsernameReadOnly(true);
                        showSaved();
                      })
                      .catch((e) => alert(e.message || "保存失败"));
                  }
                }}
                title={usernameReadOnly ? "编辑" : "保存"}
              >
                {usernameReadOnly ? <PenIcon /> : <SaveIcon />}
              </button>
            </div>
          </div>
          <p className="flex items-center justify-center gap-2 text-xs text-[#7a4a7c] font-semibold">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#e14f6f]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 3.5 8.8 5c.5.3.8.8.7 1.4l-.4 2.6c-.1.5.1 1 .5 1.3l1.8 1.4c.4.3 1 .3 1.4 0l1.9-1.5c.5-.4 1.1-.4 1.6-.1l2.1 1.3c.5.3.7.9.5 1.4l-.9 2.8c-.2.6-.8 1-1.4 1.1-2.6.3-5.3-.7-7.7-2.9-2.3-2.2-3.4-4.9-3.2-7.5.1-.6.5-1.2 1-1.5Z" />
            </svg>
            <span>{phoneCode} {phone}</span>
          </p>
        </div>

        {/* 基本信息 */}
        <div className="w-full flex flex-col gap-6 sm:gap-8">
          <div className="flex items-center justify-center gap-3 px-1 text-sm font-semibold text-[#2f2a2a] sm:text-base">
            <div className="flex items-center gap-1">
              <span>{gender || "--"}</span>
            </div>
            <div className="h-4 w-px bg-border/70" />
            <span>{age ?? "--"} 岁</span>
            <div className="h-4 w-px bg-border/70" />
            <span className="inline-flex items-center gap-1">
              <span>{zodiac || "--"}</span>
            </span>
          </div>

          {/* 国籍 / 地区 */}
          <div className="text-left">
            <div className="flex justify-center -mt-1 sm:hidden">
              <div className="rounded-full border border-[#f3d4e8] bg-white px-4 py-1.5 text-sm font-semibold text-[#2f2a2a] shadow-sm">
                {nationality}
              </div>
            </div>
            <div className="hidden sm:grid grid-cols-2 gap-3 text-sm text-[#7a4a7c] font-extrabold mb-2">
              <span className="inline-flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#e14f6f]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="8" />
                  <path d="M4 12h16" />
                  <path d="M12 4c1.8 2.5 1.8 13.5 0 16" />
                  <path d="M8 4.8c.8 1.6 1.2 4.3 1.2 7.2s-.4 5.6-1.2 7.2" />
                  <path d="M16 4.8c-.8 1.6-1.2 4.3-1.2 7.2s.4 5.6 1.2 7.2" />
                </svg>
                <span>所属国籍</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#e14f6f]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                <span>当前所在地区</span>
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="hidden sm:flex w-full rounded-2xl border border-[#f3d4e8] bg-white px-4 py-3 text-sm text-[#2f2a2a] items-center justify-center gap-2 shadow-lg">
                <span>{nationality}</span>
              </div>
              <div className="sm:hidden text-sm text-[#7a4a7c] font-extrabold inline-flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#e14f6f]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                <span>当前所在地区</span>
              </div>
              <div className="relative">
                <input
                  value={regionEditing ? tempRegion : region}
                  onChange={(e) => setTempRegion(e.target.value)}
                  disabled={!regionEditing}
                  placeholder="城市 / 省份"
                  className="w-full rounded-2xl border border-[#f3d4e8] bg-white px-4 py-3 pr-10 text-sm text-[#2f2a2a] shadow-lg placeholder:text-[#b380b0] focus:border-accent focus:outline-none"
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center text-sm text-[#2f2a2a] hover:text-accent"
                  onClick={() => {
                    if (regionEditing) {
                      const next = tempRegion.trim();
                      updateMe({ region: next })
                        .then(() => {
                          setRegion(next);
                          showSaved();
                        })
                        .catch((e) => alert(e.message || "保存失败"));
                    } else {
                      setTempRegion(region);
                    }
                    setRegionEditing((v) => !v);
                  }}
                  aria-label={regionEditing ? "保存" : "编辑"}
                >
                  {regionEditing ? <SaveIcon /> : <PenIcon />}
                </button>
              </div>
            </div>
          </div>

          {/* 性格 / 爱好 */}
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-1 text-left relative">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#7a4a7c] font-extrabold inline-flex items-center gap-2">
                  <span aria-hidden className="text-base">🎭</span>
                  <span>性格</span>
                </p>
                <button
                  className="grid h-6 w-6 place-items-center text-sm text-[#2f2a2a] hover:text-accent"
                  onClick={() => {
                    if (personalityEditing) {
                      const next = tempPersonality.trim();
                      updateMe({ personality: next })
                        .then(() => {
                          setPersonality(next);
                          showSaved();
                        })
                        .catch((e) => alert(e.message || "保存失败"));
                    } else {
                      setTempPersonality(personality);
                    }
                    setPersonalityEditing((v) => !v);
                  }}
                  aria-label={personalityEditing ? "保存" : "编辑"}
                >
                  {personalityEditing ? <SaveIcon /> : <PenIcon />}
                </button>
              </div>
              <textarea
                value={personalityEditing ? tempPersonality : personality}
                onChange={(e) => setTempPersonality(e.target.value)}
                disabled={!personalityEditing}
                rows={4}
                placeholder="填写你的性格描述"
                className="w-full rounded-2xl border border-[#f3d4e8] bg-white px-4 py-3 pr-12 text-sm text-[#2f2a2a] shadow-lg focus:border-accent focus:outline-none placeholder:text-[#b380b0]"
              />
            </div>
            <div className="grid gap-1 text-left relative">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#7a4a7c] font-extrabold inline-flex items-center gap-2">
                  <span aria-hidden className="text-base">🎨</span>
                  <span>爱好</span>
                </p>
                <button
                  className="grid h-6 w-6 place-items-center text-sm text-[#2f2a2a] hover:text-accent"
                  onClick={() => {
                    if (hobbyEditing) {
                      const next = tempHobby.trim();
                      updateMe({ hobby: next })
                        .then(() => {
                          setHobby(next);
                          showSaved();
                        })
                        .catch((e) => alert(e.message || "保存失败"));
                    } else {
                      setTempHobby(hobby);
                    }
                    setHobbyEditing((v) => !v);
                  }}
                  aria-label={hobbyEditing ? "保存" : "编辑"}
                >
                  {hobbyEditing ? <SaveIcon /> : <PenIcon />}
                </button>
              </div>
              <textarea
                value={hobbyEditing ? tempHobby : hobby}
                onChange={(e) => setTempHobby(e.target.value)}
                disabled={!hobbyEditing}
                rows={4}
                placeholder="填写你的爱好描述"
                className="w-full rounded-2xl border border-[#f3d4e8] bg-white px-4 py-3 pr-12 text-sm text-[#2f2a2a] shadow-lg focus:border-accent focus:outline-none placeholder:text-[#b380b0]"
              />
            </div>
          </div>

          {/* 相册 */}
          <div className="border-t border-[#f3d4e8] pt-4 mt-2 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#7a4a7c] font-extrabold">我的相册</p>
              {album.length < 5 && (
                <button
                  className="rounded-full border border-[#f3d4e8] bg-white px-3 py-1 text-xs font-semibold text-[#ff6ba6] hover:border-accent"
                  onClick={() => !albumUploading && albumInputRef.current?.click()}
                >
                  {albumUploading ? "上传中..." : "上传"}
                </button>
              )}
              <input
                ref={albumInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (album.length >= 5) return;
                  uploadAlbumPhoto(file);
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {album.length === 0 && (
                <div className="col-span-3 text-center text-xs text-[#7a4a7c] font-semibold bg-white/60 rounded-xl border border-[#f3d4e8] py-6">
                  暂未上传照片
                </div>
              )}
              {album.map((src, idx) => (
                <div key={src + idx} className="relative h-24 overflow-hidden rounded-xl border border-[#f3d4e8] bg-white shadow-md">
                  <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${src})` }} />
                  <button
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/50 text-white text-xs"
                    onClick={() => {
                      setDeleteIndex(idx);
                    }}
                    aria-label="删除照片"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 退出登录 */}
          <div className="pt-4 pb-4 w-full">
            <button
              className="w-full rounded-full border border-red-400/70 bg-red-500/15 px-4 py-3 text-base font-extrabold text-red-600 shadow-glow hover:bg-red-500/25"
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.removeItem("token");
                }
                showSaved("退出成功");
                setTimeout(() => {
                  window.location.href = "/explore";
                }, 800);
              }}
            >
              退出登录
            </button>
          </div>
        </div>
      </div>
    </main>
    {deleteIndex !== null && (
      <div
        className="fixed inset-0 z-40 grid place-items-center bg-black/40 backdrop-blur-sm px-6"
        onClick={() => {
          if (!deleteLoading) setDeleteIndex(null);
        }}
      >
        <div
          className="w-full max-w-sm rounded-3xl bg-white p-6 text-[#2f2a2a] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-base font-extrabold text-center">确认删除该照片吗？</p>
          <p className="mt-2 text-center text-sm text-[#7a4a7c]">删除后无法恢复</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              className="rounded-full border border-[#f3d4e8] bg-white px-4 py-2 text-sm font-semibold text-[#2f2a2a] hover:border-accent"
              onClick={() => setDeleteIndex(null)}
              disabled={deleteLoading}
            >
              取消
            </button>
            <button
              className="rounded-full border border-emerald-400/60 bg-emerald-500/15 px-4 py-2 text-sm font-extrabold text-emerald-700 hover:bg-emerald-500/25"
              onClick={confirmDeletePhoto}
              disabled={deleteLoading}
            >
              {deleteLoading ? "删除中..." : "确认删除"}
            </button>
          </div>
        </div>
      </div>
    )}
    {saveTip && (
      <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center">
        <div className="flex items-center gap-3 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-xl backdrop-blur">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white text-base">✔</span>
          <span>{saveTip}</span>
        </div>
      </div>
    )}
    </>
  );
}

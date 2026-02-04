"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ClipboardEvent as ReactClipboardEvent } from "react";
import { SmileIcon, CameraIcon } from "../components/ui";
import { formatTimeNow } from "../lib/data";
import { io as createSocket } from "socket.io-client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

type ChatItem = {
  id: number;
  partner_id: number;
  partner_name: string;
  partner_avatar: string | null;
  last_message: string;
  last_message_at: string | null;
  guest_expired?: boolean;
  unread_count?: number;
};

type MessageItem = {
  id: number | string;
  sender_id: number;
  content: string;
  image_url?: string | null;
  created_at: string;
  read_at?: string | null;
  client_id?: string | null;
  pending?: boolean;
};

export default function ChatPage() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [selfAvatar, setSelfAvatar] = useState<string | null>(null);
  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null);
  const currentChatIdRef = useRef<number | null>(null);
  const currentPartnerIdRef = useRef<number | null>(null);
  const userIdRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [socketStatus, setSocketStatus] = useState<"connected" | "connecting" | "reconnecting" | "disconnected">(
    "connecting"
  );
  const [partnerOnline, setPartnerOnline] = useState<boolean | null>(null);
  const [chatCache, setChatCache] = useState<Record<number, MessageItem[]>>({});
  const [chatCursorCache, setChatCursorCache] = useState<Record<number, { nextBeforeId: number | null; hasMore: boolean }>>(
    {}
  );
  const [chatListCursor, setChatListCursor] = useState<string | null>(null);
  const [chatListHasMore, setChatListHasMore] = useState(true);
  const [chatListLoadingMore, setChatListLoadingMore] = useState(false);
  const [guestPromptOpen, setGuestPromptOpen] = useState(false);
  const guestTimerRef = useRef<NodeJS.Timeout | null>(null);
  const guestIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showListMobile, setShowListMobile] = useState(true);
  const lastChatsRefreshRef = useRef(0);
  const lastMessagesRefreshRef = useRef(0);
  const prefetchingRef = useRef<Set<number>>(new Set());
  const cacheWriteTimer = useRef<NodeJS.Timeout | null>(null);
  const listCacheTimer = useRef<NodeJS.Timeout | null>(null);
  const watchedPresenceRef = useRef<number | null>(null);
  const MAX_CACHE = 60;
  const lastTailIdRef = useRef<string | null>(null);
  const activatedChatsRef = useRef<Set<number>>(new Set());
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const messageRequestRef = useRef(0);
  const forceScrollRef = useRef(false);

  const currentChat = useMemo(
    () => chats.find((c) => c.id === currentChatId) ?? null,
    [chats, currentChatId]
  );

  useEffect(() => {
    const onFocus = () => {
      const headers = getAuthHeaders();
      if (!headers) return;
      fetchChats(headers, { limit: 30 })
        .then((result) => {
          setChats(sortChats(result.chats));
          setChatListCursor(result.next_cursor);
          setChatListHasMore(result.has_more);
        })
        .catch(() => {});
      const currentId = currentChatIdRef.current;
      if (currentId) {
        const reqId = ++messageRequestRef.current;
        fetchMessages(headers, currentId, { markRead: false, limit: 20 })
          .then((data) => {
            if (reqId !== messageRequestRef.current) return;
            const nextMessages = Array.isArray(data.messages) ? sortMessages(data.messages) : [];
            setMessages(nextMessages);
            setHasMore(Boolean(data.next_before_id));
            setNextBeforeId(data.next_before_id);
            setChatCache((prev) => ({ ...prev, [currentId]: trimMessages(nextMessages) }));
            setChatCursorCache((prev) => ({
              ...prev,
              [currentId]: { nextBeforeId: data.next_before_id, hasMore: Boolean(data.next_before_id) },
            }));
            scheduleScrollToBottom();
          })
          .catch(() => {});
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onFocus);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", onFocus);
      }
    };
  }, []);

  useEffect(() => {
    currentChatIdRef.current = currentChatId;
    currentPartnerIdRef.current = currentChat?.partner_id ?? null;
  }, [currentChatId, currentChat]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShowListMobile(true);
  }, []);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useLayoutEffect(() => {
    const tail = messages.length ? String(messages[messages.length - 1]?.id ?? "") : null;
    if (forceScrollRef.current || (tail && tail !== lastTailIdRef.current)) {
      lastTailIdRef.current = tail;
      forceScrollRef.current = false;
      scheduleScrollToBottom();
    }
  }, [messages]);

  const chatListVirtualizer = useVirtualizer({
    count: chats.length,
    getScrollElement: () => chatListRef.current,
    estimateSize: () => 76,
    overscan: 8,
    getItemKey: (index) => chats[index]?.id ?? index,
  });

  const parseJwt = (token: string) => {
    try {
      const payload = token.split(".")[1];
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const json = atob(base64);
      return JSON.parse(json);
    } catch {
      return null;
    }
  };

  const getNumericId = (m: MessageItem) => (typeof m.id === "number" ? m.id : null);

  const sortMessages = (list: MessageItem[]) => {
    return [...list].sort((a, b) => {
      const aid = getNumericId(a);
      const bid = getNumericId(b);
      if (aid !== null && bid !== null) return aid - bid;
      if (aid !== null) return -1;
      if (bid !== null) return 1;
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      if (at !== bt) return at - bt;
      return String(a.id).localeCompare(String(b.id));
    });
  };

  const messageKey = (m: MessageItem) => {
    if (typeof m.id === "number") return `id:${m.id}`;
    if (m.client_id) return `client:${m.client_id}`;
    return `id:${String(m.id)}`;
  };

  const mergeMessages = (base: MessageItem[], incoming: MessageItem[]) => {
    const map = new Map<string, MessageItem>();
    base.forEach((m) => map.set(messageKey(m), m));
    incoming.forEach((m) => {
      if (m.client_id && map.has(`client:${m.client_id}`)) {
        map.set(`client:${m.client_id}`, { ...map.get(`client:${m.client_id}`)!, ...m, pending: false });
        return;
      }
      map.set(messageKey(m), m);
    });
    return sortMessages(Array.from(map.values()));
  };

  const trimMessages = (list: MessageItem[]) => {
    if (list.length <= MAX_CACHE) return list;
    return list.slice(list.length - MAX_CACHE);
  };

  const sortChats = (list: ChatItem[]) => {
    return [...list].sort((a, b) => {
      const at = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bt = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      if (bt !== at) return bt - at;
      return b.id - a.id;
    });
  };

  const readCache = (key: string) => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const writeCache = (key: string, data: any) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  const stopGuestPrompt = () => {
    if (guestTimerRef.current) clearTimeout(guestTimerRef.current);
    if (guestIntervalRef.current) clearInterval(guestIntervalRef.current);
    setGuestPromptOpen(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("guest_chat_started");
    }
  };

  const scheduleGuestPrompt = (started: number) => {
    if (getToken()) {
      stopGuestPrompt();
      return;
    }
    const limitMs = 5 * 60 * 1000;
    const now = Date.now();
    const elapsed = now - started;
    const showPrompt = () => {
      if (getToken()) {
        stopGuestPrompt();
        return;
      }
      setGuestPromptOpen((prev) => (prev ? prev : true));
    };
    if (elapsed >= limitMs) {
      showPrompt();
    }
    if (guestTimerRef.current) clearTimeout(guestTimerRef.current);
    if (guestIntervalRef.current) clearInterval(guestIntervalRef.current);
    guestTimerRef.current = setTimeout(() => {
      showPrompt();
    }, Math.max(0, limitMs - elapsed));
    guestIntervalRef.current = setInterval(() => {
      showPrompt();
    }, limitMs);
  };

  useEffect(() => {
    const token = getToken();
    if (token) stopGuestPrompt();
    if (typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === "token" && event.newValue) {
        stopGuestPrompt();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    const token = getToken();
    const guestToken = getGuestToken();
    if (token || !guestToken) return;
    const hasActiveChat = chats.some((c) => !c.guest_expired);
    if (!currentChatId && !hasActiveChat) return; // 只有发起对话后才开始计时
    const now = Date.now();
    const key = "guest_chat_started";
    const raw = localStorage.getItem(key);
    let started = raw ? parseInt(raw, 10) : NaN;
    if (!Number.isFinite(started)) {
      started = now;
      localStorage.setItem(key, String(started));
    }
    scheduleGuestPrompt(started);
    return () => {
      if (guestTimerRef.current) clearTimeout(guestTimerRef.current);
      if (guestIntervalRef.current) clearInterval(guestIntervalRef.current);
    };
  }, [currentChatId, chats]);

  const formatChatTime = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const diff = Date.now() - date.getTime();
    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");
    if (diff <= 24 * 60 * 60 * 1000) {
      return `${h}:${m}`;
    }
    const y = date.getFullYear();
    const mo = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    return `${y}-${mo}-${d} ${h}:${m}`;
  };

  const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);
  const getGuestToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("guest_token");
  };
  const getAuthHeaders = (): Record<string, string> | null => {
    const token = getToken();
    if (token) return { Authorization: `Bearer ${token}` } as Record<string, string>;
    const guestToken = getGuestToken();
    if (guestToken) return { "x-guest-token": guestToken } as Record<string, string>;
    return null;
  };
  const safeHeaders = (headers?: Record<string, string> | null) => {
    return headers && typeof headers === "object" ? headers : undefined;
  };

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!messages.length || !el) return;
    el.scrollTop = el.scrollHeight;
  };

  const scheduleScrollToBottom = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToBottom());
    });
    setTimeout(() => scrollToBottom(), 60);
  };

  const loadMore = async () => {
    const headers = getAuthHeaders();
    const chatId = currentChatIdRef.current;
    if (!headers || !chatId || !nextBeforeId || loadingMore) return;
    setLoadingMore(true);
    const el = listRef.current;
    const prevHeight = el ? el.scrollHeight : 0;
    try {
      const res = await fetch(
        `${API_BASE}/api/chats/${chatId}/messages?before_id=${nextBeforeId}&mark_read=0`,
        { headers: safeHeaders(headers) }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "加载失败");
      }
      const data = await res.json();
      if (chatId !== currentChatIdRef.current) return;
      const older = Array.isArray(data.messages) ? sortMessages(data.messages as MessageItem[]) : [];
      setMessages((prev) => mergeMessages(older, prev));
      setChatCache((prev) => {
        const key = Number(currentChatIdRef.current);
        const next = trimMessages(mergeMessages(older || [], prev[key] || []));
        return { ...prev, [key]: next };
      });
      setHasMore(Boolean(data.next_before_id));
      setNextBeforeId(data.next_before_id);
      setChatCursorCache((prev) => ({
        ...prev,
        [Number(currentChatIdRef.current)]: { nextBeforeId: data.next_before_id, hasMore: Boolean(data.next_before_id) },
      }));
      requestAnimationFrame(() => {
        if (!el) return;
        const newHeight = el.scrollHeight;
        el.scrollTop = newHeight - prevHeight + el.scrollTop;
      });
    } catch (e: any) {
      alert(e.message || "加载失败");
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchChats = async (
    headers: Record<string, string>,
    opts?: { cursor?: string | null; limit?: number }
  ) => {
    const params = new URLSearchParams();
    params.set("limit", String(opts?.limit ?? 30));
    if (opts?.cursor) params.set("cursor", opts.cursor);
    const res = await fetch(`${API_BASE}/api/chats?${params.toString()}`, {
      headers: safeHeaders(headers),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "获取对话失败");
    }
    const data = await res.json();
    const list = (Array.isArray(data.chats) ? data.chats : []) as ChatItem[];
    const uid = userIdRef.current;
    if (uid && !opts?.cursor) {
      writeCache(`chat_list_cache_${uid}`, {
        chats: list,
        next_cursor: data.next_cursor ?? null,
        has_more: Boolean(data.has_more),
      });
    }
    return {
      chats: list,
      next_cursor: data.next_cursor ?? null,
      has_more: Boolean(data.has_more),
    };
  };

  const fetchMessages = async (
    headers: Record<string, string>,
    chatId: number,
    opts?: { markRead?: boolean; limit?: number }
  ) => {
    const params = new URLSearchParams();
    params.set("mark_read", opts?.markRead === false ? "0" : "1");
    if (opts?.limit) params.set("limit", String(opts.limit));
    const query = params.toString();
    const res = await fetch(`${API_BASE}/api/chats/${chatId}/messages?${query}`, {
      headers: safeHeaders(headers),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "获取消息失败");
    }
    const data = await res.json();
    return data as { messages: MessageItem[]; next_before_id: number | null };
  };

  const prefetchMessages = async (headers: Record<string, string>, chatId: number) => {
    if (!chatId) return;
    if (prefetchingRef.current.has(chatId)) return;
    const cached = chatCache[chatId];
    if (cached && cached.length) return;
    prefetchingRef.current.add(chatId);
    try {
      const data = await fetchMessages(headers, chatId, { markRead: false, limit: 20 });
      const nextMessages = Array.isArray(data.messages) ? sortMessages(data.messages) : [];
      setChatCache((prev) => ({ ...prev, [chatId]: trimMessages(nextMessages) }));
      setChatCursorCache((prev) => ({
        ...prev,
        [chatId]: { nextBeforeId: data.next_before_id, hasMore: Boolean(data.next_before_id) },
      }));
      if (currentChatIdRef.current === chatId && nextMessages.length) {
        setMessages(nextMessages);
        setHasMore(Boolean(data.next_before_id));
        setNextBeforeId(data.next_before_id);
      }
    } catch {
      // ignore
    } finally {
      prefetchingRef.current.delete(chatId);
    }
  };

  const loadMoreChats = async () => {
    const headers = getAuthHeaders();
    if (!headers || !chatListHasMore || chatListLoadingMore) return;
    setChatListLoadingMore(true);
    try {
      const result = await fetchChats(headers, { cursor: chatListCursor, limit: 30 });
      if (result.chats.length) {
        setChats((prev) => {
          const existing = new Set(prev.map((c) => c.id));
          const merged = [...prev, ...result.chats.filter((c) => !existing.has(c.id))];
          return sortChats(merged);
        });
      }
      setChatListCursor(result.next_cursor);
      setChatListHasMore(result.has_more);
    } catch (e: any) {
      // ignore
    } finally {
      setChatListLoadingMore(false);
    }
  };

  useEffect(() => {
    const token = getToken();
    const guestToken = getGuestToken();
    if (!token && !guestToken) {
      alert("请先登录或注册账户");
      window.location.href = "/login";
      return;
    }
    const headers = getAuthHeaders();
    if (!headers) {
      alert("请先登录或注册账户");
      window.location.href = "/login";
      return;
    }
    const payload = token ? parseJwt(token) : null;
    setUserId(payload?.id ?? null);
    const uid = payload?.id ?? null;
    const urlParams = new URLSearchParams(window.location.search);
    const targetChatId = parseInt(urlParams.get("chat_id") || "", 10);
    if (Number.isFinite(targetChatId)) {
      setCurrentChatId(targetChatId);
      if (typeof window !== "undefined") {
        const isMobile = window.matchMedia("(max-width: 768px)").matches;
        if (isMobile) setShowListMobile(false);
      }
      if (typeof window !== "undefined") {
        const prefillRaw = sessionStorage.getItem(`chat_prefill_${targetChatId}`);
        if (prefillRaw) {
          try {
            const prefill = JSON.parse(prefillRaw);
            const preChat = prefill?.chat;
            const preMessages = Array.isArray(prefill?.messages) ? sortMessages(prefill.messages) : [];
            if (preChat) {
              setChats((prev) => {
                const exists = prev.some((c) => c.id === preChat.id);
                const merged = exists ? prev : [preChat, ...prev];
                return sortChats(merged);
              });
            }
            if (preMessages.length) {
              setMessages(preMessages);
              setChatCache((prev) => ({ ...prev, [targetChatId]: preMessages }));
              setHasMore(false);
              setNextBeforeId(null);
            }
          } catch {
            // ignore
          } finally {
            sessionStorage.removeItem(`chat_prefill_${targetChatId}`);
          }
        }
      }
    }
    const hasCachedList = Boolean(
      (uid && readCache(`chat_list_cache_${uid}`)?.chats?.length) ||
        (guestToken && readCache(`chat_list_cache_guest_${guestToken}`)?.chats?.length)
    );
    if (uid) {
      const listCache = readCache(`chat_list_cache_${uid}`);
      if (listCache?.chats && Array.isArray(listCache.chats)) {
        const cachedChats = sortChats(listCache.chats);
        setChats(cachedChats);
        setChatListCursor(listCache.next_cursor ?? null);
        setChatListHasMore(Boolean(listCache.has_more));
        if (cachedChats.length) {
          const ids = new Set(cachedChats.map((c) => c.id));
          let initId: number | null = null;
          if (Number.isFinite(targetChatId) && ids.has(targetChatId)) {
            initId = targetChatId;
          } else {
            const lastActiveRaw = localStorage.getItem(`chat_last_active_${uid}`);
            const lastActiveId = lastActiveRaw ? parseInt(lastActiveRaw, 10) : Number.NaN;
            if (Number.isFinite(lastActiveId) && ids.has(lastActiveId)) {
              initId = lastActiveId;
            } else {
              initId = cachedChats[0]?.id ?? null;
            }
          }
          if (initId) setCurrentChatId(initId);
          if (initId) {
            const authHeaders = getAuthHeaders();
            if (authHeaders) prefetchMessages(authHeaders, initId);
          }
        }
      }
      const msgCache = readCache(`chat_messages_cache_${uid}`);
      if (msgCache?.messages) {
        setChatCache(msgCache.messages);
      }
      if (msgCache?.cursors) {
        setChatCursorCache(msgCache.cursors);
      }
    } else if (guestToken) {
      const listCache = readCache(`chat_list_cache_guest_${guestToken}`);
      if (listCache?.chats && Array.isArray(listCache.chats)) {
        const cachedChats = sortChats(listCache.chats);
        setChats(cachedChats);
        setChatListCursor(listCache.next_cursor ?? null);
        setChatListHasMore(Boolean(listCache.has_more));
        if (cachedChats.length) {
          const ids = new Set(cachedChats.map((c) => c.id));
          let initId: number | null = null;
          if (Number.isFinite(targetChatId) && ids.has(targetChatId)) {
            initId = targetChatId;
          } else {
            const lastActiveRaw = localStorage.getItem(`chat_last_active_guest_${guestToken}`);
            const lastActiveId = lastActiveRaw ? parseInt(lastActiveRaw, 10) : Number.NaN;
            if (Number.isFinite(lastActiveId) && ids.has(lastActiveId)) {
              initId = lastActiveId;
            } else {
              initId = cachedChats[0]?.id ?? null;
            }
          }
          if (initId) setCurrentChatId(initId);
          if (initId) {
            const authHeaders = getAuthHeaders();
            if (authHeaders) prefetchMessages(authHeaders, initId);
          }
        }
      }
      const msgCache = readCache(`chat_messages_cache_guest_${guestToken}`);
      if (msgCache?.messages) {
        setChatCache(msgCache.messages);
      }
      if (msgCache?.cursors) {
        setChatCursorCache(msgCache.cursors);
      }
    }
    const refreshChats = async () => {
      lastChatsRefreshRef.current = Date.now();
      setLoadingChats(!hasCachedList);
      if (token) {
        fetch(`${API_BASE}/api/me`, {
          headers: safeHeaders(headers),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((me) => {
            if (me?.id) setUserId(me.id);
            if (me?.avatar_url) setSelfAvatar(me.avatar_url);
          })
          .catch(() => {});
      } else if (guestToken) {
        fetch(`${API_BASE}/api/guest/me`, { headers: safeHeaders(headers) })
          .then((res) => (res.ok ? res.json() : null))
          .then((me) => {
            if (me?.id) setUserId(me.id);
            if (me?.avatar_url) setSelfAvatar(me.avatar_url);
          })
          .catch(() => {});
      }
      try {
        const result = await fetchChats(headers, { limit: 30 });
        setChats(sortChats(result.chats));
        setChatListCursor(result.next_cursor);
        setChatListHasMore(result.has_more);
        const chatIds = new Set(result.chats.map((c) => c.id));
        const current = currentChatIdRef.current;
        let initId: number | null = null;
        if (Number.isFinite(targetChatId) && chatIds.has(targetChatId)) {
          initId = targetChatId;
        } else if (current && chatIds.has(current)) {
          initId = current;
        } else if (uid) {
          const lastActiveRaw = localStorage.getItem(`chat_last_active_${uid}`);
          const lastActiveId = lastActiveRaw ? parseInt(lastActiveRaw, 10) : Number.NaN;
          if (Number.isFinite(lastActiveId) && chatIds.has(lastActiveId)) {
            initId = lastActiveId;
          } else {
            initId = result.chats[0]?.id ?? null;
          }
        }
        if (initId) setCurrentChatId(initId);
        if (initId) {
          const authHeaders = getAuthHeaders();
          if (authHeaders) {
            prefetchMessages(authHeaders, initId);
          }
        }
        if (Number.isFinite(targetChatId) && initId === targetChatId) {
          activatedChatsRef.current.add(initId);
          fetch(`${API_BASE}/api/chats/${initId}/read`, {
            method: "POST",
            headers: safeHeaders(headers),
          }).catch(() => {});
        }
      } catch (e: any) {
        alert(e.message || "获取对话失败");
      } finally {
        setLoadingChats(false);
      }
    };
    refreshChats();

    const socket = createSocket(API_BASE, {
      auth: token ? { token } : { guest_token: guestToken },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 600,
      reconnectionDelayMax: 3000,
      timeout: 8000,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    setSocketStatus("connecting");

    socket.on("connect", () => {
      setSocketStatus("connected");
      const authHeaders = getAuthHeaders();
      if (!authHeaders) return;
      if (Date.now() - lastChatsRefreshRef.current > 2500) {
        refreshChats();
      }
      const currentId = currentChatIdRef.current;
      if (currentId && Date.now() - lastMessagesRefreshRef.current > 2500) {
        const reqId = ++messageRequestRef.current;
        lastMessagesRefreshRef.current = Date.now();
        fetchMessages(authHeaders, currentId, { markRead: false, limit: 20 })
          .then((data) => {
            if (reqId !== messageRequestRef.current) return;
            const next = Array.isArray(data.messages) ? sortMessages(data.messages) : [];
            setMessages(next);
            setHasMore(Boolean(data.next_before_id));
            setNextBeforeId(data.next_before_id);
            if (activatedChatsRef.current.has(currentId)) {
              setChats((prev) =>
                prev.map((c) => (c.id === currentId ? { ...c, unread_count: 0 } : c))
              );
            }
            scheduleScrollToBottom();
          })
          .catch(() => {});
      }
    });

    socket.on("disconnect", () => {
      setSocketStatus("disconnected");
    });

    socket.on("connect_error", () => {
      setSocketStatus("reconnecting");
    });

    socket.io.on("reconnect_attempt", () => {
      setSocketStatus("reconnecting");
    });

    socket.on("message:new", (payload: { chat_id: number; message: MessageItem }) => {
      const { chat_id, message } = payload || {};
      if (!chat_id || !message) return;
      const isSelf = message.sender_id === userIdRef.current;
      setChats((prev) => {
        const exists = prev.find((c) => c.id === chat_id);
        if (!exists) {
          const authHeaders = getAuthHeaders();
          if (authHeaders) {
            fetchChats(authHeaders, { limit: 30 })
              .then((result) => {
                setChats(sortChats(result.chats));
                setChatListCursor(result.next_cursor);
                setChatListHasMore(result.has_more);
              })
              .catch(() => {});
          }
          return prev;
        }
        const next = prev.map((c) => {
          if (c.id !== chat_id) return c;
          const unread = c.unread_count || 0;
          const shouldInc = !isSelf && chat_id !== currentChatIdRef.current;
          return {
            ...c,
            last_message: message.content || (message.image_url ? "[图片]" : ""),
            last_message_at: message.created_at,
            unread_count: shouldInc ? unread + 1 : 0,
          };
        });
        return sortChats(next);
      });

      if (chat_id === currentChatIdRef.current) {
        setMessages((prev) => mergeMessages(prev, [message]));
        setChatCache((prev) => {
          const next = trimMessages(mergeMessages(prev[chat_id] || [], [message]));
          return { ...prev, [chat_id]: next };
        });
        scheduleScrollToBottom();
        if (!isSelf && activatedChatsRef.current.has(chat_id)) {
          const authHeaders = getAuthHeaders();
          if (!authHeaders) return;
          fetch(`${API_BASE}/api/chats/${chat_id}/read`, {
            method: "POST",
            headers: safeHeaders(authHeaders),
          }).catch(() => {});
        }
      }
    });

    socket.on("messages:read", (payload: { chat_id: number; reader_id: number }) => {
      const { chat_id } = payload || {};
      if (!chat_id) return;
    });

    socket.on(
      "message:ack",
      (payload: { chat_id: number; client_id: string; message: MessageItem }) => {
        const { chat_id, client_id, message } = payload || {};
        if (!chat_id || !client_id || !message) return;
        if (chat_id !== currentChatIdRef.current) return;
        setMessages((prev) => mergeMessages(prev, [{ ...message, client_id }]));
        setChatCache((prev) => {
          const list = prev[chat_id] || [];
          const next = mergeMessages(list, [{ ...message, client_id }]);
          return { ...prev, [chat_id]: next };
        });
      }
    );

    socket.on("presence:update", (payload: { user_id: number; online: boolean }) => {
      const { user_id, online } = payload || {};
      if (!user_id) return;
      if (currentPartnerIdRef.current === user_id) {
        setPartnerOnline(Boolean(online));
      }
    });

    socket.on("message:failed", (payload: { chat_id: number; client_id: string }) => {
      const { chat_id, client_id } = payload || {};
      if (!chat_id || !client_id) return;
      if (chat_id !== currentChatIdRef.current) return;
      setMessages((prev) => prev.filter((m) => m.client_id !== client_id));
      setChatCache((prev) => {
        const list = prev[chat_id] || [];
        return { ...prev, [chat_id]: list.filter((m) => m.client_id !== client_id) };
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const uid = userId;
    if (!uid) return;
    if (listCacheTimer.current) clearTimeout(listCacheTimer.current);
    listCacheTimer.current = setTimeout(() => {
      writeCache(`chat_list_cache_${uid}`, {
        chats,
        next_cursor: chatListCursor,
        has_more: chatListHasMore,
      });
    }, 300);
    return () => {
      if (listCacheTimer.current) clearTimeout(listCacheTimer.current);
    };
  }, [chats, userId, chatListCursor, chatListHasMore]);

  useEffect(() => {
    if (userId) return;
    const guestToken = getGuestToken();
    if (!guestToken) return;
    if (listCacheTimer.current) clearTimeout(listCacheTimer.current);
    listCacheTimer.current = setTimeout(() => {
      writeCache(`chat_list_cache_guest_${guestToken}`, {
        chats,
        next_cursor: chatListCursor,
        has_more: chatListHasMore,
      });
    }, 300);
    return () => {
      if (listCacheTimer.current) clearTimeout(listCacheTimer.current);
    };
  }, [chats, userId, chatListCursor, chatListHasMore]);

  useEffect(() => {
    const socket = socketRef.current;
    const partnerId = currentChat?.partner_id ?? null;
    if (!socket) return;
    if (watchedPresenceRef.current && watchedPresenceRef.current !== partnerId) {
      socket.emit("presence:unwatch", { user_id: watchedPresenceRef.current });
      watchedPresenceRef.current = null;
    }
    if (partnerId) {
      watchedPresenceRef.current = partnerId;
      setPartnerOnline(null);
      socket.emit("presence:watch", { user_id: partnerId });
    } else {
      setPartnerOnline(null);
    }
    return () => {
      if (partnerId) {
        socket.emit("presence:unwatch", { user_id: partnerId });
      }
    };
  }, [currentChat?.partner_id, socketStatus]);

  useEffect(() => {
    const uid = userId;
    if (!uid) return;
    if (cacheWriteTimer.current) clearTimeout(cacheWriteTimer.current);
    cacheWriteTimer.current = setTimeout(() => {
      writeCache(`chat_messages_cache_${uid}`, { messages: chatCache, cursors: chatCursorCache });
    }, 300);
    return () => {
      if (cacheWriteTimer.current) clearTimeout(cacheWriteTimer.current);
    };
  }, [chatCache, chatCursorCache, userId]);

  useEffect(() => {
    if (userId) return;
    const guestToken = getGuestToken();
    if (!guestToken) return;
    if (cacheWriteTimer.current) clearTimeout(cacheWriteTimer.current);
    cacheWriteTimer.current = setTimeout(() => {
      writeCache(`chat_messages_cache_guest_${guestToken}`, { messages: chatCache, cursors: chatCursorCache });
    }, 300);
    return () => {
      if (cacheWriteTimer.current) clearTimeout(cacheWriteTimer.current);
    };
  }, [chatCache, chatCursorCache, userId]);

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers || !currentChatId) {
      setMessages([]);
      setHasMore(false);
      setNextBeforeId(null);
      setLoadingMessages(false);
      return;
    }
    forceScrollRef.current = true;
    const reqId = ++messageRequestRef.current;
    const cached = chatCache[currentChatId];
    const cachedCursor = chatCursorCache[currentChatId];
    setMessages(cached ? sortMessages(cached) : []);
    setHasMore(Boolean(cachedCursor?.hasMore));
    setNextBeforeId(cachedCursor?.nextBeforeId ?? null);
    setLoadingMessages(!(cached && cached.length));
    (async () => {
      lastMessagesRefreshRef.current = Date.now();
      try {
        const data = await fetchMessages(headers, currentChatId, { markRead: false, limit: 20 });
        if (reqId !== messageRequestRef.current) return;
        const nextMessages = Array.isArray(data.messages) ? sortMessages(data.messages) : [];
        setMessages(nextMessages);
        setHasMore(Boolean(data.next_before_id));
        setNextBeforeId(data.next_before_id);
        setChatCache((prev) => ({ ...prev, [currentChatId]: trimMessages(nextMessages) }));
        setChatCursorCache((prev) => ({
          ...prev,
          [currentChatId]: { nextBeforeId: data.next_before_id, hasMore: Boolean(data.next_before_id) },
        }));
        if (activatedChatsRef.current.has(currentChatId)) {
          setChats((prev) => prev.map((c) => (c.id === currentChatId ? { ...c, unread_count: 0 } : c)));
          fetch(`${API_BASE}/api/chats/${currentChatId}/read`, {
            method: "POST",
            headers: safeHeaders(headers),
          }).catch(() => {});
        }
        scheduleScrollToBottom();
      } catch (e: any) {
        alert(e.message || "获取消息失败");
      } finally {
        if (reqId === messageRequestRef.current) {
          setLoadingMessages(false);
        }
      }
    })();
  }, [currentChatId]);

  const send = async () => {
    if (currentChat?.guest_expired) return;
    const headers = getAuthHeaders();
    if (!headers || !currentChatId || !draft.trim() || !userId) return;
    const clientId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: MessageItem = {
      id: clientId,
      client_id: clientId,
      pending: true,
      sender_id: userId,
      content: draft.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    scheduleScrollToBottom();
    setChatCache((prev) => ({
      ...prev,
      [currentChatId]: trimMessages(mergeMessages(prev[currentChatId] || [], [optimistic])),
    }));
    setChats((prev) =>
      sortChats(
        prev.map((c) =>
          c.id === currentChatId
            ? { ...c, last_message: optimistic.content, last_message_at: optimistic.created_at }
            : c
        )
      )
    );
    setDraft("");
    try {
      const res = await fetch(`${API_BASE}/api/chats/${currentChatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(safeHeaders(headers) ?? {}),
        },
        body: JSON.stringify({ content: optimistic.content, client_id: clientId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "发送失败");
      }
      const data = await res.json().catch(() => ({}));
      if (data?.message) {
        const saved = data.message as MessageItem;
        const ackId = data.client_id || clientId;
        setMessages((prev) =>
          prev.map((m) => (m.client_id === ackId || m.id === ackId ? { ...saved } : m))
        );
        setChatCache((prev) => {
          const list = prev[currentChatId] || [];
          const hitIdx = list.findIndex((m) => m.client_id === ackId || m.id === ackId);
          if (hitIdx < 0) return prev;
          const next = [...list];
          next[hitIdx] = { ...saved };
          return { ...prev, [currentChatId]: next };
        });
        scheduleScrollToBottom();
      }
    } catch (e: any) {
      alert(e.message || "发送失败");
      setMessages((prev) => prev.filter((m) => m.client_id !== clientId));
      setChatCache((prev) => {
        const list = prev[currentChatId] || [];
        return { ...prev, [currentChatId]: list.filter((m) => m.client_id !== clientId) };
      });
    }
  };

  const handlePaste = async (e: ReactClipboardEvent<HTMLTextAreaElement>) => {
    if (currentChat?.guest_expired) return;
    const headers = getAuthHeaders();
    if (!headers || !currentChatIdRef.current) return;
    const items = e.clipboardData?.items || [];
    const fileItem = Array.from(items).find((it) => it.kind === "file" && it.type.startsWith("image/"));
    if (!fileItem) return;
    e.preventDefault();
    const file = fileItem.getAsFile();
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("图片需小于 2MB");
      return;
    }
    const tempId = -Date.now();
    const tempUrl = URL.createObjectURL(file);
    const optimistic: MessageItem = {
      id: tempId,
      sender_id: userIdRef.current || 0,
      content: "",
      image_url: tempUrl,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    scheduleScrollToBottom();
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(`${API_BASE}/api/chats/${currentChatIdRef.current}/images`, {
        method: "POST",
        headers: safeHeaders(headers),
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "发送失败");
      }
      const data = await res.json();
      const saved = data.message as MessageItem;
      setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
      setChatCache((prev) => {
        const key = currentChatIdRef.current || 0;
        const list = prev[key] || [];
        const hitIdx = list.findIndex((m) => m.id === tempId);
        if (hitIdx < 0) return prev;
        const next = [...list];
        next[hitIdx] = saved;
        return { ...prev, [key]: next };
      });
      setChats((prev) =>
        sortChats(
          prev.map((c) =>
            c.id === currentChatIdRef.current
              ? { ...c, last_message: "[图片]", last_message_at: saved.created_at }
              : c
          )
        )
      );
    } catch (err: any) {
      alert(err.message || "发送失败");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      URL.revokeObjectURL(tempUrl);
    }
  };

  const sendImageFile = async (file: File) => {
    if (currentChat?.guest_expired) return;
    const headers = getAuthHeaders();
    if (!headers || !currentChatIdRef.current) return;
    if (!file.type.startsWith("image/")) {
      alert("请上传图片文件");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("图片需小于 2MB");
      return;
    }
    const tempId = -Date.now();
    const tempUrl = URL.createObjectURL(file);
    const optimistic: MessageItem = {
      id: tempId,
      sender_id: userIdRef.current || 0,
      content: "",
      image_url: tempUrl,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setChatCache((prev) => ({
      ...prev,
      [currentChatIdRef.current || 0]: trimMessages(
        mergeMessages(prev[currentChatIdRef.current || 0] || [], [optimistic])
      ),
    }));
    scheduleScrollToBottom();
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(`${API_BASE}/api/chats/${currentChatIdRef.current}/images`, {
        method: "POST",
        headers: safeHeaders(headers),
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "发送失败");
      }
      const data = await res.json();
      const saved = data.message as MessageItem;
      setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
      setChatCache((prev) => {
        const key = currentChatIdRef.current || 0;
        const list = prev[key] || [];
        const hitIdx = list.findIndex((m) => m.id === tempId);
        if (hitIdx < 0) return prev;
        const next = [...list];
        next[hitIdx] = saved;
        return { ...prev, [key]: next };
      });
      setChats((prev) =>
        sortChats(
          prev.map((c) =>
            c.id === currentChatIdRef.current
              ? { ...c, last_message: "[图片]", last_message_at: saved.created_at }
              : c
          )
        )
      );
    } catch (err: any) {
      alert(err.message || "发送失败");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      URL.revokeObjectURL(tempUrl);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const deleteExpiredChat = async () => {
    const headers = getAuthHeaders();
    if (!headers || !currentChatId) return;
    if (!confirm("确认删除该对话吗？")) return;
    try {
      const res = await fetch(`${API_BASE}/api/chats/${currentChatId}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "删除失败");
      }
      setChats((prev) => prev.filter((c) => c.id !== currentChatId));
      setMessages([]);
      setCurrentChatId(null);
    } catch (e: any) {
      alert(e.message || "删除失败");
    }
  };

  return (
    <main className="relative h-[100svh] min-h-[100svh] w-full overflow-hidden text-slate-900 sm:h-screen sm:min-h-screen">
      <div
        className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#eef2f7_45%,_#e8edf5_100%)]"
        aria-hidden
      />
      <div className="relative z-10 chat-fade mx-auto flex h-full max-w-6xl flex-col px-3 py-4 min-h-0 sm:px-4 sm:py-6">
        <div className="flex h-full min-h-0 flex-col gap-4 md:grid md:grid-cols-[280px_1fr] md:grid-rows-none">
        <div
          className={`chat-rise relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-b border-slate-200/70 bg-white shadow-none md:rounded-[28px] md:border md:border-slate-200/80 md:bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f6f8fc_45%,_#eef2f8_100%)] md:shadow-[0_18px_40px_rgba(15,23,42,0.08)] max-md:order-1 ${
            showListMobile ? "flex" : "hidden"
          } md:flex`}
          style={{ animationDelay: "40ms" }}
        >
          <div className="sticky top-0 z-10 flex items-center border-b border-slate-200/70 bg-white px-4 py-3 md:bg-white/80 md:backdrop-blur">
            <button
              className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
              onClick={() => (window.location.href = "/explore")}
              aria-label="返回邂逅"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 5 8 12l7 7" />
              </svg>
            </button>
            <div className="flex-1 text-center text-base font-semibold text-slate-800">对话列表</div>
            <div className="h-9 w-9">
              {selfAvatar && (
                <div
                  className="h-9 w-9 rounded-full border border-slate-200 bg-slate-100"
                  style={{
                    backgroundImage: `url(${selfAvatar})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  aria-hidden
                />
              )}
            </div>
          </div>
          <div
            ref={chatListRef}
            className="min-h-0 flex-1 overflow-y-auto"
            onScroll={(e) => {
              const el = e.currentTarget;
              const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
              if (nearBottom) loadMoreChats();
            }}
          >
            {loadingChats ? (
              <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                载入中...
              </div>
            ) : chats.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                暂无对话
              </div>
            ) : (
              <div style={{ height: chatListVirtualizer.getTotalSize(), position: "relative" }}>
                {chatListVirtualizer.getVirtualItems().map((virtualRow) => {
                  const c = chats[virtualRow.index];
                  if (!c) return null;
                  const active = currentChat?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <button
                        onClick={() => {
                          setCurrentChatId(c.id);
                          setShowListMobile(false);
                          activatedChatsRef.current.add(c.id);
                          if (userIdRef.current) {
                            localStorage.setItem(`chat_last_active_${userIdRef.current}`, String(c.id));
                          } else {
                            const guestToken = getGuestToken();
                            if (guestToken) {
                              localStorage.setItem(`chat_last_active_guest_${guestToken}`, String(c.id));
                            }
                          }
                          const authHeaders = getAuthHeaders();
                          if (authHeaders) {
                            fetch(`${API_BASE}/api/chats/${c.id}/read`, {
                              method: "POST",
                              headers: safeHeaders(authHeaders),
                            }).catch(() => {});
                            setChats((prev) => prev.map((x) => (x.id === c.id ? { ...x, unread_count: 0 } : x)));
                          }
                        }}
                        className={`block w-full border-b border-slate-200/60 px-4 py-3 text-left transition ${
                          active ? "md:bg-[#eef5ff]" : ""
                        } hover:bg-slate-50`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="h-12 w-12 flex-shrink-0 rounded-full border border-slate-200 bg-slate-100"
                            style={
                              c.partner_avatar
                                ? {
                                    backgroundImage: `url(${c.partner_avatar})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                  }
                                : undefined
                            }
                          />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-[15px] font-semibold text-slate-900 truncate">{c.partner_name}</div>
                            {c.guest_expired && (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                已过期
                              </span>
                            )}
                          </div>
                          <div className="text-[13px] text-slate-500 line-clamp-1">{c.last_message || "暂无消息"}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[11px] text-slate-400">{formatChatTime(c.last_message_at)}</span>
                          {c.unread_count ? (
                            <span className="min-w-[20px] rounded-full bg-[#2f7cf6] px-2 py-0.5 text-center text-[11px] font-semibold text-white shadow-sm">
                              {c.unread_count}
                            </span>
                          ) : null}
                          {c.guest_expired && (
                            <button
                              className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 hover:bg-rose-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                const headers = getAuthHeaders();
                                if (!headers) return;
                                if (!confirm("确认删除该对话吗？")) return;
                                fetch(`${API_BASE}/api/chats/${c.id}`, {
                                  method: "DELETE",
                                  headers,
                                })
                                  .then(async (res) => {
                                    if (!res.ok) {
                                      const data = await res.json().catch(() => ({}));
                                      throw new Error(data.error || "删除失败");
                                    }
                                    setChats((prev) => prev.filter((x) => x.id !== c.id));
                                    if (currentChatIdRef.current === c.id) {
                                      setMessages([]);
                                      setCurrentChatId(null);
                                    }
                                  })
                                  .catch((err) => alert(err.message || "删除失败"));
                              }}
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                );
                })}
              </div>
            )}
            {chatListLoadingMore && (
              <div className="px-4 py-2 text-center text-xs text-slate-500">加载更多...</div>
            )}
          </div>
        </div>

        <div
          className={`chat-rise grid min-h-0 flex-1 grid-rows-[auto_1fr_auto] gap-3 rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,#f9fbff_0%,#f1f5fb_100%)] p-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-4 md:rounded-[28px] max-md:order-2 ${
            showListMobile ? "hidden" : "grid"
          } md:grid`}
          style={{ animationDelay: "80ms" }}
        >
          <header className="relative flex items-center justify-center">
            <button
              className="absolute left-0 grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 md:hidden"
              onClick={() => setShowListMobile(true)}
              aria-label="返回对话列表"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 5 8 12l7 7" />
              </svg>
            </button>
            {currentChat ? (
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full border border-slate-200 bg-slate-100 sm:h-12 sm:w-12"
                  style={
                    currentChat.partner_avatar
                      ? {
                          backgroundImage: `url(${currentChat.partner_avatar})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                />
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">{currentChat.partner_name}</h3>
                  <p className="mt-1 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                        partnerOnline === false
                          ? "bg-slate-100 text-slate-500"
                          : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${partnerOnline === false ? "bg-slate-400" : "bg-emerald-500"}`}
                        aria-hidden
                      />
                      {partnerOnline === false ? "离线" : "在线"}
                    </span>
                    {currentChat.guest_expired && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                        已过期
                      </span>
                    )}
                    {socketStatus !== "connected" && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                          socketStatus === "reconnecting" || socketStatus === "connecting"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            socketStatus === "reconnecting" || socketStatus === "connecting"
                              ? "bg-amber-500"
                              : "bg-slate-400"
                          }`}
                          aria-hidden
                        />
                        {socketStatus === "reconnecting"
                          ? "重连中"
                          : socketStatus === "connecting"
                          ? "连接中"
                          : "已断开"}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <h3 className="text-xl font-semibold text-slate-700">暂无对话</h3>
              </div>
            )}
          </header>
          <div
            ref={listRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.scrollTop <= 10 && hasMore && !loadingMore) {
                loadMore();
              }
            }}
            className="scroll-thin min-h-0 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200/70 bg-white/90 p-2 text-slate-900 shadow-inner sm:p-3"
          >
            {currentChat?.guest_expired && (
              <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                该对话已过期，无法继续发送消息。
                <button
                  className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm"
                  onClick={deleteExpiredChat}
                >
                  删除对话
                </button>
              </div>
            )}
            {loadingMore && (
              <div className="text-center text-xs text-slate-500">加载更多...</div>
            )}
            {currentChatId === null ? (
              <div className="grid place-items-center h-full text-sm font-semibold text-slate-500">
                暂无对话
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full w-full flex-col gap-3 p-4 animate-pulse">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-10 rounded-2xl bg-slate-100 ${i % 2 === 0 ? "w-3/4 self-start" : "w-2/3 self-end"}`}
                  />
                ))}
              </div>
            ) : (
              messages.map((m, idx) => {
                const isSelf = m.sender_id === userId;
                const avatarUrl = isSelf ? selfAvatar : currentChat?.partner_avatar;
                return (
                  <div
                    key={m.id ?? idx}
                    className={`flex w-full items-end gap-2 ${isSelf ? "justify-end" : "justify-start"} pb-2`}
                  >
                    {!isSelf && (
                      <div
                        className="h-6 w-6 rounded-full border border-slate-200 bg-slate-100 sm:h-7 sm:w-7"
                        style={
                          avatarUrl
                            ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                            : undefined
                        }
                        aria-hidden
                      />
                    )}
                    <div
                      className={`w-fit max-w-[86%] border px-3 py-2 text-[12px] leading-tight sm:max-w-[82%] sm:text-[13px] ${
                        isSelf
                          ? "border-[#a6d4ff] bg-[#d9f1ff] text-slate-900"
                          : "border-slate-200 bg-white text-slate-900"
                      }`}
                      style={{
                        boxShadow: isSelf ? "2px 2px 0 rgba(0,0,0,0.08)" : "1px 1px 0 rgba(0,0,0,0.05)",
                        borderRadius: isSelf ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      }}
                    >
                      {m.image_url ? (
                        <div className="flex flex-col gap-1">
                          <img
                            src={m.image_url}
                            alt="发送的图片"
                            className="max-h-44 max-w-[180px] rounded-xl object-cover sm:max-h-48 sm:max-w-[220px]"
                            onLoad={() => {
                              scheduleScrollToBottom();
                            }}
                          />
                          <span className="text-[11px] text-slate-500 text-right">
                            {formatChatTime(m.created_at) || formatTimeNow()}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-end gap-2">
                          <span className="whitespace-pre-wrap break-words">{m.content}</span>
                          <span className="text-[11px] text-slate-500">
                            {formatChatTime(m.created_at) || formatTimeNow()}
                          </span>
                        </div>
                      )}
                    </div>
                    {isSelf && (
                      <div
                        className="h-6 w-6 rounded-full border border-slate-200 bg-slate-100 sm:h-7 sm:w-7"
                        style={
                          avatarUrl
                            ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                            : undefined
                        }
                        aria-hidden
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2 relative max-md:gap-1.5">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              onPaste={handlePaste}
              rows={1}
              placeholder={currentChat?.guest_expired ? "对话已过期，无法发送" : "说点什么..."}
              className="min-h-[40px] max-h-[128px] w-full resize-none overflow-y-auto rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#9ec3ff] focus:outline-none sm:min-h-[44px] sm:py-3"
              style={{ lineHeight: "1.5" }}
              disabled={currentChat?.guest_expired}
            />
            <button
              aria-label="插入表情"
              onClick={() => setDraft((v) => v + "😊")}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-lg text-slate-600 shadow-sm transition hover:bg-slate-50 sm:h-12 sm:w-12"
              disabled={currentChat?.guest_expired}
            >
              <SmileIcon />
            </button>
            <button
              aria-label="发送图片"
              className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-base text-slate-600 shadow-sm transition hover:bg-slate-50 sm:h-12 sm:w-12"
              onClick={() => imageInputRef.current?.click()}
              disabled={currentChat?.guest_expired}
            >
              <CameraIcon />
            </button>
            <button
              onClick={send}
              disabled={currentChat?.guest_expired}
              className={`rounded-2xl px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(30,111,219,0.25)] transition sm:px-4 sm:py-3 sm:text-base ${
                currentChat?.guest_expired ? "bg-slate-300 cursor-not-allowed" : "bg-[#1e6fdb] hover:brightness-110"
              }`}
            >
              发送
            </button>
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) sendImageFile(file);
            }}
          />
        </div>
        </div>
      </div>
      {guestPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <button
              className="absolute right-4 top-4 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              onClick={() => {
                const key = "guest_chat_started";
                if (typeof window !== "undefined") {
                  localStorage.setItem(key, String(Date.now()));
                }
                const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
                const started = raw ? parseInt(raw, 10) : Date.now();
                scheduleGuestPrompt(started);
                setGuestPromptOpen(false);
              }}
            >
              关闭
            </button>
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600 text-2xl font-extrabold">
              !
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">注册绑定账号</h3>
            <p className="mt-2 text-sm text-slate-600">
              为避免对话丢失，请立即注册绑定账号。
            </p>
            <button
              className="mt-4 w-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400 py-2.5 text-sm font-semibold text-white shadow-lg hover:brightness-110"
              onClick={() => {
                const next = currentChatId ? `/chat?chat_id=${currentChatId}` : "/chat";
                window.location.href = `/register?next=${encodeURIComponent(next)}`;
              }}
            >
              前往注册
            </button>
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes chatFade {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes chatRise {
          0% { opacity: 0; transform: translateY(10px) scale(0.99); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .chat-fade {
          animation: chatFade 0.6s ease both;
        }
        .chat-rise {
          animation: chatRise 0.7s ease both;
        }
        .scroll-thin {
          scroll-behavior: auto;
        }
      `}</style>
    </main>
  );
}

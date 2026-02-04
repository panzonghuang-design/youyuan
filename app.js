const sections = document.querySelectorAll(".panel");
const navButtons = document.querySelectorAll(".nav-btn, .hero-actions button, a[data-target]");

navButtons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const target = btn.dataset.target;
    if (!target) return;
    switchPanel(target);
  });
});

function switchPanel(id) {
  sections.forEach((s) => s.classList.toggle("visible", s.id === id));
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.target === id));
}

// Mock profiles
const profiles = [
  { name: "Luna", age: 25, city: "杭州", vibe: "建筑摄影 · 公路旅行 · 独立音乐" },
  { name: "Ivy", age: 27, city: "深圳", vibe: "潜水 · 露营 · 咖啡拉花" },
  { name: "Mira", age: 24, city: "成都", vibe: "猫咪 · 桌游 · 手冲咖啡" },
  { name: "Jess", age: 29, city: "上海", vibe: "摩登舞 · 艺术展 · 徒步" },
  { name: "Nina", age: 26, city: "北京", vibe: "街舞 · 纪录片 · 深夜食堂" },
  { name: "Suri", age: 30, city: "武汉", vibe: "羽毛球 · 吉他 · 山系穿搭" },
];

const profileGrid = document.getElementById("profileGrid");
profiles.forEach((p) => {
  const div = document.createElement("div");
  div.className = "profile-tile";
  div.innerHTML = `
    <div class="avatar">${p.name.slice(0, 1)}</div>
    <div>
      <h3>${p.name} · ${p.age}</h3>
      <p class="muted">${p.city}</p>
      <p>${p.vibe}</p>
    </div>
    <div class="tags">
      <span>喜欢</span>
      <span>约聊</span>
    </div>
  `;
  profileGrid.appendChild(div);
});

// Mini grid stats
const miniGrid = document.getElementById("miniGrid");
profiles.slice(0, 8).forEach((p) => {
  const tile = document.createElement("div");
  tile.className = "mini-card";
  tile.textContent = p.name.slice(0, 1);
  miniGrid.appendChild(tile);
});

// Range labels
const distanceRange = document.querySelector('input[type="range"][min="1"]');
const ageRange = document.querySelector('input[type="range"][min="18"]');
const distanceLabel = document.getElementById("distanceLabel");
const ageLabel = document.getElementById("ageLabel");

distanceRange.addEventListener("input", () => (distanceLabel.textContent = `${distanceRange.value} km`));
ageRange.addEventListener("input", () => (ageLabel.textContent = ageRange.value));

// Chat mock
const chats = [
  { with: "Luna", last: "今晚有空去看看展吗？", messages: [
    { from: "Luna", text: "嘿，你也喜欢建筑摄影？", time: "19:12" },
    { from: "Me", text: "是的！最近在拍老城的线条感。", time: "19:14" },
    { from: "Luna", text: "今晚有空去看看展吗？", time: "19:16" },
  ]},
  { with: "Ivy", last: "期待下一次咖啡拉花比拼。", messages: [
    { from: "Ivy", text: "周末去潜水课吗？", time: "10:02" },
    { from: "Me", text: "报名了！", time: "10:04" },
    { from: "Ivy", text: "期待下一次咖啡拉花比拼。", time: "10:05" },
  ]},
];

const chatList = document.getElementById("chatList");
const messagesEl = document.getElementById("messages");
const chatTitle = document.getElementById("chatTitle");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
let currentChat = null;

chats.forEach((c, idx) => {
  const item = document.createElement("div");
  item.className = "chat-item";
  item.innerHTML = `<strong>${c.with}</strong><span class="muted">${c.last}</span>`;
  item.addEventListener("click", () => openChat(idx, item));
  chatList.appendChild(item);
  if (idx === 0) openChat(idx, item); // open first by default
});

function openChat(index, item) {
  document.querySelectorAll(".chat-item").forEach((i) => i.classList.remove("active"));
  item.classList.add("active");
  currentChat = chats[index];
  chatTitle.textContent = currentChat.with;
  renderMessages();
}

function renderMessages() {
  messagesEl.innerHTML = "";
  if (!currentChat) return;
  currentChat.messages.forEach((m) => {
    const b = document.createElement("div");
    b.className = "bubble" + (m.from === "Me" ? " me" : "");
    b.innerHTML = `${m.text}<span class="meta">${m.time}</span>`;
    messagesEl.appendChild(b);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => e.key === "Enter" && sendMessage());

function sendMessage() {
  if (!currentChat) return;
  const text = messageInput.value.trim();
  if (!text) return;
  currentChat.messages.push({ from: "Me", text, time: "现在" });
  messageInput.value = "";
  renderMessages();
}

export type Profile = {
  name: string;
  age: number;
  city: string;
  vibe: string;
  personality: string;
  hobby: string;
  photo: string;
};

export type Chat = {
  with: string;
  last: string;
  photo?: string;
  messages: { from: "Me" | "Ta"; text?: string; image?: string; time: string }[];
};

export const photoPool = [
  "/avatars/image1.png",
  "/avatars/image2.png",
  "/avatars/image3.png",
  "/avatars/image4.png",
  "/avatars/image5.png",
  "/avatars/image6.png",
  "/avatars/image7.png",
  "/avatars/image8.png",
  "/avatars/image9.png",
  "/avatars/image10.png",
  "/avatars/image11.png",
  "/avatars/image12.png",
  "/avatars/image13.png",
  "/avatars/amage14.png",
  "/avatars/image15.png",
];

const nameList = [
  "林清岚",
  "王晓语",
  "陈一然",
  "苏璃",
  "周芷晴",
  "顾若彤",
  "Ava Chen",
  "Chloe Li",
  "Mia Zhang",
  "Emma Zhao",
  "Lily Guo",
  "Isabella Wei",
  "Sophia Tang",
  "Grace Zhou",
  "Hannah Qiu",
];

const vibeList = [
  "音乐 · 旅行 · 咖啡",
  "徒步 · 露营 · 观星",
  "美食 · 电影 · 桌游",
  "摄影 · 城市漫游",
  "跑步 · 潜水 · 瑜伽",
];
const personalityList = ["乐观开朗", "安静克制", "外冷内热", "直率真诚", "慢热但真诚"];
const hobbyList = ["手冲咖啡、livehouse", "公路骑行、胶片摄影", "夜跑、展览打卡", "桌游、拍vlog", "自由潜、水彩画"];
const cityList = ["上海", "北京", "深圳", "杭州", "成都", "广州", "台北", "东京", "首尔", "新加坡"];

export const profiles: Profile[] = nameList.slice(0, photoPool.length).map((name, idx) => ({
  name,
  age: 22 + (idx % 8),
  city: cityList[idx % cityList.length],
  vibe: vibeList[idx % vibeList.length],
  personality: personalityList[idx % personalityList.length],
  hobby: hobbyList[idx % hobbyList.length],
  photo: photoPool[idx],
}));

export const fallbackNamePool = [
  "可乐", "青柚", "米粒", "团团", "软糖", "星河", "晚风", "桃夭", "欢颜", "夏沫",
  "慕白", "安然", "沐宸", "浅夏", "知意", "林间", "迟迟", "江晚", "清弦", "栀夏",
  "Ivy", "Lena", "Sandy", "Winnie", "Celia", "Doris", "Amber", "Bella", "Daisy", "Fiona",
  "Gina", "Iris", "Jade", "Kayla", "Luna", "Mandy", "Nina", "Olive", "Poppy", "Queenie",
  "Rena", "Suri", "Tina", "Una", "Vera", "Willa", "Yuki", "Zoe", "Mavis", "Dylan",
  "Ada", "Becky", "Cindy", "Elaine", "Gloria", "Hazel", "Joan", "Kitty", "Lacey", "Mira",
];

export const chatsSeed: Chat[] = [
  {
    with: "Luna",
    last: "今晚有空去看看展吗？",
    photo: "/avatars/image1.png",
    messages: [
      { from: "Ta", text: "嘿，你也喜欢建筑摄影？", time: "19:12" },
      { from: "Me", text: "是的！最近在拍老城的线条感。", time: "19:14" },
      { from: "Ta", text: "今晚有空去看看展吗？", time: "19:16" },
    ],
  },
  {
    with: "Ivy",
    last: "期待下一次咖啡拉花比拼。",
    photo: "/avatars/image2.png",
    messages: [
      { from: "Ta", text: "周末去潜水课吗？", time: "10:02" },
      { from: "Me", text: "报名了！", time: "10:04" },
      { from: "Ta", text: "期待下一次咖啡拉花比拼。", time: "10:05" },
    ],
  },
];

export const dialingCodes = [
  "+1", "+7", "+20", "+27", "+30", "+31", "+32", "+33", "+34", "+36", "+39",
  "+40", "+41", "+43", "+44", "+45", "+46", "+47", "+48", "+49",
  "+51", "+52", "+53", "+54", "+55", "+56", "+57", "+58",
  "+60", "+61", "+62", "+63", "+64", "+65", "+66", "+81", "+82", "+84", "+86",
  "+90", "+91", "+92", "+93", "+94", "+95", "+98",
  "+211", "+212", "+213", "+216", "+218",
  "+220", "+221", "+222", "+223", "+224", "+225", "+226", "+227", "+228", "+229",
  "+230", "+231", "+232", "+233", "+234", "+235", "+236", "+237", "+238", "+239", "+240", "+241", "+242", "+243", "+244", "+245", "+246", "+248", "+249",
  "+250", "+251", "+252", "+253", "+254", "+255", "+256", "+257", "+258", "+260", "+261", "+262", "+263", "+264", "+265", "+266", "+267", "+268", "+269",
  "+290", "+291", "+297", "+298", "+299",
  "+350", "+351", "+352", "+353", "+354", "+355", "+356", "+357", "+358", "+359",
  "+370", "+371", "+372", "+373", "+374", "+375", "+376", "+377", "+378", "+380", "+381", "+382", "+383", "+385", "+386", "+387", "+389",
  "+420", "+421", "+423",
  "+500", "+501", "+502", "+503", "+504", "+505", "+506", "+507", "+508", "+509",
  "+590", "+591", "+592", "+593", "+594", "+595", "+596", "+597", "+598", "+599",
  "+670", "+672", "+673", "+674", "+675", "+676", "+677", "+678", "+679", "+680", "+681", "+682", "+683", "+685", "+686", "+687", "+688", "+689", "+690", "+691", "+692",
  "+850", "+852", "+853", "+855", "+856", "+880", "+886",
  "+960", "+961", "+962", "+963", "+964", "+965", "+966", "+967", "+968",
  "+970", "+971", "+972", "+973", "+974", "+975", "+976", "+977",
  "+992", "+993", "+994", "+995", "+996", "+998",
];

export function formatTimeNow() {
  const d = new Date();
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

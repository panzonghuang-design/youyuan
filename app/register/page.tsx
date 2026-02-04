"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormCard, Field, Select } from "../components/ui";
import { dialingCodes } from "../lib/data";
import AvatarUploader from "../components/AvatarUploader";

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [zodiac, setZodiac] = useState("");
  const [phoneCode, setPhoneCode] = useState("+852");
  const [phone, setPhone] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [nationality, setNationality] = useState("🇭🇰 中国香港");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
  const nextParam = searchParams?.get("next");
  const resolveNext = (value: string | null) => {
    if (!value) return null;
    if (!value.startsWith("/") || value.startsWith("//")) return null;
    return value;
  };
  const nextPath = resolveNext(nextParam);

  const deriveNation = (code: string) => {
    const map: Record<string, string> = {
      "+1": "🇺🇸 美国/加拿大",
      "+7": "🇷🇺 俄罗斯/🇰🇿 哈萨克斯坦",
      "+20": "🇪🇬 埃及",
      "+27": "🇿🇦 南非",
      "+30": "🇬🇷 希腊",
      "+31": "🇳🇱 荷兰",
      "+32": "🇧🇪 比利时",
      "+33": "🇫🇷 法国",
      "+34": "🇪🇸 西班牙",
      "+36": "🇭🇺 匈牙利",
      "+39": "🇮🇹 意大利",
      "+40": "🇷🇴 罗马尼亚",
      "+41": "🇨🇭 瑞士",
      "+43": "🇦🇹 奥地利",
      "+44": "🇬🇧 英国",
      "+45": "🇩🇰 丹麦",
      "+46": "🇸🇪 瑞典",
      "+47": "🇳🇴 挪威",
      "+48": "🇵🇱 波兰",
      "+49": "🇩🇪 德国",
      "+51": "🇵🇪 秘鲁",
      "+52": "🇲🇽 墨西哥",
      "+53": "🇨🇺 古巴",
      "+54": "🇦🇷 阿根廷",
      "+55": "🇧🇷 巴西",
      "+56": "🇨🇱 智利",
      "+57": "🇨🇴 哥伦比亚",
      "+58": "🇻🇪 委内瑞拉",
      "+60": "🇲🇾 马来西亚",
      "+61": "🇦🇺 澳大利亚",
      "+62": "🇮🇩 印度尼西亚",
      "+63": "🇵🇭 菲律宾",
      "+64": "🇳🇿 新西兰",
      "+65": "🇸🇬 新加坡",
      "+66": "🇹🇭 泰国",
      "+81": "🇯🇵 日本",
      "+82": "🇰🇷 韩国",
      "+84": "🇻🇳 越南",
      "+86": "🇨🇳 中国",
      "+90": "🇹🇷 土耳其",
      "+91": "🇮🇳 印度",
      "+92": "🇵🇰 巴基斯坦",
      "+93": "🇦🇫 阿富汗",
      "+94": "🇱🇰 斯里兰卡",
      "+95": "🇲🇲 缅甸",
      "+98": "🇮🇷 伊朗",
      "+211": "🇸🇸 南苏丹",
      "+212": "🇲🇦 摩洛哥",
      "+213": "🇩🇿 阿尔及利亚",
      "+216": "🇹🇳 突尼斯",
      "+218": "🇱🇾 利比亚",
      "+220": "🇬🇲 冈比亚",
      "+221": "🇸🇳 塞内加尔",
      "+222": "🇲🇷 毛里塔尼亚",
      "+223": "🇲🇱 马里",
      "+224": "🇬🇳 几内亚",
      "+225": "🇨🇮 科特迪瓦",
      "+226": "🇧🇫 布基纳法索",
      "+227": "🇳🇪 尼日尔",
      "+228": "🇹🇬 多哥",
      "+229": "🇧🇯 贝宁",
      "+230": "🇲🇺 毛里求斯",
      "+231": "🇱🇷 利比里亚",
      "+232": "🇸🇱 塞拉利昂",
      "+233": "🇬🇭 加纳",
      "+234": "🇳🇬 尼日利亚",
      "+235": "🇹🇩 乍得",
      "+236": "🇨🇫 中非",
      "+237": "🇨🇲 喀麦隆",
      "+238": "🇨🇻 佛得角",
      "+239": "🇸🇹 圣多美和普林西比",
      "+240": "🇬🇶 赤道几内亚",
      "+241": "🇬🇦 加蓬",
      "+242": "🇨🇬 刚果（布）",
      "+243": "🇨🇩 刚果（金）",
      "+244": "🇦🇴 安哥拉",
      "+245": "🇬🇼 几内亚比绍",
      "+246": "🇮🇴 英属印度洋领地",
      "+248": "🇸🇨 塞舌尔",
      "+249": "🇸🇩 苏丹",
      "+250": "🇷🇼 卢旺达",
      "+251": "🇪🇹 埃塞俄比亚",
      "+252": "🇸🇴 索马里",
      "+253": "🇩🇯 吉布提",
      "+254": "🇰🇪 肯尼亚",
      "+255": "🇹🇿 坦桑尼亚",
      "+256": "🇺🇬 乌干达",
      "+257": "🇧🇮 布隆迪",
      "+258": "🇲🇿 莫桑比克",
      "+260": "🇿🇲 赞比亚",
      "+261": "🇲🇬 马达加斯加",
      "+262": "🇷🇪 留尼汪/马约特",
      "+263": "🇿🇼 津巴布韦",
      "+264": "🇳🇦 纳米比亚",
      "+265": "🇲🇼 马拉维",
      "+266": "🇱🇸 莱索托",
      "+267": "🇧🇼 博茨瓦纳",
      "+268": "🇸🇿 斯威士兰",
      "+269": "🇰🇲 科摩罗",
      "+297": "🇦🇼 阿鲁巴",
      "+298": "🇫🇴 法罗群岛",
      "+299": "🇬🇱 格陵兰",
      "+350": "🇬🇮 直布罗陀",
      "+351": "🇵🇹 葡萄牙",
      "+352": "🇱🇺 卢森堡",
      "+353": "🇮🇪 爱尔兰",
      "+354": "🇮🇸 冰岛",
      "+355": "🇦🇱 阿尔巴尼亚",
      "+356": "🇲🇹 马耳他",
      "+357": "🇨🇾 塞浦路斯",
      "+358": "🇫🇮 芬兰",
      "+359": "🇧🇬 保加利亚",
      "+370": "🇱🇹 立陶宛",
      "+371": "🇱🇻 拉脱维亚",
      "+372": "🇪🇪 爱沙尼亚",
      "+373": "🇲🇩 摩尔多瓦",
      "+374": "🇦🇲 亚美尼亚",
      "+375": "🇧🇾 白俄罗斯",
      "+376": "🇦🇩 安道尔",
      "+377": "🇲🇨 摩纳哥",
      "+378": "🇸🇲 圣马力诺",
      "+380": "🇺🇦 乌克兰",
      "+381": "🇷🇸 塞尔维亚",
      "+382": "🇲🇪 黑山",
      "+383": "🇽🇰 科索沃",
      "+385": "🇭🇷 克罗地亚",
      "+386": "🇸🇮 斯洛文尼亚",
      "+387": "🇧🇦 波黑",
      "+389": "🇲🇰 北马其顿",
      "+420": "🇨🇿 捷克",
      "+421": "🇸🇰 斯洛伐克",
      "+423": "🇱🇮 列支敦士登",
      "+500": "🇫🇰 福克兰群岛",
      "+501": "🇧🇿 伯利兹",
      "+502": "🇬🇹 危地马拉",
      "+503": "🇸🇻 萨尔瓦多",
      "+504": "🇭🇳 洪都拉斯",
      "+505": "🇳🇮 尼加拉瓜",
      "+506": "🇨🇷 哥斯达黎加",
      "+507": "🇵🇦 巴拿马",
      "+508": "🇵🇲 圣皮埃尔密克隆",
      "+509": "🇭🇹 海地",
      "+590": "🇬🇵 瓜德罗普",
      "+591": "🇧🇴 玻利维亚",
      "+592": "🇬🇾 圭亚那",
      "+593": "🇪🇨 厄瓜多尔",
      "+594": "🇬🇫 法属圭亚那",
      "+595": "🇵🇾 巴拉圭",
      "+596": "🇲🇶 马提尼克",
      "+597": "🇸🇷 苏里南",
      "+598": "🇺🇾 乌拉圭",
      "+599": "🇨🇼/🇧🇶 荷属安的列斯",
      "+670": "🇹🇱 东帝汶",
      "+672": "🇦🇶/诺福克岛",
      "+673": "🇧🇳 文莱",
      "+674": "🇳🇷 瑙鲁",
      "+675": "🇵🇬 巴布亚新几内亚",
      "+676": "🇹🇴 汤加",
      "+677": "🇸🇧 所罗门群岛",
      "+678": "🇻🇺 瓦努阿图",
      "+679": "🇫🇯 斐济",
      "+680": "🇵🇼 帕劳",
      "+681": "🇼🇫 瓦利斯和富图纳",
      "+682": "🇨🇰 库克群岛",
      "+685": "🇼🇸 萨摩亚",
      "+686": "🇰🇮 基里巴斯",
      "+687": "🇳🇨 新喀里多尼亚",
      "+688": "🇹🇻 图瓦卢",
      "+689": "🇵🇫 法属波利尼西亚",
      "+690": "🇹🇰 托克劳",
      "+691": "🇫🇲 密克罗尼西亚",
      "+692": "🇲🇭 马绍尔群岛",
      "+850": "🇰🇵 朝鲜",
      "+852": "🇭🇰 中国香港",
      "+853": "🇲🇴 中国澳门",
      "+855": "🇰🇭 柬埔寨",
      "+856": "🇱🇦 老挝",
      "+880": "🇧🇩 孟加拉国",
      "+886": "🇹🇼 中国台湾",
      "+960": "🇲🇻 马尔代夫",
      "+961": "🇱🇧 黎巴嫩",
      "+962": "🇯🇴 约旦",
      "+963": "🇸🇾 叙利亚",
      "+964": "🇮🇶 伊拉克",
      "+965": "🇰🇼 科威特",
      "+966": "🇸🇦 沙特阿拉伯",
      "+967": "🇾🇪 也门",
      "+968": "🇴🇲 阿曼",
      "+970": "🇵🇸 巴勒斯坦",
      "+971": "🇦🇪 阿联酋",
      "+972": "🇮🇱 以色列",
      "+973": "🇧🇭 巴林",
      "+974": "🇶🇦 卡塔尔",
      "+975": "🇧🇹 不丹",
      "+976": "🇲🇳 蒙古",
      "+977": "🇳🇵 尼泊尔",
      "+992": "🇹🇯 塔吉克斯坦",
      "+993": "🇹🇲 土库曼斯坦",
      "+994": "🇦🇿 阿塞拜疆",
      "+995": "🇬🇪 格鲁吉亚",
      "+996": "🇰🇬 吉尔吉斯斯坦",
      "+998": "🇺🇿 乌兹别克斯坦",
    };
    return map[code] || "🌐 未知国家";
  };

  const dialOptions = [
    "+852",
    "+886",
    ...dialingCodes.filter((c) => c !== "+86" && c !== "+852" && c !== "+886"),
  ];

  const submit = async () => {
    if (loading) return;
    if (!avatarUrl || !name.trim() || !age.trim() || !gender.trim() || !zodiac.trim() || !phone.trim() || !pwd.trim() || !pwd2.trim()) {
      setError("请完整填写所有必填项并上传头像");
      return;
    }
    if (pwd !== pwd2) {
      setError("两次输入的密码不一致");
      return;
    }
    if (!agree) {
      setError("请同意使用协议与隐私声明");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload = {
        phoneCode,
        phone,
        password: pwd,
        name,
        avatarUrl: avatarUrl,
        age: age ? Number(age) : null,
        gender,
        zodiac,
        nationality,
        region: "",
        personality: "",
        hobby: "",
        photos: [],
        guest_token: typeof window !== "undefined" ? localStorage.getItem("guest_token") : null,
      };
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "注册失败");
      if (typeof window !== "undefined") localStorage.setItem("token", data.token);
      if (typeof window !== "undefined") {
        localStorage.removeItem("guest_token");
        localStorage.removeItem("guest_session_started");
        localStorage.removeItem("guest_chat_started");
      }
      setSuccess(true);
      setTimeout(() => router.push(nextPath || "/explore"), 800);
    } catch (e: any) {
      setError(e.message || "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <main className="mx-auto max-w-2xl px-3 pb-10 pt-8 space-y-6 sm:px-4 sm:pb-12 sm:pt-10">
        <div className="flex flex-col items-center gap-4">
          <FormCard title="注册缘遇" subtitle="填写基本信息，开启你的缘分旅程" cta={loading ? "创建中..." : "创建账号"} onSubmit={submit}>
          <div className="flex justify-center">
            <AvatarUploader
              value={avatarUrl}
              onChange={(url) => {
                setAvatarUrl(url);
              }}
              uploadEndpoint={`${API_BASE}/api/register/avatar`}
              requireAuth={false}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="昵称" type="text" placeholder="取一个让人记住的名字" labelClass="text-[#2f2a2a] font-bold" inputClass="border-[#f3d4e8] placeholder:text-[#b380b0]" value={name} onChange={(e) => setName(e.target.value)} />
            <Field label="年龄" type="number" labelClass="text-[#2f2a2a] font-bold" inputClass="border-[#f3d4e8] placeholder:text-[#b380b0]" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="性别"
              options={["", "男", "女", "其他"]}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              labelClass="text-[#2f2a2a] font-bold"
              selectClass="border-[#f3d4e8] bg-white text-[#2f2a2a]"
            />
            <Select
              label="星座"
              options={["","♈ 白羊座","♉ 金牛座","♊ 双子座","♋ 巨蟹座","♌ 狮子座","♍ 处女座","♎ 天秤座","♏ 天蝎座","♐ 射手座","♑ 摩羯座","♒ 水瓶座","♓ 双鱼座"]}
              value={zodiac}
              onChange={(e) => setZodiac(e.target.value)}
              labelClass="text-[#2f2a2a] font-bold"
              selectClass="border-[#f3d4e8] bg-white text-[#2f2a2a]"
            />
          </div>
          <div className="grid gap-2 text-sm text-muted">
            <span className="text-[#2f2a2a] font-bold">手机号</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative w-full sm:w-32">
                <select
                  value={phoneCode}
                  onChange={(e) => {
                    setPhoneCode(e.target.value);
                    setNationality(deriveNation(e.target.value));
                  }}
                  className="w-full h-[44px] appearance-none rounded-2xl border border-[#f3d4e8] bg-white px-3 pr-8 text-base font-semibold text-[#2f2a2a] focus:border-accent focus:outline-none"
                >
                  {dialOptions.map((c) => (
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
          <Field label="创建登录密码" type="password" placeholder="请输入密码" labelClass="text-[#2f2a2a] font-bold" inputClass="border-[#f3d4e8] placeholder:text-[#b380b0] h-[44px] py-2.5" value={pwd} onChange={(e) => setPwd(e.target.value)} />
          <Field label="确认登录密码" type="password" placeholder="请再次输入密码" labelClass="text-[#2f2a2a] font-bold" inputClass="border-[#f3d4e8] placeholder:text-[#b380b0] h-[44px] py-2.5" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
          <label className="flex items-center justify-center gap-2 text-sm text-[#2f2a2a] font-semibold">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="h-4 w-4 rounded border border-[#f3d4e8] text-[#ff6ba6] focus:ring-[#ff6ba6]"
            />
            <span>
              注册即同意{" "}
              <button type="button" className="text-[#ff6ba6] font-bold underline underline-offset-4" onClick={() => router.push("/agreements")}>
                《使用协议》
              </button>{" "}
              与{" "}
              <button type="button" className="text-[#ff6ba6] font-bold underline underline-offset-4" onClick={() => router.push("/agreements")}>
                《隐私声明》
              </button>
            </span>
          </label>
          <p className="text-sm text-[#7a4a7c] font-semibold text-center">
            已有账号？{" "}
            <button className="text-[#ff6ba6] font-extrabold underline underline-offset-4" onClick={() => router.push("/login")}>
              直接登录
            </button>
          </p>
          {error && <p className="text-center text-sm text-red-500 font-semibold">{error}</p>}
        </FormCard>
      </div>
    </main>
    {success && (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm">
        <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-semibold text-emerald-700 shadow-xl">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white text-base">✔</span>
          <span>注册成功</span>
        </div>
      </div>
    )}
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}

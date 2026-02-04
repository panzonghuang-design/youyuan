import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "缘遇 · 心动社交",
  description: "面向认真的心动匹配，Next.js + Tailwind 驱动的缘遇体验。",
  icons: {
    icon: "/avatars/zhandian.png",
    apple: "/avatars/zhandian.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="relative min-h-screen bg-transparent text-text">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="orb -left-24 -top-28 h-[520px] w-[520px] bg-[#ffd4e8]" />
          <div className="orb -right-32 -bottom-40 h-[560px] w-[560px] bg-[#ffc3a6] opacity-70" />
          <div className="orb left-1/2 top-1/3 h-[480px] w-[480px] bg-[#ff9dd4] opacity-55" />
        </div>
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}

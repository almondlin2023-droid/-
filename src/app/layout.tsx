import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/*
 * Geist — Premium / Creative 风格首选 (per Taste-Skill typography)
 * 正文用 Geist Sans，数字/代码用 Geist Mono
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "光伏健康诊断工具 — PV Health Diagnostic",
  description:
    "通用的、低门槛的光伏电站健康诊断工具。上传逆变器数据，AI 自动识别字段并适配任意品牌格式，输出完整的电站健康评估报告。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /*
     * ClerkProvider — 托管认证，所有子组件可通过 useAuth() / useUser() 访问用户状态
     * TooltipProvider — shadcn/ui Tooltip 组件的前置依赖
     * Toaster — 全局 toast 通知 (sonner)，任何组件可通过 toast() 触发
     */
    <ClerkProvider>
      <html
        lang="zh-CN"
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <body className="min-h-dvh flex flex-col bg-zinc-50 text-zinc-900">
          <TooltipProvider>
            {children}
            <Toaster richColors closeButton />
          </TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

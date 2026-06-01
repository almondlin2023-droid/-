/**
 * 认证路由组布局
 *
 * Clerk 管理的登录/注册页面使用统一的居中卡片布局。
 * 不显示侧边栏和顶部导航——仅展示品牌信息 + 认证表单。
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "登录 — 光伏健康诊断工具",
  description: "登录或注册账号以使用光伏健康诊断工具",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50">
      {/* 品牌区 */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          光伏健康诊断工具
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          PV Health Diagnostic
        </p>
      </div>
      {children}
    </div>
  );
}

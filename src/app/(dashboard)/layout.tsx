/**
 * Dashboard 路由组布局
 *
 * 所有 (dashboard) 下的页面（电站管理、诊断任务、报告中心）共享此布局：
 * - 左侧：AppSidebar 固定导航
 * - 右侧：页面内容区（顶栏 + 主内容）
 *
 * Clerk 认证由 middleware.ts 保护，未登录用户会被重定向到登录页
 */

import { AppSidebar } from "@/components/layout/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden">
      {/* 左侧固定导航 */}
      <AppSidebar />

      {/* 右侧内容区：垂直滚动 */}
      <main className="flex-1 overflow-y-auto bg-zinc-50">
        <div className="mx-auto max-w-6xl px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

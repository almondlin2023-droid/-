"use client";

/**
 * 应用侧边栏导航
 * 提供电站管理、诊断任务、报告中心三个主要导航入口
 * 底部显示当前登录用户信息
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import {
  Building2,
  ClipboardList,
  FileText,
  Zap,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 导航菜单项定义
const navItems = [
  {
    icon: Building2,
    label: "电站管理",
    href: "/stations",
    description: "管理电站配置与子场站",
  },
  {
    icon: ClipboardList,
    label: "诊断任务",
    href: "/tasks",
    description: "查看诊断任务与进度",
  },
  {
    icon: FileText,
    label: "报告中心",
    href: "/reports",
    description: "查看历史诊断报告",
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    /*
     * 侧边栏结构：
     * - 顶部 Logo：品牌标识 + 产品名称
     * - 中部导航：三个核心功能入口，当前选中项高亮
     * - 底部用户区：用户头像 + 姓名 + Clerk 登出
     */
    <aside className="sticky top-0 flex h-dvh w-64 shrink-0 flex-col border-r border-zinc-200 bg-white">
      {/* Logo 区域 */}
      <div className="flex h-14 items-center gap-2.5 border-b border-zinc-200 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold tracking-tight">
          光伏健康诊断
        </span>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                // 基础样式：圆角 + 过渡动画
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                // 激活态：深色背景 + 深色文字
                isActive
                  ? "bg-zinc-100 text-zinc-900 font-medium"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-zinc-900" : "text-zinc-400"
                )}
              />
              <div className="flex flex-col leading-none">
                <span>{item.label}</span>
                <span className="text-[11px] text-zinc-400">
                  {item.description}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* 底部：电站切换器 + 用户信息 */}
      <div className="border-t border-zinc-200 px-3 py-3 space-y-3">
        {/* 快捷切换电站下拉 — 后续迭代实现 */}
        <button className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700">
          <ArrowLeftRight className="h-3.5 w-3.5" />
          <span className="truncate">选择电站...</span>
        </button>

        {/* 用户信息 */}
        <div className="flex items-center gap-3 rounded-lg px-1 py-1">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-7 w-7",
              },
            }}
          />
          <div className="flex flex-col overflow-hidden text-xs">
            <span className="truncate font-medium text-zinc-700">
              {user?.fullName || user?.primaryEmailAddress?.emailAddress || "用户"}
            </span>
            <span className="truncate text-zinc-400">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

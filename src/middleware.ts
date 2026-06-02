import { clerkMiddleware } from "@clerk/nextjs/server";

/*
 * 认证中间件 — 当前版本（V1）无需登录，全站公开。
 *
 * 保留 `clerkMiddleware` 基础挂载以避免移除后触发大量 import 变更。
 * 恢复认证时取消下方注释，并还原 route matcher + auth.protect() 逻辑。
 *
 * 原逻辑参考: PRD §7.2 + commit 4176d79
 */

export default clerkMiddleware(async () => {
  // V1: 全站公开，不做登录拦截
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

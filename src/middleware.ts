import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Clerk 认证中间件
 *
 * 保护所有 Dashboard 和诊断流程页面，强制未登录用户跳转到登录页。
 * 首页和认证页面（登录/注册）对公众开放。
 *
 * PRD §7.2 安全设计：全站 HTTPS + Clerk JWT 鉴权 + Supabase RLS
 */

// 公开路由：无需登录即可访问
const isPublicRoute = createRouteMatcher([
  "/",                          // 首页（产品介绍）
  "/sign-in(.*)",               // Clerk 登录页
  "/sign-up(.*)",               // Clerk 注册页
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - Static assets (.svg, .png, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

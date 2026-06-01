/**
 * 数据访问层
 *
 * 优先查询 Supabase，环境变量未配置时自动回退到 mock 数据。
 * 技术架构 §4.1：BFF 层以 service_role 访问 Supabase。
 */
import { getSupabaseAdmin } from "@/lib/supabase-server";

/** 检测 Supabase 是否已配置 */
export function hasSupabaseConfig(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co" &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== "your-service-role-key"
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = any;

/** 获取 Supabase client（未配置时返回 null） */
export function getDB(): AnyDB | null {
  if (!hasSupabaseConfig()) return null;
  return getSupabaseAdmin();
}

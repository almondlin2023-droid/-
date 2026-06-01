/**
 * 服务端 Supabase Client
 *
 * 使用 Service Role Key 绕过 RLS，由 Clerk auth() 在 API 路由中进行权限检查。
 * 技术架构 §4.1：BFF 层验证 Clerk JWT 后，以 service_role 访问 Supabase。
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let _client: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _client;
}

/**
 * 登录页 — V1 免登录，直接重定向到 Dashboard。
 * 恢复认证时删除此文件，从 git 历史还原原有 Clerk SignIn 组件。
 */

import { redirect } from "next/navigation";

export default function SignInPage() {
  redirect("/stations");
}

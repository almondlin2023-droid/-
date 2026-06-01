/**
 * 注册页
 *
 * Clerk 托管的注册 UI。使用 @clerk/nextjs 的 SignUp 组件。
 * 新用户注册后自动跳转到 Dashboard。
 */

"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <SignUp
      appearance={{
        elements: {
          rootBox: "mx-auto w-full max-w-sm",
          card: "rounded-xl border border-zinc-200 shadow-lg bg-white p-0",
          headerTitle: "text-lg font-semibold text-zinc-900",
          headerSubtitle: "text-sm text-zinc-500",
          formButtonPrimary: "bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg",
          footerAction: "text-xs text-zinc-500",
          formFieldInput: "rounded-lg border-zinc-200",
          dividerRow: "border-zinc-100",
        },
      }}
    />
  );
}

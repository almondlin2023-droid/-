/**
 * 登录页
 *
 * Clerk 托管的登录 UI。使用 @clerk/nextjs 的 SignIn 组件，
 * 支持邮箱/密码、社交登录（Google/GitHub）等，完全托管无需自建。
 */

"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn
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

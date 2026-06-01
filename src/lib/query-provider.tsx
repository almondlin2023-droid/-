"use client";

/**
 * TanStack Query Provider
 *
 * 技术架构 §1.1：前端使用 TanStack Query 管理服务端状态。
 * 提供缓存、自动重新获取、乐观更新等能力。
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,        // 30s 内视为新鲜，不重新请求
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

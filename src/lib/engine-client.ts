/**
 * 服务端 Engine API 客户端
 *
 * BFF 层通过此模块调用 engine FastAPI 后端。
 * 引擎不可用时（连接拒绝/超时）返回 null，调用方回退到 mock 数据。
 * 引擎可用但返回业务错误时（404/409）透传错误响应。
 */
const ENGINE_API_URL =
  process.env.NEXT_PUBLIC_ENGINE_API_URL || "http://localhost:8000";

const ENGINE_TIMEOUT_MS = 10_000; // 10s 超时

interface EngineSuccess {
  data: unknown;
  total?: number;
  meta?: unknown;
}

interface EngineError {
  error: string;
  status: number;
}

type EngineResult = EngineSuccess | EngineError | null;

/**
 * 调用 engine API，失败时返回 null（触发 mock 回退）
 */
export async function callEngine(
  path: string,
  token: string | null,
  options: { method?: string; body?: unknown } = {},
): Promise<EngineResult> {
  if (!token) return null; // 无令牌 → 回退到 mock

  const { method = "GET", body } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ENGINE_TIMEOUT_MS);

  try {
    const res = await fetch(`${ENGINE_API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const detail: string = json?.detail ?? `Engine error: ${res.status}`;
      return { error: detail, status: res.status };
    }

    return json as EngineSuccess;
  } catch {
    clearTimeout(timeoutId);
    return null; // 引擎不可用 → 回退到 mock
  }
}

/**
 * 检查引擎是否可用（用于健康检测）
 */
export async function isEngineAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${ENGINE_API_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 电站列表 API
 *
 * GET  /api/v1/stations      — 电站列表
 * POST /api/v1/stations      — 创建电站
 *
 * 技术架构 §4.1：BFF 层接收前端请求，验证 Clerk 认证后转发引擎 API。
 * V1 阶段直接返回模拟数据，对接引擎后替换为 fetch() 调用。
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MOCK_STATIONS, MOCK_SUB_STATIONS } from "@/lib/mock-data";

/**
 * GET /api/v1/stations
 * 获取当前用户的电站列表，可选筛选状态
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let stations = [...MOCK_STATIONS];
  if (status) {
    stations = stations.filter((s) => s.status === status);
  }

  // 附带子场站数量
  const enriched = stations.map((s) => ({
    ...s,
    sub_count: MOCK_SUB_STATIONS[s.id]?.length ?? 0,
  }));

  // TODO: 替换为真实引擎调用
  // const res = await fetch(`${ENGINE_API_URL}/api/v1/stations`, { headers: { Authorization: `Bearer ${token}` } });
  // return NextResponse.json(await res.json());

  return NextResponse.json({ data: enriched, total: enriched.length });
}

/**
 * POST /api/v1/stations
 * 创建新电站（含子场站）
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await request.json();

  // TODO: 替换为真实引擎调用
  const newStation = {
    id: `st-${Date.now()}`,
    owner_id: userId,
    status: "active" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...body,
  };

  return NextResponse.json({ data: newStation }, { status: 201 });
}

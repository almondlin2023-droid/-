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
import { getDB } from "@/lib/data-access";

/**
 * GET /api/v1/stations
 * 获取当前用户的电站列表，可选筛选状态
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const db = getDB();
  if (db) {
    let query = db.from("stations").select("*").eq("owner_id", userId);
    if (status) query = query.eq("status", status);
    const { data: stations, error } = await query;
    if (!error && stations) {
      // 附带子场站数量
      const enriched = await Promise.all(
        stations.map(async (s: Record<string, unknown>) => {
          const { count } = await db.from("sub_stations")
            .select("*", { count: "exact", head: true })
            .eq("station_id", s.id as string);
          return { ...s, sub_count: count ?? 0 };
        })
      );
      return NextResponse.json({ data: enriched, total: enriched.length });
    }
  }

  // 回退到 mock 数据
  let stations = [...MOCK_STATIONS];
  if (status) {
    stations = stations.filter((s) => s.status === status);
  }
  const enriched = stations.map((s) => ({
    ...s,
    sub_count: MOCK_SUB_STATIONS[s.id]?.length ?? 0,
  }));
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

  const db = getDB();
  if (db) {
    const { data: station, error } = await db.from("stations")
      .insert({
        owner_id: userId,
        name: body.name,
        longitude: body.longitude,
        latitude: body.latitude,
        timezone: body.timezone ?? "Asia/Shanghai",
        resource_zone: body.resource_zone,
        module_type: body.module_type,
        module_power: body.module_power,
        grid_conn_date: body.grid_conn_date,
        grid_voltage: body.grid_voltage,
        feed_in_price: body.feed_in_price,
        module_model: body.module_model,
        temp_coeff: body.temp_coeff,
        status: "active",
      })
      .select()
      .single();
    if (!error && station) {
      return NextResponse.json({ data: station }, { status: 201 });
    }
  }

  // 回退到 mock 数据
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

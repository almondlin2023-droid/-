/**
 * 电站列表 API
 *
 * GET  /api/v1/stations      — 电站列表
 * POST /api/v1/stations      — 创建电站
 *
 * 技术架构 §4.1：BFF 层接收前端请求，验证 Clerk 认证后转发引擎 API。
 * 引擎不可用时回退到 Supabase / mock 数据。
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MOCK_STATIONS, MOCK_SUB_STATIONS } from "@/lib/mock-data";
import { getDB } from "@/lib/data-access";
import { callEngine } from "@/lib/engine-client";

export async function GET(request: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  // 优先调用 engine API
  const token = await getToken();
  const qs = status ? `?status=${status}` : "";
  const engineRes = await callEngine(`/api/v1/stations${qs}`, token);
  if (engineRes) {
    if ("error" in engineRes) {
      return NextResponse.json({ error: engineRes.error }, { status: engineRes.status as number });
    }
    return NextResponse.json(engineRes);
  }

  // 回退: Supabase → mock
  const db = getDB();
  if (db) {
    let query = db.from("stations").select("*").eq("owner_id", userId);
    if (status) query = query.eq("status", status);
    const { data: stations, error } = await query;
    if (!error && stations) {
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

export async function POST(request: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await request.json();

  // 优先调用 engine API
  const token = await getToken();
  const engineRes = await callEngine("/api/v1/stations", token, { method: "POST", body });
  if (engineRes) {
    if ("error" in engineRes) {
      return NextResponse.json({ error: engineRes.error }, { status: engineRes.status as number });
    }
    return NextResponse.json(engineRes, { status: 201 });
  }

  // 回退: Supabase → mock
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

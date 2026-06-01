/**
 * 电站详情 API
 *
 * GET    /api/v1/stations/[id]  — 获取电站详情（含子场站列表）
 * PUT    /api/v1/stations/[id]  — 更新电站
 * DELETE /api/v1/stations/[id]  — 归档电站
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MOCK_STATIONS, MOCK_SUB_STATIONS } from "@/lib/mock-data";
import { getDB } from "@/lib/data-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const db = getDB();
  if (db) {
    const { data: station, error } = await db.from("stations")
      .select("*").eq("id", id).eq("owner_id", userId).single();
    if (!error && station) {
      const { data: subStations } = await db.from("sub_stations")
        .select("*").eq("station_id", id).order("sort_order");
      return NextResponse.json({ data: { ...station, subStations: subStations ?? [] } });
    }
    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: "电站不存在" }, { status: 404 });
    }
  }

  // 回退到 mock 数据
  const station = MOCK_STATIONS.find((s) => s.id === id);
  if (!station) {
    return NextResponse.json({ error: "电站不存在" }, { status: 404 });
  }
  const subStations = MOCK_SUB_STATIONS[id] ?? [];
  return NextResponse.json({ data: { ...station, subStations } });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await request.json();

  const db = getDB();
  if (db) {
    const { data: station, error } = await db.from("stations")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id).eq("owner_id", userId)
      .select().single();
    if (!error && station) {
      return NextResponse.json({ data: station });
    }
    if (error) {
      return NextResponse.json({ error: "电站不存在" }, { status: 404 });
    }
  }

  // 回退到 mock 数据
  const station = MOCK_STATIONS.find((s) => s.id === id);
  if (!station) {
    return NextResponse.json({ error: "电站不存在" }, { status: 404 });
  }
  const updated = { ...station, ...body, id, updated_at: new Date().toISOString() };
  return NextResponse.json({ data: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const db = getDB();
  if (db) {
    const { data: station, error } = await db.from("stations")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id).eq("owner_id", userId)
      .select().single();
    if (!error && station) {
      return NextResponse.json({ data: station });
    }
    if (error) {
      return NextResponse.json({ error: "电站不存在" }, { status: 404 });
    }
  }

  // 回退到 mock 数据
  const station = MOCK_STATIONS.find((s) => s.id === id);
  if (!station) {
    return NextResponse.json({ error: "电站不存在" }, { status: 404 });
  }
  const archived = { ...station, status: "archived" as const, updated_at: new Date().toISOString() };
  return NextResponse.json({ data: archived });
}

/**
 * 电站详情 API
 *
 * GET    /api/v1/stations/[id]  — 获取电站详情（含子场站列表）
 * PUT    /api/v1/stations/[id]  — 更新电站
 * DELETE /api/v1/stations/[id]  — 归档电站
 */

import { NextRequest, NextResponse } from "next/server";
import { MOCK_STATIONS, MOCK_SUB_STATIONS } from "@/lib/mock-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // TODO: Clerk 认证 + 所有权校验

  const station = MOCK_STATIONS.find((s) => s.id === id);
  if (!station) {
    return NextResponse.json({ error: "电站不存在" }, { status: 404 });
  }

  const subStations = MOCK_SUB_STATIONS[id] ?? [];

  // TODO: 替换为真实引擎调用
  return NextResponse.json({ data: { ...station, subStations } });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const station = MOCK_STATIONS.find((s) => s.id === id);
  if (!station) {
    return NextResponse.json({ error: "电站不存在" }, { status: 404 });
  }

  // TODO: 替换为真实引擎调用
  const updated = { ...station, ...body, id, updated_at: new Date().toISOString() };
  return NextResponse.json({ data: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const station = MOCK_STATIONS.find((s) => s.id === id);
  if (!station) {
    return NextResponse.json({ error: "电站不存在" }, { status: 404 });
  }

  // TODO: 替换为真实引擎调用（归档而非物理删除）
  const archived = { ...station, status: "archived" as const, updated_at: new Date().toISOString() };
  return NextResponse.json({ data: archived });
}

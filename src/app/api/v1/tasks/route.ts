/**
 * 诊断任务列表 API
 *
 * GET  /api/v1/tasks  — 获取任务列表（按电站筛选）
 * POST /api/v1/tasks  — 创建诊断任务
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTasksList } from "@/lib/mock-data";
import { getDB } from "@/lib/data-access";
import { callEngine } from "@/lib/engine-client";

export async function GET(request: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get("station_id") ?? undefined;

  // 优先调用 engine API
  const token = await getToken();
  const qs = stationId ? `?station_id=${stationId}` : "";
  const engineRes = await callEngine(`/api/v1/tasks${qs}`, token);
  if (engineRes) {
    if ("error" in engineRes) {
      return NextResponse.json({ error: engineRes.error }, { status: engineRes.status as number });
    }
    return NextResponse.json(engineRes);
  }

  // 回退: Supabase → mock
  const db = getDB();
  if (db) {
    let query = db.from("diagnosis_tasks").select("*").eq("owner_id", userId).order("created_at", { ascending: false });
    if (stationId) query = query.eq("station_id", stationId);
    const { data: tasks, error } = await query;
    if (!error && tasks) {
      return NextResponse.json({ data: tasks, total: tasks.length });
    }
  }

  const tasks = getTasksList(stationId);
  return NextResponse.json({ data: tasks, total: tasks.length });
}

export async function POST(request: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await request.json();

  // 优先调用 engine API
  const token = await getToken();
  const engineRes = await callEngine("/api/v1/tasks", token, { method: "POST", body });
  if (engineRes) {
    if ("error" in engineRes) {
      return NextResponse.json({ error: engineRes.error }, { status: engineRes.status as number });
    }
    return NextResponse.json(engineRes, { status: 201 });
  }

  // 回退: Supabase → mock
  const db = getDB();
  if (db) {
    const { data: task, error } = await db.from("diagnosis_tasks")
      .insert({
        owner_id: userId,
        station_id: body.station_id,
        status: "pending",
        scope: body.scope ?? {},
      })
      .select()
      .single();
    if (!error && task) {
      return NextResponse.json({ data: task }, { status: 201 });
    }
  }

  const newTask = {
    id: `task-${Date.now()}`,
    owner_id: userId,
    status: "pending" as const,
    created_at: new Date().toISOString(),
    ...body,
  };
  return NextResponse.json({ data: newTask }, { status: 201 });
}

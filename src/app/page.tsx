import Link from "next/link";
import { ArrowRight, Zap, BarChart3, FileSearch } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      {/* Hero */}
      <section className="px-6 py-24 md:py-36">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-semibold tracking-tighter leading-none md:text-6xl">
            光伏健康诊断工具
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 md:text-xl">
            上传逆变器导出文件，AI 自动识别字段并适配任意品牌格式，
            输出完整的电站健康评估报告 + 损失分解 + 问题清单 + 优化建议。
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/diagnose/upload"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 active:translate-y-px"
            >
              开始诊断
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/stations"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 active:translate-y-px"
            >
              电站管理
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-200 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
            <div className="flex flex-col gap-3">
              <FileSearch className="h-8 w-8 text-zinc-700" />
              <h3 className="text-lg font-semibold">通用字段识别</h3>
              <p className="text-sm leading-relaxed text-zinc-600">
                AI 驱动的三层识别策略（语义 + 数据画像 + 模式推断），
                不依赖预置品牌模板，适配任意逆变器导出格式。
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <BarChart3 className="h-8 w-8 text-zinc-700" />
              <h3 className="text-lg font-semibold">14 项损失分析</h3>
              <p className="text-sm leading-relaxed text-zinc-600">
                基于 SOLARMAN 损失分析模型，逐项分解电站发电损失：
                阴影、灰尘、脱网、停机、掉串……精准定位到具体设备。
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Zap className="h-8 w-8 text-zinc-700" />
              <h3 className="text-lg font-semibold">零运维部署</h3>
              <p className="text-sm leading-relaxed text-zinc-600">
                Serverless 架构，Git Push 即自动部署。无需管理服务器、
                数据库自动备份、全球 CDN 加速。
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

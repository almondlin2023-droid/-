"use client";

/**
 * 3D 电站模型组件
 *
 * PRD §4.6 可视化引导：渐进式 3D 模型伴随电站配置过程演化。
 * 7 个阶段从空场景到诊断完成后的健康热力图覆盖。
 *
 * 技术栈：React Three Fiber + drei helpers + Three.js
 *
 * 阶段触发条件（PRD §4.6.2）：
 *   0. 空场景 — 未开始配置
 *   1. 选址定位 — 填写经纬度
 *   2. 基础框架 — 填写电站级参数
 *   3. 组件配置 — 填写组件参数
 *   4. 子场站分区 — 创建子场站
 *   5. 设备部署 — 填写逆变器配置
 *   6. 数据接入 — 上传数据
 *   7. 诊断完成 — 报告生成
 */

import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  Environment,
  Text,
  Html,
  Line,
  Sparkles,
} from "@react-three/drei";
import * as THREE from "three";

export interface Station3DProps {
  /** 可视化阶段 (0-7)，对应 PRD §4.6.2 */
  stage: number;
  /** 经度 */
  longitude?: number;
  /** 纬度 */
  latitude?: number;
  /** 子场站列表 */
  subStations?: SubStation3D[];
  /** 是否有诊断结果 */
  hasDiagnosis?: boolean;
  /** 诊断健康分（0-100） */
  healthScore?: number;
  /** 相机控制是否启用 */
  cameraControls?: boolean;
}

export interface SubStation3D {
  id: string;
  name: string;
  dcCapacity: number;   // kWp
  tiltAngle: number;    // 度
  azimuth: number;      // 度
  invCount: number;
  invAcPower: number;
  panelColor?: string;
  healthStatus?: "good" | "warning" | "bad";
}

/** 子场站默认颜色（PRD §4.6.3 分区色块） */
const ZONE_COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899"];

/** 健康状态颜色映射 */
const HEALTH_COLORS = {
  good: "#22C55E",
  warning: "#F59E0B",
  bad: "#EF4444",
};

export default function Station3DCanvas(props: Station3DProps) {
  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden">
      <Canvas
        camera={{ position: [12, 8, 12], fov: 45, near: 0.1, far: 100 }}
        style={{ background: "linear-gradient(180deg, #87CEEB 0%, #E8E8E8 60%, #C8C8C8 100%)" }}
        shadows
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 15, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <hemisphereLight intensity={0.3} />
          <SceneContent {...props} />
          {props.cameraControls !== false && <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.5} />}
          <Environment preset="sunset" />
        </Suspense>
      </Canvas>
    </div>
  );
}

function SceneContent(props: Station3DProps) {
  const { stage, subStations = [], hasDiagnosis, healthScore } = props;
  const groupRef = useRef<THREE.Group>(null);

  // 缓慢自转
  useFrame((_, delta) => {
    if (groupRef.current && stage >= 2) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  // 太阳位置（基于纬度，简化计算）
  const sunPosition = useMemo(() => {
    const lat = (props.latitude ?? 30) * (Math.PI / 180);
    const hourAngle = (12 - 14) * 15 * (Math.PI / 180); // 下午2点
    const declination = 23.45 * (Math.PI / 180); // 夏至近似
    const altitude = Math.asin(
      Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle)
    );
    const r = 15;
    return new THREE.Vector3(
      r * Math.cos(altitude) * Math.sin(hourAngle),
      r * Math.sin(altitude),
      r * Math.cos(altitude) * Math.cos(hourAngle)
    );
  }, [props.latitude]);

  const hasLocation = stage >= 1;
  const hasStation = stage >= 2;
  const hasModules = stage >= 3;
  const hasSubStations = stage >= 4;
  const hasInverters = stage >= 5;
  const hasData = stage >= 6;
  const hasComplete = stage >= 7;

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* ── 地面基座 ── */}
      <Ground stage={stage} />

      {/* ── 阶段 0：脉动光圈（"从这里开始"） ── */}
      {stage === 0 && <PulseRing />}

      {/* ── 阶段 1+：选址标记 + 太阳弧线 ── */}
      {hasLocation && (
        <>
          <LocationMarker position={[0, 0.02, 0]} />
          <SunArc position={sunPosition} />
          <Html position={[0, 1.8, 0]} center>
            <span className="text-[10px] bg-white/80 px-1.5 py-0.5 rounded text-zinc-700 font-mono whitespace-nowrap">
              {props.longitude?.toFixed(4)}, {props.latitude?.toFixed(4)}
            </span>
          </Html>
        </>
      )}

      {/* ── 阶段 2+：电站边界围栏 ── */}
      {hasStation && <PerimeterFence />}

      {/* ── 阶段 3+：光伏面板阵列 ── */}
      {hasModules && !hasSubStations && (
        <PanelArray
          position={[0, 0, 0]}
          tiltAngle={28}
          azimuth={180}
          color="#3B82F6"
          opacity={0.85}
          width={5}
          depth={3}
        />
      )}

      {/* ── 阶段 4+：子场站分区面板 ── */}
      {hasSubStations && subStations.map((sub, i) => {
        const zoneColor = sub.panelColor ?? ZONE_COLORS[i % ZONE_COLORS.length];
        // 根据子场站数量布局（简化：扇形排列）
        const totalSubs = subStations.length;
        const angleOffset = (i - (totalSubs - 1) / 2) * 0.8;
        const dist = totalSubs <= 2 ? 2.5 : totalSubs <= 4 ? 3.5 : 5;
        const posX = Math.sin(angleOffset) * dist;
        const posZ = Math.cos(angleOffset) * dist * 0.7;

        // 健康状态覆盖色
        const healthColor = hasComplete && sub.healthStatus ? HEALTH_COLORS[sub.healthStatus] : undefined;

        return (
          <group key={sub.id}>
            {/* 分区色块底垫 */}
            <mesh position={[posX, 0.01, posZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[2.5, 2]} />
              <meshStandardMaterial
                color={hasComplete ? (healthColor ?? zoneColor) : zoneColor}
                transparent
                opacity={hasComplete ? 0.35 : 0.15}
              />
            </mesh>
            {/* 面板阵列 */}
            <PanelArray
              position={[posX, 0, posZ]}
              tiltAngle={sub.tiltAngle}
              azimuth={sub.azimuth}
              color={zoneColor}
              opacity={hasComplete ? 0.7 : 0.9}
              wireframe={!hasData}
              width={2}
              depth={1.5}
            />
            {/* 分区标签 */}
            <Html position={[posX, 1.2, posZ]} center>
              <span
                className="text-[10px] text-white px-1.5 py-0.5 rounded whitespace-nowrap"
                style={{ backgroundColor: zoneColor }}
              >
                {sub.name}
                {hasComplete && sub.healthStatus === "bad" && " ⚠"}
              </span>
            </Html>
            {/* 逆变器（阶段 5+） */}
            {hasInverters && sub.invCount > 0 && (
              <InverterBoxes
                count={sub.invCount}
                parentPos={[posX, 0, posZ]}
                panelWidth={2}
                panelDepth={1.5}
                azimuth={sub.azimuth}
              />
            )}
          </group>
        );
      })}

      {/* ── 阶段 6+：数据流粒子 ── */}
      {hasData && <DataFlowParticles active={hasData && !hasComplete} />}

      {/* ── 阶段 7：健康评分标注 ── */}
      {hasComplete && healthScore !== undefined && (
        <Html position={[0, 3.5, 0]} center>
          <div className="flex flex-col items-center gap-1">
            <span
              className="text-lg font-bold px-2 py-0.5 rounded"
              style={{
                color: healthScore >= 80 ? HEALTH_COLORS.good : healthScore >= 60 ? HEALTH_COLORS.warning : HEALTH_COLORS.bad,
                backgroundColor: "rgba(255,255,255,0.9)",
              }}
            >
              {healthScore} 分
            </span>
            <span className="text-[10px] text-zinc-500">综合健康评分</span>
          </div>
        </Html>
      )}
    </group>
  );
}

// ── 地面 ──
function Ground({ stage }: { stage: number }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={stage === 0 ? "#F0F0F0" : "#D4C9B5"} />
      </mesh>
      {stage >= 1 && (
        <Grid
          args={[20, 20]}
          position={[0, 0, 0]}
          cellSize={1}
          cellThickness={0.4}
          cellColor="#9CA3AF"
          sectionSize={5}
          sectionThickness={0.8}
          sectionColor="#6B7280"
          fadeDistance={15}
        />
      )}
    </>
  );
}

// ── 脉动光圈（阶段 0） ──
function PulseRing() {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ringRef.current) {
      const t = clock.getElapsedTime();
      const s = 1 + Math.sin(t * 2) * 0.2;
      ringRef.current.scale.setScalar(s);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(t * 2) * 0.2;
    }
  });
  return (
    <group>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <torusGeometry args={[1.5, 0.05, 16, 32]} />
        <meshBasicMaterial color="#3B82F6" transparent opacity={0.4} />
      </mesh>
      <Html position={[0, 0.5, 0]} center>
        <span className="text-xs text-zinc-500 whitespace-nowrap">从这里开始</span>
      </Html>
    </group>
  );
}

// ── 选址标记 ──
function LocationMarker({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.15, 0.15, 0.6, 16]} />
        <meshStandardMaterial color="#EF4444" />
      </mesh>
      <mesh position={[0, -0.35, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#EF4444" emissive="#FF0000" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// ── 太阳弧线 ──
function SunArc({ position }: { position: THREE.Vector3 }) {
  const points: THREE.Vector3[] = [];
  const center = new THREE.Vector3(0, 0, 0);
  const radius = 15;
  for (let i = 0; i < 50; i++) {
    const angle = (i / 49) * Math.PI;
    const y = Math.sin(angle) * radius;
    const horizontal = Math.cos(angle) * radius;
    const x = horizontal * Math.sin(0.5);
    const z = horizontal * Math.cos(0.5);
    points.push(new THREE.Vector3(x, Math.max(y, 0), z));
  }
  return (
    <group>
      <Line points={points} color="#F59E0B" lineWidth={0.5} opacity={0.4} />
      {/* 太阳球 */}
      <mesh position={position}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#FBBF24" emissive="#F59E0B" emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

// ── 电站围栏 ──
function PerimeterFence() {
  const size = 6;
  const halfSize = size / 2;
  const fencePoints = [
    new THREE.Vector3(-halfSize, 0.05, -halfSize),
    new THREE.Vector3(halfSize, 0.05, -halfSize),
    new THREE.Vector3(halfSize, 0.05, halfSize),
    new THREE.Vector3(-halfSize, 0.05, halfSize),
    new THREE.Vector3(-halfSize, 0.05, -halfSize),
  ];
  return (
    <group>
      <Line points={fencePoints} color="#78716C" lineWidth={0.5} />
      {/* 四角小柱 */}
      {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * halfSize, 0.15, sz * halfSize]}>
          <cylinderGeometry args={[0.06, 0.06, 0.3, 8]} />
          <meshStandardMaterial color="#78716C" />
        </mesh>
      ))}
    </group>
  );
}

// ── 光伏面板阵列 ──
function PanelArray({
  position, tiltAngle, azimuth, color, opacity = 1, wireframe = false, width, depth,
}: {
  position: [number, number, number];
  tiltAngle: number;
  azimuth: number;
  color: string;
  opacity?: number;
  wireframe?: boolean;
  width: number;
  depth: number;
}) {
  const rows = 3;
  const cols = 4;
  const panelW = width / (cols + 1);
  const panelD = depth / (rows + 1);

  return (
    <group
      position={position}
      rotation={[0, (azimuth - 180) * (Math.PI / 180), 0]}
    >
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: cols }).map((_, col) => {
          const x = (col - (cols - 1) / 2) * (panelW + 0.1);
          const z = (row - (rows - 1) / 2) * (panelD + 0.1);
          return (
            <group
              key={`${row}-${col}`}
              position={[x, 0, z]}
              rotation={[-(tiltAngle * Math.PI) / 180, 0, 0]}
            >
              <mesh castShadow receiveShadow>
                <boxGeometry args={[panelW * 0.9, 0.04, panelD * 0.9]} />
                <meshStandardMaterial
                  color={color}
                  metalness={0.3}
                  roughness={0.4}
                  transparent
                  opacity={opacity}
                  wireframe={wireframe}
                />
              </mesh>
              {/* 面板边框 */}
              <mesh>
                <boxGeometry args={[panelW * 0.92, 0.01, panelD * 0.92]} />
                <meshStandardMaterial color="#1F2937" metalness={0.8} roughness={0.3} transparent opacity={opacity} />
              </mesh>
            </group>
          );
        })
      )}
      {/* 支架结构 */}
      {Array.from({ length: cols + 1 }).map((_, i) => {
        const x = (i - cols / 2) * (panelW + 0.1);
        return (
          <mesh key={`strut-${i}`} position={[x, -0.25, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
            <meshStandardMaterial color="#9CA3AF" metalness={0.5} roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

// ── 逆变器箱体 ──
function InverterBoxes({
  count, parentPos, panelWidth, panelDepth, azimuth,
}: {
  count: number;
  parentPos: [number, number, number];
  panelWidth: number;
  panelDepth: number;
  azimuth: number;
}) {
  return (
    <group>
      {Array.from({ length: Math.min(count, 4) }).map((_, i) => {
        // 逆变器置于面板阵列边缘
        const angle = (azimuth + 90) * (Math.PI / 180);
        const edgeDist = panelDepth / 2 + 0.5;
        const offsetX = (i - (Math.min(count, 4) - 1) / 2) * 0.5;
        return (
          <mesh
            key={`inv-${i}`}
            position={[
              parentPos[0] + Math.sin(azimuth * Math.PI / 180) * edgeDist + offsetX,
              parentPos[1] + 0.25,
              parentPos[2] + Math.cos(azimuth * Math.PI / 180) * edgeDist,
            ]}
            castShadow
          >
            <boxGeometry args={[0.35, 0.4, 0.2]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.7} roughness={0.3} />
          </mesh>
        );
      })}
    </group>
  );
}

// ── 数据流粒子 ──
function DataFlowParticles({ active }: { active: boolean }) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 200;
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = Math.random() * 4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (!particlesRef.current || !active) return;
    const t = clock.getElapsedTime();
    const pos = particlesRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3 + 1] = (pos[i * 3 + 1] + 0.02) % 4;
      pos[i * 3] += Math.sin(t + i) * 0.005;
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={particleCount}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#60A5FA" size={0.06} transparent opacity={0.6} />
    </points>
  );
}

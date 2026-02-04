"use client"

import { useState, useMemo, useEffect, memo, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Info,
  AlertTriangle,
  CheckCircle2,
  Database,
  XCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

// HBM Stack Configuration
type LayerStatus = "good" | "defect" | "warning"

interface StackLayer {
  id: number
  name: string
  chipUid: string
  type: "DRAM"
  status: LayerStatus
  yield: number
  tsvAlignment: number
  bondingQuality: number
  temperature: number
  chipId?: string
  failureType?: string
  clusterLabel?: number
  dieStatus?: number // 1: Normal, 2: Defect
  tsvMatrix?: number[][]
}

// Generate demo HBM stack data
function generateStackLayers(count: number): StackLayer[] {
  const layers: StackLayer[] = []

  for (let i = count; i >= 1; i--) {
    const rand = Math.random()

    let status: LayerStatus = "good"
    if (rand < 0.05) status = "defect"
    else if (rand < 0.15) status = "warning"

    // 칩 UID 생성 (예: CHIP-2024-001-A1B2C3D4)
    const generateChipUid = (layerId: number) => {
      const prefix = "CHIP-2024-"
      const id = String(layerId).padStart(3, '0')
      const randomHex = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0')
      return `${prefix}${id}-${randomHex}`
    }

    // 데모용 Failure Type 설정
    let failureType = "None"
    let dieStatus = 1
    if (status === "defect") {
      failureType = Math.random() > 0.5 ? "Random" : "Near-full" // 빨간색 테스트용
      dieStatus = 2
    } else if (status === "warning") {
      failureType = "Edge-Ring" // 주황색 테스트용
      dieStatus = 2
    }

    layers.push({
      id: i,
      name: `DRAM ${i}`,
      chipUid: generateChipUid(i),
      type: "DRAM",
      status,
      yield: 94 + Math.random() * 5,
      tsvAlignment: 98 + Math.random() * 2,
      bondingQuality: 96 + Math.random() * 4,
      temperature: 75 + Math.random() * 10,
      failureType,
      dieStatus
    })
  }

  return layers
}

const STACK_LAYERS = 8

// Helper to determine status from failure type
const getStatusFromFailure = (failureType: string): LayerStatus => {
  if (failureType === 'None' || failureType === 'Normal') return 'good';
  // Some minor defects could be warning
  if (['Loc', 'Edge-Loc'].includes(failureType)) return 'warning';
  return 'defect';
}

function createSeededRandom(seed: number) {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function generatePlanarMap(layerId: number, stackIndex: number, size: number = 32, statusArg?: LayerStatus) {
  // If we had real wafer map data, we would use it here.
  // For now, generate consistent map based on status
  const rand = createSeededRandom(layerId * 97 + stackIndex * 997)
  const cells: LayerStatus[] = []

  for (let i = 0; i < size * size; i++) {
    const value = rand()
    // If layer is defect, generates more defect cells
    const defectThreshold = statusArg === 'defect' ? 0.3 : (statusArg === 'warning' ? 0.1 : 0.01)

    if (value < defectThreshold) {
      cells.push("defect")
    } else if (value < defectThreshold + 0.05) {
      cells.push("warning")
    } else {
      cells.push("good")
    }
  }
  return cells
}

// TSV 불량 패턴 생성 함수
function generateTSVDefectMap(layerId: number, stackIndex: number, size: number = 32) {
  const rand = createSeededRandom(layerId * 137 + stackIndex * 997)
  const cells: LayerStatus[] = []

  // TSV 불량은 보통 클러스터링된 패턴으로 나타남
  // 중심부, 가장자리, 특정 영역에 집중되는 경향

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const x = col / size // 0 ~ 1
      const y = row / size // 0 ~ 1
      const centerX = 0.5
      const centerY = 0.5

      // 중심으로부터의 거리
      const distFromCenter = Math.sqrt(
        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
      )

      // 가장자리 거리
      const distFromEdge = Math.min(x, 1 - x, y, 1 - y)

      // TSV 불량 확률 계산
      let defectProbability = 0

      // 중심부 불량 (원형 패턴)
      if (distFromCenter < 0.3) {
        defectProbability += 0.08 * (1 - distFromCenter / 0.3)
      }

      // 가장자리 불량 (링 패턴)
      if (distFromEdge < 0.15) {
        defectProbability += 0.12 * (1 - distFromEdge / 0.15)
      }

      // 랜덤 불량 (산발적)
      defectProbability += 0.02

      // 클러스터링 효과 (주변에 불량이 있으면 확률 증가)
      if (row > 0 && col > 0) {
        const prevIndex = (row - 1) * size + (col - 1)
        if (cells[prevIndex] === "defect") {
          defectProbability += 0.15
        } else if (cells[prevIndex] === "warning") {
          defectProbability += 0.08
        }
      }

      const value = rand()
      if (value < defectProbability) {
        cells.push("defect")
      } else if (value < defectProbability + 0.05) {
        cells.push("warning")
      } else {
        cells.push("good")
      }
    }
  }

  return cells
}

const StackVisualization3D = memo(function StackVisualization3D({
  layers,
  selectedLayer,
  onSelectLayer,
  expandedView,
  highlightDefects
}: {
  layers: StackLayer[]
  selectedLayer: number | null
  onSelectLayer: (id: number | null) => void
  expandedView: boolean
  highlightDefects: boolean
}) {
  const layerWidth = 140
  const layerHeight = 70
  const stackGap = expandedView ? 22 : 16

  const getLayerColor = (layer: StackLayer): string => {
    // die_status가 1이면 파랑색(정상)
    if (layer.dieStatus === 1) {
      return "#3b82f6" // Blue-500
    }

    // die_status = 2 중에서 failure_type이 Random이나 Near-full을 가진 칩이면 빨간색(불량)
    if (layer.dieStatus === 2 && layer.failureType && ["Random", "Near-full"].includes(layer.failureType)) {
      return "#ef4444" // Red-500
    }

    // 그 외의 die_status=2는 저 색(주황색)을 사용
    if (layer.dieStatus === 2) {
      return "#f59e0b" // Amber-500
    }

    // Fallback: 기존 로직
    if (layer.status === "warning" || layer.status === "defect") {
      return "#f59e0b"
    }

    return "#3b82f6"
  }

  const centerX = 145
  const topY = 60

  const moveToward = (from: { x: number; y: number }, to: { x: number; y: number }, dist: number) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.hypot(dx, dy) || 1
    return { x: from.x + (dx / len) * dist, y: from.y + (dy / len) * dist }
  }

  const getRoundedDiamondPath = (cx: number, cy: number, w: number, h: number, r: number) => {
    const pts = [
      { x: cx, y: cy },
      { x: cx + w, y: cy + h / 2 },
      { x: cx, y: cy + h },
      { x: cx - w, y: cy + h / 2 },
    ]

    const edgeLens = pts.map((p, i) => {
      const n = pts[(i + 1) % pts.length]
      return Math.hypot(n.x - p.x, n.y - p.y)
    })
    const rr = Math.min(r, Math.min(...edgeLens) / 2)

    const corners = pts.map((p, i) => {
      const prev = pts[(i - 1 + pts.length) % pts.length]
      const next = pts[(i + 1) % pts.length]
      return {
        p,
        p1: moveToward(p, prev, rr),
        p2: moveToward(p, next, rr),
      }
    })

    let d = `M ${corners[0].p1.x} ${corners[0].p1.y}`
    corners.forEach((c, i) => {
      d += ` Q ${c.p.x} ${c.p.y} ${c.p2.x} ${c.p2.y}`
      const next = corners[(i + 1) % corners.length]
      d += ` L ${next.p1.x} ${next.p1.y}`
    })
    d += " Z"
    return d
  }

  const basePath = getRoundedDiamondPath(centerX, topY, layerWidth, layerHeight, 20)

  return (
    <div className="relative w-full h-[450px] flex items-center justify-center overflow-hidden">
      {/* Isometric Stack Container - Top down view */}
      <svg
        width="400"
        height="450"
        viewBox="0 0 350 400"
        className="transition-transform duration-300 [&_circle]:opacity-0"
        style={{ transform: "translateX(-50px)" }}
      >
        {/* Render from bottom to top so top layers appear on top */}
        {[...layers].reverse().map((layer, index) => {
          const isSelected = selectedLayer === layer.id
          const actualIndex = layers.length - 1 - index
          const yOffset = actualIndex * stackGap
          const color = getLayerColor(layer)

          return (
            <g
              key={layer.id}
              className="cursor-pointer"
              onClick={() => onSelectLayer(isSelected ? null : layer.id)}
              style={{
                transform: `translateY(${yOffset}px)`,
                transition: "transform 0.35s ease"
              }}
            >
              <path
                d={basePath}
                fill="rgba(0,0,0,0.18)"
                style={{ transform: "translateY(2px)" }}
              />
              <path
                d={basePath}
                fill={color}
                stroke={isSelected ? "#fff" : "rgba(0,0,0,0.3)"}
                strokeWidth={isSelected ? 3.5 : 1.5}
                style={{
                  filter: isSelected ? "drop-shadow(0 0 15px rgba(255,255,255,0.5))" : "none",
                  transition: "all 0.3s ease"
                }}
              />

            </g >
          )
        })}
      </svg >

      {/* Layer Labels - positioned to the right */}
      < div className="absolute right-8 top-2 bottom-4 flex flex-col justify-start gap-1" >
        {
          layers.map((layer) => {
            const isSelected = selectedLayer === layer.id
            const color = getLayerColor(layer)

            return (
              <div
                key={layer.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-1.5 rounded-lg cursor-pointer transition-all",
                  isSelected ? "bg-white/20" : "bg-transparent hover:bg-white/10"
                )}
                onClick={() => onSelectLayer(isSelected ? null : layer.id)}
              >
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <div>
                  <div className={cn(
                    "text-sm font-semibold text-white",
                    isSelected && "text-primary"
                  )}>
                    {layer.name}
                  </div>
                  <div className="text-xs text-white/60">
                    {layer.failureType || 'None'}
                  </div>
                </div>
              </div>
            )
          })
        }
      </div >

      {/* Layer count indicator */}
      < div className="absolute bottom-4 left-4 text-sm text-muted-foreground" >
        Total {layers.length} Layers
      </div >
    </div >
  )
})

const LayerPlanarView = memo(function LayerPlanarView({ layer, stackIndex }: { layer: StackLayer; stackIndex: number }) {
  // Use data from layer if available, otherwise fallback (or empty)
  // User requested 32x32 visualization.
  // The backend might send different sizes. We will try to rely on the backend data.

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageSize = 400

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = imageSize
    canvas.height = imageSize
    ctx.clearRect(0, 0, imageSize, imageSize)

    // Data Source
    let matrix = layer.tsvMatrix

    // If no real data, show empty or placeholder?
    // User wants to see *real* data. If missing, maybe black or empty.
    if (!matrix || matrix.length === 0) {
      // Fallback or empty
      return
    }

    const rows = matrix.length
    const cols = matrix[0].length || 1

    const cellWidth = imageSize / cols
    const cellHeight = imageSize / rows

    const colors = {
      0: '#22c55e', // Normal (Green)
      1: '#ef4444', // Defect (Red)
    }

    // Default color for anything else
    const defaultColor = '#f59e0b';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = matrix[r][c]
        // Default to warning if unknown value, but request says 0 and 1.
        // If val is 0 -> Green, 1 -> Red.
        // Using logic: val === 0 ? green : red
        let fill = defaultColor;
        if (val === 0) fill = colors[0];
        else if (val === 1) fill = colors[1];

        ctx.fillStyle = fill;
        ctx.fillRect(c * cellWidth, r * cellHeight, cellWidth, cellHeight)
      }
    }

  }, [layer.tsvMatrix, imageSize, layer.id])

  // Stats for real data
  const matrix = layer.tsvMatrix || []
  let goodCount = 0
  let defectCount = 0

  if (matrix.length > 0) {
    matrix.forEach(row => {
      row.forEach(val => {
        if (val === 0) goodCount++
        else defectCount++
      })
    })
  }

  const totalCells = goodCount + defectCount
  const defectRate = totalCells > 0 ? ((defectCount / totalCells) * 100).toFixed(2) : "0.00"

  // Only calculate warning count if we had a 3rd state, but for now 0/1.
  const warningCount = 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-foreground">TSV 불량 평면 이미지</h4>
          <p className="text-xs text-muted-foreground">
            {matrix.length > 0 ? `${matrix.length}x${matrix[0]?.length || 0} 구조` : "No Data"} (불량률: {defectRate}%)
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {layer.name}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-success/90" />
          <span className="text-muted-foreground">정상 (0)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-destructive/90" />
          <span className="text-muted-foreground">불량 (1)</span>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="rounded-lg border border-border bg-muted/20 p-2">
          <canvas
            ref={canvasRef}
            className="rounded-md"
            style={{
              width: '100%',
              maxWidth: `${imageSize}px`,
              height: 'auto',
              imageRendering: 'pixelated'
            }}
          />
        </div>
      </div>

      {/* 통계 정보 */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
        <div className="text-center">
          <div className="text-lg font-bold text-success">{goodCount}</div>
          <div className="text-xs text-muted-foreground">정상</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-warning">{warningCount}</div>
          <div className="text-xs text-muted-foreground">주의</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-destructive">{defectCount}</div>
          <div className="text-xs text-muted-foreground">불량</div>
        </div>
      </div>
    </div>
  )
})

const LayerDetailPanel = memo(function LayerDetailPanel({ layer }: { layer: StackLayer }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-foreground">{layer.name}</h4>
          <p className="text-xs text-muted-foreground mt-1">{layer.chipUid}</p>
        </div>
        <Badge
          variant={layer.status === "good" ? "default" : "outline"}
          className={cn(
            layer.status === "good" && "bg-success text-success-foreground",
            (layer.status === "warning" || layer.status === "defect") && "bg-warning text-warning-foreground border-warning"
          )}
        >
          {layer.status === "good" ? "정상" : "주의"}
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="p-3 bg-muted/30 rounded-md text-sm">
          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-muted-foreground">Chip ID</span>
            <span className="font-mono">{layer.chipUid || 'N/A'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-muted-foreground">유형</span>
            <span className="font-medium">{layer.failureType || 'None'}</span>
          </div>
          <div className="flex justify-between py-1 pt-2">
            <span className="text-muted-foreground">칩 수율</span>
            <span className="font-medium">{layer.yield.toFixed(2)}%</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">수율</span>
            <span className="font-medium text-foreground">{layer.yield.toFixed(1)}%</span>
          </div>
          <Progress value={layer.yield} className="h-2" />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">TSV 정렬도</span>
            <span className="font-medium text-foreground">{layer.tsvAlignment.toFixed(1)}%</span>
          </div>
          <Progress value={layer.tsvAlignment} className="h-2" />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">본딩 품질</span>
            <span className="font-medium text-foreground">{layer.bondingQuality.toFixed(1)}%</span>
          </div>
          <Progress value={layer.bondingQuality} className="h-2" />
        </div>

        <div className="pt-2 border-t border-border">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">공정 온도</span>
            <span className="font-medium text-foreground">{layer.temperature.toFixed(1)}°C</span>
          </div>
        </div>
      </div>
    </div>
  )
})

const StackQualityGrade = memo(function StackQualityGrade({ layers }: { layers: StackLayer[] }) {
  // New Logic: Use dieStatus and failureType
  const goodLayers = layers.filter(l => l.dieStatus === 1).length

  // Critical Defects: dieStatus 2 AND (Random OR Near-full)
  const defectLayers = layers.filter(l =>
    l.dieStatus === 2 && l.failureType && ["Random", "Near-full"].includes(l.failureType)
  ).length

  // Warnings: dieStatus 2 AND NOT (Random OR Near-full)
  const warningLayers = layers.filter(l =>
    l.dieStatus === 2 && !(l.failureType && ["Random", "Near-full"].includes(l.failureType))
  ).length

  const totalYield = layers.reduce((acc, l) => acc + l.yield, 0) / (layers.length || 1)

  let grade = "A"
  let gradeColor = "text-success"

  // 등급 기준: 
  // 1. 치명적 불량(Red)이 하나라도 있으면 C
  // 2. 주의 레이어(Orange)가 있으면 B
  // 3. 모두 정상이면 A
  if (defectLayers > 0) {
    grade = "C"
    gradeColor = "text-destructive" // Red for C
  } else if (warningLayers > 0) {
    grade = "B"
    gradeColor = "text-warning" // Orange for B
  }

  if (layers.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">스택 품질 등급</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center mb-4">
          <div className={cn("text-6xl font-bold", gradeColor)}>
            {grade}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-muted-foreground">정상 레이어</span>
            </div>
            <span className="font-medium text-foreground">{goodLayers}</span>
          </div>

          {/* Warning Layers (Orange) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-muted-foreground">주의 레이어</span>
            </div>
            <span className="font-medium text-foreground">{warningLayers}</span>
          </div>

          {/* Critical Defect Layers (Red) - Only show if exists or just always show */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive" />
              <span className="text-muted-foreground">불량 레이어</span>
            </div>
            <span className="font-medium text-foreground">{defectLayers}</span>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between">
            <span className="text-muted-foreground">종합 수율</span>
            <span className="font-bold text-foreground">{totalYield.toFixed(1)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

// 백엔드 데이터 타입 정의
interface BackendLayer {
  layer_idx: number
  chip_id: string
  cluster_label: number
  inferred_type: string
  failure_type: string
  die_status?: number
  tsv_matrix?: number[][]
  chip_yield?: number
}

interface BackendStack {
  stack_id: string
  score: string
  layers: BackendLayer[]
}

export default function StackingVisualizationPage() {
  const [stackIndex, setStackIndex] = useState(0)
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null)
  const [expandedView, setExpandedView] = useState(false)
  const [highlightDefects, setHighlightDefects] = useState(true)
  const [isLayerDetailExpanded, setIsLayerDetailExpanded] = useState(true)

  const [layers, setLayers] = useState<StackLayer[]>([])
  // 백엔드에서 받아온 전체 스택 리스트
  const [allStacks, setAllStacks] = useState<BackendStack[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  // History state
  const [historyItems, setHistoryItems] = useState<{ tsv_num: number; created_at: string; stack_count: number }[]>([])
  const [selectedHistory, setSelectedHistory] = useState<string>("")

  // API 데이터 -> 프론트엔드 StackLayer 매핑
  const mapBackendLayersToState = useCallback((backendLayers: BackendLayer[]): StackLayer[] => {
    // 역순 정렬 (1번이 바닥, N번이 위쪽이라면 프론트 시각화 순서에 맞춤)
    // 현재 프론트엔드는 렌더링 시 reverse()를 하므로, 여기서는 논리적 순서(1~N)로 두면 됨.
    // 백엔드는 layer_idx 1부터 시작.

    return backendLayers.map((bl) => {
      // status 매핑
      const status = getStatusFromFailure(bl.failure_type)

      return {
        id: bl.layer_idx,
        name: `DRAM ${bl.layer_idx}`,
        chipUid: bl.chip_id || `Unknown-${bl.layer_idx}`,
        type: "DRAM",
        status: status,
        yield: bl.chip_yield !== undefined ? bl.chip_yield : (status === 'good' ? 95 : 80),
        tsvAlignment: 98 + Math.random() * 2,
        bondingQuality: 96 + Math.random() * 4,
        temperature: 75 + Math.random() * 10,
        chipId: bl.chip_id,
        failureType: bl.failure_type,
        clusterLabel: bl.cluster_label,
        dieStatus: bl.die_status,
        tsvMatrix: bl.tsv_matrix
      }
    })
  }, [])

  // 초기 더미 데이터 로드 및 히스토리 조회
  useEffect(() => {
    // setLayers(generateStackLayers(STACK_LAYERS)) // Demo removed
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const res = await fetch(`${apiUrl}/stack/list`)
      if (res.ok) {
        const data = await res.json()
        setHistoryItems(data)

        // Load latest history automatically
        if (data && data.length > 0) {
          handleHistorySelect(String(data[0].tsv_num))
        } else {
          // No history
          setLayers([])
        }
      }
    } catch (e) {
      console.error("Failed to fetch history:", e)
    }
  }

  const handleHistorySelect = async (val: string) => {
    setSelectedHistory(val)
    const tsvNum = parseInt(val)
    if (isNaN(tsvNum)) return

    setIsLoading(true)
    setApiError(null)
    setStackIndex(0)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const res = await fetch(`${apiUrl}/stack/result/${tsvNum}`)
      if (!res.ok) throw new Error("Failed to fetch stack result")

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      if (data.stacks && Array.isArray(data.stacks) && data.stacks.length > 0) {
        setAllStacks(data.stacks)
        const firstStack = data.stacks[0]
        setLayers(mapBackendLayersToState(firstStack.layers))
      } else {
        setAllStacks([])
        setApiError("해당 기록에 스택 데이터가 없습니다.")
      }
    } catch (err: any) {
      console.error(err)
      setApiError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // 최신 PKL 분석 요청
  const handleAnalyzeLatest = async () => {
    setIsLoading(true)
    setApiError(null)
    setStackIndex(0) // Reset to first stack

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const res = await fetch(`${apiUrl}/stack/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batch_id: null }), // null일 경우 최신 파일 자동 탐색
      })

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`)
      }

      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.stacks && Array.isArray(data.stacks) && data.stacks.length > 0) {
        setAllStacks(data.stacks)
        console.log(`Loaded ${data.stacks.length} stacks`)

        // 첫 번째 스택 표시
        const firstStack = data.stacks[0]
        setLayers(mapBackendLayersToState(firstStack.layers))
      } else {
        setAllStacks([])
        setApiError("생성된 스택이 없습니다. 데이터가 부족하거나 조건에 맞는 칩이 없습니다.")
      }

    } catch (err: any) {
      console.error(err)
      setApiError(err.message || "Failed to fetch simulation data")
    } finally {
      setIsLoading(false)
    }
  }

  // 스택 이동 핸들러
  const handlePrevStack = () => {
    if (stackIndex > 0) {
      const newIndex = stackIndex - 1
      setStackIndex(newIndex)
      setLayers(mapBackendLayersToState(allStacks[newIndex].layers))
      setSelectedLayer(null)
    }
  }

  const handleNextStack = () => {
    if (stackIndex < allStacks.length - 1) {
      const newIndex = stackIndex + 1
      setStackIndex(newIndex)
      setLayers(mapBackendLayersToState(allStacks[newIndex].layers))
      setSelectedLayer(null)
    }
  }

  const selectedLayerData = selectedLayer ? layers.find(l => l.id === selectedLayer) : null

  // 현재 스택의 Score 등 정보 가져오기
  const currentStackInfo = allStacks[stackIndex]

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">HBM 적층 구조</h2>
          <p className="text-sm text-muted-foreground">TSV 기반 3D 스택 시각화 및 품질 분석</p>
        </div>

        <div className="flex items-center gap-2">
          {/* 기존 Reset 버튼: 데모용 리셋 역할 유지 또는 숨김 가능. 여기선 더미 리셋으로 둠 */}
          {/* History Select */}
          <Select value={selectedHistory} onValueChange={handleHistorySelect} disabled={isLoading}>
            <SelectTrigger className="w-[200px] h-9 text-xs">
              <SelectValue placeholder="분석 이력 선택" />
            </SelectTrigger>
            <SelectContent>
              {historyItems.map((item) => (
                <SelectItem key={item.tsv_num} value={String(item.tsv_num)} className="text-xs">
                  <span className="font-mono mr-2">#{item.tsv_num}</span>
                  {new Date(item.created_at).toLocaleDateString()} ({item.stack_count} stacks)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="default" // 강조
            size="sm"
            onClick={handleAnalyzeLatest}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                최신 PKL 분석
              </>
            )}
          </Button>
        </div>
      </div>

      {apiError && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {apiError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 3D Visualization */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>3D 스택 뷰</CardTitle>
                  <CardDescription>
                    {currentStackInfo
                      ? `ID: ${currentStackInfo.stack_id} | Score: ${currentStackInfo.score}`
                      : "Stack ID: DEMO-STACK (Loading needed)"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrevStack}
                    disabled={stackIndex <= 0 || allStacks.length === 0}
                    title="이전 스택"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <Select
                    value={String(stackIndex)}
                    onValueChange={(val) => setStackIndex(parseInt(val))}
                    disabled={allStacks.length === 0}
                  >
                    <SelectTrigger className="h-9 w-[120px] border-none bg-transparent hover:bg-muted/50 focus:ring-0 text-xs font-medium justify-center">
                      <SelectValue>
                        Stack {allStacks.length > 0 ? stackIndex + 1 : 1}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {allStacks.map((_, idx) => (
                        <SelectItem key={idx} value={String(idx)}>
                          Stack {idx + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextStack}
                    disabled={stackIndex >= allStacks.length - 1 || allStacks.length === 0}
                    title="다음 스택"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setExpandedView(!expandedView)}
                    title={expandedView ? "압축 보기" : "확장 보기"}
                  >
                    {expandedView ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setHighlightDefects(!highlightDefects)}
                    title={highlightDefects ? "결함 하이라이트 끄기" : "결함 하이라이트 켜기"}
                  >
                    {highlightDefects ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row items-stretch gap-6">
                <div
                  className={cn(
                    "flex-1 transition-all duration-500 overflow-hidden",
                    selectedLayerData
                      ? "opacity-100 translate-x-0 max-h-[520px]"
                      : "opacity-0 -translate-x-4 max-h-0 lg:max-h-[520px] lg:max-w-0 lg:opacity-0 lg:-translate-x-4 pointer-events-none"
                  )}
                >
                  {selectedLayerData && (
                    <LayerPlanarView layer={selectedLayerData} stackIndex={stackIndex} />
                  )}
                </div>
                <div
                  className={cn(
                    "flex-1 transition-all duration-500",
                    selectedLayerData ? "lg:translate-x-6" : "translate-x-0"
                  )}
                >
                  <StackVisualization3D
                    layers={layers}
                    selectedLayer={selectedLayer}
                    onSelectLayer={setSelectedLayer}
                    expandedView={expandedView}
                    highlightDefects={highlightDefects}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-6 lg:col-span-1">
          {/* Quality Grade */}
          <StackQualityGrade layers={layers} />

          {/* Selected Layer Detail */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">레이어 상세</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedLayerData ? (
                <LayerDetailPanel layer={selectedLayerData} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">레이어를 클릭하여</p>
                  <p className="text-sm">상세 정보를 확인하세요</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Layer List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>레이어별 상세 정보</CardTitle>
              <CardDescription>각 레이어의 품질 지표 및 파라미터</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsLayerDetailExpanded(!isLayerDetailExpanded)}
              className="h-8 w-8"
            >
              {isLayerDetailExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {isLayerDetailExpanded && (
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">레이어</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Chip ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">타입</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">상태</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">불량유형</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">수율</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">온도</th>
                  </tr>
                </thead>
                <tbody>
                  {layers.map((layer) => (
                    <tr
                      key={layer.id}
                      className={cn(
                        "border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors",
                        selectedLayer === layer.id && "bg-muted"
                      )}
                      onClick={() => setSelectedLayer(layer.id)}
                    >
                      <td className="py-3 px-4 text-sm font-medium text-foreground">{layer.name}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground font-mono">{layer.chipId || layer.chipUid.substring(0, 12) + "..."}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">
                          {layer.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs border-0",
                            // Normal -> Blue/Green
                            layer.dieStatus === 1 && "bg-blue-500/15 text-blue-500 hover:bg-blue-500/25",
                            // Critical Defect -> Red
                            (layer.dieStatus === 2 && layer.failureType && ["Random", "Near-full"].includes(layer.failureType)) && "bg-red-500/15 text-red-500 hover:bg-red-500/25",
                            // Warning -> Orange (Default for other defects)
                            (layer.dieStatus === 2 && !(layer.failureType && ["Random", "Near-full"].includes(layer.failureType))) && "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25"
                          )}
                        >
                          {layer.dieStatus === 1 ? "정상" :
                            (layer.failureType && ["Random", "Near-full"].includes(layer.failureType)) ? "불량" : "주의"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{layer.failureType || "N/A"}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{layer.yield.toFixed(1)}%</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{layer.temperature.toFixed(1)}°C</td>
                    </tr>
                  ))}
                  {layers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted-foreground">데이터가 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

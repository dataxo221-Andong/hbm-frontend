"use client"

import { useState, useMemo, useEffect, memo, useCallback } from "react"
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
  Database
} from "lucide-react"
import { cn } from "@/lib/utils"

// HBM Stack Configuration
type LayerStatus = "good" | "defect" | "warning"

interface StackLayer {
  id: number
  name: string
  type: "DRAM"
  status: LayerStatus
  yield: number
  tsvAlignment: number
  bondingQuality: number
  temperature: number
  chipId?: string
  failureType?: string
  clusterLabel?: number
}

// API Response Types
interface StackResponse {
  batch_id: string
  total_chips: number
  stacks_formed: number
  stacks: {
    stack_id: string
    score: string
    layers: {
      layer_idx: number
      chip_id: string
      cluster_label: number
      inferred_type: string
      failure_type: string
    }[]
  }[]
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

  const getLayerColor = (layer: StackLayer, shouldHighlight: boolean): string => {
    if (shouldHighlight && layer.status === "defect") {
      return "#ef4444"
    }
    if (shouldHighlight && layer.status === "warning") {
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
          const isDefect = layer.status !== "good"
          const shouldHighlight = highlightDefects && isDefect
          const color = getLayerColor(layer, shouldHighlight)

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

              {/* Highlight indicator for defects */}
              {shouldHighlight && (
                <circle
                  cx={centerX}
                  cy={topY + yOffset + layerHeight / 2}
                  r="8"
                  fill="#fff"
                  opacity="0.8"
                />
              )}
            </g>
          )
        })}
      </svg>

      {/* Layer Labels - positioned to the right */}
      <div className="absolute right-8 top-2 bottom-4 flex flex-col justify-start gap-1">
        {layers.map((layer) => {
          const isSelected = selectedLayer === layer.id
          const isDefect = layer.status !== "good"
          const shouldHighlight = highlightDefects && isDefect
          const color = getLayerColor(layer, shouldHighlight)

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
                  {layer.chipId ? layer.chipId.slice(-6) : `Yield: ${layer.yield.toFixed(1)}%`}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Layer count indicator */}
      <div className="absolute bottom-4 left-4 text-sm text-muted-foreground">
        Total {layers.length} Layers
      </div>
    </div>
  )
})

const LayerPlanarView = memo(function LayerPlanarView({ layer, stackIndex }: { layer: StackLayer; stackIndex: number }) {
  const gridSize = 32
  const [cells, setCells] = useState<LayerStatus[]>([])

  // 클라이언트에서만 데이터 생성
  useEffect(() => {
    setCells(generatePlanarMap(layer.id, stackIndex, gridSize, layer.status))
  }, [layer.id, stackIndex, gridSize, layer.status])

  const cellColors: Record<LayerStatus, string> = {
    good: "bg-success/90",
    warning: "bg-warning/90",
    defect: "bg-destructive/90"
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-foreground">평면 이미지</h4>
          <p className="text-xs text-muted-foreground">32x32 칩 구조 (시뮬레이션)</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {layer.name}
        </Badge>
      </div>
      <div className="max-w-sm">
        <div
          className="grid gap-px rounded-lg border border-border bg-muted/20 p-2"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`
          }}
        >
          {cells.map((status, index) => (
            <div
              key={`${layer.id}-${index}`}
              className={cn("w-full h-full rounded-[1px]", cellColors[status])}
            />
          ))}
        </div>
      </div>
    </div>
  )
})

const LayerDetailPanel = memo(function LayerDetailPanel({ layer }: { layer: StackLayer }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-foreground">{layer.name}</h4>
        <Badge
          variant={layer.status === "good" ? "default" : layer.status === "warning" ? "secondary" : "destructive"}
          className={cn(
            layer.status === "good" && "bg-success text-success-foreground",
            layer.status === "warning" && "bg-warning text-warning-foreground"
          )}
        >
          {layer.status === "good" ? "정상" : layer.status === "warning" ? "주의" : "결함"}
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="p-3 bg-muted/30 rounded-md text-sm">
          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-muted-foreground">Chip ID</span>
            <span className="font-mono">{layer.chipId || 'N/A'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-muted-foreground">유형</span>
            <span className="font-medium">{layer.failureType || 'N/A'}</span>
          </div>
          <div className="flex justify-between py-1 pt-2">
            <span className="text-muted-foreground">Cluster</span>
            <span className="font-medium">{layer.clusterLabel}</span>
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
  const goodLayers = layers.filter(l => l.status === "good").length
  const warningLayers = layers.filter(l => l.status === "warning").length
  const defectLayers = layers.filter(l => l.status === "defect").length
  const totalYield = layers.reduce((acc, l) => acc + l.yield, 0) / (layers.length || 1)

  let grade = "A"
  let gradeColor = "text-success"

  if (defectLayers > 0) {
    grade = "F"
    gradeColor = "text-destructive"
  } else if (warningLayers > 2) {
    grade = "C"
    gradeColor = "text-warning"
  } else if (warningLayers > 0) {
    grade = "B"
    gradeColor = "text-primary"
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-muted-foreground">주의 레이어</span>
            </div>
            <span className="font-medium text-foreground">{warningLayers}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-muted-foreground">결함 레이어</span>
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

export default function StackingVisualizationPage() {
  const [stackIndex, setStackIndex] = useState(0)
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null)
  const [expandedView, setExpandedView] = useState(false)
  const [highlightDefects, setHighlightDefects] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [layers, setLayers] = useState<StackLayer[]>([])
  const [allStacks, setAllStacks] = useState<any[]>([]) // Raw stack data from API
  const [scenarios, setScenarios] = useState<string[]>([])
  const [selectedScenario, setSelectedScenario] = useState<string>("")

  // 1. Load available scenarios on mount
  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/stack/scenarios`)
        if (res.ok) {
          const data = await res.json()
          setScenarios(data.scenarios || [])
          // Select first scenario if available
          if (data.scenarios && data.scenarios.length > 0) {
            setSelectedScenario(data.scenarios[0])
          }
        }
      } catch (e) {
        console.error("Failed to fetch scenarios", e)
      }
    }
    fetchScenarios()
  }, [])

  // 2. Fetch stack analysis when scenario changes
  useEffect(() => {
    if (!selectedScenario) return;

    const fetchAnalysis = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/stack/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch_id: selectedScenario })
        })

        if (!res.ok) {
          throw new Error(`Analysis failed: ${res.statusText}`)
        }

        const data: StackResponse = await res.json()

        if (data.stacks && data.stacks.length > 0) {
          setAllStacks(data.stacks)
          setStackIndex(0) // Reset to first stack
        } else {
          setAllStacks([])
          setLayers([])
          setError("No valid stacks could be formed from this data.")
        }
      } catch (e: any) {
        console.error(e)
        setError(e.message || "Failed to load analysis")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalysis()
  }, [selectedScenario])

  // 3. Update current layers when stackIndex or allStacks changes
  useEffect(() => {
    if (allStacks.length > 0 && allStacks[stackIndex]) {
      const currentStackData = allStacks[stackIndex]

      // Map API layers to Frontend StackLayer model
      const mappedLayers: StackLayer[] = currentStackData.layers.map((l: any) => ({
        id: l.layer_idx,
        name: `Layer ${l.layer_idx}`,
        type: "DRAM",
        status: getStatusFromFailure(l.failure_type),
        // Random simulation metrics (API doesn't provide these yet)
        yield: 90 + Math.random() * 10,
        tsvAlignment: 95 + Math.random() * 5,
        bondingQuality: 92 + Math.random() * 8,
        temperature: 70 + Math.random() * 15,

        // API Data
        chipId: l.chip_id,
        failureType: l.failure_type,
        clusterLabel: l.cluster_label
      }))

      setLayers(mappedLayers)
    } else {
      setLayers([])
    }
  }, [stackIndex, allStacks])

  const selectedLayerData = selectedLayer ? layers.find(l => l.id === selectedLayer) : null
  const stackCount = allStacks.length

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">HBM 적층 구조</h2>
          <p className="text-sm text-muted-foreground">TSV 기반 3D 스택 시각화 및 품질 분석</p>
        </div>

        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedScenario} onValueChange={setSelectedScenario} disabled={isLoading}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="시나리오 선택" />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
              {scenarios.length === 0 && <SelectItem value="none" disabled>No Data</SelectItem>}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setSelectedScenario(selectedScenario)} disabled={isLoading}>
            {isLoading ? "분석 중..." : "새로고침"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          {error}
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
                    {allStacks.length > 0
                      ? `Stack ID: ${allStacks[stackIndex]?.stack_id} (Score: ${allStacks[stackIndex]?.score})`
                      : "데이터가 없습니다."}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setStackIndex((prev) => (prev - 1 + stackCount) % stackCount)}
                    disabled={stackCount <= 1}
                    title="이전 스택"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setStackIndex((prev) => (prev + 1) % stackCount)}
                    disabled={stackCount <= 1}
                    title="다음 스택"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <span className="px-2 text-xs text-muted-foreground min-w-[80px] text-center">
                    Stack {stackCount > 0 ? stackIndex + 1 : 0} / {stackCount}
                  </span>
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
              {allStacks.length > 0 ? (
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
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  {isLoading ? "데이터 분석 중..." : "표시할 데이터가 없습니다."}
                </div>
              )}
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
          <CardTitle>레이어별 상세 정보</CardTitle>
          <CardDescription>각 레이어의 품질 지표 및 파라미터 (ID: {allStacks[stackIndex]?.stack_id})</CardDescription>
        </CardHeader>
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
                    <td className="py-3 px-4 text-sm text-muted-foreground font-mono">{layer.chipId}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-xs">
                        {layer.type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={layer.status === "good" ? "default" : layer.status === "warning" ? "secondary" : "destructive"}
                        className={cn(
                          "text-xs",
                          layer.status === "good" && "bg-success text-success-foreground"
                        )}
                      >
                        {layer.status === "good" ? "정상" : layer.status === "warning" ? "주의" : "결함"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground">{layer.failureType}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{layer.yield.toFixed(1)}%</td>
                    <td className="py-3 px-4 text-sm text-foreground">{layer.temperature.toFixed(1)}°C</td>
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
      </Card>
    </div>
  )
}

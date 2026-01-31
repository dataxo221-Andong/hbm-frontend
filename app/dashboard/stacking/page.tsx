"use client"

import { useState, useMemo, useEffect, memo, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  CheckCircle2
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
    
    layers.push({
      id: i,
      name: `DRAM ${i}`,
      chipUid: generateChipUid(i),
      type: "DRAM",
      status,
      yield: 94 + Math.random() * 5,
      tsvAlignment: 98 + Math.random() * 2,
      bondingQuality: 96 + Math.random() * 4,
      temperature: 75 + Math.random() * 10
    })
  }
  
  return layers
}

const STACK_COUNT = 4
const STACK_LAYERS = 8

function createSeededRandom(seed: number) {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function generatePlanarMap(layerId: number, stackIndex: number, size: number = 32) {
  const rand = createSeededRandom(layerId * 97 + stackIndex * 997)
  const cells: LayerStatus[] = []

  for (let i = 0; i < size * size; i++) {
    const value = rand()
    if (value < 0.04) {
      cells.push("defect")
    } else if (value < 0.1) {
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
    // 상태에 따라 색상 결정: 정상(파란색), 주의(주황색)
    if (layer.status === "warning" || layer.status === "defect") {
      return "#f59e0b" // 주황색 (주의)
    }
    
    return "#3b82f6" // 파란색 (정상)
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
              
            </g>
          )
        })}
      </svg>

      {/* Layer Labels - positioned to the right */}
      <div className="absolute right-8 top-2 bottom-4 flex flex-col justify-start gap-1">
        {layers.map((layer) => {
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
                  {layer.yield.toFixed(1)}%
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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageSize = 400 // 이미지 크기 (픽셀)

  // 클라이언트에서만 데이터 생성 (hydration 에러 방지)
  useEffect(() => {
    // TSV 불량 패턴 사용
    setCells(generateTSVDefectMap(layer.id, stackIndex, gridSize))
  }, [layer.id, stackIndex, gridSize])

  // Canvas에 이미지 그리기
  useEffect(() => {
    if (!canvasRef.current || cells.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Canvas 크기 설정
    canvas.width = imageSize
    canvas.height = imageSize

    // 배경 투명하게 (회색 배경 제거)
    ctx.clearRect(0, 0, imageSize, imageSize)

    // 셀 크기 계산
    const cellSize = imageSize / gridSize

    // 색상 정의
    const colors: Record<LayerStatus, string> = {
      good: '#22c55e',      // 초록색
      warning: '#f59e0b',   // 노란색
      defect: '#ef4444'     // 빨간색
    }

    // 그리드 그리기
    cells.forEach((status, index) => {
      const row = Math.floor(index / gridSize)
      const col = index % gridSize
      
      const x = col * cellSize
      const y = row * cellSize

      // 셀 색상 채우기
      ctx.fillStyle = colors[status]
      ctx.fillRect(x, y, cellSize, cellSize)
    })

  }, [cells, imageSize, gridSize])

  // TSV 불량 통계 계산
  const defectCount = cells.filter(c => c === "defect").length
  const warningCount = cells.filter(c => c === "warning").length
  const goodCount = cells.filter(c => c === "good").length
  const totalCells = cells.length
  const defectRate = ((defectCount / totalCells) * 100).toFixed(2)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-foreground">TSV 불량 평면 이미지</h4>
          <p className="text-xs text-muted-foreground">32x32 TSV 구조 (불량률: {defectRate}%)</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {layer.name}
        </Badge>
      </div>
      
      {/* 범례 */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-success/90" />
          <span className="text-muted-foreground">정상 TSV</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-warning/90" />
          <span className="text-muted-foreground">주의 TSV</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-destructive/90" />
          <span className="text-muted-foreground">불량 TSV</span>
        </div>
      </div>

      {/* Canvas 이미지 */}
      <div className="flex justify-center">
        <div className="rounded-lg border border-border bg-muted/20 p-2">
          <canvas
            ref={canvasRef}
            className="rounded-md"
            style={{
              width: '100%',
              maxWidth: `${imageSize}px`,
              height: 'auto',
              imageRendering: 'pixelated' // 선명한 픽셀 표시
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
  // defect도 주의로 카운트
  const warningLayers = layers.filter(l => l.status === "warning" || l.status === "defect").length
  const totalYield = layers.reduce((acc, l) => acc + l.yield, 0) / layers.length

  let grade = "A"
  let gradeColor = "text-success"
  
  // 등급 기준: 주의 레이어 수에 따라 결정
  if (warningLayers > 2) {
    grade = "C"
    gradeColor = "text-warning"
  } else if (warningLayers > 0) {
    grade = "B"
    gradeColor = "text-primary"
  }

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
  const [isLayerDetailExpanded, setIsLayerDetailExpanded] = useState(true)

  const [layers, setLayers] = useState<StackLayer[]>([])

  // 클라이언트에서만 랜덤 데이터 생성 (hydration 에러 방지)
  useEffect(() => {
    setLayers(generateStackLayers(STACK_LAYERS))
  }, [stackIndex])

  const selectedLayerData = selectedLayer ? layers.find(l => l.id === selectedLayer) : null

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">HBM 적층 구조</h2>
          <p className="text-sm text-muted-foreground">TSV 기반 3D 스택 시각화 및 품질 분석</p>
        </div>
        
        <div className="flex items-center gap-2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 3D Visualization */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>3D 스택 뷰</CardTitle>
                  <CardDescription>레이어를 클릭하여 상세 정보 확인</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setStackIndex((prev) => (prev - 1 + STACK_COUNT) % STACK_COUNT)}
                    title="이전 스택"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setStackIndex((prev) => (prev + 1) % STACK_COUNT)}
                    title="다음 스택"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <span className="px-2 text-xs text-muted-foreground">
                    Stack {stackIndex + 1} / {STACK_COUNT}
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
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {}}
                    title="초기화"
                  >
                    <RotateCcw className="w-4 h-4" />
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
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">타입</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">상태</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">수율</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">TSV 정렬도</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">본딩 품질</th>
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
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">
                          {layer.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={layer.status === "good" ? "default" : "outline"}
                          className={cn(
                            "text-xs",
                            layer.status === "good" && "bg-success text-success-foreground",
                            (layer.status === "warning" || layer.status === "defect") && "bg-warning text-warning-foreground border-warning"
                          )}
                        >
                          {layer.status === "good" ? "정상" : "주의"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">{layer.yield.toFixed(1)}%</td>
                      <td className="py-3 px-4 text-sm text-foreground">{layer.tsvAlignment.toFixed(1)}%</td>
                      <td className="py-3 px-4 text-sm text-foreground">{layer.bondingQuality.toFixed(1)}%</td>
                      <td className="py-3 px-4 text-sm text-foreground">{layer.temperature.toFixed(1)}°C</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

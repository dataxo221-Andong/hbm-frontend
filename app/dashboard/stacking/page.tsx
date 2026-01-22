"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { 
  Layers, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Info,
  TrendingUp,
  AlertTriangle,
  CheckCircle2
} from "lucide-react"
import { cn } from "@/lib/utils"

// HBM Stack Configuration
type LayerStatus = "good" | "defect" | "warning"

interface StackLayer {
  id: number
  name: string
  type: "DRAM" | "Logic" | "Base"
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
    const isBase = i === 1
    const isLogic = i === 2
    const rand = Math.random()
    
    let status: LayerStatus = "good"
    if (rand < 0.05) status = "defect"
    else if (rand < 0.15) status = "warning"

    layers.push({
      id: i,
      name: isBase ? "Base Die" : isLogic ? "Logic Die" : `DRAM Die ${i - 2}`,
      type: isBase ? "Base" : isLogic ? "Logic" : "DRAM",
      status,
      yield: isBase ? 99.2 : isLogic ? 98.5 : 94 + Math.random() * 5,
      tsvAlignment: 98 + Math.random() * 2,
      bondingQuality: 96 + Math.random() * 4,
      temperature: 75 + Math.random() * 10
    })
  }
  
  return layers
}

const STACK_CONFIGS = [
  { label: "HBM2 (4단)", value: "4", layers: 4 },
  { label: "HBM2E (8단)", value: "8", layers: 8 },
  { label: "HBM3 (12단)", value: "12", layers: 12 },
  { label: "HBM3E (16단)", value: "16", layers: 16 },
]

function StackVisualization3D({ 
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
    
    switch (layer.type) {
      case "DRAM":
        return "#3b82f6"
      case "Logic":
        return "#22c55e"
      case "Base":
        return "#f59e0b"
      default:
        return "#3b82f6"
    }
  }

  const centerX = 175
  const topY = 60

  return (
    <div className="relative w-full h-[450px] flex items-center justify-center overflow-hidden">
      {/* Isometric Stack Container - Top down view */}
      <svg 
        width="400" 
        height="450" 
        viewBox="0 0 350 400"
      >
        {/* Render from bottom to top so top layers appear on top */}
        {[...layers].reverse().map((layer, index) => {
          const isSelected = selectedLayer === layer.id
          const actualIndex = layers.length - 1 - index
          const yOffset = actualIndex * stackGap
          const isDefect = layer.status !== "good"
          const shouldHighlight = highlightDefects && isDefect
          const color = getLayerColor(layer, shouldHighlight)
          
          const baseY = topY + yOffset
          
          // Diamond/rhombus shape points
          const points = `
            ${centerX},${baseY}
            ${centerX + layerWidth},${baseY + layerHeight / 2}
            ${centerX},${baseY + layerHeight}
            ${centerX - layerWidth},${baseY + layerHeight / 2}
          `

          return (
            <g 
              key={layer.id}
              className="cursor-pointer"
              onClick={() => onSelectLayer(isSelected ? null : layer.id)}
            >
              <polygon
                points={points}
                fill={color}
                stroke={isSelected ? "#fff" : "rgba(0,0,0,0.3)"}
                strokeWidth={isSelected ? "3" : "1"}
                style={{
                  filter: isSelected ? "drop-shadow(0 0 15px rgba(255,255,255,0.5))" : "none",
                  transition: "all 0.3s ease"
                }}
              />
              
              {/* Highlight indicator for defects */}
              {shouldHighlight && (
                <circle
                  cx={centerX}
                  cy={baseY + layerHeight / 2}
                  r="8"
                  fill="#fff"
                  opacity="0.9"
                  className="animate-pulse"
                />
              )}
            </g>
          )
        })}
      </svg>

      {/* Layer Labels - positioned to the right */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 space-y-2">
        {layers.map((layer) => {
          const isSelected = selectedLayer === layer.id
          const isDefect = layer.status !== "good"
          const shouldHighlight = highlightDefects && isDefect
          const color = getLayerColor(layer, shouldHighlight)
          
          return (
            <div 
              key={layer.id}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-all",
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
}

function LayerDetailPanel({ layer }: { layer: StackLayer }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-foreground">{layer.name}</h4>
        <Badge
          variant={layer.status === "good" ? "default" : layer.status === "warning" ? "secondary" : "destructive"}
          className={cn(
            layer.status === "good" && "bg-success text-success-foreground"
          )}
        >
          {layer.status === "good" ? "정상" : layer.status === "warning" ? "주의" : "결함"}
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
}

function StackQualityGrade({ layers }: { layers: StackLayer[] }) {
  const goodLayers = layers.filter(l => l.status === "good").length
  const warningLayers = layers.filter(l => l.status === "warning").length
  const defectLayers = layers.filter(l => l.status === "defect").length
  const totalYield = layers.reduce((acc, l) => acc + l.yield, 0) / layers.length

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
}

export default function StackingVisualizationPage() {
  const [stackConfig, setStackConfig] = useState("8")
  const [rotationY, setRotationY] = useState(0) // Declare rotationY state
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null)
  const [expandedView, setExpandedView] = useState(false)
  const [highlightDefects, setHighlightDefects] = useState(true)

  const layers = useMemo(() => {
    const config = STACK_CONFIGS.find(c => c.value === stackConfig)
    return generateStackLayers(config?.layers || 8)
  }, [stackConfig])

  const selectedLayerData = selectedLayer ? layers.find(l => l.id === selectedLayer) : null

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">HBM 적층 구조</h2>
          <p className="text-sm text-muted-foreground">TSV 기반 3D 스택 시각화 및 품질 분석</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={stackConfig} onValueChange={setStackConfig}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="스택 구성" />
            </SelectTrigger>
            <SelectContent>
              {STACK_CONFIGS.map(config => (
                <SelectItem key={config.value} value={config.value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Visualization */}
        <div className="lg:col-span-2">
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
              <StackVisualization3D
                layers={layers}
                
                selectedLayer={selectedLayer}
                onSelectLayer={setSelectedLayer}
                expandedView={expandedView}
                highlightDefects={highlightDefects}
              />

              {/* Legend */}
              <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-sm bg-primary" />
                  <span className="text-muted-foreground">DRAM Die</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-sm bg-accent" />
                  <span className="text-muted-foreground">Logic Die</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-sm bg-muted border border-muted-foreground/50" />
                  <span className="text-muted-foreground">Base Die</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
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
          <CardDescription>각 레이어의 품질 지표 및 파라미터</CardDescription>
        </CardHeader>
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
                        variant={layer.status === "good" ? "default" : layer.status === "warning" ? "secondary" : "destructive"}
                        className={cn(
                          "text-xs",
                          layer.status === "good" && "bg-success text-success-foreground"
                        )}
                      >
                        {layer.status === "good" ? "정상" : layer.status === "warning" ? "주의" : "결함"}
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
      </Card>
    </div>
  )
}

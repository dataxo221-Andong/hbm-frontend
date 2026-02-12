"use client"

import React, { memo, useCallback } from "react"

import { useState, useRef, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Upload,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  RotateCcw,
  Eye,
  Download,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  BarChart3
} from "lucide-react"
import { cn } from "@/lib/utils"
import { WaferMapVisualization, WaferMapMini } from "@/components/wafer-map"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'

// Process flow steps
const PROCESS_STEPS = [
  { id: 1, name: "데이터 업로드", description: ".pkl 분석 데이터 입력" },
  { id: 2, name: "전처리", description: "노이즈 제거 및 정규화" },
  { id: 3, name: "결함 검출", description: "AI 기반 결함 탐지" },
  { id: 4, name: "분류", description: "Good/Bad Die 분류" },
  { id: 5, name: "등급 산정", description: "수율 및 등급 계산" },
]

// 웨이퍼 데이터 타입
interface WaferData {
  id: string
  batch: string
  status: "completed" | "processing" | "pending"
  yield: number | null
  grade: string | null
  processedAt?: string
  waferMapData?: { good: number; bad: number; total: number }
  defects?: Array<{ type: string; count: number; percent: number }>
  defectDensity?: number // Explicit field for list view
  imageUrl?: string // 웨이퍼 맵 이미지 URL (Firebase)
  confidence?: number // 신뢰도 (DB confidence 컬럼)
}

// Demo wafer data
const DEMO_WAFERS: WaferData[] = [
  {
    id: "WF-2024-001",
    batch: "B001",
    status: "completed",
    yield: 94.2,
    grade: "A",
    processedAt: "2024-01-15T10:30:00",
    waferMapData: { good: 962, bad: 62, total: 1024 },
    defects: [{ type: "Edge-Ring", count: 23, percent: 37 }]
  },
  {
    id: "WF-2024-002",
    batch: "B001",
    status: "completed",
    yield: 91.8,
    grade: "A",
    processedAt: "2024-01-15T11:15:00",
    waferMapData: { good: 940, bad: 84, total: 1024 },
    defects: [{ type: "Scratch", count: 30, percent: 36 }]
  },
  {
    id: "WF-2024-003",
    batch: "B001",
    status: "processing",
    yield: null,
    grade: null
  },
  {
    id: "WF-2024-004",
    batch: "B002",
    status: "pending",
    yield: null,
    grade: null
  },
  {
    id: "WF-2024-005",
    batch: "B002",
    status: "pending",
    yield: null,
    grade: null
  },
]

const ProcessFlow = memo(function ProcessFlow({ currentStep, isProcessing }: { currentStep: number; isProcessing: boolean }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {PROCESS_STEPS.map((step, index) => {
        const isCompleted = step.id < currentStep
        const isCurrent = step.id === currentStep
        const isActive = isCompleted || isCurrent

        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 min-w-[160px]",
                isCompleted && "bg-success/20 border border-success/40",
                isCurrent && isProcessing && "bg-primary/20 border border-primary/40 animate-pulse",
                isCurrent && !isProcessing && "bg-primary/10 border border-primary/30",
                !isActive && "bg-muted/30 border border-transparent"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
                  isCompleted && "bg-success text-success-foreground",
                  isCurrent && isProcessing && "bg-primary text-primary-foreground",
                  isCurrent && !isProcessing && "bg-primary/50 text-primary-foreground",
                  !isActive && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isCurrent && isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="text-xs font-medium">{step.id}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "text-xs font-medium truncate",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.name}
                </div>
                <div className="text-xs text-muted-foreground truncate hidden sm:block">
                  {step.description}
                </div>
              </div>
            </div>
            {index < PROCESS_STEPS.length - 1 && (
              <div className={cn(
                "w-8 h-0.5 mx-1 transition-all duration-300 flex-shrink-0",
                isCompleted ? "bg-success" : "bg-muted"
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
})

// 정렬 타입 정의
type SortField = 'id' | 'status' | 'yield' | 'grade'
type SortDirection = 'asc' | 'desc' | null

// 테이블 헤더 컴포넌트
const TableHeader = memo(function TableHeader({
  field,
  label,
  sortField,
  sortDirection,
  onSort
}: {
  field: SortField
  label: string
  sortField: SortField | null
  sortDirection: SortDirection
  onSort: (field: SortField) => void
}) {
  const isActive = sortField === field

  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        <div className="flex flex-col">
          {isActive && sortDirection === 'asc' ? (
            <ArrowUp className="w-3 h-3 text-primary" />
          ) : isActive && sortDirection === 'desc' ? (
            <ArrowDown className="w-3 h-3 text-primary" />
          ) : (
            <ArrowUpDown className="w-3 h-3 text-muted-foreground opacity-50" />
          )}
        </div>
      </div>
    </th>
  )
})

// 상태 뱃지 컴포넌트
const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    completed: { label: '완료', className: 'bg-success text-success-foreground' },
    processing: { label: '처리중', className: 'bg-yellow-500 text-yellow-foreground' },
    pending: { label: '대기', className: 'bg-muted text-muted-foreground' },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

  return (
    <Badge className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  )
})

// 등급 뱃지 컴포넌트
const GradeBadge = memo(function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade) return <span className="text-muted-foreground">-</span>

  const gradeConfig: Record<string, { className: string }> = {
    'A': { className: 'bg-green-500 text-white' },
    'B': { className: 'bg-blue-500 text-white' },
    'C': { className: 'bg-yellow-500 text-white' },
    'F': { className: 'bg-red-500 text-white' },
  }

  const config = gradeConfig[grade] || { className: 'bg-muted text-muted-foreground' }

  return (
    <Badge className={cn("font-bold min-w-[2rem] justify-center", config.className)}>
      {grade}
    </Badge>
  )
})

// 웨이퍼 썸네일 카드 컴포넌트 (Image Strip용)
const WaferThumbnailCard = memo(function WaferThumbnailCard({
  wafer,
  isSelected,
  onClick
}: {
  wafer: WaferData
  isSelected: boolean
  onClick: () => void
}) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "-"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      })
    } catch {
      return "-"
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex-shrink-0 w-[180px] rounded-lg border-2 transition-all cursor-pointer",
        "bg-card hover:bg-accent/50",
        isSelected
          ? "border-primary shadow-lg shadow-primary/20"
          : "border-border hover:border-primary/50"
      )}
    >
      <div className="p-3 space-y-2">
        {/* 웨이퍼 맵 썸네일 */}
        <div className="relative aspect-square w-full rounded-md overflow-hidden bg-muted/30 border border-border">
          {wafer.status === "completed" && wafer.imageUrl ? (
            <img
              src={wafer.imageUrl}
              alt={wafer.id}
              className="w-full h-full object-cover"
            />
          ) : wafer.status === "processing" ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-xs text-muted-foreground">대기 중</div>
            </div>
          )}
        </div>

        {/* 웨이퍼 정보 */}
        <div className="space-y-1">
          <div className="font-medium text-sm text-foreground truncate">
            {wafer.id}
          </div>
          {wafer.status === "completed" && wafer.defectDensity !== undefined ? (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">결함 밀도</span>
                <span className="font-semibold text-foreground">{wafer.defectDensity.toFixed(2)}%</span>
              </div>
              {wafer.grade && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">등급</span>
                  <GradeBadge grade={wafer.grade} />
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-muted-foreground">
              {wafer.status === "processing" ? "분석 중..." : "대기 중"}
            </div>
          )}
          <div className="text-[10px] text-muted-foreground pt-1">
            {formatDate(wafer.processedAt)}
          </div>
        </div>
      </div>
    </div>
  )
})

// 웨이퍼 리스트 내비게이션 (Image Strip)
const WaferListNavigation = memo(function WaferListNavigation({
  wafers,
  selectedWaferId,
  onWaferSelect
}: {
  wafers: WaferData[]
  selectedWaferId: string | null
  onWaferSelect: (waferId: string) => void
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // 완료된 웨이퍼만 필터링
  const completedWafers = wafers.filter(w => w.status === "completed")

  // 선택된 웨이퍼 중심으로 10개만 표시
  const getDisplayWafers = () => {
    if (!selectedWaferId || completedWafers.length === 0) {
      return completedWafers.slice(0, 10)
    }

    const selectedIndex = completedWafers.findIndex(w => w.id === selectedWaferId)
    if (selectedIndex === -1) {
      return completedWafers.slice(0, 10)
    }

    // 선택된 웨이퍼를 중심으로 앞뒤 5개씩
    const start = Math.max(0, selectedIndex - 5)
    const end = Math.min(completedWafers.length, start + 10)

    // 만약 끝에 도달해서 10개가 안되면 시작점 조정
    const adjustedStart = Math.max(0, end - 10)

    return completedWafers.slice(adjustedStart, end)
  }

  const displayWafers = getDisplayWafers()

  // 스크롤 가능 여부 확인
  const checkScrollability = useCallback(() => {
    if (!scrollContainerRef.current) return

    const container = scrollContainerRef.current
    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    )
  }, [])

  // 스크롤 이벤트 리스너
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    checkScrollability()
    container.addEventListener('scroll', checkScrollability)
    window.addEventListener('resize', checkScrollability)

    return () => {
      container.removeEventListener('scroll', checkScrollability)
      window.removeEventListener('resize', checkScrollability)
    }
  }, [checkScrollability, completedWafers.length])

  // 선택된 카드가 보이도록 스크롤 위치 조정
  useEffect(() => {
    if (!selectedWaferId || !scrollContainerRef.current) return

    const cardElement = cardRefs.current.get(selectedWaferId)
    const container = scrollContainerRef.current

    if (cardElement) {
      const cardRect = cardElement.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      // 카드가 컨테이너 왼쪽 밖에 있으면
      if (cardRect.left < containerRect.left) {
        container.scrollTo({
          left: container.scrollLeft + (cardRect.left - containerRect.left) - 20, // 20px 여유 공간
          behavior: 'smooth'
        })
      }
      // 카드가 컨테이너 오른쪽 밖에 있으면
      else if (cardRect.right > containerRect.right) {
        container.scrollTo({
          left: container.scrollLeft + (cardRect.right - containerRect.right) + 20, // 20px 여유 공간
          behavior: 'smooth'
        })
      }
    }
  }, [selectedWaferId])

  // 좌우 스크롤 함수
  const scrollLeft = useCallback(() => {
    if (!scrollContainerRef.current) return
    const container = scrollContainerRef.current
    const cardWidth = 180 + 12 // 카드 너비 + gap
    // 컨테이너 너비의 약 80%만큼 스크롤
    const scrollAmount = container.clientWidth * 0.8
    container.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth'
    })
  }, [])

  const scrollRight = useCallback(() => {
    if (!scrollContainerRef.current) return
    const container = scrollContainerRef.current
    const cardWidth = 180 + 12 // 카드 너비 + gap
    // 컨테이너 너비의 약 80%만큼 스크롤
    const scrollAmount = container.clientWidth * 0.8
    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    })
  }, [])

  if (completedWafers.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">분석 완료된 웨이퍼가 없습니다.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">웨이퍼 선택</CardTitle>
        <CardDescription className="text-xs">
          웨이퍼를 클릭하여 상세 분석 결과를 확인하세요
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="relative">
          {/* 왼쪽 화살표 버튼 */}
          {canScrollLeft && (
            <Button
              variant="outline"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm shadow-md hover:bg-background"
              onClick={scrollLeft}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}

          {/* 오른쪽 화살표 버튼 */}
          {canScrollRight && (
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm shadow-md hover:bg-background"
              onClick={scrollRight}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}

          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-thin scroll-smooth px-1"
            style={{ scrollbarWidth: 'thin' }}
          >
            <div className="flex gap-3 pb-2">
              {displayWafers.map((wafer) => (
                <div
                  key={wafer.id}
                  ref={(el) => {
                    if (el) {
                      cardRefs.current.set(wafer.id, el)
                    } else {
                      cardRefs.current.delete(wafer.id)
                    }
                  }}
                >
                  <WaferThumbnailCard
                    wafer={wafer}
                    isSelected={selectedWaferId === wafer.id}
                    onClick={() => onWaferSelect(wafer.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

// 대시보드 상단 통계 데이터 타입
// 대시보드 상단 통계 데이터 타입 (수정됨)
interface DashboardStats {
  totalWafers: number
  totalDie: number      // 추출 가능한 칩 수 (die_count 합계)
  defectCount: number   // 불량 칩 수 (defect_count 합계)
  defectDensity: number // 결함 밀도
}

const ClassificationStats = memo(function ClassificationStats({ stats }: { stats: DashboardStats | null }) {
  // 초기 로딩 중이거나 데이터가 없을 때를 위한 기본값 (Backend 응답 불일치 대비 안전하게 처리)
  const safeStats = {
    totalWafers: stats?.totalWafers ?? 0,
    totalDie: stats?.totalDie ?? 0,
    defectCount: stats?.defectCount ?? 0,
    defectDensity: stats?.defectDensity ?? 0
  }

  const statItems = [
    { label: "총 분석 웨이퍼", value: safeStats.totalWafers.toLocaleString(), color: "text-foreground" },
    { label: "추출 가능한 칩 수", value: safeStats.totalDie.toLocaleString(), color: "text-success" },
    { label: "불량 칩 수", value: safeStats.defectCount.toLocaleString(), color: "text-destructive" },
    { label: "결함 밀도", value: `${safeStats.defectDensity.toFixed(2)}%`, color: "text-destructive" },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="py-2 px-4">
            <div className="text-xs text-muted-foreground">{stat.label}</div>
            <div className={cn("text-3xl font-bold mt-1", stat.color)}>{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
})

interface AnalysisResult {
  waferId: string
  yield: number
  grade: string
  goodDie: number
  badDie: number
  defects: Array<{ type: string; count: number; percent: number }>
  processedAt: string
  imageUrl?: string // Analysis Result에도 이미지 URL 추가
  confidence?: number // 신뢰도
  defectDensity?: number // 결함 밀도
}

// 결함 패턴 분석 데이터
interface PatternAnalysis {
  phenomenon: string;
  engineerGuide: string;
}

const PATTERN_ANALYSIS: Record<string, PatternAnalysis> = {
  'Center': {
    phenomenon: "웨이퍼 중심부에 결함이 집중적으로 발생.\n가스 분사나 코팅 공정의 중심부 편향을 시사.",
    engineerGuide: "[CVD/PVD] 점검 : 인젝터 노즐 막힘 점검. 센터 가스 유량 확인.\n[Spin-Coater] 점검 : 노즐 정렬 불량 및 토출 압력 재설정."
  },
  'Donut': {
    phenomenon: "중심부와 가장자리를 제외한 중간 영역에 고리 형태의 결함 발생.\n온도 분포나 압력 불균형을 의심.",
    engineerGuide: "[CMP] 점검 : 리테이너 링 압력 불균형 점검. 슬러리 라인 편심 조사.\n[Chiller] 점검 : 척 내부 냉각수 순환 및 온도 편차 확인."
  },
  'Edge-Loc': {
    phenomenon: "웨이퍼 가장자리 특정 지점에 결함 집중 발생.\n이송 장치나 엣지 노광 설정 문제를 시사.",
    engineerGuide: "[Litho] 점검 : 엣지 노출(WEE) 설정치 확인.\n[Track] 점검 : 이송 핑거 오염 및 물리적 간섭 점검. 핀 부위 오염 확인."
  },
  'Edge-Ring': {
    phenomenon: "웨이퍼 가장자리 전체에 테두리 형태의 결함 발생.\n식각 공정의 플라즈마 밀도 변화나 세정 불량을 의심.",
    engineerGuide: "[Etch] 점검 : 포커스 링 소모 상태 점검. 플라즈마 밀도 변화 확인.\n[Cleaning] 점검 : 베벨 세정액 농도 및 노즐 각도 조정."
  },
  'Loc': {
    phenomenon: "웨이퍼 특정 국소 부위에 결함 군집 발생.\n마스크 오염이나 노광 포커스 오류를 시사.",
    engineerGuide: "[Photo] 점검 : 레티클 파티클 부착 확인. 펠리클 손상 검사.\n[Stepper] 점검 : 특정 샷 구간 포커스 오프셋 정밀 점검."
  },
  'Random': {
    phenomenon: "웨이퍼 전면에 무작위로 산포된 결함 발생.\n환경 오염이나 공급 라인 오염을 의심.",
    engineerGuide: "[Environment] 점검 : 클린룸 필터 파손 여부 확인. 파티클 발생원 추적.\n[Water] 점검 : 초순수 라인 필터 및 배관 오염 조사."
  },
  'Scratch': {
    phenomenon: "웨이퍼 표면에 직선 또는 곡선 형태의 선형 결함 발생.\n이송 로봇이나 핸들링 장치의 물리적 접촉을 시사.",
    engineerGuide: "[Transfer] 점검 : 로봇 암 진동 수치 확인. 엔드이펙터 패드 마모 점검.\n[Cassette] 점검 : 웨이퍼 슬롯 간격 및 정렬 상태 확인."
  },
  'Near-full': {
    phenomenon: "웨이퍼 전면에 걸쳐 대규모 결함 발생.\n공정 중단이나 설비 전원/진공 시스템 이상을 시사.",
    engineerGuide: "[Power] 점검 : 메인 RF Power 차단 이력 확인. 아크 발생 여부 조사.\n[Vacuum] 점검 : 챔버 리크 및 진공 펌프 가동 상태 점검."
  },
  'None': {
    phenomenon: "특이 불량 패턴이 검출되지 않음.\n공정 상태가 양호한 것으로 판단.",
    engineerGuide: "정상 공정 유지. 이전 런(Run) 데이터와의 연속성 및 골든 웨이퍼 관리 상태 확인."
  }
}

// 클라이언트에서만 날짜 포맷팅하는 컴포넌트
const ProcessedAtDisplay = memo(function ProcessedAtDisplay({ processedAt }: { processedAt: string }) {
  const [formattedDate, setFormattedDate] = useState<string>(processedAt.split('T')[0])

  useEffect(() => {
    setFormattedDate(new Date(processedAt).toLocaleString("ko-KR"))
  }, [processedAt])

  return (
    <div className="p-4 rounded-lg bg-muted/50">
      <div className="text-sm text-muted-foreground">분석 일시</div>
      <div className="text-lg font-bold text-foreground mt-1">
        {formattedDate}
      </div>
    </div>
  )
})

export default function WaferModelingPage() {
  const [activeTab, setActiveTab] = useState("upload")
  const [currentStep, setCurrentStep] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedWafer, setSelectedWafer] = useState<string | null>(null)
  const [wafers, setWafers] = useState<WaferData[]>([])
  const [sessionWafers, setSessionWafers] = useState<WaferData[]>([]) // 이번 세션에서 분석된 웨이퍼들
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [showResultModal, setShowResultModal] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [waferMapStats, setWaferMapStats] = useState<{ good: number; bad: number; total: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 정렬 상태
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [totalItems, setTotalItems] = useState(0)
  const [jumpPage, setJumpPage] = useState("")

  // 패턴 분석 탭 상태
  const [patternTab, setPatternTab] = useState<'phenomenon' | 'guide'>('phenomenon')
  const [isInsightLoading, setIsInsightLoading] = useState(false)


  // 웨이퍼 데이터 가져오기 (DB 연동)
  // [추가] 이미지 프리로딩 (Preloading)
  useEffect(() => {
    if (wafers.length > 0) {
      wafers.forEach(wafer => {
        if (wafer.imageUrl) {
          const img = new Image()
          img.src = wafer.imageUrl
        }
      })
    }
  }, [wafers])

  const fetchWafers = useCallback(async (pageNum: number) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://3.39.251.229:5000'
      const res = await fetch(`${API_URL}/wafer/list?page=${pageNum}&limit=${itemsPerPage}`)
      if (res.ok) {
        const data = await res.json()

        console.log('[DEBUG] Backend response:', data.wafers.slice(0, 3)) // 처음 3개만 로그

        const mappedWafers: WaferData[] = data.wafers.map((w: any) => ({
          id: w.lot_name,
          batch: "BATCH",
          status: "completed",
          // DB 값을 그대로 사용 (프론트엔드 자체 계산 제거)
          yield: w.die_count > 0 ? parseFloat(((1 - w.defect_density) * 100).toFixed(1)) : 0,
          grade: w.total_grade || '등급 없음',
          processedAt: w.created_at, // 이미 백엔드에서 포맷팅된 문자열
          waferMapData: {
            good: w.die_count - w.defect_count,
            bad: w.defect_count,
            total: w.die_count
          },
          defects: [{ type: w.failure_type, count: w.defect_count, percent: w.confidence ? w.confidence * 100 : 0 }],
          imageUrl: w.wafer_map,
          defectDensity: w.defect_density ? parseFloat((w.defect_density * 100).toFixed(2)) : 0,
          confidence: w.confidence ? w.confidence * 100 : 0
        }))

        console.log('[DEBUG] Mapped wafers:', mappedWafers.slice(0, 3)) // 처음 3개만 로그

        setWafers(mappedWafers)
        setTotalItems(data.total)
      }
    } catch (error) {
      console.error("Failed to fetch wafers:", error)
    }
  }, [itemsPerPage])

  // 페이지 변경 시 데이터 로드
  useEffect(() => {
    fetchWafers(currentPage)
  }, [currentPage, fetchWafers])

  // 분석 결과 탭에서 선택된 웨이퍼 (Image Strip용)
  const [selectedResultWaferId, setSelectedResultWaferId] = useState<string | null>(null)

  // 배치 분석 결과 모달 상태
  const [showBatchResultModal, setShowBatchResultModal] = useState(false)
  const [batchAnalysisResults, setBatchAnalysisResults] = useState<AnalysisResult[]>([])
  const [batchProcessedAt, setBatchProcessedAt] = useState<string>("")

  // [추가] 전체 통계 상태
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)

  // [추가] 초기 로드 시 전체 통계 가져오기
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://3.39.251.229:5000'
        const res = await fetch(`${API_URL}/wafer/total_status`)
        if (res.ok) {
          const data = await res.json()
          setDashboardStats(data)
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error)
      }
    }
    fetchStats()
  }, []) // Mount 시 1회 호출

  // 이미지 미리보기 URL 생성
  useEffect(() => {
    const urls: string[] = []
    uploadedFiles.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        urls.push(url)
      } else {
        urls.push('')
      }
    })
    setPreviewUrls(urls)

    // Cleanup: 컴포넌트 언마운트 시 URL 해제
    return () => {
      urls.forEach((url) => {
        if (url) URL.revokeObjectURL(url)
      })
    }
  }, [uploadedFiles])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setUploadedFiles(prev => [...prev, ...Array.from(files)])
      setCurrentStep(1)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files) {
      setUploadedFiles(prev => [...prev, ...Array.from(files)])
      setCurrentStep(1)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const startProcessing = useCallback(async () => {
    // Real API Call
    try {
      if (uploadedFiles.length === 0) return

      setIsProcessing(true)

      const formData = new FormData()
      // 다중 파일 추가
      uploadedFiles.forEach(file => {
        formData.append('wafer_image', file)
      })

      // Step 1: Uploading
      setCurrentStep(1)

      console.log('Current NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://3.39.251.229:5000'

      // [Step 1] Upload: 접수 및 ID 발급 (일괄 업로드)
      const uploadResponse = await fetch(`${API_URL}/wafer/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${uploadResponse.statusText}`)
      }

      const uploadData = await uploadResponse.json()
      const lotNames: string[] = uploadData.lot_names
      const batchId = uploadData.batchId

      // 개별 로트 순차 분석
      let lastResult: AnalysisResult | null = null
      const batchResults: AnalysisResult[] = []

      for (let i = 0; i < lotNames.length; i++) {
        const lotName = lotNames[i]

        // [Step 2] Processing Animation
        setCurrentStep(3)

        // [Step 3] Analyze: 실제 분석 수행
        const analyzeResponse = await fetch(`${API_URL}/wafer/${lotName}/analyze?batch_id=${batchId}`, {
          method: 'POST'
        })

        if (!analyzeResponse.ok) {
          console.error(`Analysis failed for ${lotName}`)
          continue // 실패해도 다음거 계속 진행
        }

        const analyzeData = await analyzeResponse.json()
        const resultData = analyzeData.result

        // Map Backend Response to UI Model
        const totalDie = resultData.die_count || 1024
        const goodDieCount = totalDie - (resultData.defect_count || 0)
        const badDieCount = resultData.defect_count || 0
        const yieldVal = totalDie > 0
          ? parseFloat(((goodDieCount / totalDie) * 100).toFixed(1))
          : 0

        const result: AnalysisResult = {
          waferId: analyzeData.lotName,
          yield: yieldVal,
          grade: resultData.total_grade || '등급 없음', // null 처리
          goodDie: goodDieCount,
          badDie: badDieCount,
          defects: [
            { type: resultData.failure_type || 'None', count: badDieCount, percent: resultData.confidence ? resultData.confidence * 100 : 0 }
          ],
          processedAt: new Date().toISOString(),
          imageUrl: analyzeData.img_url,
          confidence: resultData.confidence ? resultData.confidence * 100 : 0, // 신뢰도 백분율
          defectDensity: resultData.defect_density ? parseFloat((resultData.defect_density * 100).toFixed(2)) : 0 // 결함 밀도 백분율
        }

        // 배치 결과에 추가
        batchResults.push(result)

        // 프론트엔드 임시 업데이트 로직 삭제 (DB 데이터 불일치 방지)
        // setWafers(prev => [newWafer, ...prev])
        // setSessionWafers(prev => [newWafer, ...prev])

        // 첫 번째 완료된 웨이퍼를 자동으로 선택
        if (!selectedResultWaferId) {
          setSelectedResultWaferId(result.waferId)
        }

        lastResult = result
        // 다음 분석 전 살짝 대기
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // 모든 분석 완료 후 DB에서 최신 목록 다시 불러오기 (가짜 데이터 방지)
      await fetchWafers(1)
      setCurrentPage(1)

      // 배치 분석 결과 모달 표시
      if (batchResults.length > 0) {
        // 이번 배치 결과만 표시하도록 수정 (기존 데이터 합치지 않음)
        setBatchAnalysisResults(batchResults)
        setBatchProcessedAt(new Date().toISOString())
        setShowBatchResultModal(true)
      }

      if (lastResult) {
        setAnalysisResult(lastResult)
        setWaferMapStats({
          good: lastResult.goodDie,
          bad: lastResult.badDie,
          total: lastResult.goodDie + lastResult.badDie
        })
      }

      setCurrentStep(PROCESS_STEPS.length + 1)
      setIsProcessing(false)

    } catch (error) {
      console.error("Analysis Failed:", error)
      alert(`분석 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`)
      setIsProcessing(false)
      setCurrentStep(0)
    }
  }, [uploadedFiles, wafers, selectedResultWaferId])

  const resetProcess = useCallback(() => {
    setCurrentStep(0)
    setIsProcessing(false)
    setUploadedFiles([])
    setAnalysisResult(null)
    setSessionWafers([])
    setBatchAnalysisResults([])
    // previewUrls는 useEffect의 cleanup에서 자동으로 정리됨
  }, [])

  const closeResultModal = useCallback(() => {
    setShowResultModal(false)
    setCurrentStep(0)
    setUploadedFiles([])
  }, [])

  // 배치 결과 리포트 -> 종합 분석 인사이트 (DB 데이터 기반, 최근 100개)
  const handleShowInsight = useCallback(async () => {
    try {
      setIsInsightLoading(true)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://3.39.251.229:5000'

      // 최근 100개 데이터 요청 (독립적 호출, 웨이퍼 목록 탭 영향 없음)
      const res = await fetch(`${API_URL}/wafer/list?page=1&limit=100`)
      if (!res.ok) throw new Error("Failed to fetch insight data")

      const data = await res.json()

      if (!data.wafers || data.wafers.length === 0) {
        alert("분석 완료된 웨이퍼 데이터가 없습니다.")
        return
      }

      // DB 데이터 -> AnalysisResult 변환
      const results: AnalysisResult[] = data.wafers.map((w: any) => ({
        waferId: w.lot_name,
        yield: w.die_count > 0 ? parseFloat(((1 - w.defect_density) * 100).toFixed(1)) : 0,
        grade: w.total_grade || '등급 없음',
        goodDie: w.die_count - w.defect_count,
        badDie: w.defect_count,
        defects: [{
          type: w.failure_type || 'None',
          count: w.defect_count,
          percent: w.confidence ? w.confidence * 100 : 0
        }],
        processedAt: w.created_at,
        imageUrl: w.wafer_map,
        confidence: w.confidence ? w.confidence * 100 : 0,
        defectDensity: w.defect_density ? parseFloat((w.defect_density * 100).toFixed(2)) : 0
      }))

      setBatchAnalysisResults(results)
      // 분석 시각은 현재 시각
      setBatchProcessedAt(new Date().toISOString())
      setShowBatchResultModal(true)
    } catch (error) {
      console.error("Insight fetch error:", error)
      alert("데이터를 불러오는 중 오류가 발생했습니다.")
    } finally {
      setIsInsightLoading(false)
    }
  }, [])

  const handleWaferView = useCallback((waferId: string) => {
    setSelectedWafer(waferId)

    // 웨이퍼 데이터를 찾아서 단일 웨이퍼 결과 모달 표시
    const wafer = wafers.find(w => w.id === waferId && w.status === "completed")
    if (wafer && wafer.yield !== null && wafer.waferMapData) {
      const result: AnalysisResult = {
        waferId: wafer.id,
        yield: wafer.yield,
        grade: wafer.grade || '등급 없음',
        goodDie: wafer.waferMapData.good,
        badDie: wafer.waferMapData.bad,
        defects: wafer.defects || [],
        processedAt: wafer.processedAt || new Date().toISOString(),
        imageUrl: wafer.imageUrl, // Pass imageUrl
        confidence: wafer.confidence || 0,
        defectDensity: wafer.defectDensity || 0
      }
      setAnalysisResult(result)
      setWaferMapStats(wafer.waferMapData)
      setShowResultModal(true)
    }
  }, [wafers])

  // 목록에서 웨이퍼 클릭 시 분석 결과 탭으로 이동
  const handleWaferClick = useCallback((wafer: WaferData) => {
    if (wafer.status === "completed") {
      setSelectedResultWaferId(wafer.id)
      if (wafer.waferMapData) {
        setWaferMapStats(wafer.waferMapData)
      }
      setActiveTab("results")
    }
  }, [])

  // Excel 내보내기 함수
  const handleExportExcel = useCallback(async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://3.39.251.229:5000'
      const response = await fetch(`${API_URL}/wafer/export`)

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `wafer_data_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.xlsx`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '').trim()
        }
      }

      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Excel export failed:', error)
      alert('엑셀 내보내기에 실패했습니다.')
    }
  }, [])

  // 정렬 핸들러
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      // 같은 필드 클릭 시 방향 전환
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortField(null)
        setSortDirection(null)
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }, [sortField, sortDirection])

  // 정렬된 웨이퍼 목록
  const sortedWafers = useMemo(() => {
    if (!sortField || !sortDirection) return wafers

    return [...wafers].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'id':
          aValue = a.id
          bValue = b.id
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'yield':
          aValue = a.yield ?? 0
          bValue = b.yield ?? 0
          break
        case 'grade':
          aValue = a.grade ?? ''
          bValue = b.grade ?? ''
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [wafers, sortField, sortDirection])

  // 페이지네이션된 웨이퍼 목록 (서버 사이드 페이지네이션이므로 그대로 반환)
  const paginatedWafers = useMemo(() => {
    return sortedWafers
  }, [sortedWafers])

  // 총 페이지 수
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  // 정렬 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [sortField, sortDirection])

  // 선택된 웨이퍼 데이터 가져오기
  const selectedWaferData = useMemo(() => {
    if (!selectedResultWaferId) return null
    return wafers.find(w => w.id === selectedResultWaferId && w.status === "completed") || null
  }, [wafers, selectedResultWaferId])

  // 웨이퍼 선택 핸들러 (Image Strip용)
  const handleWaferSelect = useCallback((waferId: string) => {
    setSelectedResultWaferId(waferId)
    const wafer = wafers.find(w => w.id === waferId)
    if (wafer && wafer.waferMapData) {
      setWaferMapStats(wafer.waferMapData)
    }
  }, [wafers])

  // 선택된 웨이퍼 데이터로 분석 결과 업데이트
  useEffect(() => {
    if (selectedWaferData && selectedWaferData.waferMapData) {
      setWaferMapStats(selectedWaferData.waferMapData)
    }
  }, [selectedWaferData])

  // 초기 로드 시 첫 번째 완료된 웨이퍼 자동 선택
  useEffect(() => {
    if (!selectedResultWaferId) {
      const firstCompleted = wafers.find(w => w.status === "completed")
      if (firstCompleted) {
        setSelectedResultWaferId(firstCompleted.id)
      }
    }
  }, [wafers, selectedResultWaferId])

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <ClassificationStats stats={dashboardStats} />

      {/* Process Flow */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>웨이퍼 분석 공정 플로우</CardTitle>
              <CardDescription>.pkl 분석 데이터를 업로드하고 AI 기반 분류를 시작하세요</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowInsight}
                className="bg-primary/10 hover:bg-primary/20 border-primary/50 text-primary"
                disabled={isInsightLoading}
              >
                {isInsightLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="w-4 h-4 mr-2" />
                )}
                종합 분석 인사이트
              </Button>
              <Button variant="outline" size="sm" onClick={resetProcess} disabled={isProcessing}>
                <RotateCcw className="w-4 h-4 mr-2" />
                초기화
              </Button>
              <Button
                size="sm"
                onClick={startProcessing}
                disabled={isProcessing || uploadedFiles.length === 0}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    분석 시작
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ProcessFlow currentStep={currentStep} isProcessing={isProcessing} />
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">파일 업로드</TabsTrigger>
          <TabsTrigger value="wafers">웨이퍼 목록</TabsTrigger>
          <TabsTrigger value="results">분석 결과</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pkl,.png,.jpg,.jpeg,.tiff,.bmp,image/*"
                multiple
                className="hidden"
              />
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer",
                  uploadedFiles.length > 0
                    ? "border-primary/50 bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  분석 데이터 업로드
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  .pkl (pickle) 파일을 드래그 앤 드롭하거나 클릭하여 업로드하세요
                </p>
                <Button variant="outline" className="bg-transparent">
                  파일 선택
                </Button>
              </div>

              {/* Uploaded Files List - 이미지 미리보기 포함 */}
              {uploadedFiles.length > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground">
                      업로드된 파일 ({uploadedFiles.length}개)
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetProcess}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      전체 삭제
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-3 w-fit">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="relative group rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors overflow-hidden w-32 flex-shrink-0"
                      >
                        {previewUrls[index] ? (
                          <div className="relative aspect-square bg-muted w-full">
                            <img
                              src={previewUrls[index]}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/0 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-2">
                              <div className="text-xs font-medium text-foreground truncate">
                                {file.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                <Upload className="w-6 h-6 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">
                                  {file.name}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 bg-background/80 hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            // 미리보기 URL 정리
                            if (previewUrls[index]) {
                              URL.revokeObjectURL(previewUrls[index])
                            }
                            setUploadedFiles(prev => {
                              const newFiles = prev.filter((_, i) => i !== index)
                              if (newFiles.length === 0) {
                                setCurrentStep(0)
                              }
                              return newFiles
                            })
                            setPreviewUrls(prev => prev.filter((_, i) => i !== index))
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-foreground">지원 형식</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, TIFF, BMP, PKL
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-foreground">최대 파일 크기</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      1GB per file
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-foreground">배치 업로드</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      최대 10,000장 동시 처리
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wafers" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-foreground">웨이퍼 목록</h3>
              <p className="text-sm text-muted-foreground">분석 대기 및 완료된 웨이퍼 목록</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download className="w-4 h-4 mr-2" />
              결과 내보내기
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <TableHeader
                        field="id"
                        label="웨이퍼 ID"
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        불량 패턴
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        칩 수
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        결함 밀도
                      </th>
                      <TableHeader
                        field="grade"
                        label="종합 등급"
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        검사 일시
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedWafers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          웨이퍼 데이터가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      paginatedWafers.map((wafer) => (
                        <tr
                          key={wafer.id}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => handleWaferClick(wafer)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-medium text-foreground">{wafer.id}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {wafer.defects && wafer.defects.length > 0 ? (
                              <Badge variant="outline" className="text-xs">
                                {wafer.defects[0].type}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                            {wafer.waferMapData?.total.toLocaleString() ?? '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                            {wafer.yield !== null ? `${(100 - wafer.yield).toFixed(2)}%` : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <GradeBadge grade={wafer.grade} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                            {wafer.processedAt ? wafer.processedAt.replace('T', ' ').split('.')[0] : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {totalPages > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    전체 {totalItems}개 중 {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)}개 표시
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <div className="flex items-center gap-2 mx-2">
                      <span className="text-sm text-muted-foreground">Page</span>
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={jumpPage}
                        onChange={(e) => setJumpPage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const page = parseInt(jumpPage)
                            if (page >= 1 && page <= totalPages) {
                              setCurrentPage(page)
                              setJumpPage("")
                            }
                          }
                        }}
                        placeholder={currentPage.toString()}
                        className="w-12 h-8 px-2 text-center text-sm border rounded-md bg-background"
                      />
                      <span className="text-sm text-muted-foreground">of {totalPages}</span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {/* 웨이퍼 리스트 내비게이션 (Image Strip) */}
          <WaferListNavigation
            wafers={wafers}
            selectedWaferId={selectedResultWaferId}
            onWaferSelect={handleWaferSelect}
          />

          {/* 선택된 웨이퍼가 없을 때 안내 메시지 */}
          {!selectedResultWaferId || !selectedWaferData ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-muted-foreground">
                  <p className="text-sm">위에서 웨이퍼를 선택하여 분석 결과를 확인하세요.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Wafer Map Visualization */}
              <Card className="md:col-span-1 bg-card border-border h-full">
                <CardHeader>
                  <CardTitle>웨이퍼 맵 (Wafer Map)</CardTitle>
                  <CardDescription>
                    {selectedWaferData.id} 분석 결과
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center min-h-[400px]">
                  {waferMapStats && (
                    <div className="w-full max-w-sm">
                      <WaferMapVisualization
                        waferStats={waferMapStats}
                        imageUrl={selectedWaferData.imageUrl}
                        confidence={selectedWaferData.confidence}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Right Column: Analysis Detail & Guidelines */}
              <Card>
                <CardHeader>
                  <CardTitle>분류 결과 상세</CardTitle>
                  <CardDescription>{selectedWaferData.id} 분석 결과</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success" />
                        <span className="font-medium text-foreground">Good Die</span>
                      </div>
                      <span className="text-lg font-bold text-success">
                        {waferMapStats?.good ?? 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-destructive" />
                        <span className="font-medium text-foreground">Bad Die</span>
                      </div>
                      <span className="text-lg font-bold text-destructive">
                        {waferMapStats?.bad ?? 0}
                      </span>
                    </div>

                    {/* 총합 표시 */}
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium text-foreground">총 다이 개수</span>
                      <span className="text-lg font-bold text-foreground">
                        {waferMapStats?.total ?? 0}
                      </span>
                    </div>

                    {/* 결함 밀도, 신뢰도 및 등급 */}
                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                      <div className="p-3 bg-destructive/10 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">결함 밀도</div>
                        <div className="text-2xl font-bold text-destructive">
                          {selectedWaferData.defectDensity?.toFixed(2) ?? '0.00'}%
                        </div>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">신뢰도</div>
                        <div className="text-2xl font-bold text-primary">
                          {selectedWaferData.confidence?.toFixed(1) ?? '0.0'}%
                        </div>
                      </div>
                      <div className="p-3 bg-success/10 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">등급</div>
                        <div className="text-2xl font-bold text-success">
                          {selectedWaferData.grade || '등급 없음'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 불량 패턴 */}
                  <div className="pt-4 border-t border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-foreground">불량 패턴</h4>
                      {selectedWaferData.defects && selectedWaferData.defects.length > 0 && PATTERN_ANALYSIS[selectedWaferData.defects[0].type] && (
                        <div className="flex gap-2">
                          <Button
                            variant={patternTab === 'phenomenon' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPatternTab('phenomenon')}
                            className="h-7 text-xs"
                          >
                            현상 분석
                          </Button>
                          <Button
                            variant={patternTab === 'guide' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPatternTab('guide')}
                            className="h-7 text-xs"
                          >
                            엔지니어 가이드
                          </Button>
                        </div>
                      )}
                      {(!selectedWaferData.defects || selectedWaferData.defects.length === 0) && PATTERN_ANALYSIS['None'] && (
                        <div className="flex gap-2">
                          <Button
                            variant={patternTab === 'phenomenon' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPatternTab('phenomenon')}
                            className="h-7 text-xs"
                          >
                            현상 분석
                          </Button>
                          <Button
                            variant={patternTab === 'guide' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPatternTab('guide')}
                            className="h-7 text-xs"
                          >
                            엔지니어 가이드
                          </Button>
                        </div>
                      )}
                    </div>

                    {selectedWaferData.defects && selectedWaferData.defects.length > 0 ? (
                      <>
                        <Badge
                          variant="outline"
                          className="text-sm px-3 py-1.5"
                        >
                          {selectedWaferData.defects[0].type}
                        </Badge>

                        {/* 패턴 분석 정보 */}
                        {PATTERN_ANALYSIS[selectedWaferData.defects[0].type] && (
                          <div className="p-3 border border-destructive/20 bg-destructive/5 rounded-md">
                            {patternTab === 'phenomenon' ? (
                              <div className="flex items-start gap-2">
                                <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <h5 className="text-sm font-semibold text-foreground mb-1">현상 분석</h5>
                                  <p className="text-sm text-foreground/90 leading-relaxed">
                                    {PATTERN_ANALYSIS[selectedWaferData.defects[0].type].phenomenon}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <h5 className="text-sm font-semibold text-foreground mb-1">엔지니어 가이드</h5>
                                  <p className="text-sm text-foreground/90 leading-relaxed">
                                    {PATTERN_ANALYSIS[selectedWaferData.defects[0].type].engineerGuide}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-sm px-3 py-1.5 bg-success/10 border-success/30 text-success"
                          >
                            정상
                          </Badge>
                          <span className="text-sm text-muted-foreground">불량 패턴이 검출되지 않았습니다.</span>
                        </div>

                        {/* None 패턴 분석 정보 */}
                        {PATTERN_ANALYSIS['None'] && (
                          <div className="p-3 border border-success/20 bg-success/5 rounded-md">
                            {patternTab === 'phenomenon' ? (
                              <div className="flex items-start gap-2">
                                <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <h5 className="text-sm font-semibold text-foreground mb-1">현상 분석</h5>
                                  <p className="text-sm text-foreground/90 leading-relaxed">
                                    {PATTERN_ANALYSIS['None'].phenomenon}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <h5 className="text-sm font-semibold text-foreground mb-1">엔지니어 가이드</h5>
                                  <p className="text-sm text-foreground/90 leading-relaxed">
                                    {PATTERN_ANALYSIS['None'].engineerGuide}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Analysis Result Modal */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-success" />
              분석 완료
            </DialogTitle>
            <DialogDescription>
              웨이퍼 분석이 성공적으로 완료되었습니다.
            </DialogDescription>
          </DialogHeader>

          {analysisResult && (
            <div className="space-y-6 py-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground">웨이퍼 ID</div>
                  <div className="text-lg font-bold text-foreground mt-1">
                    {analysisResult.waferId}
                  </div>
                </div>
                <ProcessedAtDisplay processedAt={analysisResult.processedAt} />
              </div>

              {/* Yield & Grade */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-lg bg-primary/10 border border-primary/20 text-center">
                  <div className="text-sm text-muted-foreground">수율</div>
                  <div className="text-4xl font-bold text-primary mt-2">
                    {analysisResult.yield}%
                  </div>
                  <Progress value={analysisResult.yield} className="mt-3 h-2" />
                </div>
                <div className="p-6 rounded-lg bg-success/10 border border-success/20 text-center">
                  <div className="text-sm text-muted-foreground">등급</div>
                  <div className="text-4xl font-bold text-success mt-2">
                    {analysisResult.grade}
                  </div>
                  <div className="text-xs text-muted-foreground mt-3">
                    {analysisResult.grade === "A+" ? "최상" :
                      analysisResult.grade === "A" ? "우수" :
                        analysisResult.grade === "B" ? "양호" : "보통"}
                  </div>
                </div>
              </div>

              {/* Die Count */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Die 분류 결과</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      <span className="font-medium text-foreground">Good Die</span>
                    </div>
                    <span className="text-lg font-bold text-success">{analysisResult.goodDie}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-destructive" />
                      <span className="font-medium text-foreground">Bad Die</span>
                    </div>
                    <span className="text-lg font-bold text-destructive">{analysisResult.badDie}</span>
                  </div>
                </div>
              </div>

              {/* Defect Analysis */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <h4 className="text-base font-semibold text-foreground">불량 패턴 분석</h4>
                </div>
                {analysisResult.defects && analysisResult.defects.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg border-2 border-destructive/30">
                      <Badge
                        variant="outline"
                        className="text-base px-4 py-2 font-bold bg-destructive/20 border-destructive text-destructive"
                      >
                        {analysisResult.defects[0].type}
                      </Badge>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-muted-foreground">신뢰도: </span>
                        <span className="text-base font-bold text-foreground">
                          {analysisResult.defects[0].percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {PATTERN_ANALYSIS[analysisResult.defects[0].type] && (
                      <Card className="border-2 border-destructive/20 bg-destructive/5">
                        <CardContent className="py-3 px-3.5 space-y-2.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Info className="w-4 h-4 text-primary" />
                              <h5 className="text-sm font-bold text-foreground">현상 분석</h5>
                            </div>
                            <ul className="text-sm text-foreground pl-6 leading-relaxed space-y-0.5 list-none">
                              {PATTERN_ANALYSIS[analysisResult.defects[0].type].phenomenon.split('\n').map((sentence, index) => (
                                sentence.trim() && (
                                  <li key={index} className="pl-0">
                                    {sentence.trim()}
                                  </li>
                                )
                              ))}
                            </ul>
                          </div>
                          <div className="pt-3.5 border-t border-border">
                            <div className="flex items-center gap-2 mb-1.5">
                              <CheckCircle2 className="w-4 h-4 text-success" />
                              <h5 className="text-sm font-bold text-foreground">정밀 엔지니어 가이드</h5>
                            </div>
                            <ul className="text-sm text-foreground pl-6 leading-relaxed space-y-0.5 list-none">
                              {PATTERN_ANALYSIS[analysisResult.defects[0].type].engineerGuide.split('\n').map((item, index) => (
                                item.trim() && (
                                  <li key={index} className="pl-0">
                                    {item.trim()}
                                  </li>
                                )
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg border-2 border-success/30">
                      <Badge
                        variant="outline"
                        className="text-base px-4 py-2 font-bold bg-success/20 border-success text-success"
                      >
                        정상
                      </Badge>
                    </div>
                    {PATTERN_ANALYSIS['None'] && (
                      <Card className="border-2 border-success/20 bg-success/5">
                        <CardContent className="py-3 px-3.5 space-y-2.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Info className="w-4 h-4 text-primary" />
                              <h5 className="text-sm font-bold text-foreground">현상 분석</h5>
                            </div>
                            <ul className="text-sm text-foreground pl-6 leading-relaxed space-y-0.5 list-none">
                              {PATTERN_ANALYSIS['None'].phenomenon.split('\n').map((sentence, index) => (
                                sentence.trim() && (
                                  <li key={index} className="pl-0">
                                    {sentence.trim()}
                                  </li>
                                )
                              ))}
                            </ul>
                          </div>
                          <div className="pt-3.5 border-t border-border">
                            <div className="flex items-center gap-2 mb-1.5">
                              <CheckCircle2 className="w-4 h-4 text-success" />
                              <h5 className="text-sm font-bold text-foreground">정밀 엔지니어 가이드</h5>
                            </div>
                            <ul className="text-sm text-foreground pl-6 leading-relaxed space-y-0.5 list-none">
                              {PATTERN_ANALYSIS['None'].engineerGuide.split('\n').map((item, index) => (
                                item.trim() && (
                                  <li key={index} className="pl-0">
                                    {item.trim()}
                                  </li>
                                )
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={closeResultModal}>
                  닫기
                </Button>
                <Button className="flex-1" onClick={closeResultModal}>
                  <Download className="w-4 h-4 mr-2" />
                  결과 저장
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Batch Analysis Result Modal - 통계 리포트 형태 (대시보드 스타일) */}
      <Dialog open={showBatchResultModal} onOpenChange={setShowBatchResultModal}>
        <DialogContent className="sm:max-w-[95vw] h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-2xl">
                  <BarChart3 className="w-7 h-7 text-primary" />
                  최근 분석 종합 인사이트
                </DialogTitle>
                <DialogDescription className="text-base mt-2">
                  최근 분석된 100건의 웨이퍼 데이터에 대한 종합 품질 리포트입니다.
                </DialogDescription>
              </div>
              {batchProcessedAt && (
                <div className="text-right">
                  <div className="text-xs text-muted-foreground mb-1">리포트 생성</div>
                  <div className="text-sm font-semibold text-foreground">
                    {new Date(batchProcessedAt).toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 pt-2">
            {batchAnalysisResults.length > 0 && (() => {
              // 통계 계산
              const totalWafers = batchAnalysisResults.length
              const totalGoodDie = batchAnalysisResults.reduce((sum, r) => sum + r.goodDie, 0)
              const totalBadDie = batchAnalysisResults.reduce((sum, r) => sum + r.badDie, 0)
              const totalDie = totalGoodDie + totalBadDie

              // 평균 결함 밀도
              const avgDefectDensity = totalDie > 0 ? (totalBadDie / totalDie) * 100 : 0

              // 불량 패턴 분석 (웨이퍼 단위 카운트)
              const patternCounts: Record<string, number> = {}
              const defectTypes = ["Center", "Donut", "Edge-Ring", "Edge-Loc", "Loc", "Random", "Scratch", "Near-full"]
              defectTypes.forEach(t => patternCounts[t] = 0)
              patternCounts['None'] = 0

              batchAnalysisResults.forEach(r => {
                let pType = 'None'
                if (r.defects && r.defects.length > 0) {
                  const mainDefect = r.defects[0]
                  if (mainDefect.type) pType = mainDefect.type
                }
                patternCounts[pType] = (patternCounts[pType] || 0) + 1
              })

              // 파레토 차트 데이터
              const paretoData = Object.entries(patternCounts)
                .filter(([_, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => ({
                  name,
                  count,
                  fill: name === 'None' ? '#22c55e' : '#ef4444' // 정상은 초록, 불량은 빨강
                }))

              // 추세 차트 데이터 (시간순 정렬)
              const trendData = [...batchAnalysisResults]
                .sort((a, b) => new Date(a.processedAt).getTime() - new Date(b.processedAt).getTime())
                .map((r, i) => ({
                  idx: i + 1,
                  waferId: r.waferId,
                  density: r.defectDensity ?? 0,
                  grade: r.grade
                }))

              return (
                <div className="space-y-6">
                  {/* 1. 핵심 지표 카드 (KPI) */}
                  <div className="grid grid-cols-4 gap-4">
                    <Card className="bg-card border-border">
                      <CardContent className="py-4 px-6 flex flex-col justify-center h-full">
                        <div className="text-sm text-muted-foreground mb-1">총 분석 웨이퍼</div>
                        <div className="flex items-baseline gap-2">
                          <div className="text-3xl font-bold text-foreground">{totalWafers}</div>
                          <div className="text-sm text-muted-foreground">장</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-destructive/10 border-destructive/20">
                      <CardContent className="py-4 px-6 flex flex-col justify-center h-full">
                        <div className="text-sm text-muted-foreground mb-1">평균 결함 밀도</div>
                        <div className="flex items-baseline gap-2">
                          <div className="text-3xl font-bold text-destructive">{avgDefectDensity.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">%</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-success/10 border-success/20">
                      <CardContent className="py-4 px-6 flex flex-col justify-center h-full">
                        <div className="text-sm text-muted-foreground mb-1">총 양품 칩 (Good)</div>
                        <div className="flex items-baseline gap-2">
                          <div className="text-3xl font-bold text-success">{totalGoodDie.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">개</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-destructive/10 border-destructive/20">
                      <CardContent className="py-4 px-6 flex flex-col justify-center h-full">
                        <div className="text-sm text-muted-foreground mb-1">총 불량 칩 (Bad)</div>
                        <div className="flex items-baseline gap-2">
                          <div className="text-3xl font-bold text-destructive">{totalBadDie.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">개</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 2. 차트 영역 (좌: 추세, 우: 파레토) */}
                  <div className="grid grid-cols-2 gap-6 h-[400px]">
                    {/* 결함 밀도 추이 그래프 */}
                    <Card className="col-span-1 h-full flex flex-col">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">결함 밀도 추이 (Defect Density Trend)</CardTitle>
                        <CardDescription>최근 100장 웨이퍼의 결함률 변화 (낮을수록 좋음)</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                            <XAxis
                              dataKey="idx"
                              tick={{ fontSize: 12, fill: '#888' }}
                              tickLine={false}
                              axisLine={false}
                              label={{ value: '분석 순서', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: '#666' }}
                            />
                            <YAxis
                              domain={[0, 'auto']}
                              tick={{ fontSize: 12, fill: '#888' }}
                              tickLine={false}
                              axisLine={false}
                              unit="%"
                            />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }}
                              itemStyle={{ color: '#fff' }}
                              labelStyle={{ color: '#aaa', marginBottom: '0.25rem' }}
                              formatter={(value: number) => [`${value.toFixed(2)}%`, '결함 밀도']}
                              labelFormatter={(label) => `Wafer #${label}`}
                            />
                            <Line
                              type="monotone"
                              dataKey="density"
                              stroke="#ef4444"
                              strokeWidth={2}
                              dot={{ r: 2, fill: '#ef4444' }}
                              activeDot={{ r: 6, fill: '#ef4444' }}
                              animationDuration={1500}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* 불량 유형 분포 차트 */}
                    <Card className="col-span-1 h-full flex flex-col">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">불량 유형별 분포 (Defect Type Distribution)</CardTitle>
                        <CardDescription>불량 유형별 발생 빈도 현황</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={paretoData} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis
                              dataKey="name"
                              type="category"
                              width={80}
                              tick={{ fontSize: 12, fill: '#888' }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }}
                              itemStyle={{ color: '#fff' }}
                              formatter={(value: number) => [`${value}건`, '발생 횟수']}
                            />
                            <Bar
                              dataKey="count"
                              radius={[0, 4, 4, 0]}
                              barSize={32}
                            >
                              {paretoData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 3. 하단 액션 버튼 */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      onClick={() => setShowBatchResultModal(false)}
                    >
                      닫기
                    </Button>
                  </div>
                </div>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

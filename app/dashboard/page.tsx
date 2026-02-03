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
          {wafer.status === "completed" && wafer.waferMapData ? (
            <WaferMapMini
              className="w-full h-full"
              waferStats={wafer.waferMapData}
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
          {wafer.status === "completed" && wafer.yield !== null ? (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">수율</span>
                <span className="font-semibold text-foreground">{wafer.yield}%</span>
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
              {completedWafers.map((wafer) => (
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

// Analysis result type
interface AnalysisResult {
  waferId: string
  yield: number
  grade: string
  goodDie: number
  badDie: number
  defects: {
    type: string
    count: number
    percent: number
  }[]
  processedAt: string
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
};

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
  const [currentStep, setCurrentStep] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedWafer, setSelectedWafer] = useState<string | null>(null)
  const [wafers, setWafers] = useState<WaferData[]>([])
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
  const itemsPerPage = 10

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
      // alert(API_URL)

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

        // [Step 2] Processing Animation (각 웨이퍼마다 간단히 보여줌)
        // 첫 번째 웨이퍼일 때만 전체 단계 애니메이션 보여주거나, 
        // 그냥 단순히 분석 단계(3)로 표시
        setCurrentStep(3)

        // [Step 3] Analyze: 실제 분석 수행 (batch_id 전달)
        const analyzeResponse = await fetch(`${API_URL}/wafer/${lotName}/analyze?batch_id=${batchId}`, {
          method: 'POST'
        })

        if (!analyzeResponse.ok) {
          console.error(`Analysis failed for ${lotName}`)
          continue // 실패해도 다음거 계속 진행
        }

        const analyzeData = await analyzeResponse.json()
        const resultData = analyzeData.result

        // Map Backend Response to UI Model (Backend uses snake_case)
        const totalDie = resultData.die_count || 1024
        const goodDieCount = totalDie - (resultData.defect_count || 0)
        const badDieCount = resultData.defect_count || 0
        const yieldVal = totalDie > 0
          ? parseFloat(((goodDieCount / totalDie) * 100).toFixed(1))
          : 0

        const result: AnalysisResult = {
          waferId: analyzeData.lotName,
          yield: yieldVal,
          grade: resultData.total_grade || 'F',
          goodDie: goodDieCount,
          badDie: badDieCount,
          defects: [
            { type: resultData.failure_type || 'None', count: badDieCount, percent: 100 }
          ],
          processedAt: new Date().toISOString(),
        }

        // 배치 결과에 추가
        batchResults.push(result)

        // Update wafers list (하나씩 추가)
        const newWafer: WaferData = {
          id: result.waferId,
          batch: batchId || "BATCH-001",
          status: "completed" as const,
          yield: result.yield,
          grade: result.grade,
          processedAt: result.processedAt,
          waferMapData: {
            good: result.goodDie,
            bad: result.badDie,
            total: result.goodDie + result.badDie
          },
          defects: result.defects
        }

        setWafers(prev => [newWafer, ...prev])

        // 첫 번째 완료된 웨이퍼를 자동으로 선택
        if (!selectedResultWaferId) {
          setSelectedResultWaferId(result.waferId)
        }

        lastResult = result
        // 다음 분석 전 살짝 대기 (부하 조절)
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // 배치 분석 결과 모달 표시 (현재 누적된 모든 완료 웨이퍼를 대상으로 표시)
      if (batchResults.length > 0) {
        // 기존 wafers에서 완료된 것들 + 이번에 분석된 것들 (중복 주의: wafers는 아래에서 업데이트됨)
        // startProcessing 시점에서는 'setWafers'가 비동기라 아직 반영 안됐을 수 있으므로
        // (existing completed wafers) + (new batchResults) 형태로 합쳐서 보여주는 것이 안전

        const existingCompleted = wafers.filter(w => w.status === "completed")
        const allCompletedResults: AnalysisResult[] = [
          // 기존 완료된 웨이퍼들을 AnalysisResult로 변환
          ...existingCompleted.map(w => ({
            waferId: w.id,
            yield: w.yield || 0,
            grade: w.grade || 'F',
            goodDie: w.waferMapData?.good || 0,
            badDie: w.waferMapData?.bad || 0,
            defects: w.defects || [],
            processedAt: w.processedAt || new Date().toISOString()
          })),
          // 이번에 분석된 결과
          ...batchResults
        ]

        setBatchAnalysisResults(allCompletedResults)
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
  }, [uploadedFiles])

  const resetProcess = useCallback(() => {
    setCurrentStep(0)
    setIsProcessing(false)
    setUploadedFiles([])
    setAnalysisResult(null)
    // previewUrls는 useEffect의 cleanup에서 자동으로 정리됨
  }, [])

  const closeResultModal = useCallback(() => {
    setShowResultModal(false)
    setCurrentStep(0)
    setUploadedFiles([])
  }, [])

  // 배치 결과 리포트 보기 (현재 화면에 있는 웨이퍼들 기준)
  const handleShowBatchReport = useCallback(() => {
    // 화면에 로드된 웨이퍼 중 분석 완료된 건들만 집계
    const completedWafers = wafers.filter(w => w.status === "completed")

    if (completedWafers.length === 0) {
      alert("분석 완료된 웨이퍼가 없습니다.")
      return
    }

    // WaferData -> AnalysisResult 변환
    const results: AnalysisResult[] = completedWafers.map(w => {
      // waferMapData가 있으면 사용하고, 없으면 0으로 처리
      const good = w.waferMapData?.good || 0
      const bad = w.waferMapData?.bad || 0
      const total = good + bad

      // 결함 정보가 있으면 사용, 없으면 빈 배열
      // (WaferData에 defects가 optional이므로 체크 필요)
      const defects = w.defects || []

      return {
        waferId: w.id,
        yield: w.yield || 0,
        grade: w.grade || 'F',
        goodDie: good,
        badDie: bad,
        defects: defects,
        processedAt: w.processedAt || new Date().toISOString(),
      }
    })

    setBatchAnalysisResults(results)
    // 배치 시간은 가장 최근 웨이퍼의 처리 시간 또는 현재 시간
    const lastProcessed = results.length > 0 ? results[0].processedAt : new Date().toISOString()
    setBatchProcessedAt(lastProcessed)
    setShowBatchResultModal(true)
  }, [wafers])

  const handleWaferView = useCallback((waferId: string) => {
    setSelectedWafer(waferId)

    // 웨이퍼 데이터를 찾아서 단일 웨이퍼 결과 모달 표시
    const wafer = wafers.find(w => w.id === waferId && w.status === "completed")
    if (wafer && wafer.yield !== null && wafer.waferMapData) {
      const result: AnalysisResult = {
        waferId: wafer.id,
        yield: wafer.yield,
        grade: wafer.grade || 'F',
        goodDie: wafer.waferMapData.good,
        badDie: wafer.waferMapData.bad,
        defects: wafer.defects || [],
        processedAt: wafer.processedAt || new Date().toISOString(),
      }
      setAnalysisResult(result)
      setWaferMapStats(wafer.waferMapData)
      setShowResultModal(true)
    }
  }, [wafers])

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

  // 페이지네이션된 웨이퍼 목록
  const paginatedWafers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return sortedWafers.slice(startIndex, endIndex)
  }, [sortedWafers, currentPage, itemsPerPage])

  // 총 페이지 수
  const totalPages = Math.ceil(sortedWafers.length / itemsPerPage)

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
                onClick={handleShowBatchReport}
                className="bg-primary/10 hover:bg-primary/20 border-primary/50 text-primary"
                disabled={wafers.filter(w => w.status === "completed").length === 0}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                배치 결과 리포트
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
      <Tabs defaultValue="upload" className="space-y-4">
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
            <Button variant="outline" size="sm">
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
                      <TableHeader
                        field="status"
                        label="상태"
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                          <span>신뢰도</span>
                          <div className="group relative">
                            <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block z-50">
                              <div className="bg-popover text-popover-foreground text-xs rounded-md px-2 py-1.5 shadow-lg border border-border whitespace-nowrap">
                                AI 모델의 예측 확신도입니다
                              </div>
                            </div>
                          </div>
                        </div>
                      </th>
                      <TableHeader
                        field="grade"
                        label="등급"
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        불량 패턴
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        진행 상태
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedWafers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          웨이퍼 데이터가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      paginatedWafers.map((wafer) => (
                        <tr
                          key={wafer.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-medium text-foreground">{wafer.id}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge status={wafer.status} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {wafer.status === "completed" && wafer.yield !== null ? (
                              <div className="space-y-1 min-w-[120px]">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-medium text-foreground">{wafer.yield}%</span>
                                </div>
                                <Progress value={wafer.yield} className="h-1.5" />
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <GradeBadge grade={wafer.grade} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {wafer.status === "completed" ? (
                              wafer.defects && wafer.defects.length > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {wafer.defects[0].type}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-success/10 border-success/30 text-success"
                                >
                                  정상
                                </Badge>
                              )
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {wafer.status === "processing" ? (
                              <div className="flex items-center gap-2 text-sm text-primary">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>분석 진행 중...</span>
                              </div>
                            ) : wafer.status === "pending" ? (
                              <div className="text-sm text-muted-foreground">대기 중</div>
                            ) : (
                              <div className="flex items-center gap-2 text-sm text-success">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>완료</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (wafer.status === "completed") {
                                  handleWaferView(wafer.id)
                                }
                              }}
                              disabled={wafer.status !== "completed"}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              상세보기
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {sortedWafers.length > itemsPerPage && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    전체 {sortedWafers.length}개 중 {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, sortedWafers.length)}개 표시
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
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="min-w-[2.5rem]"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
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
              {/* Wafer Map */}
              <Card>
                <CardHeader>
                  <CardTitle>칩 맵</CardTitle>
                  <CardDescription>{selectedWaferData.id} 분석 결과</CardDescription>
                </CardHeader>
                <CardContent>
                  <WaferMapVisualization
                    onStatsChange={setWaferMapStats}
                    waferStats={selectedWaferData.waferMapData || undefined}
                  />
                </CardContent>
              </Card>

              {/* Classification Results */}
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

                    {/* 수율 및 등급 */}
                    {selectedWaferData.yield !== null && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">수율</div>
                          <div className="text-2xl font-bold text-primary">{selectedWaferData.yield}%</div>
                        </div>
                        {selectedWaferData.grade && (
                          <div className="p-3 bg-success/10 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">등급</div>
                            <div className="text-2xl font-bold text-success">{selectedWaferData.grade}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 불량 패턴 */}
                  <div className="pt-4 border-t border-border">
                    <h4 className="text-sm font-medium text-foreground mb-3">불량 패턴</h4>
                    {selectedWaferData.defects && selectedWaferData.defects.length > 0 ? (
                      <Badge
                        variant="outline"
                        className="text-sm px-3 py-1.5"
                      >
                        {selectedWaferData.defects[0].type}
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-sm px-3 py-1.5 bg-success/10 border-success/30 text-success"
                        >
                          정상
                        </Badge>
                        <span className="text-sm text-muted-foreground">불량 패턴이 검출되지 않았습니다.</span>
                      </div>
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

      {/* Batch Analysis Result Modal - 통계 리포트 형태 */}
      <Dialog open={showBatchResultModal} onOpenChange={setShowBatchResultModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-2xl">
                  <CheckCircle2 className="w-7 h-7 text-success" />
                  배치 종합 통계 리포트
                </DialogTitle>
                <DialogDescription className="text-base mt-2">
                  전체 웨이퍼 분석 결과 요약
                </DialogDescription>
              </div>
              {batchProcessedAt && (
                <div className="text-right">
                  <div className="text-xs text-muted-foreground mb-1">분석 일시</div>
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

          {batchAnalysisResults.length > 0 && (() => {
            // 통계 계산
            const totalWafers = batchAnalysisResults.length
            const totalGoodDie = batchAnalysisResults.reduce((sum, r) => sum + r.goodDie, 0)
            const totalBadDie = batchAnalysisResults.reduce((sum, r) => sum + r.badDie, 0)
            const totalDie = totalGoodDie + totalBadDie

            // 평균 결함 밀도 (전체 불량 칩 / 전체 칩)
            const avgDefectDensity = totalDie > 0 ? (totalBadDie / totalDie) * 100 : 0

            // 불량 패턴 분석 (웨이퍼 단위 카운트)
            const patternCounts: Record<string, number> = {}

            // 초기화
            const defectTypes = ["Center", "Donut", "Edge-Ring", "Edge-Loc", "Loc", "Random", "Scratch", "Near-full"]
            defectTypes.forEach(t => patternCounts[t] = 0)
            patternCounts['None'] = 0

            batchAnalysisResults.forEach(r => {
              // 각 웨이퍼의 대표 불량 유형 확인
              let pType = 'None'

              if (r.defects && r.defects.length > 0) {
                // defects 배열의 첫 번째 요소를 대표 유형으로 간주
                const mainDefect = r.defects[0]
                if (mainDefect.type) {
                  pType = mainDefect.type
                }
              }

              if (patternCounts[pType] !== undefined) {
                patternCounts[pType]++
              } else {
                // 정의되지 않은 패턴이라도 카운트
                patternCounts[pType] = (patternCounts[pType] || 0) + 1
              }
            })

            // 카운트가 있는 패턴만 정렬 (많은 순)
            const sortedPatterns = Object.entries(patternCounts)
              .filter(([_, count]) => count > 0)
              .sort((a, b) => b[1] - a[1])

            const maxCount = Math.max(...Object.values(patternCounts), 1)

            return (
              <div className="space-y-6 py-4">
                {/* 핵심 지표 카드 - 2x2 그리드 */}
                <div className="grid grid-cols-2 gap-4">
                  {/* 첫 번째 줄: 왼쪽 - 총 분석 웨이퍼 */}
                  <Card className="bg-card border-border">
                    <CardContent className="py-1 px-6">
                      <div className="text-sm text-muted-foreground mb-0.5">총 분석 웨이퍼</div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-bold text-foreground">{totalWafers}</div>
                        <div className="text-sm text-muted-foreground">장</div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 첫 번째 줄: 오른쪽 - 평균 결함 밀도 */}
                  <Card className="bg-destructive/10 border-destructive/20">
                    <CardContent className="py-1 px-6">
                      <div className="text-sm text-muted-foreground mb-0.5">평균 결함 밀도</div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-bold text-destructive">{avgDefectDensity.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">%</div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 두 번째 줄: 왼쪽 - 양품 칩 */}
                  <Card className="bg-success/10 border-success/20">
                    <CardContent className="py-1 px-6">
                      <div className="text-sm text-muted-foreground mb-0.5">양품 칩</div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-bold text-success">
                          {totalGoodDie.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">개</div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 두 번째 줄: 오른쪽 - 불량 칩 */}
                  <Card className="bg-destructive/10 border-destructive/20">
                    <CardContent className="py-1 px-6">
                      <div className="text-sm text-muted-foreground mb-0.5">불량 칩</div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-bold text-destructive">
                          {totalBadDie.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">개</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 불량 패턴 분석 통계 */}
                <Card>
                  <CardHeader>
                    <CardTitle>불량 패턴 분석 통계</CardTitle>
                    <CardDescription>
                      배치 내 불량 유형별 검출 현황 (Failure Type Analysis)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {sortedPatterns.map(([pattern, count]) => {
                        const percentage = (count / totalWafers) * 100 // 전체 웨이퍼 대비 비율로 변경 (그래프 바 길이)
                        const barWidth = (count / maxCount) * 100 // 최대값 기준 상대 길이 (시각적 균형)

                        return (
                          <div key={pattern} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-foreground min-w-[120px]">
                                  {pattern}
                                </span>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>웨이퍼: {count}건</span>
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-foreground">
                                {count}
                              </div>
                            </div>
                            <Progress
                              value={barWidth}
                              className="h-3 [&>div]:bg-primary"
                            />
                          </div>
                        )
                      })}
                      {sortedPatterns.length === 0 && (
                        <div className="text-center text-muted-foreground text-sm py-4">
                          데이터가 없습니다.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 하단 액션 버튼 */}
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => setShowBatchResultModal(false)}
                  >
                    닫기
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => alert("리포트 저장 기능 준비 중")}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    전체 결과 리포트 다운로드 (.csv / .pdf)
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}

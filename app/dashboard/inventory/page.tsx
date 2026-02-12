"use client"

import { useEffect, useMemo, useState, type ChangeEvent } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Boxes,
  Sparkles,
  Layers,
  Table2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchChipInspectionRows, type ChipInspectionRow } from "@/lib/api/chip-inspection"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"

// Chip inventory types
type ChipCategory = "raw_die" | "dram_die" | "logic_die" | "hbm_stack" | "finished"
type StockStatus = "optimal" | "low" | "critical" | "excess"

interface InventoryItem {
  id: string
  name: string
  category: ChipCategory
  sku: string
  currentStock: number
  minStock: number
  maxStock: number
  optimalStock: number
  unit: string
  status: StockStatus
  lastUpdated: string
  trend: "up" | "down" | "stable"
  trendValue: number
  daysToReorder: number | null
}

// Demo inventory data
const inventoryData: InventoryItem[] = [
  {
    id: "1",
    name: "DRAM Die (HBM3)",
    category: "dram_die",
    sku: "DRAM-HBM3-8GB",
    currentStock: 15420,
    minStock: 10000,
    maxStock: 25000,
    optimalStock: 18000,
    unit: "EA",
    status: "optimal",
    lastUpdated: "2024-01-21T10:30:00",
    trend: "up",
    trendValue: 5.2,
    daysToReorder: null,
  },
  {
    id: "2",
    name: "Logic Die (Base)",
    category: "logic_die",
    sku: "LOGIC-BASE-V2",
    currentStock: 8540,
    minStock: 8000,
    maxStock: 20000,
    optimalStock: 12000,
    unit: "EA",
    status: "low",
    lastUpdated: "2024-01-21T10:30:00",
    trend: "down",
    trendValue: -3.1,
    daysToReorder: 5,
  },
  {
    id: "3",
    name: "HBM3 8단 스택",
    category: "hbm_stack",
    sku: "HBM3-8HI-24GB",
    currentStock: 2340,
    minStock: 2000,
    maxStock: 5000,
    optimalStock: 3500,
    unit: "EA",
    status: "low",
    lastUpdated: "2024-01-21T10:30:00",
    trend: "down",
    trendValue: -8.5,
    daysToReorder: 3,
  },
  {
    id: "5",
    name: "완제품 HBM3",
    category: "finished",
    sku: "HBM3-PKG-FINAL",
    currentStock: 890,
    minStock: 500,
    maxStock: 2000,
    optimalStock: 1200,
    unit: "EA",
    status: "optimal",
    lastUpdated: "2024-01-21T10:30:00",
    trend: "up",
    trendValue: 2.8,
    daysToReorder: null,
  },
  {
    id: "6",
    name: "Base Die Substrate",
    category: "raw_die",
    sku: "SUB-BASE-300MM",
    currentStock: 22500,
    minStock: 15000,
    maxStock: 25000,
    optimalStock: 20000,
    unit: "EA",
    status: "excess",
    lastUpdated: "2024-01-21T10:30:00",
    trend: "stable",
    trendValue: 0.5,
    daysToReorder: null,
  },
]

// Demo quality/defect summary (노션: 정상/불량 + 불량유형 기반)
const DEFAULT_QUALITY_SUMMARY = {
  total: 1000,
  normal: 872,
  defect: 128,
} as const

function isDefectStatus(status: ChipInspectionRow["die_status"]): boolean {
  // DB 스크린샷 기준: die_status = 1/2 형태로 보임
  if (status === 1 || status === "1" || status === false || status === "good" || status === "normal") return false
  if (
    status === 2 ||
    status === "2" ||
    status === 0 ||
    status === "0" ||
    status === true ||
    status === "bad" ||
    status === "defect"
  )
    return true
  return Boolean(status) // fallback
}

function colorForFailureType(type: string): string {
  const palette = ["#f59e0b", "#fb7185", "#a78bfa", "#60a5fa", "#34d399", "#94a3b8"]
  let hash = 0
  for (let i = 0; i < type.length; i++) hash = (hash * 31 + type.charCodeAt(i)) >>> 0
  return palette[hash % palette.length]
}

// 요구사항: 아래 9개 패턴만 화면에 표시 (그 외는 표시하지 않음)
const CANONICAL_FAILURE_TYPES = [
  "Scratch",
  "Random",
  "Near-full",
  "Loc",
  "Edge-Ring",
  "Edge-Loc",
  "Donut",
  "Center",
  "None",
] as const

type CanonicalFailureType = (typeof CANONICAL_FAILURE_TYPES)[number]

function normalizeFailureType(raw: unknown): CanonicalFailureType | null {
  // DB에서 failure_type이 NULL/None일 수 있음
  if (raw === null || raw === undefined) return "None"
  const s = typeof raw === "string" ? raw.trim() : String(raw).trim()
  if (!s) return "None"

  const cleaned = s.replace(/_/g, "-").replace(/\s+/g, "-")
  const key = cleaned.toLowerCase()

  const map: Record<string, CanonicalFailureType> = {
    scratch: "Scratch",
    random: "Random",
    "near-full": "Near-full",
    nearfull: "Near-full",
    loc: "Loc",
    "edge-ring": "Edge-Ring",
    edgering: "Edge-Ring",
    "edge-loc": "Edge-Loc",
    edgeloc: "Edge-Loc",
    donut: "Donut",
    center: "Center",
    none: "None",
    null: "None",
  }

  // NOTE: Edge/Other/Particle 등은 요구사항에 없으므로 null 처리(표시 X)
  return map[key] ?? null
}

type CombinationRisk = "recommended" | "caution" | "danger"

function riskForPenalty(penalty: number): CombinationRisk {
  // 요구사항:
  // 0.1 ~ 0.3: 초록(적극 추천)
  // 0.4 ~ 0.7: 노랑(주의)
  // 0.8 ~ 1.0: 빨강(위험)
  // 경계 밖(0.31~0.39 등)은 "주의"로 처리
  if (penalty <= 0.3) return "recommended"
  if (penalty <= 0.7) return "caution"
  return "danger"
}

function riskBadgeClass(risk: CombinationRisk): string {
  switch (risk) {
    case "recommended":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    case "caution":
      return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
    case "danger":
      return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
  }
}

function riskLabel(risk: CombinationRisk): string {
  switch (risk) {
    case "recommended":
      return "추천"
    case "caution":
      return "주의"
    case "danger":
      return "위험"
  }
}

// 적층 조합(base type) 패널티 (낮을수록 좋은 조합)
// 스크린샷 기반 값 그대로 반영
const BASE_TYPE_PENALTY: Array<{ a: CanonicalFailureType; b: CanonicalFailureType; penalty: number }> = [
  // 동일 패턴끼리의 페널티 상향 (Diversity Enforcement)
  { a: "Center", b: "Center", penalty: 1.0 },
  { a: "Donut", b: "Donut", penalty: 2.0 },
  { a: "Edge-Ring", b: "Edge-Ring", penalty: 2.0 },
  { a: "Loc", b: "Loc", penalty: 2.0 },
  { a: "Edge-Loc", b: "Edge-Loc", penalty: 2.0 },
  { a: "Scratch", b: "Scratch", penalty: 2.0 },
  { a: "Random", b: "Random", penalty: 2.0 },
  { a: "Near-full", b: "Near-full", penalty: 3.0 },
  { a: "None", b: "None", penalty: 0.15 },

  // 서로 다른 조합 (권장)
  { a: "Donut", b: "Center", penalty: 0.7 },
  { a: "Center", b: "Edge-Ring", penalty: 0.55 },
  { a: "Donut", b: "Edge-Ring", penalty: 0.6 },
  { a: "Center", b: "Loc", penalty: 0.45 },
  { a: "Center", b: "Edge-Loc", penalty: 0.45 },
  { a: "Center", b: "Scratch", penalty: 0.4 },
  { a: "Donut", b: "Loc", penalty: 0.4 },
  { a: "Donut", b: "Edge-Loc", penalty: 0.4 },
  { a: "Donut", b: "Scratch", penalty: 0.35 },
  { a: "Edge-Ring", b: "Loc", penalty: 0.45 },
  { a: "Edge-Ring", b: "Edge-Loc", penalty: 0.4 },
  { a: "Edge-Ring", b: "Scratch", penalty: 0.4 },
  { a: "Loc", b: "Edge-Loc", penalty: 0.28 },
  { a: "Loc", b: "Scratch", penalty: 0.25 },
  { a: "Edge-Loc", b: "Scratch", penalty: 0.25 },
  { a: "Random", b: "Loc", penalty: 0.18 },
  { a: "Random", b: "Edge-Loc", penalty: 0.18 },
  { a: "Random", b: "Scratch", penalty: 0.18 },
  { a: "Random", b: "Donut", penalty: 0.25 },
  { a: "Random", b: "Center", penalty: 0.25 },
  { a: "Random", b: "Edge-Ring", penalty: 0.25 },
]

function AIQualityPanel({
  qualitySummary,
  failureTypeDistribution,
  isLoading,
  error,
  className,
}: {
  qualitySummary: { total: number; normal: number; defect: number }
  failureTypeDistribution: Array<{ type: string; count: number; color: string }>
  isLoading: boolean
  error: string | null
  className?: string
}) {
  const defectRate =
    qualitySummary.total > 0 ? Math.round((qualitySummary.defect / qualitySummary.total) * 1000) / 10 : 0
  const topFailure =
    failureTypeDistribution.length > 0
      ? failureTypeDistribution.reduce(
          (best, cur) => (cur.count > best.count ? cur : best),
          failureTypeDistribution[0]
        )
      : null

  return (
    <Card className={cn("flex flex-col lg:h-[460px] overflow-hidden", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">불량유형별 재고분석</CardTitle>
              <CardDescription>정상/불량 및 불량유형 기반 현황 분석</CardDescription>
            </div>
          </div>
          {isLoading && (
            <Badge variant="outline" className="text-xs">
              분석 중...
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="h-full pr-3">
          <div className="space-y-4">
            {error && (
              <div className="text-xs text-muted-foreground">
                <Badge variant="outline" className="mr-2">
                  API
                </Badge>
                {error} (데모 데이터로 표시 중)
              </div>
            )}

            {/* Quality Chart (노션: 현재 재고상황 + 불량유형) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
              {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-[1px]">
                  <span className="text-sm text-muted-foreground">데이터 불러오는 중...</span>
                </div>
              )}
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#f3f4f6",
                      }}
                    />
                    <Pie
                      data={[
                        { name: "정상", value: qualitySummary.normal, color: "#22c55e" },
                        { name: "불량", value: qualitySummary.defect, color: "#ef4444" },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      <Cell fill="#22c55e" />
                      <Cell fill="#ef4444" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={failureTypeDistribution} margin={{ left: 8, right: 8, bottom: 26 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="type"
                      stroke="#9ca3af"
                      fontSize={11}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                      height={44}
                    />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#f3f4f6",
                      }}
                    />
                    <Bar dataKey="count" name="패턴 수" radius={[4, 4, 0, 0]}>
                      {failureTypeDistribution.map((entry) => (
                        <Cell key={entry.type} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Insights */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI 인사이트
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                  <div>
                    <span className="text-foreground font-medium">불량률</span>
                    <span className="text-muted-foreground">
                      {" "}- 현재 불량률 {Number.isFinite(defectRate) ? defectRate : 0}%
                      {topFailure ? ` (상위 불량유형: ${topFailure.type})` : ""}.
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-success/10">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                  <div>
                    <span className="text-foreground font-medium">정상 수량</span>
                    <span className="text-muted-foreground">
                      {" "}
                      - 정상 {qualitySummary.normal.toLocaleString()}개 / 총 {qualitySummary.total.toLocaleString()}개.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function BaseTypePenaltyPanel() {
  const [sortBy, setSortBy] = useState<"asc" | "desc">("asc")
  const [typeA, setTypeA] = useState<CanonicalFailureType | "all">("all")
  const [typeB, setTypeB] = useState<CanonicalFailureType | "all">("all")
  const [q, setQ] = useState("")

  const allTypes = CANONICAL_FAILURE_TYPES

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase()
    const filtered = BASE_TYPE_PENALTY.filter((r) => {
      if (typeA !== "all" && r.a !== typeA) return false
      if (typeB !== "all" && r.b !== typeB) return false
      if (!query) return true
      return `${r.a} ${r.b}`.toLowerCase().includes(query)
    })

    const sorted = [...filtered].sort((x, y) => (sortBy === "asc" ? x.penalty - y.penalty : y.penalty - x.penalty))
    return sorted
  }, [q, sortBy, typeA, typeB])

  const riskCounts = useMemo(() => {
    const counts: Record<CombinationRisk, number> = { recommended: 0, caution: 0, danger: 0 }
    for (const r of BASE_TYPE_PENALTY) counts[riskForPenalty(r.penalty)] += 1
    return counts
  }, [])

  const penaltyMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of BASE_TYPE_PENALTY) m.set(`${r.a}__${r.b}`, r.penalty)
    return m
  }, [])

  return (
    <Card className="flex flex-col lg:h-[460px] overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted">
              <Layers className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">적층 조합 패널티</CardTitle>
              <CardDescription>낮을수록 추천 조합</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className={cn("text-xs", riskBadgeClass("recommended"))}>
              추천 {riskCounts.recommended}
            </Badge>
            <Badge variant="outline" className={cn("text-xs", riskBadgeClass("caution"))}>
              주의 {riskCounts.caution}
            </Badge>
            <Badge variant="outline" className={cn("text-xs", riskBadgeClass("danger"))}>
              위험 {riskCounts.danger}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <div className="space-y-4 h-full min-h-0 flex flex-col">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">색상 기준</span>
            <Badge variant="outline" className={cn("text-xs", riskBadgeClass("recommended"))}>
              0.1 ~ 0.3 적극 추천
            </Badge>
            <Badge variant="outline" className={cn("text-xs", riskBadgeClass("caution"))}>
              0.4 ~ 0.7 주의 필요
            </Badge>
            <Badge variant="outline" className={cn("text-xs", riskBadgeClass("danger"))}>
              0.8 이상 위험
            </Badge>
          </div>

          <Tabs defaultValue="list" className="w-full flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between gap-3">
              <TabsList className="grid w-[220px] grid-cols-2">
                <TabsTrigger value="list" className="gap-2">
                  <Table2 className="w-4 h-4" />
                  리스트
                </TabsTrigger>
                <TabsTrigger value="heatmap" className="gap-2">
                  <Layers className="w-4 h-4" />
                  히트맵
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setSortBy((v) => (v === "asc" ? "desc" : "asc"))}>
                  {sortBy === "asc" ? "낮은값 우선" : "높은값 우선"}
                </Button>
              </div>
            </div>

            <TabsContent value="list" className="mt-4 flex-1 min-h-0 flex flex-col">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
                    placeholder="타입 검색 (예: Random Edge-Loc)"
                    className="pl-9"
                  />
                </div>

                <Select value={typeA} onValueChange={(v) => setTypeA(v as CanonicalFailureType | "all")}>
                  <SelectTrigger>
                    <SelectValue placeholder="타입 A" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">타입 A: 전체</SelectItem>
                    {allTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={typeB} onValueChange={(v) => setTypeB(v as CanonicalFailureType | "all")}>
                  <SelectTrigger>
                    <SelectValue placeholder="타입 B" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">타입 B: 전체</SelectItem>
                    {allTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="flex-1 min-h-0 pr-3">
                <div className="space-y-2">
                  {rows.map((r) => {
                    const risk = riskForPenalty(r.penalty)
                    return (
                      <div
                        key={`${r.a}__${r.b}__${r.penalty}`}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2",
                          risk === "recommended" && "bg-emerald-500/5",
                          risk === "caution" && "bg-amber-500/5",
                          risk === "danger" && "bg-red-500/5"
                        )}
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono">
                            {r.a}
                          </Badge>
                          <span className="text-xs text-muted-foreground">+</span>
                          <Badge variant="secondary" className="font-mono">
                            {r.b}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-xs", riskBadgeClass(risk))}>
                            {riskLabel(risk)}
                          </Badge>
                          <div className="text-sm font-semibold tabular-nums">{r.penalty.toFixed(2)}</div>
                        </div>
                      </div>
                    )
                  })}

                  {rows.length === 0 && (
                    <div className="text-center py-10 text-sm text-muted-foreground">조건에 맞는 조합이 없습니다.</div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="heatmap" className="mt-4 flex-1 min-h-0">
              <ScrollArea className="h-full min-h-0 pr-3">
                <div className="overflow-x-auto">
                  <div className="min-w-[520px]">
                    <div
                      className="grid"
                      style={{ gridTemplateColumns: `120px repeat(${allTypes.length}, minmax(52px, 1fr))` }}
                    >
                      <div className="sticky left-0 bg-background z-10" />
                      {allTypes.map((t) => (
                        <div key={`col-${t}`} className="px-2 pb-2 text-xs text-muted-foreground font-mono text-center">
                          {t}
                        </div>
                      ))}

                      {allTypes.map((rowType) => (
                        <div key={`rowblock-${rowType}`} className="contents">
                          <div className="sticky left-0 bg-background z-10 pr-2 py-1 text-xs text-muted-foreground font-mono flex items-center">
                            {rowType}
                          </div>
                          {allTypes.map((colType) => {
                            const key = `${rowType}__${colType}`
                            const p = penaltyMap.get(key)
                            const risk = typeof p === "number" ? riskForPenalty(p) : null
                            return (
                              <div
                                key={`cell-${key}`}
                                title={
                                  typeof p === "number"
                                    ? `${rowType} + ${colType} = ${p.toFixed(2)}`
                                    : `${rowType} + ${colType} = (데이터 없음)`
                                }
                                className={cn(
                                  "m-0.5 rounded-md border border-border h-10 flex items-center justify-center text-xs font-semibold tabular-nums",
                                  typeof p !== "number" && "bg-muted/30 text-muted-foreground",
                                  risk === "recommended" &&
                                  "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                                  risk === "caution" &&
                                  "bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/20",
                                  risk === "danger" && "bg-red-500/12 text-red-600 dark:text-red-400 border-red-500/20"
                                )}
                              >
                                {typeof p === "number" ? p.toFixed(2) : "—"}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      * 셀은 스크린샷에 정의된 조합만 표시합니다. (없는 조합은 “—”)
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  )
}

type BalanceLabel = "부족" | "적정" | "잉여"

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function balanceLabelForAvailability(availability: number): BalanceLabel {
  // 요구사항: 40% 미만이면 부족, 100% 이상이면 잉여
  if (availability < 40) return "부족"
  if (availability >= 100) return "잉여"
  return "적정"
}

function badgeVariantForBalance(label: BalanceLabel): "default" | "secondary" | "destructive" | "outline" {
  if (label === "부족") return "destructive"
  if (label === "잉여") return "secondary"
  return "outline"
}

function AvailabilityGauge({
  label,
  availability,
  color,
  className,
  onClick,
}: {
  label: string
  availability: number
  color: string
  className?: string
  onClick?: () => void
}) {
  const pct = Math.round(availability)
  const ringPct = clamp(pct, 0, 100)
  const balance = balanceLabelForAvailability(pct)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full text-left rounded-xl border border-border bg-card/50 hover:bg-card transition-colors p-3",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-foreground truncate">{label}</div>
            <Badge variant={badgeVariantForBalance(balance)} className="text-[11px] px-2">
              {balance}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            재고율 <span className="text-foreground font-medium">{pct}%</span>
            {pct >= 100 ? " (잉여)" : pct < 40 ? " (부족)" : ""}
          </div>
        </div>

        <div className="relative shrink-0">
          <div
            className={cn("h-12 w-12 rounded-full p-[3px]", pct > 100 ? "shadow-[0_0_0_1px_rgba(34,197,94,0.25)]" : "")}
            style={{
              background: `conic-gradient(${color} ${ringPct * 3.6}deg, rgba(148,163,184,0.25) 0deg)`,
            }}
          >
            <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
              <div className="text-xs font-semibold text-foreground tabular-nums">{pct}%</div>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}

function ReallocationRecommendation({
  model,
  items,
  className,
}: {
  model: InventoryItem
  items: Array<{ type: string; availability: number; delta: number }>
  className?: string
}) {
  const sorted = [...items].sort((a, b) => a.availability - b.availability)
  const worst = sorted[0]
  const best = sorted[sorted.length - 1]

  // 왼쪽 "재고율 다이얼" 기준과 동일하게: 부족/잉여/적정 라벨
  const shortageItems = useMemo(() => {
    return [...items]
      .filter((x) => balanceLabelForAvailability(Math.round(x.availability)) === "부족")
      .sort((a, b) => a.availability - b.availability)
  }, [items])

  const excessItems = useMemo(() => {
    return [...items]
      .filter((x) => balanceLabelForAvailability(Math.round(x.availability)) === "잉여")
      .sort((a, b) => b.availability - a.availability)
  }, [items])

  const primaryShortage = shortageItems[0] ?? worst
  const primaryExcess = excessItems[0] ?? best

  const worstPct = Math.round(primaryShortage.availability)
  const bestPct = Math.round(primaryExcess.availability)

  return (
    <div className={cn("rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-4", className)}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground">AI 기반 재고 전용(Reallocation) 추천</div>
          <div className="text-xs text-muted-foreground mt-1">
            모델 <span className="text-foreground font-medium">{model.name}</span>
          </div>

          <div className="mt-3 text-sm leading-6 text-foreground space-y-2">
            <p>
              <span className="font-semibold">{primaryShortage.type}</span> 패턴의 재고율이{" "}
              <span className="font-semibold text-destructive">{worstPct}%</span>까지 급락했습니다. 이로 인해{" "}
              <span className="font-semibold">완제품</span> 생산 차질이 우려됩니다.
            </p>
            <p>
              <span className="font-semibold">조치 제안</span>: 잉여 재고(재고율{" "}
              <span className="font-semibold text-success">{bestPct}%</span>)가 발생한{" "}
              <span className="font-semibold">{primaryExcess.type}</span> 패턴 칩을 우선 투입하도록 생산 순서를 변경해
              주십시오.
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {shortageItems.map((x) => (
              <Badge key={`short-${x.type}`} variant="outline" className="text-xs">
                부족: {x.type} {Math.round(x.availability)}%
              </Badge>
            ))}
            {excessItems.map((x) => (
              <Badge key={`excess-${x.type}`} variant="outline" className="text-xs">
                잉여: {x.type} {Math.round(x.availability)}%
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const dramOnlyModel = useMemo(() => {
    return (
      inventoryData.find((x) => x.sku === "DRAM-HBM3-8GB") ??
      inventoryData.find((x) => x.name.toLowerCase().includes("dram die") && x.name.toLowerCase().includes("hbm")) ??
      inventoryData[0]
    )
  }, [])

  const [qualitySummary, setQualitySummary] = useState<{ total: number; normal: number; defect: number }>({
    total: DEFAULT_QUALITY_SUMMARY.total,
    normal: DEFAULT_QUALITY_SUMMARY.normal,
    defect: DEFAULT_QUALITY_SUMMARY.defect,
  })
  // 초기에도 요구된 9개만 노출(로딩 중에 Edge/Other 같은 게 잠깐 보이는 현상 방지)
  const [failureTypeDistribution, setFailureTypeDistribution] = useState<
    Array<{ type: string; count: number; color: string }>
  >(CANONICAL_FAILURE_TYPES.map((t) => ({ type: t, count: 0, color: colorForFailureType(t) })))
  const [qualityLoading, setQualityLoading] = useState(true)
  const [qualityError, setQualityError] = useState<string | null>(null)

  // 재고밸런스용: API 성공 시 실제 칩 데이터 기반 모델, 실패 시 데모 fallback
  const realInventoryModel = useMemo((): InventoryItem | null => {
    if (qualityError) return null
    const total = qualitySummary.total
    const defect = qualitySummary.defect
    const defectRate = total > 0 ? defect / total : 0
    const status: StockStatus =
      defectRate >= 0.7 ? "critical" : defectRate >= 0.5 ? "low" : "optimal"
    return {
      id: "realtime",
      name: "DRAM Die (HBM3)",
      category: "dram_die",
      sku: "DRAM-HBM3-8GB",
      currentStock: total,
      minStock: 0,
      maxStock: Math.max(total, 1),
      optimalStock: Math.max(total, 1),
      unit: "EA",
      status,
      lastUpdated: new Date().toISOString(),
      trend: "stable",
      trendValue: 0,
      daysToReorder: null,
    }
  }, [qualitySummary.total, qualitySummary.defect, qualityError])

  const selectedModel = realInventoryModel ?? dramOnlyModel

  const balanceByFailureType = useMemo(() => {
    const model = selectedModel
    const dist = failureTypeDistribution.filter((d) => d.type !== "None")

    const maxCount = Math.max(0, ...dist.map((d) => d.count))
    const stockRatio = model ? model.currentStock / Math.max(1, model.optimalStock) : 1

    const statusAdj =
      model?.status === "critical" ? -18 : model?.status === "low" ? -10 : model?.status === "excess" ? 10 : 0
    const ratioAdj = clamp((stockRatio - 1) * 16, -12, 12)

    return dist
      .map((d) => {
        // 칩 많을수록 재고율 높게(잉여), 적을수록 낮게(부족). 상한 낮춰서 전부 100%+ 나오지 않게 (40~90)
        const base = maxCount === 0 ? 100 : 40 + (d.count / maxCount) * 50
        const availability = clamp(base + statusAdj + ratioAdj, 0, 140)
        const delta = availability - 100
        return {
          type: d.type,
          count: d.count,
          color: d.color,
          availability,
          delta,
        }
      })
      .sort((a, b) => a.availability - b.availability)
  }, [failureTypeDistribution, selectedModel])

  const qualityStats = useMemo(() => {
    const defectRate = Math.round((qualitySummary.defect / qualitySummary.total) * 1000) / 10
    return {
      total: qualitySummary.total,
      normal: qualitySummary.normal,
      defect: qualitySummary.defect,
      defectRate,
    }
  }, [qualitySummary])

  const loadQualityData = async (signal?: AbortSignal) => {
    try {
      setQualityLoading(true)
      setQualityError(null)

      const rows = await fetchChipInspectionRows({ limit: 1000 })
      if (signal?.aborted) return

      const total = rows.length
      const defectRows = rows.filter((r) => isDefectStatus(r.die_status))
      const defect = defectRows.length
      const normal = total - defect

      // 불량패턴 분포: "불량 수량"과 합이 맞아야 하므로 defectRows 기준으로 카운트
      // 요구사항: 아래 9개만 화면에 표시 → 그 외 패턴/알 수 없는 값은 None으로 흡수하여 합을 보존
      const counts = new Map<CanonicalFailureType, number>()
      for (const r of defectRows) {
        const t = normalizeFailureType(r.failure_type) ?? "None"
        counts.set(t, (counts.get(t) ?? 0) + 1)
      }

      const dist: Array<{ type: string; count: number; color: string }> = CANONICAL_FAILURE_TYPES.map((t) => ({
        type: t,
        count: counts.get(t) ?? 0,
        color: colorForFailureType(t),
      }))

      setQualitySummary({ total, normal, defect })
      setFailureTypeDistribution(dist)
    } catch (e) {
      if (signal?.aborted) return
      const message = e instanceof Error ? e.message : "칩 검사 데이터 로드 실패"
      setQualityError(message)
      // fallback to demo
      setQualitySummary({
        total: DEFAULT_QUALITY_SUMMARY.total,
        normal: DEFAULT_QUALITY_SUMMARY.normal,
        defect: DEFAULT_QUALITY_SUMMARY.defect,
      })
      // 요구사항: 이 화면도 9개만 보여야 함
      setFailureTypeDistribution(CANONICAL_FAILURE_TYPES.map((t) => ({ type: t, count: 0, color: colorForFailureType(t) })))
    } finally {
      if (!signal?.aborted) setQualityLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    void loadQualityData(controller.signal)
    return () => controller.abort()
  }, [])

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 lg:p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Boxes className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs lg:text-sm text-muted-foreground">전체 수량</p>
                {qualityLoading ? (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-8 w-20 rounded bg-muted animate-pulse" aria-hidden />
                    <span className="text-xs text-muted-foreground">로딩 중...</span>
                  </div>
                ) : (
                  <p className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                    {qualityStats.total.toLocaleString()}개
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 lg:p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs lg:text-sm text-muted-foreground">정상 수량</p>
                {qualityLoading ? (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-8 w-20 rounded bg-muted animate-pulse" aria-hidden />
                    <span className="text-xs text-muted-foreground">로딩 중...</span>
                  </div>
                ) : (
                  <p className="text-2xl lg:text-3xl font-bold text-success tracking-tight">
                    {qualityStats.normal.toLocaleString()}개
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 lg:p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs lg:text-sm text-muted-foreground">불량 수량</p>
                {qualityLoading ? (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-8 w-20 rounded bg-muted animate-pulse" aria-hidden />
                    <span className="text-xs text-muted-foreground">로딩 중...</span>
                  </div>
                ) : (
                  <p className="text-2xl lg:text-3xl font-bold text-destructive tracking-tight">
                    {qualityStats.defect.toLocaleString()}개
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* AI Quality (왼쪽) */}
        <AIQualityPanel
          qualitySummary={qualitySummary}
          failureTypeDistribution={failureTypeDistribution}
          isLoading={qualityLoading}
          error={qualityError}
        />

        {/* Base-type penalty (오른쪽) */}
        <BaseTypePenaltyPanel />
      </div>

      {/* Inventory Balance */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>불량유형별 재고밸런스</CardTitle>
              <CardDescription>불량 패턴 비율 차이를 활용해 부족/잉여 병목을 한눈에 파악</CardDescription>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Badge variant="outline" className="text-xs">
                모델 선택
              </Badge>
              <Select value={selectedModel.id} disabled>
                <SelectTrigger className="w-full sm:w-[260px]">
                  <SelectValue placeholder="칩 모델 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={selectedModel.id}>
                    {selectedModel.name}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {qualityError && (
            <div className="text-xs text-muted-foreground">
              <Badge variant="outline" className="mr-2">
                API
              </Badge>
              {qualityError} (데모 지표로 표시 중)
            </div>
          )}

          {/* 1) Availability Gauge */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card/50 p-4 lg:col-span-2">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="text-sm font-medium text-foreground flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-muted">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                  </div>
                  패턴별 재고율 다이얼
                </div>
                {qualityLoading && (
                  <Badge variant="outline" className="text-xs">
                    분석 중...
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 relative">
                {qualityLoading ? (
                  <>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[88px] rounded-xl border border-border bg-muted/30 animate-pulse flex items-center justify-center"
                        aria-hidden
                      >
                        <span className="text-xs text-muted-foreground">로딩 중</span>
                      </div>
                    ))}
                  </>
                ) : (
                  balanceByFailureType.slice(0, 8).map((x) => (
                    <AvailabilityGauge
                      key={x.type}
                      label={x.type}
                      availability={x.availability}
                      color={x.color}
                    />
                  ))
                )}
              </div>

              <div className="mt-3 text-xs text-muted-foreground">
                * 100%가 기준입니다. 40% 미만이면 부족(병목), 100% 이상이면 잉여로 해석합니다.
              </div>
            </div>

            {/* 3) AI Reallocation Recommendation */}
            {qualityLoading ? (
              <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center justify-center min-h-[120px]">
                <span className="text-sm text-muted-foreground">추천 분석 중...</span>
              </div>
            ) : selectedModel ? (
              <ReallocationRecommendation
                model={selectedModel}
                items={balanceByFailureType.map((x) => ({ type: x.type, availability: x.availability, delta: x.delta }))}
              />
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                모델을 선택하면 AI 추천 문구를 표시합니다.
              </div>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  )
}

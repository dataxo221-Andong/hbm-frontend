"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Search, 
  Package, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Brain,
  RefreshCw,
  ArrowRight,
  Clock,
  Boxes,
  Layers,
  Cpu,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar
} from "recharts"
import { useSearchParams } from "next/navigation"
import Loading from "./loading"

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
    daysToReorder: null
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
    daysToReorder: 5
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
    daysToReorder: 3
  },
  {
    id: "4",
    name: "HBM3E 12단 스택",
    category: "hbm_stack",
    sku: "HBM3E-12HI-36GB",
    currentStock: 1280,
    minStock: 1500,
    maxStock: 4000,
    optimalStock: 2500,
    unit: "EA",
    status: "critical",
    lastUpdated: "2024-01-21T10:30:00",
    trend: "down",
    trendValue: -12.3,
    daysToReorder: 1
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
    daysToReorder: null
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
    daysToReorder: null
  },
]

// AI Prediction data
const predictionData = [
  { day: "오늘", actual: 2340, predicted: 2340 },
  { day: "+1일", actual: null, predicted: 2180 },
  { day: "+2일", actual: null, predicted: 2020 },
  { day: "+3일", actual: null, predicted: 1850 },
  { day: "+4일", actual: null, predicted: 1700 },
  { day: "+5일", actual: null, predicted: 1580 },
  { day: "+6일", actual: null, predicted: 1490 },
  { day: "+7일", actual: null, predicted: 1420 },
]

const consumptionHistory = [
  { date: "01/14", consumption: 180, production: 200 },
  { date: "01/15", consumption: 195, production: 185 },
  { date: "01/16", consumption: 210, production: 220 },
  { date: "01/17", consumption: 175, production: 190 },
  { date: "01/18", consumption: 220, production: 200 },
  { date: "01/19", consumption: 185, production: 210 },
  { date: "01/20", consumption: 200, production: 195 },
  { date: "01/21", consumption: 190, production: 205 },
]

const categoryLabels: Record<ChipCategory, string> = {
  raw_die: "원자재",
  dram_die: "DRAM Die",
  logic_die: "Logic Die",
  hbm_stack: "HBM 스택",
  finished: "완제품"
}

const statusConfig: Record<StockStatus, { label: string; color: string; bgColor: string }> = {
  optimal: { label: "적정", color: "text-success", bgColor: "bg-success/10" },
  low: { label: "부족", color: "text-warning", bgColor: "bg-warning/10" },
  critical: { label: "긴급", color: "text-destructive", bgColor: "bg-destructive/10" },
  excess: { label: "과잉", color: "text-primary", bgColor: "bg-primary/10" }
}

function StockLevelBar({ item }: { item: InventoryItem }) {
  const percentage = (item.currentStock / item.maxStock) * 100
  const minPercentage = (item.minStock / item.maxStock) * 100
  const optimalPercentage = (item.optimalStock / item.maxStock) * 100

  return (
    <div className="relative h-3 bg-muted rounded-full overflow-hidden">
      {/* Current stock level */}
      <div 
        className={cn(
          "absolute h-full rounded-full transition-all",
          item.status === "optimal" && "bg-success",
          item.status === "low" && "bg-warning",
          item.status === "critical" && "bg-destructive",
          item.status === "excess" && "bg-primary"
        )}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
      {/* Min stock indicator */}
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-destructive/50"
        style={{ left: `${minPercentage}%` }}
      />
      {/* Optimal stock indicator */}
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-foreground/30"
        style={{ left: `${optimalPercentage}%` }}
      />
    </div>
  )
}

function InventoryCard({ item }: { item: InventoryItem }) {
  const config = statusConfig[item.status]

  return (
    <Card className={cn(
      "transition-all hover:border-primary/50",
      item.status === "critical" && "border-destructive/50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium text-foreground">{item.name}</h4>
            <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
          </div>
          <Badge className={cn("text-xs", config.bgColor, config.color)} variant="outline">
            {config.label}
          </Badge>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-2xl font-bold text-foreground">
                {item.currentStock.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">{item.unit}</span>
            </div>
            <StockLevelBar item={item} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>최소: {item.minStock.toLocaleString()}</span>
              <span>최대: {item.maxStock.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className={cn(
              "flex items-center gap-1 text-sm",
              item.trend === "up" ? "text-success" : 
              item.trend === "down" ? "text-destructive" : "text-muted-foreground"
            )}>
              {item.trend === "up" ? <TrendingUp className="w-4 h-4" /> :
               item.trend === "down" ? <TrendingDown className="w-4 h-4" /> :
               <ArrowRight className="w-4 h-4" />}
              <span>{item.trendValue > 0 ? "+" : ""}{item.trendValue}%</span>
            </div>
            
            {item.daysToReorder !== null && (
              <div className="flex items-center gap-1 text-sm text-warning">
                <Clock className="w-4 h-4" />
                <span>{item.daysToReorder}일 내 발주 필요</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AIPredictionPanel() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const runAnalysis = async () => {
    setIsAnalyzing(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsAnalyzing(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">AI 재고 예측</CardTitle>
              <CardDescription>머신러닝 기반 수요 예측</CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={runAnalysis} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                재분석
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Prediction Chart */}
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={predictionData}>
                <defs>
                  <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="day" 
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#f3f4f6"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="predicted"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fill="url(#predictedGradient)"
                  strokeDasharray="5 5"
                  name="예측 재고"
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={{ fill: "#22c55e", r: 5 }}
                  name="실제 재고"
                />
              </AreaChart>
            </ResponsiveContainer>
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
                  <span className="text-foreground font-medium">HBM3E 12단 스택</span>
                  <span className="text-muted-foreground"> - 현재 소비율 기준 1일 내 최소 재고 이하로 감소 예상. 즉시 발주 권장.</span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-lg bg-warning/10">
                <Clock className="w-4 h-4 text-warning mt-0.5" />
                <div>
                  <span className="text-foreground font-medium">Logic Die</span>
                  <span className="text-muted-foreground"> - 5일 내 최소 재고 도달 예상. 발주 준비 필요.</span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                <div>
                  <span className="text-foreground font-medium">DRAM Die</span>
                  <span className="text-muted-foreground"> - 현재 재고 수준 적정. 2주 이상 운영 가능.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ConsumptionChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">소비/생산 추이</CardTitle>
        <CardDescription>최근 8일간 칩 소비 및 생산량</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={consumptionHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9ca3af"
                fontSize={12}
              />
              <YAxis 
                stroke="#9ca3af"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#f3f4f6"
                }}
              />
              <Bar dataKey="production" name="생산" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="consumption" name="소비" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default function InventoryPage() {
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredInventory = useMemo(() => {
    return inventoryData.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.sku.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
      const matchesStatus = statusFilter === "all" || item.status === statusFilter
      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [searchTerm, categoryFilter, statusFilter])

  const stats = useMemo(() => {
    const critical = inventoryData.filter(i => i.status === "critical").length
    const low = inventoryData.filter(i => i.status === "low").length
    const optimal = inventoryData.filter(i => i.status === "optimal").length
    const totalItems = inventoryData.length
    return { critical, low, optimal, totalItems }
  }, [])

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Boxes className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">전체 품목</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">적정 재고</p>
                <p className="text-2xl font-bold text-success">{stats.optimal}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">부족 경고</p>
                <p className="text-2xl font-bold text-warning">{stats.low}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">긴급 발주</p>
                <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Prediction */}
        <div className="lg:col-span-2">
          <AIPredictionPanel />
        </div>
        
        {/* Consumption Chart */}
        <ConsumptionChart />
      </div>

      {/* Inventory List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>칩 재고 목록</CardTitle>
              <CardDescription>적층 공정용 칩 및 완제품 재고 현황</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="품목명 또는 SKU 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 카테고리</SelectItem>
                <SelectItem value="raw_die">원자재</SelectItem>
                <SelectItem value="dram_die">DRAM Die</SelectItem>
                <SelectItem value="logic_die">Logic Die</SelectItem>
                <SelectItem value="hbm_stack">HBM 스택</SelectItem>
                <SelectItem value="finished">완제품</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="optimal">적정</SelectItem>
                <SelectItem value="low">부족</SelectItem>
                <SelectItem value="critical">긴급</SelectItem>
                <SelectItem value="excess">과잉</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Inventory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredInventory.map((item) => (
              <InventoryCard key={item.id} item={item} />
            ))}
          </div>

          {filteredInventory.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>검색 조건에 맞는 품목이 없습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

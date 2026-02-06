"use client"

import React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

import { useState, useMemo, useEffect } from "react"
// @ts-ignore
import * as XLSX from "xlsx"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  LineChart,
  Activity
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  LineChart as RechartsLineChart,
  Line,
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
  Legend,
  Area,
  AreaChart
} from "recharts"

// Demo data generation
function generateLogData(count: number) {
  const logs = []
  const statuses = ["completed", "failed", "processing"] as const
  const grades = ["A+", "A", "B+", "B", "C", "F"] as const

  for (let i = 0; i < count; i++) {
    const date = new Date()
    date.setHours(date.getHours() - i * 2)

    const status = Math.random() > 0.1 ? "completed" : Math.random() > 0.5 ? "failed" : "processing"
    const yieldValue = status === "completed" ? 88 + Math.random() * 10 : null

    logs.push({
      id: `HBM-${String(10000 - i).padStart(5, "0")}`,
      timestamp: date.toISOString(),
      stackType: Math.random() > 0.5 ? "HBM3" : "HBM3E",
      layers: Math.random() > 0.5 ? 12 : 8,
      status,
      yield: yieldValue,
      grade: yieldValue ? grades[Math.floor((100 - yieldValue) / 3)] : null,
      tsvYield: status === "completed" ? 96 + Math.random() * 3 : null,
      bondingYield: status === "completed" ? 95 + Math.random() * 4 : null,
      cycleTime: status === "completed" ? 45 + Math.random() * 15 : null,
      defects: status === "completed" ? Math.floor(Math.random() * 5) : null
    })
  }

  return logs
}

// Chart data
const yieldTrendData = [
  { date: "01/13", yield: 92.1, legacy: 91.2 },
  { date: "01/14", yield: 93.4, legacy: 92.4 },
  { date: "01/15", yield: 91.8, legacy: 90.9 },
  { date: "01/16", yield: 94.2, legacy: 93.2 },
  { date: "01/17", yield: 93.8, legacy: 92.9 },
  { date: "01/18", yield: 95.1, legacy: 94.2 },
  { date: "01/19", yield: 94.6, legacy: 93.6 },
  { date: "01/20", yield: 93.9, legacy: 93.0 },
  { date: "01/21", yield: 94.8, legacy: 93.8 },
]

const defectDistribution = [
  { name: "TSV 정렬", value: 35, color: "#3b82f6" },
  { name: "본딩 불량", value: 28, color: "#22c55e" },
  { name: "다이 크랙", value: 18, color: "#f59e0b" },
  { name: "오염", value: 12, color: "#ef4444" },
  { name: "기타", value: 7, color: "#8b5cf6" },
]

const productionVolume = [
  { date: "01/13", hbm3: 120, hbm3e: 85 },
  { date: "01/14", hbm3: 135, hbm3e: 92 },
  { date: "01/15", hbm3: 128, hbm3e: 88 },
  { date: "01/16", hbm3: 142, hbm3e: 95 },
  { date: "01/17", hbm3: 138, hbm3e: 102 },
  { date: "01/18", hbm3: 155, hbm3e: 110 },
  { date: "01/19", hbm3: 148, hbm3e: 108 },
  { date: "01/20", hbm3: 160, hbm3e: 115 },
  { date: "01/21", hbm3: 152, hbm3e: 118 },
]

function StatCard({
  title,
  value,
  change,
  trend,
  icon: Icon
}: {
  title: string
  value: string
  change: string
  trend: "up" | "down"
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            <div className={cn(
              "flex items-center gap-1 text-xs mt-1",
              trend === "up" ? "text-success" : "text-destructive"
            )}>
              {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{change}</span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LogTable({ logs }: { logs: ReturnType<typeof generateLogData> }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ID</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">시간</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">타입</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">상태</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">수율</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">등급</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">TSV</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">본딩</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">사이클</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
              <td className="py-3 px-4 text-sm font-mono text-foreground">{log.id}</td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {mounted
                  ? new Date(log.timestamp).toLocaleString("ko-KR", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit"
                  })
                  : log.timestamp.split('T')[0] // 서버에서는 날짜만 표시
                }
              </td>
              <td className="py-3 px-4">
                <Badge variant="outline" className="text-xs">
                  {log.stackType} ({log.layers}단)
                </Badge>
              </td>
              <td className="py-3 px-4">
                <Badge
                  variant={log.status === "completed" ? "default" : log.status === "failed" ? "destructive" : "secondary"}
                  className={cn(
                    "text-xs",
                    log.status === "completed" && "bg-success text-success-foreground"
                  )}
                >
                  {log.status === "completed" ? "완료" : log.status === "failed" ? "실패" : "처리중"}
                </Badge>
              </td>
              <td className="py-3 px-4 text-sm text-foreground">
                {log.yield ? `${log.yield.toFixed(1)}%` : "-"}
              </td>
              <td className="py-3 px-4">
                {log.grade && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-bold",
                      log.grade.startsWith("A") && "border-success text-success",
                      log.grade.startsWith("B") && "border-primary text-primary",
                      log.grade === "C" && "border-warning text-warning",
                      log.grade === "F" && "border-destructive text-destructive"
                    )}
                  >
                    {log.grade}
                  </Badge>
                )}
              </td>
              <td className="py-3 px-4 text-sm text-foreground">
                {log.tsvYield ? `${log.tsvYield.toFixed(1)}%` : "-"}
              </td>
              <td className="py-3 px-4 text-sm text-foreground">
                {log.bondingYield ? `${log.bondingYield.toFixed(1)}%` : "-"}
              </td>
              <td className="py-3 px-4 text-sm text-foreground">
                {log.cycleTime ? `${log.cycleTime.toFixed(0)}min` : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Loading() {
  return null
}

export default function HBMLogsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [logs, setLogs] = useState<ReturnType<typeof generateLogData>>([])

  // 클라이언트에서만 랜덤 데이터 생성 (hydration 에러 방지)
  useEffect(() => {
    setLogs(generateLogData(50))
  }, [])

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.id.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "all" || log.status === statusFilter
      const matchesType = typeFilter === "all" || log.stackType === typeFilter
      return matchesSearch && matchesStatus && matchesType
    })
  }, [logs, searchTerm, statusFilter, typeFilter])

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)

  const exportToExcel = () => {
    // 엑셀에 출력할 데이터 준비
    const excelData = filteredLogs.map(log => ({
      ID: log.id,
      시간: new Date(log.timestamp).toLocaleString("ko-KR"),
      타입: log.stackType,
      레이어: `${log.layers}단`,
      상태: log.status === "completed" ? "완료" : log.status === "failed" ? "실패" : "처리중",
      수율: log.yield ? `${log.yield.toFixed(1)}%` : "-",
      등급: log.grade || "-",
      "TSV 수율": log.tsvYield ? `${log.tsvYield.toFixed(1)}%` : "-",
      "본딩 수율": log.bondingYield ? `${log.bondingYield.toFixed(1)}%` : "-",
      "사이클 타임": log.cycleTime ? `${log.cycleTime.toFixed(0)}min` : "-",
      결함수: log.defects || "-"
    }))

    // 워크북 생성
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)

    // 컬럼 너비 설정
    const colWidths = [
      { wch: 12 }, // ID
      { wch: 20 }, // 시간
      { wch: 8 },  // 타입
      { wch: 8 },  // 레이어
      { wch: 8 },  // 상태
      { wch: 10 }, // 수율
      { wch: 6 },  // 등급
      { wch: 12 }, // TSV 수율
      { wch: 12 }, // 본딩 수율
      { wch: 12 }, // 사이클 타임
      { wch: 8 }   // 결함수
    ]
    ws['!cols'] = colWidths

    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(wb, ws, "HBM 생산 로그")

    // 파일명 생성 (현재 날짜/시간 포함)
    const fileName = `HBM_생산로그_${new Date().toISOString().split('T')[0].replace(/-/g, '')}_${new Date().toTimeString().split(' ')[0].replace(/:/g, '')}.xlsx`

    // 엑셀 파일 다운로드
    XLSX.writeFile(wb, fileName)
  }

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="일일 생산량"
            value="270"
            change="+12% vs 어제"
            trend="up"
            icon={Activity}
          />
          <StatCard
            title="평균 수율"
            value="94.8%"
            change="+0.9% vs 지난주"
            trend="up"
            icon={TrendingUp}
          />
          <StatCard
            title="A등급 비율"
            value="87.2%"
            change="+2.1% vs 지난주"
            trend="up"
            icon={BarChart3}
          />
          <StatCard
            title="평균 사이클"
            value="52min"
            change="-3min vs 지난주"
            trend="up"
            icon={RefreshCw}
          />
        </div>

        {/* Charts */}
        <Tabs defaultValue="yield" className="space-y-4">
          <TabsList>
            <TabsTrigger value="yield">수율 추이</TabsTrigger>
            <TabsTrigger value="production">생산량</TabsTrigger>
            <TabsTrigger value="defects">결함 분포</TabsTrigger>
          </TabsList>

          <TabsContent value="yield">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>수율 추이 (최근 9일)</CardTitle>
                    <CardDescription>일별 평균 수율 및 목표 대비 현황</CardDescription>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
                      optimal
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                      legacy
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-visible">
                <div className="h-[300px] py-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={yieldTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="legacyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        fontSize={12}
                      />
                      <YAxis
                        domain={[88, 98]}
                        stroke="#9ca3af"
                        fontSize={12}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                          color: "#f3f4f6",
                          zIndex: 1000
                        }}
                        wrapperStyle={{ zIndex: 1000 }}
                        position={{ y: -10 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="legacy"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fill="url(#legacyGradient)"
                        name="legacy"
                        dot={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="yield"
                        stroke="#3b82f6"
                        strokeWidth={4}
                        fill="url(#yieldGradient)"
                        name="optimal"
                        dot={{ fill: "#3b82f6", strokeWidth: 2, r: 5, stroke: "#fff" }}
                        activeDot={{ r: 7, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="production">
            <Card>
              <CardHeader>
                <CardTitle>생산량 현황</CardTitle>
                <CardDescription>HBM 타입별 일일 생산량</CardDescription>
              </CardHeader>
              <CardContent className="overflow-visible">
                <div className="h-[300px] py-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productionVolume} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                          color: "#f3f4f6",
                          zIndex: 1000
                        }}
                        wrapperStyle={{ zIndex: 1000 }}
                        position={{ y: -10 }}
                      />
                      <Legend />
                      <Bar dataKey="hbm3" name="HBM3" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="hbm3e" name="HBM3E" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="defects">
            <Card>
              <CardHeader>
                <CardTitle>결함 유형 분포</CardTitle>
                <CardDescription>최근 7일간 결함 유형별 비율</CardDescription>
              </CardHeader>
              <CardContent className="overflow-visible">
                <div className="h-[300px] flex items-center justify-center py-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={defectDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={true}
                      >
                        {defectDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                          color: "#f3f4f6",
                          zIndex: 1000
                        }}
                        wrapperStyle={{ zIndex: 1000 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Log Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>HBM 생산 로그</CardTitle>
                <CardDescription>TSV 공정 기반 HBM 스택 생산 이력</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                <Download className="w-4 h-4 mr-2" />
                내보내기
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ID로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="processing">처리중</SelectItem>
                  <SelectItem value="failed">실패</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="타입" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 타입</SelectItem>
                  <SelectItem value="HBM3">HBM3</SelectItem>
                  <SelectItem value="HBM3E">HBM3E</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <LogTable logs={paginatedLogs} />

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {filteredLogs.length}개 중 {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, filteredLogs.length)}개 표시
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-foreground">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Suspense>
  )
}

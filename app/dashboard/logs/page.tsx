"use client"

import React from "react"
import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"

import { useState, useMemo, useEffect } from "react"
// @ts-ignore
import * as XLSX from "xlsx"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  Activity,
  CheckCircle2,
  XCircle
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
  AreaChart,
  ComposedChart
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
  const router = useRouter()

  // Filter States
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  // Pagination & Data States
  const [currPage, setCurrPage] = useState(1)
  const itemsPerPage = 10
  const [logsList, setLogsList] = useState<any[]>([])

  // Stats state
  const [stats, setStats] = useState({
    today: { total_production: 0, avg_yield: 0.0, grade_a_ratio: 0.0, avg_cycle: 0.0 },
    yesterday: { total_production: 0, avg_yield: 0.0, grade_a_ratio: 0.0, avg_cycle: 0.0 }
  })
  const [trendData, setTrendData] = useState([])

  const handleBatchClick = (log: any) => {
    // 2페이지(적층 구조 시각화)로 이동, batchId 전달
    router.push(`/dashboard/stacking?batchId=${log.tsv_num}`)
  }

  // 데이터 가져오기
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'

        // 1. Fetch Daily Stats
        const res = await fetch(`${API_URL}/log/stats/daily`)
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }

        // 2. Fetch Trend Data
        const resTrend = await fetch(`${API_URL}/log/stats/trend`)
        if (resTrend.ok) {
          const rawData = await resTrend.json()
          const processedData = rawData.map((item: any) => ({
            ...item,
            tsv_num: item.id, // id -> tsv_num 매핑
            total: item.production, // production -> total 매핑
            grade_a_ratio: item.grade_a_ratio !== undefined ? item.grade_a_ratio : (item.production > 0 ? parseFloat(((item.grade_a / item.production) * 100).toFixed(1)) : 0)
          }))
          setTrendData(processedData as any)
        }

        // 3. Fetch Full Log List
        const resList = await fetch(`${API_URL}/log/list`)
        if (resList.ok) {
          const listData = await resList.json()
          // Batch ID (tsv_num) 내림차순 정렬 (최신 번호 상단)
          const sortedList = listData.sort((a: any, b: any) => b.tsv_num - a.tsv_num)

          const processedList = sortedList.map((item: any) => {
            const totalProduction = item.stack_count || 0
            const gradeARatio = totalProduction > 0
              ? (item.grade_a / totalProduction) * 100
              : 0

            return {
              ...item,
              // tsv_num is already in item, using it directly
              total: totalProduction,
              date: new Date(item.created_at).toLocaleString("ko-KR"),
              yield: item.avg_yield || 0,
              grade_a_ratio: gradeARatio,
              grade_a: item.grade_a || 0,
              grade_b: item.grade_b || 0,
              grade_c: item.grade_c || 0,
              // 필터링을 위한 추가 정보
              status: 'completed',
              stackType: 'HBM3'
            }
          })

          setLogsList(processedList)
        }

      } catch (e) {
        console.error("Stats fetch error:", e)
      }
    }
    fetchStats()
  }, [])

  // Filtering Logic
  const filteredLogs = useMemo(() => {
    return logsList.filter(log => {
      const matchesSearch = (log.tsv_num && log.tsv_num.toString().toLowerCase().includes(searchTerm.toLowerCase())) || false
      // API 데이터에 status/type이 정확히 없다면 필터가 동작 안 할 수 있음. 필요시 API 필드 확인 필요
      const matchesStatus = statusFilter === "all" || log.status === statusFilter
      const matchesType = typeFilter === "all" || log.stackType === typeFilter
      return matchesSearch && matchesStatus && matchesType
    })
  }, [logsList, searchTerm, statusFilter, typeFilter])

  // Pagination Logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
  const paginatedLogs = filteredLogs.slice(
    (currPage - 1) * itemsPerPage,
    currPage * itemsPerPage
  )

  const handlePrevPage = () => {
    if (currPage > 1) setCurrPage(currPage - 1)
  }

  const handleNextPage = () => {
    if (currPage < totalPages) setCurrPage(currPage + 1)
  }

  const exportToExcel = () => {
    // 엑셀에 출력할 데이터 준비
    const excelData = filteredLogs.map(log => ({
      ID: `Batch #${log.tsv_num}`,
      시간: log.date,
      "총 생산량": `${log.total} Stacks`,
      수율: `${log.yield.toFixed(1)}%`,
      "A등급 점유율": `${log.grade_a_ratio.toFixed(2)}%`,
      "등급(A)": log.grade_a,
      "등급(B)": log.grade_b,
      "등급(C)": log.grade_c
    }))

    // 워크북 생성
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)

    // 컬럼 너비 설정
    const colWidths = [
      { wch: 15 }, // ID
      { wch: 22 }, // 시간
      { wch: 12 }, // 총 생산량
      { wch: 10 }, // 수율
      { wch: 15 }, // A등급 점유율
      { wch: 10 }, // 등급 A
      { wch: 10 }, // 등급 B
      { wch: 10 }  // 등급 C
    ]
    ws['!cols'] = colWidths

    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(wb, ws, "HBM 생산 로그")

    // 파일명 생성
    const fileName = `HBM_생산로그_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.xlsx`

    // 엑셀 파일 다운로드
    XLSX.writeFile(wb, fileName)
  }

  // Calculate trends
  const prodDiff = stats.today.total_production - stats.yesterday.total_production
  const prodTrend = prodDiff >= 0 ? "up" : "down"
  const prodChange = stats.yesterday.total_production > 0
    ? `${(prodDiff / stats.yesterday.total_production * 100).toFixed(1)}%`
    : "0%"

  const yieldDiff = stats.today.avg_yield - stats.yesterday.avg_yield
  const yieldTrend = yieldDiff >= 0 ? "up" : "down"
  const yieldChange = `${Math.abs(yieldDiff).toFixed(1)}%p`

  const gradeDiff = stats.today.grade_a_ratio - stats.yesterday.grade_a_ratio
  const gradeTrend = gradeDiff >= 0 ? "up" : "down"
  const gradeChange = `${Math.abs(gradeDiff).toFixed(1)}%p`

  const cycleDiff = stats.today.avg_cycle - stats.yesterday.avg_cycle
  const cycleTrend = cycleDiff <= 0 ? "up" : "down" // Lower cycle time is better (up logic for success color)
  const cycleChange = `${Math.abs(cycleDiff).toFixed(1)}min`

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="일일 생산량"
            value={`${stats.today.total_production}`}
            change={`${prodTrend === 'up' ? '+' : ''}${prodChange} vs 어제`}
            trend={prodTrend}
            icon={Activity}
          />
          <StatCard
            title="일일 평균 수율"
            value={`${stats.today.avg_yield.toFixed(1)}%`}
            change={`${yieldTrend === 'up' ? '+' : '-'}${yieldChange} vs 어제`}
            trend={yieldTrend}
            icon={TrendingUp}
          />
          <StatCard
            title="일일 A등급 비율"
            value={`${stats.today.grade_a_ratio.toFixed(1)}%`}
            change={`${gradeTrend === 'up' ? '+' : '-'}${gradeChange} vs 어제`}
            trend={gradeTrend}
            icon={BarChart3}
          />
          <StatCard
            title="일일 평균 사이클"
            value={`${stats.today.avg_cycle.toFixed(0)}min`}
            change={`${cycleDiff > 0 ? '+' : '-'}${cycleChange} vs 어제`}
            trend={cycleTrend} // Lower is better
            icon={RefreshCw}
          />
        </div>

        {/* Charts */}
        {/* Combined Trend Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>종합 생산 현황 (최근 10회)</CardTitle>
            <CardDescription>시뮬레이션 배차별 생산량(등급 분포) 및 수율 추이</CardDescription>
          </CardHeader>
          <CardContent className="overflow-visible">
            <div className="h-[400px] w-full py-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid stroke="#374151" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: '생산량 (Stacks)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#3b82f6"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    label={{ value: '수율 (%)', angle: 90, position: 'insideRight', fill: '#3b82f6' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6" }}
                    wrapperStyle={{ zIndex: 1000 }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />

                  {/* Stacked Bars for Grade Distribution */}
                  <Bar yAxisId="left" dataKey="grade_a" name="Grade A" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} barSize={40} />
                  <Bar yAxisId="left" dataKey="grade_b" name="Grade B" stackId="a" fill="#f59e0b" barSize={40} />
                  <Bar yAxisId="left" dataKey="grade_c" name="Grade C" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />

                  {/* Line for Yield */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="yield"
                    name="평균 수율"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4, stroke: "#fff" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  {/* Line for Grade A Ratio */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="grade_a_ratio"
                    name="A등급 비율"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4, stroke: "#fff" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Log Table */}
        {/* Tabs for Logs & Detail */}
        {/* Log Table Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>HBM 생산 로그</CardTitle>
                <CardDescription>시뮬레이션 배차별 요약 정보 (클릭하여 상세 시각화 페이지로 이동)</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                <Download className="w-4 h-4 mr-2" />
                내보내기
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>생성 시간</TableHead>
                  <TableHead>총 생산량</TableHead>
                  <TableHead>평균 수율</TableHead>
                  <TableHead>A등급 점유율</TableHead>
                  <TableHead className="w-[200px]">등급 분포 (A / B / C)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log: any) => (
                    <TableRow
                      key={log.tsv_num}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleBatchClick(log)}
                    >
                      <TableCell className="font-medium">Batch #{log.tsv_num}</TableCell>
                      <TableCell>{log.date}</TableCell>
                      <TableCell>{log.total} Stacks</TableCell>
                      <TableCell>
                        <span className={cn(
                          "font-medium",
                          log.yield >= 95 ? "text-green-500" : log.yield >= 90 ? "text-yellow-500" : "text-red-500"
                        )}>
                          {log.yield.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>{log.grade_a_ratio.toFixed(2)}%</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5 w-full">
                          {/* Modern Stacked Bar Visual */}
                          <div className="flex w-full h-2.5 rounded-full overflow-hidden bg-muted">
                            <div style={{ width: `${(log.grade_a / log.total) * 100}%` }} className="h-full bg-green-500" />
                            <div style={{ width: `${(log.grade_b / log.total) * 100}%` }} className="h-full bg-yellow-500" />
                            <div style={{ width: `${(log.grade_c / log.total) * 100}%` }} className="h-full bg-red-500" />
                          </div>
                          {/* Labels */}
                          <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                            <span className="text-green-500 font-medium">{log.grade_a}</span>
                            <span className="text-yellow-500 font-medium">{log.grade_b}</span>
                            <span className="text-red-500 font-medium">{log.grade_c}</span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {/* Pagination Controls */}
            <div className="flex items-center justify-center gap-1.5 py-4 mt-4">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handlePrevPage}
                disabled={currPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {/* Page Numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  // 간단한 페이지네이션 표시 로직: 처음, 마지막, 그리고 현재 페이지 주변만 표시
                  return (
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currPage) <= 2
                  )
                })
                .map((page, index, array) => {
                  // 생략(...) 처리
                  const prevPage = array[index - 1]
                  const showEllipsis = prevPage && page - prevPage > 1

                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span className="px-1 text-muted-foreground">...</span>}
                      <Button
                        variant={currPage === page ? "default" : "outline"}
                        size="sm"
                        className={cn("h-8 w-8", currPage === page ? "pointer-events-none" : "")}
                        onClick={() => setCurrPage(page)}
                      >
                        {page}
                      </Button>
                    </React.Fragment>
                  )
                })}

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleNextPage}
                disabled={currPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Suspense>
  )
}

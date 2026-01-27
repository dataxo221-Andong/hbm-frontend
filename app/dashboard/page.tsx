"use client"

import React, { memo, useCallback } from "react"

import { useState, useRef, useEffect } from "react"
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
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { WaferMapVisualization } from "@/components/wafer-map"

// Process flow steps
const PROCESS_STEPS = [
  { id: 1, name: "데이터 업로드", description: ".pkl 분석 데이터 입력" },
  { id: 2, name: "전처리", description: "노이즈 제거 및 정규화" },
  { id: 3, name: "결함 검출", description: "AI 기반 결함 탐지" },
  { id: 4, name: "분류", description: "Good/Bad Die 분류" },
  { id: 5, name: "등급 산정", description: "수율 및 등급 계산" },
]

// Demo wafer data
const DEMO_WAFERS = [
  { id: "WF-2024-001", batch: "B001", status: "completed", yield: 94.2, grade: "A" },
  { id: "WF-2024-002", batch: "B001", status: "completed", yield: 91.8, grade: "A" },
  { id: "WF-2024-003", batch: "B001", status: "processing", yield: null, grade: null },
  { id: "WF-2024-004", batch: "B002", status: "pending", yield: null, grade: null },
  { id: "WF-2024-005", batch: "B002", status: "pending", yield: null, grade: null },
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

const WaferCard = memo(function WaferCard({ wafer, onView }: { wafer: typeof DEMO_WAFERS[0]; onView: () => void }) {
  return (
    <Card className={cn(
      "cursor-pointer transition-all hover:border-primary/50",
      wafer.status === "processing" && "border-primary/50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-foreground">{wafer.id}</h4>
            <p className="text-sm text-muted-foreground">배치: {wafer.batch}</p>
          </div>
          <Badge
            variant={
              wafer.status === "completed" ? "default" :
                wafer.status === "processing" ? "secondary" : "outline"
            }
            className={cn(
              wafer.status === "completed" && "bg-success text-success-foreground"
            )}
          >
            {wafer.status === "completed" ? "완료" :
              wafer.status === "processing" ? "처리중" : "대기"}
          </Badge>
        </div>

        {wafer.status === "completed" && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">수율</span>
              <span className="font-medium text-foreground">{wafer.yield}%</span>
            </div>
            <Progress value={wafer.yield || 0} className="mt-1 h-1.5" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-muted-foreground">등급</span>
              <Badge variant="outline" className="font-bold">
                {wafer.grade}
              </Badge>
            </div>
          </div>
        )}

        {wafer.status === "processing" && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>분석 진행 중...</span>
            </div>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3 bg-transparent"
          onClick={onView}
          disabled={wafer.status !== "completed"}
        >
          <Eye className="w-4 h-4 mr-2" />
          상세 보기
        </Button>
      </CardContent>
    </Card>
  )
})

const ClassificationStats = memo(function ClassificationStats() {
  const stats = [
    { label: "총 분석 웨이퍼", value: "1,247", change: "+23" },
    { label: "평균 수율", value: "93.4%", change: "+1.2%" },
    { label: "Good Die", value: "892,340", change: "+15,420" },
    { label: "불량률", value: "6.6%", change: "-1.2%" },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">{stat.label}</div>
            <div className="text-2xl font-bold text-foreground mt-1">{stat.value}</div>
            <div className={cn(
              "text-xs mt-1",
              stat.change.startsWith("+") ? "text-success" : "text-destructive"
            )}>
              {stat.change} vs 지난주
            </div>
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
  const [wafers, setWafers] = useState(DEMO_WAFERS)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [showResultModal, setShowResultModal] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [waferMapStats, setWaferMapStats] = useState<{ good: number; bad: number; total: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      setUploadedFiles(Array.from(files))
      setCurrentStep(1)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files) {
      setUploadedFiles(Array.from(files))
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
      formData.append('wafer_image', uploadedFiles[0])

      // Step 1: Uploading
      setCurrentStep(1)

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://3.39.251.229:5000'

      // [Step 1] Upload: 접수 및 ID 발급
      const uploadResponse = await fetch(`${API_URL}/wafer/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${uploadResponse.statusText}`)
      }

      const uploadData = await uploadResponse.json()
      const lotName = uploadData.lotName

      // [Step 2] Processing Animation (사용자 경험용)
      for (let step = 2; step <= PROCESS_STEPS.length; step++) {
        setCurrentStep(step)
        // 백엔드 분석 시간을 벌어주면서 자연스러운 진행 연출
        await new Promise(resolve => setTimeout(resolve, 800))
      }

      // [Step 3] Analyze: 실제 분석 수행
      const analyzeResponse = await fetch(`${API_URL}/wafer/${lotName}/analyze`, {
        method: 'POST'
      })

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Analysis failed: ${analyzeResponse.statusText}`)
      }

      const analyzeData = await analyzeResponse.json()
      const resultData = analyzeData.result // { failureType, totalGrade, defectDensity, dieCount, ... }

      // Map Backend Response to UI Model
      const totalDie = resultData.dieCount || 1024
      const goodDieCount = totalDie - (resultData.defectCount || 0)
      const badDieCount = resultData.defectCount || 0

      // 수율 계산 (Good / Total) * 100
      const yieldVal = totalDie > 0
        ? parseFloat(((goodDieCount / totalDie) * 100).toFixed(1))
        : 0

      const result: AnalysisResult = {
        waferId: analyzeData.lotName,
        yield: yieldVal,
        grade: resultData.totalGrade || 'F',
        goodDie: goodDieCount,
        badDie: badDieCount,
        defects: [
          { type: resultData.failureType, count: badDieCount, percent: 100 }
        ],
        processedAt: new Date().toISOString(),
      }

      // Update wafers list
      setWafers(prev => [
        {
          id: result.waferId,
          batch: "BATCH-001",
          status: "completed" as const,
          yield: result.yield,
          grade: result.grade,
        },
        ...prev,
      ])

      setAnalysisResult(result)
      setWaferMapStats({
        good: goodDieCount,
        bad: badDieCount,
        total: totalDie
      })

      setCurrentStep(PROCESS_STEPS.length + 1)
      setIsProcessing(false)
      setShowResultModal(true)

    } catch (error) {
      console.error("Analysis Failed:", error)
      // Show specific error message for easier debugging
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

  const handleWaferView = useCallback((waferId: string) => {
    setSelectedWafer(waferId)
  }, [])

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <ClassificationStats />

      {/* Process Flow */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>웨이퍼 분석 공정 플로우</CardTitle>
              <CardDescription>.pkl 분석 데이터를 업로드하고 AI 기반 분류를 시작하세요</CardDescription>
            </div>
            <div className="flex gap-2">
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="relative group rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors overflow-hidden"
                      >
                        {previewUrls[index] ? (
                          <div className="relative aspect-square bg-muted max-h-32">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {wafers.map((wafer) => (
              <WaferCard
                key={wafer.id}
                wafer={wafer}
                onView={() => handleWaferView(wafer.id)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Wafer Map */}
            <Card>
              <CardHeader>
                <CardTitle>칩 맵</CardTitle>
                <CardDescription>원형 웨이퍼 칩 분포 및 결함 위치 시각화</CardDescription>
              </CardHeader>
              <CardContent>
                <WaferMapVisualization onStatsChange={setWaferMapStats} />
              </CardContent>
            </Card>

            {/* Classification Results */}
            <Card>
              <CardHeader>
                <CardTitle>분류 결과 상세</CardTitle>
                <CardDescription>WF-2024-001 분석 결과</CardDescription>
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

                  {/* 총합 표시 (검증용) */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium text-foreground">총 다이 개수</span>
                    <span className="text-lg font-bold text-foreground">
                      {waferMapStats?.total ?? 0}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground mb-3">결함 유형 분석</h4>
                  <div className="space-y-2">
                    {[
                      { type: "Edge Defect", count: 23, percent: 42 },
                      { type: "Particle", count: 15, percent: 27 },
                      { type: "Scratch", count: 10, percent: 18 },
                      { type: "Pattern Defect", count: 7, percent: 13 },
                    ].map((defect) => (
                      <div key={defect.type} className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground w-28">{defect.type}</span>
                        <Progress value={defect.percent} className="flex-1 h-2" />
                        <span className="text-sm font-medium text-foreground w-12 text-right">
                          {defect.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">결함 유형 분석</h4>
                <div className="space-y-2">
                  {analysisResult.defects.map((defect) => (
                    <div key={defect.type} className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-28">{defect.type}</span>
                      <Progress value={defect.percent} className="flex-1 h-2" />
                      <span className="text-sm font-medium text-foreground w-12 text-right">
                        {defect.count}
                      </span>
                    </div>
                  ))}
                </div>
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
    </div>
  )
}

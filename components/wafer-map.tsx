"use client"

import { useMemo, useState, useEffect, memo, useCallback } from "react"
import { cn } from "@/lib/utils"

type DieStatus = "good" | "bad" | "empty"

interface Die {
  x: number
  y: number
  status: DieStatus
}

function generateWaferMap(size: number = 20): Die[] {
  const dies: Die[] = []

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Generate random status with realistic distribution
      const rand = Math.random()
      let status: DieStatus
      
      const badProbability = 0.04

      if (rand < badProbability) {
        status = "bad"
      } else {
        status = "good"
      }

      dies.push({ x, y, status })
    }
  }

  return dies
}

const statusColors: Record<DieStatus, string> = {
  good: "bg-success hover:bg-success/80",
  bad: "bg-destructive hover:bg-destructive/80",
  empty: "bg-transparent"
}

const statusLabels: Record<DieStatus, string> = {
  good: "양품",
  bad: "불량",
  empty: ""
}

interface WaferMapStats {
  good: number
  bad: number
  total: number
}

export const WaferMapVisualization = memo(function WaferMapVisualization({ 
  onStatsChange,
  waferStats
}: { 
  onStatsChange?: (stats: WaferMapStats) => void
  waferStats?: { good: number; bad: number; total: number }
}) {
  const [dies, setDies] = useState<Die[]>([])
  const gridSize = 34 // 원형 테두리 크기
  const dieGridSize = 32 // 실제 다이 그리드 크기
  const dieOffset = (gridSize - dieGridSize) / 2 // 다이를 중앙에 배치하기 위한 오프셋 (1)

  // 웨이퍼 통계 데이터를 기반으로 맵 생성
  useEffect(() => {
    if (waferStats && waferStats.total > 0) {
      // 실제 통계에 맞춰 다이 생성
      const totalCells = dieGridSize * dieGridSize
      const goodCount = waferStats.good
      const badCount = waferStats.bad
      const emptyCount = totalCells - goodCount - badCount
      
      // 상태 배열 생성
      const statusArray: DieStatus[] = []
      for (let i = 0; i < goodCount; i++) statusArray.push("good")
      for (let i = 0; i < badCount; i++) statusArray.push("bad")
      for (let i = 0; i < emptyCount; i++) statusArray.push("empty")
      
      // 배열 섞기 (랜덤 배치)
      for (let i = statusArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [statusArray[i], statusArray[j]] = [statusArray[j], statusArray[i]]
      }
      
      // 다이 배열 생성
      const generatedDies: Die[] = []
      let statusIndex = 0
      for (let y = 0; y < dieGridSize; y++) {
        for (let x = 0; x < dieGridSize; x++) {
          const status = statusArray[statusIndex] || "empty"
          generatedDies.push({ x, y, status })
          statusIndex++
        }
      }
      
      const offsetDies = generatedDies.map(die => ({
        ...die,
        x: die.x + dieOffset,
        y: die.y + dieOffset
      }))
      setDies(offsetDies)
    } else {
      // 통계 데이터가 없으면 랜덤 생성 (기본 동작)
      const generatedDies = generateWaferMap(dieGridSize)
      const offsetDies = generatedDies.map(die => ({
        ...die,
        x: die.x + dieOffset,
        y: die.y + dieOffset
      }))
      setDies(offsetDies)
    }
  }, [dieOffset, waferStats])
  
  const centerX = gridSize / 2 - 0.5
  const centerY = gridSize / 2 - 0.5
  const radius = gridSize / 2 - 0.5

  // 원형 웨이퍼 내부인지 확인하는 함수
  const isInsideCircle = useCallback((x: number, y: number): boolean => {
    const dx = x - centerX
    const dy = y - centerY
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance <= radius
  }, [centerX, centerY, radius])

  // dies 배열을 Map으로 변환하여 O(1) 검색 최적화
  const dieMap = useMemo(() => {
    const map = new Map<string, Die>()
    dies.forEach(die => {
      map.set(`${die.x}-${die.y}`, die)
    })
    return map
  }, [dies])

  // isInsideCircle 결과를 미리 계산하여 메모이제이션
  const insideCircleMap = useMemo(() => {
    const map = new Map<string, boolean>()
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        map.set(`${x}-${y}`, isInsideCircle(x, y))
      }
    }
    return map
  }, [gridSize, isInsideCircle])

  // 32×32 다이 영역 내부인지 확인하는 함수
  const isInsideDieArea = useCallback((x: number, y: number): boolean => {
    return x >= dieOffset && x < dieOffset + dieGridSize && 
           y >= dieOffset && y < dieOffset + dieGridSize
  }, [dieOffset, dieGridSize])

  const stats = useMemo(() => {
    const counts = { good: 0, bad: 0 }
    dies.forEach(die => {
      const key = `${die.x}-${die.y}`
      // 원형 웨이퍼 내부이면서 32×32 다이 영역 내부인 것만 카운트
      if (die.status !== "empty" && insideCircleMap.get(key) && isInsideDieArea(die.x, die.y)) {
        counts[die.status]++
      }
    })
    return counts
  }, [dies, insideCircleMap, isInsideDieArea])

  const total = stats.good + stats.bad
  const confidencePercent = total > 0 ? ((stats.good / total) * 100).toFixed(1) : "0.0"

  // stats가 변경될 때마다 부모 컴포넌트에 알림
  useEffect(() => {
    if (onStatsChange && dies.length > 0) {
      onStatsChange({
        good: stats.good,
        bad: stats.bad,
        total: total
      })
    }
  }, [stats, total, dies.length, onStatsChange])

  // 클라이언트에서 데이터가 로드될 때까지 빈 상태 표시
  if (dies.length === 0) {
    return (
      <div className="space-y-4">
        <div className="relative aspect-square max-w-md mx-auto">
          <div className="absolute inset-0 flex items-center justify-center rounded-full border-2 border-border bg-muted/20">
            <div className="text-sm text-muted-foreground">로딩 중...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Chip Map Grid - 원형 웨이퍼 */}
      <div className="relative aspect-square max-w-md mx-auto">
        {/* 원형 마스크 배경 (가장 아래 레이어) */}
        <div 
          className="absolute inset-0 rounded-full border-2 border-border bg-muted/20"
          style={{ 
            clipPath: 'circle(50%)'
          }}
        />
        
        {/* 다이 그리드 + 경계선 통합 (렌더링 최적화) */}
        <div 
          className="absolute inset-0 grid gap-px p-1 overflow-hidden"
          style={{ 
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`,
            clipPath: 'circle(50%)'
          }}
        >
          {Array.from({ length: gridSize * gridSize }).map((_, index) => {
            const x = index % gridSize
            const y = Math.floor(index / gridSize)
            const key = `${x}-${y}`
            const die = dieMap.get(key)
            const insideCircle = insideCircleMap.get(key) ?? false
            const insideDieArea = isInsideDieArea(x, y)
            
            // 원형 웨이퍼 밖의 칩은 표시하지 않음
            if (!insideCircle) {
              return <div key={index} className="w-full h-full" />
            }
            
            // 32×32 다이 영역 밖이면 빈 칸으로 표시
            if (!insideDieArea) {
              return <div key={index} className="w-full h-full border border-border/30" />
            }
            
            if (!die) {
              return <div key={index} className="w-full h-full border border-border/30" />
            }

            // 다이 좌표를 1,1부터 시작하도록 표시
            const displayX = (x - dieOffset) + 1
            const displayY = (y - dieOffset) + 1

            return (
              <div
                key={index}
                className={cn(
                  "w-full h-full rounded-[1px] transition-colors cursor-pointer border border-border/30",
                  statusColors[die.status]
                )}
                title={`(${displayX}, ${displayY}): ${statusLabels[die.status]}`}
              />
            )
          })}
        </div>
      </div>

      {/* Confidence Info */}
      <div className="text-center">
        <div className="text-2xl font-bold text-foreground">{confidencePercent}%</div>
        <div className="text-sm text-muted-foreground">확신도 (Confidence)</div>
      </div>
    </div>
  )
})

// Compact version for use in lists
export const WaferMapMini = memo(function WaferMapMini({ 
  className,
  waferStats
}: { 
  className?: string
  waferStats?: { good: number; bad: number; total: number }
}) {
  const [dies, setDies] = useState<Die[]>([])
  const gridSize = 32

  // 웨이퍼 통계 데이터를 기반으로 맵 생성
  useEffect(() => {
    if (waferStats && waferStats.total > 0) {
      // 실제 통계에 맞춰 다이 생성
      const totalCells = gridSize * gridSize
      const goodCount = waferStats.good
      const badCount = waferStats.bad
      const emptyCount = totalCells - goodCount - badCount
      
      // 상태 배열 생성
      const statusArray: DieStatus[] = []
      for (let i = 0; i < goodCount; i++) statusArray.push("good")
      for (let i = 0; i < badCount; i++) statusArray.push("bad")
      for (let i = 0; i < emptyCount; i++) statusArray.push("empty")
      
      // 배열 섞기 (랜덤 배치)
      for (let i = statusArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [statusArray[i], statusArray[j]] = [statusArray[j], statusArray[i]]
      }
      
      // 다이 배열 생성
      const generatedDies: Die[] = []
      let statusIndex = 0
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const status = statusArray[statusIndex] || "empty"
          generatedDies.push({ x, y, status })
          statusIndex++
        }
      }
      
      setDies(generatedDies)
    } else {
      // 통계 데이터가 없으면 랜덤 생성 (기본 동작)
      setDies(generateWaferMap(32))
    }
  }, [waferStats])
  
  const centerX = gridSize / 2 - 0.5
  const centerY = gridSize / 2 - 0.5
  const radius = gridSize / 2 - 0.5

  // 원형 웨이퍼 내부인지 확인하는 함수
  const isInsideCircle = useCallback((x: number, y: number): boolean => {
    const dx = x - centerX
    const dy = y - centerY
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance <= radius
  }, [centerX, centerY, radius])

  // dies 배열을 Map으로 변환하여 O(1) 검색 최적화
  const dieMap = useMemo(() => {
    const map = new Map<string, Die>()
    dies.forEach(die => {
      map.set(`${die.x}-${die.y}`, die)
    })
    return map
  }, [dies])

  // isInsideCircle 결과를 미리 계산하여 메모이제이션
  const insideCircleMap = useMemo(() => {
    const map = new Map<string, boolean>()
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        map.set(`${x}-${y}`, isInsideCircle(x, y))
      }
    }
    return map
  }, [gridSize, isInsideCircle])

  // 클라이언트에서 데이터가 로드될 때까지 빈 상태 표시
  if (dies.length === 0) {
    return (
      <div className={cn("relative aspect-square flex items-center justify-center rounded-full border-2 border-border bg-muted/20", className)}>
        <div className="text-xs text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className={cn("relative aspect-square", className)}>
      <div 
        className="absolute inset-0 grid gap-px rounded-full border-2 border-border bg-muted/20 p-0.5 overflow-hidden"
        style={{ 
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`,
          clipPath: 'circle(50%)'
        }}
      >
        {Array.from({ length: gridSize * gridSize }).map((_, index) => {
          const x = index % gridSize
          const y = Math.floor(index / gridSize)
          const key = `${x}-${y}`
          const die = dieMap.get(key)
          const insideCircle = insideCircleMap.get(key) ?? false
          
          // 원형 웨이퍼 밖의 칩은 표시하지 않음
          if (!insideCircle) {
            return <div key={index} className="w-full h-full" />
          }
          
          if (!die) return <div key={index} className="w-full h-full" />

          return (
            <div
              key={index}
              className={cn(
                "w-full h-full rounded-[1px]",
                statusColors[die.status]
              )}
            />
          )
        })}
      </div>
    </div>
  )
})

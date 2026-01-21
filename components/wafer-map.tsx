"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"

type DieStatus = "good" | "bad" | "review" | "empty"

interface Die {
  x: number
  y: number
  status: DieStatus
}

function generateWaferMap(size: number = 20): Die[] {
  const dies: Die[] = []
  const center = size / 2
  const radius = size / 2 - 0.5

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Calculate distance from center
      const dx = x - center + 0.5
      const dy = y - center + 0.5
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Only include dies within the circular wafer
      if (distance <= radius) {
        // Generate random status with realistic distribution
        const rand = Math.random()
        let status: DieStatus
        
        // Edge defects are more common near the edge
        const edgeFactor = distance / radius
        const badProbability = 0.03 + edgeFactor * 0.08
        const reviewProbability = 0.02 + edgeFactor * 0.03

        if (rand < badProbability) {
          status = "bad"
        } else if (rand < badProbability + reviewProbability) {
          status = "review"
        } else {
          status = "good"
        }

        dies.push({ x, y, status })
      }
    }
  }

  return dies
}

const statusColors: Record<DieStatus, string> = {
  good: "bg-success hover:bg-success/80",
  bad: "bg-destructive hover:bg-destructive/80",
  review: "bg-warning hover:bg-warning/80",
  empty: "bg-transparent"
}

const statusLabels: Record<DieStatus, string> = {
  good: "양품",
  bad: "불량",
  review: "재검사",
  empty: ""
}

export function WaferMapVisualization() {
  const dies = useMemo(() => generateWaferMap(20), [])
  const gridSize = 20

  const stats = useMemo(() => {
    const counts = { good: 0, bad: 0, review: 0 }
    dies.forEach(die => {
      if (die.status !== "empty") {
        counts[die.status]++
      }
    })
    return counts
  }, [dies])

  const total = stats.good + stats.bad + stats.review
  const yieldPercent = ((stats.good / total) * 100).toFixed(1)

  return (
    <div className="space-y-4">
      {/* Wafer Map Grid */}
      <div className="relative aspect-square max-w-md mx-auto">
        {/* Wafer outline */}
        <div className="absolute inset-0 rounded-full border-2 border-border bg-muted/30" />
        
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-4 h-4">
          <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-muted-foreground/30" />
        </div>

        {/* Die Grid */}
        <div 
          className="absolute inset-2 grid gap-px"
          style={{ 
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`
          }}
        >
          {Array.from({ length: gridSize * gridSize }).map((_, index) => {
            const x = index % gridSize
            const y = Math.floor(index / gridSize)
            const die = dies.find(d => d.x === x && d.y === y)
            
            if (!die) {
              return <div key={index} className="w-full h-full" />
            }

            return (
              <div
                key={index}
                className={cn(
                  "w-full h-full rounded-sm transition-colors cursor-pointer",
                  statusColors[die.status]
                )}
                title={`(${x}, ${y}): ${statusLabels[die.status]}`}
              />
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-success" />
          <span className="text-muted-foreground">양품 ({stats.good})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-destructive" />
          <span className="text-muted-foreground">불량 ({stats.bad})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-warning" />
          <span className="text-muted-foreground">재검사 ({stats.review})</span>
        </div>
      </div>

      {/* Yield Info */}
      <div className="text-center">
        <div className="text-2xl font-bold text-foreground">{yieldPercent}%</div>
        <div className="text-sm text-muted-foreground">예상 수율</div>
      </div>
    </div>
  )
}

// Compact version for use in lists
export function WaferMapMini({ className }: { className?: string }) {
  const dies = useMemo(() => generateWaferMap(10), [])
  const gridSize = 10

  return (
    <div className={cn("relative aspect-square", className)}>
      <div className="absolute inset-0 rounded-full border border-border bg-muted/30" />
      <div 
        className="absolute inset-1 grid gap-px"
        style={{ 
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`
        }}
      >
        {Array.from({ length: gridSize * gridSize }).map((_, index) => {
          const x = index % gridSize
          const y = Math.floor(index / gridSize)
          const die = dies.find(d => d.x === x && d.y === y)
          
          if (!die) return <div key={index} />

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
}

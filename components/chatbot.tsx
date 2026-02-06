"use client"

import React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Send, Bot, User, Loader2, Cpu } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "안녕하세요! StackVision AI 어시스턴트입니다. 웨이퍼 분석, HBM 적층 구조, 수율 데이터, 재고 관리 등에 대해 도움을 드릴 수 있습니다. 무엇을 도와드릴까요?",
    timestamp: new Date()
  }
]

const DEMO_RESPONSES: Record<string, string> = {
  "수율": "현재 웨이퍼 배치의 평균 수율은 94.2%입니다. 지난 주 대비 1.3% 상승했으며, 주요 개선 요인은 TSV 공정 최적화입니다. 자세한 분석은 HBM 결과 로그 페이지에서 확인하실 수 있습니다.",
  "재고": "현재 칩 재고 현황입니다:\n- Good Die: 15,420개 (적정)\n- HBM 스택: 2,340개 (주의)\n- 완제품: 890개 (양호)\n\nHBM 스택 재고가 감소 추세입니다. AI 예측에 따르면 3일 내 추가 생산이 필요합니다.",
  "적층": "HBM3 8단 적층 기준으로 현재 적층 성공률은 97.8%입니다. 주요 불량 유형은 TSV 정렬 오차(1.2%)와 본딩 불량(0.8%)입니다. 적층 구조 시각화 페이지에서 3D 모델을 확인하실 수 있습니다.",
  "분류": "최근 분류된 웨이퍼 현황:\n- 양품(Good): 892장 (89.2%)\n- 재검사 필요: 78장 (7.8%)\n- 불량(Defect): 30장 (3.0%)\n\n불량 패턴 분석 결과, Edge 영역 결함이 주요 원인으로 파악됩니다.",
  "default": "질문을 이해했습니다. 해당 내용에 대해 분석 중입니다. 구체적인 데이터나 특정 기능에 대해 더 자세히 알고 싶으시다면 말씀해 주세요. 웨이퍼 분류, 적층 구조, 수율 분석, 재고 관리 등 다양한 영역에서 도움을 드릴 수 있습니다."
}

function getResponse(input: string): string {
  const lowerInput = input.toLowerCase()
  if (lowerInput.includes("수율") || lowerInput.includes("yield")) {
    return DEMO_RESPONSES["수율"]
  }
  if (lowerInput.includes("재고") || lowerInput.includes("inventory") || lowerInput.includes("stock")) {
    return DEMO_RESPONSES["재고"]
  }
  if (lowerInput.includes("적층") || lowerInput.includes("stack") || lowerInput.includes("hbm")) {
    return DEMO_RESPONSES["적층"]
  }
  if (lowerInput.includes("분류") || lowerInput.includes("classify") || lowerInput.includes("웨이퍼")) {
    return DEMO_RESPONSES["분류"]
  }
  return DEMO_RESPONSES["default"]
}

export function ChatBot({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input.trim()
    setInput("")
    setIsLoading(true)

    try {
      // 실제 백엔드 API 호출
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'
      
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message?.content || "죄송합니다. 응답을 받을 수 없습니다.",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('챗봇 API 오류:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "죄송합니다. 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* Slide Panel */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-full w-80 lg:w-96 border-l border-border bg-card flex flex-col z-50 shadow-2xl transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">AI 어시스턴트</h3>
              <p className="text-xs text-muted-foreground">StackVision AI</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-[#f8fafc] hover:bg-[#ef4444]"
          >
            <X className="w-4 h-4" />
            <span className="sr-only">닫기</span>
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <div className="whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-2 prose-h2:my-2 prose-h3:my-2">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  <span className="text-xs opacity-60 mt-1 block">
                    {message.timestamp.toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-2 border-t border-border">
          <div className="flex gap-1 flex-wrap">
            {["수율 현황", "재고 상태", "적층 분석", "분류 결과"].map((action) => (
              <Button
                key={action}
                variant="outline"
                size="sm"
                className="text-xs bg-transparent"
                onClick={() => {
                  setInput(action)
                }}
              >
                {action}
              </Button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              placeholder="메시지를 입력하세요..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="bg-input"
            />
            <Button size="icon" onClick={handleSend} disabled={!input.trim() || isLoading}>
              <Send className="w-4 h-4" />
              <span className="sr-only">전송</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

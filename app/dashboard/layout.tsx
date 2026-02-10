"use client"

import { ScrollArea } from "@/components/ui/scroll-area"

import React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  Layers3,
  BarChart3,
  Package,
  MessageSquare,
  Menu,
  ChevronLeft,
  LogOut,
  Settings,
  User,
  Cpu
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ChatBot } from "@/components/chatbot"

const navigation = [
  {
    name: "웨이퍼 모델링",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "웨이퍼 이미지 분류 및 공정 플로우"
  },
  {
    name: "칩 재고 관리",
    href: "/dashboard/inventory",
    icon: Package,
    description: "AI 기반 재고 예측 및 관리"
  },
  {
    name: "적층 구조 시각화",
    href: "/dashboard/stacking",
    icon: Layers3,
    description: "HBM 레이어 3D 시각화"
  },
  {
    name: "HBM 결과 로그",
    href: "/dashboard/logs",
    icon: BarChart3,
    description: "수율 및 파라미터 분석"
  },
]

function WaferIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" fill="none" />
      <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" fill="none" />
      <g stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3">
        {[...Array(9)].map((_, i) => (
          <line key={`h-${i}`} x1="5" y1={10 + i * 10} x2="95" y2={10 + i * 10} />
        ))}
        {[...Array(9)].map((_, i) => (
          <line key={`v-${i}`} x1={10 + i * 10} y1="5" x2={10 + i * 10} y2="95" />
        ))}
      </g>
      <path d="M50 5 L55 12 L45 12 Z" fill="currentColor" />
    </svg>
  )
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname()

  return (
    <div className={cn(
      "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <WaferIcon className="w-8 h-8 text-sidebar-primary flex-shrink-0" />
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-foreground">StackVision</span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "ml-auto text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed && "hidden"
          )}
          onClick={onToggle}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 overflow-y-auto">
        <nav className="px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className={cn(
                      "text-xs truncate",
                      isActive ? "text-sidebar-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {item.description}
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* User Menu */}
      <div className="p-4 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent",
                collapsed && "justify-center px-0"
              )}
            >
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
                  JD
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">임태민</div>
                  <div className="text-xs text-muted-foreground">엔지니어</div>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>내 계정</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="w-4 h-4 mr-2" />
              프로필
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              설정
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/" className="flex items-center text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Collapse button when collapsed */}
      {collapsed && (
        <div className="p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="icon"
            className="w-full text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={onToggle}
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function MobileNav() {
  const pathname = usePathname()

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="w-5 h-5" />
          <span className="sr-only">메뉴 열기</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 bg-sidebar">
        <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
          <WaferIcon className="w-8 h-8 text-sidebar-primary" />
          <span className="ml-3 text-lg font-bold text-sidebar-foreground">StackVision</span>
        </div>
        <div className="h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className={cn(
                      "text-xs",
                      isActive ? "text-sidebar-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {item.description}
                    </div>
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const pathname = usePathname()

  const currentPage = navigation.find(item => item.href === pathname) || navigation[0]

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center h-16 px-4 lg:px-6 border-b border-border bg-card">
          <MobileNav />
          
          <div className="ml-4 lg:ml-0">
            <h1 className="text-lg font-semibold text-foreground">{currentPage.name}</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">{currentPage.description}</p>
          </div>

          
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Chatbot Button */}
      <Button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-40 bg-primary hover:bg-primary/90"
        size="icon"
      >
        <MessageSquare className="w-6 h-6" />
      </Button>

      {/* Chatbot Panel */}
      <ChatBot isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}

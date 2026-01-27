"use client"

import React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { login, register } from "@/lib/api/auth"
import { toast } from "sonner"

function WaferIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" fill="none" />
      <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" fill="none" />
      <circle cx="50" cy="50" r="15" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" fill="none" />
      {/* Grid pattern */}
      <g stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3">
        {[...Array(9)].map((_, i) => (
          <line key={`h-${i}`} x1="5" y1={10 + i * 10} x2="95" y2={10 + i * 10} />
        ))}
        {[...Array(9)].map((_, i) => (
          <line key={`v-${i}`} x1={10 + i * 10} y1="5" x2={10 + i * 10} y2="95" />
        ))}
      </g>
      {/* Notch */}
      <path d="M50 5 L55 12 L45 12 Z" fill="currentColor" />
    </svg>
  )
}

function CircuitPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-10">
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="circuit" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M10 10 L90 10 M10 30 L50 30 L50 70 L90 70" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="10" cy="10" r="3" fill="currentColor" />
            <circle cx="90" cy="10" r="3" fill="currentColor" />
            <circle cx="50" cy="30" r="3" fill="currentColor" />
            <circle cx="50" cy="70" r="3" fill="currentColor" />
            <circle cx="90" cy="70" r="3" fill="currentColor" />
            <rect x="20" y="50" width="20" height="10" fill="none" stroke="currentColor" strokeWidth="1" />
            <rect x="60" y="20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit)" />
      </svg>
    </div>
  )
}

export default function AuthPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [loginData, setLoginData] = useState({ email: "", password: "" })
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // 입력 검증
    if (!loginData.email.trim()) {
      toast.error("이메일을 입력해주세요.")
      return
    }

    if (!loginData.password.trim()) {
      toast.error("비밀번호를 입력해주세요.")
      return
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(loginData.email)) {
      toast.error("올바른 이메일 형식이 아닙니다.")
      return
    }

    setIsLoading(true)

    try {
      await login(loginData.email, loginData.password)

      toast.success("로그인 성공!")

      // 대시보드로 이동
      router.push("/dashboard")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '로그인에 실패했습니다.'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    // 입력 검증
    if (!signupData.name.trim()) {
      toast.error("이름을 입력해주세요.")
      return
    }

    if (signupData.name.trim().length < 2) {
      toast.error("이름은 2자 이상 입력해주세요.")
      return
    }

    if (!signupData.email.trim()) {
      toast.error("이메일을 입력해주세요.")
      return
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(signupData.email)) {
      toast.error("올바른 이메일 형식이 아닙니다.")
      return
    }

    if (!signupData.password.trim()) {
      toast.error("비밀번호를 입력해주세요.")
      return
    }

    if (signupData.password.length < 6) {
      toast.error("비밀번호는 6자 이상 입력해주세요.")
      return
    }

    if (!signupData.confirmPassword.trim()) {
      toast.error("비밀번호 확인을 입력해주세요.")
      return
    }

    if (signupData.password !== signupData.confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다.")
      return
    }

    setIsLoading(true)

    try {
      await register(
        signupData.name,
        signupData.email,
        signupData.password,
        signupData.confirmPassword
      )

      toast.success("회원가입이 완료되었습니다!")

      // 대시보드로 이동
      router.push("/dashboard")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '회원가입에 실패했습니다.'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary/20 via-background to-accent/10">
        <CircuitPattern />
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          <div className="flex items-center gap-4 mb-8">
            <WaferIcon className="w-16 h-16 text-primary" />
            <div>
              <h1 className="text-4xl font-bold text-foreground">StackVision</h1>
              <p className="text-muted-foreground">반도체 웨이퍼 분석 시스템</p>
            </div>
          </div>

          <div className="max-w-md space-y-6 text-center">
            <h2 className="text-2xl font-semibold text-foreground">
              차세대 HBM 분석 플랫폼
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              웨이퍼 이미지 분류부터 적층 구조 시각화, AI 기반 재고 관리까지
              반도체 제조 공정의 모든 분석을 하나의 플랫폼에서 경험하세요.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-6">
              <div className="p-4 rounded-lg bg-card/50 border border-border">
                <div className="text-2xl font-bold text-primary">99.7%</div>
                <div className="text-sm text-muted-foreground">분류 정확도</div>
              </div>
              <div className="p-4 rounded-lg bg-card/50 border border-border">
                <div className="text-2xl font-bold text-accent">3D</div>
                <div className="text-sm text-muted-foreground">적층 시각화</div>
              </div>
              <div className="p-4 rounded-lg bg-card/50 border border-border">
                <div className="text-2xl font-bold text-primary">AI</div>
                <div className="text-sm text-muted-foreground">재고 예측</div>
              </div>
              <div className="p-4 rounded-lg bg-card/50 border border-border">
                <div className="text-2xl font-bold text-accent">실시간</div>
                <div className="text-sm text-muted-foreground">모니터링</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <WaferIcon className="w-10 h-10 text-primary" />
            <span className="text-2xl font-bold text-foreground">WaferVision</span>
          </div>

          <Card className="border-border bg-card">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">환영합니다</CardTitle>
              <CardDescription>
                계정에 로그인하거나 새로 등록하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">로그인</TabsTrigger>
                  <TabsTrigger value="signup">회원가입</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">이메일</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="name@company.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                        className="bg-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">비밀번호</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="비밀번호를 입력하세요"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                        className="bg-input"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "로그인 중..." : "로그인"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">이름</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="홍길동"
                        value={signupData.name}
                        onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                        required
                        className="bg-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">이메일</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="name@company.com"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        required
                        className="bg-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">비밀번호</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="비밀번호를 입력하세요"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        required
                        className="bg-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">비밀번호 확인</Label>
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="비밀번호를 다시 입력하세요"
                        value={signupData.confirmPassword}
                        onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                        required
                        className="bg-input"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "등록 중..." : "회원가입"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            로그인하면 서비스 이용약관 및 개인정보처리방침에 동의하게 됩니다.
          </p>
        </div>
      </div>
    </main>
  )
}

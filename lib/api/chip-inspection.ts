import { getToken } from "./index"

export interface ChipInspectionRow {
  idx?: number
  wafer_idx?: number
  waferId?: string
  chip_uid?: string
  failure_type?: string | null
  coor_x?: number
  coor_y?: number
  die_status?: number | string | boolean | null
  created_at?: string
  // allow extra fields without breaking parsing
  [key: string]: unknown
}

type ChipInspectionResponse =
  | ChipInspectionRow[]
  | { data: ChipInspectionRow[] }
  | { rows: ChipInspectionRow[] }
  | { chips: ChipInspectionRow[] }
  | { result: ChipInspectionRow[] }

function extractRows(payload: unknown): ChipInspectionRow[] {
  if (Array.isArray(payload)) return payload as ChipInspectionRow[]
  if (!payload || typeof payload !== "object") return []
  const obj = payload as Record<string, unknown>
  if (Array.isArray(obj.data)) return obj.data as ChipInspectionRow[]
  if (Array.isArray(obj.rows)) return obj.rows as ChipInspectionRow[]
  if (Array.isArray(obj.chips)) return obj.chips as ChipInspectionRow[]
  if (Array.isArray(obj.result)) return obj.result as ChipInspectionRow[]
  return []
}

function getApiBaseUrl(): string {
  // 다른 페이지에서도 fallback을 사용하고 있어서 동일하게 맞춤
  return process.env.NEXT_PUBLIC_API_URL || "http://3.39.251.229:5000"
}

function shouldUseNextProxy(endpoint: string): boolean {
  // 브라우저에서 백엔드 직접 호출은 CORS로 실패할 수 있어, 가능하면 Next.js API route를 사용
  if (typeof window === "undefined") return false
  if (/^https?:\/\//i.test(endpoint)) return false
  if (endpoint.startsWith("/api/")) return false
  return true
}

async function requestJson(url: string, init: RequestInit): Promise<unknown> {
  const token = getToken()
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  if (!res.ok) {
    let message = `요청 실패 (${res.status})`
    try {
      const data = await res.json()
      if (data && typeof data === "object" && "error" in data) {
        message = String((data as { error?: unknown }).error ?? message)
      }
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  return await res.json()
}

/**
 * DB 테이블(칩/다이 검사 row) 기반으로 die_status, failure_type 등을 가져옴.
 *
 * - env `NEXT_PUBLIC_CHIP_INSPECTION_ENDPOINT`가 있으면 해당 endpoint만 사용
 *   - 예: `/chip/inspection?limit=1000` 또는 `http://host:port/chip/inspection?limit=1000`
 * - 없으면 몇 가지 후보 endpoint를 GET/POST로 자동 시도
 */
export async function fetchChipInspectionRows(options?: {
  limit?: number
  waferIdx?: number
}): Promise<ChipInspectionRow[]> {
  const limit = options?.limit ?? 1000
  const waferIdx = options?.waferIdx

  const base = getApiBaseUrl()
  const configured = process.env.NEXT_PUBLIC_CHIP_INSPECTION_ENDPOINT

  const candidates = (() => {
    // Prefer same-origin proxy first to avoid CORS
    const proxyFirst = ["/api/chips"]

    if (configured) {
      // if configured points to backend path (e.g. /chips), we still use proxy in browser
      if (shouldUseNextProxy(configured)) return proxyFirst
      return [configured]
    }

    // if not configured, try proxy then backend paths (for non-browser or if proxy disabled)
    return [
      ...proxyFirst,
      // backend chip.py (Blueprint) routes
      "/chips",
      "/chips/list",
      "/inventory/chips",
      "/wafer/chips",
      // other possible names
      "/dies",
      "/die",
    ]
  })()

  const buildUrl = (endpoint: string, method: "GET" | "POST") => {
    const isAbsolute = /^https?:\/\//i.test(endpoint)
    const url = (() => {
      if (isAbsolute) return new URL(endpoint)
      if (endpoint.startsWith("/api/")) {
        // same-origin Next.js proxy
        if (typeof window === "undefined") return new URL(endpoint, "http://localhost")
        return new URL(endpoint, window.location.origin)
      }
      return new URL(`${base}${endpoint}`)
    })()
    if (method === "GET") {
      url.searchParams.set("limit", String(limit))
      if (typeof waferIdx === "number") url.searchParams.set("wafer_idx", String(waferIdx))
    }
    return url.toString()
  }

  let lastError: Error | null = null

  for (const endpoint of candidates) {
    // 1) GET 시도
    try {
      const payload = await requestJson(buildUrl(endpoint, "GET"), { method: "GET" })
      const rows = extractRows(payload)
      if (rows.length > 0) return rows
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
    }

    // 2) POST 시도 (백엔드가 body 기반 검색만 지원하는 경우 대비)
    try {
      const payload = await requestJson(buildUrl(endpoint, "POST"), {
        method: "POST",
        body: JSON.stringify({
          limit,
          ...(typeof waferIdx === "number" ? { wafer_idx: waferIdx } : {}),
        }),
      })
      const rows = extractRows(payload)
      if (rows.length > 0) return rows
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
    }
  }

  throw lastError ?? new Error("칩 검사 데이터를 가져오지 못했습니다.")
}



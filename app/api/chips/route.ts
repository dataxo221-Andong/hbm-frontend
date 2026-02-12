import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function getBackendBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://3.39.251.229:5000"
}

async function forwardToBackend(params: URLSearchParams, authorization: string | null) {
  const backendBase = getBackendBaseUrl()
  const backendUrl = new URL("/inventory/chips", backendBase)

  // pass-through query params (limit, offset, wafer_idx, lot_name, failure_type...)
  params.forEach((value, key) => {
    backendUrl.searchParams.set(key, value)
  })

  const res = await fetch(backendUrl.toString(), {
    method: "GET",
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
    },
    cache: "no-store",
  })

  const contentType = res.headers.get("content-type") || "application/json"
  const body = await res.text()

  return new NextResponse(body, {
    status: res.status,
    headers: { "content-type": contentType },
  })
}

export async function GET(req: NextRequest) {
  const incomingUrl = new URL(req.url)
  const authorization = req.headers.get("authorization")
  return await forwardToBackend(incomingUrl.searchParams, authorization)
}

export async function POST(req: NextRequest) {
  // lib 쪽에서 혹시 POST를 시도해도 405가 나지 않도록 GET으로 변환해서 처리
  const authorization = req.headers.get("authorization")
  const params = new URLSearchParams()
  try {
    const body = await req.json().catch(() => ({}))
    if (body && typeof body === "object") {
      const obj = body as Record<string, unknown>
      for (const key of [
        "limit",
        "offset",
        "wafer_idx",
        "waferIdx",
        "lot_name",
        "lotName",
        "failure_type",
        "failureType",
      ]) {
        const v = obj[key]
        if (v !== undefined && v !== null && String(v).length > 0) {
          // backend chip.py는 snake/camel 모두 받음. 여기서는 snake로 통일
          const normalized =
            key === "waferIdx"
              ? "wafer_idx"
              : key === "lotName"
                ? "lot_name"
                : key === "failureType"
                  ? "failure_type"
                  : key
          params.set(normalized, String(v))
        }
      }
    }
  } catch {
    // ignore parse errors
  }

  return await forwardToBackend(params, authorization)
}






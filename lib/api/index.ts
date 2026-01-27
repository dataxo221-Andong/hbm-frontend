/**
 * API 공통 설정 및 유틸리티 함수
 */

const getApiBaseUrl = (): string => {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL이 설정되지 않았습니다.');
  }
  return process.env.NEXT_PUBLIC_API_URL;
};

/**
 * 공통 API 요청 함수
 */
export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const token = getToken();
    
    // ⚠️ 중요: 매번 호출 시점에 API URL을 가져옴
    // 이렇게 하면 SSR/CSR 환경에 관계없이 올바른 URL 사용
    const API_BASE_URL = getApiBaseUrl();
    
    // 디버깅을 위한 로그 (개발 환경에서만)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('🔗 API Base URL:', API_BASE_URL);
      console.log('📡 API 요청:', `${API_BASE_URL}${endpoint}`);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
      body: options?.body ? options.body : undefined,
    });

    // 네트워크 에러 체크
    if (!response.ok) {
      let errorMessage = '요청에 실패했습니다.';
      try {
        const data = await response.json();
        errorMessage = data.error || errorMessage;
      } catch {
        errorMessage = `서버 오류 (${response.status})`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    // 네트워크 에러 처리 (Failed to fetch)
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    // 이미 Error 객체면 그대로 throw
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('알 수 없는 오류가 발생했습니다.');
  }
}

/**
 * 토큰을 localStorage에 저장
 */
export function saveToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
}

/**
 * localStorage에서 토큰 가져오기
 */
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

/**
 * 토큰 삭제
 */
export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
}

/**
 * 사용자 정보 저장
 */
export function saveUser(user: { id: number; name: string; email: string }): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

/**
 * 사용자 정보 가져오기
 */
export function getUser(): { id: number; name: string; email: string } | null {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * 로그아웃 (토큰과 사용자 정보 삭제)
 */
export function logout(): void {
  removeToken();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
  }
}


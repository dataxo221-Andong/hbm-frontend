/**
 * 인증 관련 API
 */

import { apiRequest, saveToken, saveUser } from './index';
import type { LoginResponse, RegisterResponse } from './types';

/**
 * 로그인 API 호출
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  
  // 토큰과 사용자 정보 저장
  saveToken(response.token);
  saveUser(response.user);
  
  return response;
}

/**
 * 회원가입 API 호출
 */
export async function register(
  name: string,
  email: string,
  password: string,
  confirmPassword: string
): Promise<RegisterResponse> {
  const response = await apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, confirmPassword }),
  });
  
  // 토큰과 사용자 정보 저장
  saveToken(response.token);
  saveUser(response.user);
  
  return response;
}


/**
 * 공통 API 타입 정의
 */

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  token: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
  token: string;
}

export interface ApiError {
  error: string;
}


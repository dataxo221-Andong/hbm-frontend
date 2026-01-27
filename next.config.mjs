/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Next.js 16 네트워크 접근 허용
  // origin 형식으로 지정 (프로토콜 포함)
  allowedDevOrigins: [
    '*',  
  ]
}

export default nextConfig
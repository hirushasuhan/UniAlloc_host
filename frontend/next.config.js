/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development'

// The API origin the browser is allowed to talk to (connect-src).
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || (isDev ? 'http://localhost:8000/api' : 'https://backend-php.wasmer.app/api')
let apiOrigin = "'self'"
try {
  apiOrigin = new URL(apiBase).origin
} catch {
  // keep 'self' if the value isn't a full URL
}

// NOTE: In development mode, Next.js dev server uses WebSockets (ws:) and HMR
// which are blocked by strict CSP headers, causing a blank/white screen on localhost.
// We only apply strict CSP in production and allow localhost + WebSocket origins.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://ajax.cloudflare.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' ${apiOrigin} https://backend-php.wasmer.app https://cloudflareinsights.com http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const securityHeaders = [
  ...(isDev ? [] : [{ key: 'Content-Security-Policy', value: csp }]),
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  // Only takes effect over HTTPS; harmless on plain-HTTP localhost.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

module.exports = nextConfig

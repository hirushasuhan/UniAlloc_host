/** @type {import('next').NextConfig} */

// The API origin the browser is allowed to talk to (connect-src).
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api'
let apiOrigin = "'self'"
try {
  apiOrigin = new URL(apiBase).origin
} catch {
  // keep 'self' if the value isn't a full URL
}

// NOTE: 'unsafe-inline' is required for scripts because Next.js injects an
// inline bootstrap and the app sets the theme before paint. Tightening this
// further means moving to a nonce-based CSP via middleware.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
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

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limit configuration
const RATE_LIMIT_REQUESTS = 100; // requests per hour
const RATE_LIMIT_WINDOW = 60 * 60; // 1 hour in seconds

// Simple in-memory store for rate limiting
const rateLimit = new Map();

export async function middleware(request: NextRequest) {
  // Only rate limit API routes
  if (!request.url.includes('/api/')) {
    return NextResponse.next();
  }

  // Get client IP from headers or connection
  const forwarded = request.headers.get('x-forwarded-for');
  const clientIp = forwarded ? forwarded.split(',')[0] : 'unknown';
  const key = `rate-limit:${clientIp}`;

  try {
    const now = Date.now();
    const windowStart = now - (RATE_LIMIT_WINDOW * 1000);

    // Clean up old entries
    for (const [storedKey, data] of rateLimit.entries()) {
      if (data.timestamp < windowStart) {
        rateLimit.delete(storedKey);
      }
    }

    // Get or create rate limit data
    const limitData = rateLimit.get(key) || { count: 0, timestamp: now };

    // Reset count if outside window
    if (limitData.timestamp < windowStart) {
      limitData.count = 0;
      limitData.timestamp = now;
    }

    // Increment request count
    limitData.count++;
    rateLimit.set(key, limitData);

    // Check if rate limit exceeded
    if (limitData.count > RATE_LIMIT_REQUESTS) {
      return new NextResponse('Rate limit exceeded', { status: 429 });
    }

    // Add rate limit headers
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT_REQUESTS.toString());
    response.headers.set('X-RateLimit-Remaining', (RATE_LIMIT_REQUESTS - limitData.count).toString());
    
    return response;
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Allow request if rate limiting fails
    return NextResponse.next();
  }
}
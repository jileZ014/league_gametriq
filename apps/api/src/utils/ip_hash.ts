import * as crypto from 'crypto';

/**
 * IP Address Hashing Utility
 * Provides consistent, salted hashing of IP addresses for privacy-preserving logging
 */

// Cache for hashed IPs to improve performance
const hashCache = new Map<string, string>();
const CACHE_MAX_SIZE = 10000; // Limit cache size to prevent memory issues
const CACHE_TTL = 3600000; // 1 hour TTL for cache entries

interface CacheEntry {
  hash: string;
  timestamp: number;
}

const cacheWithTTL = new Map<string, CacheEntry>();

/**
 * Get the pepper (salt) from environment or use a default
 * In production, this should be set via environment variable
 */
function getPepper(): string {
  return process.env.IP_HASH_PEPPER || 'gametriq-ip-pepper-default-2024';
}

/**
 * Hash an IP address with a pepper for privacy
 * @param ip - The IP address to hash
 * @returns A consistent hash of the IP address
 */
export function hashIpAddress(ip: string | undefined | null): string {
  if (!ip || ip === 'unknown') {
    return 'unknown';
  }

  // Normalize the IP address
  const normalizedIp = ip.trim().toLowerCase();
  
  // Check cache first
  const now = Date.now();
  const cached = cacheWithTTL.get(normalizedIp);
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.hash;
  }

  // Generate hash
  const pepper = getPepper();
  const hash = crypto
    .createHash('sha256')
    .update(normalizedIp + pepper)
    .digest('hex')
    .substring(0, 16); // Use first 16 chars for brevity

  // Store in cache with TTL
  if (cacheWithTTL.size >= CACHE_MAX_SIZE) {
    // Clear old entries
    const cutoffTime = now - CACHE_TTL;
    for (const [key, entry] of cacheWithTTL.entries()) {
      if (entry.timestamp < cutoffTime) {
        cacheWithTTL.delete(key);
      }
    }
    
    // If still too large, clear oldest 10%
    if (cacheWithTTL.size >= CACHE_MAX_SIZE) {
      const entriesToRemove = Math.floor(CACHE_MAX_SIZE * 0.1);
      const sortedEntries = Array.from(cacheWithTTL.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (let i = 0; i < entriesToRemove; i++) {
        cacheWithTTL.delete(sortedEntries[i][0]);
      }
    }
  }

  cacheWithTTL.set(normalizedIp, { hash, timestamp: now });
  
  return hash;
}

/**
 * Extract IP address from various sources in a request
 * @param req - Express request object or similar
 * @returns The extracted IP address
 */
export function extractIpFromRequest(req: any): string {
  // Check various headers for the real IP
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    // Take the first IP from the comma-separated list
    return (forwarded as string).split(',')[0].trim();
  }
  
  const realIp = req.headers?.['x-real-ip'];
  if (realIp) {
    return realIp as string;
  }
  
  // Fallback to direct connection IP
  return req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}

/**
 * Clear the IP hash cache (useful for testing)
 */
export function clearIpHashCache(): void {
  cacheWithTTL.clear();
}

/**
 * Get current cache size (useful for monitoring)
 */
export function getIpHashCacheSize(): number {
  return cacheWithTTL.size;
}
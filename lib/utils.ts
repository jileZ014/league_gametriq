import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes with tailwind-merge for conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Validates an email address using RFC-compliant regex
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates a phone number (US format)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'));
}

/**
 * Calculates age from date of birth
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Calculates age from birth year only (COPPA compliance)
 */
export function calculateAgeFromYear(birthYear: number): number {
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear;
}

/**
 * Determines if a player is under 13 for COPPA compliance
 */
export function isUnder13(birthDate: Date | number): boolean {
  if (typeof birthDate === 'number') {
    return calculateAgeFromYear(birthDate) < 13;
  }
  return calculateAge(birthDate) < 13;
}

/**
 * Formats a date for display
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  };
  
  return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(dateObj);
}

/**
 * Formats a date and time for display
 */
export function formatDateTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  
  return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(dateObj);
}

/**
 * Formats game time (MM:SS format)
 */
export function formatGameTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Formats time duration in a human-readable format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Heat index calculation for Phoenix safety monitoring
 */
export function calculateHeatIndex(temperature: number, humidity: number): number {
  if (temperature < 80) return temperature;
  
  const t = temperature;
  const h = humidity;
  
  // Rothfusz regression equation for heat index
  let hi = -42.379 + 2.04901523 * t + 10.14333127 * h - 0.22475541 * t * h;
  hi += -0.00683783 * t * t - 0.05481717 * h * h + 0.00122874 * t * t * h;
  hi += 0.00085282 * t * h * h - 0.00000199 * t * t * h * h;
  
  return Math.round(hi);
}

/**
 * Gets heat safety level based on heat index
 */
export function getHeatSafetyLevel(heatIndex: number): {
  level: 'green' | 'yellow' | 'orange' | 'red';
  label: string;
  description: string;
  recommendations: string[];
} {
  if (heatIndex < 90) {
    return {
      level: 'green',
      label: 'Safe',
      description: 'Normal basketball activities',
      recommendations: ['Regular hydration breaks', 'Monitor players for fatigue'],
    };
  } else if (heatIndex < 100) {
    return {
      level: 'yellow',
      label: 'Caution',
      description: 'Increase water breaks',
      recommendations: [
        'Water breaks every 15-20 minutes',
        'Monitor players closely',
        'Allow rest in shade/AC',
      ],
    };
  } else if (heatIndex < 110) {
    return {
      level: 'orange',
      label: 'Enhanced Safety',
      description: 'Frequent breaks and monitoring',
      recommendations: [
        'Water breaks every 10-15 minutes',
        'Mandatory rest periods',
        'Medical personnel on standby',
        'Consider shortening game/practice time',
      ],
    };
  } else {
    return {
      level: 'red',
      label: 'Extreme Caution',
      description: 'Consider postponement',
      recommendations: [
        'Cancel outdoor activities',
        'Move indoors if possible',
        'Postpone games/practices',
        'Emergency medical support required',
      ],
    };
  }
}

/**
 * Debounce utility for search and input handling
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle utility for scroll and resize events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Formats a number as a percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Formats basketball statistics
 */
export function formatStat(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

/**
 * Formats currency amounts
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Formats large numbers with appropriate suffixes (K, M, B)
 */
export function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Truncates text to a maximum length
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length).trim() + suffix;
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Converts string to title case
 */
export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Generates a random ID for components
 */
export function generateId(prefix = '', length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a cryptographically secure random string
 */
export function generateSecureId(length = 32): string {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(length / 2);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // Fallback for server-side
    const crypto = require('crypto');
    return crypto.randomBytes(length / 2).toString('hex');
  }
}

/**
 * Checks if the device is likely a touch device
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Checks if the device is mobile based on screen size
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

/**
 * Gets the appropriate touch target size based on user age group
 */
export function getTouchTargetSize(ageGroup: 'youth' | 'teen' | 'adult'): string {
  switch (ageGroup) {
    case 'youth':
      return 'h-14 w-14'; // 56px minimum for younger players
    case 'teen':
      return 'h-12 w-12'; // 48px minimum for teens
    case 'adult':
      return 'h-10 w-10'; // 40px minimum for adults
    default:
      return 'h-12 w-12';
  }
}

/**
 * Announces text to screen readers
 */
export function announceToScreenReader(message: string): void {
  if (typeof window === 'undefined') return;
  
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only absolute -left-[10000px] w-1 h-1 overflow-hidden';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    if (document.body.contains(announcement)) {
      document.body.removeChild(announcement);
    }
  }, 1000);
}

/**
 * Formats a jersey number for display
 */
export function formatJerseyNumber(number: number): string {
  return `#${number}`;
}

/**
 * Gets player position abbreviation
 */
export function getPositionAbbreviation(position: string): string {
  const positions: Record<string, string> = {
    'Point Guard': 'PG',
    'Shooting Guard': 'SG',
    'Small Forward': 'SF',
    'Power Forward': 'PF',
    'Center': 'C',
    'Guard': 'G',
    'Forward': 'F',
  };
  
  return positions[position] || position.slice(0, 2).toUpperCase();
}

/**
 * Calculates player efficiency rating (PER)
 */
export function calculatePER(stats: {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  minutesPlayed: number;
}): number {
  const {
    points,
    rebounds,
    assists,
    steals,
    blocks,
    turnovers,
    fouls,
    fieldGoalsMade,
    fieldGoalsAttempted,
    freeThrowsMade,
    freeThrowsAttempted,
    minutesPlayed,
  } = stats;

  if (minutesPlayed === 0) return 0;

  // Simplified PER calculation for youth basketball
  const positiveActions = points + rebounds + assists + steals + blocks + fieldGoalsMade + freeThrowsMade;
  const negativeActions = turnovers + fouls + (fieldGoalsAttempted - fieldGoalsMade) + (freeThrowsAttempted - freeThrowsMade);
  
  const per = ((positiveActions - negativeActions) / minutesPlayed) * 15;
  return Math.max(0, per);
}

/**
 * Calculates team chemistry score based on assists and turnovers
 */
export function calculateTeamChemistry(assists: number, turnovers: number, totalPossessions: number): number {
  if (totalPossessions === 0) return 0;
  
  const assistRatio = assists / totalPossessions;
  const turnoverRatio = turnovers / totalPossessions;
  
  // Higher assists and lower turnovers indicate better chemistry
  const chemistry = (assistRatio * 100) - (turnoverRatio * 50);
  return Math.max(0, Math.min(100, chemistry));
}

/**
 * Validates basketball score input
 */
export function validateScore(score: number): boolean {
  return Number.isInteger(score) && score >= 0 && score <= 999;
}

/**
 * Validates time input for game clock
 */
export function validateGameTime(minutes: number, seconds: number): boolean {
  return (
    Number.isInteger(minutes) &&
    Number.isInteger(seconds) &&
    minutes >= 0 &&
    minutes <= 99 &&
    seconds >= 0 &&
    seconds <= 59
  );
}

/**
 * Converts time string (MM:SS) to total seconds
 */
export function timeStringToSeconds(timeString: string): number {
  const [minutes, seconds] = timeString.split(':').map(Number);
  return (minutes * 60) + seconds;
}

/**
 * Checks if a game is currently live
 */
export function isGameLive(gameStatus: string, startTime: Date, endTime?: Date): boolean {
  const now = new Date();
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : null;
  
  return (
    gameStatus === 'live' ||
    gameStatus === 'in_progress' ||
    (now >= start && (!end || now <= end))
  );
}

/**
 * Calculates time remaining until game start
 */
export function getTimeUntilGameStart(startTime: Date): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
} {
  const now = new Date();
  const start = new Date(startTime);
  const diff = start.getTime() - now.getTime();
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
  }
  
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;
  
  return { days, hours, minutes, seconds, totalSeconds };
}

/**
 * Formats a time until game in human-readable format
 */
export function formatTimeUntilGame(startTime: Date): string {
  const { days, hours, minutes } = getTimeUntilGameStart(startTime);
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return 'Starting soon';
  }
}

/**
 * Gets relative time description (e.g., "2 hours ago", "in 30 minutes")
 */
export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const absSeconds = Math.abs(diff) / 1000;
  
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  
  if (absSeconds < 60) {
    return rtf.format(Math.round(diff / 1000), 'second');
  } else if (absSeconds < 3600) {
    return rtf.format(Math.round(diff / 60000), 'minute');
  } else if (absSeconds < 86400) {
    return rtf.format(Math.round(diff / 3600000), 'hour');
  } else {
    return rtf.format(Math.round(diff / 86400000), 'day');
  }
}

/**
 * Sleep utility for delays in async functions
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry utility with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

/**
 * Deep clone utility using structured cloning when available
 */
export function deepClone<T>(obj: T): T {
  if (typeof structuredClone !== 'undefined') {
    return structuredClone(obj);
  }
  
  // Fallback for older browsers
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if two objects are deeply equal
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, index) => deepEqual(val, b[index]));
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => deepEqual(a[key], b[key]));
  }
  
  return false;
}

/**
 * Creates a URL-friendly slug from a string
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Checks if a string is a valid URL
 */
export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts initials from a full name
 */
export function getInitials(name: string, maxLength = 2): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, maxLength)
    .join('');
}

/**
 * Safely parse JSON with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Get the ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
export function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  
  if (j === 1 && k !== 11) return `${num}st`;
  if (j === 2 && k !== 12) return `${num}nd`;
  if (j === 3 && k !== 13) return `${num}rd`;
  return `${num}th`;
}

/**
 * Basketball-specific utilities
 */

/**
 * Determines game period label based on age group
 */
export function getPeriodLabel(period: number, ageGroup: 'youth' | 'middle' | 'high' | 'adult'): string {
  if (ageGroup === 'youth' || ageGroup === 'middle') {
    // Youth uses quarters
    const quarters = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'];
    return quarters[period - 1] || `Quarter ${period}`;
  } else {
    // High school and adult use halves
    const halves = ['1st Half', '2nd Half'];
    return halves[period - 1] || `Period ${period}`;
  }
}

/**
 * Gets timeout information based on age group and league rules
 */
export function getTimeoutInfo(ageGroup: 'youth' | 'middle' | 'high' | 'adult'): {
  fullTimeouts: number;
  thirtySecondTimeouts: number;
  carryover: boolean;
} {
  switch (ageGroup) {
    case 'youth':
      return { fullTimeouts: 2, thirtySecondTimeouts: 2, carryover: false };
    case 'middle':
      return { fullTimeouts: 3, thirtySecondTimeouts: 2, carryover: true };
    case 'high':
      return { fullTimeouts: 4, thirtySecondTimeouts: 2, carryover: true };
    case 'adult':
      return { fullTimeouts: 5, thirtySecondTimeouts: 3, carryover: true };
    default:
      return { fullTimeouts: 3, thirtySecondTimeouts: 2, carryover: true };
  }
}

/**
 * Calculates bonus situation (free throws) based on team fouls
 */
export function getBonusSituation(teamFouls: number, period: number, ageGroup: string): {
  inBonus: boolean;
  bonusType: 'one-and-one' | 'double-bonus' | 'none';
  foulsUntilBonus: number;
} {
  // Standard bonus rules: 7 fouls = bonus, 10 fouls = double bonus
  if (teamFouls >= 10) {
    return { inBonus: true, bonusType: 'double-bonus', foulsUntilBonus: 0 };
  } else if (teamFouls >= 7) {
    return { inBonus: true, bonusType: 'one-and-one', foulsUntilBonus: 0 };
  } else {
    return { inBonus: false, bonusType: 'none', foulsUntilBonus: 7 - teamFouls };
  }
}
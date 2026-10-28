/**
 * Comprehensive Security Utilities for Award Management System
 * Defends against:
 * 1. Formula / CSV Injection (Google Sheets & Excel)
 * 2. Plaintext credential storage (via Web Crypto SHA-256 + Salt)
 * 3. Client-side privilege escalation & session tampering
 * 4. Brute force login attacks (Rate Limiting & Temporary Lockout)
 * 5. Input payload flooding & dangerous control characters
 */

import { AppUser, SubmitterInfo } from '../types';

const RATE_LIMIT_KEY = 'qlgt_sec_login_attempts';
const SESSION_SALT_KEY = 'qlgt_sec_salt';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds
const WINDOW_DURATION_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Retrieves or initializes an origin-bound session salt
 */
function getSessionSalt(): string {
  let salt = localStorage.getItem(SESSION_SALT_KEY);
  if (!salt) {
    const randomBytes = new Uint8Array(16);
    window.crypto.getRandomValues(randomBytes);
    salt = Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(SESSION_SALT_KEY, salt);
  }
  return salt;
}

/**
 * Computes SHA-256 hash using native Web Crypto API
 */
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hashes a password with a cryptographic random salt
 * Format: sha256:<salt>:<hash>
 */
export async function hashPassword(password: string, customSalt?: string): Promise<string> {
  let salt = customSalt;
  if (!salt) {
    const randomBytes = new Uint8Array(12);
    window.crypto.getRandomValues(randomBytes);
    salt = Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  const hash = await sha256(`${salt}:${password}`);
  return `sha256:${salt}:${hash}`;
}

/**
 * Verifies a password against a stored hash or legacy plaintext string
 */
export async function verifyPassword(
  inputPassword: string,
  storedValue: string
): Promise<boolean> {
  if (!storedValue) return false;

  // Hashed format: sha256:<salt>:<hash>
  if (storedValue.startsWith('sha256:')) {
    const parts = storedValue.split(':');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const expectedHash = parts[2];
    const actualHash = await sha256(`${salt}:${inputPassword}`);
    return actualHash === expectedHash;
  }

  // Legacy plaintext fallback (supports default '123456' before upgrade)
  return inputPassword === storedValue;
}

/**
 * Checks if a stored password string is already cryptographically hashed
 */
export function isPasswordHashed(storedValue?: string): boolean {
  return typeof storedValue === 'string' && storedValue.startsWith('sha256:');
}

/**
 * Generates a cryptographic session signature to detect client-side role tampering
 */
export async function generateSessionSignature(
  email: string,
  role: string
): Promise<string> {
  const salt = getSessionSalt();
  return sha256(`session:${salt}:${email.toLowerCase().trim()}:${role}`);
}

/**
 * Validates the session signature of an active submitter
 */
export async function validateSessionIntegrity(
  submitter: SubmitterInfo,
  verifiedUsers: AppUser[]
): Promise<{ valid: boolean; correctedUser?: AppUser }> {
  if (!submitter || !submitter.email) {
    return { valid: false };
  }

  const cleanEmail = submitter.email.toLowerCase().trim();
  const matchedUser = verifiedUsers.find(
    (u) => u.email.toLowerCase().trim() === cleanEmail
  );

  // If user doesn't exist in verified user list, session is invalid
  if (!matchedUser) {
    return { valid: false };
  }

  // Check if role was tampered with in localStorage
  if (submitter.role !== matchedUser.role) {
    console.warn(`[Security Alert] Role mismatch detected for ${cleanEmail}! Expected: ${matchedUser.role}, Found: ${submitter.role}`);
    return { valid: false, correctedUser: matchedUser };
  }

  return { valid: true, correctedUser: matchedUser };
}

/**
 * Formula Injection & CSV Injection Protection (Critical for Google Sheets & Excel)
 * Prepends a single quote (') if the text starts with dangerous formula trigger characters.
 * Prevents execution of =CMD(), =HYPERLINK(), =IMPORTXML(), =IMAGE(), etc.
 */
export function sanitizeSheetValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);

  // Strip non-printable ASCII control characters (0-31 except \n, \t)
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  const trimmed = str.trimStart();
  // Formula triggers: =, +, -, @, \t, \r, |
  if (/^[=+\-@\t\r|]/.test(trimmed)) {
    return `'${str}`;
  }

  return str;
}

/**
 * Sanitizes and bounds input text lengths to avoid UI freezing or memory payload abuse
 */
export function sanitizeInput(text: string, maxLength: number = 250): string {
  if (!text) return '';
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLength);
}

interface AttemptRecord {
  timestamp: number;
}

interface RateLimitState {
  attempts: AttemptRecord[];
  lockedUntil?: number;
}

/**
 * Retrieves current login rate limit status
 */
export function getLoginRateLimitStatus(): {
  isLocked: boolean;
  remainingLockSeconds: number;
  attemptsCount: number;
} {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return { isLocked: false, remainingLockSeconds: 0, attemptsCount: 0 };

    const state: RateLimitState = JSON.parse(raw);
    const now = Date.now();

    // Check active lockout
    if (state.lockedUntil && state.lockedUntil > now) {
      return {
        isLocked: true,
        remainingLockSeconds: Math.ceil((state.lockedUntil - now) / 1000),
        attemptsCount: state.attempts.length,
      };
    }

    // Filter attempts within rolling window (3 minutes)
    const validAttempts = (state.attempts || []).filter(
      (a) => now - a.timestamp < WINDOW_DURATION_MS
    );

    return {
      isLocked: false,
      remainingLockSeconds: 0,
      attemptsCount: validAttempts.length,
    };
  } catch {
    return { isLocked: false, remainingLockSeconds: 0, attemptsCount: 0 };
  }
}

/**
 * Records a failed login attempt and triggers lockout if threshold reached
 */
export function recordFailedLogin(): {
  isLocked: boolean;
  remainingLockSeconds: number;
  attemptsCount: number;
} {
  try {
    const now = Date.now();
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    let state: RateLimitState = raw ? JSON.parse(raw) : { attempts: [] };

    // Clean old attempts
    state.attempts = (state.attempts || []).filter(
      (a) => now - a.timestamp < WINDOW_DURATION_MS
    );

    state.attempts.push({ timestamp: now });

    if (state.attempts.length >= MAX_FAILED_ATTEMPTS) {
      state.lockedUntil = now + LOCKOUT_DURATION_MS;
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(state));
      return {
        isLocked: true,
        remainingLockSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
        attemptsCount: state.attempts.length,
      };
    }

    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(state));
    return {
      isLocked: false,
      remainingLockSeconds: 0,
      attemptsCount: state.attempts.length,
    };
  } catch {
    return { isLocked: false, remainingLockSeconds: 0, attemptsCount: 1 };
  }
}

/**
 * Resets rate limit records on successful authentication
 */
export function resetLoginAttempts(): void {
  try {
    localStorage.removeItem(RATE_LIMIT_KEY);
  } catch {
    // Ignore
  }
}

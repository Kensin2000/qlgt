import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  Lock,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { AppUser, SubmitterInfo } from '../types';
import {
  verifyPassword,
  getLoginRateLimitStatus,
  recordFailedLogin,
  resetLoginAttempts,
  sanitizeInput,
} from '../utils/security';

interface Props {
  isOpen: boolean;
  knownUsers: AppUser[];
  currentSubmitter?: SubmitterInfo | null;
  onLoginSuccess: (user: AppUser, requiresPasswordChange: boolean) => void;
  onClose?: () => void;
  isInitialRequired?: boolean;
}

export const LoginModal: React.FC<Props> = ({
  isOpen,
  knownUsers = [],
  currentSubmitter,
  onLoginSuccess,
  onClose,
  isInitialRequired = false,
}) => {
  const [identifier, setIdentifier] = useState(
    currentSubmitter?.username || currentSubmitter?.email || ''
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockSeconds, setLockSeconds] = useState<number>(() => {
    return getLoginRateLimitStatus().remainingLockSeconds;
  });
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockSeconds((prev) => {
        if (prev <= 1) {
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockSeconds]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockSeconds > 0) {
      setError(`Bạn đã thử đăng nhập sai nhiều lần. Vui lòng đợi ${lockSeconds} giây.`);
      return;
    }

    const cleanId = sanitizeInput(identifier.trim().toLowerCase(), 100);
    const cleanPass = password.trim().slice(0, 80);

    if (!cleanId) {
      setError('Vui lòng nhập Tên đăng nhập hoặc Email.');
      return;
    }

    if (!cleanPass) {
      setError('Vui lòng nhập Mật khẩu.');
      return;
    }

    setIsVerifying(true);
    try {
      // Lookup user by username or email
      const matched = knownUsers.find(
        (u) =>
          (u.username && u.username.trim().toLowerCase() === cleanId) ||
          u.email.trim().toLowerCase() === cleanId
      );

      if (!matched) {
        const rateStatus = recordFailedLogin();
        if (rateStatus.isLocked) {
          setLockSeconds(rateStatus.remainingLockSeconds);
          setError(`Đăng nhập sai quá nhiều lần. Hệ thống tạm khóa ${rateStatus.remainingLockSeconds} giây để bảo vệ.`);
        } else {
          setError('Tài khoản không tồn tại trong hệ thống. Vui lòng kiểm tra lại Tên đăng nhập hoặc Email.');
        }
        return;
      }

      // Verify password (supports salted SHA-256 and legacy default 123456)
      const validPassword = matched.password || '123456';
      const isValid = await verifyPassword(cleanPass, validPassword);

      if (!isValid) {
        const rateStatus = recordFailedLogin();
        if (rateStatus.isLocked) {
          setLockSeconds(rateStatus.remainingLockSeconds);
          setError(`Đăng nhập sai quá nhiều lần. Hệ thống tạm khóa ${rateStatus.remainingLockSeconds} giây để bảo vệ.`);
        } else {
          const attemptsLeft = 5 - rateStatus.attemptsCount;
          setError(`Mật khẩu không chính xác. Còn lại ${Math.max(1, attemptsLeft)} lần thử.`);
        }
        return;
      }

      // Success -> reset attempts
      resetLoginAttempts();
      setError(null);
      const requiresPasswordChange = cleanPass === '123456' || matched.mustChangePassword === true;
      onLoginSuccess(matched, requiresPasswordChange);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      id="login-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
    >
      <div
        id="login-modal-content"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 p-6 text-white text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                Đăng Nhập Hệ Thống
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Vui lòng nhập tài khoản và mật khẩu được cấp để truy cập
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              id="login-modal-error"
              className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Lockout Warning Banner */}
          {lockSeconds > 0 && (
            <div
              id="login-lockout-banner"
              className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center gap-3 animate-pulse"
            >
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold text-amber-950">Bảo vệ chống quét tự động:</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Tài khoản đang tạm khóa thử lại trong <strong>{lockSeconds} giây</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Identifier Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Tên đăng nhập hoặc Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="input-login-identifier"
                type="text"
                maxLength={80}
                disabled={lockSeconds > 0 || isVerifying}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Nhập tên đăng nhập hoặc email"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition font-medium disabled:opacity-60"
                autoFocus
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Mật khẩu <span className="text-rose-500">*</span>
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="input-login-password"
                type={showPassword ? 'text' : 'password'}
                maxLength={64}
                disabled={lockSeconds > 0 || isVerifying}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition font-mono disabled:opacity-60"
              />
              <button
                type="button"
                disabled={lockSeconds > 0 || isVerifying}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-40"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Helper note */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-900">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Lưu ý bảo mật:</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Nếu đăng nhập lần đầu bằng mật khẩu mặc định <strong>123456</strong>, hệ thống sẽ yêu cầu bạn đổi mật khẩu mới để tiếp tục sử dụng.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            {!isInitialRequired && onClose && (
              <button
                id="btn-cancel-login"
                type="button"
                onClick={onClose}
                disabled={isVerifying}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Đóng
              </button>
            )}
            <button
              id="btn-submit-login"
              type="submit"
              disabled={lockSeconds > 0 || isVerifying}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-xs hover:shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <span>Đang kiểm tra...</span>
              ) : lockSeconds > 0 ? (
                <span>Tạm khóa ({lockSeconds}s)</span>
              ) : (
                <>
                  <span>Đăng Nhập</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

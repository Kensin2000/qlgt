import React, { useState } from 'react';
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AppUser } from '../types';

interface Props {
  isOpen: boolean;
  user: AppUser;
  isForcedFirstLogin?: boolean;
  onSaveNewPassword: (newPassword: string) => void;
  onCancel?: () => void;
}

export const ChangePasswordModal: React.FC<Props> = ({
  isOpen,
  user,
  isForcedFirstLogin = false,
  onSaveNewPassword,
  onCancel,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanNew) {
      setError('Vui lòng nhập mật khẩu mới.');
      return;
    }

    if (cleanNew.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự để đảm bảo an toàn.');
      return;
    }

    if (cleanNew === '123456') {
      setError('Mật khẩu mới không được trùng với mật khẩu mặc định 123456. Vui lòng chọn mật khẩu khác!');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setError('Xác nhận mật khẩu mới không khớp. Vui lòng kiểm tra lại!');
      return;
    }

    setError(null);
    onSaveNewPassword(cleanNew);
  };

  return (
    <div
      id="change-password-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4"
    >
      <div
        id="change-password-modal-content"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 p-6 text-white text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                {isForcedFirstLogin ? 'Yêu Cầu Đổi Mật Khẩu Lần Đầu' : 'Đổi Mật Khẩu Tài Khoản'}
              </h2>
              <p className="text-xs text-amber-100 mt-0.5">
                Tài khoản: <strong>{user.name}</strong> (@{user.username || user.email.split('@')[0]})
              </p>
            </div>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isForcedFirstLogin && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs flex items-start gap-2.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Đăng nhập thành công bằng mật khẩu mặc định 123456!</p>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  Để đảm bảo an toàn dữ liệu và quyền phân cấp, vui lòng thiết lập mật khẩu cá nhân mới của bạn trước khi tiếp tục.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div
              id="change-password-modal-error"
              className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2"
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="input-new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition font-mono"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <input
                id="input-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition font-mono"
              />
            </div>
          </div>

          {/* Password conditions checklist */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1 text-slate-600">
            <div className="flex items-center gap-1.5">
              <CheckCircle2
                className={`w-3.5 h-3.5 ${
                  newPassword.length >= 6 ? 'text-emerald-500' : 'text-slate-300'
                }`}
              />
              <span>Độ dài từ 6 ký tự trở lên</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2
                className={`w-3.5 h-3.5 ${
                  newPassword && newPassword !== '123456'
                    ? 'text-emerald-500'
                    : 'text-slate-300'
                }`}
              />
              <span>Khác mật khẩu mặc định 123456</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2
                className={`w-3.5 h-3.5 ${
                  newPassword && newPassword === confirmPassword
                    ? 'text-emerald-500'
                    : 'text-slate-300'
                }`}
              />
              <span>Mật khẩu xác nhận trùng khớp</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            {!isForcedFirstLogin && onCancel && (
              <button
                id="btn-cancel-change-password"
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
            )}
            <button
              id="btn-save-new-password"
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-xl shadow-xs hover:shadow-md transition cursor-pointer"
            >
              Lưu Mật Khẩu Mới & Đăng Nhập
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

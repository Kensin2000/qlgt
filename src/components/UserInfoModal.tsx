import React, { useState } from 'react';
import { UserCheck, Mail, User, ShieldCheck, ShieldAlert, KeyRound, Sparkles, HelpCircle } from 'lucide-react';
import { AppUser, SubmitterInfo, UserRole } from '../types';

interface Props {
  isOpen: boolean;
  initialInfo?: SubmitterInfo | null;
  knownUsers?: AppUser[];
  onSave: (info: SubmitterInfo) => void;
  onClose?: () => void;
  isInitialRequired?: boolean;
}

export const UserInfoModal: React.FC<Props> = ({
  isOpen,
  initialInfo,
  knownUsers = [],
  onSave,
  onClose,
  isInitialRequired = false,
}) => {
  const [email, setEmail] = useState(initialInfo?.email || '');
  const [name, setName] = useState(initialInfo?.name || '');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Find user permission in known users
  const matchedUser = knownUsers.find(
    (u) => u.email.trim().toLowerCase() === email.trim().toLowerCase()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedEmail) {
      setError('Vui lòng nhập Email để hệ thống nhận diện quyền truy cập.');
      return;
    }

    // Basic email check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Email không đúng định dạng (ví dụ: vuth3009@gmail.com).');
      return;
    }

    // Calculate role
    let role: UserRole = 'user';
    let finalName = trimmedName;

    if (matchedUser) {
      role = matchedUser.role;
      if (!finalName) finalName = matchedUser.name;
    } else {
      // Default to user role if not in user list
      role = 'user';
      if (!finalName) finalName = trimmedEmail.split('@')[0];
    }

    setError(null);
    onSave({
      email: trimmedEmail,
      name: finalName || trimmedEmail.split('@')[0],
      role,
    });
  };

  const handleSelectQuickAccount = (user: AppUser) => {
    setEmail(user.email);
    setName(user.name);
  };

  return (
    <div
      id="user-info-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
    >
      <div
        id="user-info-modal-content"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 p-6 text-white text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                Xác Thực Quyền Người Dùng
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Nhập Email để phân quyền <strong>superadmin</strong>, <strong>admin</strong>, <strong>user</strong> theo Google Sheet
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              id="user-info-modal-error"
              className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2"
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick choose from Sheet Users */}
          {knownUsers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Tài khoản trong hệ thống
                </label>
                <span className="text-[10px] text-slate-400">Bấm để chọn nhanh</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {knownUsers.map((u) => {
                  const isSelected = email.toLowerCase() === u.email.toLowerCase();
                  return (
                    <button
                      key={u.email}
                      type="button"
                      onClick={() => handleSelectQuickAccount(u)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl border text-left text-xs transition cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-slate-900 truncate text-[11.5px]">{u.name}</p>
                        <p className="text-[10.5px] text-slate-500 truncate">{u.email}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          u.role === 'superadmin'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : u.role === 'admin'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {u.role === 'superadmin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Email của bạn <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="input-submitter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="VD: vuth3009@gmail.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition font-medium"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Họ và tên hiển thị
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="input-submitter-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={matchedUser?.name || 'VD: Thầy Vũ, Cô Mai...'}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Role Preview Card */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Quyền hạn nhận diện:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                  (matchedUser?.role || 'user') === 'superadmin'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : (matchedUser?.role || 'user') === 'admin'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {(matchedUser?.role || 'user') === 'superadmin'
                  ? 'Super Admin (Toàn quyền)'
                  : (matchedUser?.role || 'user') === 'admin'
                  ? 'Admin (Thống kê + Nộp giải)'
                  : 'User (Chỉ nộp giải thưởng)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {(matchedUser?.role || 'user') === 'superadmin' &&
                ' Hiển thị đầy đủ 3 tính năng: Nộp Giải Thưởng, Thống Kê Cuối Năm, và Quản Trị Admin.'}
              {(matchedUser?.role || 'user') === 'admin' &&
                ' Hiển thị 2 tính năng: Nộp Giải Thưởng và Thống Kê Cuối Năm.'}
              {(matchedUser?.role || 'user') === 'user' &&
                ' Chỉ hiển thị 1 tính năng: Nộp Giải Thưởng.'}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            {!isInitialRequired && onClose && (
              <button
                id="btn-cancel-user-info"
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            )}
            <button
              id="btn-save-user-info"
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-xs hover:shadow-md transition cursor-pointer"
            >
              Xác Nhận & Tiếp Tục
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

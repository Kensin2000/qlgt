import React, { useState } from 'react';
import {
  Award,
  User,
  RefreshCw,
  ExternalLink,
  Sheet,
  FileText,
  BarChart3,
  Settings,
  Shield,
  ShieldCheck,
  ShieldAlert,
  LogIn,
  LogOut,
  ChevronDown,
  Zap,
  Check,
  KeyRound,
} from 'lucide-react';
import { GoogleSheetConfig, SubmitterInfo, UserRole } from '../types';

interface Props {
  activeTab: 'client' | 'filter' | 'admin';
  setActiveTab: (tab: 'client' | 'filter' | 'admin') => void;
  submitterInfo: SubmitterInfo | null;
  onOpenSubmitterModal: () => void;
  onOpenChangePassword?: () => void;
  onLogout?: () => void;
  sheetConfig: GoogleSheetConfig | null;
  isSyncing: boolean;
  onPullFromSheet: (silent?: boolean) => void;
  onToggleAutoSync?: (enabled: boolean, intervalSeconds?: number) => void;
  onConnectGoogle: () => void;
  totalAwardsCount: number;
}

export const Header: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  submitterInfo,
  onOpenSubmitterModal,
  onOpenChangePassword,
  onLogout,
  sheetConfig,
  isSyncing,
  onPullFromSheet,
  onToggleAutoSync,
  onConnectGoogle,
  totalAwardsCount,
}) => {
  const [showAutoSyncMenu, setShowAutoSyncMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isAutoSyncEnabled = sheetConfig?.autoSyncEnabled !== false;
  const syncInterval = sheetConfig?.autoSyncIntervalSeconds || 30;

  return (
    <header id="main-header" className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Quản Lý Giải Thưởng Học Sinh
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {totalAwardsCount} giải đã lưu
                </span>
              </div>
             
            </div>
          </div>

          {/* Right actions: Submitter Badge & Google Sheets status */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Google Sheets Status & Auto-sync badge (Chỉ hiển thị cho superadmin) */}
            {submitterInfo?.role === 'superadmin' && (
              sheetConfig ? (
                <div className="relative flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-200 rounded-xl px-2.5 py-1 text-xs text-emerald-800">
                  <Sheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="hidden xl:inline font-medium truncate max-w-[130px]">
                    {sheetConfig.spreadsheetName}
                  </span>

                  <a
                    id="link-open-google-sheet"
                    href={sheetConfig.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Mở Google Sheet trên Drive"
                    className="p-1 hover:bg-emerald-100 rounded text-emerald-700 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {/* Live Auto-sync Status Indicator */}
                  <button
                    type="button"
                    onClick={() => setShowAutoSyncMenu(!showAutoSyncMenu)}
                    title="Cài đặt tự động cập nhật từ Google Sheet"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-emerald-100 transition cursor-pointer text-[11px] font-medium text-emerald-900"
                  >
                    {isAutoSyncEnabled ? (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                        </span>
                        <span className="hidden md:inline">Tự động ({syncInterval}s)</span>
                      </>
                    ) : (
                      <span className="text-slate-400">Tắt tự động</span>
                    )}
                  </button>

                  {/* Quick Pull / Refresh button */}
                  <button
                    id="btn-quick-sync-sheet"
                    type="button"
                    onClick={() => onPullFromSheet(false)}
                    disabled={isSyncing}
                    title="Tải ngay dữ liệu mới nhất từ Google Sheet về máy"
                    className="p-1 hover:bg-emerald-100 rounded text-emerald-700 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
                  </button>

                  {/* Auto-sync Settings Dropdown */}
                  {showAutoSyncMenu && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-slate-800 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          Tự Động Cập Nhật Từ Sheet
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAutoSyncMenu(false)}
                          className="text-slate-400 hover:text-slate-700 text-xs"
                        >
                          ✕
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Chỉ cần sửa ở Google Sheet (ví dụ thêm học sinh), hệ thống sẽ <strong>tự động tải về ngay khi bạn chuyển lại tab này</strong> hoặc sau mỗi chu kỳ.
                      </p>

                      <div className="space-y-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            onToggleAutoSync?.(!isAutoSyncEnabled, syncInterval);
                            setShowAutoSyncMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                            isAutoSyncEnabled
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span>Trạng thái: {isAutoSyncEnabled ? 'Đang BẬT' : 'Đang TẮT'}</span>
                          {isAutoSyncEnabled && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </button>

                        {isAutoSyncEnabled && onToggleAutoSync && (
                          <div className="flex items-center justify-between text-[11px] text-slate-600 px-1 pt-1">
                            <span>Chu kỳ kiểm tra:</span>
                            <div className="flex gap-1">
                              {[15, 30, 60].map((sec) => (
                                <button
                                  key={sec}
                                  type="button"
                                  onClick={() => {
                                    onToggleAutoSync(true, sec);
                                    setShowAutoSyncMenu(false);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                    syncInterval === sec
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  {sec}s
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  id="btn-header-connect-sheet"
                  type="button"
                  onClick={onConnectGoogle}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                >
                  <Sheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nối Google Sheet</span>
                </button>
              )
            )}

            {/* Submitter & Role Badge */}
            {submitterInfo ? (
              <div className="relative">
                <button
                  id="btn-edit-submitter-info"
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  title="Bấm để đổi mật khẩu hoặc đăng xuất"
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs transition cursor-pointer text-left shadow-2xs"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      submitterInfo.role === 'superadmin'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : submitterInfo.role === 'admin'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {submitterInfo.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-slate-900 leading-tight truncate max-w-[110px]">
                        {submitterInfo.name}
                      </p>
                      <span
                        className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                          submitterInfo.role === 'superadmin'
                            ? 'bg-purple-100 text-purple-800'
                            : submitterInfo.role === 'admin'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {submitterInfo.role || 'user'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight truncate max-w-[140px]">
                      {submitterInfo.username ? `@${submitterInfo.username}` : submitterInfo.email}
                    </p>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {submitterInfo.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono truncate">
                        {submitterInfo.email}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Quyền:</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                            submitterInfo.role === 'superadmin'
                              ? 'bg-purple-100 text-purple-800'
                              : submitterInfo.role === 'admin'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {submitterInfo.role || 'user'}
                        </span>
                      </div>
                    </div>

                    <div className="py-1 space-y-0.5">
                      {onOpenChangePassword && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            onOpenChangePassword();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer text-left"
                        >
                          <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="font-medium">Đổi mật khẩu</span>
                        </button>
                      )}

                      {onLogout && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            onLogout();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer text-left"
                        >
                          <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                          <span className="font-medium">Đăng xuất</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="btn-set-submitter-info"
                type="button"
                onClick={onOpenSubmitterModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs - Filtered by User Role:
            - superadmin: Nộp giải thưởng, Thống kê cuối năm, Quản trị admin
            - admin: Nộp giải thưởng, Thống kê cuối năm
            - user: Nộp giải thưởng
        */}
        <div className="flex border-t border-slate-100 space-x-1 sm:space-x-4 pt-1">
          {/* TAB 1: Nộp Giải Thưởng (Mọi người: user, admin, superadmin) */}
          <button
            id="tab-btn-client-form"
            type="button"
            onClick={() => setActiveTab('client')}
            className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'client'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Nộp Giải Thưởng</span>
          </button>

          {/* TAB 2: Thống Kê Cuối Năm (Chỉ admin và superadmin) */}
          {(submitterInfo?.role === 'admin' || submitterInfo?.role === 'superadmin') && (
            <button
              id="tab-btn-filter-stats"
              type="button"
              onClick={() => setActiveTab('filter')}
              className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer ${
                activeTab === 'filter'
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Thống Kê Cuối Năm</span>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full hidden sm:inline">
                Filter HS
              </span>
            </button>
          )}

          {/* TAB 3: Quản Trị Admin (CHỈ DUY NHẤT superadmin) */}
          {submitterInfo?.role === 'superadmin' && (
            <button
              id="tab-btn-admin-view"
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer ${
                activeTab === 'admin'
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Quản Trị Admin</span>
              <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full hidden sm:inline">
                Super Admin
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

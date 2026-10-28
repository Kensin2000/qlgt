import React, { useState } from 'react';
import {
  Settings,
  Database,
  Users,
  Trophy,
  Sheet,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  ExternalLink,
  Search,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  Zap,
  ShieldCheck,
  UserCheck,
  KeyRound,
  ShieldAlert,
  Crown,
} from 'lucide-react';
import { AppUser, AwardRecord, Competition, CompetitionLevel, GoogleSheetConfig, Student, UserRole } from '../types';
import { sanitizeSheetValue } from '../utils/security';
import { COMPETITION_LEVELS } from '../data/defaultData';

interface Props {
  awards: AwardRecord[];
  onDeleteAward: (id: string) => void;
  masterStudents: Student[];
  onUpdateStudents: (students: Student[]) => void;
  masterCompetitions: Competition[];
  onUpdateCompetitions: (competitions: Competition[]) => void;
  users: AppUser[];
  onUpdateUsers: (users: AppUser[]) => void;
  sheetConfig: GoogleSheetConfig | null;
  onConnectGoogle: () => void;
  onCreateSheetDatabase: () => void;
  onSyncAll: () => void;
  onPullFromSheet?: (silent?: boolean) => void;
  onPushToSheet?: () => void;
  onToggleAutoSync?: (enabled: boolean, intervalSeconds?: number) => void;
  isSyncing: boolean;
  onSetCustomSheetId: (sheetId: string) => void;
}

export const AdminView: React.FC<Props> = ({
  awards,
  onDeleteAward,
  masterStudents,
  onUpdateStudents,
  masterCompetitions,
  onUpdateCompetitions,
  users,
  onUpdateUsers,
  sheetConfig,
  onConnectGoogle,
  onCreateSheetDatabase,
  onSyncAll,
  onPullFromSheet,
  onPushToSheet,
  onToggleAutoSync,
  isSyncing,
  onSetCustomSheetId,
}) => {
  const [adminTab, setAdminTab] = useState<'awards' | 'students' | 'competitions' | 'users' | 'sheets'>('awards');

  // Search in awards
  const [awardSearch, setAwardSearch] = useState('');
  const [awardLevelFilter, setAwardLevelFilter] = useState('all');

  // Student manager modal / form states
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentForm, setStudentForm] = useState<Student>({
    studentId: '',
    name: '',
    className: '',
    notes: '',
  });
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Competition manager modal / form states
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [compForm, setCompForm] = useState<Competition>({
    id: '',
    name: '',
    defaultLevel: 'Cấp Tỉnh/Thành Phố',
    field: '',
    notes: '',
  });
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [compSearch, setCompSearch] = useState('');

  // User RBAC manager modal / form states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState<AppUser>({
    email: '',
    name: '',
    role: 'user',
    notes: '',
  });
  const [editingUserEmail, setEditingUserEmail] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');

  // Custom sheet ID input
  const [customSheetInput, setCustomSheetInput] = useState('');

  // ================= STUDENT HANDLERS =================
  const handleOpenAddStudent = () => {
    setEditingStudentId(null);
    setStudentForm({
      studentId: `HS2024-${String(masterStudents.length + 1).padStart(3, '0')}`,
      name: '',
      className: '',
      notes: '',
    });
    setIsStudentModalOpen(true);
  };

  const handleOpenEditStudent = (st: Student) => {
    setEditingStudentId(st.studentId);
    setStudentForm({ ...st });
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.studentId.trim() || !studentForm.name.trim() || !studentForm.className.trim()) {
      alert('Vui lòng điền MSHS, Tên học sinh và Lớp.');
      return;
    }

    if (editingStudentId) {
      // Update existing
      onUpdateStudents(
        masterStudents.map((s) => (s.studentId === editingStudentId ? { ...studentForm } : s))
      );
    } else {
      // Check duplicate studentId
      if (masterStudents.some((s) => s.studentId === studentForm.studentId.trim())) {
        alert('Mã số học sinh này đã tồn tại!');
        return;
      }
      onUpdateStudents([...masterStudents, { ...studentForm }]);
    }
    setIsStudentModalOpen(false);
  };

  const handleDeleteStudent = (studentId: string) => {
    if (confirm(`Bạn có chắc muốn xóa học sinh mã ${studentId}?`)) {
      onUpdateStudents(masterStudents.filter((s) => s.studentId !== studentId));
    }
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n');
    const newStudents: Student[] = [];

    lines.forEach((line) => {
      const parts = line.split(/[,\t|]/).map((p) => p.trim());
      if (parts.length >= 3 && parts[0] && parts[1]) {
        newStudents.push({
          studentId: parts[0],
          name: parts[1],
          className: parts[2],
          notes: parts[3] || '',
        });
      }
    });

    if (newStudents.length > 0) {
      // Merge unique
      const existingIds = new Set(masterStudents.map((s) => s.studentId));
      const filteredNew = newStudents.filter((s) => !existingIds.has(s.studentId));
      onUpdateStudents([...masterStudents, ...filteredNew]);
      alert(`Đã thêm thành công ${filteredNew.length} học sinh mới!`);
      setBulkText('');
      setIsBulkImportOpen(false);
    } else {
      alert('Không phân tích được dòng nào hợp lệ. Định dạng: MSHS, Họ Tên, Lớp');
    }
  };

  // ================= COMPETITION HANDLERS =================
  const handleOpenAddComp = () => {
    setEditingCompId(null);
    setCompForm({
      id: `COMP-${String(masterCompetitions.length + 1).padStart(3, '0')}`,
      name: '',
      defaultLevel: 'Cấp Tỉnh/Thành Phố',
      field: '',
      notes: '',
    });
    setIsCompModalOpen(true);
  };

  const handleOpenEditComp = (comp: Competition) => {
    setEditingCompId(comp.id);
    setCompForm({ ...comp });
    setIsCompModalOpen(true);
  };

  const handleSaveComp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compForm.name.trim()) {
      alert('Vui lòng nhập Tên cuộc thi.');
      return;
    }

    if (editingCompId) {
      onUpdateCompetitions(
        masterCompetitions.map((c) => (c.id === editingCompId ? { ...compForm } : c))
      );
    } else {
      onUpdateCompetitions([...masterCompetitions, { ...compForm }]);
    }
    setIsCompModalOpen(false);
  };

  const handleDeleteComp = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa cuộc thi này khỏi danh mục gợi ý?')) {
      onUpdateCompetitions(masterCompetitions.filter((c) => c.id !== id));
    }
  };

  // ================= USER RBAC HANDLERS =================
  const handleOpenAddUser = () => {
    setEditingUserEmail(null);
    setUserForm({
      username: '',
      password: '123456',
      mustChangePassword: true,
      email: '',
      name: '',
      role: 'user',
      notes: '',
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: AppUser) => {
    setEditingUserEmail(u.email);
    setUserForm({
      ...u,
      username: u.username || u.email.split('@')[0],
      password: u.password || '123456',
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = userForm.email.trim().toLowerCase();
    const cleanUsername = (userForm.username || '').trim() || cleanEmail.split('@')[0];
    const cleanPassword = (userForm.password || '').trim() || '123456';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      alert('Vui lòng nhập Email hợp lệ.');
      return;
    }

    const payload: AppUser = {
      ...userForm,
      email: cleanEmail,
      username: cleanUsername,
      password: cleanPassword,
      mustChangePassword: cleanPassword === '123456',
    };

    if (editingUserEmail) {
      onUpdateUsers(
        users.map((u) =>
          u.email.toLowerCase() === editingUserEmail.toLowerCase() ? payload : u
        )
      );
    } else {
      if (
        users.some(
          (u) =>
            u.email.toLowerCase() === cleanEmail ||
            (u.username && u.username.toLowerCase() === cleanUsername.toLowerCase())
        )
      ) {
        alert('Email hoặc Tên đăng nhập này đã tồn tại trong danh sách!');
        return;
      }
      onUpdateUsers([...users, payload]);
    }
    setIsUserModalOpen(false);
  };

  const handleDeleteUser = (email: string) => {
    if (confirm(`Bạn có chắc muốn xóa quyền của tài khoản ${email}?`)) {
      onUpdateUsers(users.filter((u) => u.email.toLowerCase() !== email.toLowerCase()));
    }
  };

  // Filtered awards
  const filteredAwards = awards.filter((a) => {
    const term = awardSearch.toLowerCase();
    const matchSearch =
      a.studentName.toLowerCase().includes(term) ||
      a.studentId.toLowerCase().includes(term) ||
      a.competitionName.toLowerCase().includes(term) ||
      a.submitterName.toLowerCase().includes(term) ||
      a.className.toLowerCase().includes(term);

    const matchLevel = awardLevelFilter === 'all' || a.level === awardLevelFilter;
    return matchSearch && matchLevel;
  });

  // Export CSV
  const exportAwardsCSV = () => {
    const headers = [
      'Mã Bản Ghi',
      'Thời Gian Nộp',
      'Người Điền',
      'Email Người Điền',
      'Hình Thức',
      'Tên Cuộc Thi',
      'Ngày Tham Gia',
      'Cấp Cuộc Thi',
      'Tên Tập Thể',
      'MSHS',
      'Họ Và Tên',
      'Lớp',
      'Thành Tích',
      'Ghi Chú',
    ];

    const escapeCsv = (str: unknown) => {
      const sanitized = sanitizeSheetValue(str ?? '');
      return `"${sanitized.replace(/"/g, '""')}"`;
    };

    const rows = filteredAwards.map((a) => [
      escapeCsv(a.id),
      escapeCsv(a.timestamp),
      escapeCsv(a.submitterName),
      escapeCsv(a.submitterEmail),
      escapeCsv(a.entryType === 'individual' ? 'Cá nhân' : 'Tập thể'),
      escapeCsv(a.competitionName),
      escapeCsv(a.competitionDate),
      escapeCsv(a.level),
      escapeCsv(a.teamName || ''),
      escapeCsv(a.studentId),
      escapeCsv(a.studentName),
      escapeCsv(a.className),
      escapeCsv(a.achievement),
      escapeCsv(a.notes || ''),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DanhSachGiaiThuong_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="admin-view-container" className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            Trang Quản Trị Hệ Thống
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Quản lý hồ sơ giải thưởng, danh sách học sinh (tự động gợi ý MSHS), danh mục cuộc thi & cơ sở dữ liệu Google Sheets.
          </p>
        </div>

        {/* Sync & Sheets quick action */}
        <div className="flex items-center gap-2.5">
          {sheetConfig ? (
            <>
              <a
                href={sheetConfig.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold transition"
              >
                <Sheet className="w-4 h-4 text-emerald-600" />
                <span>Mở Google Sheet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={onSyncAll}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng Bộ Sheets'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onCreateSheetDatabase}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Tạo Google Sheet Database</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Sub-tabs */}
      <div className="flex border-b border-slate-200 space-x-1 sm:space-x-4">
        <button
          type="button"
          onClick={() => setAdminTab('awards')}
          className={`flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            adminTab === 'awards'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Danh Sách Giải Thưởng ({awards.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('students')}
          className={`flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            adminTab === 'students'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Cập Nhật MSHS & Học Sinh ({masterStudents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('competitions')}
          className={`flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            adminTab === 'competitions'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Danh Mục Cuộc Thi Gợi Ý ({masterCompetitions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('users')}
          className={`flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            adminTab === 'users'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <KeyRound className="w-4 h-4 text-purple-600" />
          <span>Phân Quyền Người Dùng ({users.length})</span>
          <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full hidden sm:inline">
            Sheet User
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('sheets')}
          className={`flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            adminTab === 'sheets'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sheet className="w-4 h-4 text-emerald-600" />
          <span>Hạ Tầng Google Sheet</span>
        </button>
      </div>

      {/* ================= TAB 1: DANH SÁCH GIẢI THƯỞNG ================= */}
      {adminTab === 'awards' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-xl">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={awardSearch}
                  onChange={(e) => setAwardSearch(e.target.value)}
                  placeholder="Tìm học sinh, MSHS, cuộc thi, người nộp..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <select
                value={awardLevelFilter}
                onChange={(e) => setAwardLevelFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">Tất cả các cấp</option>
                {COMPETITION_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={exportAwardsCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Xuất File CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5">Thời Gian</th>
                  <th className="px-3.5 py-2.5">Tên Cuộc Thi & Cấp</th>
                  <th className="px-3.5 py-2.5">Hình Thức</th>
                  <th className="px-3.5 py-2.5">MSHS</th>
                  <th className="px-3.5 py-2.5">Họ Và Tên</th>
                  <th className="px-3.5 py-2.5">Lớp</th>
                  <th className="px-3.5 py-2.5">Thành Tích</th>
                  <th className="px-3.5 py-2.5">Người Điền</th>
                  <th className="px-3 py-2.5 text-right">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAwards.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">
                      Chưa có hồ sơ giải thưởng nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredAwards.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-3.5 py-2.5 text-slate-500 font-mono">
                        {a.competitionDate || a.timestamp.split('T')[0]}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <p className="font-bold text-slate-900">{a.competitionName}</p>
                        <span className="inline-block mt-0.5 text-[10px] px-2 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                          {a.level}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        {a.entryType === 'individual' ? (
                          <span className="text-blue-700 font-semibold">Cá nhân</span>
                        ) : (
                          <span className="text-indigo-700 font-semibold">
                            Tập thể ({a.teamName})
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-slate-700">{a.studentId}</td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-900">{a.studentName}</td>
                      <td className="px-3.5 py-2.5 font-medium text-slate-700">{a.className}</td>
                      <td className="px-3.5 py-2.5">
                        <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          {a.achievement}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-500">
                        <p className="font-medium text-slate-700">{a.submitterName}</p>
                        <p className="text-[10px] text-slate-400">{a.submitterEmail}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteAward(a.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded transition cursor-pointer"
                          title="Xóa bản ghi này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 2: CẬP NHẬT MSHS, TÊN, LỚP HỌC SINH ================= */}
      {adminTab === 'students' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Danh Sách Học Sinh Cơ Sở (Master Student List)
              </h3>
              <p className="text-xs text-slate-500">
                Cung cấp gợi ý MSHS khi bên client nhập và tự động điền Họ tên và Lớp.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBulkImportOpen(!isBulkImportOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Nhập Hàng Loạt (Paste)</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAddStudent}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Học Sinh Mới</span>
              </button>
            </div>
          </div>

          {/* Live Google Sheet Auto-Update Notification Banner */}
          {sheetConfig && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Sheet className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-emerald-950 flex items-center gap-2">
                    <span>Tự động cập nhật trực tiếp từ Google Sheets</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      ĐANG BẬT
                    </span>
                  </p>
                  <p className="text-emerald-800 text-[11px] mt-0.5 leading-relaxed">
                    Bạn có thể mở trực tiếp Google Sheet tab <strong>DanhSachHocSinh</strong> để gõ thêm hàng loạt học sinh. Hệ thống sẽ <strong>tự động cập nhật ngay khi bạn chuyển lại tab này</strong> hoặc sau mỗi 30 giây!
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <a
                  href={sheetConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở Google Sheet</span>
                </a>
                <button
                  type="button"
                  onClick={() => onPullFromSheet?.(false)}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Tải lại từ Sheet</span>
                </button>
              </div>
            </div>
          )}

          {/* Bulk Import Panel */}
          {isBulkImportOpen && (
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-950">
                  Dán danh sách học sinh từ Excel hoặc văn bản (Mỗi dòng: MSHS, Họ Tên, Lớp)
                </span>
                <button
                  type="button"
                  onClick={() => setIsBulkImportOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Đóng
                </button>
              </div>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`HS2024-011, Nguyễn Hoàng Lan, 10A1\nHS2024-012, Phạm Minh Khang, 11B3`}
                rows={4}
                className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleBulkImport}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Thêm Vào Danh Sách
                </button>
              </div>
            </div>
          )}

          {/* Search bar & Counts */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Lọc học sinh theo mã, tên hoặc lớp..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Đang hiển thị: <strong className="text-slate-800">{masterStudents.length}</strong> học sinh trong hệ thống
            </div>
          </div>

          {/* Students Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5">Mã Số HS (MSHS)</th>
                  <th className="px-3.5 py-2.5">Họ Và Tên</th>
                  <th className="px-3.5 py-2.5">Lớp</th>
                  <th className="px-3.5 py-2.5">Ghi Chú / Đội Tuyển</th>
                  <th className="px-3.5 py-2.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {masterStudents
                  .filter(
                    (s) =>
                      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                      s.studentId.toLowerCase().includes(studentSearch.toLowerCase()) ||
                      s.className.toLowerCase().includes(studentSearch.toLowerCase())
                  )
                  .map((st) => (
                    <tr key={st.studentId} className="hover:bg-slate-50">
                      <td className="px-3.5 py-2.5 font-mono font-bold text-blue-700">
                        {st.studentId}
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-900">{st.name}</td>
                      <td className="px-3.5 py-2.5 font-semibold text-slate-700">{st.className}</td>
                      <td className="px-3.5 py-2.5 text-slate-500">{st.notes || '—'}</td>
                      <td className="px-3.5 py-2.5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditStudent(st)}
                          className="text-slate-500 hover:text-blue-600 p-1 transition cursor-pointer"
                          title="Sửa học sinh"
                        >
                          <Edit2 className="w-3.5 h-3.5 inline" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(st.studentId)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                          title="Xóa học sinh"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: CẬP NHẬT DANH MỤC CUỘC THI ================= */}
      {adminTab === 'competitions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Danh Mục Cuộc Thi Gợi Ý (Master Competition List)
              </h3>
              <p className="text-xs text-slate-500">
                Cập nhật danh sách các cuộc thi để khi người nộp nhập bên Client sẽ có gợi ý chính xác.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddComp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Cuộc Thi Mới</span>
            </button>
          </div>

          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={compSearch}
              onChange={(e) => setCompSearch(e.target.value)}
              placeholder="Lọc theo tên cuộc thi hoặc lĩnh vực..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5">Mã</th>
                  <th className="px-3.5 py-2.5">Tên Cuộc Thi</th>
                  <th className="px-3.5 py-2.5">Cấp Mặc Định</th>
                  <th className="px-3.5 py-2.5">Lĩnh Vực</th>
                  <th className="px-3.5 py-2.5">Ghi Chú</th>
                  <th className="px-3.5 py-2.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {masterCompetitions
                  .filter(
                    (c) =>
                      c.name.toLowerCase().includes(compSearch.toLowerCase()) ||
                      (c.field && c.field.toLowerCase().includes(compSearch.toLowerCase()))
                  )
                  .map((comp) => (
                    <tr key={comp.id} className="hover:bg-slate-50">
                      <td className="px-3.5 py-2.5 font-mono text-slate-400">{comp.id}</td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-900">{comp.name}</td>
                      <td className="px-3.5 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {comp.defaultLevel}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600">{comp.field || '—'}</td>
                      <td className="px-3.5 py-2.5 text-slate-500">{comp.notes || '—'}</td>
                      <td className="px-3.5 py-2.5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditComp(comp)}
                          className="text-slate-500 hover:text-blue-600 p-1 transition cursor-pointer"
                          title="Sửa cuộc thi"
                        >
                          <Edit2 className="w-3.5 h-3.5 inline" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteComp(comp.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                          title="Xóa cuộc thi"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: PHÂN QUYỀN NGƯỜI DÙNG (SUPERADMIN ONLY) ================= */}
      {adminTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Tìm kiếm theo email, tên, quyền..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenAddUser}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Người Dùng / Cấp Quyền</span>
              </button>
            </div>
          </div>

          {/* Explanation Box on RBAC */}
          <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-purple-900">
              <ShieldCheck className="w-4 h-4 text-purple-700" />
              <span>Chính sách phân quyền 3 cấp độ (Lưu tại sheet 'NguoiDung' trên Google Sheet)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11.5px]">
              <div className="p-2.5 bg-white rounded-lg border border-purple-100 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-purple-900 mb-0.5">
                  <Crown className="w-3.5 h-3.5 text-purple-600" />
                  <span>superadmin</span>
                </div>
                <p className="text-slate-600 leading-snug">
                  Toàn quyền hệ thống. Được hiển thị tab <strong>"Quản Trị Admin"</strong>, <strong>"Thống Kê Cuối Năm"</strong> và <strong>"Nộp Giải Thưởng"</strong>.
                </p>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-blue-100 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>admin</span>
                </div>
                <p className="text-slate-600 leading-snug">
                  Quản lý chuyên môn. Chỉ hiển thị <strong>"Thống Kê Cuối Năm"</strong> và <strong>"Nộp Giải Thưởng"</strong>. Không truy cập Admin.
                </p>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-emerald-100 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-0.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>user</span>
                </div>
                <p className="text-slate-600 leading-snug">
                  Giáo viên / người nộp thông thường. Chỉ hiển thị duy nhất phần <strong>"Nộp Giải Thưởng"</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Table of Users */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5">Tên Đăng Nhập</th>
                  <th className="px-3.5 py-2.5">Mật Khẩu</th>
                  <th className="px-3.5 py-2.5">Email</th>
                  <th className="px-3.5 py-2.5">Họ Và Tên</th>
                  <th className="px-3.5 py-2.5">Quyền Hạn</th>
                  <th className="px-3.5 py-2.5">Quyền Xem Tab</th>
                  <th className="px-3.5 py-2.5">Ghi Chú</th>
                  <th className="px-3.5 py-2.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users
                  .filter(
                    (u) =>
                      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                      (u.username && u.username.toLowerCase().includes(userSearch.toLowerCase())) ||
                      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.role.toLowerCase().includes(userSearch.toLowerCase())
                  )
                  .map((user) => {
                    const isDefaultPass = (user.password || '123456') === '123456';
                    return (
                      <tr key={user.email} className="hover:bg-slate-50">
                        <td className="px-3.5 py-2.5 font-bold text-slate-900 font-mono">
                          {user.username || user.email.split('@')[0]}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700">
                              {user.password || '123456'}
                            </span>
                            {isDefaultPass ? (
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200"
                                title="Mật khẩu mặc định - Người dùng sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu"
                              >
                                Mặc định (Cần đổi)
                              </span>
                            ) : (
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200"
                                title="Đã được người dùng cập nhật mật khẩu riêng"
                              >
                                Đã đổi
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600 font-mono">
                          {user.email}
                        </td>
                        <td className="px-3.5 py-2.5 font-medium text-slate-800">{user.name}</td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider ${
                              user.role === 'superadmin'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : user.role === 'admin'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600">
                          {user.role === 'superadmin' && (
                            <span className="text-purple-700 font-semibold">
                              Nộp Giải + Thống Kê + Quản Trị Admin
                            </span>
                          )}
                          {user.role === 'admin' && (
                            <span className="text-blue-700 font-semibold">
                              Nộp Giải + Thống Kê Cuối Năm
                            </span>
                          )}
                          {user.role === 'user' && (
                            <span className="text-emerald-700 font-semibold">
                              Chỉ Nộp Giải Thưởng
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-500">{user.notes || '—'}</td>
                        <td className="px-3.5 py-2.5 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(user)}
                            className="text-slate-500 hover:text-purple-600 p-1 transition cursor-pointer"
                            title="Sửa thông tin / Đặt lại mật khẩu"
                          >
                            <Edit2 className="w-3.5 h-3.5 inline" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.email)}
                            className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                            title="Xóa người dùng"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 5: HẠ TẦNG GOOGLE SHEETS ================= */}
      {adminTab === 'sheets' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sheet className="w-5 h-5 text-emerald-600" />
              Cơ Sở Dữ Liệu Google Sheets Trên Google Drive
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Bảng tính hoạt động như một database trực tuyến lưu trữ toàn bộ hồ sơ giải thưởng, danh sách học sinh và cuộc thi.
            </p>
          </div>

          {/* Connection Status Card */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
            {sheetConfig ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>Đã kết nối với Google Sheets</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                          Hoạt động
                        </span>
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Tên bảng tính: <strong>{sheetConfig.spreadsheetName}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        ID: {sheetConfig.spreadsheetId}
                      </p>
                    </div>
                  </div>

                  <a
                    href={sheetConfig.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Mở Bảng Tính Trên Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Sheet 1</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">GiaiThuong</p>
                    <p className="text-[11px] text-slate-500">Lưu từng lượt nộp giải thưởng</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Sheet 2</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">DanhSachHocSinh</p>
                    <p className="text-[11px] text-slate-500">Gợi ý MSHS, tên và lớp</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Sheet 3</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">DanhSachCuocThi</p>
                    <p className="text-[11px] text-slate-500">Danh mục cuộc thi gợi ý</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-purple-200 bg-purple-50/30">
                    <p className="text-[10px] uppercase font-bold text-purple-600">Sheet 4</p>
                    <p className="text-xs font-bold text-purple-900 mt-0.5">NguoiDung</p>
                    <p className="text-[11px] text-purple-700">Cấp quyền: superadmin, admin, user</p>
                  </div>
                </div>

                {/* Auto-Sync Configuration Box */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-emerald-950">
                          Tự Động Cập Nhật Ngầm (Auto-Sync)
                        </h5>
                        <p className="text-[11px] text-emerald-700">
                          Tự động nhận diện thay đổi từ Google Sheet khi bạn thêm học sinh/cuộc thi
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onToggleAutoSync?.(
                            sheetConfig.autoSyncEnabled === false,
                            sheetConfig.autoSyncIntervalSeconds || 30
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                          sheetConfig.autoSyncEnabled !== false
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {sheetConfig.autoSyncEnabled !== false ? '● Đang BẬT' : '○ Đang TẮT'}
                      </button>

                      {sheetConfig.autoSyncEnabled !== false && onToggleAutoSync && (
                        <div className="flex items-center gap-1 bg-white border border-emerald-200 rounded-lg p-0.5 text-[11px]">
                          {[15, 30, 60].map((sec) => (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => onToggleAutoSync(true, sec)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                                (sheetConfig.autoSyncIntervalSeconds || 30) === sec
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {sec}s
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-emerald-900 bg-white/70 p-2.5 rounded-lg border border-emerald-200/60 leading-relaxed">
                    ✨ <strong>Cơ chế tự động:</strong> Mỗi khi bạn chuyển tab từ Google Sheet về trang web này, hệ thống sẽ <strong>tự động kéo dữ liệu mới nhất</strong> về mà không cần bấm thêm bất cứ nút nào.
                  </div>
                </div>

                {/* Actions: Pull vs Push vs Sync All */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-slate-200 gap-3">
                  <span className="text-xs text-slate-500">
                    Lần cập nhật gần nhất:{' '}
                    <strong>
                      {sheetConfig.lastSyncedAt
                        ? new Date(sheetConfig.lastSyncedAt).toLocaleTimeString('vi-VN') +
                          ' ' +
                          new Date(sheetConfig.lastSyncedAt).toLocaleDateString('vi-VN')
                        : 'Vừa xong'}
                    </strong>
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onPullFromSheet?.(false)}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold cursor-pointer transition shadow-xs"
                      title="Tải học sinh, cuộc thi và giải thưởng mới nhất từ Google Sheets về máy"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>Kéo Dữ Liệu Từ Sheet Về</span>
                    </button>

                    <button
                      type="button"
                      onClick={onPushToSheet}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition shadow-xs"
                      title="Ghi đè danh sách học sinh và cuộc thi từ web lên Google Sheets"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Đẩy Dữ Liệu Lên Sheet</span>
                    </button>

                    <button
                      type="button"
                      onClick={onSyncAll}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng Bộ Hai Chiều'}</span>
                    </button>
                  </div>
                </div>

                {/* Step-by-Step Guide for live Sheet editing */}
                <div className="mt-4 p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2.5 text-xs text-blue-950">
                  <h5 className="font-bold flex items-center gap-1.5 text-blue-900">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Hướng Dẫn: Cách thêm/sửa học sinh trực tiếp trong Google Sheet để hệ thống tự cập nhật
                  </h5>
                  <ol className="list-decimal list-inside space-y-1.5 text-[11.5px] leading-relaxed text-slate-700 pl-1">
                    <li>
                      Nhấp vào <strong>"Mở Bảng Tính Trên Drive"</strong> ở trên và chuyển xuống tab{' '}
                      <code className="bg-white px-1.5 py-0.5 rounded text-blue-800 font-mono border border-blue-200">
                        DanhSachHocSinh
                      </code>
                      .
                    </li>
                    <li>
                      Nhập thêm học sinh mới vào các dòng tiếp theo: Cột A (MSHS), Cột B (Họ Và Tên), Cột C (Lớp), Cột D (Ghi Chú).
                    </li>
                    <li>
                      Quay lại tab trang web này: Hệ thống sẽ <strong>tự động nhận diện và cập nhật danh sách ngay tức thì</strong>! Khi người dùng nhập ở Form Nộp Giải hoặc Thống Kê Cuối Năm, học sinh vừa thêm sẽ có mặt ngay trong danh sách gợi ý.
                    </li>
                    <li className="text-slate-500 italic">
                      Mẹo chia sẻ: Trong Google Sheet, bấm <strong>Chia sẻ (Share)</strong> &gt; Chọn <strong>"Bất kỳ ai có đường liên kết đều là Người xem"</strong>. Nhờ đó, tất cả giáo viên mở trang web này trên các máy tính khác nhau đều tự động cập nhật được mà không cần cấp quyền từng người!
                    </li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Chưa kết nối Google Sheet Database
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Bạn có thể tự động tạo 1 bảng tính hoàn chỉnh mới trên chính tài khoản Google của mình với đầy đủ 3 Sheet chuẩn hóa.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onCreateSheetDatabase}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Tạo Google Sheet Database Ngay</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Option to attach custom existing Spreadsheet ID */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h5 className="text-xs font-bold text-slate-700 uppercase mb-2">
              Hoặc Liên Kết Với Bảng Tính Sẵn Có (Google Sheet ID hoặc URL)
            </h5>
            <div className="flex gap-2">
              <input
                type="text"
                value={customSheetInput}
                onChange={(e) => setCustomSheetInput(e.target.value)}
                placeholder="Dán ID bảng tính hoặc đường dẫn Google Sheet..."
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => {
                  let id = customSheetInput.trim();
                  // Extract ID from full URL if pasted
                  const match = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
                  if (match) id = match[1];
                  if (id) {
                    onSetCustomSheetId(id);
                    setCustomSheetInput('');
                  } else {
                    alert('Vui lòng nhập ID hợp lệ.');
                  }
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Liên Kết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT STUDENT ================= */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-blue-600 p-4 text-white font-bold text-sm flex items-center justify-between">
              <span>{editingStudentId ? 'Chỉnh Sửa Học Sinh' : 'Thêm Học Sinh Mới'}</span>
              <button
                type="button"
                onClick={() => setIsStudentModalOpen(false)}
                className="text-blue-100 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveStudent} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mã số học sinh (MSHS) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={studentForm.studentId}
                  onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
                  placeholder="VD: HS2024-001"
                  disabled={!!editingStudentId}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Họ và tên học sinh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  placeholder="VD: Nguyễn Văn An"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Lớp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={studentForm.className}
                  onChange={(e) => setStudentForm({ ...studentForm, className: e.target.value })}
                  placeholder="VD: 12A1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ghi chú / Đội tuyển
                </label>
                <input
                  type="text"
                  value={studentForm.notes || ''}
                  onChange={(e) => setStudentForm({ ...studentForm, notes: e.target.value })}
                  placeholder="VD: Chuyên Tin, Đội Robotics..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Lưu Thông Tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT COMPETITION ================= */}
      {isCompModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-blue-600 p-4 text-white font-bold text-sm flex items-center justify-between">
              <span>{editingCompId ? 'Chỉnh Sửa Cuộc Thi' : 'Thêm Cuộc Thi Mới'}</span>
              <button
                type="button"
                onClick={() => setIsCompModalOpen(false)}
                className="text-blue-100 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveComp} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tên cuộc thi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={compForm.name}
                  onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
                  placeholder="VD: Kỳ thi Học sinh Giỏi Văn hóa..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Cấp tổ chức mặc định <span className="text-rose-500">*</span>
                </label>
                <select
                  value={compForm.defaultLevel}
                  onChange={(e) =>
                    setCompForm({ ...compForm, defaultLevel: e.target.value as CompetitionLevel })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                >
                  {COMPETITION_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Lĩnh vực / Chuyên môn
                </label>
                <input
                  type="text"
                  value={compForm.field || ''}
                  onChange={(e) => setCompForm({ ...compForm, field: e.target.value })}
                  placeholder="VD: Toán học, Tin học, Khoa học Kỹ thuật..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={compForm.notes || ''}
                  onChange={(e) => setCompForm({ ...compForm, notes: e.target.value })}
                  placeholder="VD: Thi thường niên tháng 3..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCompModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Lưu Cuộc Thi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT USER & ROLES ================= */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-700 to-indigo-800 p-4 text-white font-bold text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-purple-200" />
                <span>{editingUserEmail ? 'Cập Nhật Quyền Người Dùng' : 'Thêm Người Dùng & Cấp Quyền'}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="text-purple-200 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Tên đăng nhập <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={userForm.username || ''}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    placeholder="VD: giaovien1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={userForm.password || ''}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="Mặc định: 123456"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Email người dùng (Google Account) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="VD: gv.toan@gmail.com"
                  disabled={!!editingUserEmail}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 disabled:opacity-60"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Họ và tên người dùng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="VD: Thầy Nguyễn Văn A"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Phân quyền vai trò <span className="text-rose-500">*</span>
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm({ ...userForm, role: e.target.value as UserRole })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                >
                  <option value="user">user (Chỉ hiển thị nộp giải thưởng)</option>
                  <option value="admin">admin (Hiển thị thống kê cuối năm & nộp giải)</option>
                  <option value="superadmin">superadmin (Toàn quyền quản trị + thống kê + nộp giải)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  {userForm.role === 'superadmin' && '👑 Superadmin: Được xem tất cả các tab bao gồm "Quản Trị Admin".'}
                  {userForm.role === 'admin' && '🛡️ Admin: Được xem tab "Thống kê cuối năm" và "Nộp giải thưởng".'}
                  {userForm.role === 'user' && '👤 User: Chỉ được xem tab "Nộp giải thưởng".'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ghi chú / Bộ môn
                </label>
                <input
                  type="text"
                  value={userForm.notes || ''}
                  onChange={(e) => setUserForm({ ...userForm, notes: e.target.value })}
                  placeholder="VD: Tổ trưởng Tin học, Bí thư Đoàn..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
                >
                  Lưu Quyền Hạn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

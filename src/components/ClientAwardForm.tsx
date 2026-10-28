import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Plus,
  Trash2,
  Send,
  Users,
  User,
  Calendar,
  Award,
  Trophy,
  CheckCircle2,
  Sparkles,
  Info,
  Layers,
  ChevronDown,
} from 'lucide-react';
import {
  AwardRecord,
  Competition,
  CompetitionLevel,
  IndividualEntry,
  Student,
  SubmitterInfo,
  TeamEntry,
} from '../types';
import { sanitizeInput } from '../utils/security';
import { COMPETITION_LEVELS, POPULAR_ACHIEVEMENTS } from '../data/defaultData';

interface Props {
  submitterInfo: SubmitterInfo | null;
  onOpenSubmitterModal: () => void;
  masterStudents: Student[];
  masterCompetitions: Competition[];
  onSubmitSuccess: (newRecords: AwardRecord[]) => void;
  onNavigateToStats?: () => void;
}

export const ClientAwardForm: React.FC<Props> = ({
  submitterInfo,
  onOpenSubmitterModal,
  masterStudents,
  masterCompetitions,
  onSubmitSuccess,
  onNavigateToStats,
}) => {
  // General section states
  const [competitionName, setCompetitionName] = useState('');
  const [competitionDate, setCompetitionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [level, setLevel] = useState<CompetitionLevel>('Cấp Tỉnh/Thành Phố');
  const [generalNotes, setGeneralNotes] = useState('');

  // Mode: 'individual' vs 'collective'
  const [entryType, setEntryType] = useState<'individual' | 'collective'>('individual');

  // Individual entries list
  const [individuals, setIndividuals] = useState<IndividualEntry[]>([
    {
      id: 'ind-1',
      studentId: '',
      studentName: '',
      className: '',
      achievement: 'Giải Nhất',
    },
  ]);

  // Collective entries list
  const [teams, setTeams] = useState<TeamEntry[]>([
    {
      id: 'team-1',
      teamName: '',
      className: '',
      achievement: 'Giải Nhất',
      members: [
        { studentId: '', studentName: '', className: '' },
      ],
    },
  ]);

  // Search & dropdown suggestions helpers
  const [compSuggestionsOpen, setCompSuggestionsOpen] = useState(false);
  const [activeMshsFocus, setActiveMshsFocus] = useState<string | null>(null);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<{
    count: number;
    competition: string;
  } | null>(null);

  // Auto-fill competition level when picking a known competition
  const handleSelectCompetition = (comp: Competition) => {
    setCompetitionName(comp.name);
    setLevel(comp.defaultLevel);
    setCompSuggestionsOpen(false);
  };

  // Auto-fill student info from Master List
  const handleStudentIdChange = (
    value: string,
    entryId: string,
    isTeam: boolean = false,
    memberIdx: number = 0
  ) => {
    const trimmed = value.trim();
    // Lookup in master list
    const found = masterStudents.find(
      (s) => s.studentId.toLowerCase() === trimmed.toLowerCase()
    );

    if (!isTeam) {
      setIndividuals((prev) =>
        prev.map((item) => {
          if (item.id === entryId) {
            return {
              ...item,
              studentId: value,
              studentName: found ? found.name : item.studentName,
              className: found ? found.className : item.className,
            };
          }
          return item;
        })
      );
    } else {
      setTeams((prev) =>
        prev.map((team) => {
          if (team.id === entryId) {
            const updatedMembers = [...team.members];
            updatedMembers[memberIdx] = {
              ...updatedMembers[memberIdx],
              studentId: value,
              studentName: found ? found.name : updatedMembers[memberIdx].studentName,
              className: found ? found.className : updatedMembers[memberIdx].className,
            };
            // If team class is empty and student has class, suggest it
            const suggestedTeamClass =
              !team.className && found ? found.className : team.className;
            return { ...team, members: updatedMembers, className: suggestedTeamClass };
          }
          return team;
        })
      );
    }
  };

  // Add more individual entry
  const handleAddIndividual = () => {
    setIndividuals((prev) => [
      ...prev,
      {
        id: `ind-${Date.now()}-${prev.length + 1}`,
        studentId: '',
        studentName: '',
        className: '',
        achievement: 'Giải Nhất',
      },
    ]);
  };

  // Remove individual entry
  const handleRemoveIndividual = (id: string) => {
    if (individuals.length <= 1) return;
    setIndividuals((prev) => prev.filter((item) => item.id !== id));
  };

  // Add more team entry
  const handleAddTeam = () => {
    setTeams((prev) => [
      ...prev,
      {
        id: `team-${Date.now()}-${prev.length + 1}`,
        teamName: '',
        className: '',
        achievement: 'Giải Nhất',
        members: [{ studentId: '', studentName: '', className: '' }],
      },
    ]);
  };

  // Remove team entry
  const handleRemoveTeam = (id: string) => {
    if (teams.length <= 1) return;
    setTeams((prev) => prev.filter((item) => item.id !== id));
  };

  // Add member to team
  const handleAddTeamMember = (teamId: string) => {
    setTeams((prev) =>
      prev.map((team) => {
        if (team.id === teamId) {
          return {
            ...team,
            members: [
              ...team.members,
              { studentId: '', studentName: '', className: '' },
            ],
          };
        }
        return team;
      })
    );
  };

  // Remove member from team
  const handleRemoveTeamMember = (teamId: string, memberIdx: number) => {
    setTeams((prev) =>
      prev.map((team) => {
        if (team.id === teamId && team.members.length > 1) {
          return {
            ...team,
            members: team.members.filter((_, idx) => idx !== memberIdx),
          };
        }
        return team;
      })
    );
  };

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Submitter check
    if (!submitterInfo || !submitterInfo.name || !submitterInfo.email) {
      setValidationError('Vui lòng nhập họ tên và email người điền trước khi gửi.');
      onOpenSubmitterModal();
      return;
    }

    // Common fields check
    if (!competitionName.trim()) {
      setValidationError('Vui lòng nhập tên cuộc thi.');
      return;
    }

    if (!competitionDate) {
      setValidationError('Vui lòng chọn ngày tham gia.');
      return;
    }

    const timestamp = new Date().toISOString();
    const createdRecords: AwardRecord[] = [];

    if (entryType === 'individual') {
      // Validate individual entries
      for (let i = 0; i < individuals.length; i++) {
        const item = individuals[i];
        if (!item.studentName.trim()) {
          setValidationError(`Dòng cá nhân #${i + 1}: Vui lòng nhập Tên học sinh.`);
          return;
        }
        if (!item.className.trim()) {
          setValidationError(`Dòng cá nhân #${i + 1}: Vui lòng nhập Lớp của học sinh.`);
          return;
        }
        if (!item.achievement.trim()) {
          setValidationError(`Dòng cá nhân #${i + 1}: Vui lòng nhập Thành tích.`);
          return;
        }

        createdRecords.push({
          id: `AW-${Date.now()}-${i + 1}`,
          timestamp,
          submitterName: sanitizeInput(submitterInfo.name, 100),
          submitterEmail: sanitizeInput(submitterInfo.email, 100),
          competitionName: sanitizeInput(competitionName, 200),
          competitionDate,
          level,
          entryType: 'individual',
          studentId: sanitizeInput(item.studentId, 40) || 'N/A',
          studentName: sanitizeInput(item.studentName, 100),
          className: sanitizeInput(item.className, 40),
          achievement: sanitizeInput(item.achievement, 100),
          notes: sanitizeInput(generalNotes, 500),
        });
      }
    } else {
      // Validate collective entries
      for (let i = 0; i < teams.length; i++) {
        const team = teams[i];
        if (!team.teamName.trim()) {
          setValidationError(`Tập thể #${i + 1}: Vui lòng nhập Tên tập thể.`);
          return;
        }
        if (!team.achievement.trim()) {
          setValidationError(`Tập thể #${i + 1}: Vui lòng nhập Thành tích.`);
          return;
        }

        const validMembers = team.members.filter((m) => m.studentName.trim());
        const studentIdsStr = validMembers
          .map((m) => sanitizeInput(m.studentId, 40) || 'N/A')
          .join(', ');
        const studentNamesStr = validMembers
          .map((m) => sanitizeInput(m.studentName, 100))
          .join(', ');
        const classesStr =
          sanitizeInput(team.className, 50) ||
          Array.from(new Set(validMembers.map((m) => sanitizeInput(m.className, 40)).filter(Boolean))).join(', ');

        createdRecords.push({
          id: `AW-${Date.now()}-${i + 1}`,
          timestamp,
          submitterName: sanitizeInput(submitterInfo.name, 100),
          submitterEmail: sanitizeInput(submitterInfo.email, 100),
          competitionName: sanitizeInput(competitionName, 200),
          competitionDate,
          level,
          entryType: 'collective',
          teamName: sanitizeInput(team.teamName, 150),
          studentId: sanitizeInput(studentIdsStr, 300) || 'Tập thể',
          studentName: sanitizeInput(studentNamesStr, 500) || sanitizeInput(team.teamName, 150),
          className: sanitizeInput(classesStr, 150) || 'Tập thể',
          achievement: sanitizeInput(team.achievement, 100),
          notes: sanitizeInput(generalNotes, 500),
        });
      }
    }

    if (createdRecords.length === 0) {
      setValidationError('Không có dữ liệu hợp lệ để lưu.');
      return;
    }

    setIsSubmitting(true);
    try {
      onSubmitSuccess(createdRecords);

      // Trigger celebratory confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (err) {
        console.warn('Confetti error:', err);
      }

      setSuccessBanner({
        count: createdRecords.length,
        competition: competitionName,
      });

      // Reset specific entries for next input
      if (entryType === 'individual') {
        setIndividuals([
          {
            id: `ind-${Date.now()}`,
            studentId: '',
            studentName: '',
            className: '',
            achievement: 'Giải Nhất',
          },
        ]);
      } else {
        setTeams([
          {
            id: `team-${Date.now()}`,
            teamName: '',
            className: '',
            achievement: 'Giải Nhất',
            members: [{ studentId: '', studentName: '', className: '' }],
          },
        ]);
      }
    } catch (err: unknown) {
      setValidationError((err as Error).message || 'Có lỗi xảy ra khi lưu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered competitions for autocomplete
  const filteredCompetitions = masterCompetitions.filter((c) =>
    c.name.toLowerCase().includes(competitionName.toLowerCase())
  );

  return (
    <div id="client-award-form-container" className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Page Title & Submitter reminder */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            Nhập Giải Thưởng Học Sinh
          </h2>
         
        </div>

        {submitterInfo && (
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900">
            <User className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Người điền: <strong>{submitterInfo.name}</strong> ({submitterInfo.email})
            </span>
          </div>
        )}
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div
          id="award-success-banner"
          className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-900">
                Đã ghi nhận thành công {successBanner.count} bản ghi giải thưởng!
              </h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                Cuộc thi: <strong>{successBanner.competition}</strong>. Dữ liệu đã được lưu trữ an toàn.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onNavigateToStats && (
              <button
                type="button"
                onClick={onNavigateToStats}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition"
              >
                Xem Thống Kê HS
              </button>
            )}
            <button
              type="button"
              onClick={() => setSuccessBanner(null)}
              className="text-xs text-emerald-600 hover:text-emerald-900 font-medium px-2 py-1 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {validationError && (
          <div
            id="form-validation-error"
            className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2"
          >
            <Info className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* SECTION 1: PHẦN NHẬP CHUNG */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6">
          <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Phần Nhập Chung Cuộc Thi</h3>
              <p className="text-xs text-slate-500">
                Thông tin chung về kỳ thi, ngày tổ chức và cấp độ tham gia
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Tên cuộc thi with Autocomplete */}
            <div className="md:col-span-2 relative">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tên cuộc thi <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-competition-name"
                  type="text"
                  value={competitionName}
                  onChange={(e) => {
                    setCompetitionName(e.target.value);
                    setCompSuggestionsOpen(true);
                  }}
                  onFocus={() => setCompSuggestionsOpen(true)}
                  placeholder="Gõ hoặc chọn cuộc thi (VD: Kỳ thi Học sinh giỏi các môn Văn hóa...)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setCompSuggestionsOpen(!compSuggestionsOpen)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Suggestions Dropdown */}
              {compSuggestionsOpen && filteredCompetitions.length > 0 && (
                <div
                  id="competition-suggestions-dropdown"
                  className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 max-h-56 overflow-y-auto"
                >
                  <div className="p-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span>Gợi ý cuộc thi ({filteredCompetitions.length})</span>
                    <button
                      type="button"
                      onClick={() => setCompSuggestionsOpen(false)}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      Đóng
                    </button>
                  </div>
                  {filteredCompetitions.map((comp) => (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => handleSelectCompetition(comp)}
                      className="w-full text-left px-3.5 py-2 hover:bg-blue-50/80 transition flex items-center justify-between group border-b border-slate-50 last:border-0 cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">
                          {comp.name}
                        </p>
                        {comp.field && (
                          <p className="text-[11px] text-slate-500">{comp.field}</p>
                        )}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-800 shrink-0 font-medium">
                        {comp.defaultLevel}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cấp cuộc thi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Cấp cuộc thi <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="select-competition-level"
                  value={level}
                  onChange={(e) => setLevel(e.target.value as CompetitionLevel)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition cursor-pointer appearance-none"
                >
                  {COMPETITION_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Ngày tham gia */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Ngày tham gia <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-competition-date"
                  type="date"
                  value={competitionDate}
                  onChange={(e) => setCompetitionDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition cursor-pointer"
                  required
                />
              </div>
            </div>

            {/* Ghi chú thêm (tùy chọn) */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Ghi chú / Môn thi / Lĩnh vực (tùy chọn)
              </label>
              <input
                id="input-general-notes"
                type="text"
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="VD: Bảng A, Môn Toán, Đề tài Nghiên cứu môi trường..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: LỰA CHỌN CÁ NHÂN HOẶC TẬP THỂ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-5 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Phần Nhập Riêng Giải Thưởng</h3>
                <p className="text-xs text-slate-500">
                  Chọn hình thức tham gia và điền thông tin đạt giải
                </p>
              </div>
            </div>

            {/* Toggle 2 option: Cá nhân / Tập thể */}
            <div
              id="entry-type-toggle-group"
              className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto"
            >
              <button
                id="option-individual-toggle"
                type="button"
                onClick={() => setEntryType('individual')}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  entryType === 'individual'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Cá Nhân</span>
              </button>
              <button
                id="option-collective-toggle"
                type="button"
                onClick={() => setEntryType('collective')}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  entryType === 'collective'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Tập Thể</span>
              </button>
            </div>
          </div>

          {/* ================= OPTION CÁ NHÂN ================= */}
          {entryType === 'individual' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  Danh sách học sinh đạt giải cá nhân ({individuals.length} học sinh)
                </span>
                <span className="text-[11px] text-blue-600 font-medium">
                  Gõ MSHS để tự động gợi ý Tên và Lớp
                </span>
              </div>

              {individuals.map((ind, index) => (
                <div
                  key={ind.id}
                  id={`individual-row-${index}`}
                  className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl relative hover:border-slate-300 transition"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px]">
                        {index + 1}
                      </span>
                      Học sinh #{index + 1}
                    </span>
                    {individuals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveIndividual(ind.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition cursor-pointer"
                        title="Xóa học sinh này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Mã số học sinh */}
                    <div className="relative">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Mã số HS (MSHS)
                      </label>
                      <input
                        type="text"
                        value={ind.studentId}
                        onChange={(e) => handleStudentIdChange(e.target.value, ind.id)}
                        onFocus={() => setActiveMshsFocus(ind.id)}
                        onBlur={() => setTimeout(() => setActiveMshsFocus(null), 200)}
                        placeholder="VD: HS2024-001"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition"
                      />

                      {/* MSHS Auto-suggest Dropdown */}
                      {activeMshsFocus === ind.id && ind.studentId && (
                        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-md max-h-40 overflow-y-auto">
                          {masterStudents
                            .filter(
                              (s) =>
                                s.studentId
                                  .toLowerCase()
                                  .includes(ind.studentId.toLowerCase()) ||
                                s.name.toLowerCase().includes(ind.studentId.toLowerCase())
                            )
                            .slice(0, 5)
                            .map((s) => (
                              <button
                                key={s.studentId}
                                type="button"
                                onMouseDown={() => {
                                  setIndividuals((prev) =>
                                    prev.map((item) =>
                                      item.id === ind.id
                                        ? {
                                            ...item,
                                            studentId: s.studentId,
                                            studentName: s.name,
                                            className: s.className,
                                          }
                                        : item
                                    )
                                  );
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-xs border-b border-slate-100 last:border-0 cursor-pointer"
                              >
                                <span className="font-mono font-bold text-blue-700">
                                  {s.studentId}
                                </span>{' '}
                                - {s.name} ({s.className})
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Tên học sinh */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Tên học sinh <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={ind.studentName}
                        onChange={(e) =>
                          setIndividuals((prev) =>
                            prev.map((item) =>
                              item.id === ind.id ? { ...item, studentName: e.target.value } : item
                            )
                          )
                        }
                        placeholder="VD: Nguyễn Văn An"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition"
                        required
                      />
                    </div>

                    {/* Lớp */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Lớp <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={ind.className}
                        onChange={(e) =>
                          setIndividuals((prev) =>
                            prev.map((item) =>
                              item.id === ind.id ? { ...item, className: e.target.value } : item
                            )
                          )
                        }
                        placeholder="VD: 12A1"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition"
                        required
                      />
                    </div>

                    {/* Thành Tích */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Thành Tích <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={ind.achievement}
                          onChange={(e) =>
                            setIndividuals((prev) =>
                              prev.map((item) =>
                                item.id === ind.id ? { ...item, achievement: e.target.value } : item
                              )
                            )
                          }
                          list={`popular-achievements-${ind.id}`}
                          placeholder="VD: Giải Nhất, HCV..."
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition"
                          required
                        />
                        <datalist id={`popular-achievements-${ind.id}`}>
                          {POPULAR_ACHIEVEMENTS.map((ach) => (
                            <option key={ach} value={ach} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>

                  {/* Quick Achievement tags */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-medium mr-1">
                      Gợi ý nhanh:
                    </span>
                    {POPULAR_ACHIEVEMENTS.slice(0, 5).map((ach) => (
                      <button
                        key={ach}
                        type="button"
                        onClick={() =>
                          setIndividuals((prev) =>
                            prev.map((item) =>
                              item.id === ind.id ? { ...item, achievement: ach } : item
                            )
                          )
                        }
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                          ind.achievement === ach
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {ach}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Dấu + để nhập tiếp theo cá nhân */}
              <div className="pt-2">
                <button
                  id="btn-add-individual-entry"
                  type="button"
                  onClick={handleAddIndividual}
                  className="w-full py-2.5 border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-xl bg-blue-50/50 hover:bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Thêm học sinh đạt giải cá nhân tiếp theo</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= OPTION TẬP THỂ ================= */}
          {entryType === 'collective' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  Danh sách các tập thể đạt giải ({teams.length} tập thể)
                </span>
                <span className="text-[11px] text-indigo-600 font-medium">
                  Nhập tên tập thể, thành tích và danh sách học sinh tham gia
                </span>
              </div>

              {teams.map((team, teamIndex) => (
                <div
                  key={team.id}
                  id={`team-block-${teamIndex}`}
                  className="p-5 bg-slate-50/80 border border-slate-200 rounded-2xl relative space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                        {teamIndex + 1}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        Tập thể #{teamIndex + 1}
                      </h4>
                    </div>

                    {teams.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTeam(team.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition cursor-pointer text-xs flex items-center gap-1"
                        title="Xóa tập thể này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa tập thể</span>
                      </button>
                    )}
                  </div>

                  {/* Thông tin chung của tập thể */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Tên tập thể <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={team.teamName}
                        onChange={(e) =>
                          setTeams((prev) =>
                            prev.map((t) =>
                              t.id === team.id ? { ...t, teamName: e.target.value } : t
                            )
                          )
                        }
                        placeholder="VD: Đội Robocon 12A1, Đội Bóng đá..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Tên lớp cho tập thể đó
                      </label>
                      <input
                        type="text"
                        value={team.className}
                        onChange={(e) =>
                          setTeams((prev) =>
                            prev.map((t) =>
                              t.id === team.id ? { ...t, className: e.target.value } : t
                            )
                          )
                        }
                        placeholder="VD: 12A1 (hoặc Khối 12, Liên lớp...)"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Thành Tích Tập Thể <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={team.achievement}
                        onChange={(e) =>
                          setTeams((prev) =>
                            prev.map((t) =>
                              t.id === team.id ? { ...t, achievement: e.target.value } : t
                            )
                          )
                        }
                        list={`popular-achievements-team-${team.id}`}
                        placeholder="VD: Giải Nhất, Huy Chương Vàng..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-indigo-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition"
                        required
                      />
                      <datalist id={`popular-achievements-team-${team.id}`}>
                        {POPULAR_ACHIEVEMENTS.map((ach) => (
                          <option key={ach} value={ach} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Danh sách thành viên tập thể: mã số học sinh, tên học sinh, lớp */}
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200/80">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        Danh sách học sinh trong tập thể ({team.members.length} thành viên)
                      </span>
                    </div>

                    <div className="space-y-2">
                      {team.members.map((member, mIdx) => (
                        <div
                          key={mIdx}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50/60 p-2 rounded-lg border border-slate-100"
                        >
                          <div className="sm:col-span-4">
                            <input
                              type="text"
                              value={member.studentId}
                              onChange={(e) =>
                                handleStudentIdChange(e.target.value, team.id, true, mIdx)
                              }
                              placeholder="MSHS (VD: HS2024-001)"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                            />
                          </div>
                          <div className="sm:col-span-4">
                            <input
                              type="text"
                              value={member.studentName}
                              onChange={(e) => {
                                const newMembers = [...team.members];
                                newMembers[mIdx].studentName = e.target.value;
                                setTeams((prev) =>
                                  prev.map((t) =>
                                    t.id === team.id ? { ...t, members: newMembers } : t
                                  )
                                );
                              }}
                              placeholder="Tên học sinh"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <input
                              type="text"
                              value={member.className}
                              onChange={(e) => {
                                const newMembers = [...team.members];
                                newMembers[mIdx].className = e.target.value;
                                setTeams((prev) =>
                                  prev.map((t) =>
                                    t.id === team.id ? { ...t, members: newMembers } : t
                                  )
                                );
                              }}
                              placeholder="Lớp"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                            />
                          </div>
                          <div className="sm:col-span-1 text-right">
                            {team.members.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTeamMember(team.id, mIdx)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                                title="Xóa thành viên"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddTeamMember(team.id)}
                      className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm thành viên cho tập thể này</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Dấu + để nhập tiếp theo cho tên tập thể */}
              <div className="pt-2">
                <button
                  id="btn-add-team-entry"
                  type="button"
                  onClick={handleAddTeam}
                  className="w-full py-2.5 border-2 border-dashed border-indigo-300 hover:border-indigo-500 rounded-xl bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Thêm tập thể đạt giải tiếp theo</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            id="btn-submit-award-form"
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>
              {isSubmitting ? 'Đang lưu vào hệ thống...' : 'Lưu & Nộp Giải Thưởng'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};

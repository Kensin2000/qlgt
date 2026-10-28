import React, { useMemo, useState } from 'react';
import {
  Search,
  Trophy,
  Medal,
  Calendar,
  Layers,
  Sparkles,
  Award,
  Filter,
  User,
  CheckCircle2,
  Printer,
  ChevronRight,
  TrendingUp,
  BarChart,
  Users,
} from 'lucide-react';
import { AwardRecord, CompetitionLevel, Student } from '../types';
import { calculateCompositeWeight, LEVEL_RANK_MAP } from '../data/defaultData';

interface Props {
  awards: AwardRecord[];
  masterStudents: Student[];
}

export const YearEndFilter: React.FC<Props> = ({ awards, masterStudents }) => {
  const [selectedStudentKey, setSelectedStudentKey] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'individual-focus' | 'all-ranking'>('individual-focus');

  // Extract available years from awards
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    awards.forEach((a) => {
      if (a.competitionDate) {
        const y = a.competitionDate.split('-')[0];
        if (y) years.add(y);
      }
    });
    return Array.from(years).sort().reverse();
  }, [awards]);

  // Aggregate list of unique students who have award records
  const studentsWithAwards = useMemo(() => {
    const map = new Map<string, { studentId: string; name: string; className: string }>();

    awards.forEach((a) => {
      if (a.entryType === 'individual') {
        const key = a.studentId && a.studentId !== 'N/A' ? a.studentId : a.studentName;
        if (!map.has(key)) {
          map.set(key, {
            studentId: a.studentId,
            name: a.studentName,
            className: a.className,
          });
        }
      } else {
        // Collective award - split comma separated or members
        const names = a.studentName.split(',').map((n) => n.trim());
        const ids = a.studentId.split(',').map((i) => i.trim());
        const classes = a.className.split(',').map((c) => c.trim());

        names.forEach((name, idx) => {
          if (name && name !== a.teamName) {
            const sid = ids[idx] || 'N/A';
            const cls = classes[idx] || classes[0] || '';
            const key = sid && sid !== 'N/A' ? sid : name;
            if (!map.has(key)) {
              map.set(key, { studentId: sid, name, className: cls });
            }
          }
        });
      }
    });

    // Also include master students if not in map
    masterStudents.forEach((ms) => {
      if (!map.has(ms.studentId)) {
        map.set(ms.studentId, {
          studentId: ms.studentId,
          name: ms.name,
          className: ms.className,
        });
      }
    });

    return Array.from(map.values());
  }, [awards, masterStudents]);

  // If no student is selected yet, pick the first student with awards
  React.useEffect(() => {
    if (!selectedStudentKey && studentsWithAwards.length > 0) {
      // Prefer one who has awards
      const firstWithAward = studentsWithAwards.find((s) =>
        awards.some(
          (a) =>
            a.studentId.includes(s.studentId) ||
            a.studentName.toLowerCase().includes(s.name.toLowerCase())
        )
      );
      if (firstWithAward) {
        setSelectedStudentKey(firstWithAward.studentId || firstWithAward.name);
      } else {
        setSelectedStudentKey(studentsWithAwards[0].studentId || studentsWithAwards[0].name);
      }
    }
  }, [studentsWithAwards, selectedStudentKey, awards]);

  // Current selected student info
  const currentStudent = useMemo(() => {
    if (!selectedStudentKey) return null;
    return (
      studentsWithAwards.find(
        (s) => s.studentId === selectedStudentKey || s.name === selectedStudentKey
      ) || null
    );
  }, [selectedStudentKey, studentsWithAwards]);

  // Filter awards for the current selected student
  const studentAwards = useMemo(() => {
    if (!currentStudent) return [];

    return awards.filter((a) => {
      // Match student ID or student Name
      const matchId =
        currentStudent.studentId &&
        currentStudent.studentId !== 'N/A' &&
        a.studentId.toLowerCase().includes(currentStudent.studentId.toLowerCase());

      const matchName = a.studentName
        .toLowerCase()
        .includes(currentStudent.name.toLowerCase());

      if (!matchId && !matchName) return false;

      // Year filter
      if (selectedYear !== 'all') {
        const yr = a.competitionDate?.split('-')[0];
        if (yr !== selectedYear) return false;
      }

      // Level filter
      if (selectedLevelFilter !== 'all' && a.level !== selectedLevelFilter) {
        return false;
      }

      return true;
    });
  }, [awards, currentStudent, selectedYear, selectedLevelFilter]);

  // Compute student stats according to the exact user prompt:
  // "HS A thi cuộc thi A đạt giải cao nhất ở cấp nào, đạt giải gì"
  // "HS A đạt bao nhiêu giải của bao nhiêu cuộc thi"
  const studentStats = useMemo(() => {
    if (!currentStudent || studentAwards.length === 0) {
      return {
        totalAwards: 0,
        totalCompetitions: 0,
        overallHighest: null,
        byCompetition: [],
      };
    }

    const totalAwards = studentAwards.length;

    // Unique competitions
    const compMap = new Map<
      string,
      {
        competitionName: string;
        awards: AwardRecord[];
        highestLevel: CompetitionLevel;
        highestAchievement: string;
        highestWeight: number;
        earliestDate: string;
      }
    >();

    let overallHighest: {
      competitionName: string;
      level: CompetitionLevel;
      achievement: string;
      weight: number;
      date: string;
      entryType: 'individual' | 'collective';
      teamName?: string;
    } | null = null;

    studentAwards.forEach((a) => {
      const weight = calculateCompositeWeight(a.level, a.achievement);

      if (!overallHighest || weight > overallHighest.weight) {
        overallHighest = {
          competitionName: a.competitionName,
          level: a.level,
          achievement: a.achievement,
          weight,
          date: a.competitionDate,
          entryType: a.entryType,
          teamName: a.teamName,
        };
      }

      if (!compMap.has(a.competitionName)) {
        compMap.set(a.competitionName, {
          competitionName: a.competitionName,
          awards: [a],
          highestLevel: a.level,
          highestAchievement: a.achievement,
          highestWeight: weight,
          earliestDate: a.competitionDate,
        });
      } else {
        const item = compMap.get(a.competitionName)!;
        item.awards.push(a);
        if (weight > item.highestWeight) {
          item.highestWeight = weight;
          item.highestLevel = a.level;
          item.highestAchievement = a.achievement;
        }
      }
    });

    const byCompetition = Array.from(compMap.values()).sort(
      (a, b) => b.highestWeight - a.highestWeight
    );

    return {
      totalAwards,
      totalCompetitions: compMap.size,
      overallHighest,
      byCompetition,
    };
  }, [studentAwards, currentStudent]);

  // Overall School Ranking of Students for Leaderboard
  const allStudentsRankings = useMemo(() => {
    const studentScoreMap = new Map<
      string,
      {
        studentId: string;
        name: string;
        className: string;
        totalAwards: number;
        competitionsSet: Set<string>;
        highestLevel: CompetitionLevel;
        highestAchievement: string;
        highestWeight: number;
        totalScore: number;
      }
    >();

    awards.forEach((a) => {
      if (selectedYear !== 'all') {
        const yr = a.competitionDate?.split('-')[0];
        if (yr !== selectedYear) return;
      }

      const weight = calculateCompositeWeight(a.level, a.achievement);

      // Extract participants
      let participants: { id: string; name: string; cls: string }[] = [];
      if (a.entryType === 'individual') {
        participants.push({ id: a.studentId, name: a.studentName, cls: a.className });
      } else {
        const names = a.studentName.split(',').map((n) => n.trim());
        const ids = a.studentId.split(',').map((i) => i.trim());
        const clss = a.className.split(',').map((c) => c.trim());
        participants = names.map((name, i) => ({
          id: ids[i] || 'N/A',
          name,
          cls: clss[i] || clss[0] || '',
        }));
      }

      participants.forEach((p) => {
        if (!p.name) return;
        const key = p.id && p.id !== 'N/A' ? p.id : p.name;
        if (!studentScoreMap.has(key)) {
          studentScoreMap.set(key, {
            studentId: p.id,
            name: p.name,
            className: p.cls,
            totalAwards: 1,
            competitionsSet: new Set([a.competitionName]),
            highestLevel: a.level,
            highestAchievement: a.achievement,
            highestWeight: weight,
            totalScore: weight,
          });
        } else {
          const st = studentScoreMap.get(key)!;
          st.totalAwards += 1;
          st.competitionsSet.add(a.competitionName);
          st.totalScore += weight;
          if (weight > st.highestWeight) {
            st.highestWeight = weight;
            st.highestLevel = a.level;
            st.highestAchievement = a.achievement;
          }
        }
      });
    });

    return Array.from(studentScoreMap.values()).sort(
      (a, b) => b.totalScore - a.totalScore || b.totalAwards - a.totalAwards
    );
  }, [awards, selectedYear]);

  // Filtered students for sidebar selection
  const filteredStudentsList = useMemo(() => {
    return studentsWithAwards.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.className.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [studentsWithAwards, searchTerm]);

  return (
    <div id="year-end-filter-container" className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-500" />
              Bộ Lọc Thống Kê Giải Thưởng Cuối Năm
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900">
              Tra Cứu Cá Nhân & Toàn Trường
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Tra cứu chi tiết: HS A thi cuộc thi nào đạt giải cao nhất ở cấp nào, đạt giải gì và tổng số giải đạt được.
          </p>
        </div>

        {/* Global Controls & Mode Switch */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('individual-focus')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'individual-focus'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hồ Sơ Học Sinh A
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all-ranking')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'all-ranking'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bảng Xếp Hạng Toàn Trường ({allStudentsRankings.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition cursor-pointer"
            title="In trang báo cáo này"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">In Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* Global Filter Toolbar: Year & Level */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Lọc theo:</span>
          </div>

          {/* Filter Year */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-600">Năm:</span>
            <select
              id="filter-select-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">Tất cả các năm</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  Năm {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Level */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-600">Cấp:</span>
            <select
              id="filter-select-level"
              value={selectedLevelFilter}
              onChange={(e) => setSelectedLevelFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">Tất cả các cấp</option>
              <option value="Cấp Quốc Tế">Cấp Quốc Tế</option>
              <option value="Cấp Quốc Gia">Cấp Quốc Gia</option>
              <option value="Cấp Tỉnh/Thành Phố">Cấp Tỉnh/Thành Phố</option>
              <option value="Cấp Quận/Huyện">Cấp Quận/Huyện</option>
              <option value="Cấp Trường">Cấp Trường</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Tổng số hồ sơ giải trong hệ thống: <strong>{awards.length}</strong>
        </div>
      </div>

      {/* ================= VIEW 1: INDIVIDUAL FOCUS (HS A) ================= */}
      {viewMode === 'individual-focus' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Student Selector Sidebar */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Chọn Học Sinh Cần Tra Cứu (HS A)
              </h3>

              {/* Search input */}
              <div className="relative mb-3">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo MSHS, tên hoặc lớp..."
                  className="w-full pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Student List */}
              <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                {filteredStudentsList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    Không tìm thấy học sinh phù hợp.
                  </p>
                ) : (
                  filteredStudentsList.map((st) => {
                    const isSelected =
                      selectedStudentKey === st.studentId || selectedStudentKey === st.name;
                    // Count how many awards this student has
                    const count = awards.filter(
                      (a) =>
                        a.studentId.toLowerCase().includes(st.studentId.toLowerCase()) ||
                        a.studentName.toLowerCase().includes(st.name.toLowerCase())
                    ).length;

                    return (
                      <button
                        key={st.studentId || st.name}
                        type="button"
                        onClick={() => setSelectedStudentKey(st.studentId || st.name)}
                        className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between group cursor-pointer border ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                            }`}
                          >
                            {st.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {st.name}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <span className="font-mono">{st.studentId}</span>
                              <span>•</span>
                              <span className="font-semibold text-slate-700">{st.className}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              count > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {count} giải
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right: Detailed Summary for HS A */}
          <div className="lg:col-span-8 space-y-6">
            {currentStudent ? (
              <>
                {/* Student Hero Profile Card */}
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                  <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
                    <Trophy className="w-56 h-56 text-white" />
                  </div>

                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-5">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-200 text-slate-900 flex items-center justify-center font-extrabold text-xl shadow-md shrink-0">
                        {currentStudent.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                            {currentStudent.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md bg-white/20 text-xs font-semibold text-blue-100">
                            {currentStudent.className}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-mono mt-0.5">
                          Mã số học sinh (MSHS): <strong>{currentStudent.studentId}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                        Trạng thái hồ sơ
                      </span>
                      <p className="text-sm font-semibold text-white">
                        {studentStats.totalAwards > 0
                          ? 'Đã đạt giải thưởng cấp trường / cấp cao'
                          : 'Chưa có giải thưởng ghi nhận'}
                      </p>
                    </div>
                  </div>

                  {/* 2 Core Requirement Highlights */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Requirement 1: Số giải & Số cuộc thi */}
                    <div className="bg-white/10 backdrop-blur-xs border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-200 uppercase tracking-wider mb-1">
                        <BarChart className="w-4 h-4 text-blue-300" />
                        <span>Tổng Kết Thành Tích</span>
                      </div>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-amber-300">
                          {studentStats.totalAwards}
                        </span>
                        <span className="text-sm text-slate-200">giải thưởng</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-2xl font-bold text-white">
                          {studentStats.totalCompetitions}
                        </span>
                        <span className="text-sm text-slate-200">cuộc thi</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        Học sinh <strong>{currentStudent.name}</strong> đã xuất sắc đạt{' '}
                        <strong>{studentStats.totalAwards} giải</strong> trong{' '}
                        <strong>{studentStats.totalCompetitions} cuộc thi</strong> tham gia.
                      </p>
                    </div>

                    {/* Requirement 2: Giải cao nhất ở cấp nào, đạt giải gì */}
                    <div className="bg-white/10 backdrop-blur-xs border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span>Giải Cao Nhất Đạt Được</span>
                      </div>

                      {studentStats.overallHighest ? (
                        <div>
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-900 font-extrabold text-sm shadow-xs">
                              {studentStats.overallHighest.achievement}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-blue-500/40 text-blue-100 font-bold text-xs border border-blue-300/30">
                              {studentStats.overallHighest.level}
                            </span>
                          </div>
                          <p className="text-xs text-slate-200 mt-2 line-clamp-2">
                            Trong cuộc thi: <strong>{studentStats.overallHighest.competitionName}</strong>
                            {studentStats.overallHighest.entryType === 'collective' &&
                              ` (Tập thể: ${studentStats.overallHighest.teamName})`}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-300 mt-2">
                          Chưa có thành tích trong bộ lọc hiện tại.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section: Cuộc thi A -> Đạt giải cao nhất ở cấp nào, đạt giải gì */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Medal className="w-4 h-4 text-blue-600" />
                        Thống Kê Chi Tiết Từng Cuộc Thi (Giải Cao Nhất Môi Cuộc Thi)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Cho biết: Học sinh {currentStudent.name} tham gia cuộc thi nào, đạt giải cao nhất ở cấp nào và giải gì
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {studentStats.byCompetition.length} cuộc thi
                    </span>
                  </div>

                  {studentStats.byCompetition.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      Không có cuộc thi nào thỏa mãn điều kiện lọc.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {studentStats.byCompetition.map((comp, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 bg-slate-50/50 hover:bg-blue-50/30 transition"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                              </span>
                              <h5 className="text-sm font-bold text-slate-900">
                                {comp.competitionName}
                              </h5>
                            </div>
                            <span className="text-xs text-slate-500 font-medium">
                              Ngày: {comp.earliestDate}
                            </span>
                          </div>

                          {/* Highest Award in this competition */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-slate-600">Giải cao nhất:</span>
                              <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs">
                                🏆 {comp.highestAchievement}
                              </span>
                              <span className="text-xs text-slate-600">ở cấp:</span>
                              <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold text-xs">
                                📍 {comp.highestLevel}
                              </span>
                            </div>

                            <div className="text-xs text-slate-500">
                              Tổng giải đạt trong cuộc thi này:{' '}
                              <strong className="text-slate-900">{comp.awards.length}</strong>
                            </div>
                          </div>

                          {/* Breakdown of all awards in this competition */}
                          {comp.awards.length > 1 && (
                            <div className="mt-2.5 pl-4 border-l-2 border-slate-200 space-y-1.5">
                              <p className="text-[11px] font-bold text-slate-500 uppercase">
                                Tất cả các lần đạt giải trong cuộc thi này:
                              </p>
                              {comp.awards.map((subAw, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="text-xs text-slate-700 flex items-center justify-between"
                                >
                                  <span>
                                    • {subAw.achievement} ({subAw.level}) -{' '}
                                    {subAw.entryType === 'individual' ? 'Cá nhân' : `Tập thể: ${subAw.teamName}`}
                                  </span>
                                  <span className="text-slate-400 text-[11px]">
                                    {subAw.competitionDate}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section: Full Award History Table */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-600" />
                    Toàn Bộ Hồ Sơ Giải Thưởng Của Học Sinh ({studentAwards.length} bản ghi)
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-3.5 py-2.5">Ngày</th>
                          <th className="px-3.5 py-2.5">Tên Cuộc Thi</th>
                          <th className="px-3.5 py-2.5">Cấp</th>
                          <th className="px-3.5 py-2.5">Hình thức</th>
                          <th className="px-3.5 py-2.5">Thành Tích</th>
                          <th className="px-3.5 py-2.5">Người Nộp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {studentAwards.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50">
                            <td className="px-3.5 py-2.5 font-mono text-slate-500">
                              {a.competitionDate}
                            </td>
                            <td className="px-3.5 py-2.5 font-medium text-slate-900">
                              {a.competitionName}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                                {a.level}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-600">
                              {a.entryType === 'individual' ? (
                                <span className="text-blue-700 font-medium">Cá nhân</span>
                              ) : (
                                <span className="text-indigo-700 font-medium">
                                  Tập thể ({a.teamName})
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 font-bold text-blue-900">
                              {a.achievement}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-500">{a.submitterName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                <User className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  Chọn một học sinh từ danh sách bên trái để xem thống kê thành tích cuối năm
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= VIEW 2: ALL STUDENTS RANKING / LEADERBOARD ================= */}
      {viewMode === 'all-ranking' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Bảng Xếp Hạng & Thống Kê Giải Thưởng Toàn Trường
              </h3>
              <p className="text-xs text-slate-500">
                Thống kê số lượng giải và cấp cao nhất của từng học sinh trong trường
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-indigo-50 text-indigo-800 rounded-full">
              {allStudentsRankings.length} học sinh đạt giải
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 text-center">Thứ Hạng</th>
                  <th className="px-3.5 py-2.5">MSHS</th>
                  <th className="px-3.5 py-2.5">Họ Và Tên</th>
                  <th className="px-3.5 py-2.5">Lớp</th>
                  <th className="px-3.5 py-2.5 text-center">Tổng Số Giải</th>
                  <th className="px-3.5 py-2.5 text-center">Số Cuộc Thi</th>
                  <th className="px-3.5 py-2.5">Giải Cao Nhất & Cấp</th>
                  <th className="px-3 py-2.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allStudentsRankings.map((st, rankIdx) => (
                  <tr key={rankIdx} className="hover:bg-slate-50">
                    <td className="px-3 py-3 text-center">
                      {rankIdx === 0 && (
                        <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-extrabold inline-flex items-center justify-center text-xs">
                          1
                        </span>
                      )}
                      {rankIdx === 1 && (
                        <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-extrabold inline-flex items-center justify-center text-xs">
                          2
                        </span>
                      )}
                      {rankIdx === 2 && (
                        <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-extrabold inline-flex items-center justify-center text-xs">
                          3
                        </span>
                      )}
                      {rankIdx > 2 && (
                        <span className="font-mono text-slate-500 font-bold">{rankIdx + 1}</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 font-mono font-medium text-blue-700">
                      {st.studentId}
                    </td>
                    <td className="px-3.5 py-3 font-bold text-slate-900">{st.name}</td>
                    <td className="px-3.5 py-3 font-medium text-slate-700">{st.className}</td>
                    <td className="px-3.5 py-3 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                        {st.totalAwards} giải
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center font-semibold text-slate-700">
                      {st.competitionsSet.size} cuộc thi
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-blue-900">{st.highestAchievement}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {st.highestLevel}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentKey(st.studentId || st.name);
                          setViewMode('individual-focus');
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition cursor-pointer"
                      >
                        Chi tiết HS →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

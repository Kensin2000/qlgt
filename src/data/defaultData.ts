import { Competition, CompetitionLevel, Student, AwardRecord } from '../types';

export const LEVEL_RANK_MAP: Record<CompetitionLevel, number> = {
  'Cấp Quốc Tế': 500,
  'Cấp Quốc Gia': 400,
  'Cấp Tỉnh/Thành Phố': 300,
  'Cấp Quận/Huyện': 200,
  'Cấp Trường': 100,
};

export const DEFAULT_COMPETITIONS: Competition[] = [
  {
    id: 'COMP-001',
    name: 'Kỳ thi Học sinh giỏi các môn Văn hóa',
    defaultLevel: 'Cấp Tỉnh/Thành Phố',
    field: 'Văn hóa & Khoa học cơ bản',
    notes: 'Toán, Lý, Hóa, Sinh, Văn, Sử, Địa, Tin học, Tiếng Anh',
  },
  {
    id: 'COMP-002',
    name: 'Cuộc thi Khoa học Kỹ thuật dành cho HS Trung học (VISEF)',
    defaultLevel: 'Cấp Quốc Gia',
    field: 'Khoa học Kỹ thuật',
    notes: 'Dự án nghiên cứu KHKT',
  },
  {
    id: 'COMP-003',
    name: 'Hội thi Tin học Trẻ',
    defaultLevel: 'Cấp Tỉnh/Thành Phố',
    field: 'Tin học & Lập trình',
    notes: 'Bảng cá nhân và phần mềm sáng tạo',
  },
  {
    id: 'COMP-004',
    name: 'Olympic Tiếng Anh trên Internet (IOE)',
    defaultLevel: 'Cấp Quốc Gia',
    field: 'Ngoại ngữ',
    notes: 'Thi trực tuyến theo các vòng',
  },
  {
    id: 'COMP-005',
    name: 'Cuộc thi Sáng tạo Robot & Trí tuệ Nhân tạo (Robocon STEM)',
    defaultLevel: 'Cấp Quốc Gia',
    field: 'STEM & Robotics',
    notes: 'Thi đấu đồng đội tập thể',
  },
  {
    id: 'COMP-006',
    name: 'Hội khỏe Phù Đổng',
    defaultLevel: 'Cấp Quận/Huyện',
    field: 'Thể dục Thể thao',
    notes: 'Bóng đá, Cờ vua, Bơi lội, Điền kinh, Cầu lông',
  },
  {
    id: 'COMP-007',
    name: 'Cuộc thi Viết thư Quốc tế UPU',
    defaultLevel: 'Cấp Quốc Tế',
    field: 'Văn học & Xã hội',
    notes: 'Dành cho học sinh dưới 15 tuổi',
  },
  {
    id: 'COMP-008',
    name: 'Cuộc thi Sáng tạo Thanh thiếu niên, Nhi đồng',
    defaultLevel: 'Cấp Tỉnh/Thành Phố',
    field: 'Sáng tạo & Kỹ thuật',
    notes: 'Mô hình, sản phẩm tái chế, giải pháp kỹ thuật',
  },
  {
    id: 'COMP-009',
    name: 'Cuộc thi Olympic Toán Quốc tế Timo / SASMO',
    defaultLevel: 'Cấp Quốc Tế',
    field: 'Toán học',
    notes: 'Kỳ thi toán quốc tế thường niên',
  },
  {
    id: 'COMP-010',
    name: 'Hội diễn Văn nghệ Khối Trường Học',
    defaultLevel: 'Cấp Trường',
    field: 'Văn nghệ & Nghệ thuật',
    notes: 'Múa, hát, kịch tập thể',
  },
];

export const DEFAULT_STUDENTS: Student[] = [
  { studentId: 'HS2024-001', name: 'Nguyễn Văn An', className: '12A1', notes: 'Chuyên Toán - Tin' },
  { studentId: 'HS2024-002', name: 'Trần Thị Bình', className: '12A1', notes: 'Đội tuyển Tiếng Anh' },
  { studentId: 'HS2024-003', name: 'Lê Minh Cường', className: '12A2', notes: 'Đội tuyển Vật Lý' },
  { studentId: 'HS2024-004', name: 'Phạm Quỳnh Anh', className: '11B1', notes: 'Đội tuyển Hóa Học' },
  { studentId: 'HS2024-005', name: 'Hoàng Đức Dũng', className: '11B2', notes: 'Đội tuyển Tin học' },
  { studentId: 'HS2024-006', name: 'Vũ Hải Đăng', className: '11B2', notes: 'Robotics & STEM' },
  { studentId: 'HS2024-007', name: 'Đỗ Thảo Linh', className: '10C1', notes: 'CLB Tranh biện & UPU' },
  { studentId: 'HS2024-008', name: 'Ngô Gia Huy', className: '10C2', notes: 'CLB Bóng đá' },
  { studentId: 'HS2024-009', name: 'Bùi Mai Phương', className: '12A3', notes: 'Đội tuyển Văn' },
  { studentId: 'HS2024-010', name: 'Đặng Quốc Bảo', className: '11B1', notes: 'Cờ vua & Thể thao' },
];

export const DEFAULT_AWARDS: AwardRecord[] = [
  {
    id: 'AW-001',
    timestamp: '2026-03-15T08:30:00.000Z',
    submitterName: 'Thầy Nguyễn Hữu Trọng',
    submitterEmail: 'trong.nh@school.edu.vn',
    competitionName: 'Kỳ thi Học sinh giỏi các môn Văn hóa',
    competitionDate: '2026-03-12',
    level: 'Cấp Tỉnh/Thành Phố',
    entryType: 'individual',
    studentId: 'HS2024-001',
    studentName: 'Nguyễn Văn An',
    className: '12A1',
    achievement: 'Giải Nhất',
    notes: 'Môn Tin học',
  },
  {
    id: 'AW-002',
    timestamp: '2026-04-20T09:15:00.000Z',
    submitterName: 'Cô Lê Thị Thu Hương',
    submitterEmail: 'huong.lt@school.edu.vn',
    competitionName: 'Cuộc thi Khoa học Kỹ thuật dành cho HS Trung học (VISEF)',
    competitionDate: '2026-04-18',
    level: 'Cấp Quốc Gia',
    entryType: 'individual',
    studentId: 'HS2024-001',
    studentName: 'Nguyễn Văn An',
    className: '12A1',
    achievement: 'Giải Nhì',
    notes: 'Dự án AI Hỗ trợ học tập',
  },
  {
    id: 'AW-003',
    timestamp: '2026-05-10T14:20:00.000Z',
    submitterName: 'Thầy Trần Minh Quân',
    submitterEmail: 'quan.tm@school.edu.vn',
    competitionName: 'Cuộc thi Olympic Toán Quốc tế Timo / SASMO',
    competitionDate: '2026-05-08',
    level: 'Cấp Quốc Tế',
    entryType: 'individual',
    studentId: 'HS2024-001',
    studentName: 'Nguyễn Văn An',
    className: '12A1',
    achievement: 'Huy Chương Vàng',
    notes: 'Vòng chung kết thế giới',
  },
  {
    id: 'AW-004',
    timestamp: '2026-03-25T10:00:00.000Z',
    submitterName: 'Cô Lê Thị Thu Hương',
    submitterEmail: 'huong.lt@school.edu.vn',
    competitionName: 'Olympic Tiếng Anh trên Internet (IOE)',
    competitionDate: '2026-03-20',
    level: 'Cấp Quốc Gia',
    entryType: 'individual',
    studentId: 'HS2024-002',
    studentName: 'Trần Thị Bình',
    className: '12A1',
    achievement: 'Huy Chương Bạc',
  },
  {
    id: 'AW-005',
    timestamp: '2026-04-15T11:00:00.000Z',
    submitterName: 'Thầy Vũ Đình Khoa',
    submitterEmail: 'khoa.vd@school.edu.vn',
    competitionName: 'Cuộc thi Sáng tạo Robot & Trí tuệ Nhân tạo (Robocon STEM)',
    competitionDate: '2026-04-10',
    level: 'Cấp Quốc Gia',
    entryType: 'collective',
    teamName: 'Đội Robocon Alpha 12A1',
    studentId: 'HS2024-001, HS2024-006',
    studentName: 'Nguyễn Văn An, Vũ Hải Đăng',
    className: '12A1, 11B2',
    achievement: 'Giải Nhất',
    notes: 'Robot cứu hộ tự hành',
  },
  {
    id: 'AW-006',
    timestamp: '2026-02-18T08:00:00.000Z',
    submitterName: 'Thầy Hoàng Văn Hải',
    submitterEmail: 'hai.hv@school.edu.vn',
    competitionName: 'Hội khỏe Phù Đổng',
    competitionDate: '2026-02-15',
    level: 'Cấp Quận/Huyện',
    entryType: 'individual',
    studentId: 'HS2024-010',
    studentName: 'Đặng Quốc Bảo',
    className: '11B1',
    achievement: 'Huy Chương Vàng',
    notes: 'Môn Cờ vua lứa tuổi 16-18',
  },
  {
    id: 'AW-007',
    timestamp: '2026-05-02T16:00:00.000Z',
    submitterName: 'Cô Phạm Thanh Thảo',
    submitterEmail: 'thao.pt@school.edu.vn',
    competitionName: 'Cuộc thi Viết thư Quốc tế UPU',
    competitionDate: '2026-04-28',
    level: 'Cấp Quốc Gia',
    entryType: 'individual',
    studentId: 'HS2024-007',
    studentName: 'Đỗ Thảo Linh',
    className: '10C1',
    achievement: 'Giải Ba',
    notes: 'Bức thư gửi tương lai xanh',
  },
];

export const POPULAR_ACHIEVEMENTS = [
  'Giải Nhất',
  'Giải Nhì',
  'Giải Ba',
  'Giải Khuyến Khích',
  'Huy Chương Vàng',
  'Huy Chương Bạc',
  'Huy Chương Đồng',
  'Giải Đặc Biệt',
  'Giải Triển Vọng',
  'Giải Phong Cách',
];

export const COMPETITION_LEVELS: CompetitionLevel[] = [
  'Cấp Trường',
  'Cấp Quận/Huyện',
  'Cấp Tỉnh/Thành Phố',
  'Cấp Quốc Gia',
  'Cấp Quốc Tế',
];

export const DEFAULT_USERS = [
  {
    username: 'superadmin',
    password: '123456',
    email: 'vuth3009@gmail.com',
    name: 'Vũ Trần (Super Admin)',
    role: 'superadmin' as const,
    mustChangePassword: true,
    notes: 'Quản trị viên cấp cao nhất - toàn quyền hệ thống',
  },
  {
    username: 'admin',
    password: '123456',
    email: 'admin@school.edu.vn',
    name: 'Ban Giám Hiệu / Quản Trị',
    role: 'admin' as const,
    mustChangePassword: true,
    notes: 'Xem thống kê và nộp giải thưởng',
  },
  {
    username: 'giaovien',
    password: '123456',
    email: 'giaovien@school.edu.vn',
    name: 'Giáo Viên Bộ Môn / GVCN',
    role: 'user' as const,
    mustChangePassword: true,
    notes: 'Chỉ nộp giải thưởng',
  },
];

export function calculateAchievementWeight(achievement: string): number {
  const norm = achievement.toLowerCase();
  if (norm.includes('đặc biệt')) return 95;
  if (norm.includes('vàng') || norm.includes('nhất')) return 90;
  if (norm.includes('bạc') || norm.includes('nhì')) return 75;
  if (norm.includes('đồng') || norm.includes('ba')) return 55;
  if (norm.includes('khuyến khích')) return 35;
  if (norm.includes('triển vọng') || norm.includes('phong cách')) return 25;
  return 15;
}

export function calculateCompositeWeight(level: CompetitionLevel, achievement: string): number {
  const levelWeight = LEVEL_RANK_MAP[level] || 100;
  const achWeight = calculateAchievementWeight(achievement);
  return levelWeight + achWeight;
}

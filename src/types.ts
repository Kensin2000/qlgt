export type CompetitionLevel =
  | 'Cấp Trường'
  | 'Cấp Quận/Huyện'
  | 'Cấp Tỉnh/Thành Phố'
  | 'Cấp Quốc Gia'
  | 'Cấp Quốc Tế';

export type UserRole = 'superadmin' | 'admin' | 'user';

export interface AppUser {
  username?: string; // Tên đăng nhập (hoặc email)
  password?: string; // Mật khẩu (mặc định: 123456)
  mustChangePassword?: boolean; // Yêu cầu đổi mật khẩu khi đăng nhập bằng 123456
  email: string;
  name: string;
  role: UserRole;
  notes?: string;
  lastActive?: string;
}

export interface SubmitterInfo {
  name: string;
  email: string;
  username?: string;
  password?: string;
  role?: UserRole;
  mustChangePassword?: boolean;
}

export interface Student {
  studentId: string; // MSHS
  name: string;
  className: string;
  notes?: string;
}

export interface Competition {
  id: string;
  name: string;
  defaultLevel: CompetitionLevel;
  field?: string; // Lĩnh vực (VD: Toán học, KHKT, Thể thao, Ngoại ngữ, Tin học)
  notes?: string;
}

export interface IndividualEntry {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  achievement: string; // Giải Nhất, Huy Chương Vàng, ...
}

export interface TeamMember {
  studentId: string;
  studentName: string;
  className: string;
}

export interface TeamEntry {
  id: string;
  teamName: string;
  className: string; // Lớp đại diện hoặc danh sách lớp
  achievement: string;
  members: TeamMember[];
}

export interface AwardRecord {
  id: string;
  timestamp: string;
  submitterName: string;
  submitterEmail: string;
  competitionName: string;
  competitionDate: string;
  level: CompetitionLevel;
  entryType: 'individual' | 'collective';
  teamName?: string;
  studentId: string; // MSHS của học sinh hoặc các thành viên
  studentName: string;
  className: string;
  achievement: string;
  notes?: string;
}

export interface GoogleSheetConfig {
  spreadsheetId: string;
  spreadsheetName: string;
  spreadsheetUrl: string;
  lastSyncedAt?: string;
  autoSyncEnabled?: boolean;
  autoSyncIntervalSeconds?: number;
}

export interface StudentStatsSummary {
  studentId: string;
  studentName: string;
  className: string;
  totalAwards: number;
  totalCompetitions: number;
  highestLevel: CompetitionLevel | 'Chưa có';
  highestAchievement: string;
  highestCompetitionName: string;
  highestWeight: number;
  competitionDetails: {
    competitionName: string;
    competitionDate: string;
    level: CompetitionLevel;
    achievement: string;
    entryType: 'individual' | 'collective';
    teamName?: string;
    weight: number;
  }[];
}

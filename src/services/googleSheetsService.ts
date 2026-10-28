import { AppUser, AwardRecord, Competition, CompetitionLevel, GoogleSheetConfig, Student, UserRole } from '../types';
import { DEFAULT_USERS } from '../data/defaultData';
import { sanitizeSheetValue } from '../utils/security';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
            error_callback?: (err: unknown) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export const GOOGLE_OAUTH_CLIENT_ID =
  '909046469379-uv7vnecv53ifdcn5dtsh8s5mivnr5h3u.apps.googleusercontent.com';
export const GOOGLE_SCOPES =
  'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

const TOKEN_STORAGE_KEY = 'qlgt_google_access_token';
const TOKEN_EXPIRY_KEY = 'qlgt_google_token_expiry';
const SHEET_CONFIG_KEY = 'qlgt_sheet_config';

export function getStoredGoogleToken(): string | null {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!token || !expiry) return null;
  if (Date.now() > parseInt(expiry, 10)) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    return null;
  }
  return token;
}

export function saveGoogleToken(token: string, expiresInSeconds: number = 3600): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, (Date.now() + (expiresInSeconds - 60) * 1000).toString());
}

export function clearGoogleToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

export function getStoredSheetConfig(): GoogleSheetConfig | null {
  const saved = localStorage.getItem(SHEET_CONFIG_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export function saveSheetConfig(config: GoogleSheetConfig): void {
  localStorage.setItem(SHEET_CONFIG_KEY, JSON.stringify(config));
}

export function clearSheetConfig(): void {
  localStorage.removeItem(SHEET_CONFIG_KEY);
}

/**
 * Triggers the Google OAuth popup to get an access token
 */
export async function requestGoogleAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Thư viện Google Identity Services chưa tải xong. Vui lòng thử lại sau vài giây.'));
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        scope: GOOGLE_SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error));
            return;
          }
          if (tokenResponse.access_token) {
            saveGoogleToken(tokenResponse.access_token);
            resolve(tokenResponse.access_token);
          } else {
            reject(new Error('Không nhận được mã truy cập từ Google.'));
          }
        },
        error_callback: (err) => {
          reject(err || new Error('Lỗi xác thực với Google.'));
        },
      });

      client.requestAccessToken({ prompt: '' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Search Drive for an existing spreadsheet named "Hệ Thống Quản Lý Giải Thưởng Học Sinh"
 */
export async function findExistingSpreadsheet(
  token: string
): Promise<{ id: string; url: string; name: string } | null> {
  try {
    const query = encodeURIComponent(
      "name = 'Hệ Thống Quản Lý Giải Thưởng Học Sinh' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false"
    );
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      const file = data.files[0];
      return {
        id: file.id,
        name: file.name,
        url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
      };
    }
  } catch (e) {
    console.warn('Error searching existing spreadsheet:', e);
  }
  return null;
}

/**
 * Create a new Google Spreadsheet with 4 structured sheets:
 * 1. GiaiThuong
 * 2. DanhSachHocSinh
 * 3. DanhSachCuocThi
 * 4. NguoiDung (Phân quyền superadmin, admin, user)
 */
export async function createAwardSpreadsheet(
  token: string,
  initialStudents: Student[] = [],
  initialCompetitions: Competition[] = [],
  initialAwards: AwardRecord[] = [],
  initialUsers: AppUser[] = DEFAULT_USERS
): Promise<{ id: string; url: string; name: string }> {
  const title = 'Hệ Thống Quản Lý Giải Thưởng Học Sinh';

  const body = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'GiaiThuong',
          gridProperties: { frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'DanhSachHocSinh',
          gridProperties: { frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'DanhSachCuocThi',
          gridProperties: { frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'NguoiDung',
          gridProperties: { frozenRowCount: 1 },
        },
      },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Không thể tạo bảng tính trên Google Sheets.');
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl =
    created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write header rows and initial data
  const awardRows: string[][] = [
    [
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
    ],
    ...initialAwards.map((a) => [
      a.id,
      a.timestamp,
      a.submitterName,
      a.submitterEmail,
      a.entryType === 'individual' ? 'Cá nhân' : 'Tập thể',
      a.competitionName,
      a.competitionDate,
      a.level,
      a.teamName || '',
      a.studentId,
      a.studentName,
      a.className,
      a.achievement,
      a.notes || '',
    ]),
  ];

  const studentRows: string[][] = [
    ['MSHS', 'Họ Và Tên', 'Lớp', 'Ghi Chú'],
    ...initialStudents.map((s) => [s.studentId, s.name, s.className, s.notes || '']),
  ];

  const compRows: string[][] = [
    ['Mã Cuộc Thi', 'Tên Cuộc Thi', 'Cấp Mặc Định', 'Lĩnh Vực', 'Ghi Chú'],
    ...initialCompetitions.map((c) => [c.id, c.name, c.defaultLevel, c.field || '', c.notes || '']),
  ];

  const userRows: string[][] = [
    ['Tên Đăng Nhập', 'Mật Khẩu', 'Email', 'Họ Và Tên', 'Quyền Hạn (superadmin / admin / user)', 'Ghi Chú'],
    ...initialUsers.map((u) => [
      u.username || u.email.split('@')[0],
      u.password || '123456',
      u.email,
      u.name,
      u.role,
      u.notes || '',
    ]),
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: 'GiaiThuong!A1',
          values: awardRows,
        },
        {
          range: 'DanhSachHocSinh!A1',
          values: studentRows,
        },
        {
          range: 'DanhSachCuocThi!A1',
          values: compRows,
        },
        {
          range: 'NguoiDung!A1',
          values: userRows,
        },
      ],
    }),
  });

  const config: GoogleSheetConfig = {
    spreadsheetId,
    spreadsheetName: title,
    spreadsheetUrl,
    lastSyncedAt: new Date().toISOString(),
  };
  saveSheetConfig(config);

  return {
    id: spreadsheetId,
    url: spreadsheetUrl,
    name: title,
  };
}

/**
 * Parse CSV text RFC-4180 standard
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }
  return rows;
}

/**
 * Fetch spreadsheet metadata to get exact sheet titles and IDs
 */
export async function getSpreadsheetDetails(
  token: string | null,
  spreadsheetId: string
): Promise<{ title: string; sheets: { title: string; sheetId: number }[] } | null> {
  if (!token) return null;
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties(sheetId,title)`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.properties?.title || '',
      sheets: (data.sheets || []).map((s: { properties?: { sheetId?: number; title?: string } }) => ({
        title: s.properties?.title || '',
        sheetId: s.properties?.sheetId || 0,
      })),
    };
  } catch (err) {
    console.warn('Could not fetch spreadsheet metadata:', err);
    return null;
  }
}

/**
 * Fetch public or shared sheet via Google Visualization API
 */
export async function fetchSheetCSV(spreadsheetId: string, sheetName: string): Promise<string[][] | null> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
      sheetName
    )}&timestamp=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.includes('<!DOCTYPE html>') || text.includes('Google Drive – Page Not Found')) {
      return null;
    }
    return parseCSV(text);
  } catch (err) {
    console.warn(`Error fetching CSV for ${sheetName}:`, err);
    return null;
  }
}

/**
 * Append new award records to GiaiThuong sheet
 */
export async function appendAwardsToSheet(
  token: string,
  spreadsheetId: string,
  awards: AwardRecord[]
): Promise<boolean> {
  const rows = awards.map((a) => [
    sanitizeSheetValue(a.id),
    sanitizeSheetValue(a.timestamp),
    sanitizeSheetValue(a.submitterName),
    sanitizeSheetValue(a.submitterEmail),
    sanitizeSheetValue(a.entryType === 'individual' ? 'Cá nhân' : 'Tập thể'),
    sanitizeSheetValue(a.competitionName),
    sanitizeSheetValue(a.competitionDate),
    sanitizeSheetValue(a.level),
    sanitizeSheetValue(a.teamName || ''),
    sanitizeSheetValue(a.studentId),
    sanitizeSheetValue(a.studentName),
    sanitizeSheetValue(a.className),
    sanitizeSheetValue(a.achievement),
    sanitizeSheetValue(a.notes || ''),
  ]);

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/GiaiThuong!A:N:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  return res.ok;
}

/**
 * Fetch all awards from GiaiThuong sheet
 * Supports both authenticated API and public GViz CSV fallback
 */
export async function fetchAwardsFromSheet(
  token: string | null,
  spreadsheetId: string
): Promise<AwardRecord[]> {
  let rows: string[][] = [];

  // Try Authenticated API first if token is provided
  if (token) {
    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/GiaiThuong!A2:N`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store',
            Pragma: 'no-cache',
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        rows = data.values || [];
      }
    } catch {
      // Fallback
    }
  }

  // Fallback to GViz CSV
  if (rows.length === 0) {
    const csvRows = await fetchSheetCSV(spreadsheetId, 'GiaiThuong');
    if (csvRows && csvRows.length > 1) {
      rows = csvRows.slice(1); // skip header
    }
  }

  return rows
    .filter((r) => r && r[0])
    .map((r, idx) => ({
      id: r[0] || `AW-${Date.now()}-${idx}`,
      timestamp: r[1] || new Date().toISOString(),
      submitterName: r[2] || '',
      submitterEmail: r[3] || '',
      entryType: r[4] === 'Tập thể' ? 'collective' : 'individual',
      competitionName: r[5] || '',
      competitionDate: r[6] || '',
      level: (r[7] as CompetitionLevel) || 'Cấp Trường',
      teamName: r[8] || undefined,
      studentId: r[9] || '',
      studentName: r[10] || '',
      className: r[11] || '',
      achievement: r[12] || '',
      notes: r[13] || '',
    }));
}

/**
 * Sync user list to NguoiDung sheet
 */
export async function syncUsersToSheet(
  token: string,
  spreadsheetId: string,
  users: AppUser[]
): Promise<boolean> {
  await ensureUserSheetExists(token, spreadsheetId);

  const rows: string[][] = [
    ['Tên Đăng Nhập', 'Mật Khẩu', 'Email', 'Họ Và Tên', 'Quyền Hạn (superadmin / admin / user)', 'Ghi Chú'],
    ...users.map((u) => [
      sanitizeSheetValue(u.username || u.email.split('@')[0]),
      sanitizeSheetValue(u.password || '123456'),
      sanitizeSheetValue(u.email),
      sanitizeSheetValue(u.name),
      sanitizeSheetValue(u.role),
      sanitizeSheetValue(u.notes || ''),
    ]),
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/NguoiDung!A:F:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/NguoiDung!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  );

  return res.ok;
}

/**
 * Ensures that the 'NguoiDung' tab exists on the spreadsheet. If not, creates it and initializes default users.
 */
export async function ensureUserSheetExists(
  token: string,
  spreadsheetId: string
): Promise<boolean> {
  try {
    // Check existing sheets
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!metaRes.ok) return false;
    const metaData = await metaRes.json();
    const sheetTitles: string[] = (metaData.sheets || []).map(
      (s: { properties?: { title?: string } }) => s.properties?.title || ''
    );

    const hasUserSheet = sheetTitles.some((title) => {
      const norm = normalizeSheetName(title);
      return norm.includes('nguoidung') || norm.includes('user') || norm.includes('phanquyen');
    });

    if (!hasUserSheet) {
      // Add sheet NguoiDung
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: 'NguoiDung',
                    gridProperties: { frozenRowCount: 1 },
                  },
                },
              },
            ],
          }),
        }
      );

      // Write default user rows with username and password
      const userRows: string[][] = [
        ['Tên Đăng Nhập', 'Mật Khẩu', 'Email', 'Họ Và Tên', 'Quyền Hạn (superadmin / admin / user)', 'Ghi Chú'],
        ...DEFAULT_USERS.map((u) => [
          sanitizeSheetValue(u.username || u.email.split('@')[0]),
          sanitizeSheetValue(u.password || '123456'),
          sanitizeSheetValue(u.email),
          sanitizeSheetValue(u.name),
          sanitizeSheetValue(u.role),
          sanitizeSheetValue(u.notes || ''),
        ]),
      ];

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/NguoiDung!A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: userRows }),
        }
      );
    }
    return true;
  } catch (e) {
    console.warn('ensureUserSheetExists error:', e);
    return false;
  }
}

/**
 * Fetch users from NguoiDung sheet
 */
export async function fetchUsersFromSheet(
  token: string | null,
  spreadsheetId: string
): Promise<{ users: AppUser[]; error?: string; source: 'api' | 'csv' | 'none' }> {
  let rows: string[][] = [];
  let source: 'api' | 'csv' | 'none' = 'none';
  let lastError: string | undefined;

  const sheetNameCandidates = [
    'NguoiDung',
    'Người Dùng',
    'Users',
    'User',
    'PhanQuyen',
    'Phân Quyền',
    'TaiKhoan',
  ];

  if (token) {
    for (const sheetName of sheetNameCandidates) {
      try {
        const encodedRange = encodeURIComponent(`${sheetName}!A1:Z`);
        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache, no-store',
              Pragma: 'no-cache',
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.values && data.values.length > 0) {
            rows = data.values;
            source = 'api';
            break;
          }
        }
      } catch (e) {
        console.warn(`Error fetching users tab ${sheetName}:`, e);
      }
    }
  }

  // Fallback to CSV
  if (rows.length === 0) {
    for (const sheetName of sheetNameCandidates) {
      const csvRows = await fetchSheetCSV(spreadsheetId, sheetName);
      if (csvRows && csvRows.length > 0) {
        rows = csvRows;
        source = 'csv';
        break;
      }
    }
  }

  if (rows.length === 0) {
    return { users: [], source: 'none', error: lastError };
  }

  let startIdx = 0;
  let usernameCol = -1;
  let passwordCol = -1;
  let emailCol = 0;
  let nameCol = 1;
  let roleCol = 2;
  let notesCol = 3;

  const firstRow = rows[0].map((c) => (c || '').toLowerCase().trim());
  const hasHeader = firstRow.some(
    (c) =>
      c.includes('email') ||
      c.includes('quyền') ||
      c.includes('quyen') ||
      c.includes('role') ||
      c.includes('tên') ||
      c.includes('user') ||
      c.includes('khẩu') ||
      c.includes('pass')
  );

  if (hasHeader) {
    startIdx = 1;
    firstRow.forEach((col, idx) => {
      const norm = normalizeSheetName(col);
      if (norm.includes('matkhau') || norm.includes('password') || norm.includes('pass')) {
        passwordCol = idx;
      } else if (
        norm.includes('tendangnhap') ||
        norm.includes('username') ||
        norm.includes('taikhoan')
      ) {
        usernameCol = idx;
      } else if (norm.includes('email') || norm.includes('thu')) {
        emailCol = idx;
      } else if (norm.includes('ten') || norm.includes('name') || norm.includes('hoten')) {
        nameCol = idx;
      } else if (norm.includes('quyen') || norm.includes('role') || norm.includes('capbac')) {
        roleCol = idx;
      } else if (norm.includes('ghi') || norm.includes('note')) {
        notesCol = idx;
      }
    });
  }

  const parsedUsers: AppUser[] = [];
  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const email = (r[emailCol] || '').trim().toLowerCase();
    const rawUsername = usernameCol >= 0 ? (r[usernameCol] || '').trim() : '';
    const username = rawUsername || (email.includes('@') ? email.split('@')[0] : `user_${i}`);
    const password = passwordCol >= 0 ? (r[passwordCol] || '').trim() || '123456' : '123456';

    if (!email && !username) continue;

    const rawRole = (r[roleCol] || '').trim().toLowerCase();
    let role: UserRole = 'user';
    if (rawRole.includes('super') || rawRole.includes('toan') || rawRole === 'superadmin') {
      role = 'superadmin';
    } else if (rawRole.includes('admin') || rawRole.includes('quan tri')) {
      role = 'admin';
    } else {
      role = 'user';
    }

    parsedUsers.push({
      username,
      password,
      mustChangePassword: password === '123456',
      email: email || `${username}@school.edu.vn`,
      name: (r[nameCol] || '').trim() || username,
      role,
      notes: (r[notesCol] || '').trim(),
    });
  }

  return { users: parsedUsers, source };
}

/**
 * Sync master student list to DanhSachHocSinh sheet
 */
export async function syncStudentsToSheet(
  token: string,
  spreadsheetId: string,
  students: Student[]
): Promise<boolean> {
  const rows: string[][] = [
    ['MSHS', 'Họ Và Tên', 'Lớp', 'Ghi Chú'],
    ...students.map((s) => [s.studentId, s.name, s.className, s.notes || '']),
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/DanhSachHocSinh!A:D:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/DanhSachHocSinh!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  );

  return res.ok;
}

/**
 * Normalize sheet name comparison (ignore case, spaces, diacritics)
 */
function normalizeSheetName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');
}

/**
 * Fetch master student list from DanhSachHocSinh sheet
 * Supports both authenticated API and public GViz CSV fallback,
 * with resilient column order detection and sheet name tolerance.
 */
export async function fetchStudentsFromSheet(
  token: string | null,
  spreadsheetId: string
): Promise<{ students: Student[]; error?: string; source: 'api' | 'csv' | 'none' }> {
  let rows: string[][] = [];
  let source: 'api' | 'csv' | 'none' = 'none';
  let lastError: string | undefined;

  // Possible variations of tab names user might have used
  const sheetNameCandidates = [
    'DanhSachHocSinh',
    'Danh Sách Học Sinh',
    'DanhSachHS',
    'HocSinh',
    'Học Sinh',
    'Students',
  ];

  // Try API first
  if (token) {
    for (const sheetName of sheetNameCandidates) {
      try {
        const encodedRange = encodeURIComponent(`${sheetName}!A1:Z`);
        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache, no-store',
              Pragma: 'no-cache',
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.values && data.values.length > 0) {
            rows = data.values;
            source = 'api';
            break;
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn(`API error for ${sheetName}:`, res.status, errData);
          if (res.status === 401) {
            lastError = 'Phiên đăng nhập Google đã hết hạn. Vui lòng bấm "Kết nối lại Google".';
            break;
          }
        }
      } catch (e) {
        console.warn(`Error fetching API for student tab ${sheetName}:`, e);
      }
    }
  }

  // Fallback to GViz CSV if API returned no rows
  if (rows.length === 0) {
    for (const sheetName of sheetNameCandidates) {
      const csvRows = await fetchSheetCSV(spreadsheetId, sheetName);
      if (csvRows && csvRows.length > 0) {
        rows = csvRows;
        source = 'csv';
        break;
      }
    }
  }

  if (rows.length === 0) {
    return { students: [], error: lastError, source: 'none' };
  }

  // Detect header row or start directly from row 0 if no header matches
  let startIdx = 0;
  let idCol = 0;
  let nameCol = 1;
  let classCol = 2;
  let notesCol = 3;

  // Check if first row contains headers
  const firstRow = rows[0].map((c) => (c || '').toLowerCase().trim());
  const hasHeader = firstRow.some(
    (c) =>
      c.includes('mã') ||
      c.includes('mshs') ||
      c.includes('tên') ||
      c.includes('họ') ||
      c.includes('lớp')
  );

  if (hasHeader) {
    startIdx = 1;
    firstRow.forEach((col, idx) => {
      const norm = normalizeSheetName(col);
      if (norm.includes('ma') || norm.includes('mshs') || norm.includes('id')) {
        idCol = idx;
      } else if (norm.includes('ten') || norm.includes('ho') || norm.includes('name')) {
        nameCol = idx;
      } else if (norm.includes('lop') || norm.includes('class')) {
        classCol = idx;
      } else if (norm.includes('ghi') || norm.includes('doituyen') || norm.includes('note')) {
        notesCol = idx;
      }
    });
  }

  const parsedStudents: Student[] = [];
  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const studentId = (r[idCol] || '').trim();
    const name = (r[nameCol] || '').trim();
    const className = (r[classCol] || '').trim();
    const notes = (r[notesCol] || '').trim();

    // Valid student needs at least a name or an ID
    if (studentId || name) {
      parsedStudents.push({
        studentId: studentId || `HS-${i}`,
        name: name || studentId,
        className: className || '',
        notes: notes || '',
      });
    }
  }

  return { students: parsedStudents, source };
}

/**
 * Sync competition list to DanhSachCuocThi sheet
 */
export async function syncCompetitionsToSheet(
  token: string,
  spreadsheetId: string,
  competitions: Competition[]
): Promise<boolean> {
  const rows: string[][] = [
    ['Mã Cuộc Thi', 'Tên Cuộc Thi', 'Cấp Mặc Định', 'Lĩnh Vực', 'Ghi Chú'],
    ...competitions.map((c) => [c.id, c.name, c.defaultLevel, c.field || '', c.notes || '']),
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/DanhSachCuocThi!A:E:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/DanhSachCuocThi!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  );

  return res.ok;
}

/**
 * Fetch competition list from DanhSachCuocThi sheet
 * Supports both authenticated API and public GViz CSV fallback
 */
export async function fetchCompetitionsFromSheet(
  token: string | null,
  spreadsheetId: string
): Promise<{ competitions: Competition[]; error?: string; source: 'api' | 'csv' | 'none' }> {
  let rows: string[][] = [];
  let source: 'api' | 'csv' | 'none' = 'none';

  const sheetNameCandidates = [
    'DanhSachCuocThi',
    'Danh Sách Cuộc Thi',
    'CuocThi',
    'Cuộc Thi',
    'Competitions',
  ];

  if (token) {
    for (const sheetName of sheetNameCandidates) {
      try {
        const encodedRange = encodeURIComponent(`${sheetName}!A1:Z`);
        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache, no-store',
              Pragma: 'no-cache',
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.values && data.values.length > 0) {
            rows = data.values;
            source = 'api';
            break;
          }
        }
      } catch (e) {
        console.warn(`Error fetching API for competition tab ${sheetName}:`, e);
      }
    }
  }

  if (rows.length === 0) {
    for (const sheetName of sheetNameCandidates) {
      const csvRows = await fetchSheetCSV(spreadsheetId, sheetName);
      if (csvRows && csvRows.length > 0) {
        rows = csvRows;
        source = 'csv';
        break;
      }
    }
  }

  if (rows.length === 0) {
    return { competitions: [], source: 'none' };
  }

  let startIdx = 0;
  let idCol = 0;
  let nameCol = 1;
  let levelCol = 2;
  let fieldCol = 3;
  let notesCol = 4;

  const firstRow = rows[0].map((c) => (c || '').toLowerCase().trim());
  const hasHeader = firstRow.some((c) => c.includes('tên') || c.includes('cuộc thi') || c.includes('cấp'));

  if (hasHeader) {
    startIdx = 1;
    firstRow.forEach((col, idx) => {
      const norm = normalizeSheetName(col);
      if (norm.includes('ma') || norm.includes('id')) idCol = idx;
      else if (norm.includes('ten') || norm.includes('name')) nameCol = idx;
      else if (norm.includes('cap') || norm.includes('level')) levelCol = idx;
      else if (norm.includes('linhvuc') || norm.includes('field')) fieldCol = idx;
      else if (norm.includes('ghi') || norm.includes('note')) notesCol = idx;
    });
  }

  const parsedComps: Competition[] = [];
  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const name = (r[nameCol] || '').trim();
    if (!name) continue;

    parsedComps.push({
      id: (r[idCol] || '').trim() || `COMP-${i}`,
      name,
      defaultLevel: (r[levelCol] as CompetitionLevel) || 'Cấp Trường',
      field: (r[fieldCol] || '').trim(),
      notes: (r[notesCol] || '').trim(),
    });
  }

  return { competitions: parsedComps, source };
}

/**
 * Pull all data from Sheet in one unified call
 */
export async function pullAllDataFromSheet(
  spreadsheetId: string,
  token?: string | null
): Promise<{
  students: Student[];
  competitions: Competition[];
  awards: AwardRecord[];
  users: AppUser[];
  studentSource?: string;
  error?: string;
}> {
  // If we have token, ensure NguoiDung tab exists
  if (token) {
    try {
      await ensureUserSheetExists(token, spreadsheetId);
    } catch {
      // non-blocking
    }
  }

  const [studentRes, compRes, awards, userRes] = await Promise.all([
    fetchStudentsFromSheet(token || null, spreadsheetId),
    fetchCompetitionsFromSheet(token || null, spreadsheetId),
    fetchAwardsFromSheet(token || null, spreadsheetId),
    fetchUsersFromSheet(token || null, spreadsheetId),
  ]);

  return {
    students: studentRes.students,
    competitions: compRes.competitions,
    awards,
    users: userRes.users,
    studentSource: studentRes.source,
    error: studentRes.error,
  };
}

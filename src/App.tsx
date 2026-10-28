import React, { useCallback, useEffect, useState } from 'react';
import { AppUser, AwardRecord, Competition, GoogleSheetConfig, Student, SubmitterInfo } from './types';
import { DEFAULT_AWARDS, DEFAULT_COMPETITIONS, DEFAULT_STUDENTS, DEFAULT_USERS } from './data/defaultData';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { ClientAwardForm } from './components/ClientAwardForm';
import { YearEndFilter } from './components/YearEndFilter';
import { AdminView } from './components/AdminView';
import {
  appendAwardsToSheet,
  createAwardSpreadsheet,
  fetchAwardsFromSheet,
  fetchCompetitionsFromSheet,
  fetchStudentsFromSheet,
  fetchUsersFromSheet,
  getStoredGoogleToken,
  getStoredSheetConfig,
  pullAllDataFromSheet,
  requestGoogleAccessToken,
  saveSheetConfig,
  syncCompetitionsToSheet,
  syncStudentsToSheet,
  syncUsersToSheet,
} from './services/googleSheetsService';
import { CheckCircle2, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { hashPassword, isPasswordHashed, validateSessionIntegrity } from './utils/security';

const SUBMITTER_KEY = 'qlgt_submitter_info';
const STUDENTS_KEY = 'qlgt_master_students';
const COMPS_KEY = 'qlgt_master_competitions';
const AWARDS_KEY = 'qlgt_awards_data';
const USERS_KEY = 'qlgt_users_data';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'client' | 'filter' | 'admin'>('client');

  // Submitter Info (Tên & Email người điền / Đăng nhập)
  const [submitterInfo, setSubmitterInfo] = useState<SubmitterInfo | null>(() => {
    const saved = localStorage.getItem(SUBMITTER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Modal to prompt login:
  const [isSubmitterModalOpen, setIsSubmitterModalOpen] = useState<boolean>(() => {
    return !localStorage.getItem(SUBMITTER_KEY);
  });

  // Force change password modal state (when user logs in with default password 123456)
  const [pendingChangePasswordUser, setPendingChangePasswordUser] = useState<AppUser | null>(null);
  const [isForcedChangePassword, setIsForcedChangePassword] = useState<boolean>(false);

  // Master Data States
  const [masterStudents, setMasterStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem(STUDENTS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_STUDENTS;
      }
    }
    return DEFAULT_STUDENTS;
  });

  const [masterCompetitions, setMasterCompetitions] = useState<Competition[]>(() => {
    const saved = localStorage.getItem(COMPS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_COMPETITIONS;
      }
    }
    return DEFAULT_COMPETITIONS;
  });

  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem(USERS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_USERS;
      }
    }
    return DEFAULT_USERS;
  });

  const [awards, setAwards] = useState<AwardRecord[]>(() => {
    const saved = localStorage.getItem(AWARDS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_AWARDS;
      }
    }
    return DEFAULT_AWARDS;
  });

  // Google Sheets Config
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig | null>(() => {
    return getStoredSheetConfig();
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Toast Notification
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Sync to local storage on changes
  useEffect(() => {
    if (submitterInfo) {
      localStorage.setItem(SUBMITTER_KEY, JSON.stringify(submitterInfo));
    }
  }, [submitterInfo]);

  useEffect(() => {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(masterStudents));
  }, [masterStudents]);

  useEffect(() => {
    localStorage.setItem(COMPS_KEY, JSON.stringify(masterCompetitions));
  }, [masterCompetitions]);

  useEffect(() => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, [users]);

  // Security Guard: Verify session integrity and prevent client-side privilege escalation
  useEffect(() => {
    if (!submitterInfo) return;

    validateSessionIntegrity(submitterInfo, users).then(({ valid, correctedUser }) => {
      if (!valid) {
        if (correctedUser) {
          // Role was manipulated in localStorage -> immediately correct it
          console.warn(
            `[Security Audit] Role tampering detected for ${submitterInfo.email}! Resetting to legitimate role: ${correctedUser.role}`
          );
          setSubmitterInfo((prev) =>
            prev ? { ...prev, role: correctedUser.role } : null
          );
          showToast('error', 'Cảnh báo bảo mật: Phát hiện quyền hạn bị sửa đổi không hợp lệ. Đã khôi phục quyền chuẩn.');
        } else {
          // User does not exist in valid list -> terminate session
          console.warn('[Security Audit] Invalid session user. Revoking access.');
          localStorage.removeItem(SUBMITTER_KEY);
          setSubmitterInfo(null);
          setIsSubmitterModalOpen(true);
          showToast('error', 'Phiên đăng nhập không hợp lệ hoặc đã bị vô hiệu hóa.');
        }
      }
    });
  }, [submitterInfo, users]);

  // Adjust active tab if user's role does not allow viewing current tab
  useEffect(() => {
    const currentRole = submitterInfo?.role || 'user';
    if (activeTab === 'admin' && currentRole !== 'superadmin') {
      setActiveTab('client');
    } else if (activeTab === 'filter' && currentRole === 'user') {
      setActiveTab('client');
    }
  }, [activeTab, submitterInfo]);

  useEffect(() => {
    localStorage.setItem(AWARDS_KEY, JSON.stringify(awards));
  }, [awards]);

  // Submitter info / Login success handler
  const handleLoginSuccess = async (user: AppUser, requiresPasswordChange: boolean) => {
    if (requiresPasswordChange) {
      // User must change default 123456 password before finalizing
      setPendingChangePasswordUser(user);
      setIsForcedChangePassword(true);
      setIsSubmitterModalOpen(false);
      return;
    }

    // If password is not hashed and user is logging in, upgrade transparently to SHA-256
    let userWithSafePassword = { ...user };
    if (user.password && !isPasswordHashed(user.password) && user.password !== '123456') {
      try {
        const hashed = await hashPassword(user.password);
        userWithSafePassword.password = hashed;
        setUsers((prev) =>
          prev.map((u) => (u.email.toLowerCase() === user.email.toLowerCase() ? userWithSafePassword : u))
        );
      } catch {
        // Continue with current
      }
    }

    const subInfo: SubmitterInfo = {
      name: userWithSafePassword.name,
      email: userWithSafePassword.email,
      username: userWithSafePassword.username || userWithSafePassword.email.split('@')[0],
      role: userWithSafePassword.role,
      password: userWithSafePassword.password,
      mustChangePassword: false,
    };
    setSubmitterInfo(subInfo);
    setIsSubmitterModalOpen(false);
    showToast('success', `Đăng nhập thành công: ${user.name} (${user.role})`);
  };

  // Handle password change save
  const handleSaveNewPassword = async (newPassword: string) => {
    if (!pendingChangePasswordUser) return;

    // Cryptographically hash the new password using salted SHA-256
    const hashedPassword = await hashPassword(newPassword);

    const updatedUser: AppUser = {
      ...pendingChangePasswordUser,
      password: hashedPassword,
      mustChangePassword: false,
    };

    // Update users array
    const updatedUsers = users.map((u) =>
      u.email.toLowerCase() === updatedUser.email.toLowerCase() ? updatedUser : u
    );
    setUsers(updatedUsers);

    // Save as active logged-in submitter
    const subInfo: SubmitterInfo = {
      name: updatedUser.name,
      email: updatedUser.email,
      username: updatedUser.username || updatedUser.email.split('@')[0],
      role: updatedUser.role,
      password: hashedPassword,
      mustChangePassword: false,
    };
    setSubmitterInfo(subInfo);
    setPendingChangePasswordUser(null);
    setIsForcedChangePassword(false);
    showToast('success', 'Đổi mật khẩu thành công! Mật khẩu đã được mã hóa an toàn.');

    // Sync updated user credentials to Google Sheet if connected
    if (sheetConfig) {
      let token = getStoredGoogleToken();
      if (!token) {
        try {
          token = await requestGoogleAccessToken();
        } catch {
          // Token request skipped or cancelled
        }
      }
      if (token) {
        try {
          await syncUsersToSheet(token, sheetConfig.spreadsheetId, updatedUsers);
        } catch (e) {
          console.warn('Error syncing updated password to sheet:', e);
        }
      }
    }
  };

  // Handle user logout
  const handleLogout = () => {
    localStorage.removeItem(SUBMITTER_KEY);
    setSubmitterInfo(null);
    setIsSubmitterModalOpen(true);
    showToast('info', 'Đã đăng xuất tài khoản thành công.');
  };

  // Open voluntary change password modal for current logged-in user
  const handleOpenVoluntaryChangePassword = () => {
    if (!submitterInfo) return;
    const currentUserObj: AppUser = {
      email: submitterInfo.email,
      name: submitterInfo.name,
      username: submitterInfo.username || submitterInfo.email.split('@')[0],
      role: submitterInfo.role,
      password: submitterInfo.password || '123456',
      mustChangePassword: false,
    };
    setPendingChangePasswordUser(currentUserObj);
    setIsForcedChangePassword(false);
  };

  // When new awards are submitted from client form
  const handleSubmitAwards = async (newRecords: AwardRecord[]) => {
    const updated = [...newRecords, ...awards];
    setAwards(updated);

    // Sync to Google Sheet if connected
    if (sheetConfig) {
      let token = getStoredGoogleToken();
      if (!token) {
        try {
          token = await requestGoogleAccessToken();
        } catch {
          // Keep saved locally
        }
      }

      if (token) {
        try {
          await appendAwardsToSheet(token, sheetConfig.spreadsheetId, newRecords);
          showToast('success', `Đã lưu và đồng bộ ${newRecords.length} giải thưởng lên Google Sheets!`);
          return;
        } catch (err) {
          console.warn('Google Sheet append error:', err);
          showToast('info', `Đã lưu ${newRecords.length} giải thưởng vào bộ nhớ hệ thống.`);
          return;
        }
      }
    }

    showToast('success', `Đã lưu ${newRecords.length} giải thưởng thành công!`);
  };

  // Delete award record handler
  const handleDeleteAward = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa bản ghi giải thưởng này?')) {
      setAwards((prev) => prev.filter((a) => a.id !== id));
      showToast('info', 'Đã xóa bản ghi giải thưởng.');
    }
  };

  // Update students handler
  const handleUpdateStudents = async (newStudents: Student[]) => {
    setMasterStudents(newStudents);
    showToast('success', 'Đã cập nhật danh sách học sinh!');

    if (sheetConfig) {
      const token = getStoredGoogleToken();
      if (token) {
        try {
          await syncStudentsToSheet(token, sheetConfig.spreadsheetId, newStudents);
          showToast('success', 'Đã đồng bộ danh sách học sinh lên Google Sheet!');
        } catch (e) {
          console.warn('Error syncing students to sheet:', e);
        }
      }
    }
  };

  // Update competitions handler
  const handleUpdateCompetitions = async (newCompetitions: Competition[]) => {
    setMasterCompetitions(newCompetitions);
    showToast('success', 'Đã cập nhật danh mục cuộc thi!');

    if (sheetConfig) {
      const token = getStoredGoogleToken();
      if (token) {
        try {
          await syncCompetitionsToSheet(token, sheetConfig.spreadsheetId, newCompetitions);
          showToast('success', 'Đã đồng bộ danh mục cuộc thi lên Google Sheet!');
        } catch (e) {
          console.warn('Error syncing competitions to sheet:', e);
        }
      }
    }
  };

  // Update users & RBAC roles handler
  const handleUpdateUsers = async (newUsers: AppUser[]) => {
    setUsers(newUsers);
    showToast('success', 'Đã cập nhật danh sách phân quyền người dùng!');

    // Update current submitterInfo role if their email was updated
    if (submitterInfo) {
      const matched = newUsers.find(
        (u) => u.email.toLowerCase() === submitterInfo.email.toLowerCase()
      );
      if (matched && matched.role !== submitterInfo.role) {
        setSubmitterInfo({
          ...submitterInfo,
          role: matched.role,
        });
      }
    }

    if (sheetConfig) {
      let token = getStoredGoogleToken();
      if (!token) {
        try {
          token = await requestGoogleAccessToken();
        } catch {
          // Token prompt cancelled
        }
      }

      if (token) {
        try {
          await syncUsersToSheet(token, sheetConfig.spreadsheetId, newUsers);
          showToast('success', 'Đã lưu và đồng bộ người dùng thành công lên Google Sheet ("NguoiDung")!');
        } catch (e) {
          console.warn('Error syncing users to sheet:', e);
          showToast('info', 'Đã lưu người dùng vào bộ nhớ máy, bạn có thể nhấn "Đồng Bộ Sheets" để tải lên Google Sheet.');
        }
      }
    }
  };

  // Connect Google Account & Request Token
  const handleConnectGoogle = async () => {
    try {
      const token = await requestGoogleAccessToken();
      showToast('success', 'Đã kết nối tài khoản Google thành công!');
      return token;
    } catch (err: unknown) {
      showToast('error', (err as Error).message || 'Không thể xác thực Google.');
      return null;
    }
  };

  // Create Google Sheet Database
  const handleCreateSheetDatabase = async () => {
    setIsSyncing(true);
    try {
      let token = getStoredGoogleToken();
      if (!token) {
        token = await requestGoogleAccessToken();
      }

      showToast('info', 'Đang tạo bảng tính Google Sheets và khởi tạo 4 Sheet dữ liệu (GiaiThuong, DanhSachHocSinh, DanhSachCuocThi, NguoiDung)...');
      const created = await createAwardSpreadsheet(
        token,
        masterStudents,
        masterCompetitions,
        awards,
        users
      );

      const newConfig: GoogleSheetConfig = {
        spreadsheetId: created.id,
        spreadsheetName: created.name,
        spreadsheetUrl: created.url,
        lastSyncedAt: new Date().toISOString(),
      };
      setSheetConfig(newConfig);
      saveSheetConfig(newConfig);

      showToast(
        'success',
        `Tạo thành công bảng tính Google Sheet "${created.name}" trên Drive của bạn!`
      );
    } catch (err: unknown) {
      showToast('error', (err as Error).message || 'Lỗi khi tạo Google Sheet.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull latest data from Google Sheet (Sheet is source of truth)
  const handlePullLatestFromSheet = useCallback(
    async (silent = false) => {
      if (!sheetConfig) return;
      if (!silent) setIsSyncing(true);

      try {
        let token = getStoredGoogleToken();
        // If user explicitly clicked refresh and there's no active token, prompt for login
        if (!token && !silent) {
          try {
            token = await requestGoogleAccessToken();
          } catch {
            // User cancelled popup or error, proceed to try fallback
          }
        }

        const res = await pullAllDataFromSheet(sheetConfig.spreadsheetId, token);

        let studentCount = 0;
        let compCount = 0;
        let awardCount = 0;
        let userCount = 0;

        if (res.students && res.students.length > 0) {
          studentCount = res.students.length;
          setMasterStudents(res.students);
        }

        if (res.competitions && res.competitions.length > 0) {
          compCount = res.competitions.length;
          setMasterCompetitions(res.competitions);
        }

        if (res.users && res.users.length > 0) {
          userCount = res.users.length;
          setUsers(res.users);

          // Update current logged-in role if matched
          if (submitterInfo) {
            const matched = res.users.find(
              (u) => u.email.toLowerCase() === submitterInfo.email.toLowerCase()
            );
            if (matched && matched.role !== submitterInfo.role) {
              setSubmitterInfo((prev) => (prev ? { ...prev, role: matched.role } : prev));
            }
          }
        }

        if (res.awards && res.awards.length > 0) {
          awardCount = res.awards.length;
          setAwards(res.awards);
        }

        const now = new Date().toISOString();
        const updatedConfig = {
          ...sheetConfig,
          lastSyncedAt: now,
        };
        setSheetConfig(updatedConfig);
        saveSheetConfig(updatedConfig);

        if (!silent) {
          if (studentCount > 0 || compCount > 0 || awardCount > 0 || userCount > 0) {
            showToast(
              'success',
              `Đồng bộ thành công! Đã nạp: ${studentCount} HS, ${compCount} cuộc thi, ${userCount} người dùng, ${awardCount} giải thưởng từ Sheet.`
            );
          } else if (res.error) {
            showToast('error', res.error);
          } else {
            showToast(
              'info',
              'Đã kết nối được Sheet nhưng chưa đọc được dòng nào. Vui lòng kiểm tra quyền truy cập hoặc bấm "Kết nối Google".'
            );
          }
        }
      } catch (err: unknown) {
        if (!silent) {
          showToast('error', (err as Error).message || 'Không thể tải dữ liệu từ Google Sheets.');
        }
      } finally {
        if (!silent) setIsSyncing(false);
      }
    },
    [sheetConfig]
  );

  // Push all local data up to Sheet
  const handlePushAllToSheet = async () => {
    if (!sheetConfig) return;
    setIsSyncing(true);
    try {
      let token = getStoredGoogleToken();
      if (!token) {
        token = await requestGoogleAccessToken();
      }
      await syncStudentsToSheet(token, sheetConfig.spreadsheetId, masterStudents);
      await syncCompetitionsToSheet(token, sheetConfig.spreadsheetId, masterCompetitions);
      await syncUsersToSheet(token, sheetConfig.spreadsheetId, users);
      await appendAwardsToSheet(token, sheetConfig.spreadsheetId, awards);
      showToast('success', 'Đã ghi đè toàn bộ danh sách lên Google Sheets thành công!');
    } catch (err: unknown) {
      showToast('error', (err as Error).message || 'Lỗi khi đẩy dữ liệu lên Google Sheets.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle Auto-sync setting
  const handleToggleAutoSync = (enabled: boolean, intervalSeconds?: number) => {
    if (!sheetConfig) return;
    const updated = {
      ...sheetConfig,
      autoSyncEnabled: enabled,
      autoSyncIntervalSeconds: intervalSeconds || sheetConfig.autoSyncIntervalSeconds || 30,
    };
    setSheetConfig(updated);
    saveSheetConfig(updated);
    showToast(
      'info',
      enabled
        ? `Đã bật tự động cập nhật từ Google Sheet (${updated.autoSyncIntervalSeconds}s)`
        : 'Đã tắt tự động cập nhật ngầm'
    );
  };

  // 1. Auto-refresh when tab receives focus or document becomes visible (e.g. user just edited Sheet in another tab and returned)
  useEffect(() => {
    if (!sheetConfig) return;
    const isAutoSync = sheetConfig.autoSyncEnabled !== false;
    if (!isAutoSync) return;

    let lastPullTime = 0;
    const handleWindowFocus = () => {
      const now = Date.now();
      if (now - lastPullTime > 3000) {
        lastPullTime = now;
        handlePullLatestFromSheet(true);
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleWindowFocus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sheetConfig, handlePullLatestFromSheet]);

  // 2. Auto-polling interval
  useEffect(() => {
    if (!sheetConfig) return;
    const isAutoSync = sheetConfig.autoSyncEnabled !== false;
    if (!isAutoSync) return;

    const intervalSec = sheetConfig.autoSyncIntervalSeconds || 30;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handlePullLatestFromSheet(true);
      }
    }, intervalSec * 1000);

    return () => clearInterval(timer);
  }, [sheetConfig, handlePullLatestFromSheet]);

  // 3. Initial pull on startup if sheetConfig exists
  useEffect(() => {
    if (sheetConfig) {
      handlePullLatestFromSheet(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Full Two-way Sync (Pull from sheet first, then merge awards)
  const handleSyncAll = async () => {
    if (!sheetConfig) {
      handleCreateSheetDatabase();
      return;
    }

    setIsSyncing(true);
    try {
      let token = getStoredGoogleToken();
      if (!token) {
        token = await requestGoogleAccessToken();
      }

      showToast('info', 'Đang đồng bộ dữ liệu với Google Sheets...');

      // 1. Fetch latest students, competitions, users & awards from Sheet
      const [studentRes, compRes, sheetAwards, userRes] = await Promise.all([
        fetchStudentsFromSheet(token, sheetConfig.spreadsheetId),
        fetchCompetitionsFromSheet(token, sheetConfig.spreadsheetId),
        fetchAwardsFromSheet(token, sheetConfig.spreadsheetId),
        fetchUsersFromSheet(token, sheetConfig.spreadsheetId),
      ]);

      if (studentRes.students && studentRes.students.length > 0) {
        setMasterStudents(studentRes.students);
      }
      if (compRes.competitions && compRes.competitions.length > 0) {
        setMasterCompetitions(compRes.competitions);
      }
      if (userRes.users && userRes.users.length > 0) {
        setUsers(userRes.users);
      }

      // 2. Merge awards without duplicate IDs
      if (sheetAwards.length > 0) {
        const existingIds = new Set(sheetAwards.map((a) => a.id));
        const missingInSheet = awards.filter((a) => !existingIds.has(a.id));

        if (missingInSheet.length > 0) {
          await appendAwardsToSheet(token, sheetConfig.spreadsheetId, missingInSheet);
          setAwards([...missingInSheet, ...sheetAwards]);
        } else {
          setAwards(sheetAwards);
        }
      } else if (awards.length > 0) {
        await appendAwardsToSheet(token, sheetConfig.spreadsheetId, awards);
      }

      const updatedConfig = {
        ...sheetConfig,
        lastSyncedAt: new Date().toISOString(),
      };
      setSheetConfig(updatedConfig);
      saveSheetConfig(updatedConfig);

      showToast('success', 'Đồng bộ hai chiều với Google Sheets thành công!');
    } catch (err: unknown) {
      showToast('error', (err as Error).message || 'Lỗi khi đồng bộ Google Sheets.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Custom sheet ID binder
  const handleSetCustomSheetId = (id: string) => {
    const config: GoogleSheetConfig = {
      spreadsheetId: id,
      spreadsheetName: 'Bảng tính Google Sheet',
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`,
      lastSyncedAt: new Date().toISOString(),
      autoSyncEnabled: true,
      autoSyncIntervalSeconds: 30,
    };
    setSheetConfig(config);
    saveSheetConfig(config);
    showToast('success', `Đã liên kết với Google Sheet ID: ${id}`);
    handlePullLatestFromSheet(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased">
      {/* Global Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        submitterInfo={submitterInfo}
        onOpenSubmitterModal={() => setIsSubmitterModalOpen(true)}
        onOpenChangePassword={handleOpenVoluntaryChangePassword}
        onLogout={handleLogout}
        sheetConfig={sheetConfig}
        isSyncing={isSyncing}
        onPullFromSheet={handlePullLatestFromSheet}
        onToggleAutoSync={handleToggleAutoSync}
        onConnectGoogle={handleConnectGoogle}
        totalAwardsCount={awards.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'client' && (
          <ClientAwardForm
            submitterInfo={submitterInfo}
            onOpenSubmitterModal={() => setIsSubmitterModalOpen(true)}
            masterStudents={masterStudents}
            masterCompetitions={masterCompetitions}
            onSubmitSuccess={handleSubmitAwards}
            onNavigateToStats={() => setActiveTab('filter')}
          />
        )}

        {activeTab === 'filter' && (
          <YearEndFilter awards={awards} masterStudents={masterStudents} />
        )}

        {activeTab === 'admin' && (
          <AdminView
            awards={awards}
            onDeleteAward={handleDeleteAward}
            masterStudents={masterStudents}
            onUpdateStudents={handleUpdateStudents}
            masterCompetitions={masterCompetitions}
            onUpdateCompetitions={handleUpdateCompetitions}
            users={users}
            onUpdateUsers={handleUpdateUsers}
            sheetConfig={sheetConfig}
            onConnectGoogle={handleConnectGoogle}
            onCreateSheetDatabase={handleCreateSheetDatabase}
            onSyncAll={handleSyncAll}
            onPullFromSheet={handlePullLatestFromSheet}
            onPushToSheet={handlePushAllToSheet}
            onToggleAutoSync={handleToggleAutoSync}
            isSyncing={isSyncing}
            onSetCustomSheetId={handleSetCustomSheetId}
          />
        )}
      </main>

      {/* Login Modal */}
      <LoginModal
        isOpen={isSubmitterModalOpen}
        knownUsers={users}
        currentSubmitter={submitterInfo}
        onLoginSuccess={handleLoginSuccess}
        onClose={() => {
          if (submitterInfo) setIsSubmitterModalOpen(false);
        }}
        isInitialRequired={!submitterInfo}
      />

      {/* Change Password Modal (Forced on first login or voluntarily) */}
      {pendingChangePasswordUser && (
        <ChangePasswordModal
          isOpen={!!pendingChangePasswordUser}
          user={pendingChangePasswordUser}
          isForcedFirstLogin={isForcedChangePassword}
          onSaveNewPassword={handleSaveNewPassword}
          onCancel={() => {
            if (!isForcedChangePassword) {
              setPendingChangePasswordUser(null);
            }
          }}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />}
            <span className="text-xs font-medium text-slate-100">{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

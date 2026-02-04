import React, { useState, useEffect } from 'react';
import ProjectNavbar from './components/ProjectNavbar';
import Dashboard from './components/Dashboard';
import TransactionTable from './components/TransactionTable';
import ReceiptUploader from './components/ReceiptUploader';
import { AppView, Transaction, Budget } from './types';
import { Settings, Filter, Plus, Lock, AlertTriangle, Building2, Save, Cloud, Loader2, CheckCircle2, AlertCircle, HelpCircle, ExternalLink, KeyRound } from 'lucide-react';
import * as driveService from './services/driveService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  
  // Project Info State - Initialize from localStorage or default
  const [projectName, setProjectName] = useState(() => localStorage.getItem('project_name') || 'SiteCost AI');
  
  // Transaction Password State - Default 'Hoangduy1997'
  const [transactionPwd, setTransactionPwd] = useState(() => localStorage.getItem('transaction_password') || 'Hoangduy1997');

  // Google Drive Config State
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [isDriveReady, setIsDriveReady] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Get current date info
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-12

  // Slicer States - Default to Current Year AND Month
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth.toString());
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  
  // Modal State
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showUploaderModal, setShowUploaderModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false); // New state for troubleshooting toggle

  // Budget Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // Edit Transaction Auth State
  const [showEditSecurity, setShowEditSecurity] = useState(false);
  const [pendingEditTx, setPendingEditTx] = useState<Transaction | null>(null);
  const [editPasswordInput, setEditPasswordInput] = useState('');
  const [editAuthError, setEditAuthError] = useState(false);

  // Settings Auth State
  const [showSettingsSecurity, setShowSettingsSecurity] = useState(false);
  const [settingsPasswordInput, setSettingsPasswordInput] = useState('');
  const [settingsAuthError, setSettingsAuthError] = useState(false);

  // Budget Category State (Dynamic)
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryAmount, setNewCategoryAmount] = useState('');

  // Mock initial data
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
       id: '1', date: `${currentYear}-10-24`, type: 'EXPENSE', merchant: 'Steel Supplier Inc', 
       category: 'Vật tư', amount: 2500, currency: 'USD', description: 'Mua 3 tấn thép phi 18'
    },
    {
       id: '2', date: `${currentYear}-10-25`, type: 'EXPENSE', merchant: 'Heavy Mach Co.', 
       category: 'Cơ giới', amount: 800, currency: 'USD', description: 'Thuê máy xúc 3 ca'
    },
    {
       id: '3', date: `${currentYear}-10-26`, type: 'INCOME', merchant: 'Project Owner', 
       category: 'Thu từ ứng tiền', amount: 10000, currency: 'USD', description: 'Tạm ứng đợt 1'
    },
    {
       id: '4', date: `${currentYear}-10-27`, type: 'EXPENSE', merchant: 'Worker Team A', 
       category: 'Nhân công', amount: 1200, currency: 'USD', description: 'Thanh toán lương tuần 4'
    }
  ]);

  const [budgets, setBudgets] = useState<Budget[]>([
    { category: 'Vật tư', amount: 20000 },
    { category: 'Cơ giới', amount: 8000 },
    { category: 'Nhân công', amount: 12000 },
    { category: 'Chi phí công trường', amount: 2000 },
    { category: 'Chi phí khác', amount: 1000 },
  ]);

  // Load Config from LocalStorage on Mount
  useEffect(() => {
    const savedClientId = localStorage.getItem('google_client_id');
    const savedApiKey = localStorage.getItem('google_api_key');
    if (savedClientId) setGoogleClientId(savedClientId);
    if (savedApiKey) setGoogleApiKey(savedApiKey);

    if (savedClientId && savedApiKey) {
        driveService.initGoogleDrive(savedClientId, savedApiKey, (success, error) => {
            setIsDriveReady(success);
            if (success) {
                // Auto Connect Attempt
                const autoConnected = driveService.tryAutoConnect();
                if (autoConnected) {
                    setIsDriveConnected(true);
                    handleSyncFromDrive();
                }
            } else if (error) {
                console.warn(error);
            }
        });
    }
  }, []);

  const handleConnectDrive = async () => {
     if (!isDriveReady) {
         // Attempt re-init if keys changed
         driveService.initGoogleDrive(googleClientId, googleApiKey, (success, error) => {
             setIsDriveReady(success);
             if (success) {
                 performLogin();
             } else {
                 alert("Không thể khởi tạo Google API: " + error);
             }
         });
     } else {
         performLogin();
     }
  };

  const performLogin = async () => {
    try {
        const success = await driveService.handleAuthClick();
        setIsDriveConnected(success);
        if (success) {
            handleSyncFromDrive();
        }
    } catch (e: any) {
        console.error(e);
        if (e.error === 'origin_mismatch') {
            alert("LỖI CẤU HÌNH (Origin Mismatch):\nHãy vào Google Cloud Console > Credentials > OAuth 2.0 Client ID.\nTại mục 'Authorized JavaScript origins', thêm link web này vào (không có dấu / ở cuối).");
        } else if (e.error === 'popup_closed_by_user') {
            // User closed popup, do nothing
        } else if (e.error === 'access_denied') {
             alert("TỪ CHỐI TRUY CẬP (Access Denied):\nCó thể bạn chưa thêm email vào danh sách 'Test Users' trên Google Cloud.\nHãy xem hướng dẫn trong phần Cài đặt.");
        } else {
            alert("Đăng nhập thất bại. Nếu thấy lỗi 'redirect_uri_mismatch' hoặc 'access_denied', hãy kiểm tra mục Cài đặt > Hướng dẫn sửa lỗi.");
        }
    }
  };

  const handleSyncFromDrive = async () => {
      setIsSyncing(true);
      const data = await driveService.loadDataFromDrive();
      if (data) {
          if (data.transactions) setTransactions(data.transactions);
          if (data.budgets) setBudgets(data.budgets);
      }
      setIsSyncing(false);
  };

  const saveToDrive = async (txs: Transaction[], bgs: Budget[]) => {
      if (isDriveConnected) {
          setIsSyncing(true);
          await driveService.syncDataToDrive(txs, bgs);
          setIsSyncing(false);
      }
  };

  // Handle saving (Add or Edit)
  const handleSaveTransaction = async (tx: Transaction, file?: File | null) => {
    let finalTx = { ...tx };

    // If there is a file and we are connected to Drive, upload it
    if (file && isDriveConnected) {
        setIsSyncing(true);
        try {
            const result = await driveService.uploadImageToDrive(file);
            finalTx.receiptUrl = result.webContentLink;
            finalTx.driveFileId = result.fileId;
        } catch (error) {
            console.error("Upload failed", error);
            alert("Không thể tải ảnh lên Drive. Giao dịch sẽ được lưu mà không có link ảnh.");
        }
        setIsSyncing(false);
    } else if (file && !isDriveConnected && !finalTx.receiptUrl) {
         // Fallback to blob if not connected (handled in uploader, but ensuring logic)
         // Note: Blob URLs expire, so this is temporary for session
    }

    let newTransactions;
    setTransactions(prev => {
      const exists = prev.find(t => t.id === finalTx.id);
      if (exists) {
        newTransactions = prev.map(t => t.id === finalTx.id ? finalTx : t);
      } else {
        newTransactions = [finalTx, ...prev];
      }
      // Trigger sync with new data
      saveToDrive(newTransactions, budgets);
      return newTransactions;
    });

    setShowUploaderModal(false);
    setEditingTransaction(null);
  };

  const handleEditClick = (tx: Transaction) => {
    // Instead of opening directly, we prompt for password
    setPendingEditTx(tx);
    setEditPasswordInput('');
    setEditAuthError(false);
    setShowEditSecurity(true);
  };

  const checkEditPassword = () => {
     if (editPasswordInput === 'Hoangduy1997') {
        setShowEditSecurity(false);
        setEditingTransaction(pendingEditTx);
        setPendingEditTx(null);
        setShowUploaderModal(true);
     } else {
        setEditAuthError(true);
     }
  };

  const handleOpenSettings = () => {
      setSettingsPasswordInput('');
      setSettingsAuthError(false);
      setShowSettingsSecurity(true);
  };

  const checkSettingsPassword = () => {
      if (settingsPasswordInput === 'Hoangduy1997') {
          setShowSettingsSecurity(false);
          setShowProjectModal(true);
      } else {
          setSettingsAuthError(true);
      }
  };

  const handleUpdateBudget = (category: string, amount: number) => {
    const newBudgets = budgets.map(b => b.category === category ? { ...b, amount } : b);
    setBudgets(newBudgets);
    saveToDrive(transactions, newBudgets);
  };

  const handleAddCategory = () => {
    if (newCategoryName && newCategoryAmount) {
       const newBudgets = [...budgets, { category: newCategoryName, amount: Number(newCategoryAmount) }];
       setBudgets(newBudgets);
       saveToDrive(transactions, newBudgets);
       setNewCategoryName('');
       setNewCategoryAmount('');
    }
  };

  const checkBudgetPassword = () => {
    if (passwordInput === 'Hoangduy1997') { 
       setIsAuthenticated(true);
       setAuthError(false);
    } else {
       setAuthError(true);
    }
  };

  const openBudgetModal = () => {
     setIsAuthenticated(false); // Reset auth on open
     setPasswordInput('');
     setAuthError(false);
     setShowBudgetModal(true);
  };

  const saveSettings = () => {
      // Save Project Name
      localStorage.setItem('project_name', projectName);
      // Save Transaction Password
      localStorage.setItem('transaction_password', transactionPwd);
      // Save Google Keys
      localStorage.setItem('google_client_id', googleClientId);
      localStorage.setItem('google_api_key', googleApiKey);

      driveService.initGoogleDrive(googleClientId, googleApiKey, (success, error) => {
          setIsDriveReady(success);
          if (success) {
             alert("Cấu hình hợp lệ! Hãy nhấn nút 'Kết nối Drive' trên thanh công cụ.");
             setShowProjectModal(false);
          } else {
             alert("Cấu hình không hợp lệ:\n" + error);
          }
      });
  };

  // Image Viewer Logic
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);

  useEffect(() => {
     if (viewingImage) {
         // Check if it's a blob or data (local) -> show immediately
         if (viewingImage.startsWith('blob:') || viewingImage.startsWith('data:')) {
             setDisplayImageUrl(viewingImage);
             setLoadingImage(false);
         } else {
             // Try to fetch from Drive
             setLoadingImage(true);
             driveService.fetchDriveImage(viewingImage).then((url) => {
                 setDisplayImageUrl(url || viewingImage); // Fallback to original if fetch fails
                 setLoadingImage(false);
             });
         }
     } else {
         setDisplayImageUrl(null);
     }
  }, [viewingImage]);

  // Generate Year Options (Current Year +/- 1)
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <ProjectNavbar currentView={currentView} setCurrentView={setCurrentView} projectName={projectName} />
      
      {/* Slicer / Filter Bar */}
      {(currentView === AppView.DASHBOARD || currentView === AppView.DATA_SHEET) && (
        <div className="bg-white border-b border-slate-200 px-4 py-3 shadow-sm sticky top-16 z-30">
           <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    <Filter className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase">Bộ lọc:</span>
                 </div>
                 
                 <select 
                   value={selectedMonth} 
                   onChange={(e) => setSelectedMonth(e.target.value)}
                   className="text-sm border-slate-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 border px-2 py-1 bg-white text-slate-900"
                 >
                   <option value="all">Cả năm</option>
                   {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                     <option key={m} value={m.toString()}>Tháng {m}</option>
                   ))}
                 </select>

                 <select 
                   value={selectedYear} 
                   onChange={(e) => setSelectedYear(e.target.value)}
                   className="text-sm border-slate-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 border px-2 py-1 bg-white text-slate-900"
                 >
                   {yearOptions.map(year => (
                     <option key={year} value={year.toString()}>{year}</option>
                   ))}
                 </select>
              </div>

              <div className="flex gap-2">
                 {/* Google Drive Status Button */}
                 <button
                    onClick={handleConnectDrive}
                    disabled={isSyncing}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${
                        isDriveConnected 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                 >
                    {isSyncing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isDriveConnected ? (
                        <CheckCircle2 className="w-4 h-4" />
                    ) : (
                        <Cloud className="w-4 h-4" />
                    )}
                    {isDriveConnected ? 'Đã kết nối Drive' : 'Kết nối Drive'}
                 </button>

                 <button 
                   onClick={handleOpenSettings}
                   className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-300"
                 >
                    <Settings className="w-4 h-4" />
                    Cài đặt
                 </button>
                 <button 
                   onClick={openBudgetModal}
                   className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-300"
                 >
                    <Building2 className="w-4 h-4" />
                    Định mức
                 </button>
                 <button 
                   onClick={() => {
                     setEditingTransaction(null);
                     setShowUploaderModal(true);
                   }}
                   className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-900 bg-yellow-400 hover:bg-yellow-500 rounded-lg transition-colors shadow-sm"
                 >
                    <Plus className="w-4 h-4" />
                    Thêm Thu/Chi
                 </button>
              </div>
           </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-12">
        {currentView === AppView.DASHBOARD && (
          <Dashboard 
            transactions={transactions} 
            budgets={budgets} 
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onViewImage={setViewingImage}
          />
        )}
        {currentView === AppView.DATA_SHEET && (
          <TransactionTable 
            transactions={transactions} 
            onViewImage={setViewingImage}
            onEdit={handleEditClick}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-slate-900 text-slate-500 py-3 text-center text-xs border-t border-slate-800">
          Created by Hoang Duy
      </footer>

      {/* Upload/Edit Modal */}
      {showUploaderModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
               <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-lg text-slate-800">
                    {editingTransaction ? 'Cập nhật Giao dịch' : 'Phiếu Nhập Liệu Mới'}
                  </h3>
                  <button onClick={() => setShowUploaderModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
               </div>
               <div className="flex-1 overflow-y-auto">
                  <ReceiptUploader 
                    onTransactionAdded={handleSaveTransaction} 
                    budgets={budgets}
                    initialData={editingTransaction}
                    requiredPassword={transactionPwd}
                  />
               </div>
            </div>
         </div>
      )}

      {/* Settings Security Modal */}
      {showSettingsSecurity && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
             <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                       <Lock className="w-5 h-5" />
                       Bảo Mật Cài Đặt
                    </h3>
                    <button onClick={() => setShowSettingsSecurity(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-slate-600 mb-4">Vui lòng nhập mật khẩu quản trị để thay đổi cấu hình dự án.</p>
                    <input 
                        type="password" 
                        value={settingsPasswordInput}
                        onChange={(e) => setSettingsPasswordInput(e.target.value)}
                        placeholder="Nhập mật khẩu..."
                        autoFocus
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onKeyDown={(e) => e.key === 'Enter' && checkSettingsPassword()}
                     />
                     {settingsAuthError && <p className="text-red-500 text-sm mb-4">Mật khẩu không đúng</p>}
                     <button 
                        onClick={checkSettingsPassword}
                        className="w-full bg-slate-800 text-white py-2 rounded-lg hover:bg-slate-900 transition-colors font-medium"
                     >
                        Xác Nhận
                     </button>
                </div>
             </div>
         </div>
      )}

      {/* Project Settings Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
               <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                     <Settings className="w-5 h-5 text-slate-600" />
                     Cài đặt Dự Án
                  </h3>
                  <button onClick={() => setShowProjectModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
               </div>
               <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tên dự án / Công trình</label>
                    <input 
                        type="text" 
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="VD: Mingfai Ph2 factory"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                        <KeyRound className="w-4 h-4 text-slate-500" />
                        Mật khẩu khi Thêm/Sửa
                     </label>
                     <input 
                         type="text" 
                         value={transactionPwd}
                         onChange={(e) => setTransactionPwd(e.target.value)}
                         placeholder="Nhập mật khẩu xác thực..."
                         className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     />
                     <p className="text-xs text-slate-500 mt-1">Mật khẩu này sẽ được yêu cầu khi thêm mới hoặc chỉnh sửa giao dịch.</p>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                              <Cloud className="w-4 h-4 text-blue-600" />
                              Cấu hình Google Drive
                          </h4>
                          <button 
                            onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                             <HelpCircle className="w-3 h-3" />
                             Hướng dẫn sửa lỗi
                          </button>
                      </div>

                      {showTroubleshoot && (
                          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mb-4 text-xs space-y-2">
                              <h5 className="font-bold text-amber-800 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Khắc phục lỗi Kết Nối
                              </h5>
                              <div className="space-y-1 text-amber-900">
                                  <p><b>Lỗi 1: Access blocked / redirect_uri_mismatch</b></p>
                                  <ul className="list-disc pl-4 space-y-1">
                                      <li>Vào <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="underline text-blue-600">Google Cloud Console &gt; Credentials</a></li>
                                      <li>Chọn <b>OAuth 2.0 Client ID</b> của bạn.</li>
                                      <li>Mục <b>Authorized JavaScript origins</b>: Thêm <code>https://qlcpmf.netlify.app</code> (Không có dấu / ở cuối).</li>
                                      <li>Mục <b>Authorized redirect URIs</b>: Thêm <code>https://qlcpmf.netlify.app</code></li>
                                      <li>Lưu và chờ 5 phút.</li>
                                  </ul>
                              </div>
                              <div className="border-t border-amber-200 pt-2 space-y-1 text-amber-900">
                                  <p><b>Lỗi 2: API_KEY_HTTP_REFERRER_BLOCKED</b></p>
                                  <ul className="list-disc pl-4 space-y-1">
                                      <li>Chọn <b>API Key</b> của bạn trong Credentials.</li>
                                      <li>Mục <b>Website restrictions</b>: Thêm <code>https://qlcpmf.netlify.app/*</code></li>
                                  </ul>
                              </div>
                              <div className="border-t border-amber-200 pt-2 space-y-1 text-amber-900">
                                  <p><b>Lỗi 3: Access blocked / App not verified</b></p>
                                  <ul className="list-disc pl-4 space-y-1">
                                      <li>Do ứng dụng đang ở chế độ <b>Testing</b>.</li>
                                      <li>Vào <b>OAuth Consent Screen</b> &gt; Mục <b>Test users</b>.</li>
                                      <li>Nhấn <b>Add Users</b> và thêm email Gmail của bạn vào danh sách.</li>
                                      <li>Lưu lại và thử đăng nhập lại.</li>
                                  </ul>
                              </div>
                              <div className="border-t border-amber-200 pt-2 space-y-1 text-amber-900">
                                  <p><b>Lỗi 4: Something went wrong (Màn hình đen)</b></p>
                                  <ul className="list-disc pl-4 space-y-1">
                                      <li>Đây là lỗi chung của Google. Thường do thiếu thông tin trong <b>OAuth Consent Screen</b>.</li>
                                      <li>Vào Google Cloud Console &gt; OAuth Consent Screen.</li>
                                      <li>Đảm bảo đã điền <b>User support email</b> và <b>Developer contact information</b>.</li>
                                      <li>Nhấn <b>Save and Continue</b> đến hết các bước.</li>
                                      <li>Thử lại bằng <b>Tab ẩn danh (Incognito)</b> để tránh lỗi cache trình duyệt.</li>
                                  </ul>
                              </div>
                          </div>
                      )}
                      
                      <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg mb-3">
                          <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-blue-700">
                                  Để kết nối hoạt động, bạn cần điền đúng <b>Client ID</b> và <b>API Key</b> từ Google Cloud Platform.
                              </p>
                          </div>
                      </div>

                      <label className="block text-sm font-medium text-slate-700 mb-1">Google Client ID</label>
                      <input 
                        type="text" 
                        value={googleClientId}
                        onChange={(e) => setGoogleClientId(e.target.value)}
                        placeholder="apps.googleusercontent.com"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg mb-2 focus:ring-blue-500"
                      />

                      <label className="block text-sm font-medium text-slate-700 mb-1">Google API Key</label>
                      <input 
                        type="password" 
                        value={googleApiKey}
                        onChange={(e) => setGoogleApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg mb-2 focus:ring-blue-500"
                      />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                     <button 
                        onClick={() => setShowProjectModal(false)}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                     >
                        Hủy
                     </button>
                     <button 
                        onClick={saveSettings}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                     >
                        <Save className="w-4 h-4" /> Lưu Cấu Hình
                     </button>
                  </div>
               </div>
            </div>
        </div>
      )}

      {/* Budget Modal with Password Protection */}
      {showBudgetModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
               <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-lg text-slate-800">Cấu hình Định Mức Chi Phí</h3>
                  <button onClick={() => setShowBudgetModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
               </div>
               
               {!isAuthenticated ? (
                  <div className="p-8 flex flex-col items-center">
                     <div className="bg-red-100 p-3 rounded-full mb-4">
                        <Lock className="w-6 h-6 text-red-600" />
                     </div>
                     <h4 className="text-slate-800 font-medium mb-4">Nhập mật khẩu quản trị</h4>
                     <input 
                        type="password" 
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Mật khẩu..."
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-2 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        onKeyDown={(e) => e.key === 'Enter' && checkBudgetPassword()}
                     />
                     {authError && <p className="text-red-500 text-sm mb-2">Mật khẩu không đúng</p>}
                     <button 
                        onClick={checkBudgetPassword}
                        className="w-full bg-slate-900 text-white py-2 rounded-lg hover:bg-slate-800 transition-colors"
                     >
                        Xác nhận
                     </button>
                  </div>
               ) : (
                  <>
                     <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        {budgets.map((budget) => (
                           <div key={budget.category}>
                              <label className="block text-sm font-medium text-slate-700 mb-1">{budget.category}</label>
                              <div className="relative">
                                 <input 
                                    type="number" 
                                    value={budget.amount}
                                    onChange={(e) => handleUpdateBudget(budget.category, Number(e.target.value))}
                                    className="w-full pl-3 pr-12 py-2 border border-slate-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 text-right font-mono"
                                 />
                                 <span className="absolute right-3 top-2 text-slate-400 text-sm">$</span>
                              </div>
                           </div>
                        ))}

                        {/* Add New Category */}
                        <div className="pt-4 mt-4 border-t border-slate-100">
                           <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                              <Plus className="w-4 h-4" /> Thêm hạng mục mới
                           </h4>
                           <div className="grid grid-cols-2 gap-2">
                              <input 
                                 type="text" 
                                 placeholder="Tên hạng mục"
                                 value={newCategoryName}
                                 onChange={(e) => setNewCategoryName(e.target.value)}
                                 className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                              />
                              <input 
                                 type="number" 
                                 placeholder="Định mức ($)"
                                 value={newCategoryAmount}
                                 onChange={(e) => setNewCategoryAmount(e.target.value)}
                                 className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                              />
                           </div>
                           <button 
                              onClick={handleAddCategory}
                              disabled={!newCategoryName || !newCategoryAmount}
                              className="mt-2 w-full bg-green-50 text-green-700 border border-green-200 py-2 rounded-md hover:bg-green-100 text-sm font-medium disabled:opacity-50"
                           >
                              Thêm Hạng Mục
                           </button>
                        </div>
                     </div>
                     <div className="p-4 border-t bg-slate-50 text-right">
                        <button 
                           onClick={() => setShowBudgetModal(false)}
                           className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                        >
                           Đóng
                        </button>
                     </div>
                  </>
               )}
            </div>
         </div>
      )}

      {/* Edit Security Modal */}
      {showEditSecurity && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
             <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="p-4 border-b bg-amber-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-amber-800 flex items-center gap-2">
                       <AlertTriangle className="w-5 h-5" />
                       Xác thực quyền sửa đổi
                    </h3>
                    <button onClick={() => setShowEditSecurity(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-slate-600 mb-4">Để tránh gian lận, vui lòng nhập mật khẩu quản trị để sửa giao dịch này.</p>
                    <input 
                        type="password" 
                        value={editPasswordInput}
                        onChange={(e) => setEditPasswordInput(e.target.value)}
                        placeholder="Mật khẩu..."
                        autoFocus
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        onKeyDown={(e) => e.key === 'Enter' && checkEditPassword()}
                     />
                     {editAuthError && <p className="text-red-500 text-sm mb-4">Mật khẩu không đúng</p>}
                     <button 
                        onClick={checkEditPassword}
                        className="w-full bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 transition-colors font-medium"
                     >
                        Mở Khóa Chỉnh Sửa
                     </button>
                </div>
             </div>
         </div>
      )}

      {/* Image Viewer */}
      {viewingImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setViewingImage(null)}>
          <div className="relative max-w-5xl max-h-full flex items-center justify-center">
            {loadingImage ? (
                <div className="text-white flex flex-col items-center">
                    <Loader2 className="w-10 h-10 animate-spin mb-2" />
                    <p>Đang tải ảnh từ Drive...</p>
                </div>
            ) : displayImageUrl ? (
                <img src={displayImageUrl} alt="Receipt" className="max-w-full max-h-[90vh] rounded-lg" />
            ) : (
                <div className="text-white flex flex-col items-center p-8 bg-slate-800 rounded-lg">
                    <AlertTriangle className="w-10 h-10 text-yellow-500 mb-2" />
                    <p>Không thể hiển thị ảnh.</p>
                    <p className="text-sm text-slate-400 mt-2">Link có thể bị hỏng hoặc bạn không có quyền truy cập.</p>
                </div>
            )}
            
            <button 
                onClick={() => setViewingImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300 font-bold bg-black/50 px-3 py-1 rounded-full"
            >
                Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
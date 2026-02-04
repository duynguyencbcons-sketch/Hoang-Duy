// Service to handle Google Drive Interactions

const FOLDER_NAME = 'QLCP';
const DATA_FILE_NAME = 'finance_data.json';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_STORAGE_KEY = 'google_access_token';
const EXPIRY_STORAGE_KEY = 'google_token_expiry';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;
let accessToken: string | null = null;

export const initGoogleDrive = (clientId: string, apiKey: string, onInitComplete: (success: boolean, error?: any) => void) => {
  if (!clientId || !apiKey) {
    onInitComplete(false, "Chưa nhập Client ID hoặc API Key");
    return;
  }

  const gapiLoaded = () => {
    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({
          apiKey: apiKey,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });
        gapiInited = true;
        checkInit();
      } catch (err: any) {
        console.error("GAPI Init Error:", err);
        const rawError = err.result?.error?.message || JSON.stringify(err);
        const errorString = JSON.stringify(err);
        
        let friendlyError = `Lỗi khởi tạo API Key: ${rawError}`;

        // Dịch lỗi phổ biến sang tiếng Việt
        if (rawError.includes("Google Drive API has not been used") || rawError.includes("is disabled")) {
            friendlyError = "LỖI CHƯA BẬT DỊCH VỤ (API NOT ENABLED):\nBạn chưa bật 'Google Drive API' trong Google Cloud Console.\n\nHướng dẫn: Vào mục 'Library' (Thư viện) trên Cloud Console > Tìm 'Google Drive API' > Nhấn nút 'ENABLE' (Bật).";
        } else if (rawError.includes("The request is missing a valid API key")) {
             friendlyError = "Lỗi: API Key không hợp lệ hoặc bị thiếu.";
        } else if (rawError.includes("Requests from referer") && rawError.includes("are blocked") || errorString.includes("API_KEY_HTTP_REFERRER_BLOCKED")) {
             friendlyError = "LỖI CHẶN TÊN MIỀN (REFERRER BLOCKED):\nAPI Key của bạn đang giới hạn trang web được phép truy cập nhưng thiếu trang này.\n\nHướng dẫn: Vào Google Cloud Console > Credentials > Chọn API Key > Mục 'Website restrictions' > Thêm dòng: 'https://qlcpmf.netlify.app/*' vào danh sách.\n(Lưu ý: Sau khi Lưu cần đợi 5 phút).";
        }

        onInitComplete(false, friendlyError);
      }
    });
  };

  const gisLoaded = () => {
    try {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
             console.error("Token Error:", tokenResponse);
             alert("Lỗi đăng nhập: " + tokenResponse.error);
             return;
          }
          accessToken = tokenResponse.access_token;
          
          // Save token to localStorage for auto-connect logic
          const expiresIn = (tokenResponse.expires_in || 3599) * 1000; // Convert seconds to ms
          const expiryTime = Date.now() + expiresIn;
          localStorage.setItem(TOKEN_STORAGE_KEY, accessToken || '');
          localStorage.setItem(EXPIRY_STORAGE_KEY, expiryTime.toString());
        },
      });
      gisInited = true;
      checkInit();
    } catch (err: any) {
       console.error("GIS Init Error:", err);
       onInitComplete(false, `Lỗi khởi tạo Client ID: ${err.message}`);
    }
  };

  const checkInit = () => {
    if (gapiInited && gisInited) {
      onInitComplete(true);
    }
  };

  if (window.gapi) gapiLoaded();
  else onInitComplete(false, "Không thể tải thư viện GAPI");

  if (window.google) gisLoaded();
  else onInitComplete(false, "Không thể tải thư viện Google Identity");
};

export const tryAutoConnect = (): boolean => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedExpiry = localStorage.getItem(EXPIRY_STORAGE_KEY);

    if (storedToken && storedExpiry) {
        const now = Date.now();
        // Check if token is still valid (give a 1-minute buffer)
        if (now < parseInt(storedExpiry) - 60000) {
            accessToken = storedToken;
            // Restore token to gapi client if it's initialized
            if (window.gapi && window.gapi.client) {
                window.gapi.client.setToken({ access_token: storedToken });
            }
            return true;
        } else {
            // Token expired, clear it
            handleSignOutClick(); 
        }
    }
    return false;
};

export const handleAuthClick = () => {
  return new Promise<boolean>((resolve, reject) => {
    if (!tokenClient) {
        reject("Chưa khởi tạo kết nối Google.");
        return;
    }
    
    // Override callback to capture success/fail for this specific click
    tokenClient.callback = async (resp: any) => {
      if (resp.error !== undefined) {
        console.error("Auth Error:", resp);
        reject(resp);
      }
      accessToken = resp.access_token;
      
      // Save token to localStorage
      const expiresIn = (resp.expires_in || 3599) * 1000; 
      const expiryTime = Date.now() + expiresIn;
      localStorage.setItem(TOKEN_STORAGE_KEY, accessToken || '');
      localStorage.setItem(EXPIRY_STORAGE_KEY, expiryTime.toString());

      resolve(true);
    };

    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
      tokenClient.requestAccessToken({prompt: ''});
    }
  });
};

export const handleSignOutClick = () => {
  const token = window.gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken('');
    accessToken = null;
  }
  // Clear storage
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(EXPIRY_STORAGE_KEY);
};

// Find or Create the Data Folder
const getFolderId = async (): Promise<string> => {
  const response = await window.gapi.client.drive.files.list({
    q: `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
  });

  if (response.result.files && response.result.files.length > 0) {
    return response.result.files[0].id;
  } else {
    // Create folder
    const fileMetadata = {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    };
    const createResponse = await window.gapi.client.drive.files.create({
      resource: fileMetadata,
      fields: 'id',
    });
    return createResponse.result.id;
  }
};

// Upload Image to Drive
export const uploadImageToDrive = async (file: File): Promise<{ webContentLink: string, fileId: string }> => {
  if (!accessToken) throw new Error("Chưa đăng nhập Google Drive");

  const folderId = await getFolderId();

  const metadata = {
    name: `receipt_${Date.now()}_${file.name}`,
    parents: [folderId],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webContentLink,webViewLink', {
    method: 'POST',
    headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
    body: form,
  });

  const data = await response.json();
  
  return { 
      webContentLink: data.webContentLink, 
      fileId: data.id 
  };
};

// Helper to fetch private drive image
export const fetchDriveImage = async (url: string): Promise<string | null> => {
    if (!accessToken) return null;

    // Check if url is a Drive URL
    if (!url.includes('drive.google.com')) return url;

    // Extract File ID
    // Support: https://drive.google.com/uc?id=... and https://drive.google.com/file/d/...
    let fileId = '';
    const matchId = url.match(/id=([^&]+)/);
    const matchD = url.match(/\/d\/([^/]+)/);

    if (matchId) fileId = matchId[1];
    else if (matchD) fileId = matchD[1];

    if (!fileId) return url;

    try {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { 'Authorization': 'Bearer ' + accessToken },
        });
        if (!response.ok) throw new Error("Failed to fetch image from Drive");
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error("Error fetching drive image:", e);
        return null; // Return null on error so UI can show placeholder or error
    }
};

// Sync Data JSON
export const syncDataToDrive = async (transactions: any[], budgets: any[]) => {
  if (!accessToken) return;

  try {
    const folderId = await getFolderId();
    
    // Check if file exists
    const listResponse = await window.gapi.client.drive.files.list({
      q: `name = '${DATA_FILE_NAME}' and '${folderId}' in parents and trashed = false`,
      fields: 'files(id)',
    });

    const fileContent = JSON.stringify({ transactions, budgets, lastUpdated: new Date().toISOString() });
    const blob = new Blob([fileContent], { type: 'application/json' });

    if (listResponse.result.files && listResponse.result.files.length > 0) {
      // Update existing file
      const fileId = listResponse.result.files[0].id;
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
          body: blob,
      });
    } else {
      // Create new file
      const metadata = {
          name: DATA_FILE_NAME,
          parents: [folderId],
      };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
          body: form,
      });
    }
  } catch (e) {
    console.error("Sync Error:", e);
  }
};

export const loadDataFromDrive = async (): Promise<{ transactions: any[], budgets: any[] } | null> => {
    if (!accessToken) return null;

    try {
        const folderId = await getFolderId();
        const listResponse = await window.gapi.client.drive.files.list({
            q: `name = '${DATA_FILE_NAME}' and '${folderId}' in parents and trashed = false`,
            fields: 'files(id)',
        });

        if (listResponse.result.files && listResponse.result.files.length > 0) {
            const fileId = listResponse.result.files[0].id;
            const response = await window.gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media',
            });
            return response.result;
        }
    } catch (e) {
        console.error("Error loading data from Drive", e);
    }
    return null;
};
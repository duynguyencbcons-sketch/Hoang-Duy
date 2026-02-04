// Service to handle Google Drive Interactions

const FOLDER_NAME = 'FinanceFlow_Data';
const DATA_FILE_NAME = 'finance_data.json';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;
let accessToken: string | null = null;

export const initGoogleDrive = (clientId: string, apiKey: string, onInitComplete: (success: boolean) => void) => {
  if (!clientId || !apiKey) {
    console.warn("Missing Google Client ID or API Key");
    onInitComplete(false);
    return;
  }

  const gapiLoaded = () => {
    window.gapi.load('client', async () => {
      await window.gapi.client.init({
        apiKey: apiKey,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      });
      gapiInited = true;
      checkInit();
    });
  };

  const gisLoaded = () => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (tokenResponse: any) => {
        accessToken = tokenResponse.access_token;
      },
    });
    gisInited = true;
    checkInit();
  };

  const checkInit = () => {
    if (gapiInited && gisInited) {
      onInitComplete(true);
    }
  };

  if (window.gapi) gapiLoaded();
  if (window.google) gisLoaded();
};

export const handleAuthClick = () => {
  return new Promise<boolean>((resolve) => {
    if (!tokenClient) {
        resolve(false);
        return;
    }
    
    tokenClient.callback = async (resp: any) => {
      if (resp.error !== undefined) {
        throw (resp);
      }
      accessToken = resp.access_token;
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
  if (!accessToken) throw new Error("Not authenticated");

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
  
  // Set permission to anyone with link (optional, depends on privacy needs, keeping it private to user by default)
  // If you want the image to be viewable in the app tag, it often needs to be proxy-fetched or public.
  // For this implementation, we will assume the user is viewing it while logged in or using the webContentLink.
  
  return { 
      webContentLink: data.webContentLink, // Use this for download/view
      fileId: data.id 
  };
};

// Sync Data JSON
export const syncDataToDrive = async (transactions: any[], budgets: any[]) => {
  if (!accessToken) return;

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

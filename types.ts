export type TransactionType = 'EXPENSE' | 'INCOME';

// ConstructionCategory is now just a string to support dynamic categories
export type ConstructionCategory = string;

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  merchant: string; // Người nhận / Nơi mua
  category: ConstructionCategory;
  amount: number;
  currency: string;
  description: string; // Mục đích sử dụng
  receiptUrl?: string;
  driveFileId?: string; // ID of the image on Google Drive
}

export interface Budget {
  category: string;
  amount: number;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',     // Sheet 1: Dashboard & Charts
  DATA_SHEET = 'DATA_SHEET',   // Sheet 2: Data Grid
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export type ImageResolution = '1K' | '2K' | '4K';

// Google API Types shim
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}
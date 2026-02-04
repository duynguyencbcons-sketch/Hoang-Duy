import React from 'react';
import { Transaction } from '../types';
import { FileSpreadsheet, Image as ImageIcon, ArrowDownCircle, ArrowUpCircle, Edit3, Download } from 'lucide-react';
import { utils, writeFile } from 'xlsx';

interface Props {
  transactions: Transaction[];
  onViewImage: (url: string) => void;
  onEdit: (tx: Transaction) => void;
  selectedMonth: string;
  selectedYear: string;
}

// Duplicate Color Logic to ensure consistency with Dashboard without refactoring into new file
const CATEGORY_COLORS: Record<string, string> = {
  'Vật tư': '#3b82f6', // Blue
  'Cơ giới': '#10b981', // Emerald/Green
  'Nhân công': '#f59e0b', // Amber/Orange
  'Chi phí công trường': '#ef4444', // Red
  'Chi phí khác': '#8b5cf6', // Violet
  'Thu từ ứng tiền': '#06b6d4', // Cyan
  'Thu thanh lý': '#84cc16', // Lime
  'Thu khác': '#64748b' // Slate
};
const DEFAULT_COLOR = '#94a3b8';

const TransactionTable: React.FC<Props> = ({ transactions, onViewImage, onEdit, selectedMonth, selectedYear }) => {
  
  // Filter Data
  const filteredTransactions = transactions.filter(t => {
    // t.date format is YYYY-MM-DD
    const parts = t.date.split('-');
    const year = parts[0];
    const month = parseInt(parts[1], 10).toString(); // remove leading zero

    const matchMonth = selectedMonth === 'all' || month === selectedMonth;
    const matchYear = selectedYear === 'all' || year === selectedYear;
    return matchMonth && matchYear;
  });

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBalance = totalIncome - totalExpense;

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const handleExportExcel = () => {
    // 1. Map data to friendly structure
    const dataToExport = filteredTransactions.map(tx => ({
      'Loại': tx.type === 'INCOME' ? 'Thu' : 'Chi',
      'Ngày': tx.date,
      'Đối tượng': tx.merchant,
      'Hạng mục': tx.category,
      'Diễn giải': tx.description,
      'Số tiền ($)': tx.amount,
      'Có Hóa đơn ảnh': tx.receiptUrl ? 'Có' : 'Không'
    }));

    // 2. Create worksheet
    const ws = utils.json_to_sheet(dataToExport);

    // 3. Auto-width for columns (rough estimate)
    const wscols = [
      { wch: 10 }, // Loai
      { wch: 15 }, // Ngay
      { wch: 25 }, // Doi tuong
      { wch: 20 }, // Hang muc
      { wch: 40 }, // Dien giai
      { wch: 15 }, // So tien
      { wch: 15 }, // Anh
    ];
    ws['!cols'] = wscols;

    // 4. Create workbook and append sheet
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Sổ Thu Chi");

    // 5. Generate file name
    const fileName = `So_Thu_Chi_${selectedMonth === 'all' ? 'CaNam' : 'Thang'+selectedMonth}_${selectedYear}.xlsx`;

    // 6. Download
    writeFile(wb, fileName);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-lg shadow border border-slate-200">
      {/* Header Summary */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Sổ Ghi Chép Thu Chi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
             Dữ liệu tháng {selectedMonth === 'all' ? 'Tất cả' : selectedMonth}/{selectedYear === 'all' ? 'Tất cả' : selectedYear}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4 text-sm items-center">
          <div className="flex gap-4">
            <div className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 hidden md:block">
              <span className="block text-xs text-emerald-600 font-semibold uppercase">Tổng Thu</span>
              <span className="font-mono font-bold text-lg">
                {formatCurrency(totalIncome)}
              </span>
            </div>
            <div className="bg-red-50 text-red-800 px-3 py-1.5 rounded-lg border border-red-200 hidden md:block">
              <span className="block text-xs text-red-600 font-semibold uppercase">Tổng Chi</span>
              <span className="font-mono font-bold text-lg">
                {formatCurrency(totalExpense)}
              </span>
            </div>
            <div className="bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 hidden md:block">
              <span className="block text-xs text-blue-600 font-semibold uppercase">Còn lại</span>
              <span className={`font-mono font-bold text-lg ${totalBalance < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                {formatCurrency(totalBalance)}
              </span>
            </div>
          </div>

          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
            title="Xuất dữ liệu ra file Excel"
          >
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 border-b border-slate-200 w-10">Loại</th>
              <th className="px-4 py-3 border-b border-slate-200">Ngày</th>
              <th className="px-4 py-3 border-b border-slate-200">Đối tượng (Người nhận)</th>
              <th className="px-4 py-3 border-b border-slate-200">Hạng mục</th>
              <th className="px-4 py-3 border-b border-slate-200">Mục đích / Diễn giải</th>
              <th className="px-4 py-3 border-b border-slate-200 text-right">Số Tiền</th>
              <th className="px-4 py-3 border-b border-slate-200 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">
                  Không có dữ liệu cho bộ lọc này.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3 text-center">
                    {tx.type === 'INCOME' ? (
                      <span title="Thu">
                        <ArrowDownCircle className="w-5 h-5 text-emerald-500 inline-block" />
                      </span>
                    ) : (
                      <span title="Chi">
                        <ArrowUpCircle className="w-5 h-5 text-red-500 inline-block" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{tx.date}</td>
                  {/* Updated Merchant styling to match Description */}
                  <td className="px-4 py-3 max-w-xs truncate text-slate-600" title={tx.merchant}>{tx.merchant}</td>
                  <td className="px-4 py-3">
                    <span 
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-transparent text-white"
                      style={{ backgroundColor: CATEGORY_COLORS[tx.category] || DEFAULT_COLOR }}
                    >
                      {tx.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate text-slate-600" title={tx.description}>{tx.description}</td>
                  <td className={`px-4 py-3 text-right font-mono font-medium ${
                    tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </td>
                  <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                     <button
                        onClick={() => onEdit(tx)}
                        className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                        title="Sửa giao dịch"
                     >
                        <Edit3 className="w-4 h-4" />
                     </button>
                    {tx.receiptUrl && (
                      <button 
                        onClick={() => onViewImage(tx.receiptUrl!)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors bg-white border border-slate-200 p-1 rounded hover:border-indigo-300"
                        title="Xem ảnh hóa đơn"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;
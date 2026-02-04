import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, Calendar, DollarSign, FileText, Tag, Image as ImageIcon, X, User, KeyRound } from 'lucide-react';
import { Transaction, TransactionType, ConstructionCategory, Budget } from '../types';

interface Props {
  onTransactionAdded: (tx: Transaction, file?: File | null) => void;
  budgets: Budget[]; // Passed to generate dropdown options
  initialData?: Transaction | null; // For editing
  requiredPassword?: string; // New prop for validation
}

const ReceiptUploader: React.FC<Props> = ({ onTransactionAdded, budgets, initialData, requiredPassword }) => {
  // Form States
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ConstructionCategory | string>(budgets[0]?.category || 'Vật tư');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [merchant, setMerchant] = useState(''); 
  const [password, setPassword] = useState(''); // State for input password
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when initialData changes (Edit Mode)
  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setDate(initialData.date);
      setCategory(initialData.category);
      setDescription(initialData.description);
      setAmount(initialData.amount.toString());
      setMerchant(initialData.merchant);
      if (initialData.receiptUrl) {
        setPreviewUrl(initialData.receiptUrl);
      }
    }
  }, [initialData]);

  // Update default category when switching types or loading
  useEffect(() => {
    if (!initialData) {
       if (type === 'EXPENSE') {
          setCategory(budgets[0]?.category || 'Vật tư');
       } else {
          setCategory('Thu từ ứng tiền');
       }
    }
  }, [type, budgets, initialData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !description || !date || !merchant) {
        alert("Vui lòng nhập đầy đủ thông tin bắt buộc!");
        return;
    }

    // Password Validation Logic
    if (requiredPassword && password !== requiredPassword) {
        alert("Mật khẩu xác thực không chính xác! Vui lòng nhập lại.");
        return;
    }

    const newTransaction: Transaction = {
      id: initialData ? initialData.id : Date.now().toString(),
      date: date, // YYYY-MM-DD
      type: type,
      category: category,
      merchant: merchant,
      amount: parseFloat(amount),
      currency: 'USD',
      description: description,
      receiptUrl: previewUrl || undefined
    };

    onTransactionAdded(newTransaction, selectedFile);

    if (!initialData) {
       // Reset Form only if adding new
       setDescription('');
       setAmount('');
       setMerchant('');
       setPassword(''); // Clear password
       removeFile();
    }
  };

  return (
    <div className="bg-slate-50 p-6 h-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 1. Loại chi phí (DropList) */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-500" />
                a. Loại giao dịch
            </label>
            <div className="grid grid-cols-2 gap-4">
                <button
                    type="button"
                    onClick={() => setType('EXPENSE')}
                    className={`py-3 px-4 rounded-lg border text-center font-medium transition-all ${
                        type === 'EXPENSE' 
                        ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    CHI (Expense)
                </button>
                <button
                    type="button"
                    onClick={() => setType('INCOME')}
                    className={`py-3 px-4 rounded-lg border text-center font-medium transition-all ${
                        type === 'INCOME' 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    THU (Income)
                </button>
            </div>
        </div>

        {/* 2. Hạng mục & Đối tượng */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Hạng mục chi tiết
                </label>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white text-slate-900"
                >
                    {type === 'EXPENSE' ? (
                        // Load dynamic budgets from App state
                        budgets.map(b => (
                           <option key={b.category} value={b.category}>{b.category}</option>
                        ))
                    ) : (
                        <>
                            <option value="Thu từ ứng tiền">Thu từ ứng tiền</option>
                            <option value="Thu thanh lý">Thu thanh lý</option>
                            <option value="Thu khác">Thu khác</option>
                        </>
                    )}
                </select>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-500" />
                    Đối tượng (Người nhận thanh toán)
                </label>
                <input
                    type="text"
                    required
                    placeholder="VD: Nhà cung cấp sắt thép A"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white text-slate-900 placeholder:text-slate-400"
                />
            </div>
        </div>

        {/* 3. Ngày & Số Tiền */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    b. Ngày (dd/mm/yyyy)
                </label>
                <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white text-slate-900"
                />
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-indigo-500" />
                    d. Số tiền ($)
                </label>
                <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="VD: 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-mono text-lg bg-white text-slate-900 placeholder:text-slate-400"
                />
            </div>
        </div>

        {/* 4. Mô tả */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                c. Mô tả chi tiết
            </label>
            <textarea
                required
                rows={3}
                placeholder="VD: Thanh toán tiền ăn trưa với chủ đầu tư..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none bg-white text-slate-900 placeholder:text-slate-400"
            />
        </div>

        {/* 5. Upload Ảnh */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-500" />
                e. Hóa đơn đính kèm
            </label>
            
            {!previewUrl ? (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors bg-white"
                >
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-sm text-slate-500">Nhấn để tải ảnh lên</span>
                </div>
            ) : (
                <div className="relative inline-block">
                    <img src={previewUrl} alt="Preview" className="h-40 rounded-lg border border-slate-200 object-cover bg-white" />
                    <button
                        type="button"
                        onClick={removeFile}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
            />
        </div>

        {/* Submit Button & Password Protection */}
        <div className="pt-2">
            <div className="mb-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-yellow-600" />
                    Xác nhận mật khẩu
                </label>
                <input
                    type="password"
                    required
                    placeholder="Nhập mật khẩu..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white text-slate-900"
                />
            </div>
            
            <button
                type="submit"
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold py-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-lg"
            >
                <Send className="w-5 h-5" />
                {initialData ? 'Cập Nhật Giao Dịch' : 'Lưu Giao Dịch'}
            </button>
        </div>

      </form>
    </div>
  );
};

export default ReceiptUploader;
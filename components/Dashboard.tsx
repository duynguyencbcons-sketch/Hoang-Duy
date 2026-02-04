import React from 'react';
import { Transaction, Budget } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList
} from 'recharts';
import { TrendingUp, TrendingDown, Image as ImageIcon, ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  budgets: Budget[];
  selectedMonth: string;
  selectedYear: string;
  onViewImage: (url: string) => void;
}

// 1. Define Standard Colors for Categories (WBS)
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

const DEFAULT_COLOR = '#94a3b8'; // Slate 400

const getCategoryColor = (category: string) => {
  return CATEGORY_COLORS[category] || DEFAULT_COLOR;
};

const Dashboard: React.FC<Props> = ({ transactions, budgets, selectedMonth, selectedYear, onViewImage }) => {
  
  // 1. Filter Transactions based on Slicer using safe string parsing
  const filteredData = transactions.filter(t => {
    // t.date format is YYYY-MM-DD
    const parts = t.date.split('-');
    const year = parts[0];
    const month = parseInt(parts[1], 10).toString(); // remove leading zero if any to match selectedMonth (1-12)

    const matchMonth = selectedMonth === 'all' || month === selectedMonth;
    const matchYear = selectedYear === 'all' || year === selectedYear;
    return matchMonth && matchYear;
  });

  const expenseData = filteredData.filter(t => t.type === 'EXPENSE');
  const incomeData = filteredData.filter(t => t.type === 'INCOME');

  const totalIncome = incomeData.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseData.reduce((sum, t) => sum + t.amount, 0);
  const totalBalance = totalIncome - totalExpense;

  // 2. Prepare Data for Pie Chart (Tỷ trọng định mức)
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const budgetPieData = budgets.map(b => ({ 
      name: b.category, 
      value: b.amount,
  }));

  // Custom Label for Pie Chart to show Value and %
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    // Only show if segment is big enough
    if (percent < 0.05) return null;

    // 'percent' from Recharts is a decimal (e.g. 0.2 for 20%)
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight="bold">
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percent = (data.value / totalBudget) * 100;
      return (
        <div className="bg-white p-2 border border-slate-200 shadow-md rounded text-sm">
          <p className="font-semibold text-slate-800" style={{ color: getCategoryColor(data.name) }}>{data.name}</p>
          <p className="text-slate-600">
             Giá trị: {formatCurrency(data.value)} ({percent.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // 3. Prepare Data for Bar Chart (Actual vs Budget)
  const actualExpenses = expenseData.reduce((acc, curr) => {
    const cat = curr.category;
    acc[cat] = (acc[cat] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const barChartData = budgets.map(b => {
    const spent = actualExpenses[b.category] || 0;
    const remaining = Math.max(0, b.amount - spent);
    const percent = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    
    return {
      category: b.category,
      budget: b.amount,
      spent: spent,
      remaining: remaining,
      isOverBudget: spent > b.amount,
      percent: percent.toFixed(1),
      fillColor: getCategoryColor(b.category) // Use the mapped color for the 'Spent' bar
    };
  });

  // 4. Top 10 lists (Sorted by Date Descending as requested)
  const topExpenses = [...expenseData]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);
    
  const topIncomes = [...incomeData]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="h-[calc(100vh-8rem)] overflow-y-auto pr-2 pb-10">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Tổng Thu</p>
                <h3 className="text-2xl font-mono font-bold text-emerald-700">{formatCurrency(totalIncome)}</h3>
            </div>
            <div className="bg-white p-2 rounded-full shadow-sm">
                <ArrowDownCircle className="w-8 h-8 text-emerald-500" />
            </div>
        </div>

        <div className="bg-red-50 border border-red-100 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Tổng Chi</p>
                <h3 className="text-2xl font-mono font-bold text-red-700">{formatCurrency(totalExpense)}</h3>
            </div>
            <div className="bg-white p-2 rounded-full shadow-sm">
                <ArrowUpCircle className="w-8 h-8 text-red-500" />
            </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Số dư còn lại</p>
                <h3 className={`text-2xl font-mono font-bold ${totalBalance < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                    {formatCurrency(totalBalance)}
                </h3>
            </div>
            <div className="bg-white p-2 rounded-full shadow-sm">
                <Wallet className="w-8 h-8 text-blue-500" />
            </div>
        </div>
      </div>

      {/* Top Row: Budget Status & Charts merged */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        
        {/* Chart 1: Budget Allocation (Pie) - Left Side */}
        <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-96 flex flex-col">
          <h3 className="font-semibold text-slate-800 mb-2 text-sm uppercase tracking-wider text-center">Cơ cấu Định mức</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={budgetPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={renderCustomizedLabel}
                  labelLine={false}
                >
                  {budgetPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    formatter={(value, entry: any) => {
                        const { payload } = entry;
                        return <span className="text-xs text-slate-600 font-medium">{value}</span>;
                    }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Actual vs Budget (Bar) - Right Side */}
        <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-96 flex flex-col">
          <h3 className="font-semibold text-slate-800 mb-2 text-sm uppercase tracking-wider text-center">Tiến độ giải ngân</h3>
          <div className="flex-1">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} layout="vertical" margin={{ top: 5, right: 50, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="category" type="category" width={110} tick={{fontSize: 11}} />
                  <Tooltip 
                    cursor={{fill: '#f1f5f9'}}
                    formatter={(value, name) => [formatCurrency(Number(value)), name === 'spent' ? 'Đã chi' : 'Còn lại']}
                  />
                  <Legend />
                  {/* Bar for SPENT - Use mapped category color */}
                  <Bar dataKey="spent" name="Đã chi" stackId="a" radius={[0, 0, 0, 0]} barSize={24}>
                     <LabelList 
                        dataKey="spent" 
                        position="insideLeft" 
                        fill="white" 
                        fontSize={10} 
                        formatter={(val: number) => val > 0 ? formatCurrency(val) : ''} 
                     />
                     {barChartData.map((entry, index) => (
                        <Cell key={`cell-spent-${index}`} fill={entry.fillColor} />
                     ))}
                  </Bar>
                  {/* Bar for REMAINING - Light Yellow (#fde047 is yellow-300) */}
                  <Bar dataKey="remaining" name="Còn lại" stackId="a" fill="#fde047" radius={[0, 4, 4, 0]} barSize={24}>
                     <LabelList 
                        dataKey="remaining" 
                        position="right" 
                        fill="#64748b" 
                        fontSize={10} 
                        formatter={(val: number) => val > 0 ? formatCurrency(val) : ''} 
                     />
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Middle Row: Top 10 Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Expenses */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-100 bg-red-50 flex items-center justify-between">
             <h3 className="font-bold text-red-800 flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                10 Khoản Chi Gần Nhất
             </h3>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 font-medium w-8">Loại</th>
                  <th className="px-3 py-2 font-medium">Ngày</th>
                  <th className="px-3 py-2 font-medium">Đối tượng</th>
                  <th className="px-3 py-2 font-medium">Hạng mục</th>
                  <th className="px-3 py-2 font-medium">Diễn giải</th>
                  <th className="px-3 py-2 font-medium text-right">Số tiền</th>
                  <th className="px-3 py-2 font-medium text-center">Ảnh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topExpenses.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 text-center">
                       <span title="Chi">
                          <ArrowUpCircle className="w-4 h-4 text-red-500 inline-block" />
                       </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500 whitespace-nowrap text-xs">{tx.date}</td>
                    {/* Updated styling for Merchant to match Description */}
                    <td className="px-3 py-3 text-slate-500 text-xs truncate max-w-[150px]" title={tx.merchant}>{tx.merchant}</td>
                    <td className="px-3 py-3">
                       <span 
                          className="px-2 py-0.5 rounded text-xs border border-white text-white whitespace-nowrap"
                          style={{ backgroundColor: getCategoryColor(tx.category) }}
                       >
                         {tx.category}
                       </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500 text-xs truncate max-w-[150px]" title={tx.description}>{tx.description}</td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-red-600 whitespace-nowrap">
                       -{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-3 py-3 text-center">
                        {tx.receiptUrl ? (
                            <button onClick={() => onViewImage(tx.receiptUrl!)} className="text-slate-400 hover:text-indigo-600">
                                <ImageIcon className="w-4 h-4 mx-auto" />
                            </button>
                        ) : <span className="text-slate-200">-</span>}
                    </td>
                  </tr>
                ))}
                {topExpenses.length === 0 && (
                   <tr><td colSpan={7} className="p-4 text-center text-slate-400">Không có dữ liệu</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Incomes */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-100 bg-emerald-50 flex items-center justify-between">
             <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                10 Khoản Thu Gần Nhất
             </h3>
          </div>
          <div className="overflow-auto flex-1">
             <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 font-medium w-8">Loại</th>
                  <th className="px-3 py-2 font-medium">Ngày</th>
                  <th className="px-3 py-2 font-medium">Đối tượng</th>
                  <th className="px-3 py-2 font-medium">Hạng mục</th>
                  <th className="px-3 py-2 font-medium">Diễn giải</th>
                  <th className="px-3 py-2 font-medium text-right">Số tiền</th>
                  <th className="px-3 py-2 font-medium text-center">Ảnh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topIncomes.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 text-center">
                       <span title="Thu">
                          <ArrowDownCircle className="w-4 h-4 text-emerald-500 inline-block" />
                       </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500 whitespace-nowrap text-xs">{tx.date}</td>
                    {/* Updated styling for Merchant to match Description */}
                    <td className="px-3 py-3 text-slate-500 text-xs truncate max-w-[150px]" title={tx.merchant}>{tx.merchant}</td>
                    <td className="px-3 py-3">
                       <span 
                          className="px-2 py-0.5 rounded text-xs border border-white text-white whitespace-nowrap"
                          style={{ backgroundColor: getCategoryColor(tx.category) }}
                       >
                         {tx.category}
                       </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500 text-xs truncate max-w-[150px]" title={tx.description}>{tx.description}</td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                       +{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-3 py-3 text-center">
                        {tx.receiptUrl ? (
                            <button onClick={() => onViewImage(tx.receiptUrl!)} className="text-slate-400 hover:text-indigo-600">
                                <ImageIcon className="w-4 h-4 mx-auto" />
                            </button>
                        ) : <span className="text-slate-200">-</span>}
                    </td>
                  </tr>
                ))}
                 {topIncomes.length === 0 && (
                   <tr><td colSpan={7} className="p-4 text-center text-slate-400">Không có dữ liệu</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
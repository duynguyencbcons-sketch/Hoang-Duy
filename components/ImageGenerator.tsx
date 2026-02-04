import React, { useState } from 'react';
import { Image as ImageIcon, Download, Loader2, Wand2, Settings2 } from 'lucide-react';
import { generateImage } from '../services/geminiService';
import { ImageResolution } from '../types';

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<ImageResolution>('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const base64Image = await generateImage(prompt, resolution);
      setGeneratedImage(base64Image);
    } catch (err) {
      setError("Không thể tạo ảnh. Vui lòng thử lại với mô tả khác.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] gap-6">
      {/* Control Panel */}
      <div className="w-full lg:w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-2">
            <Wand2 className="w-6 h-6 text-purple-600" />
            Tạo Ảnh AI
          </h2>
          <p className="text-slate-500 text-sm">
            Tạo hình ảnh trực quan cho mục tiêu tài chính, biểu đồ nghệ thuật hoặc hình minh họa hóa đơn.
          </p>
        </div>

        <div className="space-y-6 flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Mô tả hình ảnh (Prompt)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ví dụ: Một heo đất tiết kiệm màu vàng đang đứng trên đỉnh núi tiền..."
              className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none text-sm"
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Độ phân giải
             </label>
             <div className="grid grid-cols-3 gap-2">
                {(['1K', '2K', '4K'] as ImageResolution[]).map((res) => (
                   <button
                      key={res}
                      onClick={() => setResolution(res)}
                      className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                         resolution === res 
                         ? 'bg-purple-100 text-purple-700 border-2 border-purple-500' 
                         : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                   >
                      {res}
                   </button>
                ))}
             </div>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className={`w-full py-3 rounded-lg font-medium text-white shadow-md transition-all mt-6 flex items-center justify-center gap-2 ${
            isGenerating || !prompt.trim()
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 hover:shadow-lg'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang vẽ...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Tạo Hình Ảnh
            </>
          )}
        </button>
      </div>

      {/* Preview Panel */}
      <div className="w-full lg:w-2/3 bg-slate-900 rounded-xl shadow-inner flex items-center justify-center relative overflow-hidden group">
        {generatedImage ? (
          <>
            <img 
              src={generatedImage} 
              alt="Generated Result" 
              className="max-w-full max-h-full object-contain shadow-2xl"
            />
            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
               <a 
                 href={generatedImage} 
                 download={`finance-ai-${Date.now()}.png`}
                 className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-full font-medium shadow-lg hover:bg-slate-100"
               >
                 <Download className="w-4 h-4" />
                 Tải Xuống
               </a>
            </div>
          </>
        ) : (
          <div className="text-center text-slate-500">
            {error ? (
               <div className="text-red-400 p-4 border border-red-900/50 bg-red-900/20 rounded-lg max-w-md">
                  <p>{error}</p>
               </div>
            ) : (
               <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center">
                     <ImageIcon className="w-10 h-10 text-slate-600" />
                  </div>
                  <p>Hình ảnh được tạo sẽ xuất hiện ở đây</p>
               </div>
            )}
          </div>
        )}
        
        <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 backdrop-blur text-white text-xs rounded-full">
           Model: gemini-3-pro-image-preview
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;

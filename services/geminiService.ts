import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const processReceipt = async (
  imageBase64: string,
  mimeType: string,
  userCaption: string
): Promise<any> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType
            }
          },
          {
            text: `Bạn là trợ lý kiểm soát chi phí tại một công trình xây dựng (Construction Cost Controller). 
            Hãy phân tích hóa đơn/phiếu thu/phiếu chi này cùng với ghi chú: "${userCaption}".
            
            1. Xác định Loại giao dịch (type): 'EXPENSE' (Chi) hoặc 'INCOME' (Thu - ví dụ: ứng tiền, bán phế liệu).
            2. Xác định Danh mục (category) CHÍNH XÁC theo danh sách sau:
               - Nếu là CHI: 'Vật tư', 'Cơ giới', 'Nhân công', 'Chi phí công trường', 'Chi phí khác'.
               - Nếu là THU: 'Thu từ ứng tiền', 'Thu thanh lý', 'Thu khác'.
            3. Trích xuất Ngày, Số tiền, Người nhận/Nơi mua (merchant), Mục đích (description).
            
            Trả về JSON.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['EXPENSE', 'INCOME'] },
            merchant: { type: Type.STRING, description: "Người nhận tiền hoặc Đơn vị cung cấp" },
            date: { type: Type.STRING, description: "YYYY-MM-DD" },
            amount: { type: Type.NUMBER },
            currency: { type: Type.STRING, description: "VND, USD..." },
            category: { type: Type.STRING, description: "Phân loại chi phí xây dựng" },
            description: { type: Type.STRING, description: "Mục đích sử dụng chi tiết" }
          },
          required: ["merchant", "amount", "category", "type", "date"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error processing receipt:", error);
    throw error;
  }
};

export const chatWithBot = async (history: { role: string; parts: { text: string }[] }[], newMessage: string) => {
  try {
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      history: history,
      config: {
        systemInstruction: "Bạn là một chuyên gia quản lý dự án xây dựng và kiểm soát chi phí (QS). Bạn hỗ trợ người dùng phân tích dòng tiền dự án, cảnh báo vượt định mức vật tư, nhân công và tối ưu hóa chi phí công trường."
      }
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text;
  } catch (error) {
    console.error("Chat error:", error);
    throw error;
  }
};

export const generateImage = async (prompt: string, resolution: '1K' | '2K' | '4K') => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          imageSize: resolution,
          aspectRatio: "16:9"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Image gen error:", error);
    throw error;
  }
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

const fileToPart = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
};

const dataUrlToParts = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    return { mimeType: mimeMatch[1], data: arr[1] };
}

const dataUrlToPart = (dataUrl: string) => {
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
}

const handleApiResponse = (response: GenerateContentResponse): string => {
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Yêu cầu đã bị chặn. Lý do: ${blockReason}. ${blockReasonMessage || ''}`;
        throw new Error(errorMessage);
    }

    // Find the first image part in any candidate
    for (const candidate of response.candidates ?? []) {
        const imagePart = candidate.content?.parts?.find(part => part.inlineData);
        if (imagePart?.inlineData) {
            const { mimeType, data } = imagePart.inlineData;
            return `data:${mimeType};base64,${data}`;
        }
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Việc tạo ảnh đã dừng đột ngột. Lý do: ${finishReason}. Điều này thường liên quan đến cài đặt an toàn.`;
        throw new Error(errorMessage);
    }
    const textFeedback = response.text?.trim();
    const errorMessage = `Mô hình AI không trả về hình ảnh. ` + (textFeedback ? `Mô hình đã trả lời bằng văn bản: "${textFeedback}"` : "Điều này có thể xảy ra do bộ lọc an toàn hoặc nếu yêu cầu quá phức tạp. Vui lòng thử một hình ảnh khác.");
    throw new Error(errorMessage);
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const model = 'gemini-2.5-flash-image-preview';

export const generateModelImage = async (userImage: File): Promise<string> => {
    const userImagePart = await fileToPart(userImage);
    const prompt = "Bạn là một AI chuyên gia nhiếp ảnh thời trang. Hãy biến người trong ảnh này thành một bức ảnh người mẫu thời trang toàn thân phù hợp cho một trang web thương mại điện tử. Nền phải là phông nền studio sạch sẽ, trung tính (màu xám nhạt, #f0f0f0). Người mẫu nên có biểu cảm chuyên nghiệp, trung tính. Giữ nguyên danh tính, các đặc điểm độc đáo và dáng người của người đó, nhưng đặt họ trong một tư thế đứng người mẫu tiêu chuẩn, thoải mái. Ảnh cuối cùng phải chân thực. Chỉ trả về ảnh cuối cùng.";
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [userImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generateVirtualTryOnImage = async (modelImageUrl: string, garmentImage: File): Promise<string> => {
    const modelImagePart = dataUrlToPart(modelImageUrl);
    const garmentImagePart = await fileToPart(garmentImage);
    const prompt = `Bạn là một AI chuyên gia thử đồ ảo. Bạn sẽ được cung cấp một 'ảnh người mẫu' và một 'ảnh trang phục'. Nhiệm vụ của bạn là tạo ra một bức ảnh chân thực mới, trong đó người từ 'ảnh người mẫu' đang mặc trang phục từ 'ảnh trang phục'.

**Quy tắc quan trọng:**
1. **Thay thế hoàn toàn trang phục:** Bạn PHẢI loại bỏ và thay thế hoàn toàn món đồ mà người trong 'ảnh người mẫu' đang mặc bằng trang phục mới. Không có bộ phận nào của quần áo ban đầu (ví dụ: cổ áo, tay áo, họa tiết) được hiển thị trong ảnh cuối cùng.
2. **Giữ nguyên người mẫu:** Khuôn mặt, tóc, vóc dáng và tư thế của người trong 'ảnh người mẫu' PHẢI được giữ nguyên.
3. **Giữ nguyên nền:** Toàn bộ nền từ 'ảnh người mẫu' PHẢI được giữ nguyên một cách hoàn hảo.
4. **Áp dụng trang phục:** Mặc trang phục mới lên người một cách chân thực. Nó phải phù hợp với tư thế của họ với các nếp gấp, bóng và ánh sáng tự nhiên phù hợp với cảnh gốc.
5. **Đầu ra:** Chỉ trả về ảnh cuối cùng đã chỉnh sửa. Không bao gồm bất kỳ văn bản nào.`;
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [modelImagePart, garmentImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generatePoseVariation = async (tryOnImageUrl: string, poseInstruction: string): Promise<string> => {
    const tryOnImagePart = dataUrlToPart(tryOnImageUrl);
    const prompt = `Bạn là một AI chuyên gia nhiếp ảnh thời trang. Hãy lấy hình ảnh này và tái tạo nó từ một góc nhìn khác. Người, quần áo và phong cách nền phải giữ nguyên. Góc nhìn mới phải là: "${poseInstruction}". Chỉ trả về ảnh cuối cùng.`;
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [tryOnImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};
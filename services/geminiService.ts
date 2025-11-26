import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

const SYSTEM_INSTRUCTION = `
You are a compassionate, patient, and Socratic math tutor. 
Your goal is to help the student understand the material deeply, not just to provide the answer.

Follow these rules strictly:
1. **Analyze First**: When a user uploads an image of a math problem or asks a question, carefully analyze the mathematical concepts involved.
2. **Step-by-Step**: Do NOT solve the entire problem at once. Break it down.
3. **First Step Only**: Start by explaining ONLY the very first step or asking a guiding question to check the student's intuition.
4. **Wait for Confirmation**: Wait for the student to respond before moving to the next step.
5. **Handle "Why"**: If the student asks "Why?" or seems confused, stop and explain the underlying concept or theorem using simple analogies or detailed reasoning.
6. **Tone**: Be encouraging, warm, and supportive. Use phrases like "That's a great start!", "Let's look at this part together", or "It's tricky, but you're doing well."
7. **Formatting**: Use Markdown for clear formatting. Use LaTeX-style formatting for math equations where possible (e.g., x^2) but keep it readable.

Your thinking process should be thorough to ensure you identify the best pedagogical approach for the specific problem.
`;

let chatSession: Chat | null = null;
let genAI: GoogleGenAI | null = null;

export const initializeChat = async () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

  chatSession = genAI.chats.create({
    model: 'gemini-3-pro-preview', // Using the specified model for advanced reasoning
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: { 
        thinkingBudget: 32768 // Max thinking budget for deep reasoning
      }, 
    },
  });

  return chatSession;
};

export const sendMessageStream = async (
  messageText: string,
  imageBase64?: string
): Promise<AsyncIterable<GenerateContentResponse>> => {
  if (!chatSession) {
    await initializeChat();
  }

  if (!chatSession) {
    throw new Error("Failed to initialize chat session.");
  }

  let messagePayload: any = { message: messageText };

  // If there's an image, we need to construct the parts payload
  if (imageBase64) {
    // Remove data URL prefix if present for the API call, though inlineData usually handles standard base64 strings
    // The SDK expects raw base64 data usually, but let's parse the MIME type from the data URI
    const match = imageBase64.match(/^data:(.+);base64,(.+)$/);
    if (match) {
      const mimeType = match[1];
      const data = match[2];
      
      messagePayload = {
        message: [
          {
            inlineData: {
              mimeType: mimeType,
              data: data,
            },
          },
          {
            text: messageText || "Analyze this math problem and help me solve it step-by-step.",
          },
        ],
      };
    }
  }

  // Use sendMessageStream for a better user experience
  try {
    const responseStream = await chatSession.sendMessageStream(messagePayload);
    return responseStream;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    // If the session is invalid/expired (rare), we might need to recreate it, but for now just throw
    throw error;
  }
};

export const resetChat = () => {
  chatSession = null;
};

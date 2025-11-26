export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // Base64 data URI
  isThinking?: boolean;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

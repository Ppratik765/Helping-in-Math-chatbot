import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message } from './types';
import { sendMessageStream, initializeChat, resetChat } from './services/geminiService';
import ThinkingBubble from './components/ThinkingBubble';
import MessageItem from './components/MessageItem';
import { GenerateContentResponse } from '@google/genai';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize chat on mount
    initializeChat().catch(console.error);
    
    // Initial greeting
    setMessages([
      {
        id: 'init-1',
        role: 'model',
        text: "Hi! I'm your Socratic math tutor. I'm here to help you understand math deeply, step-by-step. Upload a photo of a problem or ask me a question to get started!",
      }
    ]);

    return () => {
      resetChat();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = useCallback(async () => {
    if ((!inputValue.trim() && !selectedImage) || isThinking) return;

    const currentText = inputValue;
    const currentImage = selectedImage;
    
    // Clear inputs immediately
    setInputValue('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Add user message
    const userMsgId = Date.now().toString();
    const newMessage: Message = {
      id: userMsgId,
      role: 'user',
      text: currentText,
      image: currentImage || undefined,
    };

    setMessages(prev => [...prev, newMessage]);
    setIsThinking(true);

    try {
      // Create a placeholder for the AI response
      const aiMsgId = (Date.now() + 1).toString();
      let accumulatedText = "";
      
      const stream = await sendMessageStream(currentText, currentImage || undefined);
      
      // We will add the message *after* the first chunk arrives or when we start processing
      // to ensure the "Thinking" state transitions smoothly to "Streaming" state.
      let messageAdded = false;

      for await (const chunk of stream) {
        // Explicit cast as per instructions to avoid TS errors accessing properties on unknown
        const c = chunk as GenerateContentResponse;
        const textChunk = c.text;
        
        if (textChunk) {
          accumulatedText += textChunk;
          
          setMessages(prev => {
            if (!messageAdded) {
              messageAdded = true;
              return [...prev, { id: aiMsgId, role: 'model', text: accumulatedText }];
            } else {
              // Update last message
              const newMessages = [...prev];
              const lastMsg = newMessages[newMessages.length - 1];
              if (lastMsg.id === aiMsgId) {
                lastMsg.text = accumulatedText;
              }
              return newMessages;
            }
          });
          // Once we have first token, we aren't "thinking" in the pre-computation sense anymore,
          // but we keep the loading state until done? 
          // Better UX: Turn off "ThinkingBubble" as soon as text starts appearing.
          setIsThinking(false); 
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        text: "I'm sorry, I encountered an error while thinking about that. Please try again." 
      }]);
    } finally {
      setIsThinking(false);
    }
  }, [inputValue, selectedImage, isThinking]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Header */}
      <header className="flex-none bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800 tracking-tight">Socratic Math Tutor</h1>
            <p className="text-xs text-slate-500 font-medium">Powered by Gemini 3.0 Pro</p>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="text-slate-400 hover:text-indigo-600 transition-colors"
          title="Reset Session"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
        <div className="max-w-3xl mx-auto">
          {messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} />
          ))}
          {isThinking && <ThinkingBubble />}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </main>

      {/* Input Area */}
      <footer className="flex-none bg-white border-t border-slate-200 p-4 pb-6 z-20">
        <div className="max-w-3xl mx-auto">
          {/* Image Preview */}
          {selectedImage && (
            <div className="mb-3 relative inline-block">
              <img src={selectedImage} alt="Preview" className="h-20 w-auto rounded-lg border border-slate-200 shadow-sm" />
              <button 
                onClick={clearImage}
                className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 shadow-md hover:bg-slate-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          <div className="flex items-end space-x-3 bg-slate-50 border border-slate-300 rounded-3xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
             <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors flex-shrink-0"
              title="Upload math problem"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden" 
            />
            
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question or upload a problem..."
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3.5 max-h-32 text-slate-700 placeholder-slate-400"
              rows={1}
              style={{ minHeight: '48px' }}
            />
            
            <button
              onClick={handleSend}
              disabled={(!inputValue.trim() && !selectedImage) || isThinking}
              className={`p-3 rounded-full flex-shrink-0 transition-all duration-200 ${
                (!inputValue.trim() && !selectedImage) || isThinking
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transform hover:scale-105'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
          <div className="text-center mt-2">
            <p className="text-[10px] text-slate-400">
              Gemini can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

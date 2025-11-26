import React from 'react';
import { Message } from '../types';
import ReactMarkdown from 'react-markdown'; // Assuming we can use simple rendering or I'll implement a basic text display if needed. 
// Since strict dependencies weren't limited to *no* external packages other than the ones listed (D3, Recharts), 
// but usually standard practice in these challenges is to avoid heavy npm installs if not specified.
// I will write a simple renderer using valid standard HTML to avoid import errors if `react-markdown` isn't available in the environment.
// Actually, I'll stick to a clean `whitespace-pre-wrap` div for now, or basic parsing.

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'} space-x-3`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-slate-800 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
          {isUser ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`rounded-2xl px-5 py-3.5 shadow-sm text-sm leading-relaxed ${
            isUser 
              ? 'bg-slate-800 text-white rounded-tr-none' 
              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
          }`}>
            {message.image && (
              <div className="mb-3 rounded-lg overflow-hidden border border-white/20">
                <img src={message.image} alt="User upload" className="max-w-full h-auto max-h-64 object-contain bg-black/10" />
              </div>
            )}
            <div className="markdown-body whitespace-pre-wrap font-sans">
              {message.text}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;

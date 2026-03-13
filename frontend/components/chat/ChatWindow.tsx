import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '@/lib/use-chat';
import { ChatBubble } from './ChatBubble';
import { useAuth } from '@/lib/auth-context';

interface ChatWindowProps {
  roomId: string;
  recipientName?: string;
  onClose?: () => void;
}

export function ChatWindow({ roomId, recipientName = 'Chat', onClose }: ChatWindowProps) {
  const { messages, isConnected, sendMessage } = useChat(roomId);
  const { isAuthenticated } = useAuth();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !isConnected) return;
    sendMessage(inputText);
    setInputText('');
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-[400px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
         <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Please Login</h3>
            {onClose && (
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
         </div>
         <div className="flex-1 flex items-center justify-center p-6 text-center text-gray-500">
           Please login to use the chat feature.
         </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[450px] sm:h-[500px] md:h-[600px] w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-gray-100 ring-1 ring-black/5">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-primary-600 to-primary-700 flex justify-between items-center shrink-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {recipientName.charAt(0).toUpperCase()}
            </div>
            {isConnected && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-primary-700 rounded-full"></span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-white tracking-wide">{recipientName}</h3>
            <p className="text-primary-100 text-xs font-medium">
              {isConnected ? 'Active now' : 'Connecting...'}
            </p>
          </div>
        </div>
        
        {onClose && (
          <button 
            onClick={onClose} 
            className="text-primary-100 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
            aria-label="Close chat"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
            <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">Send a message to start chatting</p>
          </div>
        ) : (
          messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 shrink-0">
        <form onSubmit={handleSend} className="flex relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-gray-50 text-gray-800 rounded-full pl-5 pr-12 py-3 border-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all outline-none"
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || !isConnected}
            className={`absolute right-1 top-1 bottom-1 w-10 flex items-center justify-center rounded-full transition-colors
              ${inputText.trim() && isConnected 
                ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-md shadow-primary-500/30' 
                : 'bg-transparent text-gray-400'
              }`}
          >
            <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

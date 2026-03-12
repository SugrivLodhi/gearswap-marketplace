import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ChatWindow } from './ChatWindow';

interface ChatButtonProps {
  productId: string;
  sellerId: string;
  productName: string;
}

export function ChatButton({ productId, sellerId, productName }: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isBuyer } = useAuth();

  // If not logged in, or if logged in but it's their own product (seller view), don't show the floating button
  // We only show it to buyers (or non-logged in users -> who will be asked to login inside the window)
  if (user && user.id === sellerId) return null;
  if (user && !isBuyer) return null;

  // The roomId convention from the backend implementation plan
  const roomId = `${productId}_${user?.id || 'guest'}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window Popup */}
      {isOpen && (
        <div className="mb-4 transform transition-all duration-300 origin-bottom-right">
          <ChatWindow 
            roomId={roomId} 
            recipientName={`Ask about ${productName}`}
            onClose={() => setIsOpen(false)} 
          />
        </div>
      )}

      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center justify-center w-14 h-14 bg-gradient-to-r from-primary-600 to-primary-500 rounded-full shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:-translate-y-1 transition-all duration-300 ring-4 ring-primary-50"
          aria-label="Open chat"
        >
          <svg 
            className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}
    </div>
  );
}

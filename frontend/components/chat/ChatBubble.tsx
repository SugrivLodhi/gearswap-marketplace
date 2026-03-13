import React from 'react';
import { ChatMessage } from '@/lib/use-chat';
import { useAuth } from '@/lib/auth-context';

export function ChatBubble({ message }: { message: ChatMessage }) {
  const { user } = useAuth();
  
  // Is this message sent by the current logged-in user?
  const isMine = user && message.senderId === user.id;

  // Format time (e.g., 10:42 AM)
  const timeStr = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex w-full mb-4 ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col max-w-[80%] ${isMine ? 'items-end' : 'items-start'}`}>
        
        {/* Role badge for the other person in group chats, though here it's strictly 1-on-1 */}
        {!isMine && (
          <span className="text-[10px] text-gray-400 capitalize mb-1 ml-1">
            {message.senderRole.toLowerCase()}
          </span>
        )}

        <div
          className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words
            ${isMine 
              ? 'bg-primary-600 text-white rounded-br-none' 
              : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none shadow-sm'
            }`}
        >
          {message.content}
        </div>

        <span className="text-[10px] text-gray-400 mt-1 mx-1">
          {timeStr}
        </span>
      </div>
    </div>
  );
}

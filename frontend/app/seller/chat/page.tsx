'use client';

import { useQuery } from '@apollo/client';
import { GET_CHAT_ROOMS } from '@/graphql/queries';
import { Navbar } from '@/components/Navbar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SellerChatInbox() {
  const { isSeller, isAuthenticated } = useAuth();
  const router = useRouter();
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const { data, loading, error } = useQuery(GET_CHAT_ROOMS, {
    skip: !isSeller,
    fetchPolicy: 'cache-and-network',
  });

  if (!isAuthenticated || !isSeller) {
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
    return null;
  }

  const rooms = data?.chatRooms || [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 border-b-2 border-primary-600 pb-1 inline-block">
            Customer Inquiries
          </h1>
          <Link 
            href="/seller/dashboard" 
            className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-1 min-h-[600px]">
          
          {/* Sidebar - Room List */}
          <div className="w-1/3 border-r border-gray-100 flex flex-col bg-gray-50/30">
            <div className="p-4 bg-white border-b border-gray-100 shrink-0">
              <h2 className="font-semibold text-gray-800">Active Conversations</h2>
              <p className="text-xs text-gray-500 mt-1">{rooms.length} room{rooms.length !== 1 ? 's' : ''}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-400">Loading conversations...</div>
              ) : error ? (
                <div className="p-8 text-center text-red-400">Error loading chats.</div>
              ) : rooms.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center h-full text-gray-400 space-y-3">
                   <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>No active conversations yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {rooms.map((roomId: string) => {
                    // Quick parse of "productId_buyerId"
                    const [productId, buyerId] = roomId.split('_');
                    const isActive = roomId === activeRoomId;
                    
                    return (
                      <li key={roomId}>
                        <button
                          onClick={() => setActiveRoomId(roomId)}
                          className={`w-full text-left p-4 hover:bg-white transition-colors flex items-center space-x-4
                            ${isActive ? 'bg-white border-l-4 border-l-primary-500 shadow-sm' : 'border-l-4 border-l-transparent'}`}
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-bold shrink-0">
                            P
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              Product inquiry
                            </p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              ID: {productId.substring(0, 8)}...
                            </p>
                          </div>
                          {isActive && (
                            <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0"></div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 bg-white flex flex-col h-full bg-[url('https://www.transparenttextures.com/patterns/tiny-grid.png')]">
            {activeRoomId ? (
              <div className="flex-1 w-full h-full flex flex-col [&>div]:max-w-none [&>div]:h-full [&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none">
                <ChatWindow 
                  roomId={activeRoomId} 
                  recipientName="Customer Inquiry"
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-700 mb-2">Select a conversation</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  Choose a chat from the left sidebar to view messages and reply to customers.
                </p>
              </div>
            )}
          </div>
          
        </div>
      </main>
    </div>
  );
}

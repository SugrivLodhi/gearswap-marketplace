import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000', {
      path: '/socket.io',
      auth: { token },
      autoConnect: false, // connect manually in components
    });
  }
  return socketInstance;
};

export const resetSocket = () => {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
    }
};

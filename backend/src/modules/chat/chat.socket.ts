import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import IORedis from 'ioredis';
import { env } from '../../config/environment';
import { authService } from '../auth/auth.service';
import { chatService } from './chat.service';

function makeRedisClient() {
    return new IORedis({
        host: env.redisHost,
        port: env.redisPort,
        password: env.redisPassword,
        retryStrategy: (times) => Math.min(times * 200, 10_000),
    });
}

export function initChatSocket(httpServer: HttpServer) {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: env.corsOrigin,
            methods: ['GET', 'POST'],
            credentials: true,
        },
        path: '/socket.io',
    });

    // -------------------------------------------------------------------------
    // Redis Pub/Sub adapter — scales across multiple backend instances
    // -------------------------------------------------------------------------
    const pubClient = makeRedisClient();
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));

    pubClient.on('error', (err) => console.error('❌ Chat Redis pub error:', err.message));
    subClient.on('error', (err) => console.error('❌ Chat Redis sub error:', err.message));

    // -------------------------------------------------------------------------
    // Auth middleware — validate JWT on every socket connection
    // -------------------------------------------------------------------------
    io.use((socket: Socket, next) => {
        const token = socket.handshake.auth?.token as string | undefined;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const payload = authService.verifyToken(token);
            (socket as any).user = {
               id: payload.userId,
               role: payload.role,
               email: payload.email
            };
            next();
        } catch {
            next(new Error('Invalid or expired token'));
        }
    });

    // -------------------------------------------------------------------------
    // Connection handler
    // -------------------------------------------------------------------------
    io.on('connection', (socket: Socket) => {
        const user = (socket as any).user as { id: string; role: string };
        console.log(`💬 Chat socket connected: user=${user.id} role=${user.role}`);

        /**
         * join_room — buyer or seller joins a chat room
         * payload: { roomId: string }  where roomId = "<productId>_<buyerId>"
         */
        socket.on('join_room', async ({ roomId }: { roomId: string }) => {
            if (!roomId || typeof roomId !== 'string') return;
            socket.join(roomId);
            console.log(`👤 Socket ${socket.id} joined room ${roomId}`);
        });

        /**
         * fetch_history — client requests persisted messages for a room
         * payload: { roomId: string }
         */
        socket.on('fetch_history', async ({ roomId }: { roomId: string }) => {
            if (!roomId) return;
            try {
                const messages = await chatService.getMessages(roomId);
                socket.emit('message_history', messages);
            } catch (err) {
                socket.emit('chat_error', { message: 'Failed to fetch history' });
            }
        });

        /**
         * send_message — save to MongoDB then broadcast to room via Redis Pub/Sub
         * payload: { roomId: string; content: string }
         */
        socket.on('send_message', async ({ roomId, content }: { roomId: string; content: string }) => {
            if (!roomId || !content || typeof content !== 'string') return;
            const trimmed = content.trim();
            if (!trimmed || trimmed.length > 2000) return;

            try {
                const saved = await chatService.saveMessage(
                    roomId,
                    user.id,
                    user.role as 'BUYER' | 'SELLER',
                    trimmed
                );

                io.to(roomId).emit('new_message', {
                    id: String(saved._id),
                    roomId: saved.roomId,
                    senderId: saved.senderId,
                    senderRole: saved.senderRole,
                    content: saved.content,
                    createdAt: saved.createdAt.toISOString(),
                });
            } catch (err) {
                socket.emit('chat_error', { message: 'Failed to send message' });
            }
        });

        socket.on('disconnect', () => {
            console.log(`💬 Chat socket disconnected: user=${user.id}`);
        });
    });

    console.log('💬 Chat socket server initialised');
    return io;
}

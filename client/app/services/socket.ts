import { io, Socket } from 'socket.io-client';

const wsUrl = process.env.NEXT_PUBLIC_SERVER_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:3001` : 'http://localhost:3001');
const customPath = wsUrl.includes('/shin') ? '/shin/socket.io' : '/socket.io';

export const socket: Socket = io(wsUrl, {
    path: customPath,
    autoConnect: false,
});

import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import { useConfig } from 'contexts/Config';

export const AssistantContext = createContext();

export const useAssistant = () => {
    const context = useContext(AssistantContext);
    if (!context) {
        throw new Error('useAssistant must be used within an AssistantProvider');
    }
    return context;
};

export const AssistantProvider = ({ children }) => {
    const [messages, setMessages] = useState([
        { from: 'assistant', text: 'Xin chào! Tôi có thể giúp gì cho bạn?' }
    ]);
    const config = useConfig();
    const loggedInUser = config?.me;
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const maxReconnectAttempts = 5;
    const reconnectAttemptsRef = useRef(0);
    const socket_request_type = {
        "chat": "awx-chat",
        "chat_token": "awx-chat-token",
        "chat_history": "conversation-history",
        "error": "error",
    }
    const [streamingMessage, setStreamingMessage] = useState(''); // Thêm state lưu nội dung assistant đang stream
    // console.log(loggedInUser);

    // Hàm kết nối WebSocket
    const connectWebSocket = () => {
        if (!loggedInUser?.id) return;

        // Detect protocol dựa trên current page (giống useWebsocket.js)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

        // Lấy base URL từ env variable
        let baseUrl = process.env.REACT_APP_ASSISTANT_SOCKET_URL || '/ws';

        // Xử lý URL: thêm protocol nếu chưa có, hoặc thay đổi protocol nếu có
        if (baseUrl.startsWith('ws://') || baseUrl.startsWith('wss://')) {
            // Nếu đã có protocol, thay đổi cho phù hợp với current page
            baseUrl = baseUrl.replace(/^wss?:\/\//, `${protocol}//`);
        } else if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
            // Nếu có http/https, convert sang ws/wss
            baseUrl = baseUrl.replace(/^https?:\/\//, `${protocol}//`);
        } else {
            // Nếu không có protocol (chỉ có host:port/path), thêm protocol
            // Trường hợp: "192.168.10.32:8000/ws" hoặc "/ws"
            if (baseUrl.startsWith('/')) {
                // Relative path: dùng current host
                let host = window.location.host;

                // Nếu truy cập qua IP:32000, đổi sang IP:8000 cho Assistant WebSocket
                // Vì Assistant server chạy riêng ở port 8000
                if (host.match(/^(\d+\.\d+\.\d+\.\d+):32000$/)) {
                    const ip = host.split(':')[0];
                    baseUrl = `${protocol}//${ip}:8000${baseUrl}`;
                } else {
                    // Truy cập qua domain (awx.infra.m-milu.com) → dùng relative path
                    // Nginx sẽ proxy tới port 8000
                    baseUrl = `${protocol}//${host}${baseUrl}`;
                }
            } else {
                // Có host:port: thêm protocol
                baseUrl = `${protocol}//${baseUrl}`;
            }
        }

        const wsUrl = `${baseUrl}/${loggedInUser.id}`;
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
            console.log('WebSocket connected at', wsUrl);
            reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
            wsRef.current.send(JSON.stringify({
                request_type: socket_request_type.chat_history,
                user_id: loggedInUser.id,
            }));
        };

        wsRef.current.onmessage = (event) => {
            try {
                const response = JSON.parse(event.data);
                if (response.request_type === socket_request_type.chat_token) {
                    console.log('response', response);

                    // Nhận từng ký tự/token, update message assistant đang typing
                    setStreamingMessage(prev => {
                        const newText = prev + response.content;
                        setMessages(prevMessages => {
                            // Nếu message cuối cùng là assistant đang typing (có flag isStreaming), update nó
                            if (
                                prevMessages.length > 0 &&
                                prevMessages[prevMessages.length - 1].from === 'assistant' &&
                                prevMessages[prevMessages.length - 1].isStreaming
                            ) {
                                const updated = [...prevMessages];
                                updated[updated.length - 1] = {
                                    ...updated[updated.length - 1],
                                    text: newText
                                };
                                return updated;
                            } else {
                                // Nếu chưa có message A, thêm mới
                                return [
                                    ...prevMessages,
                                    { from: 'assistant', text: newText, isStreaming: true }
                                ];
                            }
                        });
                        return newText;
                    });
                    return; // Không xử lý tiếp
                }
                if (response.request_type === socket_request_type.chat) {
                    // Nhận full message, replace message A
                    setStreamingMessage(''); // Reset
                    setMessages(prevMessages => {
                        // Nếu message cuối là assistant đang typing (isStreaming), replace nó
                        if (
                            prevMessages.length > 0 &&
                            prevMessages[prevMessages.length - 1].from === 'assistant' &&
                            prevMessages[prevMessages.length - 1].isStreaming
                        ) {
                            const updated = [...prevMessages];
                            updated[updated.length - 1] = {
                                from: 'assistant',
                                text: response.content.explanation
                            };
                            // Nếu có result, thêm tiếp
                            if (response.content.result) {
                                updated.push({ from: 'assistant', text: response.content.result });
                            }
                            return updated;
                        } else {
                            // Nếu không có message A, thêm mới như cũ
                            let updated = [
                                ...prevMessages,
                                { from: 'assistant', text: response.content.explanation }
                            ];
                            if (response.content.result) {
                                updated.push({ from: 'assistant', text: response.content.result });
                            }
                            return updated;
                        }
                    });
                    return; // Không xử lý tiếp
                }
                if (response.request_type === socket_request_type.chat_history) {
                    loadHistory(response.content);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        wsRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        wsRef.current.onclose = (event) => {
            console.log('WebSocket connection closed', event.code, event.reason);

            // Chỉ tự động kết nối lại nếu không phải là đóng có chủ ý (code 1000)
            if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
                const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Exponential backoff, max 30s
                console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

                reconnectTimeoutRef.current = setTimeout(() => {
                    reconnectAttemptsRef.current += 1;
                    connectWebSocket();
                }, delay);
            }
        };
    };

    // Kết nối WebSocket khi component mount
    useEffect(() => {
        if (loggedInUser?.id) {
            connectWebSocket();
        }

        // Đóng WebSocket khi component unmount
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close(1000); // Close with code 1000 to prevent auto-reconnect
            }
        };
    }, [loggedInUser?.id]);

    // Hàm gửi tin nhắn qua WebSocket
    const sendMessage = (input) => {
        if (input.trim() === '') return;

        // Thêm tin nhắn của user
        setMessages(prevMessages => [
            ...prevMessages,
            { from: 'user', text: input }
        ]);

        // Gửi tin nhắn qua WebSocket
        const payload = {
            user_id: loggedInUser.id,
            request_type: socket_request_type.chat,
            content: input
        };
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && loggedInUser) {
            wsRef.current.send(JSON.stringify(payload));
        } else {
            // Nếu socket chưa kết nối, thử kết nối lại và gửi tin nhắn
            connectWebSocket();
            setTimeout(() => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify(payload));
                } else {
                    console.log('Socket not ready, message will be sent when connection is established');
                    // Lưu tin nhắn để gửi khi kết nối thành công
                    const pendingMessage = payload;
                    const originalOnOpen = wsRef.current.onopen;
                    wsRef.current.onopen = () => {
                        if (originalOnOpen) originalOnOpen();
                        wsRef.current.send(JSON.stringify(pendingMessage));
                    };
                }
            }, 1000);
        }
    };

    const loadHistory = (history) => {
        const messages = history.map(item => {
            return { from: item.role, text: item.content }
        });
        setMessages(messages);
        // console.log('messages', messages);
    }

    return (
        <AssistantContext.Provider value={{ messages, setMessages, sendMessage }}>
            {children}
        </AssistantContext.Provider>
    );
}; 
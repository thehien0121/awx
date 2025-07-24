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
    // console.log(loggedInUser);

    // Hàm kết nối WebSocket
    const connectWebSocket = () => {
        if (!loggedInUser?.id) return;

        const baseUrl = process.env.REACT_APP_ASSISTANT_SOCKET_URL;
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
                if (response.request_type === socket_request_type.chat) {
                    console.log('socket response awx-chat', response);
                    setMessages(prevMessages => [
                        ...prevMessages,
                        { from: 'assistant', text: response.content.explanation }
                    ]);
                    if (response.content.result) {
                        setMessages(prevMessages => [
                            ...prevMessages,
                            { from: 'assistant', text: response.content.result }
                        ]);
                    }
                }
                if (response.request_type === socket_request_type.chat_token) {
                    console.log('socket response token', response);
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
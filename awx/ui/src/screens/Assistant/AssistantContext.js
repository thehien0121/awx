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
    const socket_request_type = {
        "chat": "awx-chat",
        "chat_token": "awx-chat-token",
        "chat_history": "conversation-history",
        "error": "error",
    }
    // console.log(loggedInUser);

    // Kết nối WebSocket khi component mount
    useEffect(() => {
        if (loggedInUser?.id) {
            const baseUrl = process.env.REACT_APP_ASSISTANT_SOCKET_URL;
            const wsUrl = `${baseUrl}/${loggedInUser.id}`;
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log('WebSocket connected at', wsUrl);
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

            wsRef.current.onclose = () => {
                console.log('WebSocket connection closed');
            };
        }

        // Đóng WebSocket khi component unmount
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
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
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && loggedInUser) {
            const payload = {
                user_id: loggedInUser.id,
                request_type: socket_request_type.chat,
                content: input
            };
            wsRef.current.send(JSON.stringify(payload));
        } else {
            console.error('WebSocket is not connected or user not logged in');
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
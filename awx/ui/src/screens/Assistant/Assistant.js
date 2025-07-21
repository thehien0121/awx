import React, { useRef, useEffect, useState } from 'react';
import { useAssistant } from './AssistantContext';
import { PageSection, Card } from '@patternfly/react-core';
import ScreenHeader from 'components/ScreenHeader/ScreenHeader';

const breadcrumbConfig = {
    '/assistant': 'Assistant',
};

const AssistantPage = () => {
    const { messages, sendMessage } = useAssistant();
    const [input, setInput] = useState('');
    const chatRef = useRef(null);

    const handleSend = () => {
        if (input.trim() === '') return;
        sendMessage(input);
        setInput('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <>
            <ScreenHeader streamType="none" breadcrumbConfig={breadcrumbConfig} />
            <Card style={{ height: '80vh', display: 'flex', flexDirection: 'column', padding: 1 }}>
                <div style={{ height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                    <div style={{ background: '#1976d2', color: '#fff', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>AWX Assistant</span>
                    </div>
                    <div ref={chatRef} style={{ flex: 1, padding: 24, overflowY: 'auto', background: '#f9f9f9' }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{ marginBottom: 12, textAlign: msg.from === 'user' ? 'right' : 'left' }}>
                                <span style={{
                                    display: 'inline-block',
                                    background: msg.from === 'user' ? '#1976d2' : '#e0e0e0',
                                    color: msg.from === 'user' ? '#fff' : '#333',
                                    borderRadius: 16,
                                    padding: '10px 18px',
                                    maxWidth: '80%',
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap'
                                }}>{msg.text}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ padding: 16, borderTop: '1px solid #eee', background: '#fafafa', display: 'flex' }}>
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Nhập tin nhắn... (Shift+Enter để xuống dòng)"
                            style={{
                                flex: 1,
                                border: '1px solid #ccc',
                                borderRadius: 16,
                                padding: '10px 14px',
                                outline: 'none',
                                marginRight: 10,
                                color: '#000',
                                resize: 'none',
                                minHeight: '40px',
                                maxHeight: '120px',
                                fontFamily: 'inherit',
                                fontSize: 'inherit'
                            }}
                            rows={input.split('\n').length > 3 ? 3 : input.split('\n').length}
                        />
                        <button onClick={handleSend} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 16, padding: '10px 20px', cursor: 'pointer' }}>Send</button>
                    </div>
                </div>
            </Card>
        </>
    );
};

export default AssistantPage; 
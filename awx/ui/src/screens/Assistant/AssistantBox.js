import React, { useState, useRef, useEffect } from 'react';
import { ExpandIcon, CloseIcon } from '@patternfly/react-icons';
import { useAssistant } from './AssistantContext';

const Assistant = ({ onClose }) => {
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
        <div style={{ width: 350, height: 500, background: '#fff', borderRadius: 8, boxShadow: '0 2px 16px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ background: '#1976d2', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>AWX Assistant</span>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => window.location.href = '/#/assistant'} title="Expand" style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', marginRight: 4 }}>
                        <ExpandIcon />
                    </button>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>
                        <CloseIcon />
                    </button>
                </div>
            </div>
            <div ref={chatRef} style={{ flex: 1, padding: 16, overflowY: 'auto', background: '#f9f9f9' }}>
                {messages.map((msg, idx) => (
                    <div key={idx} style={{ marginBottom: 10, textAlign: msg.from === 'user' ? 'right' : 'left' }}>
                        <span style={{
                            display: 'inline-block',
                            background: msg.from === 'user' ? '#1976d2' : '#e0e0e0',
                            color: msg.from === 'user' ? '#fff' : '#333',
                            borderRadius: 16,
                            padding: '8px 14px',
                            maxWidth: '80%',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap'
                        }}>{msg.text}</span>
                    </div>
                ))}
            </div>
            <div style={{ padding: 12, borderTop: '1px solid #eee', background: '#fafafa', display: 'flex' }}>
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nhập tin nhắn... (Shift+Enter để xuống dòng)"
                    style={{
                        flex: 1,
                        border: '1px solid #ccc',
                        borderRadius: 16,
                        padding: '8px 12px',
                        outline: 'none',
                        marginRight: 8,
                        color: '#000',
                        resize: 'none',
                        minHeight: '38px',
                        maxHeight: '100px',
                        fontFamily: 'inherit',
                        fontSize: 'inherit'
                    }}
                    rows={input.split('\n').length > 3 ? 3 : input.split('\n').length}
                />
                <button onClick={handleSend} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 16, padding: '8px 16px', cursor: 'pointer' }}>Send</button>
            </div>
        </div>
    );
};

export default Assistant; 
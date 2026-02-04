'use client';

import React, { useState, useRef, useEffect, KeyboardEvent, useCallback } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import { ERA_SUGGESTIONS } from '../lib/suggestions';

type Era = 'Anniversary' | 'Classic' | 'TBC' | 'WotLK' | 'Retail';

interface Message {
  id: string;
  role: 'user' | 'oracle';
  content: string;
  verificationStatus?: 'idle' | 'verifying' | 'verified' | 'error';
  verificationResult?: string;
}

interface SavedChat {
  id: string;
  title: string;
  era: Era;
  messages: Message[];
  timestamp: number;
}


const STORAGE_KEY = 'wow-oracle-chats';
const MAX_SAVED_CHATS = 10;

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedEra, setSelectedEra] = useState<Era>('Anniversary');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(false);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const [initialSuggestions, setInitialSuggestions] = useState<string[]>([]);

  const eras: Era[] = ['Anniversary', 'Classic', 'TBC', 'WotLK', 'Retail'];

  // Update theme when era changes
  useEffect(() => {
    document.body.setAttribute('data-theme', selectedEra);
  }, [selectedEra]);

  // Load saved chats from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSavedChats(JSON.parse(stored));
      } catch {
        console.error('Failed to load saved chats');
      }
    }
  }, []);

  // Get random suggestions for an era
  const getRandomSuggestions = useCallback((era: Era) => {
    const list = ERA_SUGGESTIONS[era] || ERA_SUGGESTIONS['Anniversary'];
    // Shuffle and pick 4
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
  }, []);

  // Update suggestions when era changes
  useEffect(() => {
    setInitialSuggestions(getRandomSuggestions(selectedEra));
  }, [selectedEra, getRandomSuggestions]);

  // Save current chat when messages change
  const saveCurrentChat = useCallback(() => {
    if (messages.length === 0) return;

    const firstUserMessage = messages.find(m => m.role === 'user');
    const title = firstUserMessage
      ? firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
      : 'New conversation';

    const chatId = currentChatId || Date.now().toString();

    const updatedChat: SavedChat = {
      id: chatId,
      title,
      era: selectedEra,
      messages,
      timestamp: Date.now(),
    };

    setSavedChats(prev => {
      const filtered = prev.filter(c => c.id !== chatId);
      const updated = [updatedChat, ...filtered].slice(0, MAX_SAVED_CHATS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (!currentChatId) {
      setCurrentChatId(chatId);
    }
  }, [messages, selectedEra, currentChatId]);

  useEffect(() => {
    if (messages.length > 0) {
      saveCurrentChat();
    }
  }, [messages, saveCurrentChat]);

  // Close history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (shouldScrollRef.current) {
      scrollToBottom();
      shouldScrollRef.current = false;
    }
  }, [messages]);

  // Refresh Wowhead tooltips when messages change
  // Refresh Wowhead tooltips when messages change
  useEffect(() => {
    // Immediate check
    const refresh = () => {
      if (typeof window !== 'undefined' && (window as unknown as { $WowheadPower?: { refreshLinks: () => void } }).$WowheadPower) {
        (window as unknown as { $WowheadPower: { refreshLinks: () => void } }).$WowheadPower.refreshLinks();
        console.log('Wowhead tooltips refreshed');
      }
    };

    // Staggered refresh to ensure script catches up
    const t1 = setTimeout(refresh, 100);
    const t2 = setTimeout(refresh, 500);
    const t3 = setTimeout(refresh, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    const updatedMessages = [...messages, userMessage];
    shouldScrollRef.current = true;
    setMessages(updatedMessages);
    setInput('');
    setSuggestedReplies([]);
    setIsTyping(true);
    setError(null);

    // Initial placeholder for streaming message
    const oracleMessageId = (Date.now() + 1).toString();
    const oracleMessage: Message = {
      id: oracleMessageId,
      role: 'oracle',
      content: '',
    };

    try {
      const history = updatedMessages.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          era: selectedEra,
          history: history.slice(0, -1),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get response');
      }

      const data = await response.json();
      const finalContent = data.message || 'The Oracle is silent.';
      const suggestions = data.suggestions || [];

      if (suggestions.length > 0) {
        console.log('Suggestions received from API:', suggestions);
        setSuggestedReplies(suggestions);
      }

      // Add the completed message
      setMessages(prev => [...prev, { ...oracleMessage, content: finalContent }]);

    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');

      // Remove the incomplete oracle message if it exists and is empty, or show error
      setMessages(prev => {
        // If we have content, keep it but maybe append error?
        // Simpler: Just append error message
        return [...prev, {
          id: (Date.now() + 2).toString(),
          role: 'oracle',
          content: '⚠️ The Oracle\'s connection was disrupted.',
        }];
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    textareaRef.current?.focus();
  };

  const startNewChat = () => {
    setMessages([]);
    setSuggestedReplies([]);
    setCurrentChatId(null);
    setShowHistory(false);
  };

  const handleEraSelect = (era: Era) => {
    if (selectedEra === era) return;

    // If we have an active conversation, switching eras starts a new one
    // This locks the previous conversation to its original era
    if (messages.length > 0) {
      startNewChat();
    }

    setSelectedEra(era);
  };

  const loadChat = (chat: SavedChat) => {
    shouldScrollRef.current = true;
    setMessages(chat.messages);
    setSuggestedReplies([]);
    setSelectedEra(chat.era);
    setCurrentChatId(chat.id);
    setShowHistory(false);
  };

  const deleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setSavedChats(prev => {
      const updated = prev.filter(c => c.id !== chatId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    if (currentChatId === chatId) {
      startNewChat();
    }
  };

  const handleVerify = async (messageId: string, content: string) => {
    // Set verifying status
    setMessages(prev => prev.map(msg =>
      msg.id === messageId
        ? { ...msg, verificationStatus: 'verifying' }
        : msg
    ));

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, era: selectedEra }),
      });

      if (!response.ok) throw new Error('Verification failed');
      const data = await response.json();

      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? {
            ...msg,
            verificationStatus: 'verified',
            verificationResult: data.verification
          }
          : msg
      ));
    } catch (err) {
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, verificationStatus: 'error' }
          : msg
      ));
    }
  };

  const formatTimestamp = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <>
      {/* Ambient Background */}
      <div className="ambient-bg">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
      </div>




      {/* App Layout */}
      <div className="app-layout">
        {/* Sidebar - visible on desktop */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1 className="oracle-title">Oracle</h1>
            <p className="oracle-subtitle">WoW Knowledge Base</p>
          </div>

          {/* Era Selector */}
          <div className="sidebar-section">
            <span className="sidebar-label">Select Era</span>
            <div className="era-selector-vertical">
              {eras.map((era) => (
                <button
                  key={era}
                  onClick={() => handleEraSelect(era)}
                  className={`era-btn-vertical ${selectedEra === era ? 'active' : ''}`}
                >
                  {era}
                </button>
              ))}
            </div>
          </div>

          {/* Chat History */}
          <div className="sidebar-section sidebar-history">
            <div className="sidebar-label-row">
              <span className="sidebar-label">Conversations</span>
              <button className="new-chat-btn-sm" onClick={startNewChat}>
                + New
              </button>
            </div>
            {savedChats.length === 0 ? (
              <div className="history-empty-sm">No saved chats</div>
            ) : (
              <div className="history-list-sidebar">
                {savedChats.map(chat => (
                  <div
                    key={chat.id}
                    className={`history-item-sm ${currentChatId === chat.id ? 'active' : ''}`}
                    data-era={chat.era}
                    onClick={() => loadChat(chat)}
                  >
                    <div className="history-item-content-sm">
                      <span className="history-era-sm">{chat.era}</span>
                      <span className="history-title-sm">{chat.title}</span>
                      <span className="history-time-sm">{formatTimestamp(chat.timestamp)}</span>
                    </div>
                    <button
                      className="history-delete-sm"
                      onClick={(e) => deleteChat(e, chat.id)}
                      aria-label="Delete"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Chat Container */}
        <div className="chat-container">
          {/* Mobile Header - hidden on desktop */}
          <header className="chat-header mobile-only">
            <div className="header-title">
              <h1 className="oracle-title">Oracle</h1>
              <p className="oracle-subtitle">World of Warcraft Knowledge Base</p>
            </div>



            {/* Era Selector Row */}
            <div className="era-row">
              <div className="era-selector">
                {eras.map((era) => (
                  <button
                    key={era}
                    onClick={() => handleEraSelect(era)}
                    className={`era-btn ${selectedEra === era ? 'active' : ''}`}
                  >
                    {era}
                  </button>
                ))}
              </div>

              {/* History Button */}
              <div className="history-container" ref={historyRef}>
                <button
                  className="history-btn"
                  onClick={() => setShowHistory(!showHistory)}
                  aria-label="Chat history"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {savedChats.length > 0 && (
                    <span className="history-badge">{savedChats.length}</span>
                  )}
                </button>

                {/* History Dropdown */}
                {showHistory && (
                  <div className="history-dropdown">
                    <div className="history-header">
                      <span>Recent Conversations</span>
                      <button className="new-chat-btn" onClick={startNewChat}>
                        + New
                      </button>
                    </div>
                    {savedChats.length === 0 ? (
                      <div className="history-empty">No saved conversations</div>
                    ) : (
                      <div className="history-list">
                        {savedChats.map(chat => (
                          <div
                            key={chat.id}
                            className={`history-item ${currentChatId === chat.id ? 'active' : ''}`}
                            data-era={chat.era}
                            onClick={() => loadChat(chat)}
                          >
                            <div className="history-item-content">
                              <span className="history-era">{chat.era}</span>
                              <span className="history-title">{chat.title}</span>
                              <span className="history-time">{formatTimestamp(chat.timestamp)}</span>
                            </div>
                            <button
                              className="history-delete"
                              onClick={(e) => deleteChat(e, chat.id)}
                              aria-label="Delete conversation"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Messages / Welcome */}
          {messages.length === 0 ? (
            <div className="welcome-container">
              <div className="welcome-icon">⚔️</div>
              <p className="welcome-text">
                Ask me anything about Azeroth.<br />
                Gear, quests, strategies?<br />
                Let's chat about it!
              </p>
              <div className="welcome-suggestions">
                {initialSuggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    className="suggestion-chip"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages-area">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${msg.role === 'user' ? 'message-user' : 'message-oracle'}`}
                >
                  {msg.role === 'oracle' ? (
                    <div className="markdown-content">
                      <ReactMarkdown
                        components={{
                          a: ({ href, children, ...props }: any) => {
                            return (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline cursor-pointer"
                                {...props}
                              >
                                {children}
                              </a>
                            );
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>

                      {/* Verification UI */}
                      <div className="verification-section">
                        {!msg.verificationStatus || msg.verificationStatus === 'idle' ? (
                          <button
                            className="verify-btn"
                            onClick={() => handleVerify(msg.id, msg.content)}
                          >
                            🛡️ Verify Accuracy
                          </button>
                        ) : msg.verificationStatus === 'verifying' ? (
                          <span className="verifying-status">Scanning scrolls... 🔮</span>
                        ) : msg.verificationStatus === 'error' ? (
                          <span className="error-status">Verification failed.</span>
                        ) : (
                          <div className="verification-result">
                            <div className="verification-header">🛡️ Oracle Verification Protocol</div>
                            <ReactMarkdown>{msg.verificationResult || ''}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="typing-indicator">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              )}
              {/* Spacer to push content up */}
              <div style={{ height: '20vh' }} />
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="error-toast">
              {error}
            </div>
          )}

          <div className="input-area">
            <div className="input-wrapper">
              <div className="input-content-col">
                {suggestedReplies.length > 0 && (
                  <div className="suggested-replies">
                    {suggestedReplies.map((reply, index) => (
                      <button
                        key={index}
                        className="suggestion-chip"
                        onClick={() => handleSuggestionClick(reply)}
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask the Oracle..."
                  className="chat-input"
                  rows={1}
                  spellCheck={false}
                />
              </div>
              <button
                className="send-btn"
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                aria-label="Send message"
              >
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>


    </>
  );
}

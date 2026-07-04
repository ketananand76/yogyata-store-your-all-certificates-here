import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api, { socketUrl, getFileUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import {
  Send, MessageSquare, Phone, Video, Loader2, Image,
  Search, Users, ArrowLeft, Plus, Check, CheckCheck,
  Smile, Mic, MoreVertical, Camera, File, X, Circle,
  PhoneIncoming, PhoneOutgoing, PhoneCall, Clock, Download, ArrowDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import CallModal from '../components/CallModal';

// Static Group Channels
const GROUP_CHANNELS = [
  { id: 'lounge', name: 'Developers Lounge', description: 'General lobby for software engineers and creators', emoji: '💻' },
  { id: 'employers', name: 'Employer Board', description: 'Recruitment notices, job alerts, and introductions', emoji: '💼' },
  { id: 'support', name: 'Tech Support', description: 'Technical questions and backend help', emoji: '🛠️' },
];

const EMOJI_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

// Format time like WhatsApp
const formatTime = (date) =>
  new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

// Format last seen / date label
const formatDate = (date) => {
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return formatTime(date);
  if (diff < 604800000) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export default function Chat() {
  const { user: currentUser, logout } = useAuth();
  const queryClient = useQueryClient();

  // Tab: 'chats' | 'status' | 'groups' | 'calls'
  const [activeTab, setActiveTab] = useState('chats');

  // Loud, distinct alert notification sound synthesizer
  const triggerAudioChime = (type = 'notification') => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (freq, duration, typeOsc = 'triangle', delay = 0, gainVal = 0.5) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = typeOsc;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
        gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime + delay);
        gainNode.gain.linearRampToValueAtTime(gainVal, audioCtx.currentTime + delay + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + duration);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + duration);
      };
      if (type === 'chat') {
        playTone(980, 0.12, 'sine', 0, 0.65);
        playTone(1170, 0.12, 'sine', 0.08, 0.65);
        playTone(1390, 0.16, 'sine', 0.16, 0.65);
      } else {
        playTone(880, 0.15, 'sawtooth', 0, 0.55);
        playTone(1760, 0.25, 'sawtooth', 0.12, 0.55);
      }
    } catch (err) {
      console.warn('Audio blocked:', err);
    }
  };
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Active conversation
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatType, setChatType] = useState('direct'); // 'direct' | 'group'

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Status viewer
  const [activeStatusUser, setActiveStatusUser] = useState(null);
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);

  // Calls
  const [callLogs, setCallLogs] = useState([]);
  const [callActive, setCallActive] = useState(false);
  const [callInfo, setCallInfo] = useState(null);

  const chatBottomRef = useRef(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedUserRef = useRef(null);
  const chatTypeRef = useRef('direct');
  const typingTimeoutRef = useRef(null);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const [activeMediaUrl, setActiveMediaUrl] = useState(null);
  const [mediaZoomed, setMediaZoomed] = useState(false);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
    chatTypeRef.current = chatType;
  }, [selectedUser, chatType]);

  // Load call logs
  useEffect(() => {
    const logs = JSON.parse(localStorage.getItem('yogyata_call_logs') || '[]');
    setCallLogs(logs);
  }, []);

  const addCallLog = (log) => {
    const logs = JSON.parse(localStorage.getItem('yogyata_call_logs') || '[]');
    const newLog = { id: Date.now(), name: log.name, type: log.type, direction: log.direction, timestamp: new Date().toISOString() };
    const updated = [newLog, ...logs];
    localStorage.setItem('yogyata_call_logs', JSON.stringify(updated));
    setCallLogs(updated);
  };

  // Fetch contacts
  const { data: contactsData, isLoading: loadingContacts } = useQuery({
    queryKey: ['chatContacts'],
    queryFn: async () => {
      const res = await api.get('/api/social/users');
      return res.data.users;
    },
  });

  // Fetch certificates for status
  const { data: statusCertificates } = useQuery({
    queryKey: ['statusCertificatesChat'],
    queryFn: async () => {
      const res = await api.get('/api/certificates');
      return res.data.certificates;
    },
  });

  // Fetch unread counts (shares key with Navbar to deduplicate network requests on mount)
  const { data: unreadCountsQueryData } = useQuery({
    queryKey: ['chatsUnreadNavbar'],
    queryFn: async () => {
      const res = await api.get('/api/messages/unread/counts');
      return res.data;
    },
    enabled: !!currentUser,
  });

  useEffect(() => {
    if (unreadCountsQueryData?.success && unreadCountsQueryData.counts) {
      setUnreadCounts(unreadCountsQueryData.counts);
    }
  }, [unreadCountsQueryData]);

  // Mark as read on select
  useEffect(() => {
    if (!selectedUser || chatType !== 'direct') return;
    const mark = async () => {
      try {
        await api.put(`/api/messages/${selectedUser._id}/read`);
        setUnreadCounts((prev) => ({ ...prev, [selectedUser._id]: 0 }));
      } catch {}
    };
    mark();
    setIsPeerTyping(false);
  }, [selectedUser, chatType]);

  // Auto-select from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userIdParam = params.get('user');
    if (userIdParam && contactsData) {
      const target = contactsData.find((c) => String(c._id) === String(userIdParam));
      if (target) {
        setActiveTab('chats');
        setChatType('direct');
        setSelectedUser(target);
        setShowMobileChat(true);
        window.history.replaceState(null, '', '/chat');
      }
    }
  }, [contactsData]);

  // Socket setup
  useEffect(() => {
    if (!currentUser) return;
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('register-user', currentUser._id);
    });

    newSocket.on('online-users', (userIds) => setOnlineUsers(userIds));

    newSocket.on('receive-message', (msg) => {
      const senderId = String(msg.sender?._id || msg.sender);
      const activePartner = selectedUserRef.current;
      const activeChatType = chatTypeRef.current;

      setLastMessages((prev) => ({
        ...prev,
        [senderId]: {
          content: msg.messageType === 'image' ? '📷 Photo' : msg.content,
          createdAt: msg.createdAt,
          isSelf: senderId === String(currentUser._id),
        },
      }));

      if (activeChatType === 'direct' && activePartner && String(activePartner._id) === senderId) {
        const wasAtBottom = isNearBottom();
        setMessages((prev) => [...prev, msg]);
        api.put(`/api/messages/${senderId}/read`).catch(() => {});
        if (wasAtBottom) {
          scrollToBottom('smooth');
        }
      } else if (senderId !== String(currentUser._id)) {
        setUnreadCounts((prev) => ({ ...prev, [senderId]: (prev[senderId] || 0) + 1 }));
        const senderContact = contactsData?.find((c) => String(c._id) === senderId);
        triggerAudioChime('chat');
        toast(`💬 New message from ${senderContact?.name || 'someone'}`, { duration: 3000 });
      } else {
        if (activeChatType === 'direct' && activePartner &&
          String(activePartner._id) === String(msg.recipient?._id || msg.recipient)) {
          setMessages((prev) => [...prev, msg]);
          scrollToBottom('smooth');
        }
      }
    });

    newSocket.on('receive-group-message', (groupMsg) => {
      const activePartner = selectedUserRef.current;
      const activeChatType = chatTypeRef.current;
      if (activeChatType === 'group' && activePartner && activePartner.id === groupMsg.groupId) {
        const wasAtBottom = isNearBottom();
        setMessages((prev) => [...prev, groupMsg]);
        if (wasAtBottom) {
          scrollToBottom('smooth');
        }
      }
    });

    newSocket.on('incoming-typing', ({ senderId, isTyping }) => {
      const activePartner = selectedUserRef.current;
      const activeChatType = chatTypeRef.current;
      if (activeChatType === 'direct' && activePartner && String(activePartner._id) === String(senderId)) {
        setIsPeerTyping(isTyping);
      }
    });

    newSocket.on('message-reaction-updated', ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (String(m._id) === String(messageId) ? { ...m, reactions } : m))
      );
    });

    newSocket.on('incoming-call', ({ callerId, callerName, signalData, type }) => {
      addCallLog({ name: callerName, type, direction: 'inbound' });
      setCallInfo({ callerId, callerName, recipientId: currentUser._id, type, signalData, direction: 'inbound' });
      setCallActive(true);
    });

    newSocket.on('blocked-user', ({ message }) => {
      toast.error(message, { duration: 8000 });
      logout().then(() => { window.location.href = '/login'; });
    });

    newSocket.on('messages-delivered', ({ recipientId }) => {
      const activePartner = selectedUserRef.current;
      if (activePartner && String(activePartner._id) === String(recipientId)) {
        setMessages((prev) =>
          prev.map((m) => {
            const isSentByMe = String(m.sender?._id || m.sender) === String(currentUser?._id);
            if (isSentByMe && String(m.recipient?._id || m.recipient) === String(recipientId)) {
              return { ...m, delivered: true };
            }
            return m;
          })
        );
      }
    });

    newSocket.on('messages-read', ({ recipientId }) => {
      const activePartner = selectedUserRef.current;
      if (activePartner && String(activePartner._id) === String(recipientId)) {
        setMessages((prev) =>
          prev.map((m) => {
            const isSentByMe = String(m.sender?._id || m.sender) === String(currentUser?._id);
            if (isSentByMe && String(m.recipient?._id || m.recipient) === String(recipientId)) {
              return { ...m, read: true, delivered: true };
            }
            return m;
          })
        );
      }
    });

    return () => newSocket.disconnect();
  }, [currentUser, contactsData]);

  // Fetch message history
  useEffect(() => {
    if (!selectedUser || chatType !== 'direct') return;
    const fetch = async () => {
      try {
        const res = await api.get(`/api/messages/${selectedUser._id}`);
        setMessages(res.data.messages);
        scrollToBottom('auto');
        const history = res.data.messages;
        if (history.length > 0) {
          const last = history[history.length - 1];
          setLastMessages((prev) => ({
            ...prev,
            [selectedUser._id]: {
              content: last.messageType === 'image' ? '📷 Photo' : last.content,
              createdAt: last.createdAt,
              isSelf: String(last.sender?._id || last.sender) === String(currentUser._id),
            },
          }));
        }
      } catch { toast.error('Failed to load messages'); }
    };
    fetch();
  }, [selectedUser, chatType]);

  // Join group socket room
  useEffect(() => {
    if (!selectedUser || chatType !== 'group' || !socket) return;
    setMessages([]);
    socket.emit('join-group', selectedUser.id);
  }, [selectedUser, chatType, socket]);

  const isNearBottom = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return true;
    return container.scrollHeight - container.scrollTop - container.clientHeight < 200;
  }, []);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    setTimeout(() => {
      if (chatBottomRef.current) {
        chatBottomRef.current.scrollIntoView({ behavior, block: 'end' });
      }
    }, 80);
  }, []);

  // Auto-scroll on message changes
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const isSelf = String(lastMsg.sender?._id || lastMsg.sender) === String(currentUser?._id);
      const isNewMessage = (Date.now() - new Date(lastMsg.createdAt).getTime()) < 6000;
      if (isNewMessage) {
        if (isSelf || isNearBottom()) {
          scrollToBottom('smooth');
        }
      } else {
        scrollToBottom('auto');
      }
    } else {
      scrollToBottom('auto');
    }
  }, [messages, scrollToBottom, isNearBottom, currentUser]);

  // Scroll to bottom when typing status changes
  useEffect(() => {
    if (isPeerTyping) {
      scrollToBottom('smooth');
    }
  }, [isPeerTyping, scrollToBottom]);

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 250;
    setShowScrollButton(!isAtBottom);
  };

  // Status auto-progress
  useEffect(() => {
    if (!activeStatusUser) return;
    const timer = setTimeout(() => {
      const next = activeStatusIndex + 1;
      if (next < activeStatusUser.certificates.length) {
        setActiveStatusIndex(next);
      } else {
        setActiveStatusUser(null);
        setActiveStatusIndex(0);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeStatusUser, activeStatusIndex]);

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (socket && selectedUser && chatType === 'direct') {
      socket.emit('typing', { senderId: currentUser._id, recipientId: selectedUser._id, isTyping: e.target.value.trim().length > 0 });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { senderId: currentUser._id, recipientId: selectedUser._id, isTyping: false });
      }, 2000);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !selectedUser) return;

    if (chatType === 'direct') {
      socket.emit('send-message', {
        senderId: currentUser._id,
        recipientId: selectedUser._id,
        content: newMessage.trim(),
        messageType: 'text',
      });
      socket.emit('typing', { senderId: currentUser._id, recipientId: selectedUser._id, isTyping: false });
    } else {
      socket.emit('send-group-message', {
        senderId: currentUser._id,
        senderName: currentUser.name,
        groupId: selectedUser.id,
        content: newMessage.trim(),
      });
    }
    setNewMessage('');
  };

  const handleImageSend = async (e) => {
    const file = e.target.files[0];
    if (!file || !socket || !selectedUser || chatType !== 'direct') return;
    const formData = new FormData();
    formData.append('file', file);
    setUploadingImage(true);
    try {
      const res = await api.post('/api/messages/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) {
        socket.emit('send-message', {
          senderId: currentUser._id,
          recipientId: selectedUser._id,
          content: '📷 Photo',
          messageType: 'image',
          fileUrl: res.data.fileUrl,
        });
      }
    } catch { toast.error('Image upload failed'); }
    finally { setUploadingImage(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleReaction = (messageId, emoji) => {
    if (!socket || chatType !== 'direct') return;
    socket.emit('react-message', { messageId, userId: currentUser._id, emoji });
    setShowReactionPicker(null);
  };

  const startCall = (callType) => {
    if (!selectedUser || chatType !== 'direct') return;
    addCallLog({ name: selectedUser.name, type: callType, direction: 'outbound' });
    setCallInfo({ callerId: currentUser._id, callerName: currentUser.name, recipientId: selectedUser._id, type: callType, direction: 'outbound' });
    setCallActive(true);
  };

  const isOnline = (userId) => onlineUsers.includes(userId);

  // Build status list
  const statusUpdates = statusCertificates?.filter((c) => c.uploadedBy && c.uploadedBy._id !== currentUser?._id) || [];
  const groupedStatuses = {};
  statusUpdates.forEach((cert) => {
    const cid = cert.uploadedBy._id;
    if (!groupedStatuses[cid]) groupedStatuses[cid] = { user: cert.uploadedBy, certificates: [] };
    groupedStatuses[cid].certificates.push(cert);
  });
  const statusList = Object.values(groupedStatuses);

  // Filter contacts by search
  const filteredContacts = contactsData?.filter((c) =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(contactSearch.toLowerCase())
  ) || [];

  const openDirectChat = (contact) => {
    setChatType('direct');
    setSelectedUser(contact);
    setShowMobileChat(true);
  };

  const openGroupChat = (group) => {
    setChatType('group');
    setSelectedUser(group);
    setShowMobileChat(true);
  };

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 h-[calc(100vh-72px)] flex flex-col relative z-10">
      {/* Ambient glow */}
      <div className="absolute top-0 left-[-5%] w-[30vw] h-[30vw] bg-purple-900/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 rounded-3xl overflow-hidden shadow-2xl border border-white/60 bg-white/45 backdrop-blur-2xl min-h-0">

        {/* ================================ */}
        {/* SIDEBAR (hidden on mobile when chat is open) */}
        {/* ================================ */}
        <div className={`md:col-span-4 border-r border-white/40 flex flex-col h-full bg-white/20 backdrop-blur-xl ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>

          {/* Sidebar Header */}
          <div className="px-4 py-4 flex items-center justify-between bg-white/30 border-b border-white/40">
            <div className="flex items-center gap-3">
              {currentUser?.profilePicture ? (
                <img src={getFileUrl(currentUser.profilePicture)} alt={currentUser.name}
                  className="w-9 h-9 rounded-full object-cover border-2 border-purple-500/30" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center font-bold text-white text-sm shadow-md">
                  {currentUser?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-sm font-bold text-slate-800 leading-tight">Sanchay Chat</h2>
                <p className="text-[9px] text-green-600 font-semibold">● Online</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex bg-white/30 border-b border-white/40">
            {[
              { key: 'chats', label: 'Chats', badge: totalUnread },
              { key: 'status', label: 'Status' },
              { key: 'groups', label: 'Groups' },
              { key: 'calls', label: 'Calls' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setShowMobileChat(false); }}
                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all relative ${
                  activeTab === tab.key ? 'border-green-500 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                {tab.badge > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-green-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search Bar (for chats tab) */}
          {activeTab === 'chats' && (
            <div className="px-3 py-2.5 bg-white/30 border-b border-white/40">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search or start new chat"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-xs pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-green-500/40 placeholder:text-gray-400 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">

            {/* 1. CHATS TAB */}
            {activeTab === 'chats' && (
              loadingContacts ? (
                <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-green-500" /></div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <MessageSquare className="h-8 w-8 text-gray-700 mx-auto mb-3" />
                  <p className="text-xs text-gray-600">{contactSearch ? 'No contacts found' : 'No chats yet'}</p>
                </div>
              ) : (
                filteredContacts.map((contact) => {
                  const unread = unreadCounts[contact._id] || 0;
                  const last = lastMessages[contact._id];
                  const active = chatType === 'direct' && selectedUser?._id === contact._id;

                  return (
                    <button
                      key={contact._id}
                      onClick={() => openDirectChat(contact)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-white/10 transition-all text-left hover:bg-white/30 ${
                        active ? 'bg-white/40' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {contact.profilePicture ? (
                          <img src={getFileUrl(contact.profilePicture)} alt={contact.name}
                            className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-violet-850 rounded-full flex items-center justify-center font-bold text-white text-base">
                            {contact.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {isOnline(contact._id) && (
                          <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-semibold truncate ${unread > 0 ? 'text-slate-900 font-bold' : 'text-slate-800'}`}>
                            {contact.name}
                          </span>
                          {last && (
                            <span className={`text-[10px] ml-2 shrink-0 ${unread > 0 ? 'text-green-600 font-bold' : 'text-slate-500'}`}>
                              {formatDate(last.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className={`text-[11px] truncate max-w-[170px] flex items-center gap-1 ${unread > 0 ? 'text-slate-950 font-semibold' : 'text-slate-500'}`}>
                            {last?.isSelf && (
                              last.read ? (
                                <CheckCheck className="h-3 w-3 text-sky-400 shrink-0" />
                              ) : last.delivered ? (
                                <CheckCheck className="h-3 w-3 text-slate-400 shrink-0" />
                              ) : (
                                <Check className="h-3 w-3 text-slate-400 shrink-0" />
                              )
                            )}
                            {last ? last.content : 'Tap to message'}
                          </p>
                          {unread > 0 && (
                            <span className="bg-green-500 text-white text-[9px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 ml-1 shrink-0">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )
            )}

            {/* 2. STATUS TAB */}
            {activeTab === 'status' && (
              <div>
                {/* My Status */}
                <div className="px-4 py-3 border-b border-slate-200">
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-2">My Status</p>
                  <button className="flex items-center gap-3 w-full hover:bg-slate-50 rounded-xl p-2 -mx-2 transition-colors">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-dashed border-green-500/40 flex items-center justify-center">
                        {currentUser?.profilePicture ? (
                          <img src={getFileUrl(currentUser.profilePicture)} className="w-full h-full rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-violet-850 rounded-full flex items-center justify-center font-bold text-white text-base">
                            {currentUser?.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                        <Plus className="h-2.5 w-2.5 text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">My Status</p>
                      <p className="text-[10px] text-gray-500">Add to my status</p>
                    </div>
                  </button>
                </div>

                {statusList.length > 0 && (
                  <div className="px-4 pt-3">
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-2">Recent Updates</p>
                  </div>
                )}

                {statusList.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <Circle className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                    <p className="text-xs text-slate-500">No recent status updates</p>
                  </div>
                ) : (
                  statusList.map((story) => (
                    <button
                      key={story.user._id}
                      onClick={() => { setActiveStatusUser(story); setActiveStatusIndex(0); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="relative shrink-0 p-0.5 rounded-full bg-gradient-to-tr from-green-400 to-emerald-600">
                        {story.user.profilePicture ? (
                          <img src={getFileUrl(story.user.profilePicture)} alt={story.user.name}
                            className="w-11 h-11 rounded-full object-cover border-2 border-white" />
                        ) : (
                          <div className="w-11 h-11 bg-gradient-to-br from-purple-650 to-violet-850 rounded-full flex items-center justify-center font-bold text-white text-base border-2 border-white">
                            {story.user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{story.user.name}</p>
                        <p className="text-[10px] text-slate-500">{story.certificates.length} certificate update{story.certificates.length > 1 ? 's' : ''}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* 3. GROUPS TAB */}
            {activeTab === 'groups' && (
              <div>
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Public Channels</p>
                </div>
                {GROUP_CHANNELS.map((group) => {
                  const active = chatType === 'group' && selectedUser?.id === group.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => openGroupChat(group)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 transition-all text-left hover:bg-slate-50 ${active ? 'bg-slate-100' : ''}`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-indigo-850 flex items-center justify-center text-xl shrink-0 border border-purple-200">
                        {group.emoji}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{group.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{group.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 4. CALLS TAB */}
            {activeTab === 'calls' && (
              callLogs.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <Phone className="h-8 w-8 text-slate-350 mx-auto mb-3" />
                  <p className="text-xs text-slate-550">No call history</p>
                </div>
              ) : (
                <div>
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[9px] text-slate-550 font-bold uppercase tracking-widest">Recent Calls</p>
                  </div>
                  {callLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        log.direction === 'inbound' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {log.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{log.name}</p>
                        <p className={`text-[10px] flex items-center gap-1 mt-0.5 ${log.direction === 'inbound' ? 'text-green-600' : 'text-red-650'}`}>
                          {log.direction === 'inbound' ? (
                            <PhoneIncoming className="h-3 w-3" />
                          ) : (
                            <PhoneOutgoing className="h-3 w-3" />
                          )}
                          {log.direction === 'inbound' ? 'Incoming' : 'Outgoing'} {log.type} call
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-slate-550">{formatDate(log.timestamp)}</p>
                        <div className={`mt-1 mx-auto w-fit p-1.5 rounded-full ${log.type === 'video' ? 'text-purple-600' : 'text-green-600'}`}>
                          {log.type === 'video' ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* ================================ */}
        {/* CHAT PANEL (hidden on mobile when no chat) */}
        {/* ================================ */}
        <div className={`md:col-span-8 flex flex-col h-full bg-white/10 backdrop-blur-xl relative ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>

          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-white/40 flex items-center justify-between bg-white/30 shadow-sm z-10">
                <div className="flex items-center gap-3">
                  {/* Mobile back button */}
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-1.5 -ml-1.5 mr-1 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  {chatType === 'direct' ? (
                    <Link to={`/profile/${selectedUser._id}`} className="relative shrink-0 group">
                      {selectedUser.profilePicture ? (
                        <img src={getFileUrl(selectedUser.profilePicture)} alt={selectedUser.name}
                          className="w-10 h-10 rounded-full object-cover group-hover:opacity-90 transition-opacity" />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-violet-850 rounded-full flex items-center justify-center font-bold text-white text-sm">
                          {selectedUser.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {isOnline(selectedUser._id) && (
                        <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </Link>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-850 flex items-center justify-center text-lg border border-purple-200 shrink-0">
                      {selectedUser.emoji}
                    </div>
                  )}

                  <div>
                    {chatType === 'direct' ? (
                      <Link to={`/profile/${selectedUser._id}`} className="text-sm font-bold text-slate-800 hover:text-green-600 transition-colors block">
                        {selectedUser.name}
                      </Link>
                    ) : (
                      <p className="text-sm font-bold text-slate-800">{selectedUser.name}</p>
                    )}
                    <p className="text-[10px] mt-0.5">
                      {chatType === 'direct' ? (
                        isPeerTyping ? (
                          <span className="text-green-600 font-semibold animate-pulse">typing...</span>
                        ) : isOnline(selectedUser._id) ? (
                          <span className="text-green-600">online</span>
                        ) : (
                          <span className="text-slate-500">offline</span>
                        )
                      ) : (
                        <span className="text-slate-500">Public channel</span>
                      )}
                    </p>
                  </div>
                </div>

                {chatType === 'direct' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startCall('video')}
                      className="p-2.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all"
                      title="Video call"
                    >
                      <Video className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => startCall('audio')}
                      className="p-2.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all"
                      title="Voice call"
                    >
                      <Phone className="h-5 w-5" />
                    </button>
                    <button className="p-2.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all">
                      <Search className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Messages Area */}
              <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-5 space-y-1 relative"
                style={{ background: "transparent" }}
                onClick={() => setShowReactionPicker(null)}
              >
                {messages.length === 0 ? (
                  <div className="text-center py-20 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mb-4">
                      <MessageSquare className="h-7 w-7 text-green-600/60" />
                    </div>
                    <p className="text-sm text-slate-500 font-medium">
                      {chatType === 'direct'
                        ? `Say hello to ${selectedUser.name}!`
                        : `Welcome to ${selectedUser.name}!`}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {chatType === 'direct' ? 'Double-tap a message to react ❤️' : 'This is a public channel'}
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, index) => {
                      const isSelf = String(msg.sender?._id || msg.sender) === String(currentUser?._id);
                      const prevMsg = messages[index - 1];
                      const prevIsSelf = prevMsg ? String(prevMsg.sender?._id || prevMsg.sender) === String(currentUser?._id) : null;
                      const showAvatar = !isSelf && prevIsSelf !== false;

                      return (
                        <div key={msg._id || index} className={`flex ${isSelf ? 'justify-end' : 'justify-start'} group/msg mb-1 animate-message-bubble`}>
                          {/* Avatar for received (group only or first in sequence) */}
                          {!isSelf && chatType === 'group' && (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-violet-850 flex items-center justify-center text-[10px] font-bold text-white mr-2 mt-auto mb-1 shrink-0">
                              {(msg.senderName || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          {!isSelf && chatType === 'direct' && <div className="w-7 mr-2 shrink-0" />}

                          <div className="relative max-w-[72%] sm:max-w-[60%]">
                            {/* Group sender name */}
                            {chatType === 'group' && !isSelf && (
                              <p className="text-[9px] text-purple-600 font-bold mb-1 ml-1">
                                {msg.senderName || 'User'}
                              </p>
                            )}

                            {/* Bubble */}
                            <div
                              onDoubleClick={() => chatType === 'direct' && handleReaction(msg._id, '❤️')}
                              className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed cursor-pointer select-none shadow-md ${
                                isSelf
                                  ? 'bg-gradient-to-tr from-purple-650 to-indigo-600 text-white rounded-br-sm border border-purple-500/35 shadow-purple-500/10'
                                  : 'bg-white/70 backdrop-blur-md text-slate-800 rounded-bl-sm border border-white/90 shadow-sm'
                              }`}
                            >
                              {/* Image message */}
                              {msg.messageType === 'image' ? (
                                <div className="max-w-[200px] overflow-hidden rounded-xl">
                                  <img
                                    src={getFileUrl(msg.fileUrl)}
                                    alt="Media"
                                    onLoad={() => scrollToBottom('smooth')}
                                    onClick={() => setActiveMediaUrl(msg.fileUrl)}
                                    className="w-full h-auto rounded-xl max-h-52 object-cover cursor-zoom-in hover:scale-105 transition-all duration-300"
                                  />
                                </div>
                              ) : (
                                <span className="break-words">{msg.content}</span>
                              )}

                              {/* Time + read receipt */}
                              <div className="flex items-center gap-1 mt-1 justify-end">
                                <span className={`text-[9px] font-mono ${isSelf ? 'text-white/75' : 'text-slate-500'}`}>{formatTime(msg.createdAt)}</span>
                                {isSelf && chatType === 'direct' && (
                                  msg.read ? (
                                    <CheckCheck className="h-3.5 w-3.5 text-amber-300 opacity-95 shrink-0" />
                                  ) : msg.delivered ? (
                                    <CheckCheck className="h-3.5 w-3.5 text-white/70 opacity-80 shrink-0" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5 text-white/70 opacity-80 shrink-0" />
                                  )
                                )}
                              </div>
                            </div>

                            {/* Reaction display */}
                            {chatType === 'direct' && msg.reactions && msg.reactions.length > 0 && (
                              <div className={`absolute -bottom-2.5 ${isSelf ? 'left-2' : 'right-2'} bg-white border border-slate-200 rounded-full px-1.5 py-0.5 flex gap-0.5 items-center shadow-lg text-[11px] z-10`}>
                                {Array.from(new Set(msg.reactions.map((r) => r.emoji))).map((emoji, idx) => (
                                  <span key={idx}>{emoji}</span>
                                ))}
                                {msg.reactions.length > 1 && (
                                  <span className="text-[8px] font-bold text-slate-500 ml-0.5">{msg.reactions.length}</span>
                                )}
                              </div>
                            )}

                            {/* Reaction picker on hover */}
                            {chatType === 'direct' && (
                              <div className={`absolute -top-9 ${isSelf ? 'right-0' : 'left-0'} opacity-0 scale-75 pointer-events-none group-hover/msg:opacity-100 group-hover/msg:scale-100 group-hover/msg:pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center bg-white/95 backdrop-blur-md border border-slate-200 rounded-full px-2.5 py-1.5 shadow-2xl z-20 gap-2`}>
                                {EMOJI_REACTIONS.map((emoji, emojiIdx) => (
                                  <button
                                    key={emoji}
                                    onClick={(e) => { e.stopPropagation(); handleReaction(msg._id, emoji); }}
                                    className="hover:scale-130 active:scale-95 transition-transform duration-200 text-sm filter hover:drop-shadow-lg"
                                    style={{ transitionDelay: `${emojiIdx * 25}ms` }}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Typing indicator */}
                    {chatType === 'direct' && isPeerTyping && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-slate-100 text-slate-500 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5 shadow-sm">
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input Bar */}
              <div className="px-3 py-3 border-t border-white/40 bg-white/30 backdrop-blur-md">
                <input type="file" ref={fileInputRef} onChange={handleImageSend} accept="image/*" className="hidden" />
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  {/* Attachment */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage || chatType !== 'direct'}
                    className="p-2.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all disabled:opacity-30 shrink-0"
                    title="Attach image"
                  >
                    {uploadingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                  </button>

                  {/* Text input */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={handleInputChange}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage(e)}
                      placeholder={chatType === 'direct' ? 'Type a message' : `Message ${selectedUser?.name}...`}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-sm px-4 py-2.5 rounded-full focus:outline-none focus:border-green-500/50 placeholder:text-slate-400 transition-colors"
                    />
                  </div>

                  {/* Send / Mic button */}
                  {newMessage.trim().length > 0 ? (
                    <button
                      type="submit"
                      className="w-10 h-10 bg-green-600 hover:bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 shrink-0"
                    >
                      <Send className="h-4.5 w-4.5 ml-0.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-10 h-10 bg-green-600/20 border border-green-600/30 text-green-500 rounded-full flex items-center justify-center transition-all hover:bg-green-600/30 shrink-0"
                    >
                      <Mic className="h-4.5 w-4.5" />
                    </button>
                  )}
                </form>
              </div>

              {/* Scroll to bottom button */}
              {showScrollButton && (
                <button
                  type="button"
                  onClick={() => scrollToBottom('smooth')}
                  className="absolute bottom-20 right-6 p-3 bg-green-600 hover:bg-green-500 text-white rounded-full shadow-2xl transition-all duration-200 z-30 hover:scale-110 flex items-center justify-center animate-float-up"
                  title="Scroll to bottom"
                >
                  <ArrowDown className="h-5 w-5" />
                </button>
              )}

              {/* Fullscreen Media Viewer */}
              {activeMediaUrl && (
                <div className="fixed inset-0 z-[250] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md transition-all-custom">
                  <div className="absolute top-4 right-4 flex gap-3 z-[260]">
                    <a
                      href={getFileUrl(activeMediaUrl)}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                      title="Download media"
                    >
                      <Download className="h-5 w-5" />
                    </a>
                    <button
                      onClick={() => { setActiveMediaUrl(null); setMediaZoomed(false); }}
                      className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div 
                    onClick={() => setMediaZoomed(!mediaZoomed)}
                    className="relative max-w-5xl max-h-[85vh] flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 shadow-2xl p-2 bg-[#111827]/40 animate-float-up cursor-zoom-in"
                  >
                    <img
                      src={getFileUrl(activeMediaUrl)}
                      alt="Zoomed Media"
                      className={`max-w-full max-h-[80vh] object-contain rounded-xl transition-transform duration-300 ease-out ${mediaZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100'}`}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10">
              <div className="relative mb-8">
                <div className="w-28 h-28 rounded-full bg-purple-600/10 border-2 border-purple-500/20 flex items-center justify-center">
                  <MessageSquare className="h-12 w-12 text-purple-600/60" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-purple-600/20 border border-purple-600/30 rounded-full flex items-center justify-center">
                  <Phone className="h-5 w-5 text-purple-500/60" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Yogyata Chat</h3>
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed mb-6">
                Send and receive messages, share certificates, make calls — all end-to-end encrypted.
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: '🔒', label: 'End-to-end\nencrypted' },
                  { icon: '📷', label: 'Share\nPhotos' },
                  { icon: '📞', label: 'Voice &\nVideo Calls' },
                ].map((f, i) => (
                  <div key={i} className="bg-white/3 border border-white/5 rounded-xl p-3">
                    <div className="text-2xl mb-1">{f.icon}</div>
                    <p className="text-[9px] text-gray-500 font-semibold uppercase tracking-wide whitespace-pre-line">{f.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* WebRTC Call Modal */}
      {callActive && socket && (
        <CallModal
          socket={socket}
          callInfo={callInfo}
          onClose={() => { setCallActive(false); setCallInfo(null); }}
        />
      )}

      {/* ================================ */}
      {/* STATUS VIEWER OVERLAY           */}
      {/* ================================ */}
      {activeStatusUser && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-[#111827] rounded-3xl overflow-hidden border border-white/10 flex flex-col h-[88vh] shadow-2xl">

            {/* Progress bars */}
            <div className="absolute top-3 left-3 right-3 flex gap-1 z-30">
              {activeStatusUser.certificates.map((_, idx) => (
                <div key={idx} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
                  <div className={`h-full bg-white transition-all ${
                    idx < activeStatusIndex ? 'w-full' : idx === activeStatusIndex ? 'animate-status-progress w-full' : 'w-0'
                  }`} />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="p-4 pt-8 flex items-center justify-between relative z-20">
              <div className="flex items-center gap-2.5">
                {activeStatusUser.user.profilePicture ? (
                  <img src={getFileUrl(activeStatusUser.user.profilePicture)} alt=""
                    className="w-8 h-8 rounded-full object-cover border border-white/20" />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-700 to-violet-900 rounded-full flex items-center justify-center font-bold text-xs text-white">
                    {activeStatusUser.user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-white">{activeStatusUser.user.name}</p>
                  <p className="text-[9px] text-gray-400">{activeStatusIndex + 1}/{activeStatusUser.certificates.length}</p>
                </div>
              </div>
              <button
                onClick={() => { setActiveStatusUser(null); setActiveStatusIndex(0); }}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Story content */}
            <div className="flex-1 flex items-center justify-center bg-black relative">
              {activeStatusUser.certificates[activeStatusIndex].fileType === 'pdf' ? (
                <div className="flex flex-col items-center gap-3 text-purple-400/60 p-8">
                  <File className="h-14 w-14" />
                  <span className="text-xs font-bold uppercase tracking-wider">PDF Certificate</span>
                  <Link
                    to={`/certificates/${activeStatusUser.certificates[activeStatusIndex]._id}`}
                    onClick={() => setActiveStatusUser(null)}
                    className="mt-4 px-5 py-2 bg-green-600 text-white text-xs font-bold rounded-full hover:bg-green-500 transition-all"
                  >
                    View Document →
                  </Link>
                </div>
              ) : (
                <img
                  src={getFileUrl(activeStatusUser.certificates[activeStatusIndex].fileUrl)}
                  alt="Status"
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-[#0d1117]">
              <p className="font-bold text-white text-sm">{activeStatusUser.certificates[activeStatusIndex].title}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{activeStatusUser.certificates[activeStatusIndex].issuer}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

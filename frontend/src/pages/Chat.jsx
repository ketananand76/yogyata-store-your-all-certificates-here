import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api, { socketUrl, getFileUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { 
  Send, MessageSquare, Phone, Video, Loader2, Image, Heart, 
  Smile, ThumbsUp, Plus, Check, CheckCheck, Users, CircleDot, 
  Clock, ExternalLink, ArrowLeft, PhoneCall, PhoneIncoming, PhoneOutgoing
} from 'lucide-react';
import toast from 'react-hot-toast';
import CallModal from '../components/CallModal';

// Static Group Channels definition
const GROUP_CHANNELS = [
  { id: 'lounge', name: '#developers-lounge', description: 'General lobby for software engineers and creators' },
  { id: 'employers', name: '#employer-board', description: 'Recruitment notices, job alerts, and introductions' },
  { id: 'support', name: '#tech-support', description: 'Technical questions, React guidelines, and backend help' }
];

export default function Chat() {
  const { user: currentUser, logout } = useAuth();
  
  // Navigation Tabs: 'chats' | 'status' | 'groups' | 'calls'
  const [activeTab, setActiveTab] = useState('chats');

  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  // Active chat state (could be user contact or group channel object)
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatType, setChatType] = useState('direct'); // 'direct' | 'group'
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // WhatsApp Status view overlay states
  const [activeStatusUser, setActiveStatusUser] = useState(null); // User object containing certs
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);

  // Calls history list stored in localStorage
  const [callLogs, setCallLogs] = useState([]);

  // Call States
  const [callActive, setCallActive] = useState(false);
  const [callInfo, setCallInfo] = useState(null);

  const chatBottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedUserRef = useRef(null);
  const chatTypeRef = useRef('direct');

  // Sync refs to avoid stale closures in socket listener
  useEffect(() => {
    selectedUserRef.current = selectedUser;
    chatTypeRef.current = chatType;
  }, [selectedUser, chatType]);

  // Load call logs from localStorage on mount
  useEffect(() => {
    const logs = JSON.parse(localStorage.getItem('yogyata_call_logs') || '[]');
    setCallLogs(logs);
  }, []);

  const addCallLog = (log) => {
    const logs = JSON.parse(localStorage.getItem('yogyata_call_logs') || '[]');
    const newLog = {
      id: Date.now(),
      name: log.name,
      type: log.type, // 'audio' | 'video'
      direction: log.direction, // 'inbound' | 'outbound'
      timestamp: new Date().toISOString(),
    };
    const updated = [newLog, ...logs];
    localStorage.setItem('yogyata_call_logs', JSON.stringify(updated));
    setCallLogs(updated);
  };

  // Fetch contact list
  const { data: contactsData, isLoading: loadingContacts } = useQuery({
    queryKey: ['chatContacts'],
    queryFn: async () => {
      const res = await api.get('/api/social/users');
      return res.data.users;
    },
  });

  // Fetch all certificates to build WhatsApp Status stories
  const { data: statusCertificates } = useQuery({
    queryKey: ['statusCertificatesChat'],
    queryFn: async () => {
      const res = await api.get('/api/certificates');
      return res.data.certificates;
    },
  });

  // Query/Effect: Fetch initial unread counts
  useEffect(() => {
    const fetchUnreadCounts = async () => {
      try {
        const res = await api.get('/api/messages/unread/counts');
        if (res.data.success) {
          setUnreadCounts(res.data.counts || {});
        }
      } catch (err) {
        console.error('Failed to load unread message counts:', err);
      }
    };
    if (currentUser) {
      fetchUnreadCounts();
    }
  }, [currentUser]);

  // Effect: Mark messages as read when selecting a contact
  useEffect(() => {
    if (!selectedUser || chatType !== 'direct') return;

    const markMessagesRead = async () => {
      try {
        await api.put(`/api/messages/${selectedUser._id}/read`);
        setUnreadCounts((prev) => ({
          ...prev,
          [selectedUser._id]: 0,
        }));
      } catch (err) {
        console.error('Failed to mark messages as read:', err);
      }
    };

    markMessagesRead();
    setIsPeerTyping(false);
  }, [selectedUser, chatType]);

  // Effect: Auto-select chat partner if user ID is in URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userIdParam = params.get('user');
    if (userIdParam && contactsData) {
      const targetContact = contactsData.find((c) => String(c._id) === String(userIdParam));
      if (targetContact) {
        setActiveTab('chats');
        setChatType('direct');
        setSelectedUser(targetContact);
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

    newSocket.on('online-users', (userIds) => {
      setOnlineUsers(userIds);
    });

    newSocket.on('receive-message', (msg) => {
      const senderId = String(msg.sender?._id || msg.sender);
      const activePartner = selectedUserRef.current;
      const activeChatType = chatTypeRef.current;
      
      // Update last messages preview state
      setLastMessages((prev) => ({
        ...prev,
        [senderId]: {
          content: msg.messageType === 'image' ? 'Sent an image 📷' : msg.content,
          createdAt: msg.createdAt,
        }
      }));

      // If message is from the active direct partner, append to list
      if (activeChatType === 'direct' && activePartner && String(activePartner._id) === senderId) {
        setMessages((prev) => [...prev, msg]);
        api.put(`/api/messages/${senderId}/read`).catch(() => {});
      } else {
        // Increment unread count for sender
        if (senderId !== String(currentUser._id)) {
          setUnreadCounts((prev) => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1,
          }));
          toast(`New message from contact`, { icon: '💬' });
        } else {
          // If we sent a message from another tab, append it
          if (activeChatType === 'direct' && activePartner && String(activePartner._id) === String(msg.recipient?._id || msg.recipient)) {
            setMessages((prev) => [...prev, msg]);
          }
        }
      }
    });

    // Handle incoming group messages
    newSocket.on('receive-group-message', (groupMsg) => {
      const activePartner = selectedUserRef.current;
      const activeChatType = chatTypeRef.current;

      if (activeChatType === 'group' && activePartner && activePartner.id === groupMsg.groupId) {
        setMessages((prev) => [...prev, groupMsg]);
      }
    });

    // Listening for typing indicator from peer
    newSocket.on('incoming-typing', ({ senderId, isTyping }) => {
      const activePartner = selectedUserRef.current;
      const activeChatType = chatTypeRef.current;
      if (activeChatType === 'direct' && activePartner && String(activePartner._id) === String(senderId)) {
        setIsPeerTyping(isTyping);
      }
    });

    // Listening for reaction updates
    newSocket.on('message-reaction-updated', ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (String(m._id) === String(messageId) ? { ...m, reactions } : m))
      );
    });

    // Handle Incoming Call signals
    newSocket.on('incoming-call', ({ callerId, callerName, signalData, type }) => {
      // Log call into call log history
      addCallLog({ name: callerName, type, direction: 'inbound' });

      setCallInfo({
        callerId,
        callerName,
        recipientId: currentUser._id,
        type,
        signalData,
        direction: 'inbound',
      });
      setCallActive(true);
    });

    newSocket.on('blocked-user', ({ message }) => {
      toast.error(message, { duration: 8000 });
      logout().then(() => {
        window.location.href = '/login';
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [currentUser]);

  // Fetch message history when active direct chat partner changes
  useEffect(() => {
    if (!selectedUser || chatType !== 'direct') return;

    const fetchHistory = async () => {
      try {
        const res = await api.get(`/api/messages/${selectedUser._id}`);
        setMessages(res.data.messages);

        // Seed last message for this partner if messages exist
        const history = res.data.messages;
        if (history.length > 0) {
          const lastMsg = history[history.length - 1];
          setLastMessages((prev) => ({
            ...prev,
            [selectedUser._id]: {
              content: lastMsg.messageType === 'image' ? 'Sent an image 📷' : lastMsg.content,
              createdAt: lastMsg.createdAt,
            }
          }));
        }
      } catch (err) {
        toast.error('Failed to load message history');
      }
    };
    fetchHistory();
  }, [selectedUser, chatType]);

  // Handle joining group rooms when selecting a group channel
  useEffect(() => {
    if (!selectedUser || chatType !== 'group' || !socket) return;
    
    setMessages([]);
    socket.emit('join-group', selectedUser.id);
  }, [selectedUser, chatType, socket]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPeerTyping]);

  // Input Typing change
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (socket && selectedUser && chatType === 'direct') {
      socket.emit('typing', {
        senderId: currentUser._id,
        recipientId: selectedUser._id,
        isTyping: e.target.value.trim().length > 0,
      });
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

      // Turn off typing indicator
      socket.emit('typing', {
        senderId: currentUser._id,
        recipientId: selectedUser._id,
        isTyping: false,
      });
    } else {
      // Send group chat message
      socket.emit('send-group-message', {
        senderId: currentUser._id,
        senderName: currentUser.name,
        groupId: selectedUser.id,
        content: newMessage.trim(),
      });
    }

    setNewMessage('');
  };

  // Image Upload handler
  const handleImageSend = async (e) => {
    const file = e.target.files[0];
    if (!file || !socket || !selectedUser || chatType !== 'direct') return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingImage(true);
    try {
      const res = await api.post('/api/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        socket.emit('send-message', {
          senderId: currentUser._id,
          recipientId: selectedUser._id,
          content: 'Sent an image 📷',
          messageType: 'image',
          fileUrl: res.data.fileUrl,
        });
      }
    } catch (err) {
      toast.error('Image attachment failed. Supported format: JPG, PNG.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Message Reaction handler (Double Tap or Picker Selection)
  const handleReaction = (messageId, emoji) => {
    if (!socket || chatType !== 'direct') return;
    socket.emit('react-message', {
      messageId,
      userId: currentUser._id,
      emoji,
    });
    setShowReactionPicker(null);
  };

  const startCall = (callType) => {
    if (!selectedUser || chatType !== 'direct') return;
    
    // Log outgoing call
    addCallLog({ name: selectedUser.name, type: callType, direction: 'outbound' });

    setCallInfo({
      callerId: currentUser._id,
      callerName: currentUser.name,
      recipientId: selectedUser._id,
      type: callType,
      direction: 'outbound',
    });
    setCallActive(true);
  };

  const isOnline = (userId) => onlineUsers.includes(userId);

  // Group Status stories by creator
  const statusUpdates = statusCertificates?.filter(c => c.uploadedBy && c.uploadedBy._id !== currentUser._id) || [];
  const groupedStatuses = {};
  statusUpdates.forEach(cert => {
    const creatorId = cert.uploadedBy._id;
    if (!groupedStatuses[creatorId]) {
      groupedStatuses[creatorId] = {
        user: cert.uploadedBy,
        certificates: [],
      };
    }
    groupedStatuses[creatorId].certificates.push(cert);
  });
  const statusList = Object.values(groupedStatuses);

  // Auto progression of WhatsApp statuses
  useEffect(() => {
    if (!activeStatusUser) return;
    
    const interval = setTimeout(() => {
      const nextIndex = activeStatusIndex + 1;
      if (nextIndex < activeStatusUser.certificates.length) {
        setActiveStatusIndex(nextIndex);
      } else {
        // Exit status view overlay when stories complete
        setActiveStatusUser(null);
        setActiveStatusIndex(0);
      }
    }, 5000); // 5 seconds per story

    return () => clearTimeout(interval);
  }, [activeStatusUser, activeStatusIndex]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[88vh] flex flex-col relative z-10">
      <div className="absolute top-[10%] left-[-10%] w-[40vw] h-[40vw] bg-purple-900/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 glass-panel rounded-3xl border-purple-950/45 shadow-2xl overflow-hidden bg-[#0c0a13]/85 relative">
        
        {/* ========================================== */}
        {/* SIDEBAR: NAV & CHAT THREADS (4 columns)    */}
        {/* ========================================== */}
        <div className="md:col-span-4 border-r border-purple-950/45 flex flex-col h-full bg-[#08070d]/70">
          
          {/* Header & Subtitle */}
          <div className="p-4 border-b border-purple-950/30">
            <h2 className="font-accent text-lg font-bold text-white tracking-wide">Yogyata Connect</h2>
            <p className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">Namaste Chat Lobby</p>
          </div>

          {/* WhatsApp Style Tab Bar Navigation */}
          <div className="flex bg-[#05040a]/40 border-b border-purple-950/30 text-center text-xs text-gray-500 font-semibold">
            <button
              onClick={() => { setSelectedUser(null); setActiveTab('chats'); }}
              className={`flex-1 py-3 border-b-2 transition-all ${
                activeTab === 'chats' ? 'border-accent text-accent' : 'border-transparent hover:text-gray-300'
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => { setSelectedUser(null); setActiveTab('status'); }}
              className={`flex-1 py-3 border-b-2 transition-all ${
                activeTab === 'status' ? 'border-accent text-accent' : 'border-transparent hover:text-gray-300'
              }`}
            >
              Status
            </button>
            <button
              onClick={() => { setSelectedUser(null); setActiveTab('groups'); }}
              className={`flex-1 py-3 border-b-2 transition-all ${
                activeTab === 'groups' ? 'border-accent text-accent' : 'border-transparent hover:text-gray-300'
              }`}
            >
              Groups
            </button>
            <button
              onClick={() => { setSelectedUser(null); setActiveTab('calls'); }}
              className={`flex-1 py-3 border-b-2 transition-all ${
                activeTab === 'calls' ? 'border-accent text-accent' : 'border-transparent hover:text-gray-300'
              }`}
            >
              Calls
            </button>
          </div>

          {/* Tab Body list contents */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            
            {/* 1. CHATS TAB */}
            {activeTab === 'chats' && (
              loadingContacts ? (
                <div className="py-16 flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-accent" />
                </div>
              ) : contactsData?.length === 0 ? (
                <div className="text-center text-xs text-gray-600 py-12">No direct chats.</div>
              ) : (
                contactsData?.map((contact) => {
                  const unreadCount = unreadCounts[contact._id] || 0;
                  const lastMsg = lastMessages[contact._id];
                  const active = chatType === 'direct' && selectedUser?._id === contact._id;

                  return (
                    <button
                      key={contact._id}
                      onClick={() => { setChatType('direct'); setSelectedUser(contact); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        active
                          ? 'bg-[#1a1727]/60 border-purple-900/40 text-white'
                          : 'hover:bg-purple-950/15 border-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {/* FIXED: DP Bug Resolved, renders user picture if available */}
                      <div className="relative shrink-0">
                        {contact.profilePicture ? (
                          <img
                            src={getFileUrl(contact.profilePicture)}
                            alt={contact.name}
                            className="w-11 h-11 rounded-full object-cover border border-purple-950 shadow-md"
                          />
                        ) : (
                          <div className="w-11 h-11 bg-gradient-to-tr from-accent to-purple-900 rounded-full flex items-center justify-center font-bold text-white shadow-md border border-purple-950">
                            {contact.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {isOnline(contact._id) && (
                          <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-indian-emerald rounded-full border-2 border-[#0c0a13] animate-pulse"></span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-gray-200 truncate">{contact.name}</h4>
                          {lastMsg && (
                            <span className="text-[9px] text-gray-600 font-mono">
                              {new Date(lastMsg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-[10px] truncate max-w-[150px] ${unreadCount > 0 ? 'text-white font-bold' : 'text-gray-500'}`}>
                            {lastMsg ? lastMsg.content : 'No messages yet'}
                          </p>
                          {unreadCount > 0 && (
                            <span className="bg-accent text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 animate-pulse">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )
            )}

            {/* 2. STATUS TAB (APPROVED CERTIFICATES) */}
            {activeTab === 'status' && (
              statusList.length === 0 ? (
                <div className="text-center text-xs text-gray-600 py-12">No active status stories.</div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pl-2 mb-3">Recent Statuses</p>
                  {statusList.map((story) => (
                    <button
                      key={story.user._id}
                      onClick={() => { setActiveStatusUser(story); setActiveStatusIndex(0); }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-purple-950/15 transition-all text-left w-full"
                    >
                      {/* Circular ring status indicator */}
                      <div className="relative shrink-0 p-0.5 rounded-full border-2 border-dashed border-accent hover:scale-102 transition-transform">
                        {story.user.profilePicture ? (
                          <img
                            src={getFileUrl(story.user.profilePicture)}
                            alt={story.user.name}
                            className="w-10 h-10 rounded-full object-cover border border-purple-950"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-purple-950 rounded-full flex items-center justify-center font-bold text-white text-xs">
                            {story.user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-gray-200">{story.user.name}</h4>
                        <span className="block text-[9px] text-gray-500 font-mono mt-0.5">
                          {story.certificates.length} certificate update{story.certificates.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}

            {/* 3. GROUPS TAB */}
            {activeTab === 'groups' && (
              <div className="space-y-1.5">
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pl-2 mb-3">Public Lounge Rooms</p>
                {GROUP_CHANNELS.map((group) => {
                  const active = chatType === 'group' && selectedUser?.id === group.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => { setChatType('group'); setSelectedUser(group); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                        active
                          ? 'bg-[#1a1727]/60 border-purple-900/40 text-white'
                          : 'hover:bg-purple-950/15 border-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-950 to-indigo-900 flex items-center justify-center border border-purple-900/40 text-white shrink-0">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-gray-200 truncate">{group.name}</h4>
                        <p className="text-[9px] text-gray-500 truncate mt-0.5 leading-tight">{group.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 4. CALLS LOG TAB */}
            {activeTab === 'calls' && (
              callLogs.length === 0 ? (
                <div className="text-center text-xs text-gray-600 py-12">No recent call logs.</div>
              ) : (
                <div className="space-y-1">
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pl-2 mb-3">Call History Log</p>
                  {callLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-purple-950/5 border border-purple-950/10 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-purple-900/10 border border-purple-900/30 text-purple-400`}>
                          {log.type === 'video' ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-200 text-xs">{log.name}</h4>
                          <span className="text-[9px] text-gray-500 font-mono mt-0.5 block flex items-center gap-1">
                            {log.direction === 'inbound' ? '↙ Received' : '↗ Placed'} •{' '}
                            {new Date(log.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

          </div>
        </div>

        {/* ========================================== */}
        {/* MESSAGING STREAM PANEL (8 columns)         */}
        {/* ========================================== */}
        <div className="md:col-span-8 flex flex-col h-full bg-[#0a0811]/40 relative">
          {selectedUser ? (
            <>
              {/* Header Details */}
              <div className="p-4 border-b border-purple-950/45 flex items-center justify-between bg-[#08070d]/50">
                <div className="flex items-center gap-3">
                  {/* FIXED: DP Bug Resolved, renders active chat partner picture */}
                  {chatType === 'direct' ? (
                    selectedUser.profilePicture ? (
                      <Link to={`/profile/${selectedUser._id}`} className="shrink-0 block hover:scale-102 transition-transform">
                        <img
                          src={getFileUrl(selectedUser.profilePicture)}
                          alt={selectedUser.name}
                          className="w-10 h-10 rounded-full object-cover border border-purple-950 shadow-md"
                        />
                      </Link>
                    ) : (
                      <Link to={`/profile/${selectedUser._id}`} className="w-10 h-10 bg-purple-950 rounded-full flex items-center justify-center font-bold text-sm text-purple-300 border border-purple-900/40 shrink-0 block hover:scale-102 transition-transform">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </Link>
                    )
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-950 to-indigo-900 flex items-center justify-center border border-purple-900/40 text-white shrink-0">
                      <Users className="h-5 w-5" />
                    </div>
                  )}

                  <div>
                    {chatType === 'direct' ? (
                      <Link to={`/profile/${selectedUser._id}`} className="text-xs font-bold text-white hover:text-accent hover:underline block leading-tight">
                        {selectedUser.name}
                      </Link>
                    ) : (
                      <h3 className="text-xs font-bold text-white leading-tight">{selectedUser.name}</h3>
                    )}
                    <span className="text-[9px] text-gray-500 font-medium">
                      {chatType === 'direct' ? (
                        isOnline(selectedUser._id) ? (
                          <span className="text-indian-emerald font-bold">● Active now</span>
                        ) : (
                          'Active offline'
                        )
                      ) : (
                        'Public Lobby room'
                      )}
                    </span>
                  </div>
                </div>

                {/* Call buttons triggers (direct chat only) */}
                {chatType === 'direct' && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => startCall('audio')}
                      className="p-2.5 rounded-full bg-purple-950/20 border border-purple-900/30 text-purple-400 hover:text-white hover:bg-purple-900/40 transition-all"
                      title="Start Audio Call"
                    >
                      <Phone className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={() => startCall('video')}
                      className="p-2.5 rounded-full bg-purple-950/20 border border-purple-900/30 text-purple-400 hover:text-white hover:bg-purple-900/40 transition-all"
                      title="Start Video Call"
                    >
                      <Video className="h-4.5 w-4.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Chat Message list */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#0a0912]/20">
                {messages.length === 0 ? (
                  <div className="text-center text-xs text-gray-600 py-16">
                    {chatType === 'direct'
                      ? 'Say Hello to start a conversation! Double-tap messages to react ❤️.'
                      : `Welcome to ${selectedUser.name}! Share comments or questions here.`}
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isSelf = String(msg.sender?._id || msg.sender) === String(currentUser?._id);
                    
                    return (
                      <div
                        key={msg._id || index}
                        className={`flex ${isSelf ? 'justify-end' : 'justify-start'} group/msg relative`}
                      >
                        <div className="relative max-w-xs sm:max-w-md">
                          
                          {/* Group sender name tag */}
                          {chatType === 'group' && !isSelf && (
                            <span className="block text-[8px] text-purple-400 font-bold mb-1 ml-1 tracking-wide">
                              {msg.senderName || 'Developer'}
                            </span>
                          )}

                          {/* Message bubble */}
                          <div
                            onDoubleClick={() => chatType === 'direct' && handleReaction(msg._id, '❤️')}
                            className={`p-3.5 rounded-2xl text-xs leading-relaxed break-words cursor-pointer select-none relative ${
                              isSelf
                                ? 'bg-gradient-to-r from-accent to-accent-dark text-white rounded-br-none shadow-lg shadow-purple-500/5'
                                : 'bg-[#1b1926]/90 border border-purple-950/75 text-gray-200 rounded-bl-none'
                            }`}
                          >
                            {/* Image Attachment view */}
                            {msg.messageType === 'image' ? (
                              <div className="space-y-1.5 max-w-[240px]">
                                <img
                                  src={getFileUrl(msg.fileUrl)}
                                  alt="Attachment"
                                  className="w-full h-auto rounded-lg border border-purple-950 max-h-56 object-cover hover:scale-[1.01] transition-transform duration-300"
                                />
                                <span className="block text-[8px] opacity-65 text-right font-semibold">Media File</span>
                              </div>
                            ) : (
                              msg.content
                            )}

                            {/* Timestamp overlay */}
                            <span className="block text-[8px] text-gray-500 mt-1.5 text-right font-mono">
                              {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Message Reactions display overlay */}
                          {chatType === 'direct' && msg.reactions && msg.reactions.length > 0 && (
                            <div className={`absolute bottom-[-10px] ${isSelf ? 'left-2' : 'right-2'} bg-[#12101b] border border-purple-900/50 rounded-full px-1.5 py-0.5 flex gap-0.5 items-center shadow-lg text-[10px]`}>
                              {Array.from(new Set(msg.reactions.map(r => r.emoji))).map((emoji, idx) => (
                                <span key={idx}>{emoji}</span>
                              ))}
                              {msg.reactions.length > 1 && (
                                <span className="text-[8px] font-bold text-gray-400 ml-0.5">{msg.reactions.length}</span>
                              )}
                            </div>
                          )}

                          {/* Emoji reaction picker on hover (Direct chats only) */}
                          {chatType === 'direct' && (
                            <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-250 flex items-center bg-[#100d1b] border border-purple-900/40 rounded-full px-2 py-1 shadow-xl z-20 space-x-1.5 ${
                              isSelf ? 'left-[-150px]' : 'right-[-150px]'
                            }`}>
                              {['❤️', '👍', '😂', '😮', '😢', '🙏'].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(msg._id, emoji)}
                                  className="hover:scale-125 transition-transform duration-150 text-xs"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })
                )}

                {/* Live Typing indicator pill */}
                {chatType === 'direct' && isPeerTyping && (
                  <div className="flex justify-start">
                    <div className="bg-[#1b1926]/40 border border-purple-950/20 text-gray-500 px-4 py-2.5 rounded-2xl rounded-bl-none text-[10px] italic flex items-center gap-1.5 animate-pulse">
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-100"></span>
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-200"></span>
                      Typing...
                    </div>
                  </div>
                )}
                
                <div ref={chatBottomRef}></div>
              </div>

              {/* Chat Send Input bar */}
              <div className="p-4 border-t border-purple-950/45 bg-[#08070d]/50">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 relative bg-[#06050a] border border-purple-950 rounded-2xl px-4 py-2">
                  
                  {/* Plus button to send media (direct chat only) */}
                  {chatType === 'direct' && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="p-1 text-purple-400 hover:text-white transition-colors disabled:opacity-50 shrink-0"
                      title="Send Image File"
                    >
                      {uploadingImage ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Plus className="h-5 w-5 hover:rotate-90 transition-transform duration-250" />
                      )}
                    </button>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSend}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Input field */}
                  <input
                    type="text"
                    placeholder="Message..."
                    value={newMessage}
                    onChange={handleInputChange}
                    className="flex-1 bg-transparent text-xs text-gray-200 placeholder:text-gray-700 py-1.5 focus:outline-none"
                  />

                  {/* Send Button */}
                  {newMessage.trim().length > 0 && (
                    <button
                      type="submit"
                      className="text-accent hover:text-white text-xs font-bold font-accent transition-colors py-1 px-2 uppercase tracking-wide shrink-0"
                    >
                      Send
                    </button>
                  )}
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 bg-[#0a0a0f]/10">
              <div className="bg-purple-950/30 p-4.5 rounded-full border border-purple-900/30 text-accent">
                <MessageSquare className="h-11 w-11 animate-pulse" />
              </div>
              <h3 className="font-accent text-lg font-bold text-white">Lobby Messaging</h3>
              <p className="text-xs text-gray-500 max-w-xs">
                Select a direct message thread, browse statuses, join a public lounge room, or check call logs.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* WebRTC Calling Modal Overlay */}
      {callActive && socket && (
        <CallModal
          socket={socket}
          callInfo={callInfo}
          onClose={() => {
            setCallActive(false);
            setCallInfo(null);
          }}
        />
      )}

      {/* ========================================== */}
      {/* FULLSCREEN STATUS UPDATE STORY VIEWER      */}
      {/* ========================================== */}
      {activeStatusUser && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-[#0c0a13] rounded-3xl overflow-hidden border border-purple-950/50 flex flex-col h-[85vh]">
            
            {/* Story loading progress bar */}
            <div className="absolute top-3 left-4 right-4 flex gap-1 z-30">
              {activeStatusUser.certificates.map((_, idx) => (
                <div key={idx} className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-accent transition-all duration-5000 ease-linear ${
                      idx < activeStatusIndex
                        ? 'w-full'
                        : idx === activeStatusIndex
                        ? 'w-full animate-status-bar'
                        : 'w-0'
                    }`}
                  ></div>
                </div>
              ))}
            </div>

            {/* Close button & header */}
            <div className="p-4 pt-8 flex items-center justify-between border-b border-purple-950/30 bg-gradient-to-b from-black/85 to-transparent relative z-20 text-white">
              <div className="flex items-center gap-3">
                {activeStatusUser.user.profilePicture ? (
                  <img
                    src={getFileUrl(activeStatusUser.user.profilePicture)}
                    alt={activeStatusUser.user.name}
                    className="w-9 h-9 rounded-full object-cover border border-purple-950"
                  />
                ) : (
                  <div className="w-9 h-9 bg-purple-950 rounded-full flex items-center justify-center font-bold text-xs">
                    {activeStatusUser.user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold">{activeStatusUser.user.name}</h4>
                  <span className="text-[8px] text-gray-400 block mt-0.5">Status Story {activeStatusIndex + 1}/{activeStatusUser.certificates.length}</span>
                </div>
              </div>
              
              <button
                onClick={() => { setActiveStatusUser(null); setActiveStatusIndex(0); }}
                className="text-xs text-gray-400 hover:text-white bg-purple-950/20 px-3 py-1.5 rounded-full border border-purple-900/30 transition-colors"
              >
                Close Status
              </button>
            </div>

            {/* Story visual body */}
            <div className="flex-1 flex items-center justify-center bg-black relative p-6">
              {activeStatusUser.certificates[activeStatusIndex].fileType === 'pdf' ? (
                <div className="flex flex-col items-center gap-3 text-purple-400/40">
                  <Plus className="h-14 w-14 animate-spin-slow" />
                  <span className="text-xs font-bold uppercase tracking-wider">PDF Certificate Status</span>
                  <Link
                    to={`/certificates/${activeStatusUser.certificates[activeStatusIndex]._id}`}
                    onClick={() => { setActiveStatusUser(null); }}
                    className="mt-4 px-4 py-2 bg-accent text-white text-xs font-bold rounded-xl flex items-center gap-1 hover:bg-accent-dark transition-all"
                  >
                    View Document <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <img
                  src={getFileUrl(activeStatusUser.certificates[activeStatusIndex].fileUrl)}
                  alt="Status"
                  className="max-w-full max-h-full object-contain rounded-xl"
                />
              )}
            </div>

            {/* Story footer description */}
            <div className="p-5 border-t border-purple-950/40 bg-[#08070d] text-center text-xs text-gray-300">
              <p className="font-bold text-white text-sm">{activeStatusUser.certificates[activeStatusIndex].title}</p>
              <p className="text-[10px] text-gray-500 mt-1">Issued by {activeStatusUser.certificates[activeStatusIndex].issuer}</p>
              {activeStatusUser.certificates[activeStatusIndex].description && (
                <p className="mt-3 text-gray-400 italic font-medium leading-relaxed">
                  "{activeStatusUser.certificates[activeStatusIndex].description}"
                </p>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

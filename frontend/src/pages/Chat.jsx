import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api, { socketUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { Send, MessageSquare, Phone, Video, ShieldCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import CallModal from '../components/CallModal';

export default function Chat() {
  const { user: currentUser } = useAuth();
  
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  
  // Call States
  const [callActive, setCallActive] = useState(false);
  const [callInfo, setCallInfo] = useState(null); // { callerId, callerName, recipientId, type, signalData, direction: 'inbound'|'outbound' }

  const chatBottomRef = useRef(null);
  const selectedUserRef = useRef(null);

  // Sync ref with selected user to avoid stale closures in socket listener
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  // Fetch contact list
  const { data: contactsData, isLoading: loadingContacts } = useQuery({
    queryKey: ['chatContacts'],
    queryFn: async () => {
      const res = await api.get('/api/social/users');
      return res.data.users;
    },
  });

  // Query/Effect: Fetch initial unread counts from backend
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
    if (!selectedUser) return;

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
  }, [selectedUser]);

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
      
      // If message is from the active chat partner, append to list
      if (activePartner && String(activePartner._id) === senderId) {
        setMessages((prev) => [...prev, msg]);
        // Immediately mark as read on backend too
        api.put(`/api/messages/${senderId}/read`).catch(() => {});
      } else {
        // Increment unread count for sender
        if (senderId !== String(currentUser._id)) {
          setUnreadCounts((prev) => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1,
          }));
          
          // Dynamic notification toast
          toast(`New message from contact`, { icon: '💬' });
        } else {
          // If we sent a message from another tab, append it
          if (activePartner && String(activePartner._id) === String(msg.recipient?._id || msg.recipient)) {
            setMessages((prev) => [...prev, msg]);
          }
        }
      }
    });

    // Handle Incoming Call signals
    newSocket.on('incoming-call', ({ callerId, callerName, signalData, type }) => {
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

    return () => {
      newSocket.disconnect();
    };
  }, [currentUser]);

  // Fetch message history when active chat partner changes
  useEffect(() => {
    if (!selectedUser) return;

    const fetchHistory = async () => {
      try {
        const res = await api.get(`/api/messages/${selectedUser._id}`);
        setMessages(res.data.messages);
      } catch (err) {
        toast.error('Failed to load message history');
      }
    };
    fetchHistory();
  }, [selectedUser]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !selectedUser) return;

    socket.emit('send-message', {
      senderId: currentUser._id,
      recipientId: selectedUser._id,
      content: newMessage.trim(),
    });

    setNewMessage('');
  };

  const startCall = (callType) => {
    if (!selectedUser) return;
    
    // Trigger outbound calling modal
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 h-[85vh] flex flex-col relative z-10">
      <div className="absolute top-[10%] right-[-10%] w-[35vw] h-[35vw] bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 glass-panel rounded-2xl border-purple-950/40 shadow-2xl overflow-hidden bg-[#0c0a13]/70">
        
        {/* Contact List (4 columns) */}
        <div className="md:col-span-4 border-r border-purple-950/40 flex flex-col h-full bg-[#08070d]/60">
          <div className="p-4 border-b border-purple-950/40">
            <h2 className="font-accent text-lg font-bold text-white tracking-wider uppercase">Lobby Contacts</h2>
            <p className="text-[10px] text-purple-400 font-semibold tracking-wider">योग्यता • Chat Lobby</p>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {loadingContacts ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              </div>
            ) : contactsData?.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-12">No contacts in network yet.</div>
            ) : (
              contactsData?.map((contact) => (
                <button
                  key={contact._id}
                  onClick={() => setSelectedUser(contact)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                    selectedUser?._id === contact._id
                      ? 'bg-purple-950/30 border border-purple-800/40 text-white'
                      : 'hover:bg-purple-950/10 text-gray-400 hover:text-gray-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="relative w-9 h-9 bg-purple-900/40 rounded-full flex items-center justify-center font-bold text-sm text-purple-300">
                      {contact.name.charAt(0).toUpperCase()}
                      {isOnline(contact._id) && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-indian-emerald rounded-full border border-dark-bg animate-pulse"></span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold leading-tight">{contact.name}</h3>
                      <p className="text-[10px] text-gray-500 uppercase mt-0.5">{contact.role === 'seeker' ? 'Developer' : 'Employer'}</p>
                    </div>
                  </div>

                  {unreadCounts[contact._id] > 0 && (
                    <span className="bg-accent text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-purple-500/35">
                      {unreadCounts[contact._id]}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messaging Area (8 columns) */}
        <div className="md:col-span-8 flex flex-col h-full relative">
          {selectedUser ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-purple-950/40 flex items-center justify-between bg-[#08070d]/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-900/40 rounded-full flex items-center justify-center font-bold text-sm text-purple-300">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white leading-tight">{selectedUser.name}</h2>
                    <span className="text-[9px] text-gray-500 tracking-wider">
                      {isOnline(selectedUser._id) ? (
                        <span className="text-indian-emerald font-semibold">● Online</span>
                      ) : (
                        'Offline'
                      )}
                    </span>
                  </div>
                </div>

                {/* Call Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startCall('audio')}
                    className="p-2 rounded-xl bg-purple-950/40 border border-purple-900/40 text-purple-300 hover:text-white hover:bg-purple-900/60 transition-all"
                    title="Audio Call"
                  >
                    <Phone className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => startCall('video')}
                    className="p-2 rounded-xl bg-purple-950/40 border border-purple-900/40 text-purple-300 hover:text-white hover:bg-purple-900/60 transition-all"
                    title="Video Call"
                  >
                    <Video className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0a0f]/40">
                {messages.length === 0 ? (
                  <div className="text-center text-xs text-gray-600 py-12">No messages yet. Send a Swagat message!</div>
                ) : (
                  messages.map((msg, index) => {
                    const isSelf = String(msg.sender?._id || msg.sender) === String(currentUser?._id);
                    return (
                      <div
                        key={msg._id || index}
                        className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs sm:max-w-md p-3 rounded-2xl text-xs leading-relaxed ${
                            isSelf
                              ? 'bg-gradient-to-r from-accent to-accent-dark text-white rounded-br-none shadow-md shadow-purple-500/5'
                              : 'bg-purple-950/20 border border-purple-900/30 text-gray-200 rounded-bl-none'
                          }`}
                        >
                          {msg.content}
                          <span className="block text-[8px] text-gray-400 mt-1.5 text-right">
                            {new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef}></div>
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-purple-950/40 bg-[#08070d]/60 flex gap-2">
                <input
                  type="text"
                  placeholder="Type swagat message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-[#050409] border border-purple-950 text-gray-200 px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-accent transition-all placeholder:text-gray-700"
                />
                <button
                  type="submit"
                  className="p-2.5 rounded-xl bg-accent hover:bg-accent-dark text-white shadow-lg shadow-purple-500/10 transition-all flex items-center justify-center"
                >
                  <Send className="h-4.5 w-4.5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 bg-[#0a0a0f]/10">
              <div className="bg-purple-950/30 p-4 rounded-full border border-purple-900/30 text-accent">
                <MessageSquare className="h-10 w-10 animate-bounce" />
              </div>
              <h3 className="font-accent text-lg font-bold text-white">Yogyata Chat Room</h3>
              <p className="text-xs text-gray-500 max-w-sm">
                Select a contact from the lobby to start private chat messages and trigger real-time audio/video calls.
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
    </div>
  );
}

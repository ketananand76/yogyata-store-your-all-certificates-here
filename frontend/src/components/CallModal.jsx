import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, PhoneCall, Video, VideoOff, Volume2, VolumeX } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const pcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const ABUSIVE_WORDS = [
  'fuck', 'shit', 'asshole', 'bitch', 'bastard', 'cunt', 'dick', 'pussy', 'slut', 'whore',
  'chutiya', 'madarchod', 'behenchod', 'gandu', 'bhosdike', 'harami', 'saala', 'kamina',
  'चूतिया', 'मादरचोद', 'बहनचोद', 'गांडू', 'भोसड़ीके', 'हरामी', 'साला', 'कमीना'
];

export default function CallModal({ socket, callInfo, onClose }) {
  const { callerId, callerName, recipientId, type, signalData, direction } = callInfo;
  
  const [callState, setCallState] = useState(direction === 'inbound' ? 'ringing' : 'calling'); // 'ringing', 'calling', 'connecting', 'connected', 'ended'
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Play loud repeating ringtone during inbound ringing state
  useEffect(() => {
    if (callState !== 'ringing') return;

    const playRingtone = () => {
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
        // Loud, distinct electronic alert chime
        playTone(523.25, 0.3, 'sawtooth', 0, 0.6); // C5
        playTone(659.25, 0.3, 'sawtooth', 0.15, 0.6); // E5
        playTone(783.99, 0.45, 'sawtooth', 0.3, 0.6); // G5
      } catch (err) {
        console.warn('Ringtone autoplay blocked:', err);
      }
    };

    playRingtone(); // Play immediately
    const ringInterval = setInterval(playRingtone, 2200);

    return () => clearInterval(ringInterval);
  }, [callState]);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const candidatesQueue = useRef([]);
  const recognitionRef = useRef(null);

  // Initialize HTML5 Speech Recognition for Voice Moderation
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'hi-IN'; // Listens to both Hindi and English speech structures

      rec.onresult = async (event) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript.toLowerCase();
            console.log('[Voice Moderation Transcript]:', transcript);

            // Strip basic punctuation and verify against bad words dictionary
            const words = transcript.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").split(/\s+/);
            const hasAbusive = words.some(word => 
              ABUSIVE_WORDS.includes(word) || ABUSIVE_WORDS.some(bad => word.includes(bad))
            );

            if (hasAbusive) {
              rec.stop();
              toast.error('Violation: Abusive speech detected! Terminating call and auto-blocking account.', { duration: 6000 });
              
              // Call report API to trigger backend block
              try {
                await api.post('/api/social/report-abusive', {
                  reason: `Automated block: Abusive speech detected during call session: "${transcript}"`
                });
              } catch (err) {}

              // Terminate call signaling and force logout redirect
              declineCall();
              window.location.href = '/login';
            }
          }
        }
      };

      rec.onerror = (e) => {
        if (e.error === 'no-speech' || e.error === 'aborted') {
          // Restart transient/no-speech errors to keep listening active
          try { rec.start(); } catch (err) {}
        }
      };

      rec.onend = () => {
        // Keep speech recognition running as long as the call remains connected
        if (pcRef.current && pcRef.current.connectionState === 'connected') {
          try { rec.start(); } catch (err) {}
        }
      };

      recognitionRef.current = rec;
    }
  }, [callState]);

  // Start speech recognition once WebRTC is connected
  useEffect(() => {
    if (callState === 'connected' && recognitionRef.current) {
      try {
        recognitionRef.current.start();
        console.log('[Voice Moderation] Speech recognition listening active.');
      } catch (err) {
        console.error('Speech recognition start failed:', err);
      }
    }
  }, [callState]);

  useEffect(() => {
    // Socket listeners for signaling
    socket.on('call-accepted', async ({ signalData: answer }) => {
      if (pcRef.current) {
        try {
          setCallState('connected');
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          // Process queued ICE candidates
          while (candidatesQueue.current.length > 0) {
            const candidate = candidatesQueue.current.shift();
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (err) {
          console.error('Error setting remote description:', err);
        }
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      if (pcRef.current && pcRef.current.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      } else {
        candidatesQueue.current.push(candidate);
      }
    });

    socket.on('call-ended', () => {
      toast('Call ended by remote user');
      cleanup();
      onClose();
    });

    // Start dialing if outbound call
    if (direction === 'outbound') {
      initiateCall();
    }

    return () => {
      socket.off('call-accepted');
      socket.off('ice-candidate');
      socket.off('call-ended');
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  };

  const getMediaDevices = async () => {
    try {
      // Capture audio and optional video
      const constraints = {
        audio: true,
        video: type === 'video',
      };
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.warn('System camera/mic blocked or not found. Falling back to audio-only/emulated track:', err);
      // Fallback: try capturing audio-only
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (audioErr) {
        toast.error('No audio/video hardware detected. Emulating signaling.');
        return null;
      }
    }
  };

  const initiateCall = async () => {
    const stream = await getMediaDevices();
    if (stream) {
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    }

    // Create RTCPeerConnection
    const pc = new RTCPeerConnection(pcConfig);
    pcRef.current = pc;

    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    // Track remote stream
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Track ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          targetId: recipientId,
          senderId: callerId,
          candidate: event.candidate,
        });
      }
    };

    try {
      // Create Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call-user', {
        callerId,
        callerName,
        recipientId,
        signalData: offer,
        type,
      });
    } catch (err) {
      console.error('Outbound offer creation failed:', err);
    }
  };

  const acceptCall = async () => {
    setCallState('connecting');
    const stream = await getMediaDevices();
    if (stream) {
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    }

    const pc = new RTCPeerConnection(pcConfig);
    pcRef.current = pc;

    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    pc.ontrack = (event) => {
      setCallState('connected');
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          targetId: callerId,
          senderId: recipientId,
          candidate: event.candidate,
        });
      }
    };

    try {
      // Set Remote Offer
      await pc.setRemoteDescription(new RTCSessionDescription(signalData));

      // Process queued ICE candidates
      while (candidatesQueue.current.length > 0) {
        const candidate = candidatesQueue.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }

      // Create Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Emit accepted answer
      socket.emit('answer-call', {
        callerId,
        recipientId,
        signalData: answer,
      });
    } catch (err) {
      console.error('Accept call answer creation failed:', err);
      declineCall();
    }
  };

  const declineCall = () => {
    const target = direction === 'inbound' ? callerId : recipientId;
    socket.emit('end-call', { targetId: target, senderId: direction === 'inbound' ? recipientId : callerId });
    cleanup();
    onClose();
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07050b]/80 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-[#12111d] glass-panel-gold border-indian-gold/30 rounded-3xl overflow-hidden p-6 shadow-2xl relative space-y-6 flex flex-col items-center">
        
        {/* Connection status header */}
        <div className="text-center space-y-1 w-full">
          <div className="text-[10px] text-indian-gold tracking-[0.25em] font-bold uppercase">
            {callState === 'ringing' ? 'Incoming Call' : callState === 'calling' ? 'Dialing Contact' : 'Active Connection'}
          </div>
          <h3 className="font-accent text-xl font-bold text-white mt-1">
            {direction === 'inbound' ? callerName : 'Connecting...'}
          </h3>
          <p className="text-xs text-gray-500 capitalize">{type} Session</p>
        </div>

        {/* Video Screens Grid */}
        <div className="w-full grid grid-cols-2 gap-4 h-64 sm:h-72">
          {/* Local Feed */}
          <div className="bg-[#050409] border border-purple-950/60 rounded-2xl relative overflow-hidden flex items-center justify-center">
            {type === 'video' && !isVideoMuted ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <div className="text-center text-xs text-gray-600 font-bold uppercase tracking-wider">
                Local User
              </div>
            )}
            <span className="absolute bottom-3 left-3 bg-[#0d0a15]/80 text-[8px] font-bold text-purple-300 uppercase tracking-widest px-2 py-0.5 rounded border border-purple-900/60">
              Me
            </span>
          </div>

          {/* Remote Feed */}
          <div className="bg-[#050409] border border-purple-950/60 rounded-2xl relative overflow-hidden flex items-center justify-center">
            {callState === 'connected' && type === 'video' ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <div className="text-center text-xs text-gray-600 font-bold uppercase tracking-wider animate-pulse">
                {callState === 'connected' ? 'Connected (Voice)' : 'Connecting Feed...'}
              </div>
            )}
            <span className="absolute bottom-3 left-3 bg-[#0d0a15]/80 text-[8px] font-bold text-purple-300 uppercase tracking-widest px-2 py-0.5 rounded border border-purple-900/60">
              Peer
            </span>
          </div>
        </div>

        {/* Control triggers */}
        <div className="flex gap-4 items-center justify-center pt-2">
          {callState === 'ringing' ? (
            <>
              {/* Accept button */}
              <button
                onClick={acceptCall}
                className="w-14 h-14 rounded-full bg-indian-emerald hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all animate-bounce"
              >
                <PhoneCall className="h-6 w-6" />
              </button>
              {/* Decline button */}
              <button
                onClick={declineCall}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-500/20 hover:scale-105 transition-all"
              >
                <PhoneOff className="h-6 w-6" />
              </button>
            </>
          ) : (
            <>
              {/* Audio Mute toggle */}
              <button
                onClick={toggleAudio}
                className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${
                  isAudioMuted
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-purple-950/20 border-purple-950 text-gray-300 hover:text-white'
                }`}
              >
                {isAudioMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>

              {/* End/Hangup button */}
              <button
                onClick={declineCall}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-500/20 hover:scale-105 transition-all"
                title="Hang Up"
              >
                <PhoneOff className="h-6 w-6" />
              </button>

              {/* Video toggle if video call */}
              {type === 'video' && (
                <button
                  onClick={toggleVideo}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${
                    isVideoMuted
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'bg-purple-950/20 border-purple-950 text-gray-300 hover:text-white'
                  }`}
                >
                  {isVideoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

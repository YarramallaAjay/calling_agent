'use client';

import { useState, useEffect, useRef } from 'react';
import { Room, RoomEvent, Track, LocalParticipant, RemoteParticipant } from 'livekit-client';
import { toast, Toaster } from 'sonner';

interface Message {
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

export default function TestAgentPage() {
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [token, setToken] = useState('');

  const roomRef = useRef<Room | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate random room name
  const generateRoomName = () => {
    const randomId = Math.random().toString(36).substring(2, 8);
    setRoomName(`test-room-${randomId}`);
  };

  // Connect to LiveKit room
  const handleConnect = async () => {
    if (!userName || !roomName) {
      toast.error('Please enter both username and room name');
      return;
    }

    setIsConnecting(true);
    toast.loading('Connecting to voice agent...', { id: 'connecting' });

    try {
      // Step 1: Generate token
      const response = await fetch('/api/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, roomName }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate token');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate token');
      }

      setToken(data.data.token);
      toast.success('Token generated', { id: 'connecting' });

      // Step 2: Connect to room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      roomRef.current = room;

      // Setup event listeners
      room.on(RoomEvent.Connected, () => {
        console.log('[INFO] Connected to room');
        toast.success('Connected to room', { id: 'connecting' });
        setIsConnected(true);
        setIsConnecting(false);
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('[INFO] Disconnected from room');
        toast.info('Disconnected from room');
        setIsConnected(false);
        setIsConnecting(false);
      });

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log(`[INFO] Participant joined: ${participant.identity}`);
        if (participant.identity.includes('agent') || participant.identity.includes('Bella')) {
          toast.success('Agent connected!');
          addMessage('agent', 'Agent has joined the call');
        }
      });

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log(`[INFO] Track subscribed from ${participant.identity}`);

        if (track.kind === Track.Kind.Audio) {
          const element = track.attach();
          element.autoplay = true;
          element.volume = 1.0;
          document.body.appendChild(element);

          toast.success('Audio connected');
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach(el => el.remove());
      });

      // Handle audio playback status
      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        if (!room.canPlaybackAudio) {
          toast.warning('Click page to enable audio');
        }
      });

      // Track transcriptions (if available)
      room.on(RoomEvent.TrackPublished, (publication, participant) => {
        console.log(`[INFO] Track published by ${participant.identity}`);

        // Set agent speaking indicator when agent publishes audio
        if (participant.identity.includes('agent') || participant.identity.includes('Bella')) {
          setIsAgentSpeaking(true);

          // Auto-clear speaking indicator after 3 seconds of silence
          setTimeout(() => setIsAgentSpeaking(false), 3000);
        }
      });

      room.on(RoomEvent.TrackUnpublished, (publication, participant) => {
        if (participant.identity.includes('agent') || participant.identity.includes('Bella')) {
          setIsAgentSpeaking(false);
        }
      });

      // Connect to the room
      await room.connect(data.data.wsUrl, data.data.token);
      toast.success('Room connected', { id: 'connecting' });

      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true);
      toast.success('Microphone enabled');
      addMessage('agent', 'Ready to talk! Start speaking...');

      // Try to start audio
      try {
        await room.startAudio();
      } catch (e) {
        toast.warning('Click anywhere to enable audio');
        document.addEventListener('click', async () => {
          try {
            await room.startAudio();
            toast.success('Audio enabled');
          } catch (err) {
            // Ignore
          }
        }, { once: true });
      }

    } catch (error: any) {
      console.error('[ERROR] Connection failed:', error);
      toast.error(error.message || 'Connection failed', { id: 'connecting' });
      setIsConnecting(false);
    }
  };

  // Disconnect from room
  const handleDisconnect = () => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    setIsConnected(false);
    setMessages([]);
    toast.info('Disconnected');
  };

  // Add message to chat
  const addMessage = (role: 'user' | 'agent', content: string) => {
    setMessages(prev => [...prev, {
      role,
      content,
      timestamp: new Date(),
    }]);
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Toaster position="top-right" richColors />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Voice Agent Test</h1>
          <p className="text-gray-600 mt-2">
            Test the LiveKit voice agent with real-time transcriptions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connection Panel */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Connection</h2>

            {!isConnected ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isConnecting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="Enter room name"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isConnecting}
                    />
                    <button
                      onClick={generateRoomName}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                      disabled={isConnecting}
                    >
                      Random
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleConnect}
                  disabled={isConnecting || !userName || !roomName}
                  className="w-full py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isConnecting ? 'Connecting...' : 'Connect to Agent'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <p className="text-green-800 font-medium">Connected</p>
                  <p className="text-green-600 text-sm mt-1">Room: {roomName}</p>
                  <p className="text-green-600 text-sm">User: {userName}</p>
                </div>

                {/* Agent Speaking Indicator */}
                {isAgentSpeaking && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-8 bg-blue-500 rounded-full animate-pulse"></span>
                      <span className="w-2 h-8 bg-blue-500 rounded-full animate-pulse delay-75"></span>
                      <span className="w-2 h-8 bg-blue-500 rounded-full animate-pulse delay-150"></span>
                    </div>
                    <p className="text-blue-800 font-medium">Agent is speaking...</p>
                  </div>
                )}

                {token && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <p className="text-xs text-gray-500 mb-1">Token (for debugging):</p>
                    <p className="text-xs font-mono text-gray-700 break-all">{token.substring(0, 40)}...</p>
                  </div>
                )}

                <button
                  onClick={handleDisconnect}
                  className="w-full py-3 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>

          {/* Chat Panel */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col">
            <h2 className="text-xl font-semibold mb-4">Conversation</h2>

            <div className="flex-1 overflow-y-auto min-h-[400px] max-h-[600px] border border-gray-200 rounded-md p-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No messages yet. Connect to start the conversation.
                </p>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm font-medium mb-1">
                        {message.role === 'user' ? 'You' : 'Agent'}
                      </p>
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {isConnected && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Tip:</span> Start speaking and the agent will respond automatically.
                  Transcriptions will appear here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-3">How to Use</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Enter your name and a room name (or click Random)</li>
            <li>Click "Connect to Agent" to generate a token and join the room</li>
            <li>Allow microphone access when prompted</li>
            <li>Wait for the agent to connect (you'll see a notification)</li>
            <li>Start speaking! Try asking: "What are your working hours?"</li>
            <li>Watch the agent speaking indicator when the agent responds</li>
            <li>All transcriptions will appear in the conversation panel</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

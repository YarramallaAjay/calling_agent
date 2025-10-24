import { NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';

export async function POST(request: Request) {
  try {
    const { roomName } = await request.json();

    if (!roomName) {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      );
    }

    const LIVEKIT_URL = process.env.LIVEKIT_URL;
    const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
    const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return NextResponse.json(
        { error: 'LiveKit credentials not configured' },
        { status: 500 }
      );
    }

    // Initialize LiveKit Room Service Client
    const roomService = new RoomServiceClient(
      LIVEKIT_URL,
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET
    );

    try {
      // Check if room exists, create if it doesn't
      const rooms = await roomService.listRooms([roomName]);

      if (rooms.length === 0) {
        // Create the room
        await roomService.createRoom({
          name: roomName,
          emptyTimeout: 300, // 5 minutes
          maxParticipants: 10,
        });
        console.log(`Room created: ${roomName}`);
      } else {
        console.log(`Room already exists: ${roomName}`);
      }

      // Note: Agent auto-dispatch should be enabled in LiveKit Cloud console
      // Or agents will connect when they detect a room via worker registration

      return NextResponse.json({
        success: true,
        message: 'Room ready. Agent will join automatically if auto-dispatch is enabled.',
        room: roomName,
        hint: 'If agent doesn\'t join, enable auto-dispatch in LiveKit Cloud Settings → Agents',
      });

    } catch (error: any) {
      console.error('LiveKit error:', error);
      return NextResponse.json(
        {
          error: 'Failed to prepare room',
          details: error.message || 'Unknown error',
          hint: 'Enable auto-dispatch in LiveKit Cloud Settings → Agents'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in dispatch handler:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

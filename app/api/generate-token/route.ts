import { NextRequest, NextResponse } from 'next/server';
import { AccessToken, VideoGrant } from 'livekit-server-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userName, roomName } = body;

    if (!userName || !roomName) {
      return NextResponse.json(
        {
          success: false,
          error: 'userName and roomName are required',
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'LiveKit credentials not configured',
        },
        { status: 500 }
      );
    }

    // Create access token
    const token = new AccessToken(apiKey, apiSecret, {
      identity: userName,
      name: userName,
    });

    // Set video grants
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    } as VideoGrant);

    // Generate JWT token
    const jwt = await token.toJwt();

    console.log(`[TOKEN] Generated for user: ${userName} in room: ${roomName}`);

    return NextResponse.json({
      success: true,
      data: {
        token: jwt,
        wsUrl: wsUrl,
        roomName: roomName,
        userName: userName,
      },
    });
  } catch (error: any) {
    console.error('[ERROR] Token generation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate token',
      },
      { status: 500 }
    );
  }
}

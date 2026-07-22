import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { encrypt } from "@/lib/encryption";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    if (error) {
        return NextResponse.json(
            { error: "The authentication process was interrupted" },
            { status: 400 }
        );
    }

    if (!code) {
        return NextResponse.json(
            { error: "Authentication code not found" },
            { status: 400 }
        );
    }

    if (!state) {
        return NextResponse.json(
            { error: "Missing state (partner client ID)" },
            { status: 400 }
        );
    }

    const partnerClientId = state;

    try {
        const tokenUrl = 'https://oauth2.googleapis.com/token'

        const bodyParams = {
            code: code,
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
            grant_type: 'authorization_code',
        };

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(bodyParams).toString(),
        });

        const tokenData = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: "Failed to get tokens from Google" },
                { status: response.status }
            );
        }

        return NextResponse.json({
            message: "OAuth Code exchange successful",
            tokens: tokenData
        });

    } catch (error: any) {
        console.error("Server error", error)
        return NextResponse.json(
            { error: "Server error occured" },
            { status: 500 }
        );
    }
}
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

        const accessToken: string = tokenData.access_token;
        const refreshToken: string | undefined = tokenData.refresh_token;
        const expiresIn: number = tokenData.expires_in;
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        const channelResponse = await fetch(
            "https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true",
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const channelData = await channelResponse.json();
        if (!channelResponse.ok || !channelData.items?.length) {
            console.error("YouTube channel fetch error: ", channelData);
            return NextResponse.json(
                { error: "Could not fetch YouTube channel for this account" },
                { status: 400 }
            );
        }
        const channelId: string = channelData.items[0].id;
        const channelTitle: string = channelData.items[0].snippet?.title || "YouTube csatorna"

        const { data: existingAccount, error: lookupError } = await supabaseAdmin
            .from("account")
            .select("id")
            .eq("client_id", partnerClientId)
            .eq("platform", "youtube")
            .eq("platform_account_id", channelId)
            .maybeSingle();

        if (lookupError) {
            console.error("Account lookup error: ", lookupError);
            return NextResponse.json(
                { error: "Failed to look up account" },
                { status: 500 }
            );
        }

        let accountId: string;

        if (existingAccount) {
            accountId = existingAccount.id;
            await supabaseAdmin
                .from("account")
                .update({name: channelTitle})
                .eq("id", accountId);
        } else {
            const { data: newAccount, error: insertError } = await supabaseAdmin
                .from("account")
                .insert({
                    client_id: partnerClientId,
                    platform: "youtube",
                    name: channelTitle,
                    platform_account_id: channelId,
                })
                .select("id")
                .single();
            
            if (insertError || !newAccount) {
                console.error("Account insert error: ", insertError);
                return NextResponse.json(
                    { error: "Failed to create account" },
                    { status: 500 }
                );
            }

            accountId = newAccount.id;
        }

        const tokenRow: Record<string, unknown> = {
            account_id: accountId,
            access_token: encrypt(accessToken),
            expires_at: expiresAt,
        };
        if (refreshToken) tokenRow.refresh_token = encrypt(refreshToken);

        const { error: tokenUpsertError } = await supabaseAdmin
            .from("oauth_token")
            .upsert(tokenRow, { onConflict: "account_id" });

        if (tokenUpsertError) {
            console.error("Token upsert error: ", tokenUpsertError);
            return NextResponse.json(
                { error: "Failed to store tokens" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: "YouTube account connected successfully",
            client_id: partnerClientId,
            account_id: accountId,
            channel_id: channelId,
            channel_title: channelTitle,
            has_refresh_token: Boolean(refreshToken),
        });

    } catch (error: any) {
        console.error("Server error", error)
        return NextResponse.json(
            { error: "Server error occured" },
            { status: 500 }
        );
    }
}
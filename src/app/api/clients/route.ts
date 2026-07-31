import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    let body: { name?: string };
    try {
        body = await request.json();
    } catch {
        return  NextResponse.json(
            { error: "Invalid JSON body" },
            { status: 400 }
        );
    }

    const name = body.name?.trim();
    if (!name) {
        return NextResponse.json(
            { error: "Name field is required" },
            { status: 400 }
        );
    }

    const { data, error } = await supabaseAdmin
        .from("client")
        .insert({ name })
        .select("id, name, created_at")
        .single();
    
    if (error) {
        console.error("Client insert error: ", error);
        return NextResponse.json(
            { error: "Failed to create client" },
            { status: 500 }
        );
    }

    return NextResponse.json(data, { status: 201 });
}
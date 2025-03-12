import { NextResponse } from "next/server";
import { insertCredential, getCredentials, updateCredentialState } from "@/lib/databases/database/credonDb"

export async function POST(req: Request) {
    try {
        const { label, connectionId, state } = await req.json();
        insertCredential(label, connectionId, state );
        return NextResponse.json({ message: "Credential stored successfully" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to insert credential" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const email = url.searchParams.get("email"); 
                
        let credentials = getCredentials();
        if (email) {
            credentials = credentials.filter((config: any) => config.email === email);
        }

        return NextResponse.json(credentials);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch credentials" }, { status: 500 });
    }
}


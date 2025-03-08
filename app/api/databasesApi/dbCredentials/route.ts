import { NextResponse } from "next/server";
import { insertCredential, getCredentials } from "@/lib/databases/database/credentialDb";

export async function POST(req: Request) {
    try {
        const { email, attributes } = await req.json();
        insertCredential(email, attributes);
        return NextResponse.json({ message: "Credential stored successfully" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to insert credential" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const credentials = getCredentials();
        return NextResponse.json(credentials);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch credentials" }, { status: 500 });
    }
}

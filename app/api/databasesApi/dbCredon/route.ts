import { NextResponse } from "next/server";
import { insertCredential, getCredentials, updateConnectionId, updateCredExchangeId, updateStatus, updateStatusLabel, updateEmail } from "@/lib/databases/database/credonDb"

export async function POST(req: Request) {
    try {
        const { label, email } = await req.json();
        insertCredential(label, email );
        return NextResponse.json({ message: "Credential stored successfully" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to insert credential" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const email = url.searchParams.get("email"); 
        const label = url.searchParams.get("label");

        let credentials = getCredentials(); // Fetch all credentials

        if (email) {
            credentials = credentials.filter((config: any) => config.email === email);
        }
        
        if (label) {
            credentials = credentials.filter((config: any) => config.label === label);
        }

        return NextResponse.json(credentials);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch credentials" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { email, connectionId, credExchangeId, status, label, newEmail } = await req.json();

        if (!label && !email) {
            return NextResponse.json({ error: "Label is required" }, { status: 400 });
        }

        let updated = false;

        if(newEmail) {
            updated = updateEmail(label, newEmail) || updated
        }

        if (connectionId) {
            updated = updateConnectionId(label, connectionId) || updated;
        }

        if (credExchangeId) {
            updated = updateCredExchangeId(label, credExchangeId) || updated;
        }

        if(status && label) {
            updated = updateStatusLabel(label, status) || updated;
        }

        if (status && email) {
            updated = updateStatus(email, status) || updated;
        }

        if (!updated) {
            return NextResponse.json({ message: "No changes made. The status might already be 'revoked'." }, { status: 200 });
        }

        return NextResponse.json({ message: "Update successful" });
    } catch (error) {
        console.error("PUT Error:", error);
        return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
    }
}
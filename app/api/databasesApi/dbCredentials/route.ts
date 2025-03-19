import { NextResponse } from "next/server";
import { insertCredential, getCredentials, updateConnectionId, updateCredExchangeId, updateStatus, updateLabel, updateEmailByLabel } from "@/lib/databases/database/credentialDb";

export async function POST(req: Request) {
    try {
        const { email, attributes } = await req.json();
        insertCredential(email, attributes);
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
        const { email, connectionId, newEmail, credExchangeId, status, label } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        let updated = false;

        if (label && newEmail) {
            updated = updateEmailByLabel(label, newEmail) || updated;
        }

        if (label) {
            updated = updateLabel(email, label) || updated;
        }

        if (connectionId) {
            updated = updateConnectionId(email, connectionId) || updated;
        }

        if (credExchangeId) {
            updated = updateCredExchangeId(email, credExchangeId) || updated;
        }

        if (status) {
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

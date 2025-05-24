import { NextResponse } from "next/server";
import { insertProofConfig, getProofConfig } from "@/lib/databases/database/proofConfig";

export async function POST(req: Request) {
    try {
        const { label, credDefId, attributes, predicates } = await req.json();

        if (!label || !credDefId || (!attributes && !predicates)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        insertProofConfig(label, credDefId, attributes ?? null, predicates ?? null);

        console.log("Received payload:", { label, credDefId, attributes, predicates });

        return NextResponse.json({ message: "Proof configuration stored successfully" });
    } catch (error) {
        console.error("Insert error:", error);
        return NextResponse.json({ error: "Failed to insert proof configuration" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const label = url.searchParams.get("label"); // Get label from query params
        
        let proofConfig = getProofConfig();
        
        if (label) {
            proofConfig = proofConfig.filter((config: any) => config.label === label);
        }

        return NextResponse.json(proofConfig);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch proof configuration" }, { status: 500 });
    }
}

import { getPresentProof } from "../../helper/helper.ts";

export interface ProofRequest {
    name: string;
    version: string;
    requested_attributes: Record<string, unknown>;
    requested_predicates: Record<string, unknown>;
}

const AGENT_2_URL = "http://localhost:11001";

export const sendPresentation = async (credentialId: string) => {
    try {
        let proofs = await getPresentProof(AGENT_2_URL);

        if (proofs.length === 0) {
            throw new Error("No proof requests found.");
        }

        let proofRequest = proofs.find(p => p.state === "request-received");

        if (!proofRequest) {
            throw new Error("No valid proof request found.");
        }

        const presentationId = proofRequest.pres_ex_id; 
        if (!presentationId) {
            throw new Error("pres_ex_id is undefined or invalid.");
        }

        const requestedAttributes = proofRequest.by_format?.pres_request?.indy?.requested_attributes || {};

        const requestedAttributesPayload = Object.keys(requestedAttributes).reduce((acc, key) => {
            acc[key] = {
                cred_id: credentialId,
                revealed: true
            };
            return acc;
        }, {} as Record<string, { cred_id: string; revealed: boolean }>);

        const presentationHolder = {
            indy: {
                requested_attributes: requestedAttributesPayload,
                requested_predicates: {}, 
                self_attested_attributes: {},
                trace: true
            },
            auto_remove: true,
        };

        console.log("Sending Presentation:", JSON.stringify(presentationHolder, null, 2));

        const response = await fetch(`${AGENT_2_URL}/present-proof-2.0/records/${presentationId}/send-presentation`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(presentationHolder),
        });

        const textResponse = await response.text();

        if (!response.ok) {
            throw new Error(`Failed to send presentation: ${textResponse}`);
        }

        return JSON.parse(textResponse);
    } catch (error) {
        console.error("❌ Error in sendPresentation:", error);
        return null;
    }
};

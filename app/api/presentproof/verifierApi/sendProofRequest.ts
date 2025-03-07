const VERIFIER_URL = "http://localhost:11002"; 

let storeAttributes: string[] = [];
let storedCredDefId: string | null = null; // Store Credential Definition ID

export const setVerificationAttributes = (attributes: string[]) => {
    storeAttributes = attributes;
    localStorage.setItem("storeAttributes", JSON.stringify(attributes));
};

export const getVerificationAttributes = () => {
    return JSON.parse(localStorage.getItem("storeAttributes") || "[]");
};

export const setCredentialDefinitionId = (credDefId: string) => {
    storedCredDefId = credDefId;
    localStorage.setItem("storedCredDefId", JSON.stringify(credDefId))
};

export const getCredDefinitionId = () => {
    return JSON.parse(localStorage.getItem("storedCredDefId") || "[]");
};

export const sendProofRequest = async (
    connectionId: string,
    proofRequestName: string,
) => {
    storeAttributes = getVerificationAttributes();
    storedCredDefId = getCredDefinitionId();
    
    if (storeAttributes.length === 0) {
        console.error("No attributes selected.");
        return null;
    }

    if (!storedCredDefId) {
        console.error("Credential Definition ID is not set.");
        return null;
    }

    const requested_attributes = storeAttributes.reduce((acc, attr) => {
        acc[attr] = {
            name: attr,
            restrictions: [{ cred_def_id: storedCredDefId }],
            non_revoked: { to: Math.floor(Date.now() / 1000) }
        };
        return acc;
    }, {} as Record<string, any>);

    const proofRequest = {
        comment: "Requesting proof dynamically",
        connection_id: connectionId,
        presentation_request: {
            indy: {
                name: proofRequestName, 
                version: "1.0", 
                requested_attributes,
                requested_predicates: {},
                non_revoked: { to: Math.floor(Date.now() / 1000) }
            }
        }
    };

    try {
        const response = await fetch(`${VERIFIER_URL}/present-proof-2.0/send-request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(proofRequest),
        });

        if (!response.ok) {
            throw new Error("Failed to send proof request.");
        }

        return await response.json();
    } catch (error) {
        console.error("Error in sendProofRequest:", error);
        return null;
    }
};

export const sendProofRequest = async (
    agentUrl: string,
    connectionId: string,
    proofRequestName: string,
    attributes: string[],
    credDefId: string,
) => {
    if (attributes.length === 0) {
        console.error("No attributes selected.");
        return null;
    }

    if (!credDefId) {
        console.error("Credential Definition ID is not set.");
        return null;
    }

    const requested_attributes = attributes.reduce((acc, attr) => {
        acc[attr] = {
            name: attr,
            restrictions: [{ cred_def_id: credDefId }],
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
        const response = await fetch(`${agentUrl}/present-proof-2.0/send-request`, {
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

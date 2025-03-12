export interface Connection {
    connection_id: string;
    state: string;
  }

  export const createInvitation = async (agentUrl: string): Promise<string | null> => {
    try {
      const response = await fetch(`${agentUrl}/out-of-band/create-invitation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handshake_protocols: ["https://didcomm.org/connections/1.0"],
          use_public_did: false,
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to create invitation: ${response.statusText}`);
      }
  
      const data = await response.json();
      return data.invitation_url || null;
    } catch (error) {
      console.error("Error creating invitation:", error);
      return null;
    }
  };

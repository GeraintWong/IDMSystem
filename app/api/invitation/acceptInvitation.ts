import { getConnections } from "../helper/helper.ts";

export interface Connection {
    connection_id: string;
    state: string;
}

export const acceptInvitation = async (agentUrl: string, invitation: object): Promise<boolean> => {
  try {
    const response = await fetch(`${agentUrl}/out-of-band/receive-invitation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invitation),
    });

    if (!response.ok) {
      throw new Error(`Failed to accept invitation: ${response.statusText}`);
    }

    let connections = await getConnections(agentUrl);
    let connection = connections.find((c) => c.state === "response");

    if (connection) {
      await sendTrustPing(agentUrl, connection.connection_id);
    }

    let retries = 3; 
    while (retries > 0) {
      connections = await getConnections(agentUrl);
      connection = connections.find((c) => c.state === "response");

      if (connection) {
        await sendTrustPing(agentUrl, connection.connection_id);
        return true; 
      }

      retries--;
      console.log("Retrying to send trust ping...");
      await new Promise((resolve) => setTimeout(resolve, 2000)); 
    }

    console.error("Failed to send trust ping after multiple attempts.");
    return false;
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return false;
  }
};

export const sendTrustPing = async (agentUrl: string, connectionId: string): Promise<void> => {
  try {
    await fetch(`${agentUrl}/connections/${connectionId}/send-ping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  
    console.log("Trust ping sent successfully!");
  } catch (error) {
    console.error("Error sending trust ping:", error);
  }
};
  
  
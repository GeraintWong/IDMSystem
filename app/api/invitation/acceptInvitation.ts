import { getConnections } from "../helper/helper.ts";

export interface Connection {
    connection_id: string;
    state: string;
}

export const acceptInvitation = async (agentUrl: string, invitation: object): Promise<boolean> => {
  try {
    // Accept the invitation
    const response = await fetch(`${agentUrl}/out-of-band/receive-invitation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invitation),
    });

    if (!response.ok) {
      throw new Error(`Failed to accept invitation: ${response.statusText}`);
    }

    // Wait for the connection to be created and fetch connections
    let connections = await getConnections(agentUrl);
    let connection = connections.find((c) => c.state === "response");

    if (connection) {
      // Send trust ping immediately
      await sendTrustPing(agentUrl, connection.connection_id);
    }

    // Retry logic: Ensure we fetch connections again and send ping if necessary
    let retries = 3; // Maximum number of retries
    while (retries > 0) {
      // Fetch connections again in case state has been updated
      connections = await getConnections(agentUrl);
      connection = connections.find((c) => c.state === "response");

      if (connection) {
        await sendTrustPing(agentUrl, connection.connection_id);
        return true; // Successfully sent trust ping and connection is active
      }

      retries--;
      console.log("Retrying to send trust ping...");
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
    }

    console.error("Failed to send trust ping after multiple attempts.");
    return false;
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return false;
  }
};

// Function to send a trust ping
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
  
  
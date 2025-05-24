export const revokeCredential = async (
  agentUrl: string,
  cred_ex_id: string,
  cred_def_id: string,
  publish: boolean = true,
  notify: boolean = false,
  notify_version: string = "v1_0",
  comment: string = ""
): Promise<boolean> => {
  try {
      const revocationRequest = {
          cred_ex_id,
          publish,
          notify,
          notify_version,
          comment,
      };

      const response = await fetch(`${agentUrl}/revocation/revoke`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(revocationRequest),
      });

      if (!response.ok) {
          throw new Error(`Failed to revoke credential: ${response.statusText}`);
      }

      console.log("Credential revoked successfully!");

      const walletWebhookUrl = "http://localhost:4000/webhook"; 
      const webhookPayload = {
          cred_def_id: cred_def_id,
          status: "revoked",
          reason: comment || "Credential revoked by issuer",
      };

      const webhookResponse = await fetch(walletWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
      });

      if (!webhookResponse.ok) {
          throw new Error(`Failed to send webhook to wallet: ${webhookResponse.statusText}`);
      }

      console.log("Webhook notification sent to wallet successfully!");
      return true;
  } catch (error) {
      console.error("Error revoking credential:", error);
      return false;
  }
};

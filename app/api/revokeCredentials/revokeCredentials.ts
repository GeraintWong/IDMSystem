export const revokeCredential = async (
    agentUrl: string,
    cred_ex_id: string,
    publish: boolean = true,
    notify: boolean = false,
    notify_version: string = "v1_0",
    comment: string = ""
  ): Promise<boolean> => {
    try {
      // Construct the request payload for revocation
      const revocationRequest = {
        cred_ex_id,
        publish,
        notify,
        notify_version,
        comment,
      };
  
      // Send request to revoke the credential
      const response = await fetch(`${agentUrl}/revocation/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(revocationRequest),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to revoke credential: ${response.statusText}`);
      }
  
      console.log("Credential revoked successfully!");
      return true;
    } catch (error) {
      console.error("Error revoking credential:", error);
      return false;
    }
  };
  
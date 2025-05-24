export interface CredentialProposal {
    comment?: string;
    connection_id: string;
    credential_preview: {
      "@type": string;
      attributes: Array<{
        name: string;
        mime_type: string;
        value: string;
      }>;
    };
    filter: {
      indy: {
        schema_id: string;
        cred_def_id: string;
      };
    };
    auto_remove: boolean;
  }

  const AGENT_2_URL = "http://localhost:11001";

  export const sendCredentialProposal = async (
    connectionId: string,
    credAttrs: Record<string, string>,
    comment: string = "",
    autoRemove: boolean = true,
    schemaId: string,
    credDefId: string,
  ): Promise<boolean> => {
    try {
      const credentialProposal: CredentialProposal = {
        connection_id: connectionId,
        comment,
        auto_remove: autoRemove,
        credential_preview: {
          "@type": "issue-credential/2.0/credential-preview",
          attributes: Object.entries(credAttrs).map(([name, value]) => ({
            name,
            mime_type: "plain/text", 
            value,
          })),
        },
        filter: {
          indy: {
            schema_id: schemaId,
            cred_def_id: credDefId,
          },
        },
      };
      
      const response = await fetch(`${AGENT_2_URL}/issue-credential-2.0/send-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentialProposal),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to send credential proposal: ${response.statusText}`);
      }
  
      console.log("Credential proposal sent successfully!");
      return true;
    } catch (error) {
      console.error("Error sending credential proposal:", error);
      return false;
    }
  };
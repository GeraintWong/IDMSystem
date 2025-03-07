export interface CredentialOffer {
    connection_id: string;
    comment?: string;
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
    trace?: boolean;
  }
  
  export const sendCredentialOffer = async (
    agentUrl: string,
    connectionId: string,
    credAttrs: Record<string, string>,
    comment: string = "",
    autoRemove: boolean = true,
    schemaId: string,
    credDefId: string,
    trace: boolean = false
  ): Promise<boolean> => {
    try {
      const credentialOffer: CredentialOffer = {
        connection_id: connectionId,
        comment,
        auto_remove: autoRemove,
        trace,
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
  
      const response = await fetch(`${agentUrl}/issue-credential-2.0/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentialOffer),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to send credential offer: ${response.statusText}`);
      }
  
      console.log("Credential offer sent successfully!");
      return true;
    } catch (error) {
      console.error("Error sending credential offer:", error);
      return false;
    }
  };
  
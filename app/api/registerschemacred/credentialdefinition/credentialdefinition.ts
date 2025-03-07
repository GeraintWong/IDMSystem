export interface CredentialDefinitionResponse {
    credential_definition_id: string;
}

export const createCredentialDefinition = async (
    agentUrl: string,
    schemaId: string,
    tag: string,
    supportRevocation: boolean,
    revocationRegistrySize?: number
  ): Promise<string | null> => {
    try {
      const body: any = {
        schema_id: schemaId,
        support_revocation: supportRevocation,
        tag: tag,
      };
  
      if (supportRevocation && revocationRegistrySize) {
        body.revocation_registry_size = revocationRegistrySize;
      }
  
      const response = await fetch(`${agentUrl}/credential-definitions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to create credential definition: ${response.statusText}`);
      }
  
      const data: CredentialDefinitionResponse = await response.json();
      return data.credential_definition_id || null;
    } catch (error) {
      console.error("Error creating credential definition:", error);
      return null;
    }
  };
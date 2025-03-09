import { Agent } from "http";

export interface Connection {
    connection_id: string;
    state: string;
    their_label: string;
}

export interface CredentialExchange {
  credential_exchange_id: string;
  state: string;
  credential_proposal: {
    attributes: { name: string; value: string }[];
  };
}

export interface PresentProof {
  pres_ex_id: string;  // Correct field for presentation exchange ID
  state: string;
  created_at: string;
  updated_at: string;
  connection_id: string;
  verified?: string;
  by_format?: {
    pres_request?: {
      indy?: {
        name: string;
        version: string;
        requested_attributes: Record<string, unknown>;
        requested_predicates: Record<string, unknown>;
      };
    };
    pres?: {
      indy?: {
        requested_proof?: {
          revealed_attrs?: {
            email?: {
              raw: string;
            }
          }
        }
      }
    }
  };
}


const ISSUER_AGENT_URL = "http://localhost:11000";
const HOLDER_AGENT_URL = "http://localhost:11001";
 
 export const getConnections = async (agentUrl: string): Promise<Connection[]> => {
    try {
      const response = await fetch(`${agentUrl}/connections`);
      if (!response.ok) {
        throw new Error(`Failed to fetch connections: ${response.statusText}`);
      }
  
      const data = await response.json();
      return data.results as Connection[]; // Explicitly cast response
    } catch (error) {
      console.error("Error fetching connections:", error);
      return [];
    }
  };

  export const getPresentProof = async (agentUrl: string): Promise<PresentProof[]> => {
    try {
      const response = await fetch(`${agentUrl}/present-proof-2.0/records`);
      if (!response.ok) {
        throw new Error(`Failed to fetch present-proof records: ${response.statusText}`);
      }
  
      const data = await response.json();
      return data.results as PresentProof[]; // Explicitly cast response
    } catch (error) {
      console.error("Error fetching present-proof records:", error);
      return [];
    }
  };

  export const getCredentialExchangeId = async (agentUrl: string): Promise<{ id: string; attributes: { name: string; value: string }[] } | null> => {
    try {
      const response = await fetch(`${agentUrl}/issue-credential-2.0/records`);
      if (!response.ok) {
        throw new Error(`Failed to fetch issue-credentials records: ${response.statusText}`);
      }
  
      const data = await response.json();
      const records: CredentialExchange[] = data.results || [];
  
      // Find a record that is in a state requiring an offer to be sent
      const pendingRecord = records.find(record => record.state === "proposal_received");
  
      if (!pendingRecord) {
        console.log("No pending credential exchange found.");
        return null;
      }
  
      const { credential_exchange_id, credential_proposal } = pendingRecord;
      const attributes = credential_proposal?.attributes || [];
  
      console.log(`Credential Exchange ID: ${credential_exchange_id}`);
      console.log("Attributes received from holder:", attributes);
  
      return { id: credential_exchange_id, attributes };
    } catch (error) {
      console.error("Error fetching issue-credentials records:", error);
      return null;
    }
  };

  export const deletePresentProof = async (agentUrl: string, presExId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${agentUrl}/present-proof-2.0/records/${presExId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
  
      if (!response.ok) {
        console.error(`❌ Failed to delete proof record: ${response.statusText}`);
        return false;
      }
  
      console.log(`✅ Successfully deleted proof record with ID: ${presExId}`);
      return true;
    } catch (error) {
      console.error("❌ Error deleting proof record:", error);
      return false;
    }
  };  

  export const fetchSchemaAndCredDefIds = async (agentUrl: string,): Promise<{
    schemaIds: string[];
    schemaDetails: { schemaId: string; schemaName: string; attributes: string[] }[]; // Add attributes
    credDefIds: string[];
  }> => {
    try {
      // Fetch the created schemas from the Issuer agent
      const schemaResponse = await fetch(`${agentUrl}/schemas/created`);
      if (!schemaResponse.ok) {
        throw new Error(`Failed to fetch schemas: ${schemaResponse.statusText}`);
      }
      const schemaData: { schema_ids: string[] } = await schemaResponse.json();
      console.log("Schema Data:", schemaData);
  
      // Check if schema_ids exist and are not empty
      if (!schemaData.schema_ids || schemaData.schema_ids.length === 0) {
        throw new Error("No schema IDs found");
      }
      const schemaIds: string[] = schemaData.schema_ids;
  
      // Fetch schema details for each schema ID
      const schemaDetails = await Promise.all(
        schemaIds.map(async (schemaId: string) => {
          const schemaDetailResponse = await fetch(`${agentUrl}/schemas/${schemaId}`);
          if (!schemaDetailResponse.ok) {
            throw new Error(`Failed to fetch schema details for ${schemaId}: ${schemaDetailResponse.statusText}`);
          }
          const schemaDetailData: { schema: { name: string; attrNames: string[] } } = await schemaDetailResponse.json();
          console.log(`Schema Detail Data for ${schemaId}:`, schemaDetailData);
  
          return {
            schemaId,
            schemaName: schemaDetailData.schema.name || "Unknown Schema",
            attributes: schemaDetailData.schema.attrNames || [], 
          };
        })
      );

        // Fetch the created credential definitions
        const credDefResponse = await fetch(`${agentUrl}/credential-definitions/created`);
        if (!credDefResponse.ok) {
            throw new Error(`Failed to fetch credential definitions: ${credDefResponse.statusText}`);
        }
        const credDefData: { credential_definition_ids: string[] } = await credDefResponse.json();
        console.log("Credential Definition Data:", credDefData);

        // Check if credential_definition_ids exist and are not empty
        if (!credDefData.credential_definition_ids || credDefData.credential_definition_ids.length === 0) {
            throw new Error("No credential definition IDs found");
        }
        const credDefIds: string[] = credDefData.credential_definition_ids;

        return { schemaIds, schemaDetails, credDefIds };
    } catch (error) {
        console.error("Error fetching schema, name, and cred_def_ids:", error);
        throw error;
    }
};

// Fetch attributes based on schema or credential definition
export const fetchCredentialAttributesFromIssuer = async (credDefId: string): Promise<string[]> => {
  try {
      // Assuming the ISSUER_AGENT_URL provides an endpoint for credential definition details
      const credDefDetailResponse = await fetch(`${ISSUER_AGENT_URL}/credential-definitions/${credDefId}`);
      if (!credDefDetailResponse.ok) {
          throw new Error(`Failed to fetch credential definition details for ${credDefId}: ${credDefDetailResponse.statusText}`);
      }

      const credDefDetailData = await credDefDetailResponse.json();
      console.log(`Credential Definition Data for ${credDefId}:`, credDefDetailData);

      // Assuming the credential definition contains the list of attributes
      const attributes = credDefDetailData.credential_definition.attributes || [];
      return attributes; // Return attributes associated with the credential definition
  } catch (error) {
      console.error(`Error fetching credential attributes from issuer for ${credDefId}:`, error);
      return [];
  }
};

// Function to get schema and credential definition details and attributes
export const getSchemaAndAttributes = async (agentUrl: string) => {
  try {
      const { schemaIds, schemaDetails, credDefIds } = await fetchSchemaAndCredDefIds(agentUrl);

      // Fetch credential attributes for each credential definition ID
      const allAttributesPromises = credDefIds.map(async (credDefId) => {
          const attributes = await fetchCredentialAttributesFromIssuer(credDefId);
          return { credDefId, attributes };
      });

      const allAttributes = await Promise.all(allAttributesPromises);

      // Log or return schema and credential details along with attributes
      return {
          schemaIds,
          schemaDetails,
          credentialDefinitions: allAttributes,
      };
  } catch (error) {
      console.error("Error fetching schema and credential details:", error);
  }
};

export const getWalletCredentialId = async (): Promise<{ referent: string; cred_def_id: string }[]> => {
  try {
    const walletCredentialResponse = await fetch(`${HOLDER_AGENT_URL}/credentials`);

    if (!walletCredentialResponse.ok) {
      throw new Error("Failed to fetch credentials");
    }

    const data = await walletCredentialResponse.json();

    if (!data.results || data.results.length === 0) {
      throw new Error("No results found");
    }

    // Return both referent and cred_def_id
    return data.results.map((cred: { referent: string; cred_def_id: string }) => ({
      referent: cred.referent,
      cred_def_id: cred.cred_def_id,
    }));
  } catch (error) {
    console.error("Error fetching wallet credential ID:", error);
    return [];
  }
};

let currentConnectionIdOCR = "";

export const setConnectionIdOCR = (connectionIdOCR: string) => {
  currentConnectionIdOCR = connectionIdOCR;
};

export const getConnectionIdOCR = () => {
  return currentConnectionIdOCR;
};





  
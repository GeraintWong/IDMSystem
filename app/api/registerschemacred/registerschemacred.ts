import { createSchema } from "./schema/schema";
import { createCredentialDefinition } from "./credentialdefinition/credentialdefinition";

export const registerSchemaAndCredDef = async (
    agentUrl: string,
    schemaName: string,
    attributes: string[],
    revocation: boolean,
  ): Promise<{ schema_id: string; cred_def_id: string } | null> => {
    const version = `${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 100)}`;
    const schemaId = await createSchema(agentUrl, schemaName, version, attributes);
  
    if (!schemaId) {
      console.error("Failed to create schema.");
      return null;
    }
  
    console.log(`Schema created with ID: ${schemaId}`);
  
    const credDefId = await createCredentialDefinition(
      agentUrl,
      schemaId,
      schemaName.replace(" ", "_"),
      revocation,
      revocation ? 1000 : undefined
    );
  
    if (!credDefId) {
      console.error("Failed to create credential definition.");
      return null;
    }
  
    console.log(`Credential Definition created with ID: ${credDefId}`);
  
    return { schema_id: schemaId, cred_def_id: credDefId };
  };
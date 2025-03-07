export interface SchemaResponse {
    schema_id: string;
}

export const createSchema = async (
    agentUrl: string,
    schemaName: string,
    version: string,
    attributes: string[]
  ): Promise<string | null> => {
    try {
      const response = await fetch(`${agentUrl}/schemas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema_name: schemaName,
          schema_version: version,
          attributes: attributes,
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to create schema: ${response.statusText}`);
      }
  
      const data: SchemaResponse = await response.json();
      return data.schema_id || null;
    } catch (error) {
      console.error("Error creating schema:", error);
      return null;
    }
  };
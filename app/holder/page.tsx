"use client"
import React, { useEffect, useState } from "react";
import { acceptInvitation } from "../api/invitation/acceptInvitation";
import { getConnections, Connection } from "../api/helper/helper";
import { sendCredential } from "../api/issueCredentials/sendCredential/sendCredential";
import { fetchSchemaAndCredDefIds, getWalletCredentialId } from "../api/helper/helper"; // Assuming you have a function to fetch schema and credential definitions

const Holder: React.FC = () => {
  const [connections, setConnections] = useState<string[]>([]);
  const [invitationUrl, setInvitationUrl] = useState("");
  const [invitationJson, setInvitationJson] = useState<object | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
  const [selectedCredDef, setSelectedCredDef] = useState<string | null>(null);
  const [schemaId, setSchemaId] = useState<string | null>(null);
  const [credDefId, setCredDefId] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [connectionId, setConnectionId] = useState<string>("");
  const [schemas, setSchemas] = useState<{ schemaId: string; schemaName: string; schemaAttribute: string[]; }[]>([]);
  const [credentialDefinitions, setCredentialDefinitions] = useState<string[]>([]);
  const [credentialId, setCredentialId] = useState<string>("");

  const [formData, setFormData] = useState<{ [key: string]: string }>({});

  const ISSUER_URL = "http://localhost:11000"

  // Fetch connections and schema/credential data on mount
  useEffect(() => {
    fetchConnections();
    fetchSchemaAndCredDefIds(ISSUER_URL);
  }, []);

  // Fetch connections from both issuer and holder
  const fetchConnections = async () => {
    try {
      const holderConnections = await getConnections("http://localhost:11001");
      setConnections([
        ...holderConnections.map((c: Connection) => `${c.their_label}: ${c.state}`),
      ]);
      setConnectionId(holderConnections[0].connection_id);
    } catch (error) {
      console.error("Error fetching connections:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchSchemaAndCredDefIds(ISSUER_URL);
        const combinedDetails = data.schemaDetails.map((schema, index) => ({
          schemaId: schema.schemaId,
          schemaName: schema.schemaName,
          schemaAttribute: schema.attributes,
          credDefId: data.credDefIds[index] || "No Credential Definition",
        }));
  
        setSchemas(combinedDetails); // Store combined details in state
      } catch (error) {
        console.error("Failed to fetch schema details:", error);
      }
    };
  
    fetchData(); // Call fetchData function
  }, []);

  // useEffect(() => {
  //   const fetchWalletCredentialId = async () => {
  //     try {
  //       const credentialId = await getWalletCredentialId();
  //       console.log("Wallet Credential ID:", credentialId);
  //       setCredentialId(credentialId);
  //     } catch (error) {
  //       console.error("Error fetching Wallet Credential ID:", error);
  //     }
  //   };
  
  //   fetchWalletCredentialId();
  // }, []);

  // Accept invitation handler
  const handleAcceptInvitation = async () => {
    try {
      const encodedUrl = invitationUrl.split("oob=")[1];
      if (!encodedUrl) {
        console.error("Invalid invitation URL.");
        return;
      }

      // Decode URL and base64 data
      const decodedUrl = decodeURIComponent(encodedUrl);
      const base64Url = decodedUrl.replace(/-/g, '+').replace(/_/g, '/'); // Handle URL-safe base64

      const invitationData = JSON.parse(atob(base64Url)); // Decode base64 to JSON
      setInvitationJson(invitationData);

      // If invitation data is valid, accept the invitation
      if (invitationData) {
        const success = await acceptInvitation(invitationData);
        if (success) {
          console.log("Invitation accepted successfully!");
          fetchConnections();
          setInvitationUrl(""); // Clear URL input after success
        } else {
          console.error("Failed to accept invitation.");
        }
      } else {
        console.error("No invitation data found.");
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
    }
  };

  const handleAttributeChange = (attribute: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [attribute]: value,
    }));
  };

  // Handle credential proposal submission
  const handleSendCredentialProposal = async () => {
    if (!connectionId || !schemaId || !credDefId) {
      console.error("Connection ID, Name, Age, and Credential Definition ID are required");
      return;
    }

    const credAttrs = { ...formData };

    try {
      await sendCredential(connectionId, credAttrs, "", false, schemaId, credDefId);
      console.log("Credential proposal sent successfully!");
    } catch (error) {
      console.error("Error sending credential proposal:", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900 text-white p-6">
    {/* Left Section: Connections */}
    <div className="w-1/3 p-6 bg-gray-800 rounded-lg shadow-lg overflow-y-auto">
      <h2 className="text-xl font-semibold mb-4 text-center">New Connections</h2>
      
      {/* Input Field for Invitation URL */}
      <input
        type="text"
        placeholder="Enter invitation URL"
        value={invitationUrl}
        onChange={(e) => setInvitationUrl(e.target.value)}
        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      {/* Connect Button */}
      <button
        onClick={handleAcceptInvitation}
        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition duration-200"
      >
        Connect
      </button>
      
      {/* Connections List */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold">Connections:</h2>
        <ul className="mt-2">
          {connections.length > 0 ? (
            connections.map((conn, index) => (
              <li key={index} className="border-b border-gray-700 py-2">{conn}</li>
            ))
          ) : (
            <p className="text-gray-400">No connections found</p>
          )}
        </ul>
      </div>
    </div>
    
    {/* Right Section: Schema & Credentials */}
    <div className="w-1/3 ml-auto p-6 bg-gray-800 rounded-lg shadow-lg overflow-y-auto max-h">
      <h2 className="text-xl font-semibold mb-4">Select Credential</h2>
      <select
        value={selectedSchema || ""}
        onChange={(e) => setSelectedSchema(e.target.value)}
        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select a schema</option>
        {schemas.map((schema) => (
          <option key={schema.schemaId} value={schema.schemaId}>
            {schema.schemaName}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Enter Schema ID"
        value={schemaId || ""}
        onChange={(e) => setSchemaId(e.target.value)}
        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <input
        type="text"
        placeholder="Enter Credential Definition ID"
        value={credDefId || ""}
        onChange={(e) => setCredDefId(e.target.value)}
        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      {/* Dynamic Inputs for Attributes */}
      {selectedSchema && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Enter Credentials</h2>
          <div className="mt-2">
            {schemas
              .filter((schema) => schema.schemaId === selectedSchema)
              .map((schema) => (
                <div key={schema.schemaId}>
                  {[...schema.schemaAttribute].reverse().map((attribute, index) => (
                    <div key={index} className="mb-4">
                      <input
                        type="text"
                        placeholder={attribute}
                        value={formData[attribute] || ""}
                        onChange={(e) => handleAttributeChange(attribute, e.target.value)}
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </div>
      )}
      
      {/* Submit Button */}
      <button
        onClick={handleSendCredentialProposal}
        className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition duration-200"
      >
        Send Credential Proposal
      </button>
      {credentialId && (
  <div className="mt-4 p-3 bg-gray-700 border border-gray-600 rounded-md">
    <h3 className="text-lg font-semibold">Credential ID:</h3>
    <p className="text-white">{credentialId}</p>
  </div>
)}
    </div>
  </div>
);
  
};

export default Holder;
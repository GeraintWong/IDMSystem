"use client";

import React, { useEffect, useState } from "react";
import { createInvitation } from "@/app/api/invitation/createInvitation";
import { Button } from "@/components/ui/button";
import { fetchSchemaAndCredDefIds, getConnections, getPresentProof, deletePresentProof } from "@/app/api/helper/helper";
import { sendProofRequest } from "@/app/api/presentproof/verifierApi/sendProofRequest";
import { sendCredential } from "@/app/api/issueCredentials/sendCredential/sendCredential";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ClipboardCopy, Loader2 } from "lucide-react"; // Icons

const ISSUER_URL = "http://localhost:11003"

const IssuerExternal: React.FC = () => {
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [schemaDetails, setSchemaDetails] = useState<
    { schemaId: string; schemaName: string; credDefId: string }[] | null
  >(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [presExId, setPresExId] = useState<string | null>(null);
  const [proofState, setProofState] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [proofCredDefId, setProofCredDefId] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchSchemaAndCredDefIds(ISSUER_URL);

        // Combine schema details with credential definition IDs
        const combinedDetails = data.schemaDetails.map((schema, index) => ({
          schemaId: schema.schemaId,
          schemaName: schema.schemaName,
          credDefId: data.credDefIds[index] || "No Credential Definition",
        }));

        setSchemaDetails(combinedDetails);
      } catch (error) {
        console.error("Failed to fetch schema details:", error);
      }
    };

    fetchData();
  }, []);


  const handleLoginWithWallet = async () => {
    setLoading(true);
    try {
      const url = await createInvitation(ISSUER_URL);
      console.log("🎟️ Generated Invitation URL:", url);
      window.postMessage({ type: "LOGIN_REQUEST" }, "*");

      if (url) {
        window.postMessage({ type: "ARIES_INVITATION", payload: url }, "*");
      } else {
        console.error("🚨 Failed to create invitation.");
      }
    } catch (error) {
      console.error("❌ Error generating invitation:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      console.log("📩 Received message:", event.data);

      if (event.data?.data?.type === "ARIES_CONNECTION_RESULT" && event.data.data.success) {
        try {
          const connections = await getConnections(ISSUER_URL);
          const connection = connections.find((c) => c.their_label === event.data.data.label);

          if (connection) {
            const connectionId = connection.connection_id;
            setConnectionId(connectionId);
            console.log(`🔗 Found connection ID: ${connectionId}`);

            const getAttributesCredDefIdSpecific = await fetch("/api/databasesApi/dbProofConfig?label=Issuer2"); // Fetch based on label
            if (!getAttributesCredDefIdSpecific.ok) throw new Error("Failed to fetch config");
            const getAttributesCredDefId= await getAttributesCredDefIdSpecific.json();

            if (getAttributesCredDefId && getAttributesCredDefId.length > 0) {
              const latestConfig = getAttributesCredDefId[getAttributesCredDefId.length - 1]; // Get the latest saved config
              await sendProofRequest(ISSUER_URL, connectionId, "Proof", latestConfig.attributes, latestConfig.credDefId);
          }
            window.postMessage({ type: "ARIES_PROOF_REQUEST" });

            const proofRecords = await getPresentProof(ISSUER_URL);
            const proof = proofRecords.find((p) => p.connection_id === connectionId);

            if (proof) {
              setPresExId(proof.pres_ex_id);
              setProofState(proof.state);
              console.log(`✅ Proof Exchange ID stored: ${proof.pres_ex_id}`);
            } else {
              console.warn("🚨 No proof record found for this connection.");
            }
          } else {
            console.warn("🚨 No valid connection found for label:", event.data.data.label);
          }
        } catch (error) {
          console.error("❌ Error processing connection:", error);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    const checkProofStatus = async () => {
      if (presExId) {
        try {
          const proofRecords = await getPresentProof(ISSUER_URL);
          const proof = proofRecords.find((p) => p.pres_ex_id === presExId);

          if (proof) {
            setProofState(proof.state);

            if (proof.state === "done") {
              setIsVerified(proof.verified === "true");
              console.log(`🔍 Proof verification status: ${proof.verified}`);

              if (proof.verified === "true") {
                console.log("✅ Proof verified! Redirecting...");

                const userEmail = proof.by_format?.pres?.indy?.requested_proof?.revealed_attrs?.email?.raw;
                console.log("here is the user's email", userEmail)

                const getHolderInformation = await fetch(`/api/databasesApi/dbCredentials?email=${userEmail}`);
                const userInformation = await getHolderInformation.json();
                const fetchSchemaAndCred = await fetchSchemaAndCredDefIds(ISSUER_URL);
                const fetchedCredDefId = fetchSchemaAndCred.credDefIds[0];
                const holderConnectionId = proof.connection_id

                if (!fetchedCredDefId) {
                  console.error("Credential Definition ID is missing.");
                  return;
                }

                await sendCredential(ISSUER_URL, holderConnectionId, userInformation[0].attributes, "", false, fetchSchemaAndCred.schemaDetails[0].schemaId, fetchedCredDefId, false);

                // Delete proof record after successful verification
                await deletePresentProof(ISSUER_URL, presExId);
              }
            }
          }
        } catch (error) {
          console.error("❌ Error checking proof status:", error);
        }
      }
    };

    const interval = presExId && proofState !== "done" ? setInterval(checkProofStatus, 3000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [presExId, proofState]);

  return (
    <div className="flex min-h-screen bg-gray-900 text-white p-6">
      {/* Left Section: Schema List */}
      <div className="w-1/3 p-6 bg-gray-800 rounded-lg shadow-lg overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Schema & Credential Info</h2>
        <ul>
          {schemaDetails && schemaDetails.length > 0 ? (
            schemaDetails.map((schema, index) => (
              <li key={index} className="p-3 border-b border-gray-700">
                <span className="block font-semibold">{schema.schemaName}</span>
                <span className="block text-sm text-gray-400">Schema ID: {schema.schemaId}</span>
                <span className="block text-sm text-gray-400">Cred Def ID: {schema.credDefId}</span>
              </li>
            ))
          ) : (
            <p>Loading schema details...</p>
          )}
        </ul>
      </div>
      <Button onClick={handleLoginWithWallet} disabled={loading} className="px-6 py-3 text-lg">
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Connecting...
          </span>
        ) : (
          "Login with Aries Wallet"
        )}
      </Button>
    </div>
  );
};

export default IssuerExternal;

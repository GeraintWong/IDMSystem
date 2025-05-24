"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getConnections, getPresentProof, deletePresentProof, setConnectionIdOCR, deleteConnections } from "@/app/api/helper/helper";
import { createInvitation } from "@/app/api/invitation/createInvitation";
import { sendProofRequest } from "@/app/api/presentproof/verifierApi/sendProofRequest";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const ISSUER_URL = "http://localhost:11004";

const OCRExternal: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [connectionId, setConnectionId] = useState("")
  const [presExId, setPresExId] = useState<string | null>(null);
  const [proofState, setProofState] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  const router = useRouter();

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
            setConnectionIdOCR(connectionId)
            console.log(`Found connection ID: ${connectionId}`);

            const getAttributesCredDefIdSpecific = await fetch("/api/databasesApi/dbProofConfig?label=Issuer2"); // Fetch based on label
            if (!getAttributesCredDefIdSpecific.ok) throw new Error("Failed to fetch config");
            const getAttributesCredDefId = await getAttributesCredDefIdSpecific.json();

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
              console.log(`Proof Exchange ID stored: ${proof.pres_ex_id}`);
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

                // Delete proof record after successful verification
                await deletePresentProof(ISSUER_URL, presExId);
                // Redirect to verifiedWebsite.tsx
                router.push("/issuerOCRCredential/OCR");
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-indigo-800 text-white flex">
            {/* Left Side (University Information) */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-r from-blue-700 to-blue-600 p-12 flex flex-col justify-center items-center">
                <div className="text-center">
                <div className="text-4xl font-bold mb-6 text-white animate-scale-fade custom-company-font">LUXIN UNIVERSITY</div>
                    <h2 className="text-3xl font-semibold mb-4">Obtain an online LUXIN Credential</h2>
                    <p className="text-lg text-gray-300">
                        Sign in with your Credon to securely receive your official Luxin credential.
                    </p>
                    <p className="mt-4 text-sm text-gray-400">
                        This process ensures secure and verifiable credential issuance.
                    </p>
                </div>
            </div>

            {/* Right Side (Login Form) */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-16">
                <div className="max-w-md w-full">
                    <h3 className="text-2xl font-semibold mb-6 text-center">Sign In</h3>
                    <Button
                        onClick={handleLoginWithWallet}
                        disabled={loading}
                        className="w-full px-6 py-3 text-lg bg-yellow-500 hover:bg-yellow-600 text-indigo-900 font-semibold"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Connecting...
                            </span>
                        ) : (
                            "Sign In with Credon"
                        )}
                    </Button>
                </div>
            </div>
        </div>
  );
};

export default OCRExternal;

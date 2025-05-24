"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getConnections, getPresentProof, deletePresentProof, deleteConnections } from "@/app/api/helper/helper";
import { createInvitation } from "@/app/api/invitation/createInvitation";
import { sendProofRequest } from "@/app/api/presentproof/verifierApi/sendProofRequest";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const VERIFIER_URL = "http://localhost:11002";

const VerifierExternal: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [connectionId, setConnectionId] = useState("")
  const [presExId, setPresExId] = useState<string | null>(null);
  const [proofState, setProofState] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  const router = useRouter();

  const handleLoginWithWallet = async () => {
    setLoading(true);
    try {
      const url = await createInvitation(VERIFIER_URL);
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
          const connections = await getConnections(VERIFIER_URL);
          const connection = connections.find((c) => c.their_label === event.data.data.label);

          if (connection) {
            const connectionId = connection.connection_id;
            setConnectionId(connectionId);
            console.log(`🔗 Found connection ID: ${connectionId}`);

            const getAttributesCredDefIdSpecific = await fetch("/api/databasesApi/dbProofConfig?label=Verifier1"); // Fetch based on label
            if (!getAttributesCredDefIdSpecific.ok) throw new Error("Failed to fetch config");
            const getAttributesCredDefId = await getAttributesCredDefIdSpecific.json();

            if (getAttributesCredDefId && getAttributesCredDefId.length > 0) {
              const latestConfig = getAttributesCredDefId[getAttributesCredDefId.length - 1]; // Get the latest saved config
              const formattedPredicates = {
                ["Age"]: {
                  name: latestConfig.predicates.attribute,
                  p_type: latestConfig.predicates.operation,
                  p_value: latestConfig.predicates.p_value,
                }
              };
              await sendProofRequest(VERIFIER_URL, connectionId, "Proof", latestConfig.attributes, latestConfig.credDefId, formattedPredicates);
            }
            window.postMessage({ type: "ARIES_PROOF_REQUEST" });

            const proofRecords = await getPresentProof(VERIFIER_URL);
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
          const proofRecords = await getPresentProof(VERIFIER_URL);
          const proof = proofRecords.find((p) => p.pres_ex_id === presExId);

          if (proof) {
            setProofState(proof.state);

            if (proof.state === "done") {
              setIsVerified(proof.verified === "true");
              console.log(`🔍 Proof verification status: ${proof.verified}`);

              if (proof.verified === "true") {
                console.log("✅ Proof verified! Redirecting...");

                // Delete proof record after successful verification
                await deletePresentProof(VERIFIER_URL, presExId);
                await deleteConnections(VERIFIER_URL, connectionId)

                // Redirect to verifiedWebsite.tsx
                router.push("/verifier/verifiedWebsite");
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex">
      {/* Left Side (Branding/Information) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-r from-blue-900 to-blue-800 p-12 flex flex-col justify-center items-center">
        <div className="text-center">
        <div className="text-4xl font-bold mb-6 text-white animate-scale-fade custom-company-font">NEXORA</div>
          <h2 className="text-3xl font-semibold mb-4">Secure Login with Credon</h2>
          <p className="text-lg text-gray-300">
            Access your account securely using Credon. Experience seamless and private authentication.
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
            className="w-full px-6 py-3 text-lg bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Connecting...
              </span>
            ) : (
              "Login with Credon"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VerifierExternal;

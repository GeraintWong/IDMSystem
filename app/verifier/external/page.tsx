"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getConnections, getPresentProof, deletePresentProof } from "@/app/api/helper/helper";
import { createInvitation } from "@/app/api/invitation/createInvitation";
import { sendProofRequest } from "@/app/api/presentproof/verifierApi/sendProofRequest";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const VERIFIER_URL = "http://localhost:11002";

const VerifierExternal: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [presExId, setPresExId] = useState<string | null>(null);
  const [proofState, setProofState] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  const router = useRouter();

  const handleLoginWithWallet = async () => {
    setLoading(true);
    try {
      const url = await createInvitation(VERIFIER_URL);
      console.log("🎟️ Generated Invitation URL:", url);

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

            await sendProofRequest(VERIFIER_URL, connectionId, "Proof");
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
    <div className="flex min-h-screen bg-gray-900 text-white p-6">
      <div className="flex-1 flex flex-col justify-center items-center">
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

        {presExId && <p className="mt-4">Proof Exchange ID: {presExId}</p>}
        {proofState && <p className="mt-2">Proof State: {proofState}</p>}
        {isVerified !== null && (
          <p className="mt-2">
            Credential Verified: {isVerified ? "✅ Yes" : "❌ No"}
          </p>
        )}
      </div>
    </div>
  );
};

export default VerifierExternal;

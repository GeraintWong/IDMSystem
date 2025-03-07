"use client";

import React, { useEffect, useState } from "react";
import { createInvitation } from "@/app/api/invitation/createInvitation";
import { Button } from "@/components/ui/button";
import { fetchSchemaAndCredDefIds } from "@/app/api/helper/helper";
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

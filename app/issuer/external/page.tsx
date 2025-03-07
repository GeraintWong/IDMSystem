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

const ISSUER_URL = "http://localhost:11000"

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


  const handleCreateInvitation = async () => {
    setLoading(true);
    try {
      const url = await createInvitation(ISSUER_URL);
      if (url) {
        setInvitationUrl(url);
      } else {
        console.error("Failed to create invitation.");
      }
    } catch (error) {
      console.error("Error generating invitation:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (invitationUrl) {
      navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
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

      {/* Right Section: Main Content */}
      <div className="flex-1 flex flex-col justify-between pl-6">
        {/* Top Right: Generate Connection Code Button */}
        <div className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button onClick={handleCreateInvitation} disabled={loading} className="px-6 py-3 text-lg">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating...
                  </span>
                ) : (
                  "Generate Connection Code"
                )}
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="max-w-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg font-semibold">Connection Code</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-gray-600">
                  Copy and share this code to establish a connection.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="relative w-full p-4 bg-gray-100 rounded-lg border border-gray-300 max-h-60 overflow-auto shadow-inner">
                {invitationUrl ? (
                  <pre className="text-xs font-mono whitespace-pre-wrap break-words text-gray-900">{invitationUrl}</pre>
                ) : (
                  <p className="text-gray-500 text-sm italic">No connection code generated yet.</p>
                )}

                {invitationUrl && (
                  <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-1.5 bg-white rounded-full border border-gray-300 shadow-sm hover:bg-gray-200 transition duration-200"
                    aria-label="Copy to clipboard"
                  >
                    <ClipboardCopy className="h-5 w-5 text-gray-600" />
                  </button>
                )}
              </div>

              {copied && <p className="text-green-600 text-sm text-center mt-2">Copied to clipboard!</p>}

              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Done</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default IssuerExternal;

"use client";

import React, { useEffect, useState } from "react";
import { createInvitation } from "@/app/api/invitation/createInvitation";
import { Button } from "@/components/ui/button";
import { fetchSchemaAndCredDefIds, getConnections, getPresentProof, deletePresentProof, getIssueCredential, deleteIssueCredential, deleteConnections } from "@/app/api/helper/helper";
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
import { CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardCopy, Loader2, AlertTriangle, Info, PencilIcon, UploadIcon, ShieldCheck, IdCard } from "lucide-react"; // Icons

const ISSUER_URL = "http://localhost:11003"

const IssuerExternal: React.FC = () => {
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [schemaDetails, setSchemaDetails] = useState<
    { schemaId: string; schemaName: string; credDefId: string }[] | null
  >(null);
  const [connectionId, setConnectionId] = useState("");
  const [extraConnectionId, setExtraConnectionId] = useState("")
  const [presExId, setPresExId] = useState<string | null>(null);
  const [proofState, setProofState] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [proofCredDefId, setProofCredDefId] = useState("");
  const [holderLabel, setHolderLabel] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isValidOpen, setIsValidOpen] = useState(false)
  const [schemaAttributes, setSchemaAttributes] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false)
  const [showDeveloperTools, setShowDeveloperTools] = useState(false);
  const [showDeveloperToolsDialog, setShowDeveloperToolsDialog] = useState(false);
  const [userEmail, setUserEmail] = useState("");

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

  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const data = await fetchSchemaAndCredDefIds(ISSUER_URL);
        if (data.schemaDetails.length > 0) {
          setSchemaAttributes(data.schemaDetails[0].attributes);
        }
      } catch (error) {
        console.error("Error fetching schema attributes:", error);
      }
    };
    fetchAttributes();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, attr: string) => {
    setFormData((prev) => ({ ...prev, [attr]: e.target.value }));
  };

  const handleSubmit = async (label: string) => {
    try {
      await fetch("/api/databasesApi/dbCredentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: label, attributes: formData }), // Save formData
      });

    } catch (error) {
      console.error("Error storing credentials:", error);
    }
  };


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
          setHolderLabel(event.data.data.label)

          if (connection) {
            const getConnectionId = connection.connection_id;

            const getHolderCredon = await fetch(`/api/databasesApi/dbCredentials?label=${event.data.data.label}`);
            const userInformation  = await getHolderCredon.json()

            // if (userInformation.length === 0) {
            //   setIsInputOpen(true);
            //   deleteConnections(ISSUER_URL, getConnectionId)
            //   return;
            // }

            if (userInformation.length === 0) {
              console.log("🔍 Sending to API:", { label: event.data.data.label, getConnectionId });
              setConnectionId(getConnectionId);
              console.log(`🔗 Found connection ID: ${getConnectionId}`);
            } else {
              const getExtraConnections = await getConnections(ISSUER_URL);
              const extraConnection = getExtraConnections.find((c) => c.connection_id !== userInformation[0].connectionId);
              const getExtraConnectionId = extraConnection?.connection_id ?? ""
              setExtraConnectionId(getExtraConnectionId)
              setConnectionId(userInformation[0].connectionId)
            }

            const getAttributesCredDefIdSpecific = await fetch("/api/databasesApi/dbProofConfig?label=Issuer2"); // Fetch based on label
            if (!getAttributesCredDefIdSpecific.ok) throw new Error("Failed to fetch config");
            const getAttributesCredDefId = await getAttributesCredDefIdSpecific.json();

            if (getAttributesCredDefId && getAttributesCredDefId.length > 0) {
              const latestConfig = getAttributesCredDefId[getAttributesCredDefId.length - 1]; // Get the latest saved config
              await sendProofRequest(ISSUER_URL, getConnectionId, "Proof", latestConfig.attributes, latestConfig.credDefId);
            }
            window.postMessage({ type: "ARIES_PROOF_REQUEST" });
            const proofRecords = await getPresentProof(ISSUER_URL);
            const proof = proofRecords.find((p) => p.connection_id === getConnectionId);

            if (proof?.pres_ex_id) {
              console.log("Before setting presExId:", presExId);
              setPresExId(proof.pres_ex_id);
              console.log("After setting presExId:", proof.pres_ex_id);
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

  console.log("🔵 Current presExId before useEffect:", presExId);

  useEffect(() => {
    if (!presExId) {
      console.warn("🚨 presExId is not set, skipping proof check.");
      return;
    }

    const checkProofStatus = async () => {
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
              if (!userEmail) {
                return console.error("No user email")
              }

              const getHolderInformation = await fetch(`/api/databasesApi/dbCredentials?email=${userEmail}`);
              const userInformation = await getHolderInformation.json();

              if (userInformation.length === 0) {
                const getHolderCredon = await fetch(`/api/databasesApi/dbCredentials?label=${holderLabel}`);
                const userInformation  = await getHolderCredon.json()
                if(userInformation.length === 0){
                  setUserEmail(userEmail)
                  setIsInputOpen(true);
                  await deleteConnections(ISSUER_URL, connectionId)
                  await deletePresentProof(ISSUER_URL, presExId);
                  return;
                } else {
                  await fetch("/api/databasesApi/dbCredentials", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ label: holderLabel, newEmail: userEmail }),
                  });
                  await deleteConnections(ISSUER_URL, connectionId)
                  await deletePresentProof(ISSUER_URL, presExId);
                  return;
                }
              }

              await fetch("/api/databasesApi/dbCredentials", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: userEmail, label: holderLabel, connectionId: connectionId }),
              });

              const fetchSchemaAndCred = await fetchSchemaAndCredDefIds(ISSUER_URL);
              const fetchedCredDefId = fetchSchemaAndCred.credDefIds[0];
              const holderConnectionId = proof.connection_id;

              if (!fetchedCredDefId) {
                console.error("Credential Definition ID is missing.");
                return;
              }

              if (userInformation[0].connectionId && userInformation[0].credExchangeId) {
                if (userInformation[0].status === "revoked") {
                  setIsDialogOpen(true);
                  await deleteConnections(ISSUER_URL, extraConnectionId)
                  await deletePresentProof(ISSUER_URL, presExId);
                  return;
                } else if (userInformation[0].status === "valid") {
                  setIsValidOpen(true)
                  await deleteConnections(ISSUER_URL, extraConnectionId)
                  await deletePresentProof(ISSUER_URL, presExId)
                  return;
                }
                let status = "valid"
                await fetch("/api/databasesApi/dbCredentials", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: userEmail, status: status }),
                });
                await deleteConnections(ISSUER_URL, extraConnectionId)
                await deletePresentProof(ISSUER_URL, presExId);
                await sendCredential(ISSUER_URL, userInformation[0].connectionId, userInformation[0].attributes, "", false, fetchSchemaAndCred.schemaDetails[0].schemaId, fetchedCredDefId, false);
                return;
              }

              await deletePresentProof(ISSUER_URL, presExId);
              await sendCredential(ISSUER_URL, holderConnectionId, userInformation[0].attributes, "", false, fetchSchemaAndCred.schemaDetails[0].schemaId, fetchedCredDefId, false);
              await new Promise((resolve) => setTimeout(resolve, 2000));

              const issueCredentialsRecord = await getIssueCredential(ISSUER_URL);
              const matchingRecord = issueCredentialsRecord.find(
                (c) => c.cred_ex_record.connection_id === connectionId
              );

              if (matchingRecord) {
                const credExchangeId = matchingRecord.cred_ex_record.cred_ex_id;
                await fetch("/api/databasesApi/dbCredentials", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: userEmail, credExchangeId: credExchangeId }),
                });
                console.log("✅ Credential Exchange ID:", credExchangeId);
                deleteIssueCredential(ISSUER_URL, credExchangeId)
              } else {
                console.log("❌ No credential exchange record found for the given connection_id.");
              }
            }
          }
        }
      } catch (error) {
        console.error("❌ Error checking proof status:", error);
      }
    };

    console.log(`⏳ Monitoring proof status for presExId: ${presExId}`);
    checkProofStatus(); // Run it once immediately

    const interval = setInterval(checkProofStatus, 3000);

    return () => clearInterval(interval);
  }, [presExId]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 to-purple-200 text-gray-800 p-6">
      <header className="w-full py-6 bg-gradient-to-r from-blue-200 to-purple-200 shadow-md mb-8 relative">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
          {/* Add decorative element here (e.g., stylized icon) */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4m-2 2h12m-6-4h6" />
          </svg>
        </div>
        <div className="container mx-auto text-center">
          <h1 className="text-3xl font-semibold text-gray-800 mb-1">IdentityKu</h1>
          <p className="text-lg text-gray-600">Securely issue and manage your digital credentials with Aries technology.</p>
        </div>
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          {/* Add decorative element here (e.g., stylized icon) */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </header>

      <div className="flex flex-col items-center justify-center w-full">
        <div className="max-w-md w-full p-8 bg-gradient-to-br from-gray-200 to-gray-100 rounded-2xl shadow-lg text-center border border-gray-300 backdrop-blur-md bg-opacity-80">
          <ShieldCheck className="mx-auto mb-4 text-4xl text-blue-500" />
          <h2 className="text-3xl font-semibold mb-6 text-gray-800">Get Your Credential</h2>
          <p className="mb-4 text-gray-600 leading-relaxed">
            You need a Credon Basic Identity credential to proceed for verification and subsequent obtaining credential.
          </p>
          <div className="mt-6">
            <Button
              onClick={handleLoginWithWallet}
              disabled={loading}
              className={`w-full px-6 py-3 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 transition-colors duration-300 ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connecting...
                </span>
              ) : (
                "Get credential with Credon"
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Your email address will be used as your unique identifier and accessed for credential verification.
          </p>
          <button
            className="text-sm mt-8 text-blue-600 hover:text-blue-500 hover:underline transition-colors duration-200"
            onClick={() => setShowDeveloperToolsDialog(true)}
          >
            Show Developer Tools
          </button>
        </div>
      </div>

      <AlertDialog open={showDeveloperToolsDialog} onOpenChange={setShowDeveloperToolsDialog}>
        <AlertDialogContent className="max-w-md p-6 bg-gray-100 rounded-lg">
          {schemaDetails && schemaDetails.length > 0 && (
            <div>
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Info className="text-blue-500" size={25} />
                  <AlertDialogTitle className="text-2xl font-semibold text-gray-800">
                    Developer Tools
                  </AlertDialogTitle>
                </div>
                <p className="text-xl font-semibold text-gray-800">
                  {schemaDetails[0]?.schemaName || "Loading..."}
                </p>
              </div>
              <AlertDialogDescription className="text-center text-gray-600 mb-4">
                Use these IDs to verify credentials on your website.
              </AlertDialogDescription>
              <hr className="my-4 border-gray-300" />
              <div className="mt-4">
                <div className="flex items-center mb-2">
                  <IdCard className="mr-2 text-gray-500" size={16} />
                  <span className="text-sm font-medium text-gray-700">Schema ID:</span>
                </div>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={schemaDetails[0]?.schemaId || ""}
                    readOnly
                    className="flex-grow bg-gray-200 border border-gray-300 rounded p-2 text-sm text-gray-800"
                  />
                  <button
                    className="ml-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-xs flex items-center"
                    onClick={() => navigator.clipboard.writeText(schemaDetails[0]?.schemaId || "")}
                  >
                    <ClipboardCopy className="mr-1" size={14} />
                    Copy
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center mb-2">
                  <IdCard className="mr-2 text-gray-500" size={16} />
                  <span className="text-sm font-medium text-gray-700">Cred Def ID:</span>
                </div>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={schemaDetails[0]?.credDefId || ""}
                    readOnly
                    className="flex-grow bg-gray-200 border border-gray-300 rounded p-2 text-sm text-gray-800"
                  />
                  <button
                    className="ml-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-xs flex items-center"
                    onClick={() => navigator.clipboard.writeText(schemaDetails[0]?.credDefId || "")}
                  >
                    <ClipboardCopy className="mr-1" size={14} />
                    Copy
                  </button>
                </div>
              </div>
            </div>
          )}
          <AlertDialogFooter className="mt-6">
            <AlertDialogAction onClick={() => setShowDeveloperToolsDialog(false)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isInputOpen} onOpenChange={setIsInputOpen}>
        <AlertDialogContent className="max-w-md p-6">
          <AlertDialogHeader className="flex items-center gap-2">
            <PencilIcon className="text-blue-500" size={24} /> {/* Warning Icon */}
            <AlertDialogTitle>Upload Information</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="text-gray-600">
            Your email could not be found on the database. Please input your details as follow
            and upload any relevant documents.
          </AlertDialogDescription>
          {schemaAttributes.map((attr, index) => (
            <div key={index} className="mb-4">
              <Label htmlFor={`attr-${attr}`} className="block mb-2">{attr}</Label>
              <Input
                type="text"
                id={`attr-${attr}`}
                placeholder={`Enter value for ${attr}`}
                value={formData[attr] || ""}
                onChange={(e) => handleChange(e, attr)}
              />
            </div>
          ))}
          <div className="mb-4">
            <Label htmlFor="file-upload" className="block mb-2 flex items-center gap-2">
              <UploadIcon size={18} className="text-gray-500" /> Upload Document
            </Label>
            <Input
              type="file"
              id="file-upload"
              className="border rounded p-2 w-full"
              onChange={(e) => console.log()} // For display purposes only
            />
          </div>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction onClick={() => { handleSubmit(userEmail); setIsDialogOpen(false); setIsReminderOpen(true) }}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isReminderOpen} onOpenChange={setIsReminderOpen}>
        <AlertDialogContent className="max-w-md p-6">
          <AlertDialogHeader className="flex items-center gap-2">
            <CheckCircle className="text-green-500" size={24} /> {/* Success Icon */}
            <AlertDialogTitle>Submission Successful</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="text-gray-600">
            Your information has been submitted successfully. We will check for its validity,
            which may take up to a day. You will receive a response regarding your credential
            via email.
          </AlertDialogDescription>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction onClick={() => setIsReminderOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className="max-w-md p-6">
          <AlertDialogHeader className="flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={24} /> {/* Warning Icon */}
            <AlertDialogTitle>Credential Revoked</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="text-gray-600">
            Your credential has been revoked due to security or policy reasons.
            If you believe this is a mistake, please contact our support team for assistance.
          </AlertDialogDescription>
          <div className="mt-4 text-sm text-gray-500">
            <strong>Email:</strong> <a href="mailto:support@example.com" className="text-blue-600 hover:underline">support@example.com</a>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            <strong>Phone:</strong> <a href="tel:+1234567890" className="text-blue-600 hover:underline">+1 234 567 890</a>
          </div>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction onClick={() => setIsDialogOpen(false)}>OK, Got It</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isValidOpen} onOpenChange={setIsValidOpen}>
        <AlertDialogContent className="max-w-md p-6">
          <AlertDialogHeader className="flex items-center gap-2">
            <Info className="text-blue-500" size={24} /> {/* Info Icon */}
            <AlertDialogTitle>Active Credential Exists</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="text-gray-600">
            You already have an active valid credential.
            Since only one credential can be issued at a time, you cannot request a new one.
            If you believe this is an error or need further assistance, please contact our support team.
          </AlertDialogDescription>
          <div className="mt-4 text-sm text-gray-500">
            <strong>Email:</strong> <a href="mailto:support@example.com" className="text-blue-600 hover:underline">support@example.com</a>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            <strong>Phone:</strong> <a href="tel:+1234567890" className="text-blue-600 hover:underline">+1 234 567 890</a>
          </div>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction onClick={() => setIsValidOpen(false)}>OK, Got It</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* <Button onClick={handleLoginWithWallet} disabled={loading} className="px-6 py-3 text-lg">
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Connecting...
          </span>
        ) : (
          "Login with Aries Wallet"
        )}
      </Button> */}
    </div>
  );
};

export default IssuerExternal;

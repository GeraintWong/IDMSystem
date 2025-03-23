"use client";

import React, { useEffect, useState } from "react";
import { createInvitation } from "@/app/api/invitation/createInvitation";
import { Button } from "@/components/ui/button";
import { fetchSchemaAndCredDefIds, getIssueCredential, deleteIssueCredential } from "@/app/api/helper/helper";
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

const ISSUER_URL = "http://localhost:11000"

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
  const [isOTPInput, setIsOTPInput] = useState(false)
  const [showDeveloperTools, setShowDeveloperTools] = useState(false);
  const [showDeveloperToolsDialog, setShowDeveloperToolsDialog] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

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

  const handleCredentialCheck = async () => {
    setLoading(true);
    try {
      window.postMessage({ type: "CREDENTIAL_CHECK" }, "*");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      console.log("📩 Received message:", event.data);

      if (event.data?.data?.type === "CREDENTIAL_CHECK_LABEL") {
        try {
          setHolderLabel(event.data.data.label)
          const getHolderCredon = await fetch(`/api/databasesApi/dbCredon?label=${event.data.data.label}`);
          const userInformation = await getHolderCredon.json()
          const userStatus = userInformation[0].status
          if (userStatus === "valid") {
            setIsValidOpen(true)
            setLoading(false);
          }
          else if (userStatus === "revoked") {
            setIsDialogOpen(true)
            setLoading(false);
          } else {
            setIsInputOpen(true)
            setLoading(false);
          }
        } catch (error) {
          console.error("❌ Error processing connection:", error);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleSendOTP = async () => {
    if (!formData.Email) {
      console.error("Email is required");
      return;
    }

    try {
      const response = await fetch("/api/otpService/sendOtp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: formData.Email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      console.log(data.message); // "OTP sent successfully!"
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/otpService/verifyOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.Email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify OTP");
      }

      alert("OTP Verified Successfully!");
      setIsOTPInput(false);
      const getHolderCredon = await fetch(`/api/databasesApi/dbCredon?label=${holderLabel}`);
      const userInformation = await getHolderCredon.json()
      const userConnectionId = userInformation[0].connectionId
      const fetchSchemaAndCred = await fetchSchemaAndCredDefIds(ISSUER_URL);
      const fetchedCredDefId = fetchSchemaAndCred.credDefIds[0];
      const hashedFormData = await hashFormData(formData);
      await sendCredential(ISSUER_URL, userConnectionId, hashedFormData, "", false, fetchSchemaAndCred.schemaDetails[0].schemaId, fetchedCredDefId, false)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const issueCredentialsRecord = await getIssueCredential(ISSUER_URL);
      const matchingRecord = issueCredentialsRecord.find(
        (c) => c.cred_ex_record.connection_id === userConnectionId
      );

      if (matchingRecord) {
        const credExchangeId = matchingRecord.cred_ex_record.cred_ex_id;
        const newEmail = await hashEmail(formData.Email)
        await fetch("http://localhost:3000/api/databasesApi/dbCredon", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: holderLabel,
            newEmail: newEmail,
            credExchangeId: credExchangeId,
            status: "valid"
          }),
        });
        console.log("✅ Credential Exchange ID:", credExchangeId);
        await deleteIssueCredential(ISSUER_URL, credExchangeId)
      } else {
        console.log("❌ No credential exchange record found for the given connection_id.");
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  async function hashEmail(email: string): Promise<string> {
    if (!email) {
      throw new Error("Email cannot be empty or null.");
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(email);

    try {
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return hashHex;
    } catch (error) {
      console.error("Hashing error:", error);
      throw error;
    }
  }

  async function hashFormData(formData: Record<string, string>) {
    const hashedData: Record<string, string> = {};

    for (const key in formData) {
      if (formData[key]) {
        hashedData[key] = await hashEmail(formData[key]); // Hash each value
      }
    }

    return hashedData;
  }



  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-8"> {/* Changed background to light gray */}
      <header className="w-full py-8 bg-white shadow-md mb-10 rounded-lg relative"> {/* Changed header style */}
        <div className="absolute left-8 top-1/2 transform -translate-y-1/2">
          {/* Modern stylized icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 15l5-5m0 0l5 5m-5-5v10" />
          </svg>
        </div>
        <div className="container mx-auto text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Credon Reissuance</h1> {/* Changed title and size */}
          <p className="text-md text-gray-600">Your trusted platform for verifiable credentials.</p> {/* Changed subtitle and size */}
        </div>
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
          {/* Modern stylized icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
      </header>

      <div className="flex flex-col items-center justify-center w-full">
        <div className="max-w-xl w-full p-10 bg-white rounded-xl shadow-lg text-center border border-gray-200"> {/* Changed card style */}
          <ShieldCheck className="mx-auto mb-6 text-5xl text-teal-500" /> {/* Changed icon and color */}
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">Get your Credon Basic Credential</h2> {/* Changed title and size */}
          <p className="mb-6 text-gray-700 leading-relaxed">
            Obtain your secure Credon Basic Credential for seamless verification and access.
          </p>
          <div className="mt-8">
            <Button
              onClick={handleCredentialCheck}
              disabled={loading}
              className={`w-full px-6 py-4 text-lg font-semibold bg-teal-500 hover:bg-teal-600 transition-colors duration-300 text-white rounded-md ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {loading ? (
                <span className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-white" /> {/* Changed loader color and size */}
                  Connecting...
                </span>
              ) : (
                "Get Credential"
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
          Note: This process is for the reissuance of your secure Credon Basic Credential. New users will need to obtain the Credon web browser extension to get started.
          </p>
          <button
            className="text-sm mt-8 text-gray-600 hover:text-gray-700 hover:underline transition-colors duration-200"
            onClick={() => setShowDeveloperToolsDialog(true)}
          >
            Developer Info
          </button>
        </div>
      </div>

      <AlertDialog open={showDeveloperToolsDialog} onOpenChange={setShowDeveloperToolsDialog}>
        <AlertDialogContent className="max-w-md p-8 bg-white rounded-lg shadow-md border border-gray-100"> {/* Updated dialog style */}
          {schemaDetails && schemaDetails.length > 0 && (
            <div>
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <Info className="text-teal-500" size={28} /> {/* Updated icon and size */}
                  <AlertDialogTitle className="text-xl font-semibold text-gray-800">
                    Developer Tools
                  </AlertDialogTitle>
                </div>
                <p className="text-lg font-semibold text-gray-800">
                  {schemaDetails[0]?.schemaName || "Loading..."}
                </p>
              </div>
              <AlertDialogDescription className="text-center text-gray-600 mb-6">
                Use these identifiers for credential verification on your platform.
              </AlertDialogDescription>
              <hr className="my-6 border-gray-200" />
              <div className="mt-6">
                <div className="flex items-center mb-3">
                  <IdCard className="mr-3 text-gray-500" size={18} /> {/* Updated icon and size */}
                  <span className="text-sm font-medium text-gray-700">Schema ID:</span>
                </div>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={schemaDetails[0]?.schemaId || ""}
                    readOnly
                    className="flex-grow bg-gray-100 border border-gray-300 rounded-md p-2 text-sm text-gray-800"
                  />
                  <button
                    className="ml-3 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md text-xs flex items-center"
                    onClick={() => navigator.clipboard.writeText(schemaDetails[0]?.schemaId || "")}
                  >
                    <ClipboardCopy className="mr-1" size={14} />
                    Copy
                  </button>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex items-center mb-3">
                  <IdCard className="mr-3 text-gray-500" size={18} /> {/* Updated icon and size */}
                  <span className="text-sm font-medium text-gray-700">Cred Def ID:</span>
                </div>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={schemaDetails[0]?.credDefId || ""}
                    readOnly
                    className="flex-grow bg-gray-100 border border-gray-300 rounded-md p-2 text-sm text-gray-800"
                  />
                  <button
                    className="ml-3 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md text-xs flex items-center"
                    onClick={() => navigator.clipboard.writeText(schemaDetails[0]?.credDefId || "")}
                  >
                    <ClipboardCopy className="mr-1" size={14} />
                    Copy
                  </button>
                </div>
              </div>
            </div>
          )}
          <AlertDialogFooter className="mt-8">
            <AlertDialogAction className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md">Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isInputOpen} onOpenChange={setIsInputOpen}>
        <AlertDialogContent className="max-w-md p-8 bg-white rounded-lg shadow-md border border-gray-100"> {/* Updated dialog style */}
          <AlertDialogHeader className="flex items-center gap-3 mb-4">
            <PencilIcon className="text-yellow-500" size={28} /> {/* Changed icon and color */}
            <AlertDialogTitle className="text-lg font-semibold text-gray-800">Verify Email</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="text-gray-600 mb-6">
            An OTP will be sent to your email.
          </AlertDialogDescription>
          {schemaAttributes.map((attr, index) => (
            <div key={index} className="mb-5">
              <Label htmlFor={`attr-${attr}`} className="block text-sm font-medium text-gray-700 mb-2">{attr.charAt(0).toUpperCase() + attr.slice(1)}</Label> {/* Improved label */}
              <Input
                type="email"
                id={`attr-${attr}`}
                placeholder={`Enter your ${attr}`}
                value={formData[attr] || ""}
                onChange={(e) => handleChange(e, attr)}
                className="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-800 text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          ))}
          <AlertDialogFooter className="mt-6">
            <AlertDialogAction className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md" onClick={() => { handleSendOTP(), setIsDialogOpen(false); setIsOTPInput(true) }}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isOTPInput} onOpenChange={setIsOTPInput}>
        <AlertDialogContent className="max-w-md p-8 bg-white rounded-lg shadow-md border border-gray-100"> {/* Updated dialog style */}
          <AlertDialogHeader className="mb-4">
            <AlertDialogTitle className="text-lg font-semibold text-gray-800">Enter OTP</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">Please enter the One-Time Password sent to your email.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-800 text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
          />
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
          <AlertDialogFooter className="mt-6 flex justify-end gap-3">
            <Button variant="outline" className="text-gray-600 hover:text-gray-700 border border-gray-300 hover:border-gray-400 rounded-md px-4 py-2 text-sm" onClick={() => setIsOTPInput(false)}>
              Cancel
            </Button>
            <Button className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md text-sm" onClick={handleVerifyOTP} disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className="max-w-md p-8 bg-white rounded-lg shadow-md border border-gray-100"> {/* Updated dialog style */}
          <AlertDialogHeader className="flex items-center gap-3 mb-4">
            <AlertTriangle className="text-red-500" size={28} /> {/* Updated icon and size */}
            <AlertDialogTitle className="text-lg font-semibold text-gray-800">Credential Revoked</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="text-gray-600 mb-6">
            Your credential has been revoked due to security or policy reasons. If you believe this is a mistake, please contact our support team.
          </AlertDialogDescription>
          <div className="mt-4 text-sm text-gray-600">
            <strong>Email:</strong> <a href="mailto:support@example.com" className="text-teal-600 hover:underline">support@example.com</a>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <strong>Phone:</strong> <a href="tel:+1234567890" className="text-teal-600 hover:underline">+1 234 567 890</a>
          </div>
          <AlertDialogFooter className="mt-6">
            <AlertDialogAction className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md" onClick={() => setIsDialogOpen(false)}>OK, Got It</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isValidOpen} onOpenChange={setIsValidOpen}>
        <AlertDialogContent className="max-w-md p-8 bg-white rounded-lg shadow-md border border-gray-100"> {/* Updated dialog style */}
          <AlertDialogHeader className="flex items-center gap-3 mb-4">
            <Info className="text-teal-500" size={28} /> {/* Updated icon and size */}
            <AlertDialogTitle className="text-lg font-semibold text-gray-800">Active Credential Exists</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="text-gray-600 mb-6">
            You already have an active valid credential. Only one can be issued at a time. Contact support if you believe this is an error.
          </AlertDialogDescription>
          <div className="mt-4 text-sm text-gray-600">
            <strong>Email:</strong> <a href="mailto:support@example.com" className="text-teal-600 hover:underline">support@example.com</a>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <strong>Phone:</strong> <a href="tel:+1234567890" className="text-teal-600 hover:underline">+1 234 567 890</a>
          </div>
          <AlertDialogFooter className="mt-6">
            <AlertDialogAction className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md" onClick={() => setIsValidOpen(false)}>OK, Got It</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IssuerExternal;

"use client";

import React, { useState, useEffect } from "react";
import { registerSchemaAndCredDef } from "@/app/api/registerschemacred/registerschemacred";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { sendCredential } from "@/app/api/issueCredentials/sendCredential/sendCredential";
import { getConnections, fetchSchemaAndCredDefIds, getIssueCredential } from "@/app/api/helper/helper";
import { revokeCredential } from "@/app/api/revokeCredentials/revokeCredentials";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const ISSUER_URL = "http://localhost:11000";

const IssuerInternal: React.FC = () => {
    const [schemaName, setSchemaName] = useState("");
    const [attributes, setAttributes] = useState<string[]>([]);
    const [newAttribute, setNewAttribute] = useState("");
    const [credDefId, setCredDefId] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [holderLabel, setHolderLabel] = useState("");
    const [schemaAttributes, setSchemaAttributes] = useState<string[]>([]);

    const [proofAttributes, setProofAttributes] = useState<string[]>([]);
    const [tempSelectedAttributes, setTempSelectedAttributes] = useState<string[]>([]);
    const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
    const [proofCredDefId, setProofCredDefId] = useState("");
    const [revokeHolderLabel, setRevokeHolderLabel] = useState("");
    const [isRevokeOpen, setIsRevokeOpen] = useState(false);
    const [reinstateHolderLabel, setReinstateHolderLabel] = useState("");
    const [isReinstateOpen, setIsReinstateOpen] = useState(false);


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

    const handleRegisterSchemaAndCredDef = async () => {
        try {
            setIsDialogOpen(false);
            const result = await registerSchemaAndCredDef(ISSUER_URL, schemaName, attributes, true);

            if (!result) {
                console.error("Schema and Credential Definition registration failed.");
                return;
            }

            console.log("Schema ID:", result.schema_id);
            console.log("Credential Definition ID:", result.cred_def_id);
            setCredDefId(result.cred_def_id);
        } catch (error) {
            console.error("Error registering schema and credential definition:", error);
        }
    };

    const handleAddAttribute = () => {
        if (newAttribute.trim() && !attributes.includes(newAttribute.trim())) {
            setAttributes((prevAttributes) => [...prevAttributes, newAttribute.trim()]);
            setNewAttribute("");
        }
    };

    const handleRemoveAttribute = (attr: string) => {
        setAttributes(attributes.filter((a) => a !== attr));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, attr: string) => {
        setFormData((prev) => ({ ...prev, [attr]: e.target.value }));
    };

    const handleHolderLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const email = e.target.value;
        setHolderLabel(email);
    };

    const handleRevokeHolderLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const email = e.target.value;
        setRevokeHolderLabel(email);
    };

    const handleReinstateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const email = e.target.value;
        setReinstateHolderLabel(email)
    }

    useEffect(() => {
        async function fetchSavedConfig() {
            try {
                const response = await fetch("/api/databasesApi/dbProofConfig?label=Issuer2"); // Fetch based on label
                if (!response.ok) throw new Error("Failed to fetch config");
                const data = await response.json();

                if (data && data.length > 0) {
                    const latestConfig = data[data.length - 1]; // Get the latest saved config
                    setProofCredDefId(latestConfig.credDefId);
                    setSelectedAttributes(latestConfig.attributes);
                    setTempSelectedAttributes(latestConfig.attributes);
                }
            } catch (error) {
                console.error("Error fetching saved config:", error);
            }
        }
        fetchSavedConfig();
    }, []);

    const handleSendCredential = async () => {
        try {
            const connections = await getConnections(ISSUER_URL);
            const label = holderLabel.split("@")[0];
            const connection = connections.find((c) => c.their_label === label);
            const data = await fetchSchemaAndCredDefIds(ISSUER_URL);
            const credDefId = data.credDefIds[0];

            if (!connection) {
                console.error("No connection found for holder:", label);
                return;
            }

            if (!credDefId) {
                console.error("Credential Definition ID is missing.");
                return;
            }

            const connectionId = connection.connection_id;
            await sendCredential(ISSUER_URL, connectionId, formData, "", false, data.schemaDetails[0].schemaId, credDefId, false);
            console.log("Credential sent successfully.");
        } catch (error) {
            console.error("Error sending credential:", error);
        }
    };

    const handleSubmit = async () => {
        try {
            const label = await hashEmail(holderLabel)
            await fetch("/api/databasesApi/dbCredentials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: label, attributes: formData }), // Save formData
            });

            console.log("Stored:", { email: label, attributes: formData });
        } catch (error) {
            console.error("Error storing credentials:", error);
        }
    };

    const handleRevocation = async () => {
        try {
            const email = await hashEmail(revokeHolderLabel)
            const getHolderCredon = await fetch(`/api/databasesApi/dbCredon?email=${email}`);
            const userInformation = await getHolderCredon.json()
            const getCredExchangeId = userInformation[0].credExchangeId
            const data = await fetchSchemaAndCredDefIds(ISSUER_URL);
            const credDefId = data.credDefIds[0];
            await revokeCredential(ISSUER_URL, getCredExchangeId, credDefId)
            await fetch("http://localhost:3000/api/databasesApi/dbCredon", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email,
                    status: "revoked"
                }),
            });
        } catch (error) {
            console.error("Error revoking credentials", error)
        }
    }

    const handleReinstate = async () => {
        try {
            const email = await hashEmail(revokeHolderLabel)
            await fetch("http://localhost:3000/api/databasesApi/dbCredon", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email,
                    status: "reinstated"
                }),
            });

        } catch (error) {
            console.error("Error reinstating credentials", error)
        }
    }

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

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <div className="flex">
                <aside className="w-64 bg-gray-800 dark:bg-gray-950 text-white p-4">
                    <h2 className="text-2xl font-semibold mb-6">Credon Management</h2>
                    <nav>
                        <ul className="space-y-2">
                            <li><a href="#" className="block hover:bg-gray-700 p-2 rounded">Dashboard</a></li>
                            <li><a href="#" className="block hover:bg-gray-700 p-2 rounded">Register Schema</a></li>
                            <li><a href="#" className="block hover:bg-gray-700 p-2 rounded">Issue Credentials</a></li>
                            <li><a href="#" className="block hover:bg-gray-700 p-2 rounded">Revoke Credentials</a></li>
                            <li><a href="#" className="block hover:bg-gray-700 p-2 rounded">Proof Configuration</a></li>
                        </ul>
                    </nav>
                </aside>

                <main className="flex-1 p-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-4">Dashboard Overview</h1>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Total Issued Credentials</CardTitle>
                                    <CardDescription>Number of credentials issued</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-semibold">123</p>
                                </CardContent>
                            </Card>
                            {/* ... (Other dashboard cards) ... */}
                        </div>
                    </div>

                    <div id="registerSchemaSection" className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">Register Schema</h2>
                        <Card>
                            <CardContent>
                                <Label htmlFor="schemaName" className="block mt-6 mb-2">Schema Name</Label>
                                <Input
                                    type="text"
                                    id="schemaName"
                                    placeholder="Enter Schema Name"
                                    value={schemaName}
                                    onChange={(e) => setSchemaName(e.target.value)}
                                    className="mb-4"
                                />

                                <div className="mb-4">
                                    <Label htmlFor="newAttribute" className="block mb-2">Add Attribute</Label>
                                    <div className="flex space-x-2">
                                        <Input
                                            type="text"
                                            id="newAttribute"
                                            placeholder="Attribute Name"
                                            value={newAttribute}
                                            onChange={(e) => setNewAttribute(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Button onClick={handleAddAttribute} variant="secondary">Add</Button>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <Label className="block mb-2">Attributes</Label>
                                    <ul className="max-h-40 overflow-y-auto border rounded-md ps-2 bg-gray-100 dark:bg-gray-800">
                                        {attributes.map((attr, index) => (
                                            <li key={index} className="flex justify-between items-center py-1 border-b last:border-b-0">
                                                <span>{attr}</span>
                                                <Button onClick={() => handleRemoveAttribute(attr)} variant="destructive" size="icon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                                    </svg>
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <Button onClick={() => setIsDialogOpen(true)} variant="default">Register Schema & Credential Definition</Button>
                                <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Registering this schema cannot be undone. Make sure all details are correct before proceeding.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleRegisterSchemaAndCredDef}>Confirm</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">Issue Credentials</h2>
                        <Card>
                            <CardContent>
                                <Label htmlFor="holderEmail" className="block mt-6 mb-2">Email</Label>
                                <Input
                                    type="text"
                                    id="holderEmail"
                                    placeholder="Enter Credential Email"
                                    onChange={handleHolderLabelChange}
                                    className="mb-4"
                                />
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
                                <div className="flex justify-end space-x-2">
                                    <Button onClick={handleSubmit} variant="outline">Save</Button>
                                    <Button onClick={handleSendCredential} variant="default">Send Credential</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold mb-4">Revoke/Reinstate Credentials</h2>
                        <Card>
                            <CardContent>
                                <Label htmlFor="revokeEmail" className="block mt-6 mb-2">Email</Label>
                                <Input
                                    type="text"
                                    id="revokeEmail"
                                    placeholder="Enter Credential Email"
                                    onChange={handleRevokeHolderLabelChange}
                                    className="mb-4"
                                />
                                <div className="flex justify-end space-x-2">
                                    <AlertDialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive">Revoke Credential</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Revoking {revokeHolderLabel} credential cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleRevocation}>Confirm</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <AlertDialog open={isReinstateOpen} onOpenChange={setIsReinstateOpen}>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="secondary">Reinstate Credential</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Your are about to reinstate {revokeHolderLabel} credential.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleReinstate}>Confirm</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default IssuerInternal;
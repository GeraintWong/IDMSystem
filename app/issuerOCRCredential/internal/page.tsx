"use client";

import React, { useState, useEffect } from "react";
import { registerSchemaAndCredDef } from "@/app/api/registerschemacred/registerschemacred";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { sendCredential } from "@/app/api/issueCredentials/sendCredential/sendCredential";
import { getConnections, fetchSchemaAndCredDefIds } from "@/app/api/helper/helper";

const ISSUER2_URL = "http://localhost:11004";

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


    useEffect(() => {
        const fetchAttributes = async () => {
            try {
                const data = await fetchSchemaAndCredDefIds(ISSUER2_URL);
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
            const result = await registerSchemaAndCredDef(ISSUER2_URL, schemaName, attributes, true);

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

    useEffect(() => {
        async function fetchSavedConfig() {
            try {
                const response = await fetch("/api/databasesApi/dbProofConfig?label=Issuer3"); // Fetch based on label
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

    const confirmSelectedAttributes = async () => {
        try {
            const response = await fetch("/api/databasesApi/dbProofConfig", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    label: "Issuer3",
                    credDefId: proofCredDefId,
                    attributes: tempSelectedAttributes
                }),
            });

            if (!response.ok) throw new Error("Failed to save config");

            setSelectedAttributes(tempSelectedAttributes);
        } catch (error) {
            console.error("Error saving selected attributes:", error);
            alert("Failed to save attributes. Check console for details.");
        }
    };

    async function fetchProofAttributes() {
        if (!proofCredDefId) {
            alert("Please enter a Credential Definition ID.");
            return;
        }

        try {
            const response = await fetch(`http://localhost:11004/credential-definitions/${proofCredDefId}`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();

            if (!data || typeof data !== "object" || !data.credential_definition) {
                throw new Error("Invalid API response structure");
            }

            const credentialDefinition = data.credential_definition.value.primary.r;
            const fetchedAttributes = Object.keys(credentialDefinition);
            setProofAttributes(fetchedAttributes);
        } catch (error) {
            console.error("Error fetching attributes:", error);
            alert("Failed to fetch attributes. Check console for details.");
        }
    }

    const handleTempAttributeToggle = (attribute: string) => {
        setTempSelectedAttributes((prev) =>
            prev.includes(attribute)
                ? prev.filter(attr => attr !== attribute)
                : [...prev, attribute]
        );
    };

    const handleSendCredential = async () => {
        try {
            const connections = await getConnections(ISSUER2_URL);
            const label = holderLabel.split("@")[0];
            const connection = connections.find((c) => c.their_label === label);
            const data = await fetchSchemaAndCredDefIds(ISSUER2_URL);
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
            await sendCredential(ISSUER2_URL, connectionId, formData, "", false, data.schemaDetails[0].schemaId, credDefId, false);
            console.log("Credential sent successfully.");
        } catch (error) {
            console.error("Error sending credential:", error);
        }
    };

    const handleSubmit = async () => {
        try {
            await fetch("/api/databasesApi/dbCredentials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: holderLabel, attributes: formData }), // Save formData
            });

            console.log("Stored:", { email: holderLabel, attributes: formData });
        } catch (error) {
            console.error("Error storing credentials:", error);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-900 text-white p-6">
            <div className="w-1/3 p-6 shadow-lg rounded-lg bg-gray-800 border border-gray-700">
                <h2 className="text-xl font-semibold mb-4">Register Schema</h2>

                <input
                    type="text"
                    placeholder="Enter Schema Name"
                    value={schemaName}
                    onChange={(e) => setSchemaName(e.target.value)}
                    className="w-full p-3 border rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="mt-4 flex">
                    <input
                        type="text"
                        placeholder="Add Attribute"
                        value={newAttribute}
                        onChange={(e) => setNewAttribute(e.target.value)}
                        className="flex-1 p-2 border rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={handleAddAttribute}
                        className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                        Add
                    </button>
                </div>

                <ul className="mt-3 max-h-40 overflow-auto border-t border-gray-600 divide-y divide-gray-700">
                    {attributes.map((attr, index) => (
                        <li key={index} className="flex justify-between p-2 text-white">
                            {attr}
                            <button
                                onClick={() => handleRemoveAttribute(attr)}
                                className="text-red-500 hover:underline"
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>

                <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <button className="mt-4 w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">
                            Register Schema & Credential Definition
                        </button>
                    </AlertDialogTrigger>
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
                {credDefId && <p className="mt-4 text-green-500">Credential Definition ID: {credDefId}</p>}
            </div>
            <div className="w-2/3 flex flex-col justify-between h-screen p-6">
                {/* Top Section: Issue Credential Form */}
                <div className="flex flex-col items-center">
                    <h2 className="text-lg font-semibold mb-4">Issue Credential</h2>
                    <input
                        type="text"
                        placeholder="Enter Holder Email"
                        onChange={handleHolderLabelChange}
                        className="w-full max-w-md p-2 border rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                    />
                    {schemaAttributes.map((attr, index) => (
                        <div key={index} className="w-full max-w-md mb-2">
                            <label className="block text-gray-300">{attr}</label>
                            <input
                                type="text"
                                placeholder={`Enter value for ${attr}`}
                                value={formData[attr] || ""}
                                onChange={(e) => handleChange(e, attr)}
                                className="w-full p-2 border rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    ))}
                    <button onClick={handleSendCredential} className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600">
                        Send Credential
                    </button>
                    <button onClick={handleSubmit} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md">
                        Save
                    </button>
                </div>

                <div className="flex flex-col items-center">
                    <h1 className="text-3xl font-bold mb-6 text-gray-800">Configure Proof Request</h1>
                    <div className="flex space-x-4 w-full max-w-4xl">
                        {/* Left Side - Confirmed Attributes & Credential Definition ID */}
                        <div className="w-1/2 bg-white shadow-md rounded-lg p-6 border">
                            <h2 className="text-lg font-semibold text-gray-700 mb-4">Send Proof Configuration</h2>
                            <p className="text-gray-600 mb-3"><strong>Credential Definition ID:</strong> {proofCredDefId || "Not set"}</p>
                            {selectedAttributes.length > 0 ? (
                                <ul className="list-disc list-inside text-gray-700">
                                    {selectedAttributes.map((attr) => (
                                        <li key={attr} className="py-1">✅ {attr}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic">No attributes selected</p>
                            )}
                        </div>

                        {/* Right Side - Attribute Selection & Credential Definition ID Input */}
                        <div className="w-1/2 bg-white shadow-md rounded-lg p-6 border">
                            <h2 className="text-lg font-semibold text-gray-700 mb-4">🛠 Edit Configuration</h2>
                            <input
                                type="text"
                                placeholder="Credential Definition ID"
                                value={proofCredDefId}
                                onChange={(e) => setProofCredDefId(e.target.value)}
                                className="text-gray-600 border p-2 mb-3 w-full rounded-md"
                            />
                            <button
                                onClick={fetchProofAttributes}
                                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-700 mb-4 w-full"
                            >
                                Fetch Attributes
                            </button>

                            {proofAttributes.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="text-gray-600 font-semibold mb-2">Select attributes:</h3>
                                    <div className="max-h-40 overflow-y-auto border p-2 rounded-md bg-gray-100">
                                        {proofAttributes.map((attr) => (
                                            <label key={attr} className="flex items-center mb-1 text-gray-700">
                                                <input
                                                    type="checkbox"
                                                    checked={tempSelectedAttributes.includes(attr)}
                                                    onChange={() => handleTempAttributeToggle(attr)}
                                                    className="mr-2"
                                                />
                                                {attr}
                                            </label>
                                        ))}
                                    </div>
                                    <button
                                        onClick={confirmSelectedAttributes}
                                        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-700 mt-4 w-full"
                                    >
                                        Save Selection
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>



        </div>
    );
};

export default IssuerInternal;

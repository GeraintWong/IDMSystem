"use client";

import React, { useState, useEffect } from "react";
import { registerSchemaAndCredDef } from "@/app/api/registerschemacred/registerschemacred";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { sendCredential } from "@/app/api/issueCredentials/sendCredential/sendCredential";
import { getConnections, fetchSchemaAndCredDefIds } from "@/app/api/helper/helper";

const ISSUER2_URL = "http://localhost:11003";

const IssuerInternal: React.FC = () => {
    const [schemaName, setSchemaName] = useState("");
    const [attributes, setAttributes] = useState<string[]>([]);
    const [newAttribute, setNewAttribute] = useState("");
    const [credDefId, setCredDefId] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [holderLabel, setHolderLabel] = useState("");
    const [schemaAttributes, setSchemaAttributes] = useState<string[]>([]);

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
        const label = email.split("@")[0];
        setHolderLabel(label);
    };

    const handleSendCredential = async () => {
        try {
            const connections = await getConnections(ISSUER2_URL);
            const connection = connections.find((c) => c.their_label === holderLabel);
            const data = await fetchSchemaAndCredDefIds(ISSUER2_URL);
            const credDefId = data.credDefIds[0];

            if (!connection) {
                console.error("No connection found for holder:", holderLabel);
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
            <div className="w-2/3 flex flex-col items-center justify-center p-6">
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
            </div>
        </div>
    );
};

export default IssuerInternal;

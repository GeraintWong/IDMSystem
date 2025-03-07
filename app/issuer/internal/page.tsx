"use client";

import React, { useState } from "react";
import { registerSchemaAndCredDef } from "@/app/api/registerschemacred/registerschemacred";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

const ISSUER_URL = "http://localhost:11000";

const IssuerInternal: React.FC = () => {
    const [schemaName, setSchemaName] = useState("");
    const [attributes, setAttributes] = useState<string[]>([]);
    const [newAttribute, setNewAttribute] = useState("");
    const [credDefId, setCredDefId] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleRegisterSchemaAndCredDef = async () => {
        try {
            setIsDialogOpen(false); // Close dialog after confirmation
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

    return (
        <div className="flex min-h-screen bg-gray-900 text-white p-6">
            {/* Left Panel - Schema Registration */}
            <div className="w-1/3 p-6 shadow-lg rounded-lg bg-gray-800 border border-gray-700">
                <h2 className="text-xl font-semibold mb-4">Register Schema</h2>

                {/* Schema Name Input */}
                <input
                    type="text"
                    placeholder="Enter Schema Name"
                    value={schemaName}
                    onChange={(e) => setSchemaName(e.target.value)}
                    className="w-full p-3 border rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Attribute Input */}
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

                {/* Attributes List */}
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

                {/* Register Schema Button with Dialog */}
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

                {/* Display Credential Definition ID */}
                {credDefId && <p className="mt-4 text-green-500">Credential Definition ID: {credDefId}</p>}
            </div>

            {/* Right Panel - Placeholder for Future Content */}
            <div className="w-2/3 flex items-center justify-center">
                <p className="text-gray-500 text-lg">Right panel (Use this for future functionalities)</p>
            </div>
        </div>
    );
};

export default IssuerInternal;
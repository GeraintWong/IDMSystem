"use client";
import { useState, useEffect } from "react";

export default function ProofRequestPage() {
    const [credDefId, setCredDefId] = useState("");
    const [attributes, setAttributes] = useState<string[]>([]);
    const [tempSelectedAttributes, setTempSelectedAttributes] = useState<string[]>([]);
    const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);

    // Load saved attributes and credDefId from the database
    useEffect(() => {
        async function fetchSavedConfig() {
            try {
                const response = await fetch("/api/databasesApi/dbProofConfig?label=Verifier1"); // Fetch based on label
                if (!response.ok) throw new Error("Failed to fetch config");
                const data = await response.json();

                if (data && data.length > 0) {
                    const latestConfig = data[data.length - 1]; // Get the latest saved config
                    setCredDefId(latestConfig.credDefId);
                    setSelectedAttributes(latestConfig.attributes);
                    setTempSelectedAttributes(latestConfig.attributes);
                }
            } catch (error) {
                console.error("Error fetching saved config:", error);
            }
        }
        fetchSavedConfig();
    }, []);

    async function fetchAttributes() {
        if (!credDefId) {
            alert("Please enter a Credential Definition ID.");
            return;
        }

        try {
            const response = await fetch(`http://localhost:11002/credential-definitions/${credDefId}`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();

            if (!data || typeof data !== "object" || !data.credential_definition) {
                throw new Error("Invalid API response structure");
            }

            const credentialDefinition = data.credential_definition.value.primary.r;
            const fetchedAttributes = Object.keys(credentialDefinition);
            setAttributes(fetchedAttributes);
        } catch (error) {
            console.error("Error fetching attributes:", error);
            alert("Failed to fetch attributes. Check console for details.");
        }
    }

    // Handle checkbox selection (temporary)
    const handleTempAttributeToggle = (attribute: string) => {
        setTempSelectedAttributes((prev) =>
            prev.includes(attribute)
                ? prev.filter(attr => attr !== attribute)
                : [...prev, attribute]
        );
    };

    // Save selected attributes to the database
    const confirmSelectedAttributes = async () => {
        try {
            const response = await fetch("/api/databasesApi/dbProofConfig", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    label: "Verifier1",
                    credDefId,
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

    return (
        <div className="flex flex-col items-center justify-center p-6 min-h-screen bg-gray-50">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Configure Proof Request</h1>
            <div className="flex space-x-4 w-full max-w-4xl">
                {/* Left Side - Confirmed Attributes & Credential Definition ID */}
                <div className="w-1/2 bg-white shadow-md rounded-lg p-6 border">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4">Send Proof Configuration</h2>
                    <p className="text-gray-600 mb-3"><strong>Credential Definition ID:</strong> {credDefId || "Not set"}</p>
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
                        value={credDefId}
                        onChange={(e) => setCredDefId(e.target.value)}
                        className="border p-2 mb-3 w-full rounded-md"
                    />
                    <button
                        onClick={fetchAttributes}
                        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-700 mb-4 w-full"
                    >
                        Fetch Attributes
                    </button>

                    {attributes.length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-gray-600 font-semibold mb-2">Select attributes:</h3>
                            <div className="max-h-40 overflow-y-auto border p-2 rounded-md bg-gray-100">
                                {attributes.map((attr) => (
                                    <label key={attr} className="flex items-center mb-1">
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
    );
}

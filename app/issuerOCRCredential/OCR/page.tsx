"use client";

import React, { useState, useEffect } from "react";
import Tesseract from "tesseract.js";
import { sendCredential } from "@/app/api/issueCredentials/sendCredential/sendCredential";
import { getConnections, fetchSchemaAndCredDefIds, getConnectionIdOCR } from "@/app/api/helper/helper";

const ISSUER_URL = "http://localhost:11004";

const IDCardOCR: React.FC = () => {
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [extractedText, setExtractedText] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [confirmation, setConfirmation] = useState<boolean>(false);
    const [connectionId, setConnectionId] = useState<string | null>(null);

    // Get Info
    const [name, setName] = useState<string>("");
    const [personId, setPersonId] = useState<string>("");
    const [dob, setDOB] = useState<string>("");

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setImage(file);
            setImagePreview(URL.createObjectURL(file));
            setExtractedText(""); // Reset text
            setConfirmation(false); // Reset confirmation state
        }
    };

    const extractText = async () => {
        if (!image) return;
        setLoading(true);
        setProgress(0);

        const reader = new FileReader();
        reader.readAsDataURL(image);
        reader.onload = async () => {
            try {
                const cleanImage = await processImage(reader.result as string);

                const { data } = await Tesseract.recognize(cleanImage as string, "eng", {
                    logger: (m) => {
                        if (m.status === "recognizing text") {
                            setProgress(Math.round(m.progress * 100));
                        }
                    },
                });

                const name = extractName(data.text);
                const dob = extractDOB(data.text);
                const personID = extractPersonID(data.text);

                setName(name);
                setPersonId(personID);
                setDOB(dob);
                setExtractedText(`Name: ${name}\nPerson ID: ${personID}\nDOB: ${dob}`);
                setConfirmation(true);
            } catch (error) {
                console.error("OCR Error:", error);
                setExtractedText("Error processing image.");
            }
            setLoading(false);
        };
    };

    const processImage = async (imageData: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (!ctx) return reject("Failed to get canvas context");

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0, img.width, img.height);

                // Apply preprocessing (e.g., masking top-right area)
                const boxWidth = canvas.width * 0.4;
                const boxHeight = canvas.height * 0.3;
                const xStart = canvas.width - boxWidth;
                ctx.fillStyle = "white";
                ctx.fillRect(xStart, 0, boxWidth, boxHeight);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3; // Grayscale
                    data[i] = data[i + 1] = data[i + 2] = avg; // Apply grayscale
                }
                ctx.putImageData(imageData, 0, 0);

                // Apply binarization (thresholding)
                ctx.globalCompositeOperation = "difference";
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.globalCompositeOperation = "source-over";

                const processedImage = canvas.toDataURL();
                resolve(processedImage);
            };

            img.onerror = () => reject("Failed to load image");
            img.src = imageData;
        });
    };

    const extractName = (text: string): string => {
        const lines = text.split("\n").map(line => line.trim()).filter(line => line);
        let nameStart = false;
        let nameLines: string[] = [];

        for (const line of lines) {
            if (/Undergraduate|STUDENT IDENTITY CARD/i.test(line)) {
                nameStart = true;
                continue;
            }
            if (/Person ID|DOB|Issue No|Expires/i.test(line)) break;

            // Allow mixed case names (including lowercase)
            if (/^[A-Za-z\s]+$/.test(line) && !line.includes("UNIVERSITY")) {
                nameLines.push(line);
            }
        }

        let fullName = nameLines.join(" ").trim();
        console.log("Fullname: " + fullName)
        fullName = fullName.replace(/&|\//g, "").replace(/\s+/g, " ");

        return fullName || "Not Found";
    };

    const extractPersonID = (text: string): string => {
        const personIDPattern = /Person ID:\s*([A-Z0-9-]+)/i;
        const match = text.match(personIDPattern);
        if (match) {
            let id = match[1].trim();
            id = id.replace(/O/g, "0"); // Convert 'O' to '0'
            return id;
        }
        return "Not Found";
    };

    const isMissingInfo = () => {
        return name === "Not Found" || personId === "Not Found" || dob === "Not Found";
    };


    const extractDOB = (text: string): string => {
        const dobPattern = /DOB:\s*(\d{1,2}-[A-Za-z]{3}-\d{4})/;
        const match = text.match(dobPattern);
        return match ? match[1].trim() : "Not Found";
    };

    const handleConfirmAndSend = async () => {
        try {
            const data = await fetchSchemaAndCredDefIds(ISSUER_URL);
            const holderConnectionId = getConnectionIdOCR()
            const credDefId = data.credDefIds[0];

            if (!holderConnectionId || !credDefId) {
                console.error("Missing connection or credential definition ID.");
                return;
            }

            const attributeMapping = {
                "Person ID": personId,
                "Name": name,
                "DOB": dob
            };

            await sendCredential(ISSUER_URL, holderConnectionId, attributeMapping, "", false, data.schemaDetails[0].schemaId, credDefId, false);
            console.log("✅ Credential sent successfully.", attributeMapping);
            setConfirmation(false);
        } catch (error) {
            console.error("❌ Error sending credential:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-800 to-indigo-700 text-gray-800 flex flex-col items-center justify-center p-6">
            <div className="bg-gray-50 p-8 rounded-xl shadow-md w-full max-w-md border border-gray-200">
                <h2 className="text-3xl font-semibold text-center mb-6 text-indigo-700">Credential Verification</h2>

                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="mb-6 w-full p-3 border rounded-lg focus:ring-indigo-400 focus:border-indigo-400 text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />

                {imagePreview && (
                    <img src={imagePreview} alt="Uploaded" className="w-full rounded-xl shadow-lg mb-6" />
                )}

                <button
                    onClick={extractText}
                    className="w-full bg-indigo-500 text-white p-3 rounded-lg hover:bg-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    disabled={!image || loading}
                >
                    {loading ? (
                        <div className="flex items-center justify-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mr-2">
                                <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="text-sm">
                                {progress}%
                            </span>
                        </div>
                    ) : (
                        "Verify Credential"
                    )}
                </button>

                {extractedText && (
                    <div className="mt-6 p-4 border rounded-xl bg-gray-100 border-gray-200">
                        <h3 className="text-lg font-semibold text-indigo-700 mb-2">Extracted Student Information:</h3>
                        <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{extractedText}</pre>
                    </div>
                )}

                {confirmation && (
                    <div className="mt-6 p-4 border rounded-xl bg-green-50 border-green-200">
                        <p className="text-sm text-gray-600 mb-4">Please confirm the extracted student data before submission.</p>
                        <button
                            onClick={handleConfirmAndSend}
                            className="w-full bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isMissingInfo()}
                        >
                            Confirm and Submit
                        </button>
                        {isMissingInfo() && <p className="text-red-500 mt-2">Some information is missing.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default IDCardOCR;

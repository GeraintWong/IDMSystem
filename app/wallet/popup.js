document.addEventListener('DOMContentLoaded', async () => {
    try {
        const walletResponse = await fetch('http://localhost:4000/get-wallet-credentials');
        const walletData = await walletResponse.json();

        if (walletData.WalletCredentials) {
            // Display the wallet credential section
            document.getElementById('walletDetailsSection').classList.remove('d-none');
            document.getElementById('walletDetailsSection').innerHTML += `<p>Credential ID: ${walletData.WalletCredentials[0].referent}</p>`;

            // Hide other sections since the wallet is already set up
            document.getElementById('setupSection').style.display = 'none';
            document.getElementById('inputDetailsSection').style.display = 'none';
            return; // Exit early since wallet credentials exist
        }

        const response = await fetch('http://localhost:4000/check-connection');
        const data = await response.json();

        if (data.connected) {
            window.connectionId = data.connection_details[0].connection_id;

            // Fetch schemas and credential definitions
            await fetchSchemaAndCredDefIds();

            // Show input details section if connected
            document.getElementById('setupSection').classList.add('d-none');
            document.getElementById('inputDetailsSection').classList.remove('d-none');
        } else {
            document.getElementById('setupSection').classList.remove('d-none');
            document.getElementById('inputDetailsSection').classList.add('d-none');
        }
    } catch (error) {
        console.error("Error checking wallet credentials or connection:", error);
        document.getElementById('setupSection').classList.remove('d-none');
        document.getElementById('inputDetailsSection').classList.add('d-none');
    }
});

//Email type shiii
document.getElementById("otpButton").addEventListener('click', async () => {
    const email = document.getElementById("emailInput").value;
    const response = await fetch("http://localhost:4000/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    });
    const data = await response.json();
    console.log(data.message)
    if (response.ok) {
        document.getElementById("otpSection").classList.remove('d-none');
        document.getElementById("setupSection").classList.add('d-none');
    }
})

document.getElementById("verifyButton").addEventListener('click', async () => {
    const email = document.getElementById("emailInput").value;
    const otp = document.getElementById("otp").value;
    const response = await fetch("http://localhost:4000/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
    });
    if(response.ok) {
        const startAgentResponse = await startAgent(email)
        if(startAgentResponse.ok) {
            console.log("bisa")
            submitStartCredential(email)
        }
    }
    const data = await response.json();
    console.log(data.message)
})

async function startAgent(emailInput){
    const loadingOverlay = document.getElementById("loadingOverlay");

    if (!emailInput) {
        alert("Please enter an email address.");
        return;
    }

    const walletName = emailInput.split("@")[0];

    // Show full-screen loading overlay
    loadingOverlay.classList.remove("d-none");
    document.getElementById("verifyButton").disabled = true;

    try {
        const response = await fetch("http://localhost:4000/start-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletName }),
        });

        const data = await response.json();

        if (response.ok) {
            chrome.runtime.sendMessage({
                type: "WALLET_NAME",
                walletName: walletName
            });

            console.log("📤 Wallet Name sent to background:", walletName);

            // Switch UI sections
            document.getElementById('otpSection').classList.add('d-none');
        } else {
            alert("Failed to start Aries agent: " + data.message);
        }
    } catch (error) {
        console.error("Error starting agent:", error);
        alert("Failed to start Aries agent.");
    } finally {
        // Hide full-screen loading overlay
        loadingOverlay.classList.add("d-none");
        document.getElementById("verifyButton").disabled = false;
        return {ok: true}
    }
}

// document.getElementById("setupButton").addEventListener("click", async () => {
//     const emailInput = document.getElementById("emailInput").value.trim();
//     const setupButton = document.getElementById("setupButton");
//     const loadingOverlay = document.getElementById("loadingOverlay");

//     if (!emailInput) {
//         alert("Please enter an email address.");
//         return;
//     }

//     const walletName = emailInput.split("@")[0];

//     // Show full-screen loading overlay
//     loadingOverlay.classList.remove("d-none");
//     setupButton.disabled = true;

//     try {
//         const response = await fetch("http://localhost:4000/start-agent", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ walletName }),
//         });

//         const data = await response.json();

//         if (response.ok) {
//             chrome.runtime.sendMessage({
//                 type: "WALLET_NAME",
//                 walletName: walletName
//             });

//             console.log("📤 Wallet Name sent to background:", walletName);

//             // Switch UI sections
//             document.getElementById('setupSection').classList.add('d-none');
//             document.getElementById('inputDetailsSection').classList.remove('d-none');
//         } else {
//             alert("Failed to start Aries agent: " + data.message);
//         }
//     } catch (error) {
//         console.error("Error starting agent:", error);
//         alert("Failed to start Aries agent.");
//     } finally {
//         // Hide full-screen loading overlay
//         loadingOverlay.classList.add("d-none");
//         setupButton.disabled = false;
//     }
// });

async function fetchSchemaAndCredDefIds() {
    try {
        const response = await fetch("http://localhost:4000/get-schema-and-cred-def-ids");
        const data = await response.json();

        window.schemaId = data.schemaDetails[0].schemaId;
        window.schemaName = data.schemaDetails[0].schemaName;
        window.attributes = data.schemaDetails[0].attributes;
        window.credDefId = data.credDefId[0];

        console.log("Selected Schema:", window.schemaName);
        console.log("Attributes:", window.attributes);

    } catch (error) {
        console.error("Error fetching schema and credential definition IDs:", error);
    }
}

// function generateDynamicForm(attributes) {
//     const formContainer = document.getElementById("dynamicInputs");
//     formContainer.innerHTML = "";

//     attributes.forEach(attr => {
//         const input = document.createElement("input");
//         input.type = "text";
//         input.id = attr;
//         input.name = attr;
//         input.placeholder = `Enter ${attr}`;
//         input.required = true;
//         input.classList.add('form-control', 'mt-3')
//         formContainer.appendChild(input);
//     });
// }

async function submitStartCredential (email) {
    let maxRetries = 5; // Maximum retry attempts
    let attempts = 0;

    while (attempts < maxRetries) {
        try {
            const response = await fetch('http://localhost:4000/check-connection');
            const data = await response.json();
            if (data.connection_details && data.connection_details.length > 0) {
                connectionId = data.connection_details[0].connection_id;
                window.connectionId = connectionId;
                break; 
            }
        } catch (error) {
            console.error(`Attempt ${attempts + 1}: Error fetching connection data`, error);
        }
    }
    const loadingOverlay = document.getElementById("loadingOverlay");

    loadingOverlay.classList.remove("d-none");

    const credAttrs = [{
        name: "Email",
        mime_type: "text/plain",
        value: email.trim(),
    }];

    if (!window.connectionId || !window.schemaId || !window.credDefId) {
        console.error("Missing values:", { 
            connectionId: window.connectionId, 
            schemaId: window.schemaId, 
            credDefId: window.credDefId 
        });
        alert("Missing connection ID, schema ID, or credential definition ID.");

        // Hide loading if there's an error
        loadingOverlay.classList.add("d-none");
        submitButton.classList.remove("d-none");
        dynamicInputs.classList.remove("d-none");

        return;
    }

    const payload = {
        connectionId: window.connectionId,
        credAttrs,
        comment: `Issuing ${window.schemaName} credential`,
        autoRemove: true,
        schemaId: window.schemaId,
        credDefId: window.credDefId
    };

    try {
        const response = await fetch("http://localhost:4000/send-credential-proposal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (response.ok) {
            console.log("Credential proposal sent:", result);

            async function checkWalletCredentials(attempt = 0) {
                if (attempt >= 10) {
                    console.warn("Timeout: Wallet credentials not received.");
                    alert("Timeout: Wallet credentials not received.");
                    loadingOverlay.classList.add("d-none");
                    // submitButton.classList.remove("d-none");
                    // dynamicInputs.classList.remove("d-none");
                    return;
                }

                try {
                    const walletResponse = await fetch("http://localhost:4000/get-wallet-credentials");
                    const walletData = await walletResponse.json();

                    if (walletData.WalletId) {
                        // Stop loading, show wallet details
                        document.getElementById("walletDetailsSection").classList.remove('d-none');
                        document.getElementById("walletId").textContent = walletData.WalletId;

                        // Hide previous sections
                        // document.getElementById("inputDetailsSection").classList.add('d-none');

                        return;
                    }
                } catch (error) {
                    console.error("Error fetching Wallet ID:", error);
                }

                setTimeout(() => checkWalletCredentials(attempt + 1), 1000);
            }

            // Start polling for wallet credentials
            checkWalletCredentials();
        } else {
            console.error("Server error:", result);
            alert("Error: " + result.message);

            // Hide loading if there's an error
            loadingOverlay.classList.add("d-none");
            // submitButton.classList.remove("d-none");
            // dynamicInputs.classList.remove("d-none");
        }
    } catch (error) {
        console.error("Error sending credential proposal:", error);
        alert("Failed to send credential proposal.");

        // Hide loading if there's an error
        loadingOverlay.classList.add("d-none");
        // submitButton.classList.remove("d-none");
        // dynamicInputs.classList.remove("d-none");
    }
}

document.getElementById("detailsForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const loadingOverlay = document.getElementById("loadingOverlay");
    const dynamicInputs = document.getElementById("dynamicInputs");

    // Show loading, hide inputs and button
    loadingOverlay.classList.remove("d-none");
    dynamicInputs.classList.add("d-none");

    // Collect input fields
    const inputs = document.querySelectorAll("#dynamicInputs input");
    const credAttrs = Array.from(inputs).map(input => ({
        name: input.name,
        mime_type: "text/plain",
        value: input.value.trim(),
    }));

    if (!window.connectionId || !window.schemaId || !window.credDefId) {
        console.error("Missing values:", { 
            connectionId: window.connectionId, 
            schemaId: window.schemaId, 
            credDefId: window.credDefId 
        });
        alert("Missing connection ID, schema ID, or credential definition ID.");

        // Hide loading if there's an error
        loadingOverlay.classList.add("d-none");
        submitButton.classList.remove("d-none");
        dynamicInputs.classList.remove("d-none");

        return;
    }

    const payload = {
        connectionId: window.connectionId,
        credAttrs,
        comment: `Issuing ${window.schemaName} credential`,
        autoRemove: true,
        schemaId: window.schemaId,
        credDefId: window.credDefId
    };

    try {
        const response = await fetch("http://localhost:4000/send-credential-proposal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (response.ok) {
            console.log("Credential proposal sent:", result);

            async function checkWalletCredentials(attempt = 0) {
                if (attempt >= 10) {
                    console.warn("Timeout: Wallet credentials not received.");
                    alert("Timeout: Wallet credentials not received.");
                    loadingOverlay.classList.add("d-none");
                    submitButton.classList.remove("d-none");
                    dynamicInputs.classList.remove("d-none");
                    return;
                }

                try {
                    const walletResponse = await fetch("http://localhost:4000/get-wallet-credentials");
                    const walletData = await walletResponse.json();

                    if (walletData.WalletId) {
                        // Stop loading, show wallet details
                        document.getElementById("walletDetailsSection").classList.remove('d-none');
                        document.getElementById("walletId").textContent = walletData.WalletId;

                        // Hide previous sections
                        document.getElementById("inputDetailsSection").classList.add('d-none');

                        return;
                    }
                } catch (error) {
                    console.error("Error fetching Wallet ID:", error);
                }

                setTimeout(() => checkWalletCredentials(attempt + 1), 1000);
            }

            // Start polling for wallet credentials
            checkWalletCredentials();
        } else {
            console.error("Server error:", result);
            alert("Error: " + result.message);

            // Hide loading if there's an error
            loadingOverlay.classList.add("d-none");
            submitButton.classList.remove("d-none");
            dynamicInputs.classList.remove("d-none");
        }
    } catch (error) {
        console.error("Error sending credential proposal:", error);
        alert("Failed to send credential proposal.");

        // Hide loading if there's an error
        loadingOverlay.classList.add("d-none");
        submitButton.classList.remove("d-none");
        dynamicInputs.classList.remove("d-none");
    }
});


// Function to accept Aries invitation
async function acceptAriesInvitation(invitationUrl) {
    try {
        const response = await fetch("http://localhost:4000/accept-invitation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invitationUrl }),
        });

        const data = await response.json();
        return response.ok ? data.success : false;
    } catch (error) {
        console.error("Error during Aries invitation acceptance:", error);
        return false;
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    setTimeout(async () => {
        if (message.type === "ARIES_PROOF_REQUEST") {
            console.log("📩 Proof request received in popup!");

            // Show popup
            document.getElementById("proofRequestSection").classList.remove('d-none');

            // Fetch requested attributes
            const response = await fetch("http://localhost:4000/send-presentation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userConfirmed: false })
            });

            const data = await response.json();
            console.log("📥 Requested Attributes:", data);

            if (data.message === "User confirmation required.") {
                // Display requested attributes
                const attributesDiv = document.getElementById("requestedAttributes");
                attributesDiv.innerHTML = ""; // Clear previous content

                Object.entries(data.requestedAttributes).forEach(([key, value]) => {
                    const p = document.createElement("p");
                    p.innerText = `${key}: ${value.name}`;
                    attributesDiv.appendChild(p);
                });

                // Confirm button event listener
                document.getElementById("confirmShare").onclick = async () => {
                    console.log("✅ Final confirmation given, sending presentation...");

                    // Send the proof presentation
                    await fetch("http://localhost:4000/send-presentation", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userConfirmed: true })
                    });

                    console.log("✅ Presentation sent.");
                    alert("Presentation sent successfully!");
                    document.getElementById("proofRequestSection").classList.add('d-none');
                };

                // Reject button event listener
                document.getElementById("rejectShare").onclick = () => {
                    console.log("❌ User rejected sharing credentials.");
                    alert("You declined to share your credentials.");
                    document.getElementById("proofRequestSection").classList.add('d-none');
                };
            }
        }
    }, 2000); // 2-second delay before checking the message type
});

fetchSchemaAndCredDefIds();
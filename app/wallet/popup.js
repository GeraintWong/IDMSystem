document.addEventListener('DOMContentLoaded', async () => {
    try {
        const isLoggedIn = await checkLoginStatus();
        const storedData = await getStoredPasswordData();

        if (!isLoggedIn && storedData.passwordHash && storedData.passwordSalt) {
            document.getElementById('setupSection')?.classList.add('d-none');
            document.getElementById("inputPasswordSection").classList.remove('d-none')
            document.getElementById("enterPasswordText").innerHTML = "Enter Password"
        } else {
            const data = await new Promise((resolve) => {
                chrome.storage.local.get("loginRequest", resolve);
            });

            if (data.loginRequest) {
                document.getElementById("signingInSectionId").classList.remove('d-none')
                document.getElementById("loadingOverlayWalletSection")?.classList.remove("d-none");
                document.getElementById("setupSection").classList.add("d-none")
                console.log("✅ Login popup displayed!");

                // ✅ Remove loginRequest from storage
                chrome.storage.local.remove("loginRequest");
            } else {
                // ✅ Fetch wallet credentials
                const response = await fetch('http://localhost:4000/get-wallet-credentials');
                if (!response.ok) throw new Error(`Server error: ${response.status}`);

                const walletData = await response.json();

                // ✅ Ensure `WalletCredentials` exists and is an array
                if (Array.isArray(walletData.WalletCredentials) && walletData.WalletCredentials.length > 0) {
                    const walletSection = document.getElementById('walletDetailsSection');
                    if (!walletSection) throw new Error("❌ Element 'walletDetailsSection' not found!");

                    walletSection.classList.remove('d-none');
                    walletSection.innerHTML = "<h3>Verified Credentials</h3>";

                    walletData.WalletCredentials.forEach(cred => {
                        walletSection.innerHTML += `
                        <p><strong><small>Credential:</small></strong> <small>${cred.cred_def_name}</small><br> 
                           <strong><small>Credential ID:</small></strong> <small>${cred.referent}</small></p>
                        <hr>`;
                    });

                    // ✅ Hide setup sections
                    document.getElementById('setupSection')?.classList.add('d-none');
                    document.getElementById('inputDetailsSection')?.classList.add('d-none');

                    return; // ✅ Exit early since credentials exist
                }

            }
        }

    } catch (error) {
        console.error("❌ Error checking wallet credentials or connection:", error);
        document.getElementById('setupSection')?.classList.remove('d-none');
    }
});

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


//Email type shiii
document.getElementById("otpButton").addEventListener('click', async () => {
    const email = document.getElementById("emailInput").value;
    document.getElementById("loadingOverlaySetupSection").classList.remove('d-none');
    const response = await fetch("http://localhost:4000/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    });
    const data = await response.json();
    console.log(data.message)
    const maskedEmail = maskEmail(email)
    if (response.ok) {
        document.getElementById("otpSection").classList.remove('d-none');
        document.getElementById("setupSection").classList.add('d-none');
        document.getElementById("loadingOverlaySetupSection").classList.add('d-none');
        document.getElementById("otpSentText").innerHTML = "OTP was sent to " + maskedEmail;
        const otpInputs = document.querySelectorAll(".otp-input");

        otpInputs.forEach((input, index) => {
            input.addEventListener("input", (e) => {
                if (e.target.value && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            });

            input.addEventListener("keydown", (e) => {
                if (e.key === "Backspace" && index > 0 && !e.target.value) {
                    otpInputs[index - 1].focus();
                }
            });
        });
    }
})

document.getElementById("verifyButton").addEventListener('click', async () => {
    const email = document.getElementById("emailInput").value;
    const otpInputs = document.querySelectorAll(".otp-input");
    const otp = Array.from(otpInputs).map(input => input.value).join("");

    if (otp.length !== 6) {
        console.error("OTP must be 6 digits");
        return;
    }
    const response = await fetch("http://localhost:4000/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
    });
    if (response.ok) {
        const hashedEmail = await hashEmail(email)
        const startAgentResponse = await startAgent(hashedEmail)
        if (startAgentResponse.ok) {
            submitStartCredential(hashedEmail)
        }
    }
    const data = await response.json();
    console.log(data.message)
})

async function startAgent(emailInput) {
    const loadingOverlay = document.getElementById("loadingOverlay");

    if (!emailInput) {
        alert("Please enter an email address.");
        return;
    }
    const walletName = await getUUIDFromServer();
    window.walletName = walletName;
    await fetch('http://localhost:4000/api/saveUserCredentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid: walletName, email: emailInput }),
    });
    // const walletName = emailInput

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
        return { ok: true }
    }
}

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

async function submitStartCredential(email) {
    let maxRetries = 5; // Maximum retry attempts
    let attempts = 0;

    while (attempts < maxRetries) {
        try {
            const response = await fetch('http://localhost:4000/check-connection');
            const data = await response.json();
            if (data.connection_details && data.connection_details.length > 0) {
                let connectionId = data.connection_details[0].connection_id;
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
            await fetch('http://localhost:4000/api/updateUserCredentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uuid: window.walletName }),
            });

            console.log(window.walletName)

            console.log("Credential proposal sent:", result);
            document.getElementById("inputPasswordSection").classList.remove('d-none')
            document.getElementById("enterPasswordText").innerHTML = "Setup Password"
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    setTimeout(async () => {
        if (message.type === "ARIES_PROOF_REQUEST") {
            console.log("📩 Proof request received in popup!");

            // Show popup
            document.getElementById("signingInSectionId").classList.add('d-none')
            document.getElementById('loadingOverlayWalletSection').classList.add('d-none');
            document.getElementById("walletDetailsSection").classList.add('d-none');
            document.getElementById("proofRequestSection").classList.remove('d-none');

            // Fetch requested attributes
            const response = await fetch("http://localhost:4000/send-presentation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userConfirmed: false })
            });

            if (!response.ok) {
                document.getElementById("proofRequestSection").classList.add('d-none');
                document.getElementById('rejectCredentialSection').innerHTML = `
                    <div class="alert alert-danger text-center" role="alert">
                        <strong>Unable to share credentials!</strong><br>
                        Your credential is either <strong>invalid</strong> or has been <strong>revoked</strong>.
                        Please check your wallet or request a new valid credential.
                    </div>`;

                // Ensure the section is visible
                document.getElementById('rejectCredentialSection').classList.remove('d-none');

                console.error("Failed to share credentials. The credential may be invalid or revoked.");
            }

            const data = await response.json();
            console.log("📥 Requested Attributes:", data);

            if (data.message === "User confirmation required.") {
                // Display requested attributes
                const attributesDiv = document.getElementById("requestedAttributes");
                attributesDiv.innerHTML = ""; // Clear previous content

                Object.entries(data.requestedAttributes).forEach(([key]) => {
                    const p = document.createElement("p");
                    const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
                    p.innerText = `${capitalizedKey}`;
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
                    alert("Credential shared successfully!");
                    const response = await fetch('http://localhost:4000/get-wallet-credentials');
                    if (!response.ok) throw new Error(`Server error: ${response.status}`);

                    const walletData = await response.json();
                    const walletSection = document.getElementById('walletDetailsSection');
                    if (!walletSection) throw new Error("❌ Element 'walletDetailsSection' not found!");

                    walletSection.classList.remove('d-none');
                    walletSection.innerHTML = "<h3>Verified Credentials</h3>";

                    walletData.WalletCredentials.forEach(cred => {
                        walletSection.innerHTML += `
                        <p><strong><small>Credential:</small></strong> <small>${cred.cred_def_name}</small><br> 
                           <strong><small>Credential ID:</small></strong> <small>${cred.referent}</small></p>
                        <hr>`;
                    });
                    document.getElementById("proofRequestSection").classList.add('d-none');
                };

                // Reject button event listener
                document.getElementById("rejectShare").onclick = () => {
                    alert("You declined to share your credentials.");
                    document.getElementById("proofRequestSection").classList.add('d-none');
                };
            }
        }
    }, 2000); // 2-second delay before checking the message type
});

fetchSchemaAndCredDefIds();

//Some other stuff
function maskEmail(email) {
    const parts = email.split("@");
    if (parts.length !== 2) {
        return email; // Invalid email format, return original
    }

    const username = parts[0];
    const domain = parts[1];

    let maskedUsername = "";
    if (username.length <= 3) {
        maskedUsername = username.slice(0, 1) + "***"; // Show first letter, mask the rest
    } else {
        maskedUsername = username.slice(0, 2) + "***" + username.slice(-2); // Show first and last two letters, mask middle
    }

    return maskedUsername + "@" + domain;
}

//Password stuff
document.getElementById("submitPasswordButton").addEventListener("click", async () => {
    const password = document.getElementById("passwordInput").value;

    // Check if a password has been set
    const storedData = await getStoredPasswordData();

    if (!storedData.passwordHash || !storedData.passwordSalt) {
        await savePassword(password);
        await loginSuccess();
        document.getElementById("inputPasswordSection").classList.add('d-none')
        const response = await fetch('http://localhost:4000/get-wallet-credentials');
        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const walletData = await response.json();

        // ✅ Ensure `WalletCredentials` exists and is an array
        if (Array.isArray(walletData.WalletCredentials) && walletData.WalletCredentials.length > 0) {
            const walletSection = document.getElementById('walletDetailsSection');
            if (!walletSection) throw new Error("❌ Element 'walletDetailsSection' not found!");

            walletSection.classList.remove('d-none');
            walletSection.innerHTML = "<h3>Your Credentials</h3>";

            walletData.WalletCredentials.forEach(cred => {
                walletSection.innerHTML += `
                        <p><strong><small>Credential:</small></strong> <small>${cred.cred_def_name}</small><br> 
                           <strong><small>Credential ID:</small></strong> <small>${cred.referent}</small></p>
                        <hr>`;
            });
        }
    } else {
        const isValid = await verifyPassword(password);
        if (isValid) {
            await loginSuccess();
            document.getElementById("inputPasswordSection").classList.add('d-none')
            const response = await fetch('http://localhost:4000/get-wallet-credentials');
            if (!response.ok) throw new Error(`Server error: ${response.status}`);

            const walletData = await response.json();

            // ✅ Ensure `WalletCredentials` exists and is an array
            if (Array.isArray(walletData.WalletCredentials) && walletData.WalletCredentials.length > 0) {
                const walletSection = document.getElementById('walletDetailsSection');
                if (!walletSection) throw new Error("❌ Element 'walletDetailsSection' not found!");

                walletSection.classList.remove('d-none');
                walletSection.innerHTML = "<h3>Your Credentials</h3>";

                walletData.WalletCredentials.forEach(cred => {
                    walletSection.innerHTML += `
                        <p><strong><small>Credential:</small></strong> <small>${cred.cred_def_name}</small><br> 
                           <strong><small>Credential ID:</small></strong> <small>${cred.referent}</small></p>
                        <hr>`;
                });
            }
        } else {
            alert("Login Failed! Incorrect password.");
        }
    }
});

async function hashPassword(password, salt = null) {
    // Generate a random 16-byte salt if none is provided
    if (!salt) {
        const saltArray = new Uint8Array(16);
        crypto.getRandomValues(saltArray);
        salt = Array.from(saltArray).map(byte => byte.toString(16).padStart(2, "0")).join("");
    }

    // Encode password
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import the password as a key
    const key = await crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );

    // Derive a 256-bit key using PBKDF2 with SHA-256
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: new TextEncoder().encode(salt), // Use stored salt
            iterations: 100000, // Increase to make brute-force harder
            hash: "SHA-256"
        },
        key,
        256
    );

    // Convert derivedBits to hex string
    const hashArray = Array.from(new Uint8Array(derivedBits));
    const hash = hashArray.map(byte => byte.toString(16).padStart(2, "0")).join("");

    return { hash, salt }; // Return both hash and salt
}


async function savePassword(password) {
    const { hash, salt } = await hashPassword(password);

    chrome.storage.local.set({ passwordHash: hash, passwordSalt: salt }, () => {
        console.log("Password saved securely with PBKDF2!");
    });
}

async function verifyPassword(inputPassword) {
    return new Promise((resolve) => {
        chrome.storage.local.get(["passwordHash", "passwordSalt"], async (data) => {
            if (!data.passwordHash || !data.passwordSalt) {
                console.log("No password set.");
                resolve(false); // No password stored, cannot verify
                return;
            }

            // Recompute the hash using the stored salt
            const { hash: inputHash } = await hashPassword(inputPassword, data.passwordSalt);

            if (inputHash === data.passwordHash) {
                console.log("✅ Access Granted!");
                resolve(true);  // Password correct
            } else {
                alert("Password incorrect")
                console.log("❌ Incorrect Password!");
                resolve(false); // Password incorrect
            }
        });
    });
}


async function loginSuccess() {
    await chrome.storage.session.set({ session_wallet: true });
    console.log("User logged in, session stored.");
}

async function checkLoginStatus() {
    const session = await chrome.storage.session.get("session_wallet");
    return !!session.session_wallet; // Returns true if session exists, false otherwise
}

// Helper function to retrieve stored password hash and salt
async function getStoredPasswordData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(["passwordHash", "passwordSalt"], (result) => {
            resolve({
                passwordHash: result.passwordHash || null,
                passwordSalt: result.passwordSalt || null
            });
        });
    });
}

//Email hashing stuff
async function hashEmail(email) {
    if (!email) {
        throw new Error("Email cannot be empty or null.");
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(email);

    try {
        const hashBuffer = await crypto.subtle.digest("SHA-256", data); // Use SHA-256 (or better)
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        return hashHex;
    } catch (error) {
        console.error("Hashing error:", error);
        throw error; // Rethrow the error to be handled by the caller
    }
}

//UUID stuff
async function getUUIDFromServer() {
    try {
        const response = await fetch('http://localhost:4000/generate-uuid'); // Replace with your server's URL
        const data = await response.json();
        return data.uuid;
    } catch (error) {
        console.error('Error fetching UUID:', error);
        return null;
    }
}




chrome.runtime.onSuspend.addListener(() => {
    console.log("Chrome is closing. Logging out...");
    logout();
});

function logout() {
    chrome.storage.session.clear(() => {
        console.log("Logged out: Session data cleared.");
    });
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("📨 Message received in background:", message);

    if (message.type === "LOGIN_REQUEST") {
        console.log("🔐 Login request received!");

        // Wake up the extension popup (if it's closed)
        chrome.storage.local.set({ loginRequest: true });
        
        chrome.action.openPopup();

        sendResponse({ success: true, message: "Login request received, prompting user..." });
    }

    if (message.type === "WALLET_NAME") {
        chrome.storage.local.set({ storedWalletName: message.walletName }, () => {
            console.log("✅ Wallet Name stored persistently:", message.walletName);
        });
        return;
    }

    if (message.type === "SENT_PROOF") {
        chrome.runtime.sendMessage(message);
    }

    if (message.type === "ARIES_PROOF_REQUEST") {
        console.log("🔄 Forwarding ARIES_PROOF_REQUEST to popup.js");
        chrome.runtime.sendMessage(message);
    }

    if(message.type === "CREDENTIAL_CHECK") {
        chrome.storage.local.get("storedWalletName", (result) => {
            const walletName = result.storedWalletName || "defaultLabel"; // Fallback value
            if (walletName) {
                console.log("🔄 Sending CREDENTIAL_CHECK_LABEL...");
                chrome.runtime.sendMessage({
                    type: "CREDENTIAL_CHECK_LABEL",
                    success: true,
                    label: walletName
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("Chrome runtime error:", chrome.runtime.lastError);
                    } else {
                        console.log("✅ Message sent successfully.");
                    }
                });
                sendResponse({ type: "CREDENTIAL_CHECK_LABEL", success: true, label: walletName });
            } else {
                console.warn("⚠️ No data received from server.");
                sendResponse({ type: "CREDENTIAL_CHECK_LABEL", success: false });
            }
        });
        return true;
    }

    if (message.type === "ARIES_INVITATION") {
        console.log("⏳ Fetching invitation...");

        fetch("http://localhost:4000/accept-invitation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invitationUrl: message.payload })
        })
        .then(response => response.json())
        .then(data => {
            console.log("📥 Fetch response received:", data);

            chrome.storage.local.get("storedWalletName", (result) => {
                const walletName = result.storedWalletName || "defaultLabel"; // Fallback value
                if (data && walletName) {
                    console.log("🔄 Sending ARIES_CONNECTION_RESULT...");
                    chrome.runtime.sendMessage({
                        type: "ARIES_CONNECTION_RESULT",
                        success: true,
                        label: walletName
                    }, () => {
                        if (chrome.runtime.lastError) {
                            console.error("Chrome runtime error:", chrome.runtime.lastError);
                        } else {
                            console.log("✅ Message sent successfully.");
                        }
                    });
                    sendResponse({ type: "ARIES_CONNECTION_RESULT", success: true, label: walletName });
                } else {
                    console.warn("⚠️ No data received from server.");
                    sendResponse({ type: "ARIES_CONNECTION_RESULT", success: false });
                }
            });
        })
        .catch(error => {
            console.error("❌ Fetch error:", error);
            sendResponse({ type: "ARIES_CONNECTION_RESULT", success: false, error: error.message });
        });

        return true;
    }
});

window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data) return;

    if (event.data?.type === "ARIES_RESPONSE" && !event.data?.data?.type) {
        console.log("🔄 Ignoring self-generated ARIES_RESPONSE");
        return;
    }

    chrome.runtime.sendMessage(event.data, (response) => {
        console.log("📨 Forwarding response from background:", response);
        window.postMessage({ type: "ARIES_RESPONSE", data: response }, "*");
    });
});


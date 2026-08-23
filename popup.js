const toggle_button = document.getElementById("toggle_extension_button");

toggle_button.addEventListener("click", toggleActivation);

updateActivationButton();

chrome.storage.local.get("api_key", (result) => {
    if (result.api_key) {
        document.getElementById("registration").style.display = "none";
        return;
    }

    document.getElementById("toggle_extension_button").style.display = "none";

    const registration_button = document.getElementById("registration_button");

    registration_button.addEventListener("click", async () => {    
        const invite_code = document.getElementById("invite_field").value.trim();

        const response = await fetch(`${hummingbird_config.api_url}/register`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({invite_code: invite_code})
            }
        );

        if (!response.ok) {
            console.error("Invalid invite code");
            return;
        }

        const data = await response.json();

        await chrome.storage.local.set({
            api_key: data.api_key,
            enabled: false
        });

        document.getElementById("toggle_extension_button").style.display = "block";
        document.getElementById("registration").style.display = "none";

        updateActivationButton();
    });
});

async function updateActivationButton() {
    const result = await chrome.storage.local.get("enabled");

    const enabled = result.enabled ?? false;

    toggle_button.textContent = enabled ? "Enabled" : "Disabled";
}

async function toggleActivation() {
    const result = await chrome.storage.local.get("enabled");

    const enabled = result.enabled ?? false;

    await chrome.storage.local.set({
        enabled: !enabled
    });

    updateActivationButton();
}



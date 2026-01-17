document.getElementById('uselessBtn').addEventListener('click', () => {
    // Save state to storage so background.js knows mode is active
    chrome.storage.local.set({ mode: 'useless' });
    document.getElementById('status').innerText = "Mode: Useless (Open new tabs!)";
});

document.getElementById('usefulBtn').addEventListener('click', () => {
    // Turn off useless mode logic
    chrome.storage.local.set({ mode: 'useful' });
    document.getElementById('status').innerText = "Mode: Useful (Tiling...)";
    
    // Send message to background to trigger the "Tiling" immediately
    chrome.runtime.sendMessage({ action: "organize_windows" });
});

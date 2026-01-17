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

document.getElementById('cameraBtn').addEventListener('click', () => {
    // Open camera.html in a new window with correct type
    const cameraUrl = chrome.runtime.getURL('camera.html');
    console.log('Opening camera at:', cameraUrl);
    chrome.windows.create({
        url: cameraUrl,
        type: 'normal',  // Changed from 'popup' to 'normal' for better compatibility
        width: 800,
        height: 600,
        focused: true
    });
    document.getElementById('status').innerText = "Camera opened! Wave to clear chaos.";
});
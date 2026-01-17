// Load and display current mode on popup open
chrome.storage.local.get('mode', (result) => {
    updateModeDisplay(result.mode || 'none');
});

function updateModeDisplay(mode) {
    const modeDisplay = document.getElementById('currentMode');
    if (mode === 'useless') {
        modeDisplay.innerText = 'Current Mode: Useless';
        modeDisplay.style.backgroundColor = '#ffe6e6';
        modeDisplay.style.color = '#cc0000';
    } else if (mode === 'useful') {
        modeDisplay.innerText = 'Current Mode: Useful';
        modeDisplay.style.backgroundColor = '#e6f7e6';
        modeDisplay.style.color = '#2d862d';
    } else {
        modeDisplay.innerText = 'Current Mode: None';
        modeDisplay.style.backgroundColor = '#f0f0f0';
        modeDisplay.style.color = '#666';
    }
}

document.getElementById('uselessBtn').addEventListener('click', () => {
    // 1. Save state
    chrome.storage.local.set({ mode: 'useless' });
    document.getElementById('status').innerText = "Mode: Useless (CHAOS!)";
    
    // 2. Send message to background to trigger immediate chaos
    chrome.runtime.sendMessage({ action: "activate_useless_mode" });
});

document.getElementById('usefulBtn').addEventListener('click', () => {
    // Turn off useless mode logic
    chrome.storage.local.set({ mode: 'useful' });
    updateModeDisplay('useful');
    document.getElementById('status').innerText = "Mode: Useful (Tiling...)";
    
    // Send message to background to trigger the "Tiling" immediately
    chrome.runtime.sendMessage({ action: "organize_windows" });
});


document.getElementById('disableBtn').addEventListener('click', () => {
    chrome.storage.local.set({ mode: 'none' });
    updateModeDisplay('none');
    document.getElementById('status').innerText = "All modes disabled";
});

document.getElementById('collapseBtn').addEventListener('click', async () => {
    // Get the last focused window (the one where popup was opened from)
    const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
    const lastFocused = await chrome.windows.getCurrent() || windows[0];
    
    chrome.runtime.sendMessage({ 
        action: "collapse_tabs",
        targetWindowId: lastFocused.id,
        trigger: "popup"
    });
    document.getElementById('status').innerText = "Collapsing all tabs into one window...";
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
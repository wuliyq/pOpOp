// Load and display current mode on popup open
chrome.storage.local.get('mode', (result) => {
    updateModeDisplay(result.mode || 'none');
});

async function getPrimaryWorkArea() {
    try {
        if (chrome.system && chrome.system.display) {
            const displays = await chrome.system.display.getInfo();
            const primary = displays.find((d) => d.isPrimary) || displays[0];
            const area = primary?.workArea;
            if (area) {
                return { width: area.width, height: area.height, left: area.left, top: area.top };
            }
        }
    } catch (err) {
        console.warn("Falling back to default screen size", err);
    }
    return { width: 1500, height: 900, left: 0, top: 0 };
}

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

document.getElementById('cameraBtn').addEventListener('click', async () => {
    // Open camera.html near center, clamped to visible work area to avoid bounds errors
    const cameraUrl = chrome.runtime.getURL('camera.html');
    console.log('Opening camera at:', cameraUrl);

    const { width: screenW, height: screenH, left: screenLeft, top: screenTop } = await getPrimaryWorkArea();

    const desiredW = 960;
    const desiredH = 1080;
    const width = Math.min(desiredW, screenW);
    const height = Math.min(desiredH, screenH);

    // Center within the work area and clamp to keep fully visible
    const left = Math.min(Math.max(screenLeft, screenLeft + Math.floor((screenW - width) / 2)), screenLeft + screenW - width);
    const top = Math.min(Math.max(screenTop, screenTop + Math.floor((screenH - height) / 2)), screenTop + screenH - height);
    
    await chrome.windows.create({
        url: cameraUrl,
        type: 'normal',
        width,
        height,
        left,
        top,
        state: 'normal',
        focused: true
    });
    
    document.getElementById('status').innerText = "Camera opened! Wave to clear chaos.";
    
    // Then exit fullscreen for other windows, keeping their size
    try {
        const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
        
        for (const win of windows) {
            if (win.state === 'fullscreen') {
                // Only exit fullscreen, don't change size
                chrome.windows.update(win.id, { state: 'normal' }).catch(e => {});
            }
            // Don't touch maximized windows - they stay large but not fullscreen
        }
    } catch (err) {
        console.log("Could not exit fullscreen:", err);
    }
});
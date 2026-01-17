// Variable to track the size of the "last" window for the recursive shrinking effect
let lastWidth = 1000; 
let lastHeight = 800;
let isSpawningLoop = false; // Flag to prevent infinite loop

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

// ==========================================
// 1. USELESS MODE
// ==========================================
async function detachAndStack(tab) {
    // Ignore tabs created during the spawning loop to prevent infinite recursion
    if (isSpawningLoop) return;

    // Check if we've hit the "too small" limit (triggers the finale)
    const shouldLoop = lastWidth <= 400;
    
    if (shouldLoop) {
        isSpawningLoop = true;
        try {
            // Reset sizes and trigger the 10-window explosion
            await loopToCreateWindows(tab);
        } finally {
            isSpawningLoop = false;
        }
    } else {
        // Normal behavior: Shrink and stack
        lastWidth = Math.floor(lastWidth * 0.9); // Shrink by 10%
        lastHeight = Math.floor(lastHeight * 0.9);
        
        await createSingleWindow(tab, lastWidth, lastHeight);
    }
}

async function createSingleWindow(tab, width, height) {
    const randomLeft = Math.floor(Math.random() * 900); 
    const randomTop = Math.floor(Math.random() * 600);

    try {
        await chrome.windows.create({
            tabId: tab.id,
            width: width,
            height: height,
            left: randomLeft + 100,
            top: randomTop,
            focused: true
        });
    } catch (err) {
        console.log("Tab detach failed (likely already closed):", err);
    }
}

async function loopToCreateWindows(tab) {
    lastWidth = 1000;
    lastHeight = 800;

    // First, handle the actual tab that triggered this
    await createSingleWindow(tab, lastWidth, lastHeight);

    // Now trigger the loop: open 10 more junk windows at random locations
    for (let i = 0; i < 30; i++) {
        const randomWidth = Math.floor(Math.random() * 400) + 600; // 600-1000px
        const randomHeight = Math.floor(Math.random() * 300) + 500; // 500-800px
        const randomLeft = Math.floor(Math.random() * 500);
        const randomTop = Math.floor(Math.random() * 600);

        // Create new tab and window
        const gifURL = chrome.runtime.getURL("gif.html");
        const createdWindow = await chrome.windows.create({
            url: gifURL,
            type: "popup",
            width: randomWidth,
            height: randomHeight,
            left: randomLeft,
            top: randomTop,
            focused: true
        });
        
        // Store ID of created junk window for potential cleanup later
        await chrome.storage.local.get({ junkWindows: [] }, (result) => {
            const updatedList = result.junkWindows;
            updatedList.push(createdWindow.id);
            chrome.storage.local.set({ junkWindows: updatedList });
        });

        // Small delay between windows for visual "pop" effect
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const cameraUrl = chrome.runtime.getURL('camera.html');
    console.log('Opening camera at:', cameraUrl);
    chrome.windows.create({
        url: cameraUrl,
        type: 'normal',  // Changed from 'popup' to 'normal' for better compatibility
        width: 800,
        height: 600,
        focused: true
    });
}

async function triggerImmediateChaos() {
    // Get ALL tabs currently open in normal windows
    const tabs = await chrome.tabs.query({ windowType: 'normal' });

    // Loop through them one by one
    for (const tab of tabs) {
        if (isSpawningLoop) break; // Stop if the explosion started
        await detachAndStack(tab);
        // Visual delay for "dealing cards" effect
        await new Promise(r => setTimeout(r, 150));
    }
}

// ==========================================
// 2. USEFUL MODE
// ==========================================

async function organizeWindows() {
    // Get all windows with their tabs
    const windows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
    
    // Collect all tabs from all windows
    const allTabs = [];
    for (const win of windows) {
        for (const tab of win.tabs) {
            allTabs.push({ tabId: tab.id, windowId: win.id });
        }
    }
    
    const count = allTabs.length;
    const { width: screenW, height: screenH, left: screenLeft, top: screenTop } = await getPrimaryWorkArea();
    
    // Calculate Grid (Columns and Rows)
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    
    const winW = Math.floor(screenW / cols);
    const winH = Math.floor(screenH / rows);

    // Create or update windows for each tab
    for (let i = 0; i < count; i++) {
        const { tabId, windowId } = allTabs[i];
        
        // Calculate Grid Position
        const colIndex = i % cols;
        const rowIndex = Math.floor(i / cols);
        
        const newLeft = screenLeft + colIndex * winW;
        const newTop = screenTop + rowIndex * winH;

        // Check if this is the only tab in its window
        const originalWindow = windows.find(w => w.id === windowId);
        if (originalWindow && originalWindow.tabs.length === 1) {
            // Just update the existing window
            try {
                await chrome.windows.update(windowId, {
                    left: newLeft,
                    top: newTop,
                    width: winW,
                    height: winH,
                    state: "normal"
                });
            } catch (e) {}
        } else {
            // Create a new window for this tab
            try {
                await chrome.windows.create({
                    tabId: tabId,
                    left: newLeft,
                    top: newTop,
                    width: winW,
                    height: winH,
                    focused: false
                });
            } catch (e) {}
        }
    }
}

async function collapseAllTabs(targetWindowId) {    
    if (!targetWindowId) {
        targetWindowId = windows[0].id;
    }
    
    let allTabs = await chrome.tabs.query({});
    const tabsToMove = allTabs.map(tab => tab.id);

    for (const tabId of tabsToMove) {
        try {
            await chrome.tabs.move(tabId, { windowId: targetWindowId, index: -1 });
        } catch (error) {
            console.error('Error moving tab:', error);
        }
    }
    
    await chrome.windows.update(targetWindowId, { focused: true, state: "normal" });
    await chrome.windows.update(targetWindowId, { state: "maximized" });
}

async function clearChaos() {
    console.log("Clearing chaos - closing all windows except camera");
    const windows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
    
    // Retrieve junk windows list
    const result = await chrome.storage.local.get({ junkWindows: [] });
    const junkWindowIds = result.junkWindows || [];
    
    // Get IDs of windows with camera open
    const cameraWindowIds = windows
        .filter(win => win.tabs?.some(tab => tab.url?.includes('camera.html')))
        .map(win => win.id);
    
    // Filter junkWindowIds to exclude camera windows
    const toClose = junkWindowIds.filter(winId => !cameraWindowIds.includes(winId));

    while (toClose.length > 0) {
        const winId = toClose.pop();
        try {
            await chrome.windows.remove(winId);
        } catch (err) {
            console.log("Could not close window:", err);
        }
        // delay between closures for visible stagger
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Clear the junk windows list from storage
    await chrome.storage.local.set({ junkWindows: [] });
    
    // Reset size tracker
    lastWidth = 1000;
    lastHeight = 800;
}

// ==========================================
// 3. LISTENERS
// ==========================================

// Listen for NEW tabs
chrome.tabs.onCreated.addListener(async (tab) => {
    const result = await chrome.storage.local.get("mode");
    
    if (result.mode === 'useless') {
        detachAndStack(tab);
    }
});

// Listen for MESSAGES (Popup Buttons)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "organize_windows") {
        organizeWindows();
    } 
    else if (message.action === "activate_useless_mode") {
        // This triggers the chaos on ALREADY opened tabs
        triggerImmediateChaos();
    }
    else if (message.action === "collapse_tabs") {
        collapseAllTabs(message.targetWindowId);
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "CLEAR_CHAOS") {
        clearChaos();
    }
});
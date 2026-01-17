// Variable to track the size of the "last" window for the recursive shrinking effect
let lastWidth = 1000; 
let lastHeight = 800;
let isSpawningLoop = false; // Flag to prevent infinite loop

async function getPrimaryWorkArea() {
    try {
        const displays = await chrome.system.display.getInfo();
        const primary = displays.find((d) => d.isPrimary) || displays[0];
        const area = primary?.workArea;

        if (area) {
            return { width: area.width, height: area.height, left: area.left, top: area.top };
        }
    } catch (err) {
        console.warn("Falling back to default screen size", err);
    }

    return { width: 1500, height: 900, left: 0, top: 0 };
}

// 1. LISTEN FOR NEW TABS (For Useless Mode)

chrome.tabs.onCreated.addListener(async (tab) => {
    const result = await chrome.storage.local.get("mode");
    
    // Ignore tabs created during the spawning loop
    if (isSpawningLoop) return;
    
    if (result.mode === 'useless') {
        // Check if we've hit the "too small" limit
        const shouldLoop = lastWidth <= 450;
        // const shouldLoop = true
        

        if (shouldLoop) {
            isSpawningLoop = true;
            try {
                // Reset sizes BEFORE the loop
                lastWidth = 1000; 
                lastHeight = 800;
                
                // Create the current tab's window first
                const randomOffset = Math.floor(Math.random() * 150);
                await chrome.windows.create({
                    tabId: tab.id,
                    width: lastWidth,
                    height: lastHeight,
                    left: randomOffset + 50,
                    //  top: randomOffset + 50,
                    focused: false
                });
                
                // Now trigger the loop: open 10 more windows at random locations
                for (let i = 0; i < 10; i++) {
                    const randomWidth = Math.floor(Math.random() * 400) + 400;  // 400-800px
                    const randomHeight = Math.floor(Math.random() * 300) + 300; // 300-600px
                    const randomLeft = Math.floor(Math.random() * 800);
                    const randomTop = Math.floor(Math.random() * 500);
                    
                    // Create new tab and window
                    const newTab = await chrome.tabs.create({ 
                        active: false
                    });
                    await chrome.windows.create({
                        tabId: newTab.id,
                        width: randomWidth,
                        height: randomHeight,
                        left: randomLeft,
                        top: randomTop,
                        focused: false
                    });
                    
                    // Small delay between windows for visual effect
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } finally {
                isSpawningLoop = false;
            }
        } else {
            // Shrink for next iteration
            lastWidth = Math.floor(lastWidth * 0.8);
            lastHeight = Math.floor(lastHeight * 0.8);
            
            // ALWAYS create a window
            const randomOffset = Math.floor(Math.random() * 150);
            await chrome.windows.create({
                tabId: tab.id,
                width: lastWidth,
                height: lastHeight,
                left: randomOffset + 50,
                top: randomOffset + 50,
                focused: true
            });
        }

        // Randomize position slightly
        const randomLeft = Math.floor(Math.random() * 200); 
        const randomTop = Math.floor(Math.random() * 200);

        // Shrink size by 10% each time, reset if too small
        lastWidth = lastWidth * 0.9;
        lastHeight = lastHeight * 0.9;
        if (lastWidth < 200) { lastWidth = 1000; lastHeight = 800; }

        chrome.windows.create({
            tabId: tab.id,
            width: Math.floor(lastWidth),
            height: Math.floor(lastHeight),
            left: randomLeft + 100, // Offset to show stacking
            top: randomTop + 100,
            focused: true
        });
    } else if (result.mode === 'useful') {
        organizeWindows();
    }
});

// 2. LISTEN FOR MESSAGES (For Useful Mode)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "organize_windows") {
        organizeWindows();
    } else if (message.action === "collapse_tabs") {
        collapseAllTabs(message.targetWindowId);
    }
});

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
            await chrome.windows.update(windowId, {
                left: newLeft,
                top: newTop,
                width: winW,
                height: winH,
                state: "normal"
            });
        } else {
            // Create a new window for this tab
            await chrome.windows.create({
                tabId: tabId,
                left: newLeft,
                top: newTop,
                width: winW,
                height: winH,
                focused: false
            });
        }
    }
}

async function collapseAllTabs(targetWindowId) {
    // Get all windows with their tabs
    const windows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
    
    if (windows.length === 0) return;
    
    // If no target window specified, use the first one
    if (!targetWindowId) {
        targetWindowId = windows[0].id;
    }
    
    // Collect tabs from OTHER windows (not the current one)
    const tabsToMove = [];
    for (const win of windows) {
        if (win.id !== targetWindowId) {
            for (const tab of win.tabs) {
                tabsToMove.push(tab.id);
            }
        }
    }

    console.log(tabsToMove);
    
    // Move all tabs from other windows to the current window
    for (const tabId of tabsToMove) {
        try {
            await chrome.tabs.move(tabId, { windowId: targetWindowId, index: -1 });
        } catch (error) {
            console.error('Error moving tab:', error);
        }
    }
    
    // Focus the target window
    await chrome.windows.update(targetWindowId, { focused: true, state: "normal" });

    // Maximize the target window to show all tabs clearly
    await chrome.windows.update(targetWindowId, { state: "maximized" });
}


// Variable to track the size of the "last" window for the recursive shrinking effect
let lastWidth = 1000; 
let lastHeight = 800;

// 1. LISTEN FOR NEW TABS (For Useless Mode)
chrome.tabs.onCreated.addListener(async (tab) => {
    const result = await chrome.storage.local.get("mode");
    
    if (result.mode === 'useless') {
        // DETACH the new tab into a new window to create the "Stack"
        // We assume 'tab.id' is present.
        
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
    }
});

// 2. LISTEN FOR MESSAGES (For Useful Mode)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "organize_windows") {
        organizeWindows();
    }
});

async function organizeWindows() {
    // Get all windows
    const windows = await chrome.windows.getAll({ populate: false, windowTypes: ['normal'] });
    const count = windows.length;
    
    // Get screen capabilities (Approximation, chrome API doesn't give perfect screen size in background easily)
    // We will assume a standard 1920x1080 for the hackathon demo, 
    // OR you can use 'chrome.system.display' if you have time.
    const screenW = 1500; // Safe width
    const screenH = 900;  // Safe height
    
    // Calculate Grid (Columns and Rows)
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    
    const winW = Math.floor(screenW / cols);
    const winH = Math.floor(screenH / rows);

    for (let i = 0; i < count; i++) {
        const win = windows[i];
        
        // Calculate Grid Position
        const colIndex = i % cols;
        const rowIndex = Math.floor(i / cols);
        
        const newLeft = colIndex * winW;
        const newTop = rowIndex * winH;

        chrome.windows.update(win.id, {
            left: newLeft,
            top: newTop,
            width: winW,
            height: winH,
            state: "normal" // Ensure it's not maximized/minimized
        });
    }
}


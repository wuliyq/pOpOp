// Variable to track the size of the "last" window for the recursive shrinking effect
let lastWidth = 1000; 
let lastHeight = 800;

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
    } else if (result.mode === 'useful') {
        organizeWindows();
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
    const { width: screenW, height: screenH, left: screenLeft, top: screenTop } = await getPrimaryWorkArea();
    
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
        
        const newLeft = screenLeft + colIndex * winW;
        const newTop = screenTop + rowIndex * winH;

        chrome.windows.update(win.id, {
            left: newLeft,
            top: newTop,
            width: winW,
            height: winH,
            state: "normal" // Ensure it's not maximized/minimized
        });
    }
}


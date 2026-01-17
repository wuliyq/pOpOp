// Use CDN version of MediaPipe
import { HandLandmarker, FilesetResolver } from "./assets/mediapipe/vision_bundle.js";

let handLandmarker;
let lastX = 0;
let lastGestureTime = 0;
let wasFist = false; // Track fist state for gesture transition
const GESTURE_COOLDOWN = 2000; // Prevent accidental double-triggers

function updateStatus(message) {
    const statusEl = document.getElementById("status");
    if (statusEl) {
        statusEl.innerText = message;
        console.log(message);
    }
}

function isFist(landmarks) {
    const wrist = landmarks[0];
    const middleMCP = landmarks[9]; // Middle finger knuckle
    
    // Reference size: Wrist to Middle Knuckle
    const palmSize = Math.hypot(middleMCP.x - wrist.x, middleMCP.y - wrist.y);
    
    // Tips: Index(8), Middle(12), Ring(16), Pinky(20)
    // If distance from wrist to tip is close to palm size, finger is curled
    // Extended finger is roughly 2x palm size from wrist
    const tips = [8, 12, 16, 20];
    let curledCount = 0;
    
    for (const tipIdx of tips) {
        const tip = landmarks[tipIdx];
        const dist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
        
        if (dist < palmSize * 1.3) {
            curledCount++;
        }
    }
    
    // Require all 4 fingers to be curled
    return curledCount === 4;
}

function isOpenPaw(landmarks) {
    const wrist = landmarks[0];
    const middleMCP = landmarks[9]; // Middle finger knuckle
    
    // Reference size: Wrist to Middle Knuckle
    const palmSize = Math.hypot(middleMCP.x - wrist.x, middleMCP.y - wrist.y);
    
    // Tips: Index(8), Middle(12), Ring(16), Pinky(20)
    const tips = [8, 12, 16, 20];
    let extendedCount = 0;
    
    for (const tipIdx of tips) {
        const tip = landmarks[tipIdx];
        const dist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
        
        // Extended finger is roughly 2x palm size from wrist
        if (dist > palmSize * 1.7) {
            extendedCount++;
        }
    }
    
    // Require all 4 fingers to be extended
    return extendedCount === 4;
}

async function setupDetection() {
    try {
        updateStatus("Loading MediaPipe...");

        const vision = await FilesetResolver.forVisionTasks(
            "./assets/mediapipe/wasm"
        );

        updateStatus("Creating hand detector...");

        handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "assets/models/hand_landmarker.task",
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
        });

        updateStatus("Detector ready. Starting camera...");
        startCamera();
    } catch (err) {
        console.error("Failed to set up detection", err);
        updateStatus("Failed to load hand detector");
    }
}

function startCamera() {
    const video = document.getElementById("webcam");
    updateStatus("Requesting camera access...");

    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            updateStatus("Camera ready! Wave/Fist→Open to organize");
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam, { once: true });
        })
        .catch((error) => {
            console.error("Camera access denied:", error);
            updateStatus("Camera denied: " + error.message);
        });
}

async function predictWebcam() {
    const video = document.getElementById("webcam");

    if (!handLandmarker) {
        requestAnimationFrame(predictWebcam);
        return;
    }

    const results = handLandmarker.detectForVideo(video, performance.now());

    if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const wristX = landmarks[0].x;
        const movement = Math.abs(wristX - lastX);
        const now = Date.now();
        
        const currentlyFist = isFist(landmarks);
        const currentlyOpen = isOpenPaw(landmarks);

        // 1. WAVE DETECTION (Clear Chaos)
        if (movement > 0.3 && (now - lastGestureTime > GESTURE_COOLDOWN)) {
            console.log("Wave detected! Clearing chaos...");
            updateStatus("🌊 WAVE DETECTED! Clearing chaos...");
            
            chrome.runtime.sendMessage({ action: "CLEAR_CHAOS" });
            lastGestureTime = now;
            wasFist = false; // Reset fist state

            setTimeout(() => {
                updateStatus("Camera ready! Wave/Fist→Open to organize");
            }, 2000);
        }
        
        // 2. FIST TO OPEN PAW (Organize Windows)
        // Detect transition: was fist, now open
        else if (wasFist && currentlyOpen && (now - lastGestureTime > GESTURE_COOLDOWN)) {
            console.log("Fist→Open detected! Organizing windows...");
            updateStatus("🖐️ FIST→OPEN! Organizing windows...");
            
           chrome.storage.local.set({ mode: 'useful' });
            updateModeDisplay('useful');
            document.getElementById('status').innerText = "Mode: Useful (Tiling...)";
            
            // Send message to background to trigger the "Tiling" immediately
            chrome.runtime.sendMessage({ action: "organize_windows" });
            lastGestureTime = now;
            wasFist = false; // Reset after triggering

            setTimeout(() => {
                updateStatus("Camera ready! Wave/Fist→Open to organize");
            }, 2000);
        }
        
        // 3. FIST DETECTION (Collapse Tabs)
        else if (currentlyFist && !wasFist && (now - lastGestureTime > GESTURE_COOLDOWN)) {
            console.log("Fist detected! Collapsing tabs...");
            updateStatus("✊ FIST DETECTED! Collapsing tabs...");
            
             console.log("Wave detected! Clearing chaos...");
            updateStatus("🌊 WAVE DETECTED! Clearing chaos...");
            
            chrome.runtime.sendMessage({ action: "CLEAR_CHAOS" });
            lastGestureTime = now;
            wasFist = false; // Reset fist state

            setTimeout(() => {
                updateStatus("Camera ready! Wave/Fist→Open to organize");
            }, 2000);

            const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
            const lastFocused = await chrome.windows.getCurrent() || windows[0];
    
            chrome.runtime.sendMessage({ 
                action: "collapse_tabs",
                targetWindowId: lastFocused.id 
            });

            lastGestureTime = now;
            wasFist = true; // Mark that we're in fist state
            
            setTimeout(() => {
                updateStatus("Camera ready! Wave/Fist→Open to organize");
            }, 2000);
        }
        
        // Update fist tracking for next frame
        if (!currentlyFist && !currentlyOpen) {
            wasFist = false; // Reset if hand is in neutral position
        }
        
        lastX = wristX;
    }

    requestAnimationFrame(predictWebcam);
}

// Start the detection when page loads
// startCamera()
setupDetection();


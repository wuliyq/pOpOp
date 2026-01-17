// Local MediaPipe bundle (packaged for CSP-safe use)
import { GestureRecognizer, FilesetResolver, DrawingUtils } from "./assets/mediapipe/vision_bundle.js";

let gestureRecognizer;
// let lastClearTs = 0;
let overlayCtx;
let overlayCanvas;
let lastStableGesture = null; // last confident gesture label

function ensureOverlayReady(video) {
    if (!overlayCanvas) {
        overlayCanvas = document.getElementById("overlay");
    }
    if (overlayCanvas) {
        // If intrinsic sizes are missing, fall back to displayed size or viewport
        const width = video.videoWidth || video.clientWidth || overlayCanvas.clientWidth || window.innerWidth;
        const height = video.videoHeight || video.clientHeight || overlayCanvas.clientHeight || window.innerHeight;
        if (!overlayCanvas.width || !overlayCanvas.height) {
            overlayCanvas.width = width;
            overlayCanvas.height = height;
        }
        if (!overlayCtx) {
            overlayCtx = overlayCanvas.getContext("2d");
        }
    }
}

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

        const wasmPath = chrome.runtime.getURL("assets/mediapipe/wasm");
        const modelPath = chrome.runtime.getURL("assets/models/gesture_recognizer.task");

        const vision = await FilesetResolver.forVisionTasks(wasmPath);

        updateStatus("Creating gesture recognizer...");

        gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: modelPath,
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
    overlayCanvas = document.getElementById("overlay");
    updateStatus("Requesting camera access...");

    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            video.srcObject = stream;
            video.addEventListener("loadedmetadata", () => {
                ensureOverlayReady(video);
            }, { once: true });
            video.addEventListener("loadeddata", predictWebcam, { once: true });
        })
        .catch((error) => {
            console.error("Camera access denied:", error);
            updateStatus("Camera denied: " + error.message);
        });
}

async function predictWebcam() {
    const video = document.getElementById("webcam");

    if (!gestureRecognizer) {
        requestAnimationFrame(predictWebcam);
        return;
    }

    ensureOverlayReady(video);

    const now = performance.now();
    const results = gestureRecognizer.recognizeForVideo(video, now);

    const topGesture = results.gestures?.[0]?.[0];
    const gestureName = topGesture?.categoryName;
    const score = topGesture?.score ?? 0;
    const isNone = gestureName === "None" || gestureName === "NoGesture";

    if (overlayCtx && results.landmarks?.length) {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        overlayCtx.save();
        // Mirror to match the flipped video
        overlayCtx.scale(-1, 1);
        overlayCtx.translate(-overlayCanvas.width, 0);

        const drawingUtils = new DrawingUtils(overlayCtx);
        for (const hand of results.landmarks) {
            drawingUtils.drawConnectors(hand, GestureRecognizer.HAND_CONNECTIONS, {
                color: "#00FF00",
                lineWidth: 2
            });
            drawingUtils.drawLandmarks(hand, {
                color: "#ff0400ff",
                lineWidth: 2,
                radius: 1
            });
        }

        overlayCtx.restore();

    } else if (overlayCtx) {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }

    if (gestureName && !isNone && score > 0.6) {
        // if (gestureName !== lastStableGesture) {
        //     updateStatus(`Gesture: ${gestureName} (${score.toFixed(2)})`);
        // }

        // Transition-based controls (allow gaps where no gesture was detected)
        if (lastStableGesture === "Open_Palm" && gestureName === "Closed_Fist") {
            // const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
            // const lastFocused = await chrome.windows.getCurrent() || windows[0];

            // Ensure CLEAR_CHAOS finishes before collapsing
            await chrome.runtime.sendMessage({ action: "CLEAR_CHAOS", trigger: "gesture" });

            // await chrome.runtime.sendMessage({ 
            //     action: "collapse_tabs",
            //     targetWindowId: lastFocused.id 
            // });

            updateStatus("✊ Closed fist detected → clearing chaos, collapsing tabs");
        // } else if (lastStableGesture === "Closed_Fist" && gestureName === "Open_Palm") {
        } else if (gestureName === "Thumb_Up" && lastStableGesture !== "Thumb_Up") {
            chrome.storage.local.set({ mode: "useful" });
            chrome.runtime.sendMessage({ action: "organize_windows" });

        lastStableGesture = gestureName;

        // if (Date.now() - lastClearTs > 2000) {
        //     chrome.runtime.sendMessage({ action: "CLEAR_CHAOS" });
        //     lastClearTs = Date.now();
        // }
    }

    requestAnimationFrame(predictWebcam);
}

// Start the detection when page loads
// startCamera()
setupDetection();


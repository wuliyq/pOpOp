// Local MediaPipe bundle (packaged for CSP-safe use)
import { GestureRecognizer, FilesetResolver } from "./assets/mediapipe/vision_bundle.js";

let gestureRecognizer;
let lastClearTs = 0;
let overlayCtx;
let overlayCanvas;

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
            updateStatus("Camera ready! Wave your hand fast to clear chaos.");
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

function predictWebcam() {
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

    if (overlayCtx && results.landmarks?.length) {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        const landmarks = results.landmarks[0];

        // Draw points only
        for (const lm of landmarks) {
            const x = (1 - lm.x) * overlayCanvas.width; // mirror horizontally to match video
            const y = lm.y * overlayCanvas.height;
            overlayCtx.beginPath();
            overlayCtx.arc(x, y, 5, 0, Math.PI * 2);
            overlayCtx.fillStyle = "#39ff14";
            overlayCtx.fill();
            overlayCtx.lineWidth = 2;
            overlayCtx.strokeStyle = "#0affff";
            overlayCtx.stroke();
        }
    } else if (overlayCtx) {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }

    if (gestureName && score > 0.5) {
        if (Date.now() - lastClearTs > 2000) {
            console.log(`Gesture ${gestureName} detected (score ${score.toFixed(2)}) — clearing chaos`);
            updateStatus(`✋ Gesture: ${gestureName} (clearing chaos...)`);
            chrome.runtime.sendMessage({ action: "CLEAR_CHAOS" });
            lastClearTs = Date.now();

            setTimeout(() => {
                updateStatus("Camera ready! Gesture to clear chaos.");
            }, 1500);
        }
    }

    requestAnimationFrame(predictWebcam);
}

// Start the detection when page loads
// startCamera()
setupDetection();


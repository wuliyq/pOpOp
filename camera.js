// Use CDN version of MediaPipe
import { HandLandmarker, FilesetResolver } from "./assets/mediapipe/vision_bundle.js";

let handLandmarker;
let lastX = 0;

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
            updateStatus("Camera ready! Wave your hand fast to clear chaos.");
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam, { once: true });
        })
        .catch((error) => {
            console.error("Camera access denied:", error);
            updateStatus("Camera denied: " + error.message);
        });
}

function predictWebcam() {
    const video = document.getElementById("webcam");

    if (!handLandmarker) {
        requestAnimationFrame(predictWebcam);
        return;
    }

    const results = handLandmarker.detectForVideo(video, performance.now());

    if (results.landmarks && results.landmarks.length > 0) {
        const wristX = results.landmarks[0][0].x;
        const movement = Math.abs(wristX - lastX);

        if (movement > 0.25) {
            console.log("Wave detected! Clearing chaos...");
            updateStatus("🌊 WAVE DETECTED! Clearing chaos...");
            chrome.runtime.sendMessage({ action: "CLEAR_CHAOS" });

            setTimeout(() => {
                updateStatus("Camera ready! Wave your hand fast to clear chaos.");
            }, 2000);
        }
        lastX = wristX;
    }

    requestAnimationFrame(predictWebcam);
}

// Start the detection when page loads
setupDetection();

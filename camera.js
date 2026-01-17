// Use CDN version of MediaPipe
import { HandLandmarker, FilesetResolver } from "./lib/task_vision.mjs";

let handLandmarker;
let lastX = 0;

function updateStatus(message) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.innerText = message;
        console.log(message);
    }
}

async function setupDetection() {
    
    updateStatus("Loading MediaPipe...");
    
    // Initialize the vision tasks with CDN WASM files
    const vision = await FilesetResolver.forVisionTasks(
        "./lib/vision_wasm.wasm"
    );
    
    updateStatus("Creating hand detector...");
    
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { 
            modelAssetPath: "./lib/hand_landmarker.task",
            delegate: "GPU" 
        },
        runningMode: "VIDEO",
        numHands: 1
    });


    
}

function startCamera() {
    const video = document.getElementById("webcam");
    updateStatus("Requesting camera access...");
    
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            updateStatus("Camera ready! Wave your hand fast to clear chaos.");
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam);
        })
        .catch((error) => {
            console.error("Camera access denied:", error);
            updateStatus("Camera denied: " + error.message);
        });
    }
    
async function predictWebcam() {
    const video = document.getElementById("webcam");
    
    if (!handLandmarker) {
        console.error("Hand landmarker not initialized");
        return;
    }
    
    let results = handLandmarker.detectForVideo(video, performance.now());

    if (results.landmarks && results.landmarks.length > 0) {
        const wristX = results.landmarks[0][0].x; // Wrist position
        const movement = Math.abs(wristX - lastX);

        if (movement > 0.25) { // Sensitivity: 0.25 is a fast move
            console.log("Wave detected! Clearing chaos...");
            updateStatus("🌊 WAVE DETECTED! Clearing chaos...");
            chrome.runtime.sendMessage({ action: "CLEAR_CHAOS" });
            
            // Reset status after 2 seconds
            setTimeout(() => {
                updateStatus("Camera ready! Wave your hand fast to clear chaos.");
            }, 2000);
        }
        lastX = wristX;
    }
    requestAnimationFrame(predictWebcam);
}

// Start the detection when page loads
// startCamera()
setupDetection();

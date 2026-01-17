# README.md

## 🪟 Windowdow: Introducing pOpOp

Welcome to **Windowdow**, where we believe managing your digital workspace should be as natural as a wave of your hand. Our flagship product, **pOpOp**, is a Chrome extension designed to transform the "tab-hoarding" experience into a streamlined, gesture-controlled workflow.

---

### 🛠 The Problem: "Tab Overload"
We’ve all been there: you start with one task, and an hour later, your browser is a forest of tiny, unreadable tabs. This digital clutter causes **cognitive overload** and kills productivity because you spend more time searching for tabs than working in them. **pOpOp** solves this by providing a "Chaos vs. Order" management system. Whether you need to reset your workspace or organize deep-dive research, pOpOp gives you the tools to command your windows with zero friction.

### 🚀 Key Selling Point: Gesture Control
The standout feature of pOpOp is its **touchless interface**. By deploying **MediaPipe**, we’ve turned your webcam into a high-fidelity gesture sensor. 

Instead of fumbling for keyboard shortcuts, you can manage your browser environment using natural hand movements:
* **🤌 Five Fingers Inward (Collapse):** Making a "grabbing" or inward gesture triggers a command to close "junk" windows and resets your workspace by collapsing all the open tabs into a single window.
* **👍 Thumbs Up:** This transition triggers the "Useful" mode, automatically tiling all open windows into a perfect grid on your screen.


---

### 📦 Installation Guide

Since pOpOp is currently in developer mode, follow these steps to install it in your Chrome browser:

1.  **Download the Project:** Clone or download the source code folder (containing `manifest.json`, `background.js`, etc.) to your local machine.
2.  **Open Extensions Page:** In Google Chrome, navigate to `chrome://extensions/`.
3.  **Enable Developer Mode:** Toggle the **Developer mode** switch in the top right corner of the page.
4.  **Load Unpacked:** Click the **Load unpacked** button that appears.
5.  **Select Folder:** Navigate to and select the project folder you downloaded in Step 1.
6.  **Verify:** The "Chaos vs Order Window Manager" should now appear in your list of extensions.

---

### 📖 User Guide & Workflows

Choose your experience based on whether you need peak productivity or a quick laugh.

#### 🟢 Useful Mode: The "Search & Settle" Workflow
Use this when you have too many tabs open and want to avoid checking them one-by-one.
* **Step 1:** Click the extension icon and select **Useful Mode**.
* **Step 2:** Click **Open Camera** to launch the sensor (or use manual buttons in the popup).
* **Step 3 (Organize):** Perform the **Thumbs Up** gesture. All tabs will instantly arrange into a clear grid.
* **Step 4 (Review):** Easily view everything you have open. Close what you don't need and click into the one you want.
* **Step 5 (Consolidate):** Once settled, perform the gesture **Five Fingers Inward (Collapse)**. All remaining tabs will collapse into a single window for a clean workspace.

#### 🔴 Useless Mode: The "Entertaining Chaos" Workflow
Use this for a prank or a bit of digital entertainment.
* **Step 1:** Select **Useless Mode** from the popup.
* **Step 2:** Watch as your tabs begin to pop up randomly across the screen.
* **Step 3 (The Prank):** If you continue to open new tabs, "Dancing Man" window popups will appear in an infinite loop.
* **Step 4 (The Rescue):** Don't worry—simply **Wave your hands** at the camera to clear the chaos. 
* **Step 5 (Back to Normal):** Pull your **Five Fingers Inward (Collapse)** to return all tabs to their usual state.

#### ⌨️ Manual Navigation & Modes
Don't want to use the camera? No problem.
* **Button Navigation:** Every gesture has a corresponding button in the popup menu. Click **Collapse All Tabs** or **Useful Mode** to trigger actions manually.
* **Mode: None:** If you are done using the extension, simply click **Disable Mode**. This switches your status to **None**, stopping all automatic window behaviors and returning your browser to standard operation.

---

### 💻 Tech Stack
* **Core:** JavaScript (ES6+), HTML5, CSS3.
* **AI/ML:** MediaPipe for real-time 21-point hand landmark tracking.
* **Browser API:** Chrome Extensions Manifest V3 (`windows`, `tabs`, `storage`, `system.display`).

---

### 👥 Meet the Team: Windowdow
We are a group of developers dedicated to rethinking the human-computer interface for the modern web.
* **Product:** pOpOp
* **Mission:** To eliminate digital friction through innovative AI integration.
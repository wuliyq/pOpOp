chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "EXPLODE") {
        console.log("EXPLODE message received!");
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createExplosion);
        } else {
            createExplosion();
        }
        sendResponse({ success: true });
    }
    return true;
});

function createExplosion() {
    console.log("Creating explosion animation!");
    const shardCount = 50; 
    for (let i = 0; i < shardCount; i++) {
        const shard = document.createElement('div');
        // Your existing shard.style.cssText here...
        shard.style.cssText = `
            position: fixed;
            width: 150px;
            height: 100px;
            background: #f0f0f0;
            border: 1px solid #999;
            box-shadow: 10px 10px 20px rgba(0,0,0,0.2);
            z-index: 2147483647;
            top: 50vh;
            left: 50vw;
            transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            pointer-events: none;
        `;
        shard.innerHTML = '<div style="background:#3a77d1; height:15px; width:100%;"></div>';
        document.body.appendChild(shard);

        // Double requestAnimationFrame ensures CSS transition triggers properly
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                shard.style.top = `${Math.random() * 90}vh`;
                shard.style.left = `${Math.random() * 90}vw`;
                shard.style.transform = `rotate(${Math.random() * 360}deg) scale(${Math.random() + 0.5})`;
            });
        });
    }
}
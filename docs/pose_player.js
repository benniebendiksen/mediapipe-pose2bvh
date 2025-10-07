// pose_player.js - Load and play stored MediaPipe landmarks

let storedPoseData = null;
let currentFrameIndex = 0;
let isPlayingStored = false;
let playbackInterval = null;
let loopPlayback = false; // Option to loop

// Load pose_output.json
async function loadStoredPoses() {
    try {
        const response = await fetch('./pose_output.json');
        storedPoseData = await response.json();
        console.log(`Loaded ${storedPoseData.length} frames of pose data`);

        // Update status
        const statusEl = document.getElementById('playbackStatus');
        if (statusEl) {
            statusEl.textContent = `Loaded ${storedPoseData.length} frames - Ready to play`;
        }

        return true;
    } catch (error) {
        console.error('Error loading pose_output.json:', error);
        const statusEl = document.getElementById('playbackStatus');
        if (statusEl) {
            statusEl.textContent = 'Error: pose_output.json not found';
        }
        return false;
    }
}

// Convert stored landmark array to MediaPipe format
function convertToMediaPipeFormat(landmarkArray) {
    return landmarkArray.map((lm, index) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility || 1.0
    }));
}

// Check if we should auto-stop recording when playback ends
function checkAutoStopRecording() {
    // If recording is active and playback just ended, stop recording
    if (window.recording && !isPlayingStored) {
        console.log('Playback ended - auto-stopping recording');
        if (window.stopRecording) {
            window.stopRecording();
        }
        // Trigger the button click to update UI
        const recordBtn = document.getElementById('recordButton');
        if (recordBtn && recordBtn.textContent.includes('Stop')) {
            recordBtn.click();
        }
    }
}

// Play through stored poses
function playStoredPoses(loop = false) {
    if (!storedPoseData || storedPoseData.length === 0) {
        console.error('No stored pose data available');
        alert('Please load pose_output.json first');
        return;
    }

    loopPlayback = loop;
    isPlayingStored = true;
    currentFrameIndex = 0;

    console.log(`Starting playback (${loop ? 'loop mode' : 'once'})`);

    // Update holisticResults with stored data at ~30fps
    playbackInterval = setInterval(() => {
        if (currentFrameIndex >= storedPoseData.length) {
            if (loopPlayback) {
                // Loop back to start
                currentFrameIndex = 0;
                console.log('Looping playback...');
            } else {
                // Stop at end
                stopStoredPoses();
                checkAutoStopRecording();
                return;
            }
        }

        // Create synthetic holisticResults object
        window.holisticResults = {
            poseLandmarks: convertToMediaPipeFormat(storedPoseData[currentFrameIndex])
        };

        currentFrameIndex++;

        // Update UI
        const statusEl = document.getElementById('playbackStatus');
        if (statusEl) {
            const loopText = loopPlayback ? ' (looping)' : '';
            statusEl.textContent = `Playing frame ${currentFrameIndex}/${storedPoseData.length}${loopText}`;
        }
    }, 1000 / 30); // 30fps
}

function stopStoredPoses() {
    isPlayingStored = false;
    if (playbackInterval) {
        clearInterval(playbackInterval);
        playbackInterval = null;
    }

    const statusEl = document.getElementById('playbackStatus');
    if (statusEl && storedPoseData) {
        statusEl.textContent = `Stopped at frame ${currentFrameIndex}/${storedPoseData.length}`;
    }

    console.log('Stopped playback');
}

function resetStoredPoses() {
    stopStoredPoses();
    currentFrameIndex = 0;
    window.holisticResults = null;

    const statusEl = document.getElementById('playbackStatus');
    if (statusEl && storedPoseData) {
        statusEl.textContent = `Reset - Ready to play ${storedPoseData.length} frames`;
    }
}

function toggleLoop() {
    loopPlayback = !loopPlayback;
    console.log(`Loop mode: ${loopPlayback ? 'ON' : 'OFF'}`);

    const loopBtn = document.getElementById('loopBtn');
    if (loopBtn) {
        if (loopPlayback) {
            loopBtn.classList.remove('grey');
            loopBtn.classList.add('green');
        } else {
            loopBtn.classList.remove('green');
            loopBtn.classList.add('grey');
        }
    }

    // If currently playing, restart with new loop setting
    if (isPlayingStored) {
        stopStoredPoses();
        playStoredPoses(loopPlayback);
    }
}

// Auto-load on page load
window.addEventListener('load', async () => {
    await loadStoredPoses();
});

// Export functions for UI controls
window.posePlayer = {
    load: loadStoredPoses,
    play: playStoredPoses,
    stop: stopStoredPoses,
    reset: resetStoredPoses,
    toggleLoop: toggleLoop,
    isPlaying: () => isPlayingStored
};
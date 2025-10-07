// direct_converter.js - Direct conversion from pose_output.json, a mediapipe pose landmark file, to BVH

async function convertPoseJsonToBVH() {
    console.log('Starting direct pose → BVH conversion...');
    window.updateConversionStatus('Loading pose data...', false);

    // Load pose data
    let poseData;
    try {
        const response = await fetch('./pose_output.json');
        poseData = await response.json();
        console.log(`Loaded ${poseData.length} frames`);
        window.updateConversionStatus(`Loaded ${poseData.length} frames`, false);
    } catch (error) {
        console.error('Error loading pose_output.json:', error);
        window.updateConversionStatus('❌ Error: Could not load pose_output.json', true);
        return;
    }

    if (!poseData || poseData.length === 0) {
        window.updateConversionStatus('❌ Error: pose_output.json is empty!', true);
        return;
    }

    // Wait for model to load
    if (!window.model) {
        console.log('Waiting for 3D model to load...');
        window.updateConversionStatus('Waiting for 3D model to load...', false);
        await waitForModel();
    }

    window.updateConversionStatus('Processing frames...', false);
    console.log('Processing frames...');
    const processedMotionData = [];
    let firstFrameData = null;

    // Process each frame
    for (let i = 0; i < poseData.length; i++) {
        // Convert to MediaPipe format and inject into holisticResults
        window.holisticResults = {
            poseLandmarks: poseData[i].map(lm => ({
                x: lm.x,
                y: lm.y,
                z: lm.z,
                visibility: lm.visibility || 1.0
            }))
        };

        // Small delay to let the animation frame process
        await new Promise(resolve => setTimeout(resolve, 1));

        // Call updateMotionData to get the processed joint information
        const jointData = updateMotionData(true); // true = return data

        if (jointData && jointData.length > 0) {
            if (i === 0) {
                firstFrameData = jointData;
            }
            processedMotionData.push(jointData);
        }

        // Update progress UI
        if (i % 5 === 0 || i === poseData.length - 1) {
            window.updateConversionProgress(i + 1, poseData.length);
        }
    }

    if (processedMotionData.length === 0) {
        window.updateConversionStatus('❌ Failed to process any frames!', true);
        return;
    }

    console.log(`Successfully processed ${processedMotionData.length} frames`);
    window.updateConversionStatus(`Generating BVH file from ${processedMotionData.length} frames...`, false);

    // Generate BVH
    const bvhContent = generateBVH(firstFrameData, processedMotionData);

    // Save to file
    const blob = new Blob([bvhContent], { type: "text/plain;charset=utf-8" });
    const date = new Date();
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}-${String(date.getSeconds()).padStart(2, '0')}`;
    const fileName = `pose_output_${dateString}.bvh`;

    saveAs(blob, fileName);

    console.log(`✓ Conversion complete! Saved as ${fileName}`);
    window.updateConversionStatus(`✅ Success! Converted ${processedMotionData.length} frames\n\nFile: ${fileName}`, true);
}

// Helper function to wait for model to load
function waitForModel() {
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (window.model) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);

        // Timeout after 30 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
        }, 30000);
    });
}

// Helper function to wait for model to load
// function waitForModel() {
//     return new Promise((resolve) => {
//         const checkInterval = setInterval(() => {
//             if (window.model) {
//                 clearInterval(checkInterval);
//                 resolve();
//             }
//         }, 100);
//     });
// }

// Auto-convert on page load
window.addEventListener('load', async () => {
    // Wait for everything to initialize
    setTimeout(async () => {
        console.log('Auto-starting conversion...');
        await convertPoseJsonToBVH();
    }, 3000); // 3 second delay
});

// Expose function globally
window.convertPoseJsonToBVH = convertPoseJsonToBVH;

// Auto-convert on page load
// window.addEventListener('load', async () => {
//     // Wait a bit for everything to initialize
//     setTimeout(async () => {
//         console.log('Auto-starting conversion...');
//         await convertPoseJsonToBVH();
//     }, 3000); // 3 second delay to ensure model is loaded
// });
//
// // Expose function globally
// window.convertPoseJsonToBVH = convertPoseJsonToBVH;
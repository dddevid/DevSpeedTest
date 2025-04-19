/**
 * DevSpeedTest - UI Controller
 * Manages the user interface and interactions with the speed test functionality
 * Now with Ookla-style speedometer and real-time updates
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const startTestBtn = document.getElementById('start-test-btn');
    const testAgainBtn = document.getElementById('test-again-btn');
    const statusMessage = document.querySelector('.status-message');
    const progressContainer = document.querySelector('.progress-container');
    const progressFill = document.querySelector('.progress-fill');
    const progressStage = document.querySelector('.progress-stage');
    const testResults = document.querySelector('.test-results');
    const connectionInfo = document.querySelector('.connection-info');
    const resultsSummary = document.querySelector('.results-summary');
    const summaryContent = document.getElementById('result-summary-content');
    const copyResultsBtn = document.getElementById('copy-results');
    const downloadResultsBtn = document.getElementById('download-results');
    
    // Speedometer elements
    const speedometerContainer = document.querySelector('.speedometer-container');
    const speedometerNeedle = document.querySelector('.speedometer-needle');
    const speedometerValue = document.querySelector('.speedometer-value');
    const speedometerLabel = document.querySelector('.speedometer-label');
    
    // Value display elements
    const downloadValue = document.querySelector('.download .gauge-value');
    const uploadValue = document.querySelector('.upload .gauge-value');
    const pingValue = document.querySelector('.ping .gauge-value');
    const jitterValue = document.querySelector('.jitter .gauge-value');
    const ipAddressValue = document.getElementById('ip-address');
    const ispValue = document.getElementById('isp-name');
    const locationValue = document.getElementById('location');
    
    // Gauge elements - Updated for semi-circle gauges
    const downloadFill = document.querySelector('.download .semi-circle-fill');
    const uploadFill = document.querySelector('.upload .semi-circle-fill');
    const pingFill = document.querySelector('.ping .semi-circle-fill');
    const jitterFill = document.querySelector('.jitter .semi-circle-fill');
    
    // Create SpeedTest instance
    const speedTest = new SpeedTest();
    
    // Current test state
    let currentTestType = null; // 'download', 'upload', 'ping', or null
    
    // Initialize the UI
    function initializeUI() {
        // Check for previous results
        const lastResults = speedTest.getLastResults();
        if (lastResults) {
            // Optionally show a message that previous results are available
            statusMessage.textContent = 'Ready to test. Previous results available.';
        } else {
            statusMessage.textContent = 'Ready to test your internet speed.';
        }
    }
    
    // Start the speed test
    function startTest() {
        // Reset UI
        resetUI();
        
        // Update UI for test in progress
        startTestBtn.disabled = true;
        testAgainBtn.disabled = true;
        statusMessage.textContent = 'Initializing test...';
        progressContainer.classList.remove('hidden');
        
        // Show speedometer for real-time updates
        speedometerContainer.classList.remove('hidden');
        
        // Set up callbacks
        speedTest.onProgress = updateProgress;
        speedTest.onStageChange = updateStage;
        speedTest.onComplete = displayResults;
        speedTest.onError = handleError;
        speedTest.onRealtimeUpdate = updateRealtimeSpeed; // New callback for real-time speed
        
        // Start the test
        speedTest.startTest();
    }
    
    // Update the progress bar and text
    function updateProgress(percentage, stage) {
        progressFill.style.width = `${percentage}%`;
        // Update current test type based on stage
        currentTestType = stage;
    }
    
    // Update the current test stage
    function updateStage(stage) {
        statusMessage.textContent = stage;
        progressStage.textContent = stage;
        
        // Update speedometer label based on test stage
        if (stage.includes('download')) {
            speedometerLabel.textContent = 'Download';
            currentTestType = 'download';
        } else if (stage.includes('upload')) {
            speedometerLabel.textContent = 'Upload';
            currentTestType = 'upload';
        } else if (stage.includes('ping')) {
            speedometerLabel.textContent = 'Ping';
            currentTestType = 'ping';
        }
    }
    
    // Handle real-time speed updates during the test
    function updateRealtimeSpeed(type, value) {
        // Update the speedometer based on the test type
        if (type === 'download' || type === 'upload') {
            // Format value to 2 decimal places for display
            const formattedValue = value.toFixed(2);
            speedometerValue.textContent = formattedValue;
            
            // Update needle position (scale to 180 degrees)
            // For speeds: 0 = -90deg (left), 100+ Mbps = 90deg (right)
            let degrees = -90 + (Math.min(value, 100) / 100 * 180);
            speedometerNeedle.style.transform = `rotate(${degrees}deg)`;
        } 
        else if (type === 'ping') {
            // For ping, lower is better, so we invert the scale
            // 0ms = 90deg (right), 200ms+ = -90deg (left)
            const formattedValue = Math.round(value);
            speedometerValue.textContent = formattedValue;
            
            // Invert scale for ping (lower is better)
            let pingPercentage = Math.max(0, 100 - (value / 2));
            let degrees = -90 + (pingPercentage / 100 * 180);
            speedometerNeedle.style.transform = `rotate(${degrees}deg)`;
        }
        else if (type === 'jitter') {
            // Update only if we're showing jitter specifically
            if (currentTestType === 'ping') {
                const formattedValue = Math.round(value);
                // Could update a secondary display for jitter if needed
            }
        }
    }
    
    // Handle test errors
    function handleError(error) {
        statusMessage.textContent = `Test error: ${error.message}`;
        startTestBtn.disabled = false;
        testAgainBtn.disabled = false;
        progressContainer.classList.add('hidden');
        speedometerContainer.classList.add('hidden');
    }
    
    // Reset the UI for a new test
    function resetUI() {
        // Reset semi-circle gauges
        downloadFill.style.height = '0%';
        uploadFill.style.height = '0%';
        pingFill.style.height = '0%';
        jitterFill.style.height = '0%';
        
        // Reset speedometer
        speedometerNeedle.style.transform = 'rotate(-90deg)';
        speedometerValue.textContent = '0';
        
        // Reset text values
        downloadValue.textContent = '-- Mbps';
        uploadValue.textContent = '-- Mbps';
        pingValue.textContent = '-- ms';
        jitterValue.textContent = '-- ms';
        ipAddressValue.textContent = '--';
        ispValue.textContent = '--';
        locationValue.textContent = '--';
        
        // Hide results
        testResults.classList.add('hidden');
        connectionInfo.classList.add('hidden');
        resultsSummary.classList.add('hidden');
        speedometerContainer.classList.add('hidden');
    }
    
    // Display test results
    function displayResults(results, connectionInfoData) {
        // Enable buttons
        startTestBtn.disabled = false;
        testAgainBtn.disabled = false;
        
        // Hide progress and update status
        progressContainer.classList.add('hidden');
        speedometerContainer.classList.add('hidden');
        statusMessage.textContent = 'Test completed!';
        
        // Update result values
        downloadValue.textContent = `${results.download} Mbps`;
        uploadValue.textContent = `${results.upload} Mbps`;
        pingValue.textContent = `${results.ping} ms`;
        jitterValue.textContent = `${results.jitter} ms`;
        
        // Update connection info
        ipAddressValue.textContent = connectionInfoData.ip;
        ispValue.textContent = connectionInfoData.isp;
        locationValue.textContent = connectionInfoData.location;
        
        // Animate semi-circle gauges
        animateSemiCircleGauge(downloadFill, calculateGaugePercentage(results.download, 'download'));
        animateSemiCircleGauge(uploadFill, calculateGaugePercentage(results.upload, 'upload'));
        animateSemiCircleGauge(pingFill, calculateGaugePercentage(results.ping, 'ping'));
        animateSemiCircleGauge(jitterFill, calculateGaugePercentage(results.jitter, 'jitter'));
        
        // Show results
        testResults.classList.remove('hidden');
        connectionInfo.classList.remove('hidden');
        
        // Generate and display summary
        generateResultsSummary();
        resultsSummary.classList.remove('hidden');
    }
    
    // Calculate gauge percentage based on metric and value
    function calculateGaugePercentage(value, metric) {
        if (metric === 'download') {
            // Scale: 0-100 Mbps (logarithmic scale after 100)
            if (value >= 100) {
                return 100; // Cap at 100%
            }
            return (value / 100) * 100;
        } 
        else if (metric === 'upload') {
            // Scale: 0-50 Mbps (logarithmic scale after 50)
            if (value >= 50) {
                return 100; // Cap at 100%
            }
            return (value / 50) * 100;
        }
        else if (metric === 'ping') {
            // Inverse scale (lower is better): 0-200 ms
            // 0ms = 100%, 100ms = 50%, 200ms+ = 0%
            const pingPercentage = Math.max(0, 100 - (value / 2));
            return pingPercentage;
        }
        else if (metric === 'jitter') {
            // Inverse scale (lower is better): 0-50 ms
            // 0ms = 100%, 25ms = 50%, 50ms+ = 0%
            const jitterPercentage = Math.max(0, 100 - (value * 2));
            return jitterPercentage;
        }
        
        return 0;
    }
    
    // Animate semi-circle gauge
    function animateSemiCircleGauge(gaugeElement, percentage) {
        // Use anime.js for smooth animation if available
        if (typeof anime !== 'undefined') {
            anime({
                targets: gaugeElement,
                height: `${percentage}%`,
                easing: 'easeInOutQuad',
                duration: 1500
            });
        } else {
            // Fallback to direct style setting
            gaugeElement.style.height = `${percentage}%`;
        }
    }
    
    // Generate results summary
    function generateResultsSummary() {
        const quality = speedTest.getQualityAssessment();
        const { download, upload, ping } = speedTest.results;
        
        // Generate HTML for the summary
        let summaryHTML = `
            <p class="summary-text">
                Your internet connection is rated as <strong>${quality.overall}</strong>.
            </p>
            <div class="quality-assessment">
                <div class="quality-item ${getQualityClass(quality.download.label)}">
                    <div class="quality-label">Download</div>
                    <div class="quality-value">${download} Mbps</div>
                    <div class="quality-rating">${quality.download.label}</div>
                    <div class="quality-description">${quality.download.description}</div>
                </div>
                <div class="quality-item ${getQualityClass(quality.upload.label)}">
                    <div class="quality-label">Upload</div>
                    <div class="quality-value">${upload} Mbps</div>
                    <div class="quality-rating">${quality.upload.label}</div>
                    <div class="quality-description">${quality.upload.description}</div>
                </div>
                <div class="quality-item ${getQualityClass(quality.ping.label)}">
                    <div class="quality-label">Ping</div>
                    <div class="quality-value">${ping} ms</div>
                    <div class="quality-rating">${quality.ping.label}</div>
                    <div class="quality-description">${quality.ping.description}</div>
                </div>
            </div>
        `;
        
        // Add recommendations based on the results
        summaryHTML += `<div class="recommendations">`;
        
        if (quality.overall === 'Poor' || quality.overall === 'Very Poor') {
            summaryHTML += `<p>Your internet connection may not be adequate for video streaming or online gaming. Consider contacting your ISP about upgrade options.</p>`;
        } else if (quality.overall === 'Fair') {
            summaryHTML += `<p>Your connection is suitable for basic web browsing and standard definition video.</p>`;
        } else if (quality.overall === 'Good') {
            summaryHTML += `<p>Your connection should handle most online activities well, including HD video streaming.</p>`;
        } else {
            summaryHTML += `<p>Your connection is excellent and should handle all online activities with ease.</p>`;
        }
        
        // Add multi-connection info
        summaryHTML += `<p class="connection-details">This test used multiple parallel connections to provide more accurate results similar to Ookla's Speedtest.</p>`;
        
        summaryHTML += `</div>`;
        
        // Update the summary content
        summaryContent.innerHTML = summaryHTML;
    }
    
    // Get CSS class based on quality rating
    function getQualityClass(rating) {
        const ratingClasses = {
            'Very Slow': 'quality-very-poor',
            'Slow': 'quality-poor',
            'Good': 'quality-good',
            'Fast': 'quality-great',
            'Very Fast': 'quality-excellent',
            'Excellent': 'quality-excellent',
            'Average': 'quality-good',
            'Poor': 'quality-poor',
            'Very Poor': 'quality-very-poor'
        };
        
        return ratingClasses[rating] || '';
    }
    
    // Copy results to clipboard
    function copyResults() {
        const summaryText = speedTest.generateSummary();
        
        navigator.clipboard.writeText(summaryText)
            .then(() => {
                // Show success message
                const originalText = copyResultsBtn.innerHTML;
                copyResultsBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                
                setTimeout(() => {
                    copyResultsBtn.innerHTML = originalText;
                }, 2000);
            })
            .catch(err => {
                console.error('Error copying text: ', err);
                alert('Could not copy results. Please try again.');
            });
    }
    
    // Download results as a text file
    function downloadResults() {
        const summaryText = speedTest.generateSummary();
        const blob = new Blob([summaryText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Create download link and trigger click
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `devspeedtest-results-${timestamp}.txt`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
    
    // Event listeners
    startTestBtn.addEventListener('click', startTest);
    testAgainBtn.addEventListener('click', startTest);
    copyResultsBtn.addEventListener('click', copyResults);
    downloadResultsBtn.addEventListener('click', downloadResults);
    
    // Initialize the UI on load
    initializeUI();
    
    // Add custom styles for the quality assessment
    addQualityStyles();
});

// Add quality assessment styles dynamically
function addQualityStyles() {
    const styleSheet = document.createElement('style');
    styleSheet.innerHTML = `
        .quality-assessment {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            margin: 1.5rem 0;
        }
        
        @media (max-width: 768px) {
            .quality-assessment {
                grid-template-columns: 1fr;
            }
        }
        
        .quality-item {
            padding: 1rem;
            border-radius: var(--border-radius);
            background-color: rgba(255, 255, 255, 0.05);
            text-align: left;
        }
        
        .quality-label {
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        
        .quality-value {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }
        
        .quality-rating {
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        
        .quality-description {
            font-size: 0.9rem;
            color: var(--text-secondary);
        }
        
        .quality-excellent {
            border-left: 4px solid #2ecc71;
        }
        
        .quality-great {
            border-left: 4px solid #3498db;
        }
        
        .quality-good {
            border-left: 4px solid #f39c12;
        }
        
        .quality-poor {
            border-left: 4px solid #e67e22;
        }
        
        .quality-very-poor {
            border-left: 4px solid #e74c3c;
        }
        
        .recommendations {
            margin-top: 1rem;
            padding: 1rem;
            background-color: rgba(255, 255, 255, 0.05);
            border-radius: var(--border-radius);
        }
        
        .dark-mode .quality-item {
            background-color: rgba(0, 0, 0, 0.1);
        }
        
        .dark-mode .recommendations {
            background-color: rgba(0, 0, 0, 0.1);
        }
        
        .connection-details {
            margin-top: 1rem;
            font-size: 0.9rem;
            opacity: 0.8;
        }
    `;
    document.head.appendChild(styleSheet);
}
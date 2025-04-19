/**
 * DevSpeedTest - Speed Test Core
 * Provides functionality for testing internet connection speeds
 * Now with multi-connection testing similar to Ookla's speedtest
 */

class SpeedTest {
    constructor() {
        // Configuration
        this.testDuration = 10; // seconds per test
        this.downloadSizes = [1, 2, 5, 10]; // MB
        this.uploadSizes = [1, 2, 5]; // MB
        this.pingTestCount = 10;
        this.jitterTestCount = 10;
        this.minTimeout = 500; // ms
        this.maxTimeout = 5000; // ms
        
        // Multi-connection settings
        this.connectionCount = {
            download: 8, // Number of parallel connections for download
            upload: 4    // Number of parallel connections for upload
        };
        
        // Test servers - fallback options if one fails
        this.testServers = [
            { 
                url: 'https://httpbin.org',
                downloadPath: '/stream-bytes/',
                uploadPath: '/post',
                pingPath: '/get'
            },
            { 
                url: 'https://www.google.com',
                downloadPath: '/',
                uploadPath: '/',
                pingPath: '/'
            },
            { 
                url: 'https://www.cloudflare.com',
                downloadPath: '/',
                uploadPath: '/',
                pingPath: '/'
            }
        ];
        
        // Active server for testing
        this.activeServer = this.testServers[0];
        
        // Test results
        this.results = {
            download: 0,
            upload: 0,
            ping: 0,
            jitter: 0
        };
        
        // Detailed results for real-time updates
        this.detailedResults = {
            downloadChunks: [],
            uploadChunks: [],
            pingValues: []
        };
        
        // Connection info
        this.connectionInfo = {
            ip: '',
            isp: '',
            location: ''
        };
        
        // State
        this.isRunning = false;
        this.abortController = null;
        
        // Callbacks
        this.onProgress = null;
        this.onComplete = null;
        this.onError = null;
        this.onStageChange = null;
        this.onRealtimeUpdate = null; // New callback for real-time speed updates
    }
    
    /**
     * Converts bytes to megabits (for speed calculations)
     * @param {number} bytes - The number of bytes
     * @param {number} durationMs - Duration in milliseconds
     * @returns {number} - The number of megabits
     */
    bytesToMbps(bytes, durationMs) {
        return ((bytes * 8) / durationMs) * 1000 / 1024 / 1024;
    }
    
    /**
     * Generate a random payload of the specified size
     * @param {number} sizeInMB - Size in megabytes
     * @returns {Blob} - A blob of random data
     */
    generateTestData(sizeInMB) {
        const size = sizeInMB * 1024 * 1024;
        const arr = new Uint8Array(size);
        
        // Use larger chunks for better performance
        const chunkSize = 1024 * 64;
        for (let i = 0; i < size; i += chunkSize) {
            const end = Math.min(i + chunkSize, size);
            const value = Math.floor(Math.random() * 256);
            arr.fill(value, i, end);
        }
        
        return new Blob([arr]);
    }
    
    /**
     * Tests server connection and selects the best server
     * @returns {Promise<Object>} - The selected server
     */
    async selectBestServer() {
        this.updateStage('Selecting best server...');
        let bestServer = null;
        let fastestPing = Infinity;
        
        for (const server of this.testServers) {
            if (!this.isRunning) break;
            
            try {
                const pingUrl = `${server.url}${server.pingPath}?cacheBust=${Math.random()}`;
                const startTime = performance.now();
                
                const response = await fetch(pingUrl, {
                    method: 'GET',
                    cache: 'no-cache',
                    signal: this.abortController?.signal,
                }).catch(() => null);
                
                if (!response || !response.ok) continue;
                
                const pingTime = performance.now() - startTime;
                
                if (pingTime < fastestPing) {
                    fastestPing = pingTime;
                    bestServer = server;
                }
            } catch (error) {
                console.warn(`Server ${server.url} test failed:`, error);
            }
        }
        
        if (bestServer) {
            this.activeServer = bestServer;
            return bestServer;
        }
        
        // Default to first server if all tests fail
        return this.testServers[0];
    }
    
    /**
     * Runs a ping test to measure latency
     * @returns {Promise<number>} - The ping in milliseconds
     */
    async testPing() {
        this.updateStage('Testing ping...');
        let totalPing = 0;
        const pingValues = [];
        
        for (let i = 0; i < this.pingTestCount; i++) {
            if (!this.isRunning) break;
            
            const startTime = performance.now();
            try {
                // Use a tiny request to measure ping
                const pingUrl = `${this.activeServer.url}${this.activeServer.pingPath}?cacheBust=${Math.random()}`;
                await fetch(pingUrl, { 
                    method: 'GET',
                    cache: 'no-cache',
                    signal: this.abortController?.signal
                });
                
                const endTime = performance.now();
                const ping = endTime - startTime;
                pingValues.push(ping);
                totalPing += ping;
                
                // Store for detailed analysis
                this.detailedResults.pingValues.push(ping);
                
                this.updateProgress((i + 1) / this.pingTestCount * 100, 'ping');
                
                // Send real-time update for ping
                if (this.onRealtimeUpdate && i > 0) {
                    const currentAvg = totalPing / (i + 1);
                    this.onRealtimeUpdate('ping', currentAvg);
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.warn('Ping test error:', error);
                }
                // Use fallback ping time on error
                pingValues.push(100);
                totalPing += 100;
            }
        }
        
        // Calculate average ping
        const avgPing = Math.round(totalPing / this.pingTestCount);
        
        // Calculate jitter (variation in ping times)
        let jitterSum = 0;
        for (let i = 1; i < pingValues.length; i++) {
            jitterSum += Math.abs(pingValues[i] - pingValues[i - 1]);
        }
        
        const jitter = Math.round(jitterSum / (pingValues.length - 1));
        
        this.results.ping = avgPing;
        this.results.jitter = jitter;
        
        // Final update for ping and jitter
        if (this.onRealtimeUpdate) {
            this.onRealtimeUpdate('ping', avgPing);
            this.onRealtimeUpdate('jitter', jitter);
        }
        
        return avgPing;
    }
    
    /**
     * Run a single download test with multiple connections
     * @param {number} sizeInMB - Size of the download in MB
     * @returns {Promise<number>} - Speed in Mbps
     */
    async runMultiConnectionDownload(sizeInMB) {
        // Split the download across multiple connections
        const connectionsCount = this.connectionCount.download;
        const sizePerConnection = sizeInMB / connectionsCount;
        
        const startTime = performance.now();
        let totalBytes = 0;
        let completedConnections = 0;
        
        // Function to update progress during the test
        const updateDownloadSpeed = () => {
            const currentTime = performance.now();
            const elapsedTime = currentTime - startTime;
            
            if (elapsedTime > 0 && totalBytes > 0) {
                const currentSpeed = this.bytesToMbps(totalBytes, elapsedTime);
                
                // Send real-time update
                if (this.onRealtimeUpdate) {
                    this.onRealtimeUpdate('download', currentSpeed);
                }
            }
        };
        
        // Start interval for real-time updates
        const updateInterval = setInterval(updateDownloadSpeed, 200);
        
        try {
            // Create array of promises for parallel downloads
            const downloadPromises = Array.from({ length: connectionsCount }, (_, i) => {
                return new Promise(async (resolve, reject) => {
                    try {
                        // Add randomization to prevent caching
                        const url = `${this.activeServer.url}${this.activeServer.downloadPath}${Math.round(sizePerConnection * 1024 * 1024)}?conn=${i}&cacheBust=${Date.now()}`;
                        
                        const response = await fetch(url, {
                            cache: 'no-store',
                            signal: this.abortController?.signal
                        });
                        
                        if (!response.ok) {
                            throw new Error(`HTTP error: ${response.status}`);
                        }
                        
                        const data = await response.arrayBuffer();
                        totalBytes += data.byteLength;
                        completedConnections++;
                        
                        // Update the progress
                        this.updateProgress(completedConnections / connectionsCount * 100, 'download');
                        
                        resolve(data.byteLength);
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            console.warn(`Download connection ${i} error:`, error);
                        }
                        reject(error);
                    }
                });
            });
            
            // Wait for all downloads to complete or fail
            const results = await Promise.allSettled(downloadPromises);
            
            // Calculate the speed
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // Only count successful downloads
            const bytesDownloaded = results
                .filter(result => result.status === 'fulfilled')
                .reduce((sum, result) => sum + result.value, 0);
            
            const speed = this.bytesToMbps(bytesDownloaded, duration);
            
            // Store for detailed analysis
            this.detailedResults.downloadChunks.push({
                sizeInMB,
                bytesDownloaded,
                duration,
                speed,
                connections: connectionsCount
            });
            
            return speed;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.warn('Multi-connection download error:', error);
            }
            return 0;
        } finally {
            clearInterval(updateInterval);
        }
    }
    
    /**
     * Runs a download speed test with multiple parallel connections
     * @returns {Promise<number>} - The download speed in Mbps
     */
    async testDownloadSpeed() {
        this.updateStage('Testing download speed (multi-connection)...');
        const speedResults = [];
        
        // Start with smaller sizes, then move to larger ones
        for (const size of this.downloadSizes) {
            if (!this.isRunning) break;
            
            try {
                const speed = await this.runMultiConnectionDownload(size);
                if (speed > 0) {
                    // Apply a bias towards larger file sizes for more accurate results
                    const weight = size / this.downloadSizes[0];
                    speedResults.push({ speed, weight });
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.warn('Download test error:', error);
                }
            }
        }
        
        // Calculate weighted average speed
        if (speedResults.length > 0) {
            const totalWeight = speedResults.reduce((sum, result) => sum + result.weight, 0);
            const weightedSpeed = speedResults.reduce((sum, result) => sum + (result.speed * result.weight), 0) / totalWeight;
            
            this.results.download = parseFloat(weightedSpeed.toFixed(2));
            
            // Final update for download speed
            if (this.onRealtimeUpdate) {
                this.onRealtimeUpdate('download', this.results.download);
            }
        } else {
            this.results.download = 0;
        }
        
        return this.results.download;
    }
    
    /**
     * Run a single upload test with multiple connections
     * @param {number} sizeInMB - Size of the upload in MB
     * @returns {Promise<number>} - Speed in Mbps
     */
    async runMultiConnectionUpload(sizeInMB) {
        // Split the upload across multiple connections
        const connectionsCount = this.connectionCount.upload;
        const sizePerConnection = sizeInMB / connectionsCount;
        
        const startTime = performance.now();
        let totalBytes = 0;
        let completedConnections = 0;
        
        // Generate the test data once and reuse
        const testData = this.generateTestData(sizePerConnection);
        
        // Function to update progress during the test
        const updateUploadSpeed = () => {
            const currentTime = performance.now();
            const elapsedTime = currentTime - startTime;
            
            if (elapsedTime > 0 && totalBytes > 0) {
                const currentSpeed = this.bytesToMbps(totalBytes, elapsedTime);
                
                // Send real-time update
                if (this.onRealtimeUpdate) {
                    this.onRealtimeUpdate('upload', currentSpeed);
                }
            }
        };
        
        // Start interval for real-time updates
        const updateInterval = setInterval(updateUploadSpeed, 200);
        
        try {
            // Create array of promises for parallel uploads
            const uploadPromises = Array.from({ length: connectionsCount }, (_, i) => {
                return new Promise(async (resolve, reject) => {
                    try {
                        const url = `${this.activeServer.url}${this.activeServer.uploadPath}?conn=${i}&cacheBust=${Date.now()}`;
                        
                        const response = await fetch(url, {
                            method: 'POST',
                            body: testData,
                            signal: this.abortController?.signal
                        });
                        
                        if (!response.ok) {
                            throw new Error(`HTTP error: ${response.status}`);
                        }
                        
                        totalBytes += testData.size;
                        completedConnections++;
                        
                        // Update the progress
                        this.updateProgress(completedConnections / connectionsCount * 100, 'upload');
                        
                        resolve(testData.size);
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            console.warn(`Upload connection ${i} error:`, error);
                        }
                        reject(error);
                    }
                });
            });
            
            // Wait for all uploads to complete or fail
            const results = await Promise.allSettled(uploadPromises);
            
            // Calculate the speed
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // Only count successful uploads
            const bytesUploaded = results
                .filter(result => result.status === 'fulfilled')
                .reduce((sum, result) => sum + result.value, 0);
            
            const speed = this.bytesToMbps(bytesUploaded, duration);
            
            // Store for detailed analysis
            this.detailedResults.uploadChunks.push({
                sizeInMB,
                bytesUploaded,
                duration,
                speed,
                connections: connectionsCount
            });
            
            return speed;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.warn('Multi-connection upload error:', error);
            }
            return 0;
        } finally {
            clearInterval(updateInterval);
        }
    }
    
    /**
     * Runs an upload speed test with multiple parallel connections
     * @returns {Promise<number>} - The upload speed in Mbps
     */
    async testUploadSpeed() {
        this.updateStage('Testing upload speed (multi-connection)...');
        const speedResults = [];
        
        // Start with smaller sizes, then move to larger ones
        for (const size of this.uploadSizes) {
            if (!this.isRunning) break;
            
            try {
                const speed = await this.runMultiConnectionUpload(size);
                if (speed > 0) {
                    // Apply a bias towards larger file sizes for more accurate results
                    const weight = size / this.uploadSizes[0];
                    speedResults.push({ speed, weight });
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.warn('Upload test error:', error);
                }
            }
        }
        
        // Calculate weighted average speed
        if (speedResults.length > 0) {
            const totalWeight = speedResults.reduce((sum, result) => sum + result.weight, 0);
            const weightedSpeed = speedResults.reduce((sum, result) => sum + (result.speed * result.weight), 0) / totalWeight;
            
            this.results.upload = parseFloat(weightedSpeed.toFixed(2));
            
            // Final update for upload speed
            if (this.onRealtimeUpdate) {
                this.onRealtimeUpdate('upload', this.results.upload);
            }
        } else {
            this.results.upload = 0;
        }
        
        return this.results.upload;
    }
    
    /**
     * Fetches user's connection info (IP, ISP, location)
     * @returns {Promise<Object>} - Connection information
     */
    async fetchConnectionInfo() {
        this.updateStage('Fetching connection info...');
        
        try {
            // Try ipinfo.io first
            const response = await fetch('https://ipinfo.io/json', {
                signal: this.abortController?.signal
            });
            
            if (response.ok) {
                const data = await response.json();
                
                this.connectionInfo = {
                    ip: data.ip || 'Unknown',
                    isp: data.org?.replace(/^AS\d+\s/, '') || 'Unknown',
                    location: data.city && data.country ? `${data.city}, ${data.country}` : 'Unknown'
                };
                
                return this.connectionInfo;
            }
            
            throw new Error('Could not fetch from ipinfo.io');
        } catch (error) {
            // Fallback to ipapi.co
            try {
                if (!this.isRunning) throw new Error('Test aborted');
                
                const response = await fetch('https://ipapi.co/json/', {
                    signal: this.abortController?.signal
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    this.connectionInfo = {
                        ip: data.ip || 'Unknown',
                        isp: data.org || 'Unknown',
                        location: data.city && data.country_name ? `${data.city}, ${data.country_name}` : 'Unknown'
                    };
                    
                    return this.connectionInfo;
                }
                
                throw new Error('Could not fetch from ipapi.co');
            } catch (error) {
                console.warn('Connection info error:', error);
                return {
                    ip: 'Failed to retrieve',
                    isp: 'Failed to retrieve',
                    location: 'Failed to retrieve'
                };
            }
        }
    }
    
    /**
     * Updates the current test stage
     * @param {string} stage - The current test stage
     */
    updateStage(stage) {
        if (this.onStageChange) {
            this.onStageChange(stage);
        }
    }
    
    /**
     * Updates the test progress
     * @param {number} percentage - The progress percentage
     * @param {string} stage - The test stage
     */
    updateProgress(percentage, stage) {
        if (this.onProgress) {
            this.onProgress(percentage, stage);
        }
    }
    
    /**
     * Starts the complete speed test
     * @returns {Promise<Object>} - The test results
     */
    async startTest() {
        if (this.isRunning) {
            return;
        }
        
        this.isRunning = true;
        this.abortController = new AbortController();
        
        // Reset detailed results
        this.detailedResults = {
            downloadChunks: [],
            uploadChunks: [],
            pingValues: []
        };
        
        try {
            // Select best server first
            await this.selectBestServer();
            
            // Test sequence
            await this.testPing();
            
            if (!this.isRunning) throw new Error('Test aborted');
            await this.testDownloadSpeed();
            
            if (!this.isRunning) throw new Error('Test aborted');
            await this.testUploadSpeed();
            
            if (!this.isRunning) throw new Error('Test aborted');
            await this.fetchConnectionInfo();
            
            // Save results to localStorage
            this.saveResults();
            
            if (this.onComplete) {
                this.onComplete(this.results, this.connectionInfo);
            }
            
            return {
                results: this.results,
                connectionInfo: this.connectionInfo,
                detailedResults: this.detailedResults
            };
        } catch (error) {
            if (error.name !== 'AbortError' && this.onError) {
                this.onError(error);
            }
        } finally {
            this.isRunning = false;
            this.abortController = null;
        }
    }
    
    /**
     * Stops an ongoing test
     */
    stopTest() {
        if (this.isRunning && this.abortController) {
            this.abortController.abort();
            this.isRunning = false;
        }
    }
    
    /**
     * Gets result quality assessment
     * @returns {Object} - Quality assessment of the speed test
     */
    getQualityAssessment() {
        const { download, upload, ping } = this.results;
        
        // Speed tiers
        const speedTiers = {
            download: [
                { threshold: 5, label: 'Very Slow', description: 'Suitable for basic web browsing only' },
                { threshold: 15, label: 'Slow', description: 'Adequate for web browsing and SD video' },
                { threshold: 40, label: 'Good', description: 'Good for HD video and small households' },
                { threshold: 100, label: 'Fast', description: 'Great for multiple users and 4K streaming' },
                { threshold: Infinity, label: 'Very Fast', description: 'Excellent for all activities including multiple 4K streams and large downloads' }
            ],
            upload: [
                { threshold: 1, label: 'Very Slow', description: 'Minimal for basic uploads' },
                { threshold: 5, label: 'Slow', description: 'Adequate for social media and basic video calls' },
                { threshold: 10, label: 'Good', description: 'Good for video calls and uploading media' },
                { threshold: 20, label: 'Fast', description: 'Great for HD video calls and cloud backups' },
                { threshold: Infinity, label: 'Very Fast', description: 'Excellent for content creators and large file sharing' }
            ],
            ping: [
                { threshold: 20, label: 'Excellent', description: 'Perfect for competitive gaming and real-time applications' },
                { threshold: 50, label: 'Good', description: 'Great for online gaming and video calls' },
                { threshold: 100, label: 'Average', description: 'Suitable for most everyday activities' },
                { threshold: 150, label: 'Poor', description: 'May experience lag in real-time applications' },
                { threshold: Infinity, label: 'Very Poor', description: 'Significant delays in interactive applications' }
            ]
        };
        
        // Find the appropriate tier for each metric
        const findTier = (value, tiers) => {
            return tiers.find(tier => value < tier.threshold);
        };
        
        return {
            download: findTier(download, speedTiers.download),
            upload: findTier(upload, speedTiers.upload),
            ping: findTier(ping, speedTiers.ping),
            overall: this.getOverallRating()
        };
    }
    
    /**
     * Calculates an overall rating from the test results
     * @returns {string} - Overall rating description
     */
    getOverallRating() {
        const { download, upload, ping } = this.results;
        
        // Calculate a score from 0-100 based on download, upload and ping
        // Download makes up 50% of the score, upload 30%, and ping 20%
        
        // Download score (0-50)
        let downloadScore = 0;
        if (download >= 100) downloadScore = 50;
        else if (download >= 50) downloadScore = 40 + (download - 50) * 0.2;
        else if (download >= 25) downloadScore = 30 + (download - 25) * 0.4;
        else if (download >= 10) downloadScore = 20 + (download - 10) * 0.67;
        else if (download >= 5) downloadScore = 10 + (download - 5);
        else downloadScore = download * 2;
        
        // Upload score (0-30)
        let uploadScore = 0;
        if (upload >= 50) uploadScore = 30;
        else if (upload >= 20) uploadScore = 25 + (upload - 20) * 0.17;
        else if (upload >= 10) uploadScore = 20 + (upload - 10) * 0.5;
        else if (upload >= 5) uploadScore = 15 + (upload - 5);
        else if (upload >= 1) uploadScore = 5 + upload * 2.5;
        else uploadScore = upload * 5;
        
        // Ping score (0-20, inverse because lower is better)
        let pingScore = 0;
        if (ping <= 10) pingScore = 20;
        else if (ping <= 20) pingScore = 18 - (ping - 10) * 0.2;
        else if (ping <= 50) pingScore = 15 - (ping - 20) * 0.1;
        else if (ping <= 100) pingScore = 12 - (ping - 50) * 0.06;
        else if (ping <= 200) pingScore = 7 - (ping - 100) * 0.03;
        else pingScore = Math.max(0, 4 - (ping - 200) * 0.01);
        
        // Total score (0-100)
        const totalScore = downloadScore + uploadScore + pingScore;
        
        // Rating based on total score
        if (totalScore >= 90) return 'Excellent';
        if (totalScore >= 75) return 'Very Good';
        if (totalScore >= 60) return 'Good';
        if (totalScore >= 40) return 'Fair';
        if (totalScore >= 20) return 'Poor';
        return 'Very Poor';
    }
    
    /**
     * Saves the test results to localStorage
     */
    saveResults() {
        try {
            const resultsToSave = {
                timestamp: new Date().toISOString(),
                results: this.results,
                connectionInfo: this.connectionInfo,
                quality: this.getQualityAssessment()
            };
            
            localStorage.setItem('devSpeedTestLastResult', JSON.stringify(resultsToSave));
        } catch (error) {
            console.warn('Could not save results to localStorage:', error);
        }
    }
    
    /**
     * Gets the last saved test results from localStorage
     * @returns {Object|null} - The last saved test results
     */
    getLastResults() {
        try {
            const savedResults = localStorage.getItem('devSpeedTestLastResult');
            if (savedResults) {
                return JSON.parse(savedResults);
            }
        } catch (error) {
            console.warn('Could not retrieve saved results:', error);
        }
        return null;
    }
    
    /**
     * Generates a summary text based on the test results
     * @returns {string} - A text summary of the test results
     */
    generateSummary() {
        const { download, upload, ping, jitter } = this.results;
        const { ip, isp, location } = this.connectionInfo;
        const quality = this.getQualityAssessment();
        
        return `DevSpeedTest Results - ${new Date().toLocaleString()}
----------------------------------------------------
Download: ${download} Mbps (${quality.download.label})
Upload: ${upload} Mbps (${quality.upload.label})
Ping: ${ping} ms (${quality.ping.label})
Jitter: ${jitter} ms
----------------------------------------------------
IP Address: ${ip}
ISP: ${isp}
Location: ${location}
----------------------------------------------------
Overall Rating: ${quality.overall}

Test performed with DevSpeedTest - A pure frontend speed testing tool.`;
    }
}

// Export the SpeedTest class
window.SpeedTest = SpeedTest;
# DevSpeedTest

![DevSpeedTest Logo](assets/favicon.svg)

A modern, responsive internet speed testing tool built with pure HTML, CSS, and JavaScript. DevSpeedTest allows users to measure their internet connection's download speed, upload speed, ping, and jitter through an elegant and user-friendly interface.

**🚀 Live Demo: [https://dddevid.github.io/DevSpeedTest/](https://dddevid.github.io/DevSpeedTest/)**

## Features

- **Pure Frontend Implementation**: Built entirely with HTML, CSS, and JavaScript - no backend or server-side processing required
- **Modern UI Design**: Clean, responsive interface with glassmorphism styling
- **Dark Mode Support**: Toggle between light and dark themes with a smooth animated switch
- **Comprehensive Speed Metrics**:
  - Download speed (Mbps)
  - Upload speed (Mbps)
  - Ping (ms)
  - Jitter (ms)
- **Connection Information**:
  - Public IP address
  - ISP detection
  - Approximate location
- **Real-time Visual Feedback**:
  - Animated progress indicators
  - Dynamic gauges and speedometers
  - Test status updates
- **Results Analysis**:
  - Quality assessment for each metric
  - Overall connection rating
  - Personalized recommendations based on results
- **Result Sharing**:
  - One-click copy to clipboard
  - Download results as a text file
- **Persistent Results**: Saves the most recent test results using localStorage
- **Cross-Browser Compatibility**: Works on all modern browsers
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Smooth Animations**: Powered by Anime.js for fluid transitions and effects

## Technologies Used

- **HTML5**: Semantic markup for structure
- **CSS3**: Modern styling with variables, flexbox, and grid
  - Custom properties for theming
  - Media queries for responsiveness
  - Glassmorphism effects
- **JavaScript (ES6+)**: Core functionality
  - Fetch API for network requests
  - Web Performance API for accurate speed measurements
  - LocalStorage for data persistence
  - Class-based architecture
- **External Libraries**:
  - [Anime.js](https://animejs.com/): For smooth animations
  - [Font Awesome](https://fontawesome.com/): For icons

## How It Works

DevSpeedTest uses the browser's Fetch API to measure your connection speed:

1. **Ping Test**: Sends multiple small requests to measure round-trip time
2. **Download Test**: Downloads files of various sizes and measures the speed
3. **Upload Test**: Uploads random data of different sizes to measure upload speed
4. **Jitter Calculation**: Analyzes variation in ping times to determine connection stability
5. **Connection Info**: Uses public APIs (ipinfo.io or ipapi.co) to detect IP, ISP, and location

All tests are performed client-side without sending any sensitive data to external servers other than the test data used for speed measurement.

## How to Use

1. Open `index.html` in any modern web browser
2. Click the "Start Test" button
3. Wait for the test to complete (usually takes 20-30 seconds)
4. View your results and analysis
5. Use the "Test Again" button to run another test
6. Toggle between dark and light mode using the switch in the header
7. Copy or download your results using the buttons in the Summary section

## File Structure

```
DevSpeedTest/
├── index.html                 # Main HTML file
├── assets/
│   └── favicon.svg            # Vector favicon
├── css/
│   └── styles.css             # All styles and themes
└── js/
    ├── speed-test.js          # Core speed testing functionality
    ├── theme-toggle.js        # Dark/light mode toggle functionality
    └── ui-controller.js       # UI interaction and display logic
```

## Browser Support

DevSpeedTest works in all modern browsers including:
- Chrome
- Firefox
- Safari
- Edge
- Opera

## Limitations

- The accuracy of speed tests depends on various factors including network conditions, server load, and browser limitations
- The test measures your connection to specific test servers, not your overall internet quality
- Upload tests may be less accurate due to browser security limitations
- Some corporate networks, VPNs, or proxies may affect test results

## Deployment

To deploy DevSpeedTest:

1. **Local Testing**: Simply open `index.html` in a browser
2. **Web Hosting**: Upload all files to any static web hosting service
3. **GitHub Pages**: Fork/clone this repo and enable GitHub Pages in repository settings

## License

This project is released under the MIT License.

---

Created with ❤️ by dddevid
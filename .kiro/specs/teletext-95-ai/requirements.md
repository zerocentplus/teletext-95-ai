# Teletext-95 AI — Requirements Specification

## Overview
Teletext-95 AI resurrects 1990s European CRT Teletext / Ceefax broadcast interfaces with live AI intelligence and real-time data feeds for the Kiroween 2026 Resurrection category.

## Functional Requirements
1. **Authentic 1990s Teletext Visual & Audio System:** 8-color Teletext palette (`#000000`, `#FFFF00`, `#00FFFF`, `#00FF00`, `#FF00FF`, `#FF0000`, `#0000FF`, `#FFFFFF`), 40-column CRT scanline layout, Fastext colored shortcut buttons (Red, Green, Yellow, Blue), and toggleable Web Audio API retro keypad tones.
2. **3-Digit Page Navigation (`P100`–`P500`):** Keyboard numpad and on-screen remote navigation across:
   - `P100`: Main Index & Live Broadcast Clock
   - `P200`: Live Crypto & Global Market Ticker (CoinGecko API with offline fallback)
   - `P300`: AI Tech Headlines Synthesizer (Hacker News top stories in 40-column bulletins)
   - `P400`: Interactive AI Teletext Oracle (structured 1990s Teletext AI Q&A)
   - `P500`: Retro ASCII Weather & Space Telemetry (Open-Meteo API with fallback)
3. **Zero-Dependency Static Architecture:** Pure HTML5, CSS3, and Vanilla JavaScript deployable directly on GitHub Pages.

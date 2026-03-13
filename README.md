# Web Modular Synth Playground

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Web Audio API](https://img.shields.io/badge/Web_Audio_API-FF6347?style=for-the-badge)

**Interactive modular synthesizer simulator** built as a web extension of my artist landing page ([ritasilva.online](https://www.ritasilva.online/)).  
Patch modules, turn knobs, connect ports, and hear real-time audio in your browser.

---

## Features

- Fully functional **modular synth engine** with real-time audio
- **Rack container** with interactive modules
- **Included modules:** Clock, Sequencer, ADSR, LFO, Oscillator, Filter, VCA, Reverb, Delay, Mixer
- **Interactive controls:** knobs, buttons, digital displays
- Patch your own modular synth using cables directly in the browser
- Real-time **modulation and audio synthesis**

---

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS
- **Audio Engine:** Web Audio API
- **State Management:** React hooks and modular components

---

## Getting Started

### 1. Clone the repository

``bash
git clone https://github.com/teu-username/eurorack-web-modules.git
cd eurorack-web-modules

### 2. Install dependencies

npm install

# or

yarn install

### 3. Run the development server

npm run dev

# or

yarn dev

Open http://localhost:3000 to see the synth in action.

---

## How to use

- Connect ports (CV and audio jacks) to create your modular synth patch
- Or simply select auto-patch to load a fully generated and working patch
- Turn knobs to adjust parameters (frequency, filter, LFO, ADSR, etc.)
- Play sequences, modulate signals, and listen to live audio output
- Have fun!

## To do next:

- Adjust UI to align all modules and their content
- Create a mobile-friendly responsive layout
- Load presets
- Additional modules: Sampler (with audio input from user device's microphone), Granular fx, Looper, Harmonic-Oscillator, Complex-Oscillator, Low Pass Gate, Reverse Reverb, Sample and Hold, Function Generator, Noise Generator.

## License

All rights reserved by Rita Silva.

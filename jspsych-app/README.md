# Music Rating Study — jsPsych Version

A browser-based music rating experiment built with [jsPsych 7](https://www.jspsych.org/7.3/).

## Structure

```
jspsych-app/
├── index.html        # Entry point (loads jsPsych from CDN)
├── experiment.js     # Experiment timeline & logic
└── README.md         # This file

samples/              # Audio files (shared with original app)
└── ai_music/
    ├── Cello Waltz.mp3
    ├── Clockwork Carousel.mp3
    ├── Far Meadow Calling.mp3
    ├── Hungarian Dance Five.mp3
    ├── Moonlit Vow.mp3
    └── Puszta Fire.mp3
```

## Setup

### 1. Configure Firebase

Edit `experiment.js` and replace the Firebase config placeholder at the top:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "000000000000",
  appId: "YOUR_APP_ID",
};
```

### 2. Serve Locally

Because the experiment loads audio files, you need to serve it via HTTP (not `file://`). Use any local server:

```bash
# Python
cd /path/to/streamlit-app
python3 -m http.server 8000

# Then open: http://localhost:8000/jspsych-app/index.html
```

Or with Node.js:

```bash
npx serve .
```

### 3. Deploy

You can host this on any static hosting:
- **GitHub Pages**
- **Firebase Hosting**
- **Netlify / Vercel**
- **Cognition.run** (jsPsych-specific hosting for experiments)

Just upload the `jspsych-app/` folder and the `samples/` folder together.

## Experiment Flow

1. **Welcome & Instructions** — explains the task
2. **Pre-Study Questionnaire** — music background, genre preferences, attitudes
3. **Audio Rating Trials** — 6 samples, each rated 1–6 on a Likert scale
4. **Post-Study Questionnaire** — reflections on the experience
5. **Completion** — thank you screen with rating summary

## Data Storage

- Results are saved to **Firebase Firestore** (collection: `music_rating_responses`)
- Full jsPsych trial data is also logged to the browser console

## Customization

- **Add/remove samples**: Edit the `MUSIC_SAMPLES` array in `experiment.js`
- **Change scale**: Modify the Likert buttons in the rating trial HTML
- **Randomize order**: Add `jsPsych.randomization.shuffle()` to the samples array
- **Add attention checks**: Insert additional trials between audio ratings

## Dependencies (loaded via CDN)

- jsPsych 7.3.4
- Plugins: html-button-response, survey-multi-choice, survey-multi-select, survey-likert, survey-text, audio-button-response, preload, html-keyboard-response
- Firebase JS SDK 10.12 (compat)

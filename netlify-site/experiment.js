/* ============================================================
   Music Rating Study — jsPsych 7.x Experiment (Netlify Deploy)
   ============================================================ */

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyD1SDbm4FyI6ZIcn0UrAzHQr-wh8uRI8_8",
  authDomain: "music-study-7658a.firebaseapp.com",
  projectId: "music-study-7658a",
  storageBucket: "music-study-7658a.firebasestorage.app",
  messagingSenderId: "759926223753",
  appId: "1:759926223753:web:163e74bc0a4657c6526758",
  measurementId: "G-X1N2MEDBPY",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- Debug: Test Firebase connection immediately ---
if (new URLSearchParams(window.location.search).get("debug") === "true") {
  db.collection("connection_test").doc("ping").set({
    timestamp: new Date().toISOString(),
    message: "Firebase connection working!"
  }).then(() => {
    console.log("%c✅ Firebase connection test PASSED", "color: green; font-size: 14px;");
    const banner = document.createElement("div");
    banner.style.cssText = "position:fixed;bottom:0;left:0;right:0;padding:10px;background:#28a745;color:white;text-align:center;font-size:14px;z-index:99999;";
    banner.textContent = "✅ Firebase connected! Test doc written to connection_test/ping";
    document.body.prepend(banner);
  }).catch((err) => {
    console.error("%c❌ Firebase connection test FAILED", "color: red; font-size: 14px;", err);
    const banner = document.createElement("div");
    banner.style.cssText = "position:fixed;bottom:0;left:0;right:0;padding:10px;background:#dc3545;color:white;text-align:center;font-size:14px;z-index:99999;";
    banner.textContent = "❌ Firebase FAILED: " + err.code + " — " + err.message;
    document.body.prepend(banner);
  });
}

// --- URL Parameters (Prolific integration) ---
// Captures PROLIFIC_PID, STUDY_ID, SESSION_ID from the URL
// e.g., ?PROLIFIC_PID=abc123&STUDY_ID=def456&SESSION_ID=ghi789
const urlParams = new URLSearchParams(window.location.search);
const PARTICIPANT_ID = urlParams.get("pid") || urlParams.get("PROLIFIC_PID") || null;
const CURRENT_DAY = parseInt(urlParams.get("day")) || 2;
const participantInfo = {
  participant_id: PARTICIPANT_ID,
  prolific_pid: urlParams.get("PROLIFIC_PID") || null,
  study_id: urlParams.get("STUDY_ID") || null,
  session_id: urlParams.get("SESSION_ID") || null,
  day: CURRENT_DAY,
  all_url_params: Object.fromEntries(urlParams.entries()),
};

// --- Debug Mode ---
// Activate by adding ?debug=true to the URL
// Skips the 30-second listening requirement and shows save status on-screen
const DEBUG_MODE = urlParams.get("debug") === "true";
if (DEBUG_MODE) {
  console.log("%c[DEBUG MODE ACTIVE]", "color: orange; font-size: 16px; font-weight: bold;");
  console.log("Participant info:", participantInfo);
}

// --- Audio Base URL ---
const AUDIO_BASE_URL = "audio/";

// --- Music Samples ---
const MUSIC_FILES = [
  { id: "sample_1", title: "Sample 1", filename: "Cello Waltz.mp3" },
  { id: "sample_2", title: "Sample 2", filename: "Clockwork Carousel.mp3" },
  { id: "sample_3", title: "Sample 3", filename: "Far Meadow Calling.mp3" },
  { id: "sample_4", title: "Sample 4", filename: "Hungarian Dance Five.mp3" },
  { id: "sample_5", title: "Sample 5", filename: "Moonlit Vow.mp3" },
  { id: "sample_6", title: "Sample 6", filename: "Puszta Fire.mp3" },
];

let MUSIC_SAMPLES = MUSIC_FILES.map((s) => ({
  ...s,
  file: AUDIO_BASE_URL + s.filename,
}));

// In debug mode, only use 2 samples and skip attention checks
if (DEBUG_MODE) {
  MUSIC_SAMPLES = MUSIC_SAMPLES.slice(0, 2);
}

// --- Initialize jsPsych ---
const jsPsych = initJsPsych({
  display_element: "jspsych-target",
});

// --- Timeline ---
const timeline = [];

// ============================================================
// 1. PRELOAD FIRST TWO SAMPLES (rest loaded lazily)
// ============================================================
timeline.push({
  type: jsPsychPreload,
  audio: MUSIC_SAMPLES.slice(0, 2).map((s) => s.file),
  show_progress_bar: true,
  message: "<p style='font-size:18px;'>Loading audio... Please wait.</p>",
});

// ============================================================
// 2. WELCOME / INSTRUCTIONS
// ============================================================
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class="study-header">
      <h1>🎵 Music Listening Session</h1>
      <p style="color:#666;">Day ${CURRENT_DAY} of 7</p>
    </div>
    <div class="instructions-box">
      <h3>Instructions</h3>
      <p>You will listen to a series of short music samples and rate each one on a scale from <strong>1 to 7</strong>.</p>
      <ul>
        <li><strong>1</strong> = Strongly dislike</li>
        <li><strong>2</strong> = Dislike</li>
        <li><strong>3</strong> = Slightly dislike</li>
        <li><strong>4</strong> = Neutral</li>
        <li><strong>5</strong> = Slightly like</li>
        <li><strong>6</strong> = Like</li>
        <li><strong>7</strong> = Strongly like</li>
      </ul>
      <p>Please listen to each sample fully before rating. Use headphones if possible for the best experience.</p>
    </div>
  `,
  choices: ["Begin Study"],
});

// ============================================================
// 3. MUSIC RATING TRIALS (with attention check in the middle)
// ============================================================

const ATTENTION_CHECK_AFTER = Math.floor(MUSIC_SAMPLES.length / 2); // after sample 3
const TONE_CHECK_AFTER = MUSIC_SAMPLES.length - 1; // after sample 5 (second-to-last)

MUSIC_SAMPLES.forEach((sample, index) => {
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: function () {
      const progress = ((index + 1) / MUSIC_SAMPLES.length) * 100;
      return `
        <div class="sample-card">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
          <p style="text-align:center; color:#666; margin-bottom:1rem;">
            Sample ${index + 1} of ${MUSIC_SAMPLES.length}
          </p>
          <div class="sample-title">🎶 ${sample.title}</div>
          <audio controls controlsList="nodownload" autoplay style="width:100%">
            <source src="${sample.file}" type="audio/mpeg">
            Your browser does not support audio playback.
          </audio>
          <p style="margin-top:1.5rem; font-weight:600;">How much do you like this sample?</p>
          <p id="listen-timer-msg" style="text-align:center; color:#c0392b; font-size:14px; margin-bottom:0.5rem;">
            ⏳ Please listen for at least 30 seconds before rating.
          </p>
          <div class="likert-scale-container" id="likert-container">
            <div class="likert-item"><button class="likert-btn" data-value="1" onclick="selectRating(1)" disabled>1</button><span class="likert-label">Strongly dislike</span></div>
            <div class="likert-item"><button class="likert-btn" data-value="2" onclick="selectRating(2)" disabled>2</button><span class="likert-label">Dislike</span></div>
            <div class="likert-item"><button class="likert-btn" data-value="3" onclick="selectRating(3)" disabled>3</button><span class="likert-label">Slightly dislike</span></div>
            <div class="likert-item"><button class="likert-btn" data-value="4" onclick="selectRating(4)" disabled>4</button><span class="likert-label">Neutral</span></div>
            <div class="likert-item"><button class="likert-btn" data-value="5" onclick="selectRating(5)" disabled>5</button><span class="likert-label">Slightly like</span></div>
            <div class="likert-item"><button class="likert-btn" data-value="6" onclick="selectRating(6)" disabled>6</button><span class="likert-label">Like</span></div>
            <div class="likert-item"><button class="likert-btn" data-value="7" onclick="selectRating(7)" disabled>7</button><span class="likert-label">Strongly like</span></div>
          </div>
          <p id="rating-display" class="rating-label" style="text-align:center;"></p>

          <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #e0e0e0;">

          <p style="font-weight:600;">How likely would you be to listen to this song again?</p>
          <div class="likert-scale-container" id="listen-again-container">
            <div class="likert-item"><button class="likert-btn listen-again-btn" data-value="1" onclick="selectListenAgain(1)" disabled>1</button><span class="likert-label">Definitely not</span></div>
            <div class="likert-item"><button class="likert-btn listen-again-btn" data-value="2" onclick="selectListenAgain(2)" disabled>2</button><span class="likert-label">Very unlikely</span></div>
            <div class="likert-item"><button class="likert-btn listen-again-btn" data-value="3" onclick="selectListenAgain(3)" disabled>3</button><span class="likert-label">Unlikely</span></div>
            <div class="likert-item"><button class="likert-btn listen-again-btn" data-value="4" onclick="selectListenAgain(4)" disabled>4</button><span class="likert-label">Neutral</span></div>
            <div class="likert-item"><button class="likert-btn listen-again-btn" data-value="5" onclick="selectListenAgain(5)" disabled>5</button><span class="likert-label">Likely</span></div>
            <div class="likert-item"><button class="likert-btn listen-again-btn" data-value="6" onclick="selectListenAgain(6)" disabled>6</button><span class="likert-label">Very likely</span></div>
            <div class="likert-item"><button class="likert-btn listen-again-btn" data-value="7" onclick="selectListenAgain(7)" disabled>7</button><span class="likert-label">Definitely</span></div>
          </div>
          <p id="listen-again-display" class="rating-label" style="text-align:center;"></p>
        </div>
      `;
    },
    choices: ["Submit Rating"],
    data: {
      phase: "rating",
      sample_id: sample.id,
      sample_title: sample.title,
    },
    on_load: function () {
      // Disable submit button until both ratings are selected
      const submitBtn = document.querySelector(
        ".jspsych-html-button-response-button"
      );
      if (submitBtn) {
        submitBtn.querySelector("button").disabled = true;
        submitBtn.querySelector("button").style.opacity = "0.5";
      }

      // Dim listen-again buttons initially too
      document.querySelectorAll(".listen-again-btn").forEach((btn) => {
        btn.style.opacity = "0.4";
        btn.style.cursor = "not-allowed";
      });

      // Preload next sample in background
      if (index + 1 < MUSIC_SAMPLES.length) {
        var nextAudio = new Audio();
        nextAudio.src = MUSIC_SAMPLES[index + 1].file;
      }

      // --- 30-second minimum listening enforcement ---
      const REQUIRED_LISTEN_SECONDS = DEBUG_MODE ? 2 : 30;
      let listenedSeconds = 0;
      let listenInterval = null;
      window._ratingUnlocked = false;
      window._listenedSeconds = 0;
      window._audioCompleted = false;

      const audioEl = document.querySelector("audio");
      const timerMsg = document.getElementById("listen-timer-msg");
      const likertBtns = document.querySelectorAll(".likert-btn");

      // Dim the rating buttons initially
      likertBtns.forEach((btn) => {
        btn.style.opacity = "0.4";
        btn.style.cursor = "not-allowed";
      });

      function updateTimerDisplay() {
        const remaining = REQUIRED_LISTEN_SECONDS - listenedSeconds;
        if (remaining > 0) {
          timerMsg.textContent = `⏳ Please listen for at least ${remaining} more second${remaining !== 1 ? "s" : ""} before rating.`;
        }
      }

      function unlockRating() {
        window._ratingUnlocked = true;
        timerMsg.textContent = "✅ You may now rate this sample.";
        timerMsg.style.color = "#27ae60";
        likertBtns.forEach((btn) => {
          btn.disabled = false;
          btn.style.opacity = "1";
          btn.style.cursor = "pointer";
        });
        // Also unlock listen-again buttons
        document.querySelectorAll(".listen-again-btn").forEach((btn) => {
          btn.disabled = false;
          btn.style.opacity = "1";
          btn.style.cursor = "pointer";
        });
        if (listenInterval) {
          clearInterval(listenInterval);
          listenInterval = null;
        }
      }

      if (audioEl) {
        // --- Prevent seeking / scrubbing ---
        let lastAllowedTime = 0;
        audioEl.addEventListener("timeupdate", function () {
          // Track the legitimate playback position
          if (!audioEl.seeking) {
            lastAllowedTime = audioEl.currentTime;
          }
        });
        audioEl.addEventListener("seeking", function () {
          // Only allow seeking backwards (or tiny forward jumps from normal playback)
          const delta = audioEl.currentTime - lastAllowedTime;
          if (delta > 0.5) {
            audioEl.currentTime = lastAllowedTime;
          }
        });

        // Auto-play the audio
        audioEl.play().catch(function () {
          if (timerMsg) {
            timerMsg.textContent = "⏳ Press play to start listening (at least 30 seconds required).";
          }
        });

        audioEl.addEventListener("play", function () {
          if (!listenInterval) {
            listenInterval = setInterval(function () {
              listenedSeconds++;
              window._listenedSeconds = listenedSeconds;
              if (!window._ratingUnlocked) {
                updateTimerDisplay();
                if (listenedSeconds >= REQUIRED_LISTEN_SECONDS) {
                  unlockRating();
                }
              }
            }, 1000);
          }
        });

        audioEl.addEventListener("pause", function () {
          if (listenInterval) {
            clearInterval(listenInterval);
            listenInterval = null;
          }
        });

        audioEl.addEventListener("ended", function () {
          window._audioCompleted = true;
          if (!window._ratingUnlocked) {
            unlockRating();
          }
        });
      }
    },
    on_finish: function (data) {
      data.rating = window._currentRating || null;
      data.listen_again = window._currentListenAgain || null;
      data.listening_duration_seconds = window._listenedSeconds || 0;
      data.audio_completed = window._audioCompleted || false;
      window._currentRating = null;
      window._currentListenAgain = null;
      window._listenedSeconds = 0;
      window._audioCompleted = false;
    },
  });

  // --- Attention check after the middle sample ---
  if (!DEBUG_MODE && index === ATTENTION_CHECK_AFTER - 1) {
    // Step 1: Play a spoken word via speech synthesis, then ask what they heard
    timeline.push({
      type: jsPsychHtmlButtonResponse,
      stimulus: `
        <div class="sample-card">
          <div class="sample-title">🔊 Attention Check</div>
          <p>Please click the button below to play a short audio clip. Listen carefully — you will be asked what you heard.</p>
        </div>
      `,
      choices: ["Play Audio"],
      data: { phase: "attention_check_play" },
      on_finish: function () {
        // Generate a tone + spoken word using Web Audio API + SpeechSynthesis
        const words = ["apple", "piano", "river", "sunset", "garden"];
        const chosenWord = words[Math.floor(Math.random() * words.length)];
        window._attentionWord = chosenWord;

        // Play a short tone first
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.value = 440;
          gain.gain.value = 0.3;
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
          console.warn("Could not play tone:", e);
        }

        // Speak the word after a brief delay
        setTimeout(function () {
          const utterance = new SpeechSynthesisUtterance(chosenWord);
          utterance.rate = 0.9;
          utterance.volume = 1;
          window.speechSynthesis.speak(utterance);
        }, 600);
      },
    });

    // Step 2: Ask what they heard
    timeline.push({
      type: jsPsychSurveyText,
      preamble: `
        <div class="sample-card" style="border-color:#f0ad4e;">
          <div class="sample-title">🔊 Attention Check</div>
          <p>What word did you just hear? Please type it below.</p>
        </div>
      `,
      questions: [
        {
          prompt: "",
          name: "attention_response",
          placeholder: "Type the word you heard...",
          required: true,
          rows: 1,
        },
      ],
      button_label: "Continue",
      data: { phase: "attention_check" },
      on_finish: function (data) {
        const response = (data.response.attention_response || "").trim().toLowerCase();
        const expected = (window._attentionWord || "").toLowerCase();
        data.attention_word = expected;
        data.attention_correct = response === expected;
      },
    });
  }

  // --- Tone loudness attention check after second-to-last sample ---
  if (!DEBUG_MODE && index === TONE_CHECK_AFTER - 1) {
    // Step 1: Play two tones with different volumes
    timeline.push({
      type: jsPsychHtmlButtonResponse,
      stimulus: `
        <div class="sample-card">
          <div class="sample-title">🔊 Attention Check</div>
          <p>You will hear <strong>two tones</strong> played one after the other. Listen carefully and decide which one is louder.</p>
        </div>
      `,
      choices: ["Play Tones"],
      data: { phase: "tone_check_play" },
      on_finish: function () {
        // Randomly decide which tone is louder
        const louderFirst = Math.random() < 0.5;
        window._toneCheckAnswer = louderFirst ? "first" : "second";

        const loudVol = 0.6;
        const quietVol = 0.1;

        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

          // Tone 1
          const osc1 = audioCtx.createOscillator();
          const gain1 = audioCtx.createGain();
          osc1.type = "sine";
          osc1.frequency.value = 440;
          gain1.gain.value = louderFirst ? loudVol : quietVol;
          osc1.connect(gain1);
          gain1.connect(audioCtx.destination);
          osc1.start(audioCtx.currentTime);
          osc1.stop(audioCtx.currentTime + 0.8);

          // Tone 2 (after a gap)
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.type = "sine";
          osc2.frequency.value = 440;
          gain2.gain.value = louderFirst ? quietVol : loudVol;
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.start(audioCtx.currentTime + 1.3);
          osc2.stop(audioCtx.currentTime + 2.1);
        } catch (e) {
          console.warn("Could not play tones:", e);
        }
      },
    });

    // Step 2: Ask which tone was louder
    timeline.push({
      type: jsPsychHtmlButtonResponse,
      stimulus: `
        <div class="sample-card" style="border-color:#f0ad4e;">
          <div class="sample-title">🔊 Attention Check</div>
          <p>Which tone was <strong>louder</strong>?</p>
        </div>
      `,
      choices: ["First tone", "Second tone"],
      data: { phase: "tone_check" },
      on_finish: function (data) {
        const choiceIndex = data.response;
        data.tone_response = choiceIndex === 0 ? "first" : "second";
        data.tone_correct_answer = window._toneCheckAnswer;
        data.tone_correct = data.tone_response === window._toneCheckAnswer;
      },
    });
  }
});

// ============================================================
// 5. POST-STUDY QUESTIONNAIRE (skipped in debug mode)
// ============================================================

if (!DEBUG_MODE) {

timeline.push({
  type: jsPsychSurveyLikert,
  preamble: "<h2>📝 Post-Listening Questions</h2><h3>💭 Reflections</h3>",
  questions: [
    {
      prompt: "The music samples were varied enough.",
      name: "samples_varied",
      labels: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
      required: true,
    },
    {
      prompt: "I found it easy to rate the music samples.",
      name: "easy_to_rate",
      labels: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
      required: true,
    },
    {
      prompt: "I enjoyed the listening experience overall.",
      name: "enjoyed_listening",
      labels: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
      required: true,
    },
    {
      prompt: "My ratings accurately reflect my musical taste.",
      name: "ratings_reflect_taste",
      labels: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
      required: true,
    },
  ],
  button_label: "Next",
  data: { phase: "poststudy", page: 1 },
});

timeline.push({
  type: jsPsychSurveyMultiChoice,
  preamble: "<h2>📝 Post-Listening Questions</h2>",
  questions: [
    {
      prompt: "How many of the samples sounded familiar to you?",
      name: "familiar_samples",
      options: ["None", "A few", "About half", "Most", "All"],
      required: true,
    },
  ],
  button_label: "Next",
  data: { phase: "poststudy", page: 2 },
});

timeline.push({
  type: jsPsychSurveyText,
  preamble: "<h2>📝 Post-Listening Questions</h2>",
  questions: [
    {
      prompt: "Any additional comments about the music samples or your experience?",
      name: "additional_comments",
      placeholder: "Optional — share any thoughts here.",
      rows: 4,
      required: false,
    },
  ],
  button_label: "Submit",
  data: { phase: "poststudy", page: 3 },
});

} // end if (!DEBUG_MODE)

// ============================================================
// 6. COMPLETION SCREEN
// ============================================================

// Save data before the feedback screen
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: function () {
    const ratingTrials = jsPsych.data
      .get()
      .filter({ phase: "rating" })
      .values();
    let ratingSummary = "";
    ratingTrials.forEach((trial) => {
      ratingSummary += `<p><strong>${trial.sample_title}</strong>: ${trial.rating || "N/A"}/7</p>`;
    });

    const nextDayMsg = CURRENT_DAY < 6
      ? `<p style="font-size:18px;">Please return tomorrow for Day ${CURRENT_DAY + 1}.</p>`
      : `<p style="font-size:18px;">Please return tomorrow for your final comparison session (Day 7).</p>`;

    return `
      <div class="completion-screen">
        <h2>✅ Day ${CURRENT_DAY} Complete!</h2>
        ${nextDayMsg}
        <details style="margin-top:1.5rem; text-align:left; max-width:400px; margin-left:auto; margin-right:auto;">
          <summary style="cursor:pointer; font-weight:bold;">View your ratings</summary>
          <div style="padding:1rem; background:#f0f0f0; border-radius:8px; margin-top:0.5rem;">
            ${ratingSummary}
          </div>
        </details>
      </div>
    `;
  },
  choices: ["Continue"],
});

timeline.push({
  type: jsPsychSurveyText,
  preamble: `<h2>💬 Feedback</h2>`,
  questions: [
    {
      prompt: "Any feedback or comments about today's session? (Optional)",
      name: "daily_feedback",
      placeholder: "Share any thoughts, issues, or suggestions...",
      rows: 4,
      required: false,
    },
  ],
  button_label: "Finish & Return Home",
  data: { phase: "daily_feedback", day: CURRENT_DAY },
  on_finish: async function(data) {
    // Save all experiment data and feedback, then redirect
    await saveDataToFirebase(data.response ? data.response.daily_feedback : null);
    var debugParam = DEBUG_MODE ? "?debug=true" : "";
    window.location.href = "/" + debugParam;
  },
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

window._currentRating = null;
window._currentListenAgain = null;

function checkBothRatings() {
  if (window._currentRating && window._currentListenAgain) {
    const submitBtn = document.querySelector(
      ".jspsych-html-button-response-button button"
    );
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = "1";
    }
  }
}

function selectRating(value) {
  if (!window._ratingUnlocked) return;

  window._currentRating = value;

  document.querySelectorAll("#likert-container .likert-btn").forEach((btn) => {
    btn.classList.remove("selected");
    if (parseInt(btn.getAttribute("data-value")) === value) {
      btn.classList.add("selected");
    }
  });

  const labels = [
    "",
    "Strongly dislike",
    "Dislike",
    "Slightly dislike",
    "Neutral",
    "Slightly like",
    "Like",
    "Strongly like",
  ];
  const display = document.getElementById("rating-display");
  if (display) {
    display.textContent = `Your rating: ${value} — ${labels[value]}`;
  }

  checkBothRatings();
}

function selectListenAgain(value) {
  if (!window._ratingUnlocked) return;

  window._currentListenAgain = value;

  document.querySelectorAll("#listen-again-container .likert-btn").forEach((btn) => {
    btn.classList.remove("selected");
    if (parseInt(btn.getAttribute("data-value")) === value) {
      btn.classList.add("selected");
    }
  });

  const labels = [
    "",
    "Definitely not",
    "Very unlikely",
    "Unlikely",
    "Neutral",
    "Likely",
    "Very likely",
    "Definitely",
  ];
  const display = document.getElementById("listen-again-display");
  if (display) {
    display.textContent = `Your rating: ${value} — ${labels[value]}`;
  }

  checkBothRatings();
}

// --- Save data to Firebase ---
async function saveDataToFirebase(feedbackText) {
  const allData = jsPsych.data.get().values();

  const ratings = {};
  allData
    .filter((d) => d.phase === "rating")
    .forEach((trial) => {
      ratings[trial.sample_id] = trial.rating;
    });

  const listenAgain = {};
  allData
    .filter((d) => d.phase === "rating")
    .forEach((trial) => {
      listenAgain[trial.sample_id] = trial.listen_again;
    });

  const attentionCheck = allData
    .filter((d) => d.phase === "attention_check")
    .map((trial) => ({
      word: trial.attention_word,
      response: trial.response ? trial.response.attention_response : null,
      correct: trial.attention_correct,
    }))[0] || null;

  const toneCheck = allData
    .filter((d) => d.phase === "tone_check")
    .map((trial) => ({
      response: trial.tone_response,
      correct_answer: trial.tone_correct_answer,
      correct: trial.tone_correct,
    }))[0] || null;

  const poststudy = {};
  allData
    .filter((d) => d.phase === "poststudy")
    .forEach((trial) => {
      if (trial.response) {
        Object.assign(poststudy, trial.response);
      }
    });

  // Use participant ID as document ID, with day suffix
  const sessionId = PARTICIPANT_ID
    || new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
  const docId = sessionId + "_day" + CURRENT_DAY;

  const results = {
    timestamp: new Date().toISOString(),
    participant: participantInfo,
    day: CURRENT_DAY,
    ratings: ratings,
    listen_again: listenAgain,
    attention_check: attentionCheck,
    tone_check: toneCheck,
    poststudy: poststudy,
    feedback: feedbackText || null,
    raw_data: allData,
  };

  try {
    await db.collection("music_rating_responses").doc(docId).set(results);
    console.log("Data saved to Firebase successfully.");

    // Advance participant to next day
    if (PARTICIPANT_ID) {
      var nextDay = CURRENT_DAY + 1;
      await db.collection("participants").doc(PARTICIPANT_ID).update({
        current_day: nextDay,
        last_completed_at: new Date().toISOString(),
        days_completed: firebase.firestore.FieldValue.arrayUnion({
          day: CURRENT_DAY,
          task: "listening",
          completed_at: new Date().toISOString(),
        }),
      });
      console.log("Participant advanced to day:", nextDay);
    }

    if (DEBUG_MODE) {
      const banner = document.createElement("div");
      banner.style.cssText = "position:fixed;top:0;left:0;right:0;padding:16px;background:#28a745;color:white;text-align:center;font-size:18px;z-index:99999;font-weight:bold;";
      banner.textContent = "✅ DEBUG: Data saved! Doc: " + docId + " | Next day: " + (CURRENT_DAY + 1);
      document.body.prepend(banner);
    }
  } catch (error) {
    console.error("Error saving to Firebase:", error);
    if (DEBUG_MODE) {
      const banner = document.createElement("div");
      banner.style.cssText = "position:fixed;top:0;left:0;right:0;padding:16px;background:#dc3545;color:white;text-align:center;font-size:18px;z-index:99999;font-weight:bold;";
      banner.textContent = "❌ DEBUG: Firebase save FAILED — " + error.message;
      document.body.prepend(banner);
    }
  }
}

// ============================================================
// RUN EXPERIMENT
// ============================================================
jsPsych.run(timeline);

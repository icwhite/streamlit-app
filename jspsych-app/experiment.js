/* ============================================================
   Music Rating Study — jsPsych 7.x Experiment
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

// --- URL Parameters (Prolific integration) ---
const urlParams = new URLSearchParams(window.location.search);
const participantInfo = {
  prolific_pid: urlParams.get("PROLIFIC_PID") || null,
  study_id: urlParams.get("STUDY_ID") || null,
  session_id: urlParams.get("SESSION_ID") || null,
  all_url_params: Object.fromEntries(urlParams.entries()),
};

// --- Audio Base URL ---
// Option A: Local/relative path (when audio is hosted alongside the app)
const AUDIO_BASE_URL = "../samples/ai_music/";

// Option B: Firebase Storage public URL (uncomment and replace with your bucket URL)
// const AUDIO_BASE_URL = "https://firebasestorage.googleapis.com/v0/b/YOUR_PROJECT.appspot.com/o/samples%2Fai_music%2F";
// Note: For Firebase Storage, append "?alt=media" to each file URL (handled below)

// Option C: Any public CDN or cloud storage bucket
// const AUDIO_BASE_URL = "https://storage.googleapis.com/YOUR_BUCKET/samples/ai_music/";

// Set to true if using Firebase Storage (appends ?alt=media token)
const USE_FIREBASE_STORAGE = false;

// --- Music Samples ---
const MUSIC_FILES = [
  { id: "sample_1", title: "Sample 1", filename: "Cello Waltz.mp3" },
  { id: "sample_2", title: "Sample 2", filename: "Clockwork Carousel.mp3" },
  { id: "sample_3", title: "Sample 3", filename: "Far Meadow Calling.mp3" },
  { id: "sample_4", title: "Sample 4", filename: "Hungarian Dance Five.mp3" },
  { id: "sample_5", title: "Sample 5", filename: "Moonlit Vow.mp3" },
  { id: "sample_6", title: "Sample 6", filename: "Puszta Fire.mp3" },
];

// Build full URLs
const MUSIC_SAMPLES = MUSIC_FILES.map((s) => {
  let file;
  if (USE_FIREBASE_STORAGE) {
    // Firebase Storage requires URL-encoded path + ?alt=media
    file = AUDIO_BASE_URL + encodeURIComponent(s.filename) + "?alt=media";
  } else {
    file = AUDIO_BASE_URL + s.filename;
  }
  return { ...s, file };
});

// --- Initialize jsPsych ---
const jsPsych = initJsPsych({
  display_element: "jspsych-target",
  on_finish: function () {
    saveDataToFirebase();
  },
});

// --- Timeline ---
const timeline = [];

// ============================================================
// 1. PRELOAD AUDIO
// ============================================================
timeline.push({
  type: jsPsychPreload,
  audio: MUSIC_SAMPLES.map((s) => s.file),
  show_progress_bar: true,
  message: "<p style='font-size:18px;'>Loading audio files... Please wait.</p>",
});

// ============================================================
// 2. WELCOME / INSTRUCTIONS
// ============================================================
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class="study-header">
      <h1>🎵 Music Rating Study</h1>
    </div>
    <div class="instructions-box">
      <h3>Instructions</h3>
      <p>You will listen to a series of short music samples and rate each one on a scale from <strong>1 to 6</strong>.</p>
      <ul>
        <li><strong>1</strong> = Strongly dislike</li>
        <li><strong>2</strong> = Dislike</li>
        <li><strong>3</strong> = Slightly dislike</li>
        <li><strong>4</strong> = Slightly like</li>
        <li><strong>5</strong> = Like</li>
        <li><strong>6</strong> = Strongly like</li>
      </ul>
      <p>Please listen to each sample fully before rating. Use headphones if possible for the best experience.</p>
      <p>First, please answer a few background questions.</p>
    </div>
  `,
  choices: ["Begin Study"],
});

// ============================================================
// 3. PRE-STUDY QUESTIONNAIRE
// ============================================================

// Page 1: Music background
timeline.push({
  type: jsPsychSurveyMultiChoice,
  preamble: "<h2>🧠 Background Questions</h2><p>Please answer <strong>all questions</strong> before continuing.</p><h3>🎧 Music Background</h3>",
  questions: [
    {
      prompt: "How often do you listen to music?",
      name: "music_listening_frequency",
      options: [
        "Multiple times a day",
        "Daily",
        "A few times a week",
        "Weekly",
        "Rarely",
        "Never",
      ],
      required: true,
    },
    {
      prompt: "Do you have any formal musical training?",
      name: "musical_training",
      options: [
        "None",
        "Some lessons as a child",
        "Several years of training",
        "Professional/degree-level",
      ],
      required: true,
    },
  ],
  button_label: "Next",
  data: { phase: "prestudy", page: 1 },
});

// Page 2: Genre preferences (multi-select)
timeline.push({
  type: jsPsychSurveyMultiSelect,
  preamble: "<h2>🧠 Background Questions</h2><h3>🎧 Genre Preferences</h3>",
  questions: [
    {
      prompt: "What genres of music do you typically enjoy? (Select all that apply)",
      name: "preferred_genres",
      options: [
        "Pop",
        "Rock",
        "Hip-Hop/Rap",
        "R&B/Soul",
        "Electronic/Dance",
        "Classical",
        "Jazz",
        "Country",
        "Folk/Indie",
        "Metal",
        "Latin",
        "World Music",
        "Other",
      ],
      required: true,
    },
  ],
  button_label: "Next",
  data: { phase: "prestudy", page: 2 },
});

// Page 3: Attitudes & headphones
timeline.push({
  type: jsPsychSurveyLikert,
  preamble: "<h2>🧠 Background Questions</h2><h3>🎧 Your Attitudes</h3>",
  questions: [
    {
      prompt: "I am open to listening to new or unfamiliar music.",
      name: "open_to_new_music",
      labels: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
      required: true,
    },
    {
      prompt: "Music strongly affects my mood.",
      name: "music_affects_mood",
      labels: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
      required: true,
    },
  ],
  button_label: "Next",
  data: { phase: "prestudy", page: 3 },
});

timeline.push({
  type: jsPsychSurveyMultiChoice,
  preamble: "<h2>🧠 Background Questions</h2>",
  questions: [
    {
      prompt: "Are you using headphones right now?",
      name: "headphones",
      options: ["Yes", "No"],
      required: true,
    },
  ],
  button_label: "Start Listening",
  data: { phase: "prestudy", page: 4 },
});

// ============================================================
// 4. MUSIC RATING TRIALS
// ============================================================

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
          <div class="scale-labels">
            <span>Strongly dislike</span>
            <span>Strongly like</span>
          </div>
          <div class="likert-scale-container" id="likert-container">
            <button class="likert-btn" data-value="1" onclick="selectRating(1)" disabled>1</button>
            <button class="likert-btn" data-value="2" onclick="selectRating(2)" disabled>2</button>
            <button class="likert-btn" data-value="3" onclick="selectRating(3)" disabled>3</button>
            <button class="likert-btn" data-value="4" onclick="selectRating(4)" disabled>4</button>
            <button class="likert-btn" data-value="5" onclick="selectRating(5)" disabled>5</button>
            <button class="likert-btn" data-value="6" onclick="selectRating(6)" disabled>6</button>
          </div>
          <p id="rating-display" class="rating-label" style="text-align:center;"></p>
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
      // Disable submit button until a rating is selected
      const submitBtn = document.querySelector(
        ".jspsych-html-button-response-button"
      );
      if (submitBtn) {
        submitBtn.querySelector("button").disabled = true;
        submitBtn.querySelector("button").style.opacity = "0.5";
      }

      // --- 30-second minimum listening enforcement ---
      const REQUIRED_LISTEN_SECONDS = 30;
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
        if (listenInterval) {
          clearInterval(listenInterval);
          listenInterval = null;
        }
      }

      if (audioEl) {
        // Auto-play the audio (fallback in case autoplay attribute is blocked)
        audioEl.play().catch(function () {
          // If autoplay is blocked, show a message
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
      data.listening_duration_seconds = window._listenedSeconds || 0;
      data.audio_completed = window._audioCompleted || false;
      window._currentRating = null;
      window._listenedSeconds = 0;
      window._audioCompleted = false;
    },
  });
});

// ============================================================
// 5. POST-STUDY QUESTIONNAIRE
// ============================================================

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
      prompt:
        "Any additional comments about the music samples or your experience?",
      name: "additional_comments",
      placeholder: "Optional — share any thoughts here.",
      rows: 4,
      required: false,
    },
  ],
  button_label: "Submit",
  data: { phase: "poststudy", page: 3 },
});

// ============================================================
// 6. COMPLETION SCREEN
// ============================================================

timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: function () {
    // Build ratings summary
    const ratingTrials = jsPsych.data
      .get()
      .filter({ phase: "rating" })
      .values();
    let ratingSummary = "";
    ratingTrials.forEach((trial) => {
      ratingSummary += `<p><strong>${trial.sample_title}</strong>: ${trial.rating || "N/A"}/6</p>`;
    });

    return `
      <div class="completion-screen">
        <h2>✅ Thank you for completing the music rating study!</h2>
        <p style="font-size:18px;">Your responses have been recorded.</p>
        <details style="margin-top:1.5rem; text-align:left; max-width:400px; margin-left:auto; margin-right:auto;">
          <summary style="cursor:pointer; font-weight:bold;">View your ratings</summary>
          <div style="padding:1rem; background:#f0f0f0; border-radius:8px; margin-top:0.5rem;">
            ${ratingSummary}
          </div>
        </details>
      </div>
    `;
  },
  choices: ["Start Over"],
  on_finish: function () {
    // Restart the experiment
    jsPsych.data.reset();
    jsPsych.run(timeline);
  },
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// Rating selection handler for audio trials
window._currentRating = null;

function selectRating(value) {
  // Block rating if listening time not met
  if (!window._ratingUnlocked) return;

  window._currentRating = value;

  // Update button styles
  document.querySelectorAll(".likert-btn").forEach((btn) => {
    btn.classList.remove("selected");
    if (parseInt(btn.getAttribute("data-value")) === value) {
      btn.classList.add("selected");
    }
  });

  // Show rating text
  const labels = [
    "",
    "Strongly dislike",
    "Dislike",
    "Slightly dislike",
    "Slightly like",
    "Like",
    "Strongly like",
  ];
  const display = document.getElementById("rating-display");
  if (display) {
    display.textContent = `Your rating: ${value} — ${labels[value]}`;
  }

  // Enable submit button
  const submitBtn = document.querySelector(
    ".jspsych-html-button-response-button button"
  );
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.style.opacity = "1";
  }
}

// --- Save data to Firebase ---
function saveDataToFirebase() {
  const allData = jsPsych.data.get().values();

  // Extract prestudy responses
  const prestudy = {};
  allData
    .filter((d) => d.phase === "prestudy")
    .forEach((trial) => {
      if (trial.response) {
        Object.assign(prestudy, trial.response);
      }
    });

  // Extract ratings
  const ratings = {};
  allData
    .filter((d) => d.phase === "rating")
    .forEach((trial) => {
      ratings[trial.sample_id] = trial.rating;
    });

  // Extract poststudy responses
  const poststudy = {};
  allData
    .filter((d) => d.phase === "poststudy")
    .forEach((trial) => {
      if (trial.response) {
        Object.assign(poststudy, trial.response);
      }
    });

  const sessionId = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 15);

  const results = {
    timestamp: new Date().toISOString(),
    prestudy: prestudy,
    ratings: ratings,
    poststudy: poststudy,
    raw_data: allData,
  };

  // Save to Firebase
  db.collection("music_rating_responses")
    .doc(sessionId)
    .set(results)
    .then(() => {
      console.log("Data saved to Firebase successfully.");
    })
    .catch((error) => {
      console.error("Error saving to Firebase:", error);
    });

  // Also log to console for debugging
  console.log("Experiment data:", JSON.stringify(results, null, 2));
}

// ============================================================
// RUN EXPERIMENT
// ============================================================
jsPsych.run(timeline);

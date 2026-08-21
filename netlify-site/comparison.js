/* ============================================================
   Music Comparison Study — jsPsych 7.x AI vs Human Pairwise
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

// --- URL Parameters ---
const urlParams = new URLSearchParams(window.location.search);
const STUDY_MODE = urlParams.get("mode") || "pretest"; // "pretest" (Day 1) or "posttest" (Day 7)
const PARTICIPANT_ID = urlParams.get("pid") || urlParams.get("PROLIFIC_PID") || null;
const participantInfo = {
  participant_id: PARTICIPANT_ID,
  prolific_pid: urlParams.get("PROLIFIC_PID") || null,
  study_id: urlParams.get("STUDY_ID") || null,
  session_id: urlParams.get("SESSION_ID") || null,
  mode: STUDY_MODE,
  all_url_params: Object.fromEntries(urlParams.entries()),
};

// --- Debug Mode ---
const DEBUG_MODE = urlParams.get("debug") === "true";
if (DEBUG_MODE) {
  console.log("%c[DEBUG MODE ACTIVE]", "color: orange; font-size: 16px; font-weight: bold;");
  console.log("Participant info:", participantInfo);
}

// --- Audio Base URL ---
const AUDIO_BASE_URL = "audio/";

// --- Matching AI vs Human pairs (numbers present in both sets) ---
const PAIR_NUMBERS = ["001", "002", "003", "004", "005", "006", "007", "008", "009", "012", "013", "014", "015", "016", "017", "018"];

const COMPARISON_PAIRS = PAIR_NUMBERS.map((num) => ({
  num: num,
  ai: { id: "ai_" + num, file: AUDIO_BASE_URL + "ai_" + num + ".mp3" },
  human: { id: "human_" + num, file: AUDIO_BASE_URL + "human_" + num + ".mp3" },
}));

// Shuffle array (Fisher-Yates)
function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Shuffle pair order AND randomize left/right placement per pair
var shuffledPairs = shuffleArray(COMPARISON_PAIRS).map(function(pair) {
  var aiOnLeft = Math.random() < 0.5;
  return {
    num: pair.num,
    left: aiOnLeft ? pair.ai : pair.human,
    right: aiOnLeft ? pair.human : pair.ai,
    left_type: aiOnLeft ? "ai" : "human",
    right_type: aiOnLeft ? "human" : "ai",
  };
});

// In debug mode, only show 2 pairs for quick testing
if (DEBUG_MODE) {
  shuffledPairs = shuffledPairs.slice(0, 2);
}

var TOTAL_PAIRS = shuffledPairs.length;

// --- Minimum listen time ---
var REQUIRED_LISTEN_SECONDS = DEBUG_MODE ? 2 : 15;

// --- Initialize jsPsych ---
var jsPsych = initJsPsych({
  display_element: "jspsych-target",
});

// --- Global state for comparison ratings ---
var currentComparisonRating = null;

function selectComparison(value) {
  currentComparisonRating = value;
  document.querySelectorAll(".likert-btn").forEach(function(btn) {
    btn.classList.remove("selected");
    if (parseInt(btn.getAttribute("data-value")) === value) {
      btn.classList.add("selected");
    }
  });

  var labels = [
    "Strongly prefer Song A",
    "Prefer Song A",
    "Slightly prefer Song A",
    "No preference",
    "Slightly prefer Song B",
    "Prefer Song B",
    "Strongly prefer Song B",
  ];
  var display = document.getElementById("comparison-display");
  if (display) display.textContent = labels[value - 1];

  // Enable submit button only if both songs have been listened to enough
  tryEnableSubmit();
}

function tryEnableSubmit() {
  var submitBtn = document.querySelector(".jspsych-html-button-response-button button");
  if (!submitBtn) return;
  if (currentComparisonRating && window._leftListenedEnough && window._rightListenedEnough) {
    submitBtn.disabled = false;
    submitBtn.style.opacity = "1";
  }
}

// --- Timeline ---
var timeline = [];

// ============================================================
// 1. PRELOAD ONLY FIRST PAIR (rest loaded lazily)
// ============================================================
var firstPairFiles = [shuffledPairs[0].left.file, shuffledPairs[0].right.file];
if (shuffledPairs.length > 1) {
  firstPairFiles.push(shuffledPairs[1].left.file, shuffledPairs[1].right.file);
}
timeline.push({
  type: jsPsychPreload,
  audio: firstPairFiles,
  show_progress_bar: true,
  message: "<p style='font-size:18px;'>Loading audio... Please wait.</p>",
});

// ============================================================
// 2. WELCOME / INSTRUCTIONS (mode-aware)
// ============================================================

if (STUDY_MODE === "pretest") {
  // --- DAY 1: Welcome + Demographics ---
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus:
      '<div class="study-header">' +
      '<h1>🎵 Music Comparison Study</h1>' +
      '<p style="color:#666;">Day 1 — Pre-Test</p>' +
      '</div>' +
      '<div class="instructions-box">' +
      '<h3>Instructions</h3>' +
      '<p>You will hear <strong>pairs of music samples</strong>. For each pair, please listen to both songs and then indicate your preference on a 7-point scale.</p>' +
      '<ul>' +
      '<li><strong>1</strong> = Strongly prefer <span style="color:#e67e22;font-weight:bold;">Song A</span></li>' +
      '<li><strong>4</strong> = No preference (neutral)</li>' +
      '<li><strong>7</strong> = Strongly prefer <span style="color:#27ae60;font-weight:bold;">Song B</span></li>' +
      '</ul>' +
      '<p>There are <strong>' + TOTAL_PAIRS + ' pairs</strong> in total. You must listen to <strong>at least ' + REQUIRED_LISTEN_SECONDS + ' seconds</strong> of each song before making your choice.</p>' +
      '<p>Use headphones if possible for the best experience.</p>' +
      '<p>First, please answer a few background questions.</p>' +
      '</div>',
    choices: ["Continue"],
  });

  // --- Demographics ---
  timeline.push({
    type: jsPsychSurveyMultiChoice,
    preamble: "<h2>🧠 Background Questions</h2><p>Please answer <strong>all questions</strong> before continuing.</p><h3>🎧 Music Background</h3>",
    questions: [
      {
        prompt: "How often do you listen to music?",
        name: "music_listening_frequency",
        options: ["Multiple times a day", "Daily", "A few times a week", "Weekly", "Rarely", "Never"],
        required: true,
      },
      {
        prompt: "Do you have any formal musical training?",
        name: "musical_training",
        options: ["None", "Some lessons as a child", "Several years of training", "Professional/degree-level"],
        required: true,
      },
    ],
    button_label: "Next",
    data: { phase: "prestudy", page: 1 },
  });

  timeline.push({
    type: jsPsychSurveyMultiSelect,
    preamble: "<h2>🧠 Background Questions</h2><h3>🎧 Genre Preferences</h3>",
    questions: [
      {
        prompt: "What genres of music do you typically enjoy? (Select all that apply)",
        name: "preferred_genres",
        options: ["Pop", "Rock", "Hip-Hop/Rap", "R&B/Soul", "Electronic/Dance", "Classical", "Jazz", "Country", "Folk/Indie", "Metal", "Latin", "World Music", "Other"],
        required: true,
      },
    ],
    button_label: "Next",
    data: { phase: "prestudy", page: 2 },
  });

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
    button_label: "Begin Comparisons",
    data: { phase: "prestudy", page: 4 },
  });

} else {
  // --- DAY 7: Welcome (no reflection questions yet — those come after comparisons) ---
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus:
      '<div class="study-header">' +
      '<h1>🎵 Music Comparison Study</h1>' +
      '<p style="color:#666;">Day 7 — Final Comparison</p>' +
      '</div>' +
      '<div class="instructions-box">' +
      '<h3>Welcome Back</h3>' +
      '<p>Thank you for completing the listening sessions over the past week.</p>' +
      '<p>Today you will compare <strong>pairs of music samples</strong> one final time, just like on Day 1.</p>' +
      '<p>There are <strong>' + TOTAL_PAIRS + ' pairs</strong> in total. You must listen to <strong>at least ' + REQUIRED_LISTEN_SECONDS + ' seconds</strong> of each song before making your choice.</p>' +
      '</div>',
    choices: ["Begin Final Comparisons"],
  });
}

// ============================================================
// 3. PAIRWISE COMPARISON TRIALS (AI vs Human)
// ============================================================

shuffledPairs.forEach(function(pair, index) {
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: function () {
      var progress = ((index + 1) / TOTAL_PAIRS) * 100;
      return '\
        <div class="comparison-card">\
          <div class="progress-bar">\
            <div class="progress-fill" style="width: ' + progress + '%"></div>\
          </div>\
          <p style="text-align:center; color:#666; margin-bottom:1rem;">\
            Pair ' + (index + 1) + ' of ' + TOTAL_PAIRS + '\
          </p>\
          <div class="audio-pair">\
            <div class="audio-side left">\
              <h3>⬅️ Song A</h3>\
              <audio id="audio-left" controls controlsList="nodownload">\
                <source src="' + pair.left.file + '" type="audio/mpeg">\
              </audio>\
              <p id="left-timer" class="listen-timer-msg waiting">\
                ⏳ Listen for at least ' + REQUIRED_LISTEN_SECONDS + 's\
              </p>\
            </div>\
            <div class="vs-divider">VS</div>\
            <div class="audio-side right">\
              <h3>Song B ➡️</h3>\
              <audio id="audio-right" controls controlsList="nodownload">\
                <source src="' + pair.right.file + '" type="audio/mpeg">\
              </audio>\
              <p id="right-timer" class="listen-timer-msg waiting">\
                ⏳ Listen for at least ' + REQUIRED_LISTEN_SECONDS + 's\
              </p>\
            </div>\
          </div>\
          <p style="font-weight:600; text-align:center; margin-top:1.5rem;">Which song do you prefer?</p>\
          <div class="scale-endpoints">\
            <span class="left-label">← Prefer Song A</span>\
            <span class="right-label">Prefer Song B →</span>\
          </div>\
          <div class="likert-scale-container">\
            <div class="likert-item"><button class="likert-btn" data-value="1" onclick="selectComparison(1)">1</button><span class="likert-label">Strongly prefer A</span></div>\
            <div class="likert-item"><button class="likert-btn" data-value="2" onclick="selectComparison(2)">2</button><span class="likert-label">Prefer A</span></div>\
            <div class="likert-item"><button class="likert-btn" data-value="3" onclick="selectComparison(3)">3</button><span class="likert-label">Slightly prefer A</span></div>\
            <div class="likert-item"><button class="likert-btn" data-value="4" onclick="selectComparison(4)">4</button><span class="likert-label">No preference</span></div>\
            <div class="likert-item"><button class="likert-btn" data-value="5" onclick="selectComparison(5)">5</button><span class="likert-label">Slightly prefer B</span></div>\
            <div class="likert-item"><button class="likert-btn" data-value="6" onclick="selectComparison(6)">6</button><span class="likert-label">Prefer B</span></div>\
            <div class="likert-item"><button class="likert-btn" data-value="7" onclick="selectComparison(7)">7</button><span class="likert-label">Strongly prefer B</span></div>\
          </div>\
          <p id="comparison-display" class="rating-label"></p>\
        </div>\
      ';
    },
    choices: ["Submit"],
    data: {
      phase: "comparison",
      pair_index: index,
      pair_num: pair.num,
      left_id: pair.left.id,
      left_type: pair.left_type,
      right_id: pair.right.id,
      right_type: pair.right_type,
    },
    on_load: function () {
      currentComparisonRating = null;
      window._leftListenedEnough = false;
      window._rightListenedEnough = false;
      window._leftListenSeconds = 0;
      window._rightListenSeconds = 0;

      // Disable submit button until rating selected AND both listened enough
      var submitBtn = document.querySelector(".jspsych-html-button-response-button button");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.5";
      }

      // Setup listening trackers for both audio elements
      setupAudioTracker("audio-left", "left-timer", "left");
      setupAudioTracker("audio-right", "right-timer", "right");

      // Preload next pair in background
      var nextIdx = index + 1;
      if (nextIdx < shuffledPairs.length) {
        var nextPair = shuffledPairs[nextIdx];
        var a1 = new Audio(); a1.src = nextPair.left.file;
        var a2 = new Audio(); a2.src = nextPair.right.file;
      }
    },
    on_finish: function (data) {
      data.preference_rating = currentComparisonRating;
      data.left_listen_seconds = window._leftListenSeconds;
      data.right_listen_seconds = window._rightListenSeconds;
    },
  });
});

// --- Audio listening tracker ---
function setupAudioTracker(audioId, timerId, side) {
  var audioEl = document.getElementById(audioId);
  var timerEl = document.getElementById(timerId);
  if (!audioEl || !timerEl) return;

  var listenedSeconds = 0;
  var interval = null;
  var reachedMinimum = false;

  function updateDisplay() {
    var remaining = REQUIRED_LISTEN_SECONDS - listenedSeconds;
    if (remaining > 0) {
      timerEl.textContent = "⏳ Listen for " + remaining + " more second" + (remaining !== 1 ? "s" : "");
      timerEl.className = "listen-timer-msg waiting";
    } else if (!reachedMinimum) {
      reachedMinimum = true;
      timerEl.textContent = "✅ Minimum reached";
      timerEl.className = "listen-timer-msg ready";
      if (side === "left") {
        window._leftListenedEnough = true;
      } else {
        window._rightListenedEnough = true;
      }
      tryEnableSubmit();
    }
    // Always update the listen seconds
    if (side === "left") {
      window._leftListenSeconds = listenedSeconds;
    } else {
      window._rightListenSeconds = listenedSeconds;
    }
  }

  function startCounting() {
    if (!interval) {
      interval = setInterval(function () {
        listenedSeconds++;
        updateDisplay();
      }, 1000);
    }
  }

  function stopCounting() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  audioEl.addEventListener("play", startCounting);
  audioEl.addEventListener("pause", stopCounting);
  audioEl.addEventListener("ended", function () {
    stopCounting();
    // Mark as enough even if under threshold (they listened to the whole thing)
    if (side === "left") {
      window._leftListenedEnough = true;
      window._leftListenSeconds = listenedSeconds;
    } else {
      window._rightListenedEnough = true;
      window._rightListenSeconds = listenedSeconds;
    }
    timerEl.textContent = "✅ Minimum reached";
    timerEl.className = "listen-timer-msg ready";
    tryEnableSubmit();
  });

  // Prevent seeking forward
  var lastAllowedTime = 0;
  audioEl.addEventListener("timeupdate", function () {
    if (!audioEl.seeking) {
      lastAllowedTime = audioEl.currentTime;
    }
  });
  audioEl.addEventListener("seeking", function () {
    var delta = audioEl.currentTime - lastAllowedTime;
    if (delta > 0.5) {
      audioEl.currentTime = lastAllowedTime;
    }
  });
}

// ============================================================
// 4. FEEDBACK + COMPLETION
// ============================================================
var dayLabel = STUDY_MODE === "posttest" ? "Day 7" : "Day 1";

// ============================================================
// 4a. POST-TEST REFLECTION (Day 7 only, after comparisons)
// ============================================================
if (STUDY_MODE === "posttest") {
  timeline.push({
    type: jsPsychSurveyMultiChoice,
    preamble: "<h2>🔍 Reflection Questions</h2><p>Now that you have completed the comparisons, please answer a few reflection questions.</p>",
    questions: [
      {
        prompt: "During the study, did you suspect that any of the music you heard was generated by AI?",
        name: "suspected_ai",
        options: ["Yes, I was fairly certain some was AI-generated", "I had some suspicion but was not sure", "I did not think about it", "No, I did not suspect any AI-generated music"],
        required: true,
      },
      {
        prompt: "Overall, do you think you preferred the AI-generated music or the human-composed music more?",
        name: "perceived_preference",
        options: ["Strongly preferred the AI music", "Slightly preferred the AI music", "No difference / could not tell", "Slightly preferred the human music", "Strongly preferred the human music"],
        required: true,
      },
    ],
    button_label: "Next",
    data: { phase: "poststudy_reflection", page: 1 },
  });

  timeline.push({
    type: jsPsychSurveyText,
    preamble: "<h2>🔍 Reflection Questions</h2>",
    questions: [
      {
        prompt: "What differences, if any, did you notice between the music samples over the week?",
        name: "noticed_differences",
        placeholder: "Describe any differences you noticed...",
        rows: 4,
        required: false,
      },
      {
        prompt: "Any other thoughts about your experience in this study?",
        name: "additional_thoughts",
        placeholder: "Optional — share any thoughts here.",
        rows: 4,
        required: false,
      },
    ],
    button_label: "Next",
    data: { phase: "poststudy_reflection", page: 2 },
  });
}

// ============================================================
// 4b. FEEDBACK + COMPLETION
// ============================================================
timeline.push({
  type: jsPsychSurveyText,
  preamble: '<div class="completion-screen">' +
    '<h2>✅ ' + dayLabel + ' Complete!</h2>' +
    (STUDY_MODE === "posttest"
      ? '<p>You have completed the final comparison and the entire 7-day study. Thank you!</p>'
      : '<p>You have completed the pre-test comparisons. Please return tomorrow for Day 2.</p>') +
    '</div>',
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
  data: { phase: "daily_feedback", day: STUDY_MODE === "posttest" ? 7 : 1 },
  on_finish: async function() {
    await saveAllData();
    var debugParam = DEBUG_MODE ? "?debug=true" : "";
    window.location.href = "/" + debugParam;
  },
});

// ============================================================
// SAVE DATA TO FIREBASE
// ============================================================
async function saveAllData() {
  var allData = jsPsych.data.get().values();
  var comparisonData = jsPsych.data.get().filter({ phase: "comparison" }).values();

  // Collect survey responses (prestudy or poststudy_reflection depending on mode)
  var surveyData = {};
  var surveyPhase = STUDY_MODE === "pretest" ? "prestudy" : "poststudy_reflection";
  jsPsych.data.get().filter({ phase: surveyPhase }).values().forEach(function(trial) {
    if (trial.response) {
      Object.assign(surveyData, trial.response);
    }
  });

  // Collect daily feedback
  var feedbackData = {};
  jsPsych.data.get().filter({ phase: "daily_feedback" }).values().forEach(function(trial) {
    if (trial.response) {
      Object.assign(feedbackData, trial.response);
    }
  });

  var sessionId = PARTICIPANT_ID
    || new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);

  var dayNum = STUDY_MODE === "pretest" ? 1 : 7;
  var collectionName = STUDY_MODE === "pretest" ? "comparison_pretest" : "comparison_posttest";

  var payload = {
    participant: participantInfo,
    task: "ai_vs_human_comparison",
    mode: STUDY_MODE,
    day: dayNum,
    timestamp: new Date().toISOString(),
    survey: surveyData,
    feedback: feedbackData,
    comparisons: comparisonData.map(function(trial) {
      return {
        pair_index: trial.pair_index,
        pair_num: trial.pair_num,
        left_id: trial.left_id,
        left_type: trial.left_type,
        right_id: trial.right_id,
        right_type: trial.right_type,
        preference_rating: trial.preference_rating,
        left_listen_seconds: trial.left_listen_seconds,
        right_listen_seconds: trial.right_listen_seconds,
        rt: trial.rt,
      };
    }),
    total_pairs: TOTAL_PAIRS,
    all_trial_data: allData,
  };

  try {
    // Save comparison data
    await db.collection(collectionName).doc(sessionId).set(payload);
    console.log("Data saved to Firebase:", collectionName, sessionId);

    // Advance participant to next day
    if (PARTICIPANT_ID) {
      var nextDay = STUDY_MODE === "posttest" ? "completed" : 2;
      await db.collection("participants").doc(PARTICIPANT_ID).update({
        current_day: nextDay,
        last_completed_at: new Date().toISOString(),
        days_completed: firebase.firestore.FieldValue.arrayUnion({
          day: dayNum,
          task: STUDY_MODE,
          completed_at: new Date().toISOString(),
        }),
      });
      console.log("Participant advanced to day:", nextDay);
    }

    if (DEBUG_MODE) {
      var banner = document.createElement("div");
      banner.style.cssText = "position:fixed;bottom:0;left:0;right:0;padding:10px;background:#28a745;color:white;text-align:center;font-size:14px;z-index:99999;";
      banner.textContent = "✅ Data saved! Collection: " + collectionName + " | Doc: " + sessionId;
      document.body.appendChild(banner);
    }
  } catch (err) {
    console.error("Error saving data:", err);
    if (DEBUG_MODE) {
      var banner = document.createElement("div");
      banner.style.cssText = "position:fixed;bottom:0;left:0;right:0;padding:10px;background:#dc3545;color:white;text-align:center;font-size:14px;z-index:99999;";
      banner.textContent = "❌ Save failed: " + err.message;
      document.body.appendChild(banner);
    }
  }
}

// --- Run the experiment ---
jsPsych.run(timeline);

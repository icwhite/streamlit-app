import streamlit as st
from openai import OpenAI
import os
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase once
firebase_config = dict(st.secrets["FIREBASE"])
if not firebase_admin._apps:
    cred = credentials.Certificate(firebase_config)
    firebase_admin.initialize_app(cred)
    st.session_state.firebase_initialized = True

db = firestore.client()


# --- CONFIG ---
st.set_page_config(page_title="User Study", page_icon="💬", layout="centered")

# --- CSS ---
st.markdown("""
<style>
body, div, p, label, .stRadio, .stMarkdown {
    font-size: 18px !important;
    line-height: 1.6 !important;
}
.stTextInput > div > div > input, .stTextArea textarea {
    font-size: 18px !important;
}
.stButton button {
    font-size: 18px !important;
    padding: 0.6em 1.2em;
    border-radius: 10px;
}
.survey-box {
    max-height: 550px;
    overflow-y: auto;
    padding: 1rem;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    background-color: #fafafa;
}
.missing {
    color: red;
    font-weight: bold;
}
.stRadio > div {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    gap: 1.2rem !important;
    justify-content: space-between !important;
}
</style>
""", unsafe_allow_html=True)


# --- STATE ---
if "show_survey" not in st.session_state:
    st.session_state.show_survey = False
if "show_prestudy" not in st.session_state:
    st.session_state.show_prestudy = True
if "prestudy" not in st.session_state:
    st.session_state.prestudy = {}
if "poststudy" not in st.session_state:
    st.session_state.poststudy = {}
if "waiting_for_done" not in st.session_state:
    st.session_state.waiting_for_done = False

GOOGLE_DOC_URL = os.environ.get("GOOGLE_DOC")

# --- Helper for completeness ---
def unanswered_fields(data_dict):
    missing = []
    for k, v in data_dict.items():
        if v is None or v == "" or (isinstance(v, list) and len(v) == 0):
            missing.append(k)
    return missing


# --- HEADER ---
st.title("💬 User Study")
st.markdown("---")
st.markdown("### Instructions")
st.markdown("""
Write your essay in the Google Doc provided below.  
You are not allowed to use an LLM or AI assistant or the internet while writing this essay.
Return here once the essay is complete to answer a few questions.
""")

st.markdown(f"[📄 Open related Google Doc]({GOOGLE_DOC_URL})")


# ---------------------------------------------------------
#                     PRE-STUDY
# ---------------------------------------------------------
if st.session_state.show_prestudy:
    st.subheader("🧠 Pre-Study Questions")

    likert = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]

    # Required Pre-Study Questions
    st.session_state.prestudy["struggle_structure"] = st.radio(
        "I often struggle with structuring my ideas clearly.", likert, index=None, horizontal=True
    )

    st.session_state.prestudy["confident_writer"] = st.radio(
        "I feel confident in my ability to write and edit essays on my own.", likert, index=None, horizontal=True
    )

    st.session_state.prestudy["writing_time"] = st.radio(
        "I find essay writing time-consuming.", likert, index=None, horizontal=True
    )

    st.session_state.prestudy["writing_enjoyable"] = st.radio(
        "I usually find essay writing enjoyable.", likert, index=None, horizontal=True
    )

    st.session_state.prestudy["llm_use_frequency"] = st.radio(
        "I use LLMs to help me write:",
        ["Daily", "Weekly", "Monthly", "Checked it out a few times", "Never"],
        index=None,
        horizontal=True,
    )

    st.session_state.prestudy["llm_use_purpose"] = st.multiselect(
        "What do you use LLMs for?",
        [
            "I don’t use LLMs",
            "General conversation",
            "Search queries / seeking knowledge (e.g., health)",
            "Learning or understanding new concepts",
            "Advice",
            "Writing or editing text",
            "Work or productivity tasks",
            "Other (please specify)",
        ],
    )

    if "Other (please specify)" in st.session_state.prestudy["llm_use_purpose"]:
        st.session_state.prestudy["llm_use_purpose_other"] = st.text_input("Please specify:")

    st.session_state.prestudy["llm_last_experience"] = st.text_area(
        "Please describe the last time you used a large language model (LLM). "
        "What did you use it for, in what context, and how helpful was it?"
    )

    st.markdown("</div>", unsafe_allow_html=True)

    if st.button("Start Writing"):
        missing = unanswered_fields(st.session_state.prestudy)
        if missing:
            st.markdown('<p class="missing">⚠️ Please answer all questions before continuing.</p>',
                        unsafe_allow_html=True)
        else:
            st.session_state.show_prestudy = False
            st.session_state.waiting_for_done = True   # 👈 new step
            st.rerun()

# ---------------------------------------------------------
#         INTERSTITIAL: WAITING FOR "DONE" BUTTON
# ---------------------------------------------------------
if st.session_state.waiting_for_done and not st.session_state.show_prestudy:
    st.subheader("✍️ Writing Phase")

    st.markdown("""
    Please complete your essay in the external Google Doc.

    When you are finished writing, click **Done** below to proceed to the post-study questions.
    """)

    if st.button("Done"):
        st.session_state.waiting_for_done = False
        st.session_state.show_survey = True
        st.rerun()


# ---------------------------------------------------------
#                   POST-STUDY
# ---------------------------------------------------------
if st.session_state.show_survey and not st.session_state.show_prestudy and not st.session_state.waiting_for_done:
    st.subheader("📝 Post-Study Questions")
    st.markdown('<div class="survey-box">', unsafe_allow_html=True)

    likert = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]

    st.session_state.poststudy["satisfied_with_essay"] = st.radio(
        "I was satisfied with the essay.", likert, index=None, horizontal=True
    )

    st.session_state.poststudy["creativity_level"] = st.radio(
        "How creative do you feel you were in writing the essay?",
        ["Very creative", "Somewhat creative", "Neither creative nor uncreative",
         "Somewhat uncreative", "Not at all creative"],
        index=None,
    )

    st.session_state.poststudy["essay_in_my_voice"] = st.radio(
        "I felt the essay was written in my voice.", likert, index=None, horizontal=True
    )

    st.session_state.poststudy["difficult_to_organize"] = st.radio(
        "I found it difficult to organize my thoughts while writing.", likert, index=None, horizontal=True
    )

    st.session_state.poststudy["writing_struggle"] = st.radio(
        "Writing this essay was a struggle for me.", likert, index=None, horizontal=True
    )

    st.session_state.poststudy["essay_experience"] = st.text_area(
        "Please describe your experience writing this essay. "
        "Comment on how well it reflects your views and voice, the effort you put in, "
        "and whether you learned anything."
    )

    st.markdown("</div>", unsafe_allow_html=True)

    if st.button("Submit Feedback"):
        missing = unanswered_fields(st.session_state.poststudy)
        if missing:
            st.markdown('<p class="missing">⚠️ Please answer all questions before submitting.</p>',
                        unsafe_allow_html=True)
        else:
            # Save to Firestore
            session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
            db.collection("user_study_responses").document(session_id).set({
                "google_doc": GOOGLE_DOC_URL,
                "timestamp": datetime.now().isoformat(),
                "prestudy": st.session_state.prestudy,
                "poststudy": st.session_state.poststudy,
            })

            st.success("✅ Thank you for completing the study!")

            # Reset
            st.session_state.show_survey = False
            st.session_state.show_prestudy = True
            st.session_state.prestudy = {}
            st.session_state.poststudy = {}

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

query_params = st.query_params

participant_id = query_params.get("participantId", None)
assignment_id  = query_params.get("assignmentId", None)
project_id     = query_params.get("projectId", None)

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
if "show_consent" not in st.session_state:
    st.session_state.show_consent = True
if "show_prestudy" not in st.session_state:
    st.session_state.show_prestudy = False
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
First answer some pre-study questions about your writing habits and experiences.
Then write your essay in the text box provided.  
You are not allowed to use an LLM or AI assistant or the internet while writing this essay.
Return here once the essay is complete to answer a few questions.
            
Please be aware that we will review responses for indications of LLM or AI-generated content. Participants found to have used such tools will not receive compensation.
            
""")

if st.session_state.show_consent:
    st.title("📝 Consent Form")

    st.markdown("""
    Before participating in this study, please read the following consent information:

    **Introduction**  
    My name is Marwa Abdulhai. I am a PhD at the University of California, Berkeley, in the Electrical Engineering and Computer Science (EECS) Department. I am planning to conduct a research study, which I invite you to take part in.

    **Purpose**  
    The purpose of this study is to understand attitudes towards writing essays and analyze essay writing.
    
    **Procedures** 
    You will be asked to answer some pre-study questions about your attitudes toward AI and writing, before you begin the essay. Then, you will write the essay. You may not use other sources such as the internet to inform your essay.
    *Study time*: The estimated study completion time has been displayed to you in CloudResearch Connect interface (up to one hour).
    *Study location*: You will participate online, from the comfort of your current location.
    
    **Benefits** 
    There is no direct benefit to you (other than compensation) from participating in this study. We hope that the information gained from the study will help us better understand how people write essays.

    **Risks/Discomforts**  
    This study represents minimal risk to you. As with all research, there is the risk of an unintended breach of confidentiality. However, we are taking precautions to minimize this risk (see below).

    **Confidentiality**
    The data we collect will be stored on password-protected servers. Once the research is complete, we intend to scrub the data of all identifiable information. We will keep only the recorded survey responses, as well as a freshly generated identifier for each subject. The de-identified data will be retained indefinitely for possible use in future research done by ourselves or others. This cleaned dataset may be made public as part of the publishing process. No guarantees can be made regarding the interception of data sent via the Internet by any third parties.
    
    **Compensation**  
    We compensate workers based on the estimated duration of completing the study. The study will be prorated to $10/hour for the anticipated duration of completing the study, which is posted for your job on the CloudResearch interface you used to view the job (duration includes reviewing instructions, completing the task, and filling an exit survey). The payment is arranged by CloudResearch via credit to subjects’ accounts.

    **Rights**
    Participation in research is completely voluntary. You have the right to decline to participate or to withdraw at any point in this study without penalty or loss of benefits to which you are otherwise entitled.
    
    **Questions**
    If you have any questions or concerns about this study, or in case anything goes wrong with the online interface, you can contact Marwa Abdulhai at marwa_abdulhai@berkeley.edu. If you have any questions or concerns about your rights and treatment as a research subject, you may contact the office of UC Berkeley’s Committee for the Protection of Human Subjects, at 510-642-7461 or subjects@berkeley.edu.
    
    **IRB review**
    This study was approved by an IRB review under the CPHS protocol ID number 2022-07-15514.
    *You should save a copy of this consent form for your records*
    By clicking **I Agree**, you consent to participate.
    """)

    if st.button("I Agree"):
        st.session_state.show_consent = False
        st.session_state.show_prestudy = True
        st.rerun()

    st.stop()


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
    st.subheader("✍️ Part II: Write Your Essay")

    st.markdown("""
        **Essay Prompt**: Is technology making our lives better or worse?
                
        
        Please write a 300-500 word essay expressing your views on this topic. 
        Do not use an LLM or AI assistant to assist you in writing your essay. 
        If you do, we will be able to detect it and you will not be compensated for your time.
    """)

    st.subheader("✍️ Enter Your Writing Here")
    st.session_state.essay = st.text_area(
        "Enter your writing or text here:",
        height=600,
        key="essay_box",
        placeholder="Paste or type your essay here..."
    )

    if st.button("Done"):
        st.session_state.waiting_for_done = False
        st.session_state.show_survey = True
        st.rerun()


# ---------------------------------------------------------
#                   POST-STUDY
# ---------------------------------------------------------
if st.session_state.show_survey and not st.session_state.show_prestudy and not st.session_state.waiting_for_done:
    st.subheader("📝 Post-Study Questions")

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
                "essay_text": st.session_state.essay,
                "participant_id": st.session_state.participant_id,
                "assignment_id": st.session_state.assignment_id,
                "project_id": st.session_state.project_id,
            })

            st.success("✅ Thank you for completing the study!")

            st.markdown("""
            Go to the following link to complete your participation and receive compensation:
                        
            https://connect.cloudresearch.com/participant/project/497A4D2E07/complete
                        """)

            # Reset
            st.session_state.show_survey = False
            st.session_state.show_prestudy = True
            st.session_state.prestudy = {}
            st.session_state.poststudy = {}

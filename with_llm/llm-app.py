import streamlit as st
from openai import OpenAI
import os
import json
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore
import streamlit as st
from streamlit_js_eval import streamlit_js_eval

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

# ---- 2. Store in session state (only once) ----
if "participant_id" not in st.session_state and participant_id:
    st.session_state.participant_id = participant_id

if "assignment_id" not in st.session_state and assignment_id:
    st.session_state.assignment_id = assignment_id

if "project_id" not in st.session_state and project_id:
    st.session_state.project_id = project_id


# --- CONFIG ---
st.set_page_config(page_title="User Study", page_icon="💬", layout="wide")

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
/* --- Horizontal Likert fixes --- */
.stRadio > div {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;  /* ✅ prevent wrapping to next line */
    gap: 1.2rem !important;
    justify-content: space-between !important; /* evenly spaced options */
}
</style>
""", unsafe_allow_html=True)

GOOGLE_DOC_URL = os.environ.get("GOOGLE_DOC")

# --- STATE ---
if "messages" not in st.session_state:
    st.session_state.messages = []
if "show_consent" not in st.session_state:
    st.session_state.show_consent = True
if "show_survey" not in st.session_state:
    st.session_state.show_survey = False
if "show_prestudy" not in st.session_state:
    st.session_state.show_prestudy = False
if "prestudy" not in st.session_state:
    st.session_state.prestudy = {}
if "poststudy" not in st.session_state:
    st.session_state.poststudy = {}
if "essay_box" not in st.session_state:
    st.session_state.essay_box = ""
if "do_scroll_top" not in st.session_state:
    st.session_state.do_scroll_top = False

# --- HEADER ---
st.title("💬 User Study")
# st.markdown(f"[📄 Open related Google Doc]({GOOGLE_DOC_URL})")

st.markdown("---")
st.markdown("### Instructions")
st.markdown("""
You will be writing an essay, and may use the LLM chat to assist you in the writing process. 
Use no other LLM than the one provided in this interface and you may take as much time as you need. 
First you must answer some pre-study questions about your attitudes toward AI and writing, before you begin the essay. 
You may not use other sources such as the internet to inform your essay.
After the study you will be asked some post-study questions about your experience.
            
The purpose of this study is to understand how people use LLMs for writing in their normal workflow. 
If you don't usually use LLMs, think of like using the AI tool as a partner while you work on this essay. Think of it like having someone to bounce ideas off, ask questions, and get feedback from as you go.
""")

# --- Likert scale options ---
likert = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]

# --- Helper for completeness check ---
def unanswered_fields(data_dict):
    missing = []
    for k, v in data_dict.items():
        # Skip the "other_use_case" field unless "Other" was actually selected
        if k == "other_use_case":
            ai_use_cases = data_dict.get("ai_use_case", [])
            if "Other (please specify)" not in ai_use_cases:
                continue  # don't count it as missing
        if v is None or v == "" or (isinstance(v, list) and len(v) == 0):
            missing.append(k)
    return missing

def scroll_to_top():
    st.markdown(
        """
        <script>
            window.parent.scrollTo({top: 0, behavior: 'smooth'});
        </script>
        """,
        unsafe_allow_html=True,
    )

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def send_message():
    user_text = st.session_state["chat_input"]
    if not user_text.strip():
        return

    # Add user message
    st.session_state.messages.append({"role": "user", "content": user_text})

    # OpenAI call
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                *st.session_state.messages,
            ],
        )
        assistant_reply = response.choices[0].message.content
    except Exception as e:
        assistant_reply = f"⚠️ API Error: {e}"

    # Add assistant response
    st.session_state.messages.append({"role": "assistant", "content": assistant_reply})

    # Clear input field
    st.session_state.chat_input = ""

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
        streamlit_js_eval(js_expressions="window.scrollTo(0, 0)")
        st.session_state.show_consent = False
        st.session_state.show_prestudy = True
        st.session_state.do_scroll_top = True
        st.rerun()

    st.stop()

if st.session_state.do_scroll_top:
    streamlit_js_eval(js_expressions="window.scrollTo(0, 0)")
    st.session_state.do_scroll_top = False   # reset the flag


# --- PRE-STUDY ---
if st.session_state.show_prestudy:
    st.subheader("🧠 Part I: Pre-Study Questions")
    st.markdown("Please answer **all questions** before continuing.")
    with st.container():
        # st.markdown('<div class="survey-box">', unsafe_allow_html=True)

        # --- Section 1 ---
        st.markdown("#### 💭 Attitudes toward AI and Writing")
        st.session_state.prestudy["ai_improve_writing"] = st.radio(
            "I believe AI tools can improve my writing quality.", likert, index=None, horizontal=True
        )
        st.session_state.prestudy["ai_understand_style"] = st.radio(
            "I do not expect AI systems to understand my writing style.", likert, index=None, horizontal=True
        )
        st.session_state.prestudy["ai_trust_accuracy"] = st.radio(
            "I trust AI systems to provide accurate information.", likert, index=None, horizontal=True
        )
        st.session_state.prestudy["ai_academic_acceptability"] = st.radio(
            "I do not believe using AI for writing is acceptable in academic contexts.", likert, index=None, horizontal=True
        )

        st.write("For essay writing, I think AI tools should be used for:")

            # Define options
        ai_options = [
            "Not at all",
            "Check grammar, spelling, or clarity",
            "Offer suggestions on how to improve my writing",
            "Help brainstorm or outline ideas",
            "Rewrite my essay from scratch",
            "Write the entire essay",
            "Other (please specify)",
        ]

        # Store selections in session state
        if "ai_use_case" not in st.session_state:
            st.session_state.ai_use_case = []

        # Create checkboxes
        selected_ai_use = []
        for opt in ai_options:
            checked = st.checkbox(opt, key=f"ai_use_{opt}")
            if checked:
                selected_ai_use.append(opt)

        st.session_state.prestudy["ai_use_case"] = selected_ai_use

        # Show "Other" text input if selected
        if "Other (please specify)" in selected_ai_use:
            st.session_state.prestudy["other_use_case"] = st.text_input("Please specify:")
        else:
            st.session_state.prestudy["other_use_case"] = ""


        if st.session_state.prestudy.get("ai_use_case") == "Other (please specify)":
            st.session_state.prestudy["other_use_case"] = st.text_input("Please specify:")

        # --- Section 2 ---
        st.markdown("#### ✍️ Writing Habits and Confidence")
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

        # --- Section 3 ---
        st.markdown("#### 🤖 LLM Use")
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
                "Search queries / seeking knowledge (e.g., health info)",
                "Learning or understanding new concepts",
                "Advice",
                "Writing or editing text (e.g., essays, emails, reports)",
                "Work or productivity tasks",
                "Other (please specify)",
            ],
            default=[],
        )

        if "Other (please specify)" in st.session_state.prestudy["llm_use_purpose"]:
            st.session_state.prestudy["llm_use_purpose_other"] = st.text_input("Please specify:")

        st.session_state.prestudy["llm_last_experience"] = st.text_area(
            "Please describe the last time you used a large language model (LLM) such as ChatGPT, Claude, Gemini, or another AI assistant. "
            "What did you use it for, and in what context (e.g., work, study, personal use)? "
            "How helpful did you find the experience, and why?"
        )

        st.markdown("</div>", unsafe_allow_html=True)

    if st.button("Start Chat"):
        missing = unanswered_fields(st.session_state.prestudy)
        if missing:
            st.markdown('<p class="missing">⚠️ Please answer all questions before continuing.</p>', unsafe_allow_html=True)
        else:
            st.session_state.do_scroll_top = True
            st.session_state.show_prestudy = False
            st.rerun()



# --- CHAT ---
elif not st.session_state.show_survey:
    st.subheader("💬 Part II: Essay Writing")
    st.markdown("""
    **Essay Prompt**: Is technology making our lives better or worse?
        
    Write your response to this essay which must be 300-500 words in the text box on the left while you chat with the LLM on the right.

    The purpose of this study is to understand how people use LLMs for writing in their normal workflow. 
    If you don't usually use LLMs, think of like using the AI tool as a partner while you work on this essay. Think of it like having someone to bounce ideas off, ask questions, and get feedback from as you go.
    
    **Note**: You must answer all questions and put an essay in the form to receive compensation for the study.
    """)
    
    left_col, right_col = st.columns([1, 1])

    # -------------------------- LEFT SIDE --------------------------
    with left_col:
        st.subheader("✍️ Enter Your Writing Here")
        st.session_state.essay = st.text_area(
            "Enter your writing or text here:",
            height=600,
            key="essay_box",
            placeholder="Paste or type your essay here..."
        )

    # ----------------------- STATE SETUP ---------------------------
    if "messages" not in st.session_state:
        st.session_state.messages = []

    # -----------------------------------------
    # RIGHT COLUMN: CHAT INTERFACE
    # -----------------------------------------
    with right_col:
        st.subheader("💬 Chat")

        # Chat history
        chat_container = st.container()
        with chat_container:
            for msg in st.session_state.messages:
                with st.chat_message(msg["role"]):
                    st.markdown(msg["content"])

        # INPUT + BUTTON, both inside the right column
        st.text_input(
            "Type your message:",
            key="chat_input",
            placeholder="Hi, how can I help you?",
        )

        st.button("Send", on_click=send_message, use_container_width=True)



    if st.button("✅ Done"):
        st.session_state.do_scroll_top = True
        missing = st.session_state.essay_box == ""
        if missing:
            st.markdown('<p class="missing">⚠️ Please put the writing of 300 to 500 words in the text box</p>', unsafe_allow_html=True)
        else:
            st.success("✅ Thank you for completing the study!")
            os.makedirs("responses", exist_ok=True)
        st.session_state.show_survey = True
        st.rerun()

# --- POST-STUDY ---
if st.session_state.show_survey:
    st.subheader("📝 Part III: Post-Study Questions")

    likert_post = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]

    st.markdown("#### 📊 LLM Involvement")
    st.session_state.poststudy["percent_llm_generated"] = st.radio(
        "What percentage of the document would you say was LLM-generated?",
        ["0%", "20%", "40%", "60%", "80%", "100%"],
        index=None,
        horizontal=True,
    )

    st.markdown("#### 💡 Reflections on LLM Use")
    questions = {
        "idea_generation": "The LLM helped me generate ideas more effectively.",
        "feedback_quality": "The model’s feedback improved the quality of my essay.",
        "irrelevant_suggestions": "The LLM’s suggestions were irrelevant to my goals.",
        "learned_about_writing": "I learned something new about writing from using the LLM.",
        "lost_control": "I felt I had less control of the essay writing process when working with the LLM.",
        "too_much_initiative": "The model took too much initiative in generating content.",
        "collaboration": "I felt that the LLM and I were collaborating as partners.",
        "matched_assistance": "The model’s behavior matched my preferred level of assistance.",
        "distrust_suggestions": "I did not trust the LLM’s writing suggestions.",
        "would_not_use_again": "I would not use this LLM again for a similar writing task.",
        "question_originality": "Using the LLM made me question what counts as original writing.",
        "would_disclose": "I would disclose AI assistance if submitting this essay academically.",
    }
    for key, q in questions.items():
        st.session_state.poststudy[key] = st.radio(q, likert_post, index=None, horizontal=True)

    st.markdown("#### 🪶 Reflections on Your Essay")
    st.session_state.poststudy["satisfied_with_essay"] = st.radio("I was satisfied with the essay.", likert_post, index=None, horizontal=True)
    st.session_state.poststudy["creativity_level"] = st.radio(
        "How creative do you feel you were in writing the essay?",
        ["Very creative", "Somewhat creative", "Neither creative nor uncreative", "Somewhat uncreative", "Not at all creative"],
        index=None
    )
    st.session_state.poststudy["essay_in_my_voice"] = st.radio("I felt the essay was written in my voice.", likert_post, index=None, horizontal=True)
    st.session_state.poststudy["difficult_to_organize"] = st.radio("I found it difficult to organize my thoughts while writing.", likert_post, index=None, horizontal=True)
    st.session_state.poststudy["writing_struggle"] = st.radio("Writing this essay was a struggle for me.", likert_post, index=None, horizontal=True)
    st.session_state.poststudy["essay_experience"] = st.text_area(
        "Please describe your experience writing this essay.\n"
        "Comment on: How well does the essay reflect your own views and writing style? "
        "How much effort did you put into writing it? Did you learn anything during the process?"
    )

    st.markdown("</div>", unsafe_allow_html=True)

    if st.button("Submit Feedback"):
        missing = unanswered_fields(st.session_state.poststudy)
        print(missing)
        if missing:
            st.markdown('<p class="missing">⚠️ Please answer all questions before submitting.</p>', unsafe_allow_html=True)
        else:
            st.success("✅ Thank you for completing the study!")
            os.makedirs("responses", exist_ok=True)

            results = {
                "timestamp": datetime.now().isoformat(),
                "prestudy": st.session_state.prestudy,
                "conversation": st.session_state.messages,
                "poststudy": st.session_state.poststudy,
                "essay_text": st.session_state.essay
            }

            session_id = datetime.now().strftime("%Y%m%d_%H%M%S")

            db.collection("user_study_responses").document(session_id).set({
                "google_doc": GOOGLE_DOC_URL,
                "timestamp": datetime.now().isoformat(),
                "prestudy": st.session_state.prestudy,
                "conversation": st.session_state.messages,
                "poststudy": st.session_state.poststudy,
                "essay_text": st.session_state.essay, 
                'participant_id': st.session_state.participant_id,
                'assignment_id': st.session_state.assignment_id,
                'project_id': st.session_state.project_id,
            })

            # Reset
            st.session_state.show_survey = False
            st.session_state.show_prestudy = True
            st.session_state.messages = []
            st.session_state.prestudy = {}
            st.session_state.poststudy = {}

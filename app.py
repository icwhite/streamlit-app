import streamlit as st
from openai import OpenAI
import os
import json
from datetime import datetime

# --- CONFIG ---
st.set_page_config(page_title="Chat with LLM", page_icon="💬", layout="centered")

# Add CSS for larger text and scrollable survey containers
st.markdown(
    """
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
    /* Scrollable survey container */
    .survey-box {
        max-height: 550px;
        overflow-y: auto;
        padding: 1rem;
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        background-color: #fafafa;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

GOOGLE_DOC_URL = "https://docs.google.com/document/d/your-doc-id/edit"

# --- INITIALIZE STATE ---
if "messages" not in st.session_state:
    st.session_state.messages = []
if "show_survey" not in st.session_state:
    st.session_state.show_survey = False
if "show_prestudy" not in st.session_state:
    st.session_state.show_prestudy = True
if "prestudy" not in st.session_state:
    st.session_state.prestudy = {}

# --- HEADER ---
st.title("💬 LLM Chat Interface")
st.markdown(f"[📄 Open related Google Doc]({GOOGLE_DOC_URL})")

likert = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]

# --- PRE-STUDY SURVEY ---
if st.session_state.show_prestudy:
    st.subheader("🧠 Pre-Study Questions")
    st.markdown("Please answer the following before starting the chat.")

    with st.container():
        st.markdown('<div class="survey-box">', unsafe_allow_html=True)

        with st.expander("💭 Attitudes toward AI and Writing", expanded=True):
            st.session_state.prestudy["ai_improve_writing"] = st.radio(
                "I believe AI tools can improve my writing quality.", likert, index=None
            )
            st.session_state.prestudy["ai_understand_style"] = st.radio(
                "I do not expect AI systems to understand my writing style.", likert, index=None
            )
            st.session_state.prestudy["ai_trust_accuracy"] = st.radio(
                "I trust AI systems to provide accurate information.", likert, index=None
            )
            st.session_state.prestudy["ai_academic_acceptability"] = st.radio(
                "I do not believe using AI for writing is acceptable in academic contexts.", likert, index=None
            )

            st.session_state.prestudy["ai_use_case"] = st.radio(
                "For essay writing, I think AI tools should be used:",
                [
                    "Not at all",
                    "Check grammar, spelling, or clarity",
                    "Offer suggestions on how to improve my writing",
                    "Help brainstorm or outline ideas",
                    "Rewrite my essay from scratch",
                    "Write the entire essay",
                    "Other (please specify)",
                ],
                index=None,
            )

            if st.session_state.prestudy.get("ai_use_case") == "Other (please specify)":
                st.session_state.prestudy["other_use_case"] = st.text_input("Please specify:")

        with st.expander("✍️ Writing Habits and Confidence", expanded=False):
            st.session_state.prestudy["struggle_structure"] = st.radio(
                "I often struggle with structuring my ideas clearly.", likert, index=None
            )
            st.session_state.prestudy["confident_writer"] = st.radio(
                "I feel confident in my ability to write and edit essays on my own.", likert, index=None
            )
            st.session_state.prestudy["writing_time"] = st.radio(
                "I find essay writing time-consuming.", likert, index=None
            )
            st.session_state.prestudy["writing_enjoyable"] = st.radio(
                "I usually find essay writing enjoyable.", likert, index=None
            )

        with st.expander("🤖 LLM Use", expanded=False):
            st.session_state.prestudy["llm_use_frequency"] = st.radio(
                "I use LLMs to help me write:",
                ["Daily", "Weekly", "Monthly", "Checked it out a few times", "Never"],
                index=None,
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
        st.session_state.show_prestudy = False
        st.rerun()

# --- CHAT SECTION ---
elif not st.session_state.show_survey:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    if prompt := st.chat_input("Type your message here..."):
        st.session_state.messages.append({"role": "user", "content": prompt})

        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                try:
                    response = client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {"role": "system", "content": "You are a friendly and helpful assistant."},
                            *st.session_state.messages,
                        ],
                    )
                    answer = response.choices[0].message.content
                except Exception as e:
                    answer = f"⚠️ Error: {e}"

                st.markdown(answer)
                st.session_state.messages.append({"role": "assistant", "content": answer})

    if st.button("✅ Done"):
        st.session_state.show_survey = True
        st.rerun()

# --- POST-STUDY SURVEY ---
if st.session_state.show_survey:
    st.subheader("📝 Post-Study Questions")

    st.markdown('<div class="survey-box">', unsafe_allow_html=True)
    st.session_state["poststudy"] = {}

    with st.expander("📊 LLM Involvement", expanded=True):
        st.session_state.poststudy["percent_llm_generated"] = st.radio(
            "What percentage of the document would you say was LLM-generated?",
            ["0%", "20%", "40%", "60%", "80%", "100%"],
            index=None,
        )

    with st.expander("💡 Reflections on LLM Use", expanded=False):
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
        for key, question in questions.items():
            st.session_state.poststudy[key] = st.radio(question, likert, index=None)

    with st.expander("🪶 Reflections on Your Essay", expanded=False):
        st.session_state.poststudy["satisfied_with_essay"] = st.radio(
            "I was satisfied with the essay.", likert, index=None
        )

        st.session_state.poststudy["creativity_level"] = st.radio(
            "How creative do you feel you were in writing the essay?",
            [
                "Very creative",
                "Somewhat creative",
                "Neither creative nor uncreative",
                "Somewhat uncreative",
                "Not at all creative",
            ],
            index=None,
        )

        st.session_state.poststudy["essay_in_my_voice"] = st.radio(
            "I felt the essay was written in my voice.", likert, index=None
        )

        st.session_state.poststudy["difficult_to_organize"] = st.radio(
            "I found it difficult to organize my thoughts while writing.", likert, index=None
        )

        st.session_state.poststudy["writing_struggle"] = st.radio(
            "Writing this essay was a struggle for me.", likert, index=None
        )

        st.session_state.poststudy["essay_experience"] = st.text_area(
            "Please describe your experience writing this essay.\n"
            "Comment on: How well does the essay reflect your own views and writing style? "
            "How much effort did you put into writing it? Did you learn anything during the process?"
        )

    st.markdown("</div>", unsafe_allow_html=True)

    if st.button("Submit Feedback"):
        st.success("✅ Thank you for completing the study!")

        results = {
            "timestamp": datetime.now().isoformat(),
            "prestudy": st.session_state.prestudy,
            "poststudy": st.session_state.poststudy,
        }

        os.makedirs("responses", exist_ok=True)
        filename = f"responses/session_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, "w") as f:
            json.dump(results, f, indent=2)

        st.session_state.show_survey = False
        st.session_state.show_prestudy = True
        st.session_state.messages = []
        st.session_state.prestudy = {}
        st.session_state.poststudy = {}
        st.experimental_rerun()

import streamlit as st
from openai import OpenAI
import os
import json

# --- CONFIG ---
st.set_page_config(page_title="Chat with LLM", page_icon="💬", layout="centered")

# Replace with your actual Google Doc URL
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

# --- PRE-STUDY SURVEY ---
if st.session_state.show_prestudy:
    st.subheader("🧠 Pre-Study Questions")
    st.markdown("Please answer the following questions before starting the chat.")

    # --- Attitudes about AI and Writing ---
    st.markdown("### Attitudes toward AI and Writing")

    st.session_state.prestudy["ai_improve_writing"] = st.radio(
        "I believe AI tools can improve my writing quality.",
        ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    )

    st.session_state.prestudy["ai_understand_style"] = st.radio(
        "I do not expect AI systems to understand my writing style.",
        ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    )

    st.session_state.prestudy["ai_trust_accuracy"] = st.radio(
        "I trust AI systems to provide accurate information.",
        ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    )

    st.session_state.prestudy["ai_academic_acceptability"] = st.radio(
        "I do not believe using AI for writing is acceptable in academic contexts.",
        ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
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
    )

    if st.session_state.prestudy["ai_use_case"] == "Other (please specify)":
        st.session_state.prestudy["other_use_case"] = st.text_input("Please specify:")

    # --- Writing Self-Perception ---
    st.markdown("### Writing Habits and Confidence")

    st.session_state.prestudy["struggle_structure"] = st.radio(
        "I often struggle with structuring my ideas clearly.",
        ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    )

    st.session_state.prestudy["confident_writer"] = st.radio(
        "I feel confident in my ability to write and edit essays on my own.",
        ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    )

    st.session_state.prestudy["writing_time"] = st.radio(
        "I find essay writing time-consuming.",
        ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    )

    st.session_state.prestudy["writing_enjoyable"] = st.radio(
        "I usually find essay writing enjoyable.",
        ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    )

    # --- LLM Usage Habits ---
    st.markdown("### LLM Use")

    st.session_state.prestudy["llm_use_frequency"] = st.radio(
        "I use LLMs to help me write:",
        ["Daily", "Weekly", "Monthly", "Checked it out a few times", "Never"],
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
    )

    if "Other (please specify)" in st.session_state.prestudy["llm_use_purpose"]:
        st.session_state.prestudy["llm_use_purpose_other"] = st.text_input("Please specify:")

    st.session_state.prestudy["llm_last_experience"] = st.text_area(
        "Please describe the last time you used a large language model (LLM) such as ChatGPT, Claude, Gemini, or another AI assistant. "
        "What did you use it for, and in what context (e.g., work, study, personal use)? "
        "How helpful did you find the experience, and why?",
    )

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

    st.session_state["poststudy"] = {}

    st.session_state.poststudy["percent_llm_generated"] = st.radio(
        "What percentage of the document would you say was LLM-generated?",
        ["0%", "20%", "40%", "60%", "80%", "100%"],
    )

    st.markdown("### Reflections on LLM Use")

    likert_options = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]

    st.session_state.poststudy["idea_generation"] = st.radio(
        "The LLM helped me generate ideas more effectively.", likert_options
    )
    st.session_state.poststudy["feedback_quality"] = st.radio(
        "The model’s feedback improved the quality of my essay.", likert_options
    )
    st.session_state.poststudy["irrelevant_suggestions"] = st.radio(
        "The LLM’s suggestions were irrelevant to my goals.", likert_options
    )
    st.session_state.poststudy["learned_about_writing"] = st.radio(
        "I learned something new about writing from using the LLM.", likert_options
    )
    st.session_state.poststudy["lost_control"] = st.radio(
        "I felt I had less control of the essay writing process when working with the LLM.", likert_options
    )
    st.session_state.poststudy["too_much_initiative"] = st.radio(
        "The model took too much initiative in generating content.", likert_options
    )
    st.session_state.poststudy["collaboration"] = st.radio(
        "I felt that the LLM and I were collaborating as partners.", likert_options
    )
    st.session_state.poststudy["matched_assistance"] = st.radio(
        "The model’s behavior matched my preferred level of assistance.", likert_options
    )
    st.session_state.poststudy["distrust_suggestions"] = st.radio(
        "I did not trust the LLM’s writing suggestions.", likert_options
    )
    st.session_state.poststudy["would_not_use_again"] = st.radio(
        "I would not use this LLM again for a similar writing task.", likert_options
    )
    st.session_state.poststudy["question_originality"] = st.radio(
        "Using the LLM made me question what counts as original writing.", likert_options
    )
    st.session_state.poststudy["would_disclose"] = st.radio(
        "I would disclose AI assistance if submitting this essay academically.", likert_options
    )

    if st.button("Submit Feedback"):
        st.success("✅ Thank you for completing the study!")
        # Optionally save to file
        results = {
            "prestudy": st.session_state.prestudy,
            "poststudy": st.session_state.poststudy,
        }
        os.makedirs("responses", exist_ok=True)
        with open(f"responses/session_{len(os.listdir('responses')) + 1}.json", "w") as f:
            json.dump(results, f, indent=2)

        # Reset session
        st.session_state.show_survey = False
        st.session_state.show_prestudy = True
        st.session_state.messages = []
        st.session_state.prestudy = {}
        st.session_state.poststudy = {}
        st.experimental_rerun()

import streamlit as st

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
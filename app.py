import streamlit as st
from openai import OpenAI
import json
import os

# --- CONFIG ---
st.set_page_config(page_title="Chat with LLM", page_icon="💬", layout="centered")

# Replace with your actual Google Doc URL
GOOGLE_DOC_URL = "https://docs.google.com/document/d/your-doc-id/edit"

# --- Initialize session state ---
if "messages" not in st.session_state:
    st.session_state.messages = []
if "show_survey" not in st.session_state:
    st.session_state.show_survey = False

# --- HEADER ---
st.title("💬 LLM Chat Interface")
st.markdown(f"[📄 Open related Google Doc]({GOOGLE_DOC_URL})")

# --- Chat client (using OpenAI SDK or mock for demo) --
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- Chat Display ---
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# --- Chat Input ---
if not st.session_state.show_survey:
    if prompt := st.chat_input("Type your message here..."):
        # Add user message
        st.session_state.messages.append({"role": "user", "content": prompt})

        # Display user message
        with st.chat_message("user"):
            st.markdown(prompt)

        # Generate LLM response
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

# --- Done Button ---
if not st.session_state.show_survey:
    if st.button("✅ Done"):
        st.session_state.show_survey = True
        st.rerun()

# --- Survey Section ---
if st.session_state.show_survey:
    st.subheader("📝 Feedback Survey")
    st.markdown("We’d love to hear your thoughts about your experience!")

    q1 = st.radio("How helpful was the LLM?", ["Very", "Somewhat", "Not at all"])
    q2 = st.slider("Rate your satisfaction", 1, 10, 7)
    q3 = st.text_area("Any comments or suggestions?")

    if st.button("Submit Feedback"):
        st.success("✅ Thank you for your feedback!")
        st.session_state.show_survey = False
        st.session_state.messages = []

import os
import streamlit as st
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# -----------------------------------------------------
# STATE
# -----------------------------------------------------
if "messages" not in st.session_state:
    st.session_state.messages = []

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


# -----------------------------------------------------
# LAYOUT
# -----------------------------------------------------
left_col, right_col = st.columns([1, 1])

with left_col:
    st.subheader("✍️ Enter Your Writing Here")
    st.text_area("Enter your writing:", height=600, key="essay_box")

with right_col:
    st.subheader("💬 Chat")

    chat_container = st.container()
    with chat_container:
        for msg in st.session_state.messages:
            with st.chat_message(msg["role"]):
                st.markdown(msg["content"])

    # Input stays inside the right column
    st.text_input(
        "Type your message:",
        key="chat_input",
        placeholder="Ask me something..."
    )

    # Only this button triggers sending
    st.button("Send", use_container_width=True, on_click=send_message)

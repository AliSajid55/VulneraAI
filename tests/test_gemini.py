
import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai

# The backend keeps its environment file in backend/.env (next to server.py).
load_dotenv(Path(__file__).resolve().parents[1] / "backend" / ".env")

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError(
        "GEMINI_API_KEY not found in .env, Please set it to a valid Gemini API key to run this test."
    )

client = genai.Client(api_key=api_key)

response = client.models.generate_content(
    model="gemini-3.8-flash",
    contents="Reply with exactly: Gemini API connected successfully."
)

print(response.text)

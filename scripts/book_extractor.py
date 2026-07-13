"""
book_extractor.py — local Flask server that uses Ollama to extract book titles/authors
from free-form text and returns a structured JSON list.

Usage:
  python scripts/book_extractor.py
  python scripts/book_extractor.py --model gemma4:e2b --port 8000

Endpoint:
  POST /extract
  Body:    { "text": "<raw user input>" }
  Returns: { "books": [{ "title": "...", "author": "..." }, ...] }
"""

import argparse
import re

from flask import Flask, jsonify, request
from flask_cors import CORS
from openai import OpenAI

app = Flask(__name__)
CORS(app)  # allow browser on localhost:7000 to call this server

SYSTEM_PROMPT = (
    "You are a data extractor. From the text the user provides, extract all book titles "
    "and author names. Return ONLY a semicolon-separated list in this exact format: "
    "title1,author1;title2,author2\n"
    "No explanations, no extra text, no markdown. If a book has no identifiable author, "
    "use 'Unknown'."
)


def parse_args():
    parser = argparse.ArgumentParser(description="Book extractor server")
    parser.add_argument("--model", default="gemma4:e2b", help="Ollama model name")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on")
    return parser.parse_args()


args = parse_args()
ollama_client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")


@app.post("/extract")
def extract():
    data = request.get_json(silent=True)
    if not data or not isinstance(data.get("text"), str) or not data["text"].strip():
        return jsonify({"error": "Body must contain a non-empty 'text' field."}), 400

    raw_text = data["text"].strip()

    try:
        response = ollama_client.chat.completions.create(
            model=args.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": raw_text},
            ],
            stream=False,
        )
    except Exception as e:
        return jsonify({"error": f"Ollama call failed: {str(e)}"}), 502

    raw_output = response.choices[0].message.content or ""

    books = []
    for entry in raw_output.split(";"):
        entry = entry.strip()
        if not entry:
            continue
        # Split on the first comma only
        parts = entry.split(",", 1)
        if len(parts) != 2:
            continue
        title = parts[0].strip()
        author = parts[1].strip()
        # Skip obviously malformed entries (empty title after stripping)
        if not title:
            continue
        # Strip surrounding quotes that the model sometimes adds
        title = re.sub(r'^["\']|["\']$', "", title)
        author = re.sub(r'^["\']|["\']$', "", author)
        books.append({"title": title, "author": author or "Unknown"})

    return jsonify({"books": books})


if __name__ == "__main__":
    print(f"Book extractor running on http://localhost:{args.port}")
    print(f"Model: {args.model}")
    app.run(port=args.port, debug=False)

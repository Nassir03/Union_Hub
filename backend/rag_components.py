import os
import re
from typing import Iterable

from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from sentence_transformers import SentenceTransformer

try:
    from .rag_config import LLM_MODEL, LOCAL_EMBEDDING_MODEL, MAX_CONTEXT_CHARS, OFFLINE_MODE, USE_LLM
except ImportError:
    from rag_config import LLM_MODEL, LOCAL_EMBEDDING_MODEL, MAX_CONTEXT_CHARS, OFFLINE_MODE, USE_LLM

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None


_EMBEDDING_MODEL_CACHE = {}


class LocalSentenceTransformerEmbeddings(Embeddings):
    def __init__(self, model_name=LOCAL_EMBEDDING_MODEL):
        if model_name not in _EMBEDDING_MODEL_CACHE:
            try:
                _EMBEDDING_MODEL_CACHE[model_name] = SentenceTransformer(
                    model_name,
                    local_files_only=True,
                )
            except Exception:
                print(f"Downloading local embedding model: {model_name}")
                _EMBEDDING_MODEL_CACHE[model_name] = SentenceTransformer(model_name)

        self.model = _EMBEDDING_MODEL_CACHE[model_name]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self.model.encode(texts, show_progress_bar=False).tolist()

    def embed_query(self, text: str) -> list[float]:
        return self.model.encode(text).tolist()


def get_embeddings():
    return LocalSentenceTransformerEmbeddings()


def get_chat_llm():
    if load_dotenv:
        load_dotenv(override=True)

    if OFFLINE_MODE:
        print("[MuunganoHub] LLM disabled: OFFLINE_MODE=true")
        return None

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not USE_LLM:
        print("[MuunganoHub] LLM disabled: USE_LLM=false")
        return None

    if not api_key:
        print("[MuunganoHub] LLM disabled: OPENAI_API_KEY missing")
        return None

    from langchain_openai import ChatOpenAI

    return ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", LLM_MODEL),
        temperature=0,
        api_key=api_key,
    )


def get_openai_client():
    if load_dotenv:
        load_dotenv(override=True)

    if OFFLINE_MODE:
        print("[MuunganoHub] OpenAI client disabled: OFFLINE_MODE=true")
        return None

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not USE_LLM:
        print("[MuunganoHub] OpenAI client disabled: USE_LLM=false")
        return None

    if not api_key:
        print("[MuunganoHub] OpenAI client disabled: OPENAI_API_KEY missing")
        return None

    if OpenAI is None:
        print("[MuunganoHub] OpenAI package not installed")
        return None

    return OpenAI(api_key=api_key)


def clean_text(text: str) -> str:
    text = re.sub(r"\n?===== PAGE \d+ =====\n?", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def parse_metadata_header(text: str) -> tuple[dict, str]:
    metadata = {}
    lines = text.splitlines()
    body_start = 0

    for index, line in enumerate(lines[:10]):
        if line.startswith("Title:"):
            metadata["title"] = line.replace("Title:", "", 1).strip()
            body_start = index + 1
        elif line.startswith("Source URL:"):
            metadata["source_url"] = line.replace("Source URL:", "", 1).strip()
            body_start = index + 1
        elif line.startswith("Source Type:"):
            metadata["source_type"] = line.replace("Source Type:", "", 1).strip()
            body_start = index + 1

    body_lines = lines[body_start:]
    while body_lines and not body_lines[0].strip():
        body_lines.pop(0)

    return metadata, "\n".join(body_lines)


def get_topic_from_filename(filename: str) -> str:
    name = filename.lower()

    if "union" in name or "muungano" in name:
        return "union"
    if "zanzibar" in name:
        return "zanzibar"
    if "tanganyika" in name:
        return "tanganyika"
    if "history" in name or "historia" in name:
        return "history"
    if "benefit" in name or "faida" in name:
        return "benefits"
    if "constitution" in name or "katiba" in name:
        return "constitution"
    return "general"


def format_docs(docs: Iterable[Document]) -> str:
    formatted = []

    for index, doc in enumerate(docs, start=1):
        title = doc.metadata.get("title") or doc.metadata.get("source", "Unknown")
        url = doc.metadata.get("source_url") or "local file"
        formatted.append(
            f"[Source {index}: {title} | URL: {url}]\n"
            f"{clean_text(doc.page_content)}"
        )

    return "\n\n---\n\n".join(formatted)


def build_answer_from_context(question: str, docs, metas, distances=None):
    """
    Full RAG answer generator.

    The retriever supplies the context. The LLM is only allowed to answer from
    that context and must cite source numbers. If no API key is configured, this
    returns None so callers can use the local extractive fallback.
    """
    client = get_openai_client()
    if client is None:
        return None

    if not docs:
        return {
            "answer": "Samahani, sina taarifa za kutosha kwenye nyaraka nilizonazo kujibu swali hilo.",
            "sources": [],
            "context": [],
        }

    sources = []
    context_parts = []
    used_chars = 0

    for index, (doc, meta) in enumerate(zip(docs, metas), start=1):
        text = clean_text(doc)
        if not text:
            continue

        remaining = MAX_CONTEXT_CHARS - used_chars
        if remaining <= 0:
            break
        if len(text) > remaining:
            text = text[:remaining].rsplit(" ", 1)[0]

        context_parts.append(f"[Source {index}]\n{text}")
        used_chars += len(text)
        sources.append({
            "source_id": index,
            "source": meta.get("source", "unknown"),
            "title": meta.get("title", meta.get("source", "unknown")),
            "topic": meta.get("topic", "unknown"),
            "document": meta.get("document", meta.get("source", "unknown")),
            "page": meta.get("page", "N/A"),
            "source_type": meta.get("source_type", "unknown"),
            "source_url": meta.get("source_url", "local file"),
        })

    context = "\n\n".join(context_parts)
    if not context.strip():
        return {
            "answer": "Samahani, sina taarifa za kutosha kwenye nyaraka nilizonazo kujibu swali hilo.",
            "sources": sources,
            "context": [],
        }

    prompt = f"""
You are MuunganoHub AI Tutor — an educational assistant about the Union of Tanganyika and Zanzibar (Tanzania).

Answer the user's question using ONLY the context provided below.

STRICT RULES:
1. Answer in the SAME LANGUAGE as the user's question (Swahili → Swahili, English → English).
2. Structure your answer in this order:
   a) Direct answer to the question (1-2 sentences)
   b) Simple explanation of the key facts (1-2 sentences)
   c) Historical or context explanation (1-2 sentences, if relevant)
   d) Why this matters to youth in Tanzania today (1 sentence)
3. Write 2-4 short paragraphs. NEVER give a one-sentence answer.
4. Cite sources inline using [1], [2], etc., matching the Source numbers below.
5. If the context does not contain enough information, say:
   Swahili: "Sina taarifa za kutosha kwenye nyaraka nilizonazo kujibu swali hilo kwa uhakika."
   English: "I don't have enough information in my documents to answer this with confidence."
6. Do NOT invent facts, dates, or names that are not in the context.
7. End with a "Sources:" or "Vyanzo:" section listing which sources you used.

CONTEXT:
{context}

QUESTION:
{question}

ANSWER:
"""

    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", LLM_MODEL),
        messages=[
            {
                "role": "system",
                "content": "You are a careful educational assistant. You only answer from the provided context.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.1,
        max_tokens=900,
    )

    return {
        "answer": response.choices[0].message.content.strip(),
        "sources": sources,
        "context": docs,
    }


def format_sources(docs: Iterable[Document]) -> str:
    lines = []

    for index, doc in enumerate(docs, start=1):
        meta = doc.metadata
        title = (
            meta.get("document_title")
            or meta.get("title")
            or meta.get("source", "Unknown")
        )
        topic = meta.get("topic") or meta.get("section_title") or ""
        source_type = meta.get("source_type") or "Hati ya Ndani"
        url = meta.get("source_url") or "local file"
        language = meta.get("language") or ""

        snippet = clean_text(doc.page_content)
        if not snippet:
            continue
        snippet = snippet[:180].rsplit(" ", 1)[0]

        parts = [f"[{index}] {title}"]
        if topic:
            parts.append(f"Mada: {topic}")
        parts.append(f"Aina: {source_type}")
        if language:
            parts.append(f"Lugha: {language}")
        parts.append(f"URL: {url}")
        parts.append(f"{snippet}...")
        lines.append(" | ".join(parts))

    return "\n".join(lines)

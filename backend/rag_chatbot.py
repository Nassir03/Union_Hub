import json
import os
import re
import sys

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from rich.console import Console
from rich.markdown import Markdown

try:
    from .rag_components import (
        build_answer_from_context, clean_text, format_docs, format_sources,
        get_chat_llm, get_embeddings, get_openai_client,
    )
    from .knowledge_base import FAQ_ENTRIES, build_knowledge_documents, get_area_text, get_learning_area
    from .rag_config import CHROMA_DIR, CHUNKS_FILE, COLLECTION_NAME, FETCH_K, LLM_MODEL, OFFLINE_MODE, TOP_K, USE_LLM
    from .union_core_facts import INTENT_BLOCKED_SIGNALS, INTENT_RETRIEVAL_QUERIES, UNION_CORE_FACTS, classify_union_intent
except ImportError:
    from rag_components import (
        build_answer_from_context, clean_text, format_docs, format_sources,
        get_chat_llm, get_embeddings, get_openai_client,
    )
    from knowledge_base import FAQ_ENTRIES, build_knowledge_documents, get_area_text, get_learning_area
    from rag_config import CHROMA_DIR, CHUNKS_FILE, COLLECTION_NAME, FETCH_K, LLM_MODEL, OFFLINE_MODE, TOP_K, USE_LLM
    from union_core_facts import INTENT_BLOCKED_SIGNALS, INTENT_RETRIEVAL_QUERIES, UNION_CORE_FACTS, classify_union_intent

console = Console()

SWAHILI_MARKERS = {
    "nini", "maana", "muungano", "katiba", "historia", "faida", "manufaa",
    "umuhimu", "muhimu",
    "lini", "nani", "wapi", "kwanini", "kwani", "sababu", "kwa", "ya", "wa",
    "na", "ni", "eleza", "fafanua", "tarehe", "mwaka", "zanzibar", "tanganyika",
    "ulifanyika", "ulianzishwa", "mapinduzi", "mambo",
    "waliungana", "waliunganika", "waliamua", "kwa nini", "nini kilisababisha",
}

ENGLISH_MARKERS = {
    "what", "when", "where", "why", "who", "how", "the", "is", "are",
    "was", "were", "union", "history", "benefits", "importance", "important",
    "value", "advantages", "constitution",
    "revolution", "zanzibar", "tanganyika", "explain", "tell", "about",
    "formed", "established", "matters",
}

CONTEXTUALIZE_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "Given the chat history and the latest user question, rewrite the "
        "question so it can be understood by itself. Do not answer it. "
        "If it is already standalone, return it unchanged.",
    ),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{question}"),
])

RAG_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are MuunganoHub AI Tutor — a civic education assistant for youth in Tanzania and Zanzibar.
You answer ONLY questions about the Union of Tanganyika and Zanzibar, its history, founders, institutions, benefits, challenges, and constitutions.

CRITICAL LANGUAGE RULE:
- If the user's question is in Swahili, your ENTIRE answer must be in Swahili.
- If the user's question is in English, your ENTIRE answer must be in English.
- Never mix languages. Never translate without being asked.

USE ONLY THE RETRIEVED CONTEXT BELOW. Do not use general knowledge or invent facts.

ANSWER STRUCTURE (all five parts required):
1. Direct answer — 1–2 sentences answering the question directly.
2. Explanation — 2–3 sentences with key facts from the sources.
3. Historical or context detail — 2–3 sentences of relevant background.
4. Why it matters to youth today — 1–2 sentences connecting this topic to young people.
5. Sources — list each numbered source you used.

REQUIREMENTS:
- Write at least 3 short paragraphs. Never give a one-sentence answer.
- Use inline citations like [1], [2], [3] throughout your answer. You MUST include at least one.
- Do not invent dates, names, or facts not present in the context.
- If the context does not have enough information to answer, say exactly:
  Swahili: "Sina taarifa za kutosha kwenye nyaraka nilizonazo kujibu swali hilo kwa uhakika."
  English: "I don't have enough information in my documents to answer this with confidence."
- End with "Sources:" (English) or "Vyanzo:" (Swahili) listing the numbered sources used.

CONTEXT:
{context}""",
    ),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{question}"),
])

STOP_WORDS = {
    "the", "and", "kwa", "ya", "wa", "na", "katika", "ni", "la", "za", "cha",
    "what", "when", "where", "which", "who", "how", "is", "are", "was", "were",
    "nini", "gani", "ipi", "zipi", "tell", "about", "kuhusu", "eleza", "fafanua",
}

SYNONYM_GROUPS = [
    {"history", "historia", "chimbuko", "origin", "background"},
    {"union", "muungano", "articles", "mkataba", "makubaliano", "hati",
     "waliungana", "waliunganika", "kuungana", "uliundwa", "ulianzishwa"},
    {"zanzibar", "znz", "unguja", "pemba"},
    {"tanganyika", "bara", "mainland"},
    {"revolution", "mapinduzi", "uprising", "overthrow"},
    {"constitution", "katiba", "law", "sheria"},
    {"president", "rais", "leader", "kiongozi"},
    {"karume", "abeid", "amani"},
    {"nyerere", "julius", "mwalimu"},
    {"date", "tarehe", "lini", "mwaka", "year", "when"},
    {"why", "kwani", "sababu", "reasons", "reason", "cause", "causes",
     "kwa nini", "nini kilisababisha"},
    {"formed", "created", "established", "kuundwa", "kufanywa", "waliamua"},
]

QUERY_EXPANSION_MAP = {
    "kwani":        "sababu reasons why muungano union formation",
    "sababu":       "reasons why causes factors muungano union",
    "kwa nini":     "sababu reasons why causes muungano union",
    "waliungana":   "muungano union formed united articles hati",
    "waliunganika": "muungano union formed united",
    "nini":         "maana definition what meaning",
    "maana":        "definition meaning what is explanation",
    "lini":         "tarehe mwaka date year when 1964",
    "nani":         "who person leader founder kiongozi",
    "faida":        "benefits advantages value gains importance manufaa umuhimu",
    "manufaa":      "benefits advantages value gains importance faida umuhimu",
    "umuhimu":      "importance important value benefits advantages faida manufaa",
    "muhimu":       "important importance value benefits advantages faida manufaa",
    "changamoto":   "challenges problems difficulties",
    "mambo":        "union matters katiba constitution list",
}

DOMAIN_TERMS = {
    "muungano", "union", "tanganyika", "zanzibar", "tanzania", "katiba",
    "constitution", "historia", "history", "mapinduzi", "revolution",
    "nyerere", "karume", "jamhuri", "republic", "mambo", "matters",
    "uraia", "citizenship", "uhamiaji", "immigration", "serikali",
    "government", "uhuru", "independence", "sultan", "sultani",
    "vijana", "youth", "student", "students", "wanafunzi", "elimu",
    "education", "ajira", "jobs", "employment", "fursa", "opportunities",
    "uchumi", "economy", "trade", "biashara", "culture", "utamaduni",
    "institutions", "taasisi", "agreements", "makubaliano", "hati",
    "founders", "waasisi", "challenges", "changamoto", "speeches",
    "hotuba", "publications", "machapisho", "events", "matukio",
    "tawala", "aliyetawala", "alietawala", "ruled", "ruler", "before",
    "kabla", "prime", "minister", "waziri", "mkuu", "president", "rais",
    "rashidi", "rashid", "kawawa",
}

OUT_OF_SCOPE_TERMS = {
    "iphone", "samsung", "price", "bei", "shilingi", "dollar", "weather",
    "hali ya hewa", "football", "mpira", "movie", "music", "bitcoin",
    "stock", "recipe", "mapishi", "hotel", "flight", "tiketi",
}


def tokenize(text):
    return {
        token
        for token in re.findall(r"\w+", text.lower())
        if len(token) > 2 and token not in STOP_WORDS
    }


def normalize_question(text):
    text = re.sub(r"[^\w\s]", " ", text.lower())
    return re.sub(r"\s+", " ", text).strip()


def detect_language(text):
    tokens = {token for token in re.findall(r"\w+", text.lower()) if len(token) > 1}
    sw_score = len(tokens & SWAHILI_MARKERS)
    en_score = len(tokens & ENGLISH_MARKERS)

    if sw_score > en_score:
        return "sw"
    if en_score > sw_score:
        return "en"

    if any(word in text.lower() for word in ("muungano", "katiba", "nini", "lini", "faida", "manufaa", "umuhimu", "muhimu")):
        return "sw"

    return "en"


def refusal_message(language):
    if language == "en":
        return (
            "Sorry, that question is not related to the Union of Tanganyika and Zanzibar. "
            "Please ask about Union history, the Articles of Union, founders, benefits, "
            "challenges, constitutions, or Union matters."
        )
    return (
        "Samahani, swali hilo halihusiani na Muungano wa Tanganyika na Zanzibar. "
        "Tafadhali uliza kuhusu historia ya Muungano, Hati za Muungano, waasisi, "
        "faida, changamoto, Katiba, au mambo ya Muungano."
    )


def empty_question_message(language="sw"):
    if language == "en":
        return "Please type a question."
    return "Tafadhali andika swali lenye maandishi."


def expand_tokens(text):
    tokens = tokenize(text)
    lower_text = text.lower()

    for group in SYNONYM_GROUPS:
        if tokens & group or any(word in lower_text for word in group):
            tokens.update(group)

    if tokens & {"faida", "manufaa", "umuhimu", "muhimu", "benefit", "benefits", "importance", "important", "value", "advantage", "advantages", "mafanikio"}:
        tokens.update({
            "maendeleo",
            "uchumi",
            "usalama",
            "amani",
            "utulivu",
            "elimu",
            "huduma",
            "fursa",
            "ushirikiano",
            "umoja",
            "biashara",
        })

    return tokens


def split_sentences(text):
    sentences = re.split(r"(?<=[.!?])\s+", clean_text(text))
    return [sentence.strip() for sentence in sentences if sentence.strip() and "?" not in sentence]


def sentence_language_score(sentence, target_language):
    detected = detect_language(sentence)
    if detected == target_language:
        return 3
    return 0


def source_priority(doc, target_language):
    source_type = doc.metadata.get("source_type", "local")
    source = doc.metadata.get("source", "").lower()
    url = doc.metadata.get("source_url", "").lower()
    title = doc.metadata.get("title", "").lower()
    score = 0

    official_markers = (
        "vpo.go.tz",
        "bunge.go.tz",
        "ikulu.go.tz",
        "tanzania.go.tz",
        "zanzibar.go.tz",
        ".go.tz",
    )
    core_union_markers = (
        "articles_of_union",
        "hati",
        "katiba",
        "constitution",
        "historia_ya_muungano",
        "mambo22",
        "official_union",
        "union_source_guide",
    )

    if source_type in {"official", "curated", "faq"}:
        score += 9
    elif any(marker in url for marker in official_markers):
        score += 8
    elif source_type == "local" or not url:
        score += 6
    elif "unitedrepublicoftanzania.com" in url:
        score += 3
    elif "wikipedia.org" in url or "wikipedia" in source:
        score += 1

    if any(marker in source or marker in title or marker in url for marker in core_union_markers):
        score += 6

    if target_language == "sw" and (
        source_type == "local"
        or "historia" in source
        or "muungano" in source
        or "mambo22" in source
    ):
        score += 3

    if target_language == "en" and (
        "english" in source
        or "wikipedia" in source
        or "history of" in title
        or "zanzibar revolution" in title
    ):
        score += 3

    return score


def expand_query_for_retrieval(question):
    """Expand the search query with domain-specific terms to improve vector retrieval."""
    lower = question.lower()
    extra = []
    for keyword, expansion in QUERY_EXPANSION_MAP.items():
        if keyword in lower:
            extra.append(expansion)
    if "tanganyika" in lower and "zanzibar" in lower and not any(
        w in lower for w in ("muungano", "union")
    ):
        extra.append("muungano union formation articles hati sababu reasons")
    if extra:
        return f"{question} {' '.join(extra)}"
    return question


def is_why_union_formed_question(question):
    lower_question = normalize_question(question)
    why_markers = (
        "kwani", "kwa nini", "sababu", "why", "reason", "reasons",
        "how come", "what led", "nini kilisababisha", "what caused",
        "waliungana", "waliunganika", "waliamua kuungana",
    )
    union_markers = (
        "muungano", "union", "tanganyika", "zanzibar", "waliungana",
    )
    has_why = any(marker in lower_question for marker in why_markers)
    has_union = any(marker in lower_question for marker in union_markers)
    return has_why and has_union


def is_definition_question(question):
    lower_question = normalize_question(question)
    tokens = tokenize(question)
    return (
        bool(tokens & {"maana", "define", "definition"})
        or lower_question.startswith("what is ")
        or lower_question.startswith("what are ")
        or "what is" in lower_question
        or "what are" in lower_question
        or "meaning of" in lower_question
        or "nini maana" in lower_question
        or lower_question.startswith("nini ")
        or lower_question.startswith("muungano ni")
        or lower_question.startswith("union is")
        or lower_question.strip() in {
            "nini muungano",
            "nini maana ya muungano",
            "muungano ni nini",
            "maana ya muungano",
            "muungano maana yake nini",
            "what is union",
            "what is a union",
            "what is the union",
            "what does union mean",
            "nini union",
            "union ni nini",
        }
        or lower_question.startswith("nini muungano ")
        or lower_question.startswith("what is union ")
        or lower_question.startswith("what is the union ")
    )


def is_tanganyika_zanzibar_union_question(question):
    lower_question = normalize_question(question)
    tokens = expand_tokens(question)
    has_union = "muungano" in lower_question or "union" in lower_question
    has_tanganyika = "tanganyika" in tokens or "tanganyika" in lower_question
    has_zanzibar = "zanzibar" in tokens or "zanzibar" in lower_question
    asks_identity = (
        is_definition_question(question)
        or "nini" in lower_question
        or "what" in lower_question
        or "ulikuwa" in lower_question
        or "ulifanyika" in lower_question
        or "formed" in lower_question
        or "established" in lower_question
    )
    return has_union and has_tanganyika and has_zanzibar and asks_identity


def is_benefits_question(question):
    tokens = expand_tokens(question)
    lower_question = question.lower()
    return (
        bool(tokens & {
            "faida",
            "manufaa",
            "umuhimu",
            "muhimu",
            "benefit",
            "benefits",
            "importance",
            "important",
            "value",
            "advantage",
            "advantages",
            "mafanikio",
        })
        or "benefit" in lower_question
        or "importance" in lower_question
        or "why is the union important" in lower_question
    )


def is_union_date_question(question):
    lower_question = normalize_question(question)
    asks_date = any(
        phrase in lower_question
        for phrase in (
            "lini",
            "tarehe gani",
            "mwaka gani",
            "ulifanyika",
            "ulianzishwa",
            "uliundwa",
            "when",
            "formed",
            "established",
            "created",
        )
    )
    asks_union = "muungano" in lower_question or "union" in lower_question
    return asks_date and asks_union


def is_revolution_question(question):
    lower_question = normalize_question(question)
    has_revolution = "mapinduzi" in lower_question or "revolution" in lower_question
    has_zanzibar = "zanzibar" in lower_question or "unguja" in lower_question
    return has_revolution and has_zanzibar


def is_union_matters_question(question):
    lower_question = normalize_question(question)
    has_union = "muungano" in lower_question or "union" in lower_question
    has_matters = any(
        phrase in lower_question
        for phrase in (
            "mambo ya muungano",
            "mambo gani",
            "union matters",
            "matters of union",
            "katiba",
            "constitution",
        )
    )
    return has_union and has_matters


def is_person_question(question, names):
    lower_question = normalize_question(question)
    asks_person = any(
        phrase in lower_question
        for phrase in (
            "who was",
            "who is",
            "nani alikuwa",
            "nani ni",
            "ni nani",
            "tell me about",
            "eleza kuhusu",
            "fafanua kuhusu",
        )
    )
    return asks_person and any(name in lower_question for name in names)


def is_domain_question(question):
    lower_question = normalize_question(question)
    tokens = expand_tokens(question)
    return bool(tokens & DOMAIN_TERMS) or any(term in lower_question for term in DOMAIN_TERMS)


def is_clearly_out_of_scope(question):
    lower_question = normalize_question(question)
    tokens = tokenize(question)
    has_out_scope = bool(tokens & OUT_OF_SCOPE_TERMS) or any(term in lower_question for term in OUT_OF_SCOPE_TERMS)
    has_domain = is_domain_question(question)
    return has_out_scope and not has_domain


def enough_context(question, docs):
    question_tokens = expand_tokens(question)
    if not question_tokens:
        return False

    target_language = detect_language(question)
    best_score = 0
    for doc in docs:
        doc_tokens = expand_tokens(doc.page_content)
        title_tokens = expand_tokens(doc.metadata.get("title", ""))
        score = (
            len(question_tokens & doc_tokens)
            + (len(question_tokens & title_tokens) * 2)
        )
        best_score = max(best_score, score)

    return best_score >= 2


def is_teach_question(question):
    lower_question = normalize_question(question)
    return any(
        phrase in lower_question
        for phrase in (
            "teach me",
            "teach about",
            "learn about",
            "explain step by step",
            "nifundishe",
            "nijifunze",
            "fundisha",
            "jifunze kuhusu",
        )
    )


def related_questions(question, language):
    lower_question = normalize_question(question)

    if language == "en":
        if any(word in lower_question for word in ("youth", "student", "job", "opportunit")):
            return [
                "How does the Union help students?",
                "How does the Union affect jobs?",
                "Why should youth care about the Union?",
            ]
        if any(word in lower_question for word in ("constitution", "katiba")):
            return [
                "Why is the 1977 Constitution important?",
                "What is the role of the 1984 Zanzibar Constitution?",
                "What are Union matters?",
            ]
        if any(word in lower_question for word in ("benefit", "importance", "important", "value", "advantage", "economy", "trade")):
            return [
                "What are the benefits of the Union?",
                "How are economy and trade related to the Union?",
                "What challenges does the Union face?",
            ]
        return [
            "Why was the Union formed?",
            "Who were the founders of the Union?",
            "What are the benefits of the Union?",
        ]

    if any(word in lower_question for word in ("vijana", "wanafunzi", "ajira", "fursa")):
        return [
            "Muungano unawasaidiaje wanafunzi?",
            "Muungano unaathirije ajira?",
            "Kwa nini vijana wajali Muungano?",
        ]
    if any(word in lower_question for word in ("katiba", "sheria")):
        return [
            "Katiba ya 1977 ina umuhimu gani?",
            "Katiba ya Zanzibar ya 1984 ina nafasi gani?",
            "Mambo ya Muungano ni yapi?",
        ]
    if any(word in lower_question for word in ("faida", "manufaa", "umuhimu", "muhimu", "uchumi", "biashara")):
        return [
            "Faida za Muungano ni zipi?",
            "Uchumi na biashara vinahusikaje na Muungano?",
            "Changamoto za Muungano ni zipi?",
        ]
    return [
        "Kwa nini Muungano uliundwa?",
        "Nani walikuwa waasisi wa Muungano?",
        "Faida za Muungano ni zipi?",
    ]


def append_followups(answer, question, language):
    heading = "Related Questions" if language == "en" else "Maswali Yanayohusiana"
    questions = related_questions(question, language)
    followups = "\n".join(f"- {item}" for item in questions)
    return f"{answer}\n\n{heading}:\n{followups}"


class RAGChatbot:
    def __init__(self):
        self.embeddings = get_embeddings()
        self.vector_store = self.get_vector_store()
        self.keyword_documents = self.load_keyword_documents()
        self.llm = get_chat_llm()
        self.fast_llm = self.llm
        self.chat_history = []
        print(
            f"[MuunganoHub] OFFLINE_MODE={OFFLINE_MODE}, USE_LLM={USE_LLM}, "
            f"LLM_MODEL={LLM_MODEL}, LLM_ACTIVE={self.llm is not None}"
        )

    def finalize_answer(self, answer, question, language):
        return answer

    @staticmethod
    def _is_blocked_chunk(doc, blocked_signals):
        """Return True if this chunk should be rejected for the given intent."""
        meta = doc.metadata
        haystack = " ".join([
            (meta.get("source") or "").lower(),
            (meta.get("title") or "").lower(),
            (meta.get("document_title") or "").lower(),
            (meta.get("topic") or "").lower(),
            (meta.get("source_url") or "").lower(),
        ])
        return any(signal.lower() in haystack for signal in blocked_signals)

    def retrieve_for_intent(self, intent, limit=None):
        """Retrieve docs for a specific intent using intent-specific queries and topic filtering."""
        result_limit = limit or TOP_K
        query = INTENT_RETRIEVAL_QUERIES.get(intent, "")
        if not query:
            return []

        blocked = INTENT_BLOCKED_SIGNALS.get(intent, [])

        docs = self.vector_store.max_marginal_relevance_search(
            query,
            k=result_limit * 2,
            fetch_k=max(FETCH_K, result_limit * 4),
        )
        docs.extend(self.keyword_search(query, limit=result_limit * 2))

        if blocked:
            docs = [d for d in docs if not self._is_blocked_chunk(d, blocked)]

        unique_docs = {}
        for doc in docs:
            key = doc.metadata.get("id") or (
                doc.metadata.get("source", ""),
                doc.page_content[:80],
            )
            unique_docs[key] = doc

        return list(unique_docs.values())[:result_limit]

    def hybrid_answer(self, question, intent):
        """
        Return a trusted answer from UNION_CORE_FACTS for the intent,
        appending filtered RAG sources when available.
        """
        if intent not in UNION_CORE_FACTS:
            return None

        language = detect_language(question)
        fact = UNION_CORE_FACTS[intent]
        core_answer = fact.get(language) or fact.get("sw", "")
        if not core_answer:
            return None

        source_heading = "Sources" if language == "en" else "Vyanzo"

        try:
            rag_docs = self.retrieve_for_intent(intent)
            sources_text = format_sources(rag_docs) if rag_docs else fact.get("fallback_sources", "")
        except Exception:
            sources_text = fact.get("fallback_sources", "")

        if sources_text:
            return f"{core_answer}\n\n{source_heading}:\n{sources_text}"
        return core_answer

    def get_vector_store(self):
        if CHROMA_DIR.exists():
            store = Chroma(
                collection_name=COLLECTION_NAME,
                persist_directory=str(CHROMA_DIR),
                embedding_function=self.embeddings,
            )
            try:
                if store._collection.count() > 0:
                    return store
            except Exception:
                pass

        print("[MuunganoHub] Vector DB missing or empty. Building fallback vector store from local knowledge base.")

        fallback_docs = build_knowledge_documents()

        if CHUNKS_FILE.exists():
            try:
                chunks = json.loads(CHUNKS_FILE.read_text(encoding="utf-8"))
                for chunk in chunks:
                    fallback_docs.append(Document(
                        page_content=chunk.get("text", ""),
                        metadata={
                            "id": chunk.get("id", ""),
                            "source": chunk.get("source", "unknown"),
                            "title": chunk.get("title") or chunk.get("source", "unknown"),
                            "source_url": chunk.get("source_url", ""),
                            "source_type": chunk.get("source_type", "local"),
                            "topic": chunk.get("topic", "unknown"),
                        },
                    ))
            except Exception as exc:
                print(f"[MuunganoHub] Could not load chunks fallback: {exc}")

        if not fallback_docs:
            raise FileNotFoundError(
                "No vector DB and no fallback knowledge documents found."
            )

        return Chroma.from_documents(
            documents=fallback_docs,
            embedding=self.embeddings,
            collection_name=COLLECTION_NAME,
            persist_directory=str(CHROMA_DIR),
        )
        
    def load_keyword_documents(self):
        if not CHUNKS_FILE.exists():
            return build_knowledge_documents()

        chunks = json.loads(CHUNKS_FILE.read_text(encoding="utf-8"))
        documents = []
        for chunk in chunks:
            metadata = {
                "id": chunk.get("id", ""),
                "source": chunk.get("source", "unknown"),
                "title": chunk.get("title") or chunk.get("source", "unknown"),
                "source_url": chunk.get("source_url", ""),
                "source_type": chunk.get("source_type", "local"),
                "topic": chunk.get("topic", "unknown"),
                "start_word": chunk.get("start_word", ""),
                "end_word": chunk.get("end_word", ""),
            }
            documents.append(Document(page_content=chunk.get("text", ""), metadata=metadata))

        documents.extend(build_knowledge_documents())
        return documents

    def contextualize_question(self, question):
        if not self.llm or not self.chat_history:
            return question

        chain = CONTEXTUALIZE_PROMPT | self.fast_llm | StrOutputParser()
        try:
            return chain.invoke({
                "chat_history": self.chat_history,
                "question": question,
            })
        except Exception:
            return question

    def retrieve(self, question, limit=None):
        result_limit = limit or TOP_K
        expanded_query = expand_query_for_retrieval(question)
        docs = self.vector_store.max_marginal_relevance_search(
            expanded_query,
            k=result_limit * 2,
            fetch_k=max(FETCH_K, result_limit * 4),
        )
        if expanded_query != question:
            docs.extend(
                self.vector_store.max_marginal_relevance_search(
                    question,
                    k=result_limit,
                    fetch_k=max(FETCH_K, result_limit * 3),
                )
            )
        if is_benefits_question(question):
            docs.extend(
                self.vector_store.max_marginal_relevance_search(
                    "faida manufaa umuhimu muhimu mafanikio muungano umoja usalama maendeleo ushirikiano",
                    k=result_limit * 2,
                    fetch_k=max(FETCH_K, result_limit * 4),
                )
            )
        elif is_why_union_formed_question(question):
            docs.extend(
                self.vector_store.max_marginal_relevance_search(
                    "sababu muungano waliungana Nyerere Karume hati articles 1964 April Aprili Cold War",
                    k=result_limit * 2,
                    fetch_k=max(FETCH_K, result_limit * 4),
                )
            )
        elif is_definition_question(question) and (
            "muungano" in normalize_question(question) or "union" in normalize_question(question)
        ):
            docs.extend(
                self.vector_store.max_marginal_relevance_search(
                    "Muungano ni tendo la nchi kadhaa serikali moja kuu mamlaka kikatiba",
                    k=result_limit * 2,
                    fetch_k=max(FETCH_K, result_limit * 4),
                )
            )

        docs.extend(self.keyword_search(question, limit=result_limit * 3))

        unique_docs = {}
        for doc in docs:
            key = doc.metadata.get("id") or (
                doc.metadata.get("source", ""),
                doc.metadata.get("start_word", ""),
                doc.page_content[:80],
            )
            unique_docs[key] = doc
        docs = list(unique_docs.values())

        question_tokens = expand_tokens(question)
        target_language = detect_language(question)
        benefits_query = is_benefits_question(question)
        definition_query = is_definition_question(question)

        def rank_doc(doc):
            doc_tokens = expand_tokens(doc.page_content)
            title_tokens = expand_tokens(doc.metadata.get("title", ""))
            source = doc.metadata.get("source", "").lower()
            title = doc.metadata.get("title", "").lower()
            topic = doc.metadata.get("topic", "").lower()
            language_bonus = sentence_language_score(doc.page_content[:600], target_language)
            score = (
                len(question_tokens & doc_tokens)
                + (len(question_tokens & title_tokens) * 2)
                + source_priority(doc, target_language)
                + language_bonus
            )

            if benefits_query:
                if "mambo22" in source or "faida" in source or "benefit" in source:
                    score += 12
                if "muungano" in source or "muungano" in title or topic == "union":
                    score += 6
                if doc_tokens & {"faida", "manufaa", "umuhimu", "muhimu", "mafanikio", "benefits", "importance", "important"}:
                    score += 5

            if definition_query and ("muungano" in normalize_question(question) or "union" in normalize_question(question)):
                if topic == "union" or "muungano" in source or "muungano" in title:
                    score += 8
                if "kitabu cha historia ya muungano" in source or "historia_ya_muungano" in source:
                    score += 25
                if re.search(r"\b(muungano|union)\s+(ni|is)\b", doc.page_content, re.IGNORECASE):
                    score += 10
                if "muungano ni tendo la nchi kadhaa" in doc.page_content.lower():
                    score += 40

            if is_union_matters_question(question):
                if "mambo22" in source:
                    score += 50
                if "katiba_ya_jmt" in source or "katiba ya jamhuri" in source:
                    score += 25
                if doc_tokens & {"mambo", "muungano", "union", "matters"}:
                    score += 10

            return score

        return sorted(docs, key=rank_doc, reverse=True)[:result_limit]

    def keyword_search(self, question, limit=None):
        if not self.keyword_documents:
            return []

        result_limit = limit or TOP_K
        question_tokens = expand_tokens(question)
        target_language = detect_language(question)
        ranked = []

        for doc in self.keyword_documents:
            doc_tokens = expand_tokens(doc.page_content)
            title_tokens = expand_tokens(doc.metadata.get("title", ""))
            source = doc.metadata.get("source", "").lower()
            title = doc.metadata.get("title", "").lower()
            topic = doc.metadata.get("topic", "").lower()
            score = (
                len(question_tokens & doc_tokens) * 3
                + len(question_tokens & title_tokens) * 5
                + source_priority(doc, target_language)
            )

            if is_union_date_question(question):
                if "1964" in doc.page_content:
                    score += 10
                if "articles" in title or "muungano" in source:
                    score += 8

            if is_benefits_question(question):
                if "mambo22" in source or "muungano" in source or topic == "union":
                    score += 10
                if doc_tokens & {"faida", "manufaa", "umuhimu", "muhimu", "mafanikio", "benefits", "importance", "important"}:
                    score += 8

            if is_revolution_question(question):
                if "zanzibar revolution" in title or "mapinduzi" in doc.page_content.lower():
                    score += 12
                if "zanzibar" in source or "zanzibar" in title:
                    score += 6

            if is_union_matters_question(question):
                if "mambo22" in source or "katiba" in source.lower() or topic == "constitution":
                    score += 12
                if "mambo22" in source:
                    score += 50
                if "katiba_ya_jmt" in source or "katiba ya jamhuri" in source:
                    score += 25
                if doc_tokens & {"mambo", "muungano", "union", "matters"}:
                    score += 8

            if is_definition_question(question) and (
                "muungano" in normalize_question(question) or "union" in normalize_question(question)
            ):
                if "kitabu cha historia ya muungano" in source or "historia_ya_muungano" in source:
                    score += 25
                if "muungano ni tendo la nchi kadhaa" in doc.page_content.lower():
                    score += 40

            if score > 0:
                ranked.append((score, doc))

        ranked.sort(key=lambda item: item[0], reverse=True)
        return [doc for _, doc in ranked[:result_limit]]

    def direct_definition_answer(self, question):
        if not is_definition_question(question):
            return None
        normalized = normalize_question(question)
        if "muungano" not in normalized and "union" not in normalized:
            return None

        language = detect_language(question)
        if language == "en":
            answer = (
                "**What is a Union?**\n\n"
                "A union is a formal arrangement where two or more independent states agree "
                "to surrender all or part of their sovereignty to a single central government, "
                "which exercises authority under specific constitutional conditions. The Union "
                "combines the political, economic, and social strength of its members into one "
                "unified republic.\n\n"
                "**The Union of Tanzania**\n\n"
                "The United Republic of Tanzania was formed on 26 April 1964 when Tanganyika "
                "and Zanzibar merged into one country. This Union was created through the "
                "Articles of Union — a legal document signed by Julius Nyerere (President of "
                "Tanganyika) and Abeid Amani Karume (President of Zanzibar). The Union covers "
                "areas such as defence, foreign affairs, citizenship, and taxation, while "
                "Zanzibar retains autonomy in its internal affairs through the Zanzibar "
                "Revolutionary Government.\n\n"
                "**Why It Matters to Youth**\n\n"
                "Understanding the Union means understanding who you are as a Tanzanian citizen. "
                "The Union is not just a political structure — it represents the shared identity, "
                "peace, and unity of over 60 million people. As youth, you are the guardians of "
                "this Union and responsible for preserving the values of cooperation and national "
                "unity it stands for."
            )
        else:
            answer = (
                "**Muungano ni Nini?**\n\n"
                "Muungano ni makubaliano rasmi ambapo nchi mbili au zaidi zinazokuwa huru "
                "zinakubali kuachia mamlaka yao yote au sehemu yake kwa serikali moja kuu, "
                "ambayo inatekeleza mamlaka hayo chini ya masharti maalum ya kikatiba. "
                "Muungano unaunganisha nguvu za kisiasa, kiuchumi na kijamii za nchi wanachama "
                "kuunda jamhuri moja imara.\n\n"
                "**Muungano wa Tanzania**\n\n"
                "Jamhuri ya Muungano wa Tanzania iliundwa tarehe 26 Aprili 1964 wakati Tanganyika "
                "na Zanzibar zilipounganika kuwa nchi moja. Muungano huu uliundwa kupitia Hati za "
                "Muungano — hati ya kisheria iliyosainiwa na Julius Nyerere (Rais wa Tanganyika) "
                "na Abeid Amani Karume (Rais wa Zanzibar). Muungano unashughulikia maeneo kama "
                "ulinzi, mambo ya nje, uraia, na kodi, wakati Zanzibar inabaki na uhuru wake "
                "wa mambo ya ndani kupitia Serikali ya Mapinduzi ya Zanzibar.\n\n"
                "**Kwa Nini Hii Ni Muhimu kwa Vijana?**\n\n"
                "Kuelewa Muungano kunamaanisha kuelewa ni nani wewe kama raia wa Tanzania. "
                "Muungano si muundo wa kisiasa tu — unawakilisha utambulisho wa pamoja, amani, "
                "na umoja wa Watanzania zaidi ya milioni 60. Kama vijana, nyinyi ndio walinzi "
                "wa Muungano huu na mnawajibika kulinda maadili ya ushirikiano na umoja wa "
                "kitaifa unaowakilishwa na Muungano."
            )
        sources = (
            "Sources:\n" if language == "en" else "Vyanzo:\n"
        ) + (
            "[1] Hati za Muungano wa Tanganyika na Zanzibar (1964) | Aina: Hati Rasmi\n"
            "[2] Historia ya Muungano wa Tanzania | Aina: Kitabu cha Historia\n"
            "[3] Katiba ya Jamhuri ya Muungano wa Tanzania | Aina: Katiba"
        )
        return f"{answer}\n\n{sources}"

    def direct_why_union_formed_answer(self, question):
        if not is_why_union_formed_question(question):
            return None

        language = detect_language(question)
        if language == "en":
            answer = (
                "**Why Did Tanganyika and Zanzibar Unite?**\n\n"
                "The Union of Tanganyika and Zanzibar in 1964 was driven by a combination of "
                "political necessity, shared African ideals, and the urgent security needs of "
                "the time. Both nations had recently gained independence — Tanganyika in 1961 "
                "and Zanzibar in December 1963 — but they faced instability that threatened "
                "their futures.\n\n"
                "**Key Reasons for the Union**\n\n"
                "1. **The Zanzibar Revolution (January 1964):** Just one month after independence, "
                "Zanzibar experienced a violent revolution that overthrew the Arab-led sultanate "
                "and established a new government under Abeid Amani Karume. The new government "
                "was seen as potentially aligning with Cuba and the Soviet Union during the Cold War, "
                "which alarmed both Western powers and Julius Nyerere of Tanganyika.\n\n"
                "2. **Cold War pressures:** The United States and Britain were deeply concerned "
                "about a communist-aligned Zanzibar sitting in the Indian Ocean. Nyerere, committed "
                "to Pan-Africanism and non-alignment, saw a Union as the best way to stabilise "
                "Zanzibar and prevent foreign interference.\n\n"
                "3. **Pan-African ideals:** Both Nyerere and Karume shared a vision of African "
                "unity. The Union of Tanganyika and Zanzibar was seen as a practical step toward "
                "the broader dream of a united Africa — starting with East Africa.\n\n"
                "4. **Mutual security and strength:** A united republic would be stronger in "
                "international negotiations, more resilient against internal and external threats, "
                "and better positioned to pursue economic development.\n\n"
                "**The Result**\n\n"
                "The Articles of Union were signed on 22 April 1964 by Nyerere and Karume, and "
                "the United Republic of Tanzania was officially proclaimed on 26 April 1964 — "
                "now celebrated as Union Day (Siku ya Muungano)."
            )
        else:
            answer = (
                "**Kwani Tanganyika na Zanzibar Waliungana?**\n\n"
                "Muungano wa Tanganyika na Zanzibar mwaka 1964 ulisababishwa na mchanganyiko "
                "wa haja ya kisiasa, maadili ya Kiafrika ya pamoja, na mahitaji ya haraka ya "
                "usalama wa wakati huo. Nchi zote mbili zilikuwa zimepata uhuru hivi karibuni — "
                "Tanganyika mwaka 1961 na Zanzibar Desemba 1963 — lakini zilikabiliwa na "
                "msukosuko uliotishia mustakabali wao.\n\n"
                "**Sababu Kuu za Muungano**\n\n"
                "1. **Mapinduzi ya Zanzibar (Januari 1964):** Mwezi mmoja tu baada ya uhuru, "
                "Zanzibar ilipitia mapinduzi ya kijeshi yaliyopindua usultani wa Kiarabu na "
                "kuanzisha serikali mpya chini ya Abeid Amani Karume. Serikali mpya ilionekana "
                "kama inaweza kushirikiana na Cuba na Umoja wa Kisovyeti wakati wa Vita Baridi, "
                "jambo ambalo lilisumbua nguvu za Magharibi na Julius Nyerere wa Tanganyika.\n\n"
                "2. **Shinikizo la Vita Baridi:** Marekani na Uingereza walikuwa na wasiwasi "
                "mkubwa kuhusu Zanzibar inayoweza kushirikiana na ukomunisti ikikaa Bahari ya "
                "Hindi. Nyerere, aliyejitolea kwa Pan-Africanism na kutokushikamana na nguvu "
                "zozote, aliona Muungano kama njia bora ya kulitulia Zanzibar na kuzuia "
                "uingiliaji kati wa kigeni.\n\n"
                "3. **Maadili ya Pan-Afrika:** Nyerere na Karume wote walikuwa na ndoto ya "
                "umoja wa Afrika. Muungano wa Tanganyika na Zanzibar ulioonekana kama hatua "
                "ya vitendo kuelekea ndoto pana ya Afrika iliyounganika — kuanza na Afrika "
                "Mashariki.\n\n"
                "4. **Usalama na nguvu za pamoja:** Jamhuri iliyounganika ingekuwa na nguvu "
                "zaidi katika mazungumzo ya kimataifa, ingekuwa imara zaidi dhidi ya vitisho "
                "vya ndani na nje, na ingeweza kupata maendeleo ya kiuchumi vizuri zaidi.\n\n"
                "**Matokeo**\n\n"
                "Hati za Muungano zilisainiwa tarehe 22 Aprili 1964 na Nyerere na Karume, "
                "na Jamhuri ya Muungano wa Tanzania ilitangazwa rasmi tarehe 26 Aprili 1964 — "
                "siku ambayo sasa inaadhimishwa kama Siku ya Muungano."
            )
        sources = (
            "Sources:\n" if language == "en" else "Vyanzo:\n"
        ) + (
            "[1] Historia ya Muungano wa Tanganyika na Zanzibar | Aina: Kitabu cha Historia\n"
            "[2] Hati za Muungano (1964) — Nyerere na Karume | Aina: Hati Rasmi\n"
            "[3] Muktadha wa Kisiasa wa Afrika Mashariki (1961–1964) | Aina: Makala ya Kihistoria"
        )
        return f"{answer}\n\n{sources}"

    def direct_tanganyika_zanzibar_union_answer(self, question):
        if not is_tanganyika_zanzibar_union_question(question):
            return None

        language = detect_language(question)
        if language == "en":
            answer = (
                "The Union of Tanganyika and Zanzibar was the union of two independent states: "
                "the Republic of Tanganyika and the People's Republic of Zanzibar. The Articles "
                "of Union were signed by Julius Nyerere and Abeid Amani Karume on 22 April 1964, "
                "and 26 April 1964 became the official Union day. The Union created the United "
                "Republic, later known as the United Republic of Tanzania."
            )
            heading = "Sources"
        else:
            answer = (
                "Muungano wa Tanganyika na Zanzibar ni muungano wa nchi mbili zilizokuwa huru: "
                "Jamhuri ya Tanganyika na Jamhuri ya Watu wa Zanzibar. Hati za Muungano "
                "zilisainiwa na Julius Nyerere na Abeid Amani Karume tarehe 22 Aprili 1964, "
                "na tarehe 26 Aprili 1964 ikawa siku rasmi ya Muungano. Muungano huu uliunda "
                "Jamhuri ya Muungano, ambayo baadaye ilijulikana kama Jamhuri ya Muungano wa Tanzania."
            )
            heading = "Vyanzo"

        return (
            f"{answer}\n\n"
            f"{heading}:\n"
            "[Source 1] historia_ya_muungano | URL: local file\n"
            "[Source 2] Kitabu cha Historia ya Muungano wa Tanganyika na Zanzibar | URL: local file"
        )

    def direct_benefits_answer(self, question):
        if not is_benefits_question(question):
            return None

        language = detect_language(question)
        if language == "en":
            answer = (
                "According to the indexed Union references, the importance and benefits of the Union include: "
                "strengthening national unity and cooperation between Tanzania Mainland and Zanzibar; "
                "supporting peace, defence, and security through Union institutions; "
                "expanding economic cooperation, trade, transport, and international representation; "
                "supporting shared services such as citizenship, immigration, higher education, postal "
                "and communication systems; and creating a stronger collective voice in regional and "
                "international affairs."
            )
            heading = "Sources"
        else:
            answer = (
                "Kwa mujibu wa nyaraka zilizopo, umuhimu na faida za Muungano ni pamoja na: "
                "kuimarisha umoja na ushirikiano kati ya Tanzania Bara na Zanzibar; "
                "kudumisha amani, ulinzi na usalama kupitia taasisi za Muungano; "
                "kukuza ushirikiano wa kiuchumi, biashara, usafiri na uwakilishi wa kimataifa; "
                "kurahisisha huduma za pamoja kama uraia, uhamiaji, elimu ya juu, posta na mawasiliano; "
                "na kuipa nchi nguvu ya pamoja katika masuala ya kikanda na kimataifa."
            )
            heading = "Vyanzo"

        return (
            f"{answer}\n\n"
            f"{heading}:\n"
            "[Source 1] mambo22_ya_muungano | URL: local file\n"
            "[Source 2] Kitabu cha Historia ya Muungano wa Tanganyika na Zanzibar | URL: local file"
        )

    def direct_union_date_answer(self, question):
        if not is_union_date_question(question):
            return None

        language = detect_language(question)
        if language == "en":
            answer = (
                "The Union of Tanganyika and Zanzibar was agreed through the Articles "
                "of Union signed on 22 April 1964 by Julius Nyerere and Abeid Amani "
                "Karume. The Union became officially commemorated on 26 April 1964, "
                "when the United Republic was formed."
            )
            heading = "Sources"
        else:
            answer = (
                "Muungano wa Tanganyika na Zanzibar ulitokana na Hati za Muungano "
                "zilizosainiwa tarehe 22 Aprili 1964 na Julius Nyerere pamoja na "
                "Abeid Amani Karume. Tarehe 26 Aprili 1964 ndiyo siku rasmi "
                "inayotambulika kwa kuundwa kwa Jamhuri ya Muungano."
            )
            heading = "Vyanzo"

        return (
            f"{answer}\n\n"
            f"{heading}:\n"
            "[Source 1] historia_ya_muungano | URL: local file\n"
            "[Source 2] Kitabu cha Historia ya Muungano wa Tanganyika na Zanzibar | URL: local file\n"
            "[Source 3] Articles of Union | URL: https://en.wikipedia.org/wiki/Articles_of_Union"
        )

    def direct_revolution_answer(self, question):
        if not is_revolution_question(question):
            return None

        language = detect_language(question)
        if language == "en":
            answer = (
                "The Zanzibar Revolution took place in January 1964. It overthrew the "
                "Sultanate of Zanzibar and led to the creation of a revolutionary "
                "government headed by Abeid Amani Karume. This new Zanzibar government "
                "later negotiated the Union with Tanganyika, which led to the United "
                "Republic in April 1964."
            )
            heading = "Sources"
        else:
            answer = (
                "Mapinduzi ya Zanzibar yalifanyika Januari 1964. Mapinduzi hayo "
                "yaliuangusha utawala wa Sultani wa Zanzibar na kuanzisha Serikali "
                "ya Mapinduzi iliyoongozwa na Abeid Amani Karume. Baadaye Serikali "
                "hiyo ya Zanzibar ilijadiliana na Tanganyika kuhusu Muungano, "
                "uliounda Jamhuri ya Muungano mwezi Aprili 1964."
            )
            heading = "Vyanzo"

        return (
            f"{answer}\n\n"
            f"{heading}:\n"
            "[Source 1] Kitabu cha Historia ya Muungano wa Tanganyika na Zanzibar | URL: local file\n"
            "[Source 2] Zanzibar Revolution | URL: https://en.wikipedia.org/wiki/Zanzibar_Revolution\n"
            "[Source 3] People's Republic of Zanzibar | URL: https://en.wikipedia.org/wiki/People%27s_Republic_of_Zanzibar"
        )

    def direct_union_matters_answer(self, question):
        if not is_union_matters_question(question):
            return None

        language = detect_language(question)
        if language == "en":
            answer = (
                "Union matters are the areas handled by the Government of the United "
                "Republic for both Tanzania Mainland and Zanzibar under the constitutional "
                "Union framework. They include matters such as the Constitution and "
                "Government of the United Republic, foreign affairs, defence and security, "
                "police, citizenship and immigration, external borrowing and trade, income "
                "tax and customs, ports, civil aviation, posts and telecommunications, "
                "currency, higher education, statistics, the Court of Appeal, political "
                "parties, and other matters listed in the Union framework."
            )
            heading = "Sources"
        else:
            answer = (
                "Mambo ya Muungano ni maeneo yanayoshughulikiwa na Serikali ya Jamhuri "
                "ya Muungano kwa niaba ya Tanzania Bara na Zanzibar chini ya mfumo wa "
                "kikatiba wa Muungano. Mambo hayo yanahusisha maeneo kama Katiba na "
                "Serikali ya Jamhuri ya Muungano, mambo ya nje, ulinzi na usalama, "
                "polisi, uraia na uhamiaji, mikopo na biashara ya nje, kodi na forodha, "
                "bandari, usafiri wa anga, posta na mawasiliano, sarafu, elimu ya juu, "
                "takwimu, Mahakama ya Rufani, vyama vya siasa na mambo mengine "
                "yaliyoainishwa katika mfumo wa Muungano."
            )
            heading = "Vyanzo"

        return (
            f"{answer}\n\n"
            f"{heading}:\n"
            "[Source 1] mambo22_ya_muungano | URL: local file\n"
            "[Source 2] Katiba_ya_JMT_1977 | URL: local file\n"
            "[Source 3] Katiba ya Jamhuri ya Muungano wa Tanzania _English Version_ 2009 | URL: local file"
        )

    def direct_person_answer(self, question):
        language = detect_language(question)

        if is_person_question(question, {"abeid", "karume", "amani karume"}):
            if language == "en":
                answer = (
                    "Abeid Amani Karume was a Tanzanian/Zanzibari leader who became "
                    "President of Zanzibar and Chairman of the Revolutionary Council "
                    "after the Zanzibar Revolution. In the Union of Tanganyika and "
                    "Zanzibar, he was one of the two founders who signed the Articles "
                    "of Union with Julius Nyerere on 22 April 1964, and he later served "
                    "as Vice-President of the United Republic."
                )
                heading = "Sources"
            else:
                answer = (
                    "Abeid Amani Karume alikuwa kiongozi wa Zanzibar aliyekuwa Rais wa "
                    "Zanzibar na Mwenyekiti wa Baraza la Mapinduzi baada ya Mapinduzi "
                    "ya Zanzibar. Katika Muungano wa Tanganyika na Zanzibar, alikuwa "
                    "mmoja wa waasisi wawili waliotia saini Hati za Muungano pamoja na "
                    "Julius Nyerere tarehe 22 Aprili 1964, na baadaye alikuwa Makamu "
                    "wa Rais wa Jamhuri ya Muungano."
                )
                heading = "Vyanzo"

            return (
                f"{answer}\n\n"
                f"{heading}:\n"
                "[Source 1] historia_ya_muungano | URL: local file\n"
                "[Source 2] Abeid Karume | URL: https://en.wikipedia.org/wiki/Abeid_Karume"
            )

        if is_person_question(question, {"julius", "nyerere", "mwalimu"}):
            if language == "en":
                answer = (
                    "Julius Kambarage Nyerere was the first President of Tanganyika "
                    "and later the first President of the United Republic of Tanzania. "
                    "He was one of the founders of the Union of Tanganyika and Zanzibar, "
                    "signing the Articles of Union with Abeid Amani Karume on 22 April "
                    "1964. He is widely known as Mwalimu and is associated with Tanzania's "
                    "independence, unity, and early nation-building."
                )
                heading = "Sources"
            else:
                answer = (
                    "Julius Kambarage Nyerere alikuwa Rais wa kwanza wa Tanganyika na "
                    "baadaye Rais wa kwanza wa Jamhuri ya Muungano wa Tanzania. Alikuwa "
                    "mmoja wa waasisi wa Muungano wa Tanganyika na Zanzibar, akitia saini "
                    "Hati za Muungano pamoja na Abeid Amani Karume tarehe 22 Aprili 1964. "
                    "Anajulikana pia kama Mwalimu na anahusishwa na uhuru, umoja na ujenzi "
                    "wa taifa la Tanzania."
                )
                heading = "Vyanzo"

            return (
                f"{answer}\n\n"
                f"{heading}:\n"
                "[Source 1] historia_ya_muungano | URL: local file\n"
                "[Source 2] Julius Nyerere | URL: https://en.wikipedia.org/wiki/Julius_Nyerere"
            )

        if is_person_question(question, {"rashidi", "rashid", "kawawa", "rashidi kawawa"}):
            if language == "en":
                answer = (
                    "Rashidi Mfaume Kawawa was an important Tanzanian leader connected "
                    "to Tanganyika and the early United Republic. He served in senior "
                    "government roles and is remembered for his contribution to early "
                    "nation-building and administration after independence and around "
                    "the Union period."
                )
                heading = "Sources"
            else:
                answer = (
                    "Rashidi Mfaume Kawawa alikuwa kiongozi muhimu wa Tanzania "
                    "aliyehusika katika uongozi wa Tanganyika na hatua za mwanzo za "
                    "Jamhuri ya Muungano. Alishika nafasi za juu serikalini na "
                    "anakumbukwa kwa mchango wake katika ujenzi wa taifa na utawala "
                    "baada ya uhuru na kipindi cha awali cha Muungano."
                )
                heading = "Vyanzo"

            return (
                f"{answer}\n\n"
                f"{heading}:\n"
                "[Source 1] tanzania_leaders | URL: local file\n"
                "[Source 2] Rashidi Kawawa | URL: https://en.wikipedia.org/wiki/Rashidi_Kawawa"
            )

        return None

    def direct_leaders_answer(self, question):
        normalized = normalize_question(question)
        language = detect_language(question)
        leader_terms = {
            "leader", "leaders", "president", "presidents", "current president", "current presidents",
            "kiongozi", "viongozi", "rais", "marais", "rais wa sasa", "viongozi wa sasa",
        }
        country_terms = {"tanzania", "zanzibar", "muungano", "union", "jamhuri"}

        if not any(term in normalized for term in leader_terms):
            return None
        if not any(term in normalized for term in country_terms):
            return None

        current_query = any(term in normalized for term in {
            "current", "present", "sasa", "wa sasa", "currently", "in office",
        })

        if language == "en":
            heading = "Sources"
            if current_query:
                answer = (
                    "The current President of the United Republic of Tanzania is H.E. Dr. Samia Suluhu Hassan.\n"
                    "The current President of Zanzibar and Chairman of the Revolutionary Council is H.E. Dr. Hussein Ali Mwinyi.\n"
                    "Samia Suluhu Hassan has been in office since 19 March 2021.\n"
                    "Hussein Ali Mwinyi has been in office since 3 November 2020.\n"
                    "Together, these offices show the continuing leadership structure of the Union and Zanzibar within the United Republic."
                )
            else:
                answer = (
                    "MuunganoHub lists 13 key leaders connected to Tanzania, Zanzibar, and Union history.\n"
                    "The founders and first leaders are Julius Kambarage Nyerere and Abeid Amani Karume.\n"
                    "The current leaders are Samia Suluhu Hassan for the United Republic of Tanzania and Hussein Ali Mwinyi for Zanzibar.\n"
                    "Previous Presidents of Tanzania shown are Ali Hassan Mwinyi, Benjamin Mkapa, Jakaya Kikwete, and John Magufuli.\n"
                    "Previous Presidents of Zanzibar shown are Aboud Jumbe, Idris Abdul Wakil, Salmin Amour, Amani Abeid Karume, and Ali Mohamed Shein."
                )
        else:
            heading = "Vyanzo"
            if current_query:
                answer = (
                    "Rais wa sasa wa Jamhuri ya Muungano wa Tanzania ni H.E. Dr. Samia Suluhu Hassan.\n"
                    "Rais wa sasa wa Zanzibar na Mwenyekiti wa Baraza la Mapinduzi ni H.E. Dr. Hussein Ali Mwinyi.\n"
                    "Samia Suluhu Hassan yuko madarakani tangu 19 Machi 2021.\n"
                    "Hussein Ali Mwinyi yuko madarakani tangu 3 Novemba 2020.\n"
                    "Nafasi hizi mbili zinaonyesha muundo wa uongozi wa Muungano na nafasi ya Zanzibar ndani ya Jamhuri ya Muungano."
                )
            else:
                answer = (
                    "MuunganoHub inaonyesha viongozi 13 muhimu wanaohusiana na historia ya Tanzania, Zanzibar na Muungano.\n"
                    "Waasisi na viongozi wa kwanza ni Julius Kambarage Nyerere na Abeid Amani Karume.\n"
                    "Viongozi wa sasa ni Samia Suluhu Hassan kwa Jamhuri ya Muungano wa Tanzania na Hussein Ali Mwinyi kwa Zanzibar.\n"
                    "Marais waliotangulia wa Tanzania walioonyeshwa ni Ali Hassan Mwinyi, Benjamin Mkapa, Jakaya Kikwete na John Magufuli.\n"
                    "Marais waliotangulia wa Zanzibar walioonyeshwa ni Aboud Jumbe, Idris Abdul Wakil, Salmin Amour, Amani Abeid Karume na Ali Mohamed Shein."
                )

        return (
            f"{answer}\n\n"
            f"{heading}:\n"
            "[Source 1] MuunganoHub Leaders Dataset | Source Type: Curated project content\n"
            "[Source 2] Tanzania and Zanzibar leader reference pages | Source Type: External reference links"
        )

    def teach_answer(self, question):
        if not is_teach_question(question):
            return None

        language = detect_language(question)
        area_key = get_learning_area(question)
        title, text = get_area_text(area_key, language)
        if not title or not text:
            return None

        if language == "en":
            answer = (
                f"Let us learn step by step about {title}.\n\n"
                f"1. Main idea: {text}\n"
                "2. Why it matters: this topic helps young people understand the Union as a living national system, not only a historical event.\n"
                "3. What to remember: connect the facts to the Union date, founders, constitutional framework, benefits, and youth opportunities.\n"
                "4. Try this: ask a follow-up question or take the Muungano Challenge quiz to test your understanding.\n\n"
                "Sources:\n"
                "[Source 1] MuunganoHub Knowledge Base | Source Type: Curated Union Education\n"
                "[Source 2] Government publications and indexed Union documents | Source Type: Official/local references"
            )
        else:
            answer = (
                f"Tujifunze hatua kwa hatua kuhusu {title}.\n\n"
                f"1. Wazo kuu: {text}\n"
                "2. Kwa nini ni muhimu: mada hii humsaidia kijana kuelewa Muungano kama mfumo hai wa kitaifa, si tukio la historia pekee.\n"
                "3. Cha kukumbuka: unganisha ukweli na tarehe ya Muungano, waasisi, mfumo wa katiba, faida na fursa kwa vijana.\n"
                "4. Jaribu sasa: uliza swali la kufuatilia au cheza Muungano Challenge kupima uelewa wako.\n\n"
                "Vyanzo:\n"
                "[Source 1] MuunganoHub Knowledge Base | Aina ya Chanzo: Elimu ya Muungano iliyoratibiwa\n"
                "[Source 2] Machapisho ya Serikali na nyaraka za Muungano zilizopo | Aina ya Chanzo: Rasmi/local references"
            )

        return answer

    def direct_faq_answer(self, question):
        language = detect_language(question)
        question_tokens = expand_tokens(question)
        best_entry = None
        best_score = 0

        for entry in FAQ_ENTRIES:
            question_sw, question_en, answer_sw, answer_en, topic = entry
            entry_tokens = expand_tokens(f"{question_sw} {question_en} {topic}")
            score = len(question_tokens & entry_tokens)
            if topic == "youth" and question_tokens & {"vijana", "youth", "student", "students", "wanafunzi", "ajira", "jobs", "fursa", "opportunities"}:
                score += 4
            if question_tokens & {"kabla", "before", "tawala", "aliyetawala", "alietawala", "ruled", "ruler"}:
                if "kabla" in question_sw.lower() or "before" in question_en.lower():
                    score += 5
            if question_tokens & {"tanganyika"} and "tanganyika" in f"{question_sw} {question_en}".lower():
                score += 4
            if question_tokens & {"zanzibar"} and "zanzibar" in f"{question_sw} {question_en}".lower():
                score += 4
            if topic == "benefits" and question_tokens & {"faida", "benefits", "manufaa", "umuhimu", "muhimu", "importance", "important", "value", "advantages"}:
                score += 4
            if topic == "economy" and question_tokens & {"biashara", "business", "trade", "uchumi", "economy", "entrepreneurship", "ujasiriamali"}:
                score += 7
            if topic == "challenges" and question_tokens & {"changamoto", "challenges"}:
                score += 4
            if score > best_score:
                best_score = score
                best_entry = entry

        if not best_entry or best_score < 3:
            return None

        question_sw, question_en, answer_sw, answer_en, topic = best_entry
        if language == "en":
            answer = answer_en
            heading = "Sources"
            question_label = question_en
        else:
            answer = answer_sw
            heading = "Vyanzo"
            question_label = question_sw

        return (
            f"{answer}\n\n"
            f"{heading}:\n"
            f"[Source 1] MuunganoHub FAQ Dataset | Topic: {topic} | Question: {question_label}\n"
            "[Source 2] MuunganoHub Knowledge Base | Source Type: Curated Union Education"
        )

    def extractive_answer(self, question, docs):
        question_tokens = expand_tokens(question)
        target_language = detect_language(question)
        ranked = []

        for doc in docs:
            for sentence in split_sentences(doc.page_content):
                sentence_tokens = expand_tokens(sentence)
                score = (
                    len(question_tokens & sentence_tokens)
                    + sentence_language_score(sentence, target_language)
                    + source_priority(doc, target_language)
                )

                if is_definition_question(question) and re.search(
                    r"\b(muungano|union)\s+(ni|is)\b",
                    sentence,
                    re.IGNORECASE,
                ):
                    score += 10

                if score >= 5:
                    ranked.append((score, sentence))

        ranked.sort(key=lambda item: item[0], reverse=True)
        selected = []
        seen = set()

        for _, sentence in ranked:
            normalized = " ".join(sentence.lower().split())
            if normalized in seen:
                continue
            selected.append(sentence)
            seen.add(normalized)
            if len(selected) == 3:
                break

        if not selected:
            return refusal_message(target_language)

        return " ".join(selected)

    def llm_domain_fallback(self, question, language):
        """
        Call OpenAI directly without retrieved context when retrieval is weak
        but the question is confirmed to be Union-related.
        Returns None if the LLM is not configured or the call fails.
        """
        client = get_openai_client()
        if client is None:
            return None

        if language == "sw":
            system = (
                "Wewe ni MuunganoHub AI Tutor. Jibu maswali yanayohusu Muungano wa "
                "Tanganyika na Zanzibar, historia yake, waasisi, taasisi, faida, "
                "changamoto, na mambo ya Muungano pekee.\n"
                "Toa jibu la kielimu, la kina, na sahihi kwa Kiswahili rahisi.\n"
                "Usibuni ukweli kama huna uhakika. Eleza kwa uangalifu na uadilifu.\n"
                "Jibu lako liwe na aya 2-4. Taja chanzo ukijua (kama Hati za Muungano, "
                "Katiba, historia rasmi). Kama hujui kwa uhakika, sema hivyo wazi."
            )
        else:
            system = (
                "You are MuunganoHub AI Tutor. Answer only questions about the Union "
                "of Tanganyika and Zanzibar, its history, founders, institutions, "
                "benefits, challenges, and Union matters.\n"
                "Give a clear, detailed, and accurate educational answer in English.\n"
                "Do not invent facts if unsure. Be careful and honest.\n"
                "Your answer should have 2-4 paragraphs. Cite sources you know "
                "(e.g. Articles of Union, Constitution, official history). "
                "If you are uncertain about a detail, say so clearly."
            )

        try:
            response = client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": question},
                ],
                temperature=0.1,
                max_tokens=900,
                timeout=30.0,
            )
            return response.choices[0].message.content.strip()
        except Exception:
            return None

    def ask(self, question):
        question = question.strip()
        language = detect_language(question)
        if not question:
            return empty_question_message()

        # ── Step 1: obvious out-of-scope (price, sport, weather, etc.) ────────
        if is_clearly_out_of_scope(question):
            return refusal_message(language)

        # ── Step 2: broad domain gate — non-Union questions refused politely ──
        if not is_domain_question(question):
            return refusal_message(language)

        # ── Step 3: trusted core facts via intent classifier (no LLM needed) ─
        intent = classify_union_intent(question)
        if intent != "unrelated":
            intent_answer = self.hybrid_answer(question, intent)
            if intent_answer:
                return self.finalize_answer(intent_answer, question, language)

        # ── Step 4: teach / learning mode ─────────────────────────────────────
        teach_answer = self.teach_answer(question)
        if teach_answer:
            return self.finalize_answer(teach_answer, question, language)

        # ── Step 5: specific direct knowledge answers ──────────────────────────
        #for handler in (
        #    self.direct_union_date_answer,
        #    self.direct_why_union_formed_answer,
        #    self.direct_tanganyika_zanzibar_union_answer,
        #    self.direct_benefits_answer,
        #    self.direct_leaders_answer,
        #    self.direct_faq_answer,
        #    self.direct_union_matters_answer,
        #    self.direct_revolution_answer,
        #    self.direct_person_answer,
        #    self.direct_definition_answer,
        #):
        #    direct = handler(question)
        #    if direct:
        #        return self.finalize_answer(direct, question, language)

        # ── Step 6: RAG retrieval (vector + keyword, query expansion) ─────────
        standalone_question = self.contextualize_question(question)
        docs = self.retrieve(standalone_question)

        # ── Step 7: LLM with retrieved context (best path when docs are good) ─
        if docs and enough_context(standalone_question, docs):
            llm_result = None
            try:
                llm_result = build_answer_from_context(
                    question=question,
                    docs=[doc.page_content for doc in docs],
                    metas=[doc.metadata for doc in docs],
                )
            except Exception:
                llm_result = None

            if llm_result:
                answer = llm_result["answer"]
                if re.search(r"\[\d+\]", answer):
                    source_heading = "Sources" if language == "en" else "Vyanzo"
                    lower_answer = answer.lower()
                    if "sources:" in lower_answer or "vyanzo:" in lower_answer:
                        answer_with_sources = answer
                    else:
                        answer_with_sources = f"{answer}\n\n{source_heading}:\n{format_sources(docs)}"
                    self.chat_history.append(HumanMessage(content=question))
                    self.chat_history.append(AIMessage(content=answer))
                    self.chat_history = self.chat_history[-20:]
                    return self.finalize_answer(answer_with_sources, question, language)

            # LangChain chain fallback (also uses retrieved context)
            if self.llm:
                chain = RAG_PROMPT | self.llm | StrOutputParser()
                try:
                    answer = chain.invoke({
                        "context": format_docs(docs),
                        "chat_history": self.chat_history,
                        "question": question,
                    })
                    if answer and len(answer.strip()) > 30:
                        source_heading = "Sources" if language == "en" else "Vyanzo"
                        lower_answer = answer.lower()
                        if "sources:" in lower_answer or "vyanzo:" in lower_answer:
                            answer_with_sources = answer
                        else:
                            answer_with_sources = f"{answer}\n\n{source_heading}:\n{format_sources(docs)}"
                        self.chat_history.append(HumanMessage(content=question))
                        self.chat_history.append(AIMessage(content=answer))
                        self.chat_history = self.chat_history[-20:]
                        return self.finalize_answer(answer_with_sources, question, language)
                except Exception:
                    pass

        # ── Step 8: LLM domain fallback — Union topic but weak/no retrieved context
        fallback_answer = None #self.llm_domain_fallback(question, language)
        #if fallback_answer:
        #    self.chat_history.append(HumanMessage(content=question))
        #    self.chat_history.append(AIMessage(content=fallback_answer))
        #    self.chat_history = self.chat_history[-20:]
        #    return self.finalize_answer(fallback_answer, question, language)

        # ── Step 9: extractive answer from whatever docs we have ──────────────
        if docs:
            extr = self.extractive_answer(standalone_question, docs)
            if extr:
                source_heading = "Sources" if language == "en" else "Vyanzo"
                lower_extr = extr.lower()
                if "sources:" in lower_extr or "vyanzo:" in lower_extr:
                    answer_with_sources = extr
                else:
                    answer_with_sources = f"{extr}\n\n{source_heading}:\n{format_sources(docs)}"
                self.chat_history.append(HumanMessage(content=question))
                self.chat_history.append(AIMessage(content=extr))
                self.chat_history = self.chat_history[-20:]
                return self.finalize_answer(answer_with_sources, question, language)

        # ── Step 10: final polite "not enough info" (never a harsh refusal) ───
        if language == "en":
            return (
                "I don't have enough information in my documents to answer this question "
                "with full confidence. Please try a more specific question about the Union "
                "of Tanganyika and Zanzibar, its history, founders, or institutions."
            )
        return (
            "Sina taarifa za kutosha kwenye nyaraka nilizonazo kujibu swali hilo kwa uhakika. "
            "Tafadhali jaribu swali lingine kuhusu historia ya Muungano wa Tanganyika na "
            "Zanzibar, waasisi wake, au taasisi zake."
        )


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    chatbot = RAGChatbot()

    console.print("\n[bold green]MuunganoHub RAG Chatbot Ready[/bold green]")
    console.print("Andika swali lako. Andika 'exit' kuacha.\n")

    while True:
        question = console.input("[bold cyan]Swali:[/bold cyan] ")
        if question.strip().lower() in {"exit", "quit", "q"}:
            console.print("[yellow]Goodbye![/yellow]")
            break

        answer = chatbot.ask(question)
        console.print("\n[bold green]Jibu:[/bold green]")
        console.print(Markdown(answer))
        console.print()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
MuunganoHub RAG quality test suite.

Run from the project root:
    python -m backend.test_rag_quality
Or directly:
    python backend/test_rag_quality.py
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from backend.rag_chatbot import RAGChatbot
except ImportError:
    from rag_chatbot import RAGChatbot

# ---------------------------------------------------------------------------
# Test definitions
# ---------------------------------------------------------------------------

# Union-related tests: answer should be non-empty, in correct language,
# contain key facts and at least one inline citation.
UNION_TESTS = [
    # ── Swahili ──────────────────────────────────────────────────────────────
    {
        "question": "Muungano ni nini?",
        "lang": "sw",
        "key_facts": ["1964", "tanganyika", "zanzibar"],
        "label": "[SW] Definition of Union",
    },
    {
        "question": "Muungano ulianzishwa lini?",
        "lang": "sw",
        "key_facts": ["1964", "aprili"],
        "label": "[SW] Date of Union",
    },
    {
        "question": "Nani walikuwa waasisi wa Muungano?",
        "lang": "sw",
        "key_facts": ["nyerere", "karume"],
        "label": "[SW] Founders of Union",
    },
    {
        "question": "Kwa nini Muungano uliundwa?",
        "lang": "sw",
        "key_facts": ["tanganyika", "zanzibar"],
        "label": "[SW] Why was the Union formed",
    },
    {
        "question": "Faida za Muungano ni zipi?",
        "lang": "sw",
        "key_facts": ["amani", "usalama"],
        "label": "[SW] Benefits of Union",
    },
    {
        "question": "Mambo ya Muungano ni yapi?",
        "lang": "sw",
        "key_facts": ["muungano", "zanzibar"],
        "label": "[SW] Union matters",
    },
    {
        "question": "Vijana wanafaidikaje na Muungano?",
        "lang": "sw",
        "key_facts": ["vijana", "muungano"],
        "label": "[SW] Youth and Union",
    },
    # ── English ──────────────────────────────────────────────────────────────
    {
        "question": "What is the Union?",
        "lang": "en",
        "key_facts": ["1964", "tanganyika", "zanzibar"],
        "label": "[EN] Definition of Union",
    },
    {
        "question": "When was the Union formed?",
        "lang": "en",
        "key_facts": ["1964", "april"],
        "label": "[EN] Date of Union",
    },
    {
        "question": "Who founded the Union?",
        "lang": "en",
        "key_facts": ["nyerere", "karume"],
        "label": "[EN] Founders of Union",
    },
    {
        "question": "Why was the Union formed?",
        "lang": "en",
        "key_facts": ["tanganyika", "zanzibar"],
        "label": "[EN] Why was the Union formed",
    },
    {
        "question": "What are the benefits of the Union?",
        "lang": "en",
        "key_facts": ["peace", "security"],
        "label": "[EN] Benefits of Union",
    },
    {
        "question": "What are Union matters?",
        "lang": "en",
        "key_facts": ["union", "zanzibar"],
        "label": "[EN] Union matters",
    },
    {
        "question": "Why should youth care about the Union?",
        "lang": "en",
        "key_facts": ["union", "tanzania"],
        "label": "[EN] Youth and Union",
    },
]

# Out-of-scope tests: answer should be a polite refusal in the correct language.
OOS_TESTS = [
    {
        "question": "Bei ya iPhone ni shilingi ngapi?",
        "lang": "sw",
        "label": "[SW-OOS] iPhone price",
        "refusal_markers": [
            "samahani",
            "halihusiani",
            "muungano",
        ],
    },
    {
        "question": "What is the price of Bitcoin today?",
        "lang": "en",
        "label": "[EN-OOS] Bitcoin price",
        "refusal_markers": [
            "sorry",
            "not related",
            "union",
        ],
    },
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
# Words that are EXCLUSIVELY Swahili (never appear in normal English text)
# Include high-frequency function words: ni, na, ya, wa, za, la, katika, etc.
SW_ONLY = {
    # function words / particles unique to Swahili
    "ni", "na", "ya", "wa", "za", "la", "cha", "kwa", "katika", "kama",
    "lakini", "pia", "zaidi", "pamoja", "moja", "tena", "ikiwa", "baada",
    "kabla", "hivyo", "bali", "au", "isipokuwa", "ingawa",
    # nouns / content words unique to Swahili
    "muungano", "nini", "lini", "nani", "vyanzo", "aprili", "faida",
    "usalama", "amani", "serikali", "jamhuri", "hati", "samahani",
    "tafadhali", "uliza", "katiba", "historia", "vijana", "changamoto",
    "jibu", "maelezo", "umuhimu", "taifa", "rasilimali", "uchumi",
    "ulinzi", "uhuru", "mwalimu", "mkuu", "rais", "tarehe", "mwaka",
    "nchi", "sababu", "zake", "yake", "wake", "wetu", "wao", "zetu",
    "pamoja", "msingi", "uongozi", "utawala", "ushirikiano", "sheria",
}
# Words that are EXCLUSIVELY English (never appear in normal Swahili text)
EN_ONLY = {
    "the", "was", "were", "is", "are", "of", "and", "with", "for",
    "by", "an", "its", "this", "their", "that", "at", "on",
    "from", "has", "have", "been", "also", "both", "which", "these",
    "sources", "april", "republic", "government", "independence",
    "benefits", "sorry", "please", "ask", "constitution", "challenges",
    "youth", "formed", "signed", "president", "between",
    "including", "national", "economic", "political", "direct", "answer",
    "explanation", "citizens", "opportunities",
}

GREEN = "\033[92m"
RED   = "\033[91m"
RESET = "\033[0m"
PASS  = f"{GREEN}PASS{RESET}"
FAIL  = f"{RED}FAIL{RESET}"


def _lang(text: str) -> str:
    """Language detector — scores body only, strips sources section to avoid Swahili titles skewing EN answers."""
    body = re.split(r"\n\s*(?:sources?|vyanzo)\s*:", text, maxsplit=1, flags=re.IGNORECASE)[0]
    words = set(re.findall(r"\w+", body.lower()))
    sw = len(words & SW_ONLY)
    en = len(words & EN_ONLY)
    return "sw" if sw > en else "en"


def _has_citation(text: str) -> bool:
    return bool(re.search(r"\[\d+\]|\[source\s*\d+\]", text, re.IGNORECASE))


def _has_sources_section(text: str) -> bool:
    lower = text.lower()
    return "sources:" in lower or "vyanzo:" in lower


def _duplicate_sources(text: str) -> bool:
    lower = text.lower()
    return lower.count("sources:") > 1 or lower.count("vyanzo:") > 1


def _run_union(bot: RAGChatbot, case: dict) -> tuple[bool, list]:
    """Run one Union-topic test; return (passed, checks)."""
    q, lang, facts = case["question"], case["lang"], case["key_facts"]
    checks: list[tuple[str, bool]] = []

    try:
        answer = bot.ask(q)
    except Exception as exc:
        checks.append((f"no crash  [ERROR: {exc}]", False))
        return False, checks

    al = answer.lower()

    # 1. Not empty
    checks.append(("not empty (>50 chars)", len(answer.strip()) > 50))

    # 2. Not a generic refusal  (only flagged if NONE of the key words appear)
    refusal_phrases = [
        "samahani, swali hilo halihusiani",
        "sorry, that question is not related",
    ]
    is_generic_refusal = any(p in al for p in refusal_phrases)
    checks.append(("not generic refusal", not is_generic_refusal))

    # 3. Key fact present (at least one)
    found = [f for f in facts if f.lower() in al]
    checks.append((f"key facts present ({', '.join(found) or 'none'})", bool(found)))

    # 4. Inline citation
    checks.append(("has inline citation [N]", _has_citation(answer)))

    # 5. Has sources section
    checks.append(("has Sources/Vyanzo section", _has_sources_section(answer)))

    # 6. No duplicate sources section
    checks.append(("no duplicate Sources section", not _duplicate_sources(answer)))

    # 7. Language match
    detected = _lang(answer)
    checks.append((f"language match (detected={detected}, expected={lang})", detected == lang))

    return all(ok for _, ok in checks), checks


def _run_oos(bot: RAGChatbot, case: dict) -> tuple[bool, list]:
    """Run one out-of-scope test; return (passed, checks)."""
    q, lang = case["question"], case["lang"]
    markers = case["refusal_markers"]
    checks: list[tuple[str, bool]] = []

    try:
        answer = bot.ask(q)
    except Exception as exc:
        checks.append((f"no crash  [ERROR: {exc}]", False))
        return False, checks

    al = answer.lower()

    # 1. Contains refusal markers
    found_markers = [m for m in markers if m in al]
    checks.append((
        f"refusal markers present ({', '.join(found_markers) or 'none'})",
        len(found_markers) >= 2,
    ))

    # 2. Does NOT contain domain content (should not hallucinate a Union answer)
    has_domain = "1964" in al and ("tanganyika" in al or "zanzibar" in al)
    checks.append(("not a domain answer", not has_domain))

    # 3. Language of refusal matches query language
    detected = _lang(answer)
    checks.append((f"refusal language match (detected={detected}, expected={lang})", detected == lang))

    # 4. No crash (already handled above)
    checks.append(("no crash", True))

    return all(ok for _, ok in checks), checks


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------
def run_tests() -> bool:
    print("=" * 70)
    print("  MuunganoHub RAG Quality Test Suite")
    print("=" * 70)

    try:
        bot = RAGChatbot()
    except Exception as exc:
        print(f"\n{FAIL}  Could not initialise RAGChatbot: {exc}")
        return False

    total_passed = 0
    total_failed = 0

    # ── Union-topic tests ─────────────────────────────────────────────────────
    print(f"\n{'─'*70}")
    print("  UNION-TOPIC TESTS  (expect detailed answers with citations)")
    print(f"{'─'*70}")

    for case in UNION_TESTS:
        label = case["label"]
        passed, checks = _run_union(bot, case)
        status = PASS if passed else FAIL
        if passed:
            total_passed += 1
        else:
            total_failed += 1
        print(f"\n{label}")
        print(f"  Q: {case['question']}")
        print(f"  {status}")
        for check_label, ok in checks:
            icon = "  ✓" if ok else "  ✗"
            print(f"    {icon} {check_label}")

    # ── Out-of-scope tests ────────────────────────────────────────────────────
    print(f"\n{'─'*70}")
    print("  OUT-OF-SCOPE TESTS  (expect polite refusal in correct language)")
    print(f"{'─'*70}")

    for case in OOS_TESTS:
        label = case["label"]
        passed, checks = _run_oos(bot, case)
        status = PASS if passed else FAIL
        if passed:
            total_passed += 1
        else:
            total_failed += 1
        print(f"\n{label}")
        print(f"  Q: {case['question']}")
        print(f"  {status}")
        for check_label, ok in checks:
            icon = "  ✓" if ok else "  ✗"
            print(f"    {icon} {check_label}")

    # ── Summary ───────────────────────────────────────────────────────────────
    total = total_passed + total_failed
    print(f"\n{'='*70}")
    print(f"  Results: {total_passed} passed, {total_failed} failed / {total} total")
    print(f"{'='*70}\n")
    return total_failed == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)

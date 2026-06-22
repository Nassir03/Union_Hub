# MuunganoHub

MuunganoHub is an AI-powered digital education platform for teaching young people about the Union of Tanganyika and Zanzibar. It was built for the **Elimu ya Muungano Ubunifu Challenge** as a youth-centered, modern, and measurable way to deliver Union education to students, colleges, universities, and the wider community.

The project combines a web app, a Retrieval Augmented Generation (RAG) chatbot, a local Union knowledge base, quizzes, timeline learning, leader profiles, audio stories, media learning, authentication, PWA installation, WhatsApp webhook readiness, and proposal documents for competition submission.

## Competition Idea

The challenge asks students in Zanzibar colleges and universities to present innovative ideas that help deliver Union education to the community, especially young people, through modern and productive methods.

MuunganoHub responds to that call by providing:

- A source-grounded AI Tutor for Union questions.
- Swahili and English learning support.
- A quiz-based Muungano Challenge for self-assessment.
- Interactive Union history timeline.
- Leader profiles and historical learning sections.
- Audio stories for listening-based learning.
- Video and image learning areas.
- PWA installation from the browser.
- WhatsApp bot readiness for wider youth access.
- Evaluation reports showing preliminary prototype performance.

## Current Prototype Status

This repository already contains a working preliminary prototype. The project is not only a proposal idea; it includes:

- Frontend web app.
- FastAPI backend.
- User registration and login.
- Profile and forgot-password flow.
- RAG chatbot.
- Local document processing pipeline.
- ChromaDB vector database.
- Source documents and cleaned text knowledge base.
- Quiz bank and media learning pages.
- PWA manifest, icons, and service worker.
- WhatsApp webhook endpoints.
- Evaluation scripts and generated reports.
- Render, Docker, and Procfile deployment setup.
- Proposal documents in Swahili, English, and Overleaf/LaTeX format.

## Preliminary Test Results

The prototype includes preliminary technical evaluation reports in `reports/`.

Current reported results:

- RAG answer evaluation: `10/10` sample cases passed.
- Prototype pass rate: `100%` on the initial test set.
- Average RAG answer latency: about `23.97 ms` in the RAG report.
- Retrieval Hit Rate@k: `1.0` for `k = 1, 3, 5, 10`.
- Retrieval MRR@k: `1.0` for `k = 1, 3, 5, 10`.
- Retrieval Precision@k: `1.0` for `k = 1, 3, 5`, and about `0.99` for `k = 10`.

These are preliminary prototype results. The next proposal stage is to expand testing with real students, use pre-test and post-test evaluation, collect user feedback, and verify content with subject matter reviewers.

## Core Features

### AI Tutor

Users ask questions about the Union, Tanganyika, Zanzibar, constitutions, leaders, history, or Union matters. The system retrieves relevant source chunks from the local vector database and answers from those sources.

The chatbot is designed to:

- Answer from indexed local and web reference documents.
- Reply in Swahili or English.
- Cite or show source-grounded context.
- Refuse questions that are outside the Union education scope.
- Reduce misinformation by using prepared references instead of unsupported answers.

### Learning Platform

After login, the web app includes:

- Dashboard
- Historia ya Muungano
- Timeline
- Muungano Challenge quiz
- Viongozi wa Muungano
- Sikiliza Historia
- Video Gallery
- Profile
- Ask AI chatbot
- Project Pitch

### PWA App

MuunganoHub is configured as a Progressive Web App. Users can install it from a browser on desktop or mobile when served from `localhost`, `127.0.0.1`, or a public HTTPS URL.

### WhatsApp Readiness

The backend includes WhatsApp Cloud API webhook endpoints. When Meta credentials are configured, the same RAG chatbot can answer Union questions through WhatsApp.

## Project Structure

```text
Union_comp/
|-- README.md
|-- Proposal.txt                         # Full Swahili proposal
|-- Proposal_Eng.txt                     # Full English proposal
|-- Proposal_Overleaf.tex                # Overleaf/LaTeX proposal
|-- Procfile                             # Process command for deployment
|-- Dockerfile                           # Container deployment setup
|-- render.yaml                          # Render deployment configuration
|-- runtime.txt                          # Runtime version configuration
|-- muunganohub_auth.sqlite3             # Local SQLite auth database
|-- server_stdout.log                    # Local server output log
|-- server_stderr.log                    # Local server error log
|-- uvicorn.out.log                      # Uvicorn output log
|-- uvicorn.err.log                      # Uvicorn error log
|
|-- backend/
|   |-- api.py                           # FastAPI app, routes, static frontend, chat API
|   |-- auth.py                          # Authentication, users, sessions, password reset
|   |-- email_service.py                 # SMTP email helper for auth messages
|   |-- rag_chatbot.py                   # CLI chatbot and RAG answer logic
|   |-- rag_components.py                # Embeddings, retrieval, source formatting helpers
|   |-- rag_config.py                    # Shared paths and RAG settings
|   |-- vector_db.py                     # Builds ChromaDB vector database
|   |-- chunks_documents.py              # Splits cleaned text into RAG chunks
|   |-- fetch_reference_sources.py       # Optional web reference fetcher
|   |-- ingest.py                        # Ingestion wrapper
|   |-- knowledge_base.py                # Knowledge base helpers
|   |-- evaluation.py                    # Retrieval evaluation metrics
|   |-- evaluate.py                      # Evaluation wrapper
|   |-- requirements.txt                 # Python dependencies
|   `-- __pycache__/                     # Generated Python cache files
|
|-- frontend/
|   |-- index.html                       # Main frontend HTML
|   |-- app.js                           # App state, auth, pages, chatbot, quiz, audio
|   |-- quiz-bank.js                     # Quiz questions
|   |-- styles.css                       # Responsive styling
|   |-- manifest.webmanifest             # PWA manifest
|   |-- sw.js                            # Service worker
|   `-- assets/
|       |-- app-icon.svg
|       |-- app-icon-192.png
|       |-- app-icon-512.png
|       |-- app-maskable-icon.svg
|       |-- app-maskable-512.png
|       |-- union-pattern.svg
|       |-- nyerere-founder.jpg
|       |-- abeid-karume-founder.webp
|       |-- samia-suluhu.jpg
|       |-- hussein-mwinyi.webp
|       |-- president_kikwete.webp
|       |-- president_magufuli.webp
|       |-- president_mkapa.webp
|       |-- President_Aboud_Jumbe_Mwinyi.jpg
|       |-- President_Ali_Hassan_Mwinyi.jpg
|       |-- President_Aman_Abeid_Aman_Karume.jpg
|       |-- President_Dr_Ali_Mohammed_Shein.jpg
|       |-- President_Dr_Salmin_Amour_Juma.jpg
|       `-- President_Sheikh_Idrisa_Abdulwakil.jpg
|
|-- Documents/
|   |-- conv_pdf_to_txt.py               # Converts raw PDFs to cleaned text
|   |-- process_data.py                  # Full data processing pipeline
|   |-- raw/                             # Original source PDFs
|   |   |-- ZANZIBAR-CONSTITUTION-ENGLISH-VERSION.pdf
|   |   |-- THE_HISTORICAL_INFORMATION_OF_TANZANIA_F.pdf
|   |   |-- The NAtional Archives Act.pdf
|   |   |-- mambo22_ya_muungano.pdf
|   |   |-- Kitabu cha Historia ya Muungano wa Tanganyika na Zanzibar.pdf
|   |   |-- Katiba_Zanzibar.pdf
|   |   |-- Katiba_ya_JMT_1977.pdf
|   |   |-- Katiba ya Jamhuri ya Muungano wa Tanzania _English Version_ 2009.pdf
|   |   `-- historia_ya_muungano.pdf
|   |-- cleaned/                         # Cleaned knowledge base text files
|   |   |-- official_union_source_guide.txt
|   |   |-- muungano_faq.txt
|   |   |-- union_faq_youth.txt
|   |   |-- union_faq_history.txt
|   |   |-- union_faq_constitution.txt
|   |   |-- union_public_education_notes.txt
|   |   |-- union_benefits_for_students.txt
|   |   |-- union_and_youth.txt
|   |   |-- union_and_jobs.txt
|   |   |-- union_and_business.txt
|   |   |-- union_challenges_summary.txt
|   |   |-- union_institutions_summary.txt
|   |   |-- union_important_dates.txt
|   |   |-- founders_of_union_summary.txt
|   |   |-- constitution_of_union_summary.txt
|   |   |-- constitution_notes.txt
|   |   |-- articles_of_union_summary.txt
|   |   |-- tanzania_leaders.txt
|   |   |-- tanganyika_before_union.txt
|   |   |-- tanganyika_independence_and_union.txt
|   |   |-- zanzibar_before_union.txt
|   |   |-- zanzibar_revolution_and_union.txt
|   |   |-- zanzibar_constitution_summary.txt
|   |   |-- Katiba_ya_JMT_1977.txt
|   |   |-- Katiba_Zanzibar.txt
|   |   |-- historia_ya_muungano.txt
|   |   |-- mambo22_ya_muungano.txt
|   |   |-- Kitabu cha Historia ya Muungano wa Tanganyika na Zanzibar.txt
|   |   |-- ZANZIBAR-CONSTITUTION-ENGLISH-VERSION.txt
|   |   |-- Katiba ya Jamhuri ya Muungano wa Tanzania _English Version_ 2009.txt
|   |   |-- THE_HISTORICAL_INFORMATION_OF_TANZANIA_F.txt
|   |   |-- The NAtional Archives Act.txt
|   |   `-- web_references/               # Optional downloaded web references
|   |-- chunks/
|   |   `-- muungano_chunks.json          # Generated RAG chunks
|   `-- __pycache__/                     # Generated Python cache files
|
|-- database/
|   |-- README.md
|   |-- schema.sql                       # Database schema
|   `-- Muunganohub.sql                  # Database dump/script
|
|-- reports/
|   |-- rag_eval_report.json             # RAG answer evaluation report
|   |-- rag_eval_report.csv
|   |-- retrieval_eval_report.json       # Retrieval metrics report
|   `-- retrieval_eval_report.csv
|
`-- vector_db/
    |-- chroma.sqlite3                   # ChromaDB database
    `-- <generated-vector-collection>/   # Generated Chroma vector files
```

## How The RAG System Works

### 1. Ingestion Phase

1. Raw PDFs are converted to text when needed.
2. Cleaned `.txt` files are read from `Documents/cleaned`.
3. Text is split into overlapping chunks.
4. Chunks are saved to `Documents/chunks/muungano_chunks.json`.
5. Local multilingual embeddings are generated.
6. Embeddings and metadata are stored in ChromaDB under `vector_db/`.

### 2. Query Phase

1. A user asks a question.
2. The system checks whether the question is related to the Union knowledge scope.
3. The vector database retrieves relevant source chunks.
4. The chatbot answers using the retrieved sources.
5. The answer includes source-grounded context.
6. Out-of-topic questions are refused politely.

## Runtime Mode

The project is configured to run without paid AI APIs.

- No OpenAI API key required.
- No paid embedding API required.
- No paid generation API required.
- Local multilingual embedding model:

```text
sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
```

## Setup

From the project root:

```powershell
cd C:\Users\Nassir\Downloads\Union_comp
```

Install dependencies:

```powershell
python -m pip install -r backend\requirements.txt
```

## Build Or Rebuild The Knowledge Base

If cleaned text files already exist:

```powershell
python Documents\process_data.py --skip-pdf
```

To reconvert PDFs from `Documents/raw`:

```powershell
python Documents\process_data.py
```

To refresh optional web references and rebuild:

```powershell
python Documents\process_data.py --skip-pdf --fetch-web
```

## Run The CLI Chatbot

```powershell
python backend\rag_chatbot.py
```

Example questions:

```text
nini maana ya muungano
Muungano wa Tanganyika na Zanzibar ulifanyika lini?
Faida za Muungano ni zipi?
Tell me about the Zanzibar Revolution
Who was Abeid Karume?
```

To exit:

```text
exit
```

## Run The Web App And API

For local testing with SQLite auth:

```powershell
$env:AUTH_BACKEND="sqlite"
$env:OFFLINE_MODE="true"
python -m uvicorn backend.api:app --host 127.0.0.1 --port 8001
```

Open:

```text
http://127.0.0.1:8001
```

Health check:

```powershell
curl http://127.0.0.1:8001/health
```

To test from another device on the same Wi-Fi:

```powershell
$env:AUTH_BACKEND="sqlite"
$env:OFFLINE_MODE="true"
python -m uvicorn backend.api:app --host 0.0.0.0 --port 8001
```

Then open:

```text
http://YOUR_IPV4_ADDRESS:8001
```

## API Examples

Register:

```powershell
curl -X POST http://127.0.0.1:8001/auth/register `
  -H "Content-Type: application/json" `
  -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

Login:

```powershell
curl -X POST http://127.0.0.1:8001/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

Ask a question:

```powershell
curl -X POST http://127.0.0.1:8001/chat `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_TOKEN_HERE" `
  -d "{\"question\":\"nini maana ya muungano\"}"
```

Response format:

```json
{
  "answer": "...",
  "session_id": "..."
}
```

## Install As A PWA

On desktop:

1. Start the local server.
2. Open `http://127.0.0.1:8001` in Chrome or Edge.
3. Click the install icon in the address bar or use the browser menu.

On Android:

1. Open the public HTTPS deployment URL.
2. Use Chrome menu -> Install app or Add to Home screen.

On iPhone:

1. Open the public HTTPS deployment URL in Safari.
2. Tap Share -> Add to Home Screen.

## WhatsApp Bot Setup

The backend includes these WhatsApp endpoints:

```text
GET  /whatsapp/status
GET  /whatsapp/webhook
POST /whatsapp/webhook
```

Environment variables:

```env
WHATSAPP_VERIFY_TOKEN=choose_a_private_verify_token
WHATSAPP_ACCESS_TOKEN=your_meta_whatsapp_cloud_api_access_token
WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id
WHATSAPP_GRAPH_VERSION=v20.0
```

After deployment, use this callback URL in Meta:

```text
https://YOUR_RENDER_URL/whatsapp/webhook
```

Check readiness:

```text
https://YOUR_RENDER_URL/whatsapp/status
```

## Auth Emails And Password Reset

Registration confirmation and password reset codes use SMTP when configured.

```env
SEND_AUTH_EMAILS=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_sender_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_FROM_EMAIL=your_sender_email@gmail.com
SMTP_FROM_NAME=MuunganoHub
```

Forgot-password flow:

1. User enters account email.
2. MuunganoHub creates an 8-digit reset code.
3. If SMTP is configured, the code is sent by email.
4. User enters the code and a new password.
5. Old sessions are cleared.

For local development, when `SEND_AUTH_EMAILS=false` or SMTP is not configured, the app can show a development reset code for testing.

## Deployment With Render

1. Push the project to GitHub.
2. Create a Render Web Service.
3. Use:

```text
Build Command: pip install -r backend/requirements.txt
Start Command: uvicorn backend.api:app --host 0.0.0.0 --port $PORT
```

4. Add environment variables:

```env
OFFLINE_MODE=true
AUTH_BACKEND=sqlite
SEND_AUTH_EMAILS=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_sender_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_FROM_EMAIL=your_sender_email@gmail.com
SMTP_FROM_NAME=MuunganoHub
```

5. Deploy and test:

```text
https://YOUR_RENDER_URL/health
https://YOUR_RENDER_URL/static/manifest.webmanifest
https://YOUR_RENDER_URL/sw.js
```

## Database Options

For demos and competitions:

```env
AUTH_BACKEND=sqlite
```

For larger production use:

```env
AUTH_BACKEND=mysql
MYSQL_HOST=...
MYSQL_PORT=3306
MYSQL_USER=...
MYSQL_PASSWORD=...
MYSQL_DATABASE=muunganohub
```

## Evaluation

Run retrieval evaluation:

```powershell
python backend\evaluation.py --k 1 3 5 10
```

Run compatibility wrapper:

```powershell
python backend\evaluate.py --k 1 3 5 10
```

Print results without saving report files:

```powershell
python backend\evaluation.py --k 1 3 5 --no-report
```

Reports are saved to:

```text
reports/retrieval_eval_report.json
reports/retrieval_eval_report.csv
reports/rag_eval_report.json
reports/rag_eval_report.csv
```

Retrieval metrics:

- `Recall@k`: how many expected relevant sources were found in the top-k results.
- `Precision@k`: how many retrieved top-k results are relevant.
- `Hit Rate@k`: whether at least one relevant source appears in the top-k results.
- `MRR@k`: how early the first relevant result appears.

## Proposal Documents

The competition proposal work is included in this repository:

```text
Proposal.txt           # Swahili proposal
Proposal_Eng.txt       # English proposal
Proposal_Overleaf.tex  # Overleaf-ready LaTeX proposal
```

The Overleaf proposal includes:

- Executive summary.
- Challenge alignment and strategic fit.
- Problem statement.
- Proposed solution.
- Proposal scope.
- Objectives.
- Target users.
- Innovation.
- Unique value proposition.
- Technical methodology.
- Preliminary prototype and test results.
- Implementation plan.
- Monitoring and evaluation plan.
- Expected impact.
- Sustainability.
- Budget estimate.
- Team capacity.
- Risks and mitigation.
- Scaling plan.
- Why MuunganoHub deserves to win.

## Common Commands

```powershell
# Install dependencies
python -m pip install -r backend\requirements.txt

# Rebuild chunks and vector database
python Documents\process_data.py --skip-pdf

# Run CLI chatbot
python backend\rag_chatbot.py

# Run API and frontend
python -m uvicorn backend.api:app --host 127.0.0.1 --port 8001

# Evaluate retrieval
python backend\evaluation.py --k 1 3 5 10

# Refresh web references
python backend\fetch_reference_sources.py
python Documents\process_data.py --skip-pdf
```

## Notes

- Run `Documents/process_data.py` again after adding or editing knowledge documents.
- The chatbot should answer only from indexed Union-related references.
- Out-of-topic questions should return a polite refusal.
- `vector_db/`, `Documents/chunks/`, logs, SQLite files, and `__pycache__/` are generated or local runtime outputs.
- Web references are optional. Use `--fetch-web` only when you want to refresh online sources.
- For the competition, the proposal should present MuunganoHub as a proposed scalable platform, while the existing prototype and preliminary tests serve as proof that the idea is feasible.

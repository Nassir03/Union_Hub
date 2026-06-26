# MuunganoHub 🇹🇿

> AI-Powered Union Education Platform for Tanzania and Zanzibar

<p align="center">

![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688.svg)
![RAG](https://img.shields.io/badge/AI-RAG-orange.svg)
![PWA](https://img.shields.io/badge/PWA-Installable-purple.svg)
![Offline](https://img.shields.io/badge/Offline-Supported-success.svg)
</p>

---

# 📖 Overview

MuunganoHub is an AI-powered digital civic education platform designed to teach young people about the Union of Tanganyika and Zanzibar through interactive learning, multilingual AI assistance and modern web technologies.

The platform combines:

* 🤖 Retrieval-Augmented Generation (RAG) AI Tutor
* 📚 Interactive Union Education
* 🧠 Local Knowledge Base
* 📝 Quizzes and Assessments
* 📖 Timeline-Based History Learning
* 🎧 Audio and Media Learning
* 🌍 Swahili and English Support
* 📱 Progressive Web App (PWA)
* 💬 WhatsApp Chatbot Readiness

MuunganoHub was developed for the **Elimu ya Muungano Ubunifu Challenge** as a scalable youth-centered civic education solution.

---

# 🌟 Vision

MuunganoHub aims to modernize Union education by making historical, constitutional, and civic knowledge more accessible, measurable, engaging, and technology-driven for young people across Tanzania and Zanzibar.

---

# 🚀 Key Features

## 🤖 AI Union Tutor

The AI Tutor uses Retrieval-Augmented Generation (RAG) to answer questions using verified Union-related source documents.

### Features

* Answers Union-related questions
* Supports Swahili and English
* Uses source-grounded retrieval
* Reduces misinformation
* Restricts out-of-scope questions
* Uses local vector database retrieval


---

## 📚 Interactive Learning Modules

The platform includes:

* Dashboard
* Historia ya Muungano
* Interactive Timeline
* AI Chat Assistant
* Muungano Challenge Quiz
* Viongozi wa Muungano
* Audio Stories
* Video Gallery
* User Profiles

---

## 🌍 Multilingual Learning

MuunganoHub automatically responds in:

* Swahili
* English

---

## 📱 Progressive Web App (PWA)

The application can be installed directly from the browser on:

* Android
* iPhone
* Desktop

### PWA Features

* Mobile-friendly interface
* Offline-ready support
* Fast loading
* App-like experience

---

## 💬 WhatsApp Bot Integration

The backend includes WhatsApp Cloud API webhook support, allowing the AI Tutor to operate directly through WhatsApp for wider youth accessibility.

---

# 🧠 System Architecture

## RAG Pipeline

```text
PDFs / Documents
        ↓
Text Cleaning
        ↓
Chunking
        ↓
Embedding Generation
        ↓
ChromaDB Vector Storage
        ↓
Retriever
        ↓
AI Response Generation
```

---

# 🗂️ Project Structure

```text
Union_Hub/
|-- README.md
|-- Procfile                             # Process command for deployment
|-- Dockerfile                           # Container deployment setup
|-- render.yaml                          # Render deployment configuration
|-- runtime.txt                          # Runtime version configuration
|-- muunganohub_auth.sqlite3             # Local SQLite auth database
|-- .dockerignore                   
|-- .gitignore                   
|-- .env                    
|
|-- backend/
|   |--__init__.py
|   |-- api.py                           # FastAPI app, routes, static frontend, chat API
|   |-- auth.py                          # Authentication, users, sessions, password reset
|   |-- email_service.py                 # SMTP email helper for auth messages
|   |-- rag_chatbot.py                   # CLI chatbot and RAG answer logic
|   |-- rag_components.py                # Embeddings, retrieval, source formatting helpers
|   |-- rag_config.py                    # Shared paths and RAG settings
|   |-- vector_db.py                     # Builds ChromaDB vector database
|   |-- union_core_facts.py              # Splits cleaned text into RAG chunks
|   |-- knowledge_base.py                # Knowledge base helpers
|   |-- test_rag_quality.py              # Retrieval evaluation metrics
|   |-- requirements.txt                 # Python dependencies
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
|   |-- chunks/
|   |   `-- muungano_chunks.json          # Generated RAG chunks
|   `-- __pycache__/                     # Generated Python cache files
|
|-- database/
|   |-- README.md
|   |-- schema.sql                       # Database schema
|   `-- Muunganohub.sql                  # Database dump/script
|
`-- vector_db/
    |-- chroma.sqlite3                   # ChromaDB database

---

# ⚙️ Technology Stack

## Backend

* Python 3.10+
* FastAPI
* ChromaDB
* LangChain Components
* Sentence Transformers

## Frontend

* HTML
* CSS
* JavaScript
* Progressive Web App (PWA)

## AI / NLP

* Retrieval-Augmented Generation (RAG)
* Multilingual Embeddings
* Semantic Search
* Context Retrieval

## Database

* SQLite
* MySQL (optional)

---

# 📊 Preliminary Prototype Results

| Metric                   | Result    |
| ------------------------ | --------- |
| Prototype Pass Rate      | 100%      |
| Sample RAG Evaluation    | 10/10     |
| Retrieval HitRate@k      | 1.0       |
| Retrieval MRR@k          | 1.0       |
| Precision@k              | ~0.99–1.0 |
| Average Response Latency | ~23.97 ms |

These are preliminary prototype results and will later be expanded using real student evaluation studies and feedback analysis.

---

# 🛠️ Installation

## 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/MuunganoHub.git
cd MuunganoHub
```

---

## 2. Install Dependencies

```bash
pip install -r backend/requirements.txt
```

---

## 3. Build Knowledge Base

```bash
python Documents/process_data.py --skip-pdf
```

---

## 4. Run The Application

```bash
python -m uvicorn backend.api:app --host 127.0.0.1 --port 8001
```

Open:

```text
http://127.0.0.1:8001
```

---

# 🧪 Running The CLI Chatbot

```bash
python backend/rag_chatbot.py
```

Exit using:

```text
exit
```

---

# 🔧 Environment Variables

Create a `.env` file:

```env
OFFLINE_MODE=true
AUTH_BACKEND=sqlite

SEND_AUTH_EMAILS=true

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_FROM_EMAIL=your_email@gmail.com
SMTP_FROM_NAME=MuunganoHub
```

---

# 📱 Install As App

## Desktop

* Open the website in Chrome or Edge
* Click the install icon

## Android

* Open website in Chrome
* Tap “Install App”

## iPhone

* Open website in Safari
* Share → Add to Home Screen

---

# ☁️ Deployment

MuunganoHub supports deployment using:

* Render
* Docker
* GitHub
* VPS Hosting
* Local Servers

## Render Start Command

```text
uvicorn backend.api:app --host 0.0.0.0 --port $PORT
```

---

# 💬 WhatsApp Bot Setup

The backend includes:

```text
GET  /whatsapp/status
GET  /whatsapp/webhook
POST /whatsapp/webhook
```

## Required Environment Variables

```env
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_GRAPH_VERSION=v20.0
```

---

# 🔒 Authentication Features

* User Registration
* Login System
* Password Reset
* Email Verification
* Session Management
* Forgot Password Flow

---

# 📖 Knowledge Base Sources

The platform uses:

* Constitutions
* Historical books
* Official Union documents
* Educational notes
* FAQ collections
* Historical archives
* Youth-focused summaries

---

# 🎯 Educational Goals

MuunganoHub aims to:

* Improve Union awareness among youth
* Encourage civic participation
* Modernize civic education
* Increase accessibility of Union history
* Promote multilingual learning
* Reduce misinformation

---

# 📈 Future Improvements

Planned future work includes:

* Real-time analytics dashboard
* Voice AI tutor
* Teacher dashboards
* Gamification system
* AI-generated certificates
* Advanced recommendation system
* Native mobile application
* Expanded multilingual support

---

# 📸 Screenshots

```text
screenshots/
├── home.png
├── chatbot.png
├── timeline.png
├── dashboard.png
└── quiz.png
```

Example:

```md
![Home](screenshots/home.png)
```

---

# 🔗 Live Demo

Frontend:

```text
https://your-site-url
```

API Docs:

```text
https://your-api-url/docs
```

---

# 👨‍💻 Author

ABDULLNASSIR HASSAN

Indian Institute of Technology Madras – Zanzibar Campus

---

# 📜 License

This project is intended for educational and research purposes.

---

# 🙌 Acknowledgements

Special thanks to:

* Elimu ya Muungano Ubunifu Challenge
* IIT Madras Zanzibar Campus
* Open-source AI communities
* Educational and historical contributors

---

# ⭐ Support

If you found this project useful:

* Star the repository
* Share the project
* Contribute improvements
* Support civic education innovation

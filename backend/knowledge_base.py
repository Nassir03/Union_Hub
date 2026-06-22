from pathlib import Path

from langchain_core.documents import Document

_KB_DIR = Path(__file__).parent / "knowledge_base"


def _load_kb_files() -> list[Document]:
    """Load all .txt files from the knowledge_base/ directory as LangChain Documents."""
    documents = []
    if not _KB_DIR.exists():
        return documents

    for txt_file in sorted(_KB_DIR.glob("*.txt")):
        try:
            raw = txt_file.read_text(encoding="utf-8")
        except Exception:
            continue

        title = txt_file.stem.replace("_", " ").title()
        topic = "general"
        source_type = "Hati ya Elimu"
        source_url = "local file"
        language = "sw+en"

        lines = raw.splitlines()
        header_end = 0
        for i, line in enumerate(lines[:10]):
            if line.startswith("Title:"):
                title = line.replace("Title:", "").strip()
                header_end = i + 1
            elif line.startswith("Topic:"):
                topic = line.replace("Topic:", "").strip()
                header_end = i + 1
            elif line.startswith("Language:"):
                language = line.replace("Language:", "").strip()
                header_end = i + 1
            elif line.startswith("Source Type:"):
                source_type = line.replace("Source Type:", "").strip()
                header_end = i + 1
            elif line.startswith("Source URL:"):
                source_url = line.replace("Source URL:", "").strip()
                header_end = i + 1

        body = "\n".join(lines[header_end:]).strip()
        if not body:
            continue

        documents.append(Document(
            page_content=f"{title}\n\n{body}",
            metadata={
                "id": f"kb_file_{txt_file.stem}",
                "source": txt_file.stem,
                "document_title": title,
                "title": title,
                "source_url": source_url,
                "source_type": source_type,
                "topic": topic,
                "language": language,
            },
        ))

    return documents


KNOWLEDGE_AREAS = [
    {
        "key": "history",
        "title": "History of the Union",
        "title_sw": "Historia ya Muungano",
        "text_en": "The Union of Tanganyika and Zanzibar was formed after the Articles of Union were signed by Julius Nyerere and Abeid Amani Karume on 22 April 1964. The United Republic was formally created on 26 April 1964. The Union grew from historical, social, political, security, and cultural links between Tanganyika and Zanzibar.",
        "text_sw": "Muungano wa Tanganyika na Zanzibar ulitokana na Hati za Muungano zilizotiwa saini na Julius Nyerere na Abeid Amani Karume tarehe 22 Aprili 1964. Jamhuri ya Muungano iliundwa rasmi tarehe 26 Aprili 1964. Muungano ulijengwa juu ya mahusiano ya kihistoria, kijamii, kisiasa, kiusalama na kiutamaduni kati ya Tanganyika na Zanzibar.",
    },
    {
        "key": "founders",
        "title": "Founders",
        "title_sw": "Waasisi",
        "text_en": "The founding leaders most directly associated with the Union are Julius Kambarage Nyerere, President of Tanganyika, and Abeid Amani Karume, President of Zanzibar and Chairman of the Revolutionary Council. They signed the Articles of Union in April 1964.",
        "text_sw": "Viongozi waasisi wanaohusishwa moja kwa moja na Muungano ni Julius Kambarage Nyerere, Rais wa Tanganyika, na Abeid Amani Karume, Rais wa Zanzibar na Mwenyekiti wa Baraza la Mapinduzi. Walitia saini Hati za Muungano mwezi Aprili 1964.",
    },
    {
        "key": "agreements",
        "title": "Union Agreements",
        "title_sw": "Hati na Makubaliano ya Muungano",
        "text_en": "The Articles of Union are the founding agreement of the Union. They provided the legal and political basis for Tanganyika and Zanzibar to unite and create a shared government for Union matters.",
        "text_sw": "Hati za Muungano ndiyo makubaliano ya msingi ya Muungano. Ziliweka msingi wa kisheria na kisiasa wa Tanganyika na Zanzibar kuungana na kuwa na Serikali ya pamoja kwa mambo ya Muungano.",
    },
    {
        "key": "constitutions",
        "title": "Constitutions",
        "title_sw": "Katiba",
        "text_en": "The Union framework is reflected in the Constitution of the United Republic of Tanzania and the Constitution of Zanzibar. These constitutional texts define institutions, authority, rights, duties, and the relationship between Union and Zanzibar structures.",
        "text_sw": "Mfumo wa Muungano unaonekana katika Katiba ya Jamhuri ya Muungano wa Tanzania na Katiba ya Zanzibar. Katiba hizi zinaeleza taasisi, mamlaka, haki, wajibu na uhusiano kati ya miundo ya Muungano na Zanzibar.",
    },
    {
        "key": "institutions",
        "title": "Union Institutions",
        "title_sw": "Taasisi za Muungano",
        "text_en": "Union institutions include organs responsible for Union matters such as the Government of the United Republic, Parliament, defence and security institutions, citizenship and immigration authorities, foreign affairs, and other constitutionally recognized areas.",
        "text_sw": "Taasisi za Muungano zinahusisha vyombo vinavyosimamia mambo ya Muungano kama Serikali ya Jamhuri ya Muungano, Bunge, vyombo vya ulinzi na usalama, uraia na uhamiaji, mambo ya nje na maeneo mengine ya kikatiba.",
    },
    {
        "key": "benefits",
        "title": "Benefits of the Union",
        "title_sw": "Faida za Muungano",
        "text_en": "Benefits of the Union include national unity, peace and security, shared international representation, economic cooperation, movement and interaction between people, and stronger collective identity for Tanzania Mainland and Zanzibar.",
        "text_sw": "Faida za Muungano ni pamoja na umoja wa taifa, amani na usalama, uwakilishi wa pamoja kimataifa, ushirikiano wa kiuchumi, mwingiliano wa watu na utambulisho wa pamoja kati ya Tanzania Bara na Zanzibar.",
    },
    {
        "key": "challenges",
        "title": "Challenges of the Union",
        "title_sw": "Changamoto za Muungano",
        "text_en": "Union challenges often relate to interpretation of Union matters, institutional coordination, revenue and resource questions, public understanding, and misinformation. The platform treats these as civic education topics and answers from sources.",
        "text_sw": "Changamoto za Muungano mara nyingi huhusu tafsiri ya mambo ya Muungano, uratibu wa taasisi, masuala ya mapato na rasilimali, uelewa wa umma na upotoshaji. Mfumo huu huyachukulia kama mada za elimu ya uraia na hujibu kwa kutumia vyanzo.",
    },
    {
        "key": "youth",
        "title": "Union and Youth",
        "title_sw": "Muungano na Vijana",
        "text_en": "For young people, the Union matters because it affects identity, education, mobility, employment opportunities, entrepreneurship, culture, civic participation, and access to national institutions. Youth education helps reduce misinformation and strengthens national unity.",
        "text_sw": "Kwa vijana, Muungano ni muhimu kwa sababu unagusa utambulisho, elimu, uhamaji, fursa za ajira, ujasiriamali, utamaduni, ushiriki wa kiraia na matumizi ya taasisi za kitaifa. Elimu kwa vijana hupunguza upotoshaji na kuimarisha umoja wa taifa.",
    },
    {
        "key": "economy",
        "title": "Economy and Trade",
        "title_sw": "Uchumi na Biashara",
        "text_en": "The Union supports economic and trade cooperation through shared policy areas, ports and transport coordination, external trade, regional and international representation, and movement of people, services, and ideas.",
        "text_sw": "Muungano husaidia ushirikiano wa uchumi na biashara kupitia maeneo ya sera za pamoja, uratibu wa bandari na usafiri, biashara ya nje, uwakilishi wa kikanda na kimataifa, na uhamaji wa watu, huduma na mawazo.",
    },
    {
        "key": "education",
        "title": "Education",
        "title_sw": "Elimu",
        "text_en": "Union education helps learners understand the origins, institutions, benefits, debates, and responsibilities connected to the United Republic. A digital tutor can make this content easier for students to access in Swahili and English.",
        "text_sw": "Elimu ya Muungano huwasaidia wanafunzi kuelewa chimbuko, taasisi, faida, mijadala na wajibu unaohusiana na Jamhuri ya Muungano. AI Tutor ya kidigitali inaweza kurahisisha upatikanaji wa elimu hii kwa Kiswahili na English.",
    },
    {
        "key": "culture",
        "title": "Culture",
        "title_sw": "Utamaduni",
        "text_en": "The Union connects people through Swahili language, shared history, coastal and mainland interaction, national symbols, cultural exchange, arts, and civic identity.",
        "text_sw": "Muungano huwaunganisha watu kupitia lugha ya Kiswahili, historia ya pamoja, mwingiliano wa pwani na bara, alama za taifa, kubadilishana utamaduni, sanaa na utambulisho wa kiraia.",
    },
    {
        "key": "faq",
        "title": "Frequently Asked Questions",
        "title_sw": "Maswali Yanayoulizwa Mara kwa Mara",
        "text_en": "Frequently asked Union questions include what the Union is, when it was formed, why it was formed, who the founders were, what Union matters are, what benefits exist, what challenges exist, and why young people should care.",
        "text_sw": "Maswali yanayoulizwa mara kwa mara kuhusu Muungano ni pamoja na Muungano ni nini, ulianzishwa lini, kwa nini uliundwa, waasisi ni nani, mambo ya Muungano ni yapi, faida ni zipi, changamoto ni zipi na kwa nini vijana wajali.",
    },
    {
        "key": "speeches",
        "title": "Speeches",
        "title_sw": "Hotuba",
        "text_en": "Speeches by national leaders are useful learning sources because they explain the purpose of unity, national identity, constitutional responsibility, and the need to preserve the Union for future generations.",
        "text_sw": "Hotuba za viongozi wa taifa ni vyanzo muhimu vya kujifunza kwa sababu hueleza dhamira ya umoja, utambulisho wa taifa, wajibu wa kikatiba na umuhimu wa kuulinda Muungano kwa vizazi vijavyo.",
    },
    {
        "key": "publications",
        "title": "Government Publications",
        "title_sw": "Machapisho ya Serikali",
        "text_en": "Government publications, constitutions, historical books, and official documents are priority sources because they provide traceable evidence for Union education.",
        "text_sw": "Machapisho ya Serikali, katiba, vitabu vya historia na nyaraka rasmi ni vyanzo vya kipaumbele kwa sababu hutoa ushahidi unaoweza kufuatiliwa katika elimu ya Muungano.",
    },
    {
        "key": "events",
        "title": "Important Events",
        "title_sw": "Matukio Muhimu",
        "text_en": "Important Union events include the Zanzibar Revolution of January 1964, signing of the Articles of Union on 22 April 1964, formation of the United Republic on 26 April 1964, the 1977 Constitution, the 1984 Zanzibar Constitution, multiparty reforms, and Union anniversaries.",
        "text_sw": "Matukio muhimu ya Muungano ni pamoja na Mapinduzi ya Zanzibar Januari 1964, kutiwa saini Hati za Muungano tarehe 22 Aprili 1964, kuundwa Jamhuri ya Muungano tarehe 26 Aprili 1964, Katiba ya 1977, Katiba ya Zanzibar ya 1984, mageuzi ya vyama vingi na maadhimisho ya Muungano.",
    },
]


FAQ_ENTRIES = [
    ("Muungano ni nini?", "What is the Union?", "Muungano ni makubaliano ya Tanganyika na Zanzibar kuunda Jamhuri ya Muungano yenye mamlaka ya pamoja katika mambo ya Muungano.", "The Union is the agreement by Tanganyika and Zanzibar to form the United Republic with shared authority over Union matters.", "faq"),
    ("Muungano ulianzishwa lini?", "When was the Union formed?", "Muungano ulianzishwa rasmi tarehe 26 Aprili 1964 baada ya Hati za Muungano kusainiwa tarehe 22 Aprili 1964.", "The Union was formally created on 26 April 1964 after the Articles of Union were signed on 22 April 1964.", "history"),
    ("Nani walikuwa waasisi wa Muungano?", "Who were the founders of the Union?", "Waasisi wakuu waliotia saini Hati za Muungano ni Julius Kambarage Nyerere na Abeid Amani Karume.", "The principal founders who signed the Articles of Union were Julius Kambarage Nyerere and Abeid Amani Karume.", "founders"),
    ("Kwa nini Muungano uliundwa?", "Why was the Union formed?", "Muungano uliundwa kuimarisha umoja, usalama, ushirikiano wa kisiasa na kijamii, na uhusiano wa kihistoria kati ya Tanganyika na Zanzibar.", "The Union was formed to strengthen unity, security, political and social cooperation, and the historical relationship between Tanganyika and Zanzibar.", "history"),
    ("Faida za Muungano ni zipi?", "What are the benefits of the Union?", "Faida ni pamoja na umoja, amani, usalama, ushirikiano wa uchumi, uwakilishi wa pamoja na mwingiliano wa watu.", "Benefits include unity, peace, security, economic cooperation, shared representation, and interaction between people.", "benefits"),
    ("Changamoto za Muungano ni zipi?", "What challenges does the Union face?", "Changamoto huhusu tafsiri ya mambo ya Muungano, uratibu wa taasisi, mapato, rasilimali na uelewa wa umma.", "Challenges include interpretation of Union matters, institutional coordination, revenue, resources, and public understanding.", "challenges"),
    ("Mambo ya Muungano ni yapi?", "What are Union matters?", "Mambo ya Muungano ni maeneo yanayosimamiwa na Serikali ya Jamhuri ya Muungano kwa pande zote mbili kama katiba, mambo ya nje, ulinzi, uraia na uhamiaji.", "Union matters are areas handled by the Union Government for both sides, such as the constitution, foreign affairs, defence, citizenship, and immigration.", "institutions"),
    ("Muungano unawasaidiaje wanafunzi?", "How does the Union help students?", "Unawasaidia wanafunzi kupitia utambulisho wa pamoja, fursa za kujifunza historia ya taifa, uelewa wa taasisi na fursa za elimu kati ya pande mbili.", "It helps students through shared identity, national history learning, institutional understanding, and education opportunities across both sides.", "youth"),
    ("Muungano unaathirije ajira?", "How does the Union affect jobs?", "Muungano huongeza uelewa wa soko la kitaifa, uhamaji, taasisi za pamoja na fursa za kushiriki katika uchumi mpana wa Tanzania.", "The Union supports a national labour outlook, mobility, shared institutions, and opportunities in Tanzania’s wider economy.", "youth"),
    ("Kwa nini vijana wajali Muungano?", "Why should youth care about the Union?", "Vijana wajali kwa sababu Muungano unaathiri utambulisho, elimu, ajira, biashara, ushiriki wa kiraia na umoja wa taifa.", "Youth should care because the Union affects identity, education, jobs, business, civic participation, and national unity.", "youth"),
    ("Katiba ya 1977 ina umuhimu gani?", "Why is the 1977 Constitution important?", "Katiba ya 1977 ni msingi muhimu wa mfumo wa Jamhuri ya Muungano na taasisi zake.", "The 1977 Constitution is an important foundation of the United Republic and its institutions.", "constitutions"),
    ("Katiba ya Zanzibar ya 1984 ina nafasi gani?", "What is the role of the 1984 Zanzibar Constitution?", "Katiba ya Zanzibar ya 1984 inaeleza mfumo wa Serikali ya Mapinduzi ya Zanzibar ndani ya Jamhuri ya Muungano.", "The 1984 Zanzibar Constitution describes the Revolutionary Government of Zanzibar within the United Republic framework.", "constitutions"),
    ("Nini nafasi ya utamaduni katika Muungano?", "What is the role of culture in the Union?", "Utamaduni huimarisha mshikamano kupitia Kiswahili, historia, sanaa, mwingiliano wa watu na utambulisho wa pamoja.", "Culture strengthens solidarity through Swahili, history, arts, people-to-people interaction, and shared identity.", "culture"),
    ("Uchumi na biashara vinahusikaje na Muungano?", "How are economy and trade related to the Union?", "Muungano husaidia ushirikiano wa masoko, usafiri, biashara ya nje, huduma na uwakilishi wa kikanda na kimataifa.", "The Union supports cooperation in markets, transport, external trade, services, and regional and international representation.", "economy"),
    ("Kwa nini vyanzo rasmi ni muhimu?", "Why are official sources important?", "Vyanzo rasmi vinajenga uaminifu kwa sababu majibu yanaweza kurejelewa katika katiba, machapisho ya serikali na nyaraka za historia.", "Official sources build trust because answers can be checked in constitutions, government publications, and historical documents.", "publications"),
    ("Nani alitawala Tanganyika kabla ya Muungano?", "Who ruled Tanganyika before the Union?", "Kabla tu ya Muungano wa Aprili 1964, Tanganyika ilikuwa jamhuri iliyoongozwa na Rais Julius Kambarage Nyerere. Tanganyika ilipata uhuru tarehe 9 Desemba 1961, na Nyerere alikuwa Waziri Mkuu; ilipokuwa jamhuri tarehe 9 Desemba 1962, Nyerere akawa Rais.", "Immediately before the Union in April 1964, Tanganyika was a republic led by President Julius Kambarage Nyerere. Tanganyika became independent on 9 December 1961, and Nyerere became Prime Minister; when Tanganyika became a republic on 9 December 1962, Nyerere became President.", "history"),
    ("Nani alitawala Zanzibar kabla ya Muungano?", "Who ruled Zanzibar before the Union?", "Kabla ya Muungano, Zanzibar ilikuwa imepinduliwa tarehe 12 Januari 1964. Baada ya Mapinduzi, Abeid Amani Karume alikuwa Rais wa Zanzibar na Mwenyekiti wa Baraza la Mapinduzi. Kabla ya Mapinduzi, Zanzibar ilikuwa chini ya Usultani.", "Before the Union, Zanzibar experienced the Revolution of 12 January 1964. After the Revolution, Abeid Amani Karume became President of Zanzibar and Chairman of the Revolutionary Council. Before the Revolution, Zanzibar was under the Sultanate.", "history"),
    ("Muungano unawasaidiaje vijana katika biashara?", "How does the Union help young people in business?", "Muungano huwasaidia vijana katika biashara kwa kupanua nafasi ya ushirikiano kati ya Tanzania Bara na Zanzibar kupitia masoko, usafiri, huduma, bandari, utalii, ujasiriamali na mwingiliano wa watu, bidhaa na mawazo.", "The Union helps young people in business by widening cooperation between Mainland Tanzania and Zanzibar through markets, transport, services, ports, tourism, entrepreneurship, and the movement of people, goods, and ideas.", "economy"),
    ("Uchumi na biashara vinahusikaje na Muungano?", "How are economy and trade related to the Union?", "Uchumi na biashara vinahusiana na Muungano kwa sababu pande mbili zinaweza kushirikiana katika masoko, huduma, usafiri, biashara ya nje, utalii na uwakilishi wa kikanda na kimataifa.", "Economy and trade are related to the Union because the two sides can cooperate in markets, services, transport, external trade, tourism, and regional and international representation.", "economy"),
]


def build_knowledge_documents():
    documents = []

    # Load from backend/knowledge_base/*.txt files first
    documents.extend(_load_kb_files())

    for area in KNOWLEDGE_AREAS:
        for language, title_key, text_key in (("sw", "title_sw", "text_sw"), ("en", "title", "text_en")):
            documents.append(Document(
                page_content=f"{area[title_key]}\n\n{text_key and area[text_key]}",
                metadata={
                    "id": f"knowledge_{area['key']}_{language}",
                    "source": "MuunganoHub Knowledge Base",
                    "title": area[title_key],
                    "source_url": "local curated knowledge base",
                    "source_type": "curated",
                    "topic": area["key"],
                    "language": language,
                },
            ))

    for index, (question_sw, question_en, answer_sw, answer_en, topic) in enumerate(FAQ_ENTRIES, start=1):
        documents.append(Document(
            page_content=f"Question: {question_sw}\nAnswer: {answer_sw}\n\nQuestion: {question_en}\nAnswer: {answer_en}",
            metadata={
                "id": f"faq_{index}",
                "source": "MuunganoHub FAQ Dataset",
                "title": "Frequently Asked Questions",
                "source_url": "local curated FAQ dataset",
                "source_type": "faq",
                "topic": topic,
            },
        ))

    return documents


def get_learning_area(topic_text):
    normalized = topic_text.lower()
    aliases = {
        "history": {"history", "historia", "chimbuko"},
        "founders": {"founders", "waasisi", "leaders", "viongozi", "nyerere", "karume"},
        "benefits": {"benefits", "faida", "manufaa"},
        "constitutions": {"constitution", "constitutions", "katiba"},
        "youth": {"youth", "vijana", "students", "wanafunzi", "jobs", "ajira", "opportunities", "fursa"},
        "institutions": {"institutions", "taasisi", "mambo", "matters"},
        "economy": {"economy", "trade", "uchumi", "biashara"},
        "culture": {"culture", "utamaduni", "kiswahili"},
        "challenges": {"challenges", "changamoto", "hoja"},
    }
    for key, words in aliases.items():
        if any(word in normalized for word in words):
            return key
    return "history"


def get_area_text(area_key, language):
    for area in KNOWLEDGE_AREAS:
        if area["key"] == area_key:
            if language == "sw":
                return area["title_sw"], area["text_sw"]
            return area["title"], area["text_en"]
    return None, None

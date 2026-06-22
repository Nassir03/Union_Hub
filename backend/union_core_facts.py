"""
Trusted core facts for common Union civic questions.

These answers bypass RAG retrieval entirely for the most common Union questions,
guaranteeing correctness regardless of what chunks are in the vector store.
RAG retrieval is then used only to append supporting source citations.
"""

import re

# ---------------------------------------------------------------------------
# Trusted answer registry — per intent, in SW and EN
# Uses **Section Header:** format rendered by frontend formatAnswer()
# ---------------------------------------------------------------------------

UNION_CORE_FACTS = {

    "definition_union": {
        "sw": (
            "**Jibu la Moja kwa Moja:**\n"
            "Muungano wa Tanganyika na Zanzibar ni makubaliano ya kisiasa na kikatiba "
            "yaliyofanyika mwaka 1964 ambayo yaliunda Jamhuri ya Muungano wa Tanzania. "
            "Muungano huu uliunganisha nchi mbili huru — Tanganyika na Zanzibar — katika "
            "mfumo wa taifa moja lenye Serikali ya Jamhuri ya Muungano, huku Zanzibar "
            "ikiendelea kuwa na Serikali yake ya Mapinduzi kwa mambo yasiyo ya Muungano.\n\n"
            "**Maelezo:**\n"
            "Muungano uliundwa kupitia Hati za Muungano zilizosainiwa tarehe 22 Aprili 1964 "
            "na Mwalimu Julius Kambarage Nyerere, Rais wa Tanganyika, na Sheikh Abeid Amani "
            "Karume, Rais wa Zanzibar. Tarehe 26 Aprili 1964 ikawa siku rasmi ya kuzaliwa "
            "kwa Jamhuri ya Muungano wa Tanzania. Muungano una mfumo wa serikali mbili: "
            "Serikali ya Muungano inayosimamia mambo ya pande zote mbili, na Serikali ya "
            "Mapinduzi ya Zanzibar inayosimamia mambo ya ndani ya Zanzibar.\n\n"
            "**Umuhimu kwa Vijana:**\n"
            "Kwa vijana, Muungano si muundo wa kisiasa tu — ni msingi wa utambulisho wetu "
            "kama Watanzania. Unajumuisha tofauti zetu za kiutamaduni, lugha ya Kiswahili, "
            "na historia ya pamoja katika umoja mmoja wenye nguvu. Kuelewa Muungano ni "
            "kuelewa ni nani sisi na tunakotoka."
        ),
        "en": (
            "**Direct Answer:**\n"
            "The Union of Tanganyika and Zanzibar is a political and constitutional "
            "arrangement made in 1964 that formed the United Republic of Tanzania. This "
            "Union brought together two independent nations — Tanganyika and Zanzibar — "
            "under a single national government, while Zanzibar retained its own "
            "Revolutionary Government for matters not covered by the Union.\n\n"
            "**Explanation:**\n"
            "The Union was created through the Articles of Union signed on 22 April 1964 "
            "by Mwalimu Julius Kambarage Nyerere, President of Tanganyika, and Sheikh "
            "Abeid Amani Karume, President of Zanzibar. 26 April 1964 became the official "
            "birthday of the United Republic of Tanzania. The Union operates a two-government "
            "structure: the Union Government overseeing matters for both sides, and the "
            "Zanzibar Revolutionary Government overseeing Zanzibar's internal affairs.\n\n"
            "**Why It Matters to Youth:**\n"
            "For young people, the Union is not just a political structure — it is the "
            "foundation of our identity as Tanzanians. It embraces our cultural diversity, "
            "the Swahili language, and a shared history within one strong unity. Understanding "
            "the Union is understanding who we are and where we come from."
        ),
        "fallback_sources": (
            "[1] Historia ya Muungano wa Tanganyika na Zanzibar | Mada: Muungano | Aina: Kitabu cha Historia\n"
            "[2] Hati za Muungano (22 Aprili 1964) | Mada: Uanzishwaji wa Muungano | Aina: Hati Rasmi\n"
            "[3] Katiba ya Jamhuri ya Muungano wa Tanzania (1977) | Mada: Muundo wa Muungano | Aina: Katiba Rasmi"
        ),
    },

    "reasons_for_union": {
        "sw": (
            "**Jibu la Moja kwa Moja:**\n"
            "Tanganyika na Zanzibar waliungana kwa sababu ya kuimarisha umoja wa kitaifa, "
            "usalama, mshikamano wa kisiasa, historia ya pamoja, lugha ya Kiswahili, "
            "ushirikiano wa kijamii na kiuchumi, pamoja na mazingira ya kisiasa baada ya "
            "uhuru wa Tanganyika na Mapinduzi ya Zanzibar ya mwaka 1964. Muungano ulisaidia "
            "kujenga taifa lenye nguvu zaidi na kulinda maslahi ya pande zote mbili.\n\n"
            "**Maelezo:**\n"
            "Sababu kuu za Muungano ni:\n"
            "1. Mapinduzi ya Zanzibar (Januari 1964): Mapinduzi yalileta msukosuko wa "
            "kisiasa Zanzibar. Serikali mpya ya Karume ilihitaji msaada na utulivu.\n"
            "2. Vita Baridi: Nguvu za nje — hasa Marekani na Uingereza — ziliogopa Zanzibar "
            "kuwa kambi ya ukomunisti. Nyerere aliona Muungano kama njia ya kulinda eneo hili.\n"
            "3. Historia na lugha ya pamoja: Tanganyika na Zanzibar zilikuwa na historia ya "
            "biashara ya pwani, uhusiano wa kijamii, na lugha ya Kiswahili iliyounganisha watu.\n"
            "4. Pan-Africanism: Nyerere alikuwa mwamini wa umoja wa Afrika. Muungano ulikuwa "
            "hatua ya vitendo kuelekea ndoto hiyo.\n"
            "5. Nguvu za pamoja: Nchi iliyounganika ingekuwa na nguvu zaidi katika mazungumzo "
            "ya kimataifa na katika kutatua changamoto za kiuchumi.\n\n"
            "**Umuhimu kwa Vijana:**\n"
            "Kuelewa sababu za Muungano ni kuelewa jinsi viongozi wawili walivyoweza kutatua "
            "changamoto kubwa kwa njia ya amani na mazungumzo badala ya vita — somo muhimu "
            "la uongozi, umoja, na hekima ya kisiasa kwa kizazi chetu."
        ),
        "en": (
            "**Direct Answer:**\n"
            "Tanganyika and Zanzibar united to strengthen national unity, security, political "
            "solidarity, shared history, the Swahili language, and social and economic "
            "cooperation — against the backdrop of Tanganyika's independence and the Zanzibar "
            "Revolution of 1964. The Union helped build a stronger nation and protect the "
            "interests of both sides.\n\n"
            "**Explanation:**\n"
            "The key reasons for the Union were:\n"
            "1. The Zanzibar Revolution (January 1964): The revolution created political "
            "instability in Zanzibar. Karume's new government needed stability and support.\n"
            "2. Cold War pressures: Western powers feared Zanzibar becoming a communist "
            "base. Nyerere saw the Union as a way to protect the region.\n"
            "3. Shared history and language: Tanganyika and Zanzibar shared centuries of "
            "coastal trade, social ties, and the Swahili language.\n"
            "4. Pan-Africanism: Nyerere was a committed pan-Africanist. The Union was a "
            "practical step toward African unity.\n"
            "5. Combined strength: A united nation would be stronger in international "
            "negotiations and better positioned for economic development.\n\n"
            "**Why It Matters to Youth:**\n"
            "Understanding why the Union was formed shows how two leaders resolved major "
            "challenges through peace and dialogue rather than conflict — a vital lesson "
            "of leadership, unity, and political wisdom for our generation."
        ),
        "fallback_sources": (
            "[1] Historia ya Muungano wa Tanganyika na Zanzibar | Mada: Sababu za Muungano | Aina: Kitabu cha Historia\n"
            "[2] Hati za Muungano (22 Aprili 1964) | Mada: Uanzishwaji wa Muungano | Aina: Hati Rasmi\n"
            "[3] Mapinduzi ya Zanzibar 1964 | Mada: Historia ya Zanzibar | Aina: Makala ya Kihistoria"
        ),
    },

    "union_date": {
        "sw": (
            "**Jibu la Moja kwa Moja:**\n"
            "Muungano wa Tanganyika na Zanzibar uliundwa rasmi tarehe 26 Aprili 1964, "
            "baada ya Hati za Muungano kusainiwa tarehe 22 Aprili 1964 na viongozi wa "
            "pande zote mbili.\n\n"
            "**Maelezo:**\n"
            "Tarehe muhimu za Muungano:\n"
            "- 12 Januari 1964: Mapinduzi ya Zanzibar yalipindua utawala wa Sultani.\n"
            "- 22 Aprili 1964: Hati za Muungano zilisainiwa na Julius Nyerere na Abeid Karume.\n"
            "- 26 Aprili 1964: Siku rasmi ya kuundwa kwa Jamhuri ya Muungano wa Tanzania. "
            "Siku hii inaadhimishwa kila mwaka kama Siku ya Muungano (Union Day).\n"
            "- 9 Desemba 1964: Jina la nchi lilibadilishwa kutoka 'Jamhuri ya Muungano' "
            "hadi 'Jamhuri ya Muungano wa Tanzania'.\n\n"
            "**Umuhimu kwa Vijana:**\n"
            "Kujua tarehe hizi ni kujua historia ya msingi ya taifa letu. Kila mwaka tarehe "
            "26 Aprili ni fursa ya kukumbuka na kuheshimu mchango wa waanzilishi wa Muungano "
            "ambao waliweka msingi wa Tanzania tunayoiishi leo."
        ),
        "en": (
            "**Direct Answer:**\n"
            "The Union of Tanganyika and Zanzibar was officially formed on 26 April 1964, "
            "after the Articles of Union were signed on 22 April 1964 by the leaders "
            "of both sides.\n\n"
            "**Explanation:**\n"
            "Key dates of the Union:\n"
            "- 12 January 1964: The Zanzibar Revolution overthrew the Sultanate.\n"
            "- 22 April 1964: The Articles of Union were signed by Julius Nyerere and "
            "Abeid Karume.\n"
            "- 26 April 1964: The official birthday of the United Republic of Tanzania. "
            "This date is celebrated every year as Union Day.\n"
            "- 9 December 1964: The country was renamed from 'United Republic' to the "
            "'United Republic of Tanzania'.\n\n"
            "**Why It Matters to Youth:**\n"
            "Knowing these dates means knowing the foundational history of our nation. "
            "Every year on 26 April is an opportunity to remember and honour the contribution "
            "of the Union's founders who built the foundation of the Tanzania we live in today."
        ),
        "fallback_sources": (
            "[1] Hati za Muungano (22 Aprili 1964) | Mada: Tarehe za Muungano | Aina: Hati Rasmi\n"
            "[2] Historia ya Muungano wa Tanganyika na Zanzibar | Mada: Muhtasari wa Historia | Aina: Kitabu cha Historia"
        ),
    },

    "founders_signatories": {
        "sw": (
            "**Jibu la Moja kwa Moja:**\n"
            "Hati za Muungano zilisainiwa na Mwalimu Julius Kambarage Nyerere, Rais wa "
            "Tanganyika, na Sheikh Abeid Amani Karume, Rais wa Zanzibar na Mwenyekiti wa "
            "Baraza la Mapinduzi, tarehe 22 Aprili 1964.\n\n"
            "**Maelezo:**\n"
            "Mwalimu Julius Kambarage Nyerere (1922–1999) alikuwa Rais wa kwanza wa Tanganyika "
            "na baadaye Rais wa kwanza wa Jamhuri ya Muungano wa Tanzania. Alizaliwa Butiama, "
            "alikuwa mwalimu, mwanasiasa, na msomi aliyeongoza harakati za uhuru wa Tanganyika. "
            "Alikuwa mwamini mkubwa wa Pan-Africanism na umoja wa Afrika.\n\n"
            "Sheikh Abeid Amani Karume (1905–1972) alikuwa kiongozi wa Zanzibar aliyekuwa "
            "mstari wa mbele katika Mapinduzi ya Zanzibar ya 1964. Alikuwa Rais wa Zanzibar "
            "na Makamu wa Kwanza wa Rais wa Jamhuri ya Muungano mpaka alipofariki mwaka 1972. "
            "Nyerere na Karume wote walitoa uongozi thabiti katika miaka ya awali ya Muungano.\n\n"
            "**Umuhimu kwa Vijana:**\n"
            "Kuwafahamu Nyerere na Karume ni kujua chanzo cha taifa letu. Waliamua kujenga "
            "taifa jipya kwa njia ya ushirikiano, hekima, na maono ya mbali — mfano mzuri "
            "wa uongozi kwa vijana wa Tanzania leo."
        ),
        "en": (
            "**Direct Answer:**\n"
            "The Articles of Union were signed by Mwalimu Julius Kambarage Nyerere, President "
            "of Tanganyika, and Sheikh Abeid Amani Karume, President of Zanzibar and Chairman "
            "of the Revolutionary Council, on 22 April 1964.\n\n"
            "**Explanation:**\n"
            "Mwalimu Julius Kambarage Nyerere (1922–1999) was the first President of Tanganyika "
            "and later the first President of the United Republic of Tanzania. Born in Butiama, "
            "he was a teacher, politician, and scholar who led Tanganyika's independence "
            "movement. He was a committed Pan-Africanist and believer in African unity.\n\n"
            "Sheikh Abeid Amani Karume (1905–1972) was the Zanzibar leader who was at the "
            "forefront of the 1964 Zanzibar Revolution. He served as President of Zanzibar "
            "and First Vice-President of the United Republic until his assassination in 1972. "
            "Both Nyerere and Karume provided strong leadership in the Union's early years.\n\n"
            "**Why It Matters to Youth:**\n"
            "Knowing Nyerere and Karume means knowing the roots of our nation. They chose to "
            "build a new country through cooperation, wisdom, and far-sighted vision — an "
            "inspiring example of leadership for Tanzania's youth today."
        ),
        "fallback_sources": (
            "[1] Hati za Muungano (22 Aprili 1964) | Mada: Waasisi wa Muungano | Aina: Hati Rasmi\n"
            "[2] Historia ya Muungano wa Tanganyika na Zanzibar | Mada: Viongozi | Aina: Kitabu cha Historia\n"
            "[3] Wasifu wa Julius Nyerere na Abeid Karume | Mada: Viongozi wa Taifa | Aina: Rejea ya Kihistoria"
        ),
    },

    "articles_of_union": {
        "sw": (
            "**Jibu la Moja kwa Moja:**\n"
            "Hati za Muungano ni hati ya kisheria iliyosainiwa tarehe 22 Aprili 1964 na "
            "Julius Nyerere na Abeid Karume. Hati hii ndio msingi wa kisheria wa Muungano "
            "wa Tanganyika na Zanzibar, na iliunda Jamhuri ya Muungano wa Tanzania rasmi "
            "tarehe 26 Aprili 1964.\n\n"
            "**Maelezo:**\n"
            "Hati za Muungano zilikuwa na masharti makuu yafuatayo:\n"
            "- Kuunda serikali moja ya pamoja inayosimamia mambo ya Muungano\n"
            "- Kuhifadhi Serikali ya Mapinduzi ya Zanzibar kwa mambo ya ndani ya Zanzibar\n"
            "- Kushiriki ulinzi, mambo ya nje, uraia, na uchumi wa pamoja\n"
            "- Kutoa haki sawa kwa raia wa pande zote mbili\n"
            "Hati hizi zilikuwa na vifungu 13, na baadaye zilibadilishwa kulingana na "
            "mahitaji ya kikatiba ya Muungano.\n\n"
            "**Umuhimu kwa Vijana:**\n"
            "Hati za Muungano ni kama 'cheti cha kuzaliwa' cha Tanzania — nyaraka "
            "zinazoonyesha jinsi taifa letu lilivyoanzishwa kwa makubaliano ya amani na "
            "heshima ya pande zote mbili."
        ),
        "en": (
            "**Direct Answer:**\n"
            "The Articles of Union is the legal document signed on 22 April 1964 by "
            "Julius Nyerere and Abeid Karume. This document is the legal foundation of "
            "the Union of Tanganyika and Zanzibar, and officially created the United "
            "Republic of Tanzania on 26 April 1964.\n\n"
            "**Explanation:**\n"
            "The Articles of Union contained the following key provisions:\n"
            "- Establishing one joint government to oversee Union matters\n"
            "- Preserving the Zanzibar Revolutionary Government for Zanzibar's internal affairs\n"
            "- Sharing defence, foreign affairs, citizenship, and the joint economy\n"
            "- Granting equal rights to citizens of both sides\n"
            "The Articles had 13 articles and were later amended to fit constitutional "
            "requirements as the Union developed.\n\n"
            "**Why It Matters to Youth:**\n"
            "The Articles of Union are like Tanzania's 'birth certificate' — the documents "
            "showing how our nation was founded through peaceful agreement and mutual "
            "respect between both sides."
        ),
        "fallback_sources": (
            "[1] Hati za Muungano (22 Aprili 1964) | Mada: Hati Rasmi za Muungano | Aina: Hati Rasmi\n"
            "[2] Historia ya Muungano wa Tanganyika na Zanzibar | Mada: Uanzishwaji | Aina: Kitabu cha Historia"
        ),
    },

    "union_matters": {
        "sw": (
            "**Jibu la Moja kwa Moja:**\n"
            "Mambo ya Muungano ni orodha ya masuala yanayosimamiwa na Serikali ya Jamhuri "
            "ya Muungano kwa ajili ya Tanzania Bara na Zanzibar zote mbili. Kwa sasa kuna "
            "mambo 22 ya Muungano yaliyoainishwa katika Jedwali la Kwanza la Katiba ya "
            "Jamhuri ya Muungano wa Tanzania.\n\n"
            "**Maelezo:**\n"
            "Mambo 22 ya Muungano yanajumuisha:\n"
            "1. Katiba na Serikali ya Jamhuri ya Muungano\n"
            "2. Mambo ya nje (foreign affairs)\n"
            "3. Ulinzi na usalama\n"
            "4. Polisi\n"
            "5. Mamlaka ya dharura (emergency powers)\n"
            "6. Uraia na uhamiaji\n"
            "7. Mahakama ya Rufani\n"
            "8. Elimu ya juu\n"
            "9. Takwimu\n"
            "10. Benki kuu na sarafu\n"
            "11. Mikopo na biashara ya nje\n"
            "12. Kodi ya mapato na ushuru wa bidhaa\n"
            "13. Bandari na usafiri wa baharini\n"
            "14. Usafiri wa anga (reli, barabara kuu, na viwanja vya ndege)\n"
            "15. Posta na mawasiliano\n"
            "16. Umeme (nishati)\n"
            "17. Kazi (labour)\n"
            "18. Utangazaji wa habari za umma (national broadcasting)\n"
            "19. Vyama vya siasa (political parties)\n"
            "20. Mahakama ya kesi (Court of Appeal)\n"
            "21. Usalama wa taifa (national security)\n"
            "22. Mazingira (environment) — iliongezwa baadaye\n"
            "Zanzibar inabaki na haki ya kujitawalia mambo yote yasiyo kwenye orodha hii.\n\n"
            "**Umuhimu kwa Vijana:**\n"
            "Kuelewa mambo ya Muungano kunasaidia kujua mipaka ya mamlaka kati ya Serikali "
            "ya Muungano na Serikali ya Mapinduzi ya Zanzibar, na kuelewa jinsi Tanzania "
            "inavyofanya kazi kama taifa moja lenye mifumo miwili ya serikali."
        ),
        "en": (
            "**Direct Answer:**\n"
            "Union Matters are the list of issues managed by the Government of the United "
            "Republic of Tanzania for both Tanzania Mainland and Zanzibar. Currently there "
            "are 22 Union Matters listed in the First Schedule of the Constitution of the "
            "United Republic of Tanzania.\n\n"
            "**Explanation:**\n"
            "The 22 Union Matters include:\n"
            "1. Constitution and Government of the United Republic\n"
            "2. Foreign Affairs\n"
            "3. Defence and Security\n"
            "4. Police\n"
            "5. Emergency Powers\n"
            "6. Citizenship and Immigration\n"
            "7. The Court of Appeal\n"
            "8. Higher Education\n"
            "9. Statistics\n"
            "10. The Central Bank and Currency\n"
            "11. External Borrowing and Trade\n"
            "12. Income Tax and Customs Duties\n"
            "13. Harbours and Shipping\n"
            "14. Air Transport (railways, trunk roads, and airports)\n"
            "15. Posts and Telecommunications\n"
            "16. Electricity (energy)\n"
            "17. Labour\n"
            "18. National Broadcasting Services\n"
            "19. Political Parties\n"
            "20. Court of Appeal\n"
            "21. National Security\n"
            "22. Environment — added later\n"
            "Zanzibar retains the right to self-govern on all matters not in this list.\n\n"
            "**Why It Matters to Youth:**\n"
            "Understanding Union Matters helps clarify the boundaries of authority between "
            "the Union Government and the Zanzibar Revolutionary Government, and explains "
            "how Tanzania functions as one nation with two government systems."
        ),
        "fallback_sources": (
            "[1] Katiba ya Jamhuri ya Muungano wa Tanzania (1977) — Jedwali la Kwanza | Mada: Mambo ya Muungano | Aina: Katiba Rasmi\n"
            "[2] Mambo 22 ya Muungano | Mada: Muundo wa Muungano | Aina: Hati ya Kikatiba\n"
            "[3] Historia ya Muungano wa Tanganyika na Zanzibar | Mada: Muungano | Aina: Kitabu cha Historia"
        ),
    },

    "union_benefits": {
        "sw": (
            "**Jibu la Moja kwa Moja:**\n"
            "Faida za Muungano kwa Watanzania ni pamoja na umoja wa kitaifa, usalama wa "
            "pamoja, ushirikiano wa kiuchumi, uwakilishi wa kimataifa, fursa za elimu na "
            "ajira kwa pande zote mbili, na utambulisho wa pamoja kama Watanzania.\n\n"
            "**Maelezo:**\n"
            "Faida kuu za Muungano:\n"
            "1. Umoja na amani: Muungano umehifadhi amani kwa miaka zaidi ya 60 kati ya "
            "Tanzania Bara na Zanzibar.\n"
            "2. Usalama wa pamoja: Nguvu za ulinzi wa pamoja zimesaidia kulinda pande zote "
            "mbili dhidi ya vitisho vya nje.\n"
            "3. Ushirikiano wa kiuchumi: Biashara, usafiri, na masoko ya pamoja yameimarisha "
            "uchumi wa pande zote mbili.\n"
            "4. Uwakilishi wa kimataifa: Tanzania moja ina sauti yenye nguvu zaidi katika "
            "mazungumzo ya kimataifa kuliko nchi mbili ndogo.\n"
            "5. Fursa za elimu: Wanafunzi wa Tanzania Bara na Zanzibar wanaweza kusomea "
            "katika taasisi za elimu ya juu za pande zote mbili.\n"
            "6. Uhamaji huru: Raia wanaweza kusafiri na kufanya kazi Tanzania Bara na "
            "Zanzibar bila vikwazo vikubwa vya mipaka.\n\n"
            "**Umuhimu kwa Vijana:**\n"
            "Kwa vijana, Muungano unafungua milango ya elimu, ajira, biashara, na mwingiliano "
            "wa kiutamaduni kati ya Tanzania Bara na Zanzibar. Ni mfumo unaowapa fursa zaidi "
            "kuliko ilivyowezekana kwa nchi ndogo mbili tofauti."
        ),
        "en": (
            "**Direct Answer:**\n"
            "The benefits of the Union for Tanzanians include national unity, shared security, "
            "economic cooperation, international representation, education and employment "
            "opportunities for both sides, and a shared identity as Tanzanians.\n\n"
            "**Explanation:**\n"
            "Key benefits of the Union:\n"
            "1. Unity and peace: The Union has maintained peace for over 60 years between "
            "Mainland Tanzania and Zanzibar.\n"
            "2. Shared security: Joint defence forces have helped protect both sides from "
            "external threats.\n"
            "3. Economic cooperation: Shared trade, transport, and markets have strengthened "
            "the economies of both sides.\n"
            "4. International representation: One Tanzania has a stronger voice in "
            "international negotiations than two small separate nations.\n"
            "5. Education opportunities: Students from Mainland Tanzania and Zanzibar can "
            "study in higher education institutions on either side.\n"
            "6. Freedom of movement: Citizens can travel and work between Mainland Tanzania "
            "and Zanzibar without major border restrictions.\n\n"
            "**Why It Matters to Youth:**\n"
            "For young people, the Union opens doors to education, employment, business, and "
            "cultural exchange between Mainland Tanzania and Zanzibar — a system that gives "
            "more opportunities than two small separate nations could offer."
        ),
        "fallback_sources": (
            "[1] Historia ya Muungano wa Tanganyika na Zanzibar | Mada: Faida za Muungano | Aina: Kitabu cha Historia\n"
            "[2] Katiba ya Jamhuri ya Muungano wa Tanzania (1977) | Mada: Muundo wa Muungano | Aina: Katiba Rasmi"
        ),
    },

    "union_challenges": {
        "sw": (
            "**Jibu la Moja kwa Moja:**\n"
            "Changamoto za Muungano zinahusiana na tafsiri ya mambo ya Muungano, uratibu "
            "wa taasisi, mgawanyo wa mapato na rasilimali, uelewa wa umma, na ukosefu wa "
            "elimu ya kutosha kuhusu Muungano kwa wananchi wengi.\n\n"
            "**Maelezo:**\n"
            "Changamoto kuu za Muungano ni:\n"
            "1. Tafsiri ya Mambo ya Muungano: Mara nyingi kuna maswali kuhusu ni masuala "
            "gani yanayosimamiwa na Serikali ya Muungano na ni yapi yanayosimamiwa na "
            "Serikali ya Zanzibar.\n"
            "2. Mapato na rasilimali: Kuna mijadala kuhusu jinsi mapato ya taifa na "
            "rasilimali zinavyogawanywa kati ya Tanzania Bara na Zanzibar.\n"
            "3. Uratibu wa taasisi: Baadhi ya taasisi za Muungano na za Zanzibar zinahitaji "
            "uratibu bora ili kufanya kazi vizuri pamoja.\n"
            "4. Uelewa mdogo: Wananchi wengi, hasa vijana, hawana elimu ya kutosha kuhusu "
            "mfumo wa Muungano, mambo yake, na haki zao kama raia.\n"
            "5. Siasa na utambulisho: Wakati mwingine Muungano unakabiliwa na siasa za "
            "utambulisho wa kikanda ambazo zinaweza kuleta mivutano.\n\n"
            "**Umuhimu kwa Vijana:**\n"
            "Vijana wana jukumu muhimu la kuelewa changamoto hizi na kushiriki katika "
            "mijadala ya kiraia ili kuimarisha Muungano. Ushiriki wa vijana katika elimu "
            "ya uraia na mazungumzo ya kisiasa ni muhimu kwa mustakabali wa Muungano."
        ),
        "en": (
            "**Direct Answer:**\n"
            "The challenges of the Union relate to interpretation of Union matters, "
            "institutional coordination, sharing of revenue and resources, public "
            "understanding, and insufficient civic education about the Union among "
            "many citizens.\n\n"
            "**Explanation:**\n"
            "Key challenges of the Union:\n"
            "1. Interpretation of Union Matters: There are often questions about which "
            "issues are managed by the Union Government and which are managed by the "
            "Zanzibar Government.\n"
            "2. Revenue and resources: There are debates about how national revenue and "
            "resources are distributed between Mainland Tanzania and Zanzibar.\n"
            "3. Institutional coordination: Some Union and Zanzibar institutions need better "
            "coordination to work well together.\n"
            "4. Low public awareness: Many citizens, especially youth, lack sufficient "
            "education about the Union structure, its matters, and their rights as citizens.\n"
            "5. Politics and identity: Sometimes the Union faces regional identity politics "
            "that can create tensions.\n\n"
            "**Why It Matters to Youth:**\n"
            "Young people have an important role in understanding these challenges and "
            "participating in civic dialogue to strengthen the Union. Youth engagement "
            "in civic education and political discussion is vital for the Union's future."
        ),
        "fallback_sources": (
            "[1] Historia ya Muungano wa Tanganyika na Zanzibar | Mada: Changamoto za Muungano | Aina: Kitabu cha Historia\n"
            "[2] Mjadala wa Umma kuhusu Muungano | Mada: Changamoto | Aina: Makala ya Kiakademia"
        ),
    },

    "revolution_zanzibar": {
        "sw": (
            "**Jibu la Moja kwa Moja:**\n"
            "Mapinduzi ya Zanzibar yalifanyika tarehe 12 Januari 1964. Mapinduzi haya "
            "yalipindua Sultani wa Zanzibar na kuanzisha Serikali ya Mapinduzi chini ya "
            "Sheikh Abeid Amani Karume na Chama cha Afro-Shirazi Party (ASP).\n\n"
            "**Maelezo:**\n"
            "Kabla ya Mapinduzi, Zanzibar ilikuwa chini ya utawala wa Sultani wa Kiarabu. "
            "Idadi kubwa ya wakazi — hasa watu wa asili ya Kiafrika — walikuwa wanakabiliwa "
            "na ukosefu wa haki za kisiasa na kiuchumi. Tarehe 12 Januari 1964, kikosi cha "
            "wapiganaji kilichoongozwa na John Okello kilifanya mapinduzi ya silaha. Sultani "
            "Jamshid bin Abdullah alilazimika kukimbia nchini. Serikali ya Mapinduzi "
            "ilianzishwa na Karume akiwa Rais. Mapinduzi haya yalikuwa na athari kubwa "
            "kwa siasa za Zanzibar na Afrika Mashariki.\n\n"
            "Mapinduzi yalikuwa moja ya sababu kuu zilizosababisha Muungano wa Tanganyika "
            "na Zanzibar Aprili 1964, kwa sababu yalileta msukosuko wa kisiasa ambao "
            "ulihitaji suluhisho la haraka.\n\n"
            "**Umuhimu kwa Vijana:**\n"
            "Mapinduzi ya Zanzibar ni sehemu muhimu ya historia ya Tanzania. Kuelewa "
            "tukio hili kunasaidia kuelewa jinsi Muungano ulivyotokea na changamoto "
            "ambazo viongozi wa wakati huo walikabiliana nazo."
        ),
        "en": (
            "**Direct Answer:**\n"
            "The Zanzibar Revolution took place on 12 January 1964. The revolution "
            "overthrew the Sultanate of Zanzibar and established a Revolutionary Government "
            "under Sheikh Abeid Amani Karume and the Afro-Shirazi Party (ASP).\n\n"
            "**Explanation:**\n"
            "Before the Revolution, Zanzibar was under an Arab-led Sultanate. The majority "
            "of residents — especially those of African descent — faced political and economic "
            "inequality. On 12 January 1964, a force of fighters led by John Okello launched "
            "an armed uprising. Sultan Jamshid bin Abdullah was forced to flee the country. "
            "A Revolutionary Government was established with Karume as President. The "
            "revolution had major consequences for Zanzibar's politics and East Africa.\n\n"
            "The Revolution was one of the key reasons that led to the Union of Tanganyika "
            "and Zanzibar in April 1964, as it created political instability that required "
            "an urgent solution.\n\n"
            "**Why It Matters to Youth:**\n"
            "The Zanzibar Revolution is an important part of Tanzania's history. Understanding "
            "this event helps explain how the Union came about and the challenges the leaders "
            "of that era faced."
        ),
        "fallback_sources": (
            "[1] Historia ya Mapinduzi ya Zanzibar (12 Januari 1964) | Mada: Mapinduzi | Aina: Kitabu cha Historia\n"
            "[2] Historia ya Muungano wa Tanganyika na Zanzibar | Mada: Muktadha wa Kihistoria | Aina: Kitabu cha Historia"
        ),
    },

    "tanganyika_independence": {
        "sw": (
            "**Jibu la Moja kwa Moja:**\n"
            "Tanganyika ilipata uhuru wake tarehe 9 Desemba 1961, na kuwa jamhuri tarehe "
            "9 Desemba 1962 chini ya uongozi wa Mwalimu Julius Kambarage Nyerere.\n\n"
            "**Maelezo:**\n"
            "Tanganyika ilikuwa chini ya utawala wa Uingereza kama eneo la kuaminika la UN. "
            "Harakati za uhuru ziliongozwa hasa na Tanganyika African National Union (TANU) "
            "iliyoanzishwa na Nyerere mwaka 1954. Tarehe 9 Desemba 1961, Tanganyika ilipata "
            "uhuru wake. Nyerere alikuwa Waziri Mkuu wa kwanza. Tarehe 9 Desemba 1962, "
            "Tanganyika ikawa jamhuri na Nyerere akawa Rais wa kwanza. Baadaye, tarehe 26 "
            "Aprili 1964, Tanganyika iliungana na Zanzibar kuunda Tanzania.\n\n"
            "**Umuhimu kwa Vijana:**\n"
            "Historia ya uhuru wa Tanganyika inaonyesha nguvu ya umoja na uongozi thabiti "
            "katika kupigana dhidi ya ukoloni. Nyerere ni mfano mkubwa wa kiongozi aliyeweka "
            "maslahi ya taifa mbele ya yake binafsi."
        ),
        "en": (
            "**Direct Answer:**\n"
            "Tanganyika gained independence on 9 December 1961, and became a republic on "
            "9 December 1962 under the leadership of Mwalimu Julius Kambarage Nyerere.\n\n"
            "**Explanation:**\n"
            "Tanganyika was under British rule as a UN trust territory. The independence "
            "movement was led mainly by the Tanganyika African National Union (TANU), "
            "founded by Nyerere in 1954. On 9 December 1961, Tanganyika gained independence "
            "and Nyerere became the first Prime Minister. On 9 December 1962, Tanganyika "
            "became a republic and Nyerere became the first President. Later, on 26 April "
            "1964, Tanganyika merged with Zanzibar to form Tanzania.\n\n"
            "**Why It Matters to Youth:**\n"
            "The history of Tanganyika's independence shows the power of unity and strong "
            "leadership in the fight against colonialism. Nyerere is a great example of a "
            "leader who put the nation's interests above his own."
        ),
        "fallback_sources": (
            "[1] Historia ya Uhuru wa Tanganyika (1961) | Mada: Uhuru wa Tanganyika | Aina: Kitabu cha Historia\n"
            "[2] Historia ya Muungano wa Tanganyika na Zanzibar | Mada: Muktadha wa Kihistoria | Aina: Kitabu cha Historia"
        ),
    },

    "constitution_union": {
        "sw": (
            "**Jibu la Moja kwa Moja:**\n"
            "Katiba ya Jamhuri ya Muungano wa Tanzania ya 1977 ni msingi wa kisheria wa "
            "mfumo wa Muungano. Inaorodhesha mambo ya Muungano, haki za raia, na muundo "
            "wa taasisi za Serikali ya Muungano.\n\n"
            "**Maelezo:**\n"
            "Tanzania imekuwa na katiba kadhaa. Katiba ya kwanza ya mwaka 1964 ilianzisha "
            "mfumo wa Muungano. Katiba ya mwaka 1977 ilikuwa ya mfumo wa chama kimoja. "
            "Mabadiliko ya mwaka 1984 yaliongeza Mswada wa Haki. Mabadiliko ya mwaka 1992 "
            "yaliruhusu mfumo wa vyama vingi. Zanzibar ina katiba yake ya mwaka 1984 "
            "inayosimamia mambo ya ndani ya Zanzibar ndani ya mfumo wa Muungano.\n\n"
            "**Umuhimu kwa Vijana:**\n"
            "Katiba ni msingi wa haki na wajibu wa kila raia. Kuelewa katiba ni kuelewa "
            "haki zako kama Mtanzania na jinsi unavyoweza kushiriki katika utawala wa nchi."
        ),
        "en": (
            "**Direct Answer:**\n"
            "The Constitution of the United Republic of Tanzania of 1977 is the legal "
            "foundation of the Union structure. It lists Union Matters, citizens' rights, "
            "and the institutional structure of the Union Government.\n\n"
            "**Explanation:**\n"
            "Tanzania has had several constitutions. The 1964 Constitution established the "
            "Union framework. The 1977 Constitution operated under a single-party system. "
            "The 1984 amendments added a Bill of Rights. The 1992 amendments allowed "
            "multi-party politics. Zanzibar has its own 1984 Constitution governing "
            "Zanzibar's internal affairs within the Union framework.\n\n"
            "**Why It Matters to Youth:**\n"
            "The constitution is the foundation of every citizen's rights and duties. "
            "Understanding the constitution means understanding your rights as a Tanzanian "
            "and how you can participate in governing the country."
        ),
        "fallback_sources": (
            "[1] Katiba ya Jamhuri ya Muungano wa Tanzania (1977) | Mada: Muundo wa Katiba | Aina: Katiba Rasmi\n"
            "[2] Katiba ya Zanzibar (1984) | Mada: Muundo wa Zanzibar | Aina: Katiba Rasmi"
        ),
    },

    "zanzibar_constitution": {
        "sw": (
            "**Jibu la Moja kwa Moja:**\n"
            "Katiba ya Zanzibar ya 1984 inaeleza mfumo wa Serikali ya Mapinduzi ya Zanzibar "
            "na Baraza la Wawakilishi ndani ya muundo wa Jamhuri ya Muungano wa Tanzania.\n\n"
            "**Maelezo:**\n"
            "Katiba ya Zanzibar ya 1984 ilianzishwa chini ya uongozi wa Ali Hassan Mwinyi. "
            "Inaorodhesha muundo wa Serikali ya Mapinduzi ya Zanzibar, haki za raia wa "
            "Zanzibar, na uhusiano kati ya Zanzibar na Serikali ya Muungano. Katiba hii "
            "inasimamia mambo yote ya ndani ya Zanzibar ambayo si sehemu ya mambo ya Muungano. "
            "Imebadilishwa mara kadhaa, ikiwemo mwaka 2010 na 2020.\n\n"
            "**Umuhimu kwa Vijana:**\n"
            "Kuelewa Katiba ya Zanzibar kunasaidia kuelewa jinsi Zanzibar inavyojitawala "
            "mambo yake ya ndani ndani ya mfumo mpana wa Muungano wa Tanzania."
        ),
        "en": (
            "**Direct Answer:**\n"
            "The Zanzibar Constitution of 1984 describes the structure of the Zanzibar "
            "Revolutionary Government and the House of Representatives within the framework "
            "of the United Republic of Tanzania.\n\n"
            "**Explanation:**\n"
            "The 1984 Zanzibar Constitution was enacted under the leadership of Ali Hassan "
            "Mwinyi. It lists the structure of the Zanzibar Revolutionary Government, the "
            "rights of Zanzibar citizens, and the relationship between Zanzibar and the "
            "Union Government. This constitution governs all internal Zanzibar matters that "
            "are not part of Union Matters. It has been amended several times, including "
            "in 2010 and 2020.\n\n"
            "**Why It Matters to Youth:**\n"
            "Understanding the Zanzibar Constitution helps explain how Zanzibar self-governs "
            "its internal affairs within the broader framework of the Union of Tanzania."
        ),
        "fallback_sources": (
            "[1] Katiba ya Zanzibar (1984) | Mada: Muundo wa Zanzibar | Aina: Katiba Rasmi\n"
            "[2] Historia ya Muungano wa Tanganyika na Zanzibar | Mada: Muundo wa Serikali | Aina: Kitabu cha Historia"
        ),
    },

    "union_institutions": {
        "sw": (
            "**Jibu la Moja kwa Moja:**\n"
            "Taasisi za Muungano ni vyombo vinavyosimamia mambo ya Muungano kwa pande zote "
            "mbili za Tanzania. Zinajumuisha: Rais wa Muungano, Bunge la Jamhuri ya Muungano, "
            "Serikali ya Muungano (Baraza la Mawaziri), na Mahakama ya Rufani.\n\n"
            "**Maelezo:**\n"
            "Taasisi kuu za Muungano:\n"
            "1. Rais wa Jamhuri ya Muungano: Kiongozi mkuu wa nchi, anachaguliwa na wananchi.\n"
            "2. Bunge la Jamhuri ya Muungano: Taasisi ya kutunga sheria za Muungano, ina "
            "wabunge kutoka Tanzania Bara na Zanzibar.\n"
            "3. Baraza la Mawaziri: Serikali ya Muungano inayoongozwa na Waziri Mkuu.\n"
            "4. Mahakama ya Rufani: Mahakama ya juu zaidi ya Muungano kwa kesi za madai.\n"
            "5. Jeshi la Ulinzi wa Wananchi wa Tanzania (JWTZ): Nguvu za ulinzi za Muungano.\n"
            "6. Jeshi la Polisi la Tanzania: Nguvu za usalama wa Muungano.\n\n"
            "**Umuhimu kwa Vijana:**\n"
            "Taasisi za Muungano ndizo zinazotekeleza haki na wajibu wa Muungano kwa kila "
            "raia. Kuzielewa kunasaidia kujua jinsi ya kupata huduma za serikali na "
            "kushiriki katika mchakato wa demokrasia."
        ),
        "en": (
            "**Direct Answer:**\n"
            "Union institutions are the bodies that manage Union matters for both sides of "
            "Tanzania. They include: the President of the Union, the Parliament of the "
            "United Republic, the Union Government (Cabinet), and the Court of Appeal.\n\n"
            "**Explanation:**\n"
            "Key Union institutions:\n"
            "1. President of the United Republic: The head of state, elected by citizens.\n"
            "2. Parliament of the United Republic: The law-making body for Union matters, "
            "with MPs from both Mainland Tanzania and Zanzibar.\n"
            "3. Cabinet: The Union Government led by the Prime Minister.\n"
            "4. Court of Appeal: The highest Union court for civil cases.\n"
            "5. Tanzania People's Defence Forces (TPDF): The Union's military forces.\n"
            "6. Tanzania Police Force: The Union's security forces.\n\n"
            "**Why It Matters to Youth:**\n"
            "Union institutions implement the rights and duties of the Union for every "
            "citizen. Understanding them helps young people know how to access government "
            "services and participate in democratic processes."
        ),
        "fallback_sources": (
            "[1] Katiba ya Jamhuri ya Muungano wa Tanzania (1977) | Mada: Taasisi za Muungano | Aina: Katiba Rasmi\n"
            "[2] Historia ya Muungano wa Tanganyika na Zanzibar | Mada: Muundo wa Muungano | Aina: Kitabu cha Historia"
        ),
    },

    "youth_and_union": {
        "sw": (
            "**Jibu la Moja kwa Moja:**\n"
            "Muungano una umuhimu mkubwa kwa vijana wa Tanzania kwa sababu unaathiri "
            "utambulisho wao, elimu, ajira, biashara, ushiriki wa kiraia, na fursa za "
            "maendeleo katika Tanzania Bara na Zanzibar.\n\n"
            "**Maelezo:**\n"
            "Muungano unaathiri maisha ya vijana kwa njia hizi:\n"
            "1. Utambulisho: Muungano unaweka msingi wa utambulisho wa pamoja kama 'Mtanzania.'\n"
            "2. Elimu: Vijana wanaweza kusomea katika vyuo vikuu vya Tanzania Bara na Zanzibar.\n"
            "3. Ajira: Muungano unafungua fursa za kazi katika sekta mbalimbali kwa pande zote.\n"
            "4. Biashara: Vijana wanaoweza kufanya biashara kati ya Tanzania Bara na Zanzibar.\n"
            "5. Ushiriki wa kiraia: Vijana wanaweza kushiriki katika siasa, uchaguzi, na "
            "mijadala ya umma kuhusu masuala ya Muungano.\n"
            "6. Utalii na utamaduni: Muungano unaweka msingi wa mwingiliano wa kiutamaduni "
            "na utalii wa ndani.\n\n"
            "**Umuhimu kwa Vijana:**\n"
            "Vijana wa Tanzania ni walinzi wa Muungano kwa vizazi vijavyo. Kushiriki katika "
            "elimu ya uraia, kuelewa haki na wajibu wa kiraia, na kushiriki katika "
            "demokrasia ni njia muhimu za kulinda na kuimarisha Muungano."
        ),
        "en": (
            "**Direct Answer:**\n"
            "The Union is very important for Tanzania's youth because it affects their "
            "identity, education, employment, business, civic participation, and "
            "development opportunities across Mainland Tanzania and Zanzibar.\n\n"
            "**Explanation:**\n"
            "The Union affects young people's lives in these ways:\n"
            "1. Identity: The Union establishes the foundation of a shared identity as 'Tanzanian.'\n"
            "2. Education: Youth can study at universities on both Mainland Tanzania and Zanzibar.\n"
            "3. Employment: The Union opens work opportunities in various sectors on both sides.\n"
            "4. Business: Young entrepreneurs can do business between Mainland Tanzania and Zanzibar.\n"
            "5. Civic participation: Youth can engage in politics, elections, and public dialogue "
            "about Union matters.\n"
            "6. Tourism and culture: The Union forms the basis for cultural exchange and "
            "domestic tourism.\n\n"
            "**Why It Matters to Youth:**\n"
            "Tanzania's youth are the guardians of the Union for future generations. Engaging "
            "in civic education, understanding rights and civic duties, and participating in "
            "democracy are vital ways to protect and strengthen the Union."
        ),
        "fallback_sources": (
            "[1] Historia ya Muungano wa Tanganyika na Zanzibar | Mada: Vijana na Muungano | Aina: Kitabu cha Historia\n"
            "[2] MuunganoHub Maarifa ya Vijana | Mada: Ushiriki wa Vijana | Aina: Rasilimali ya Elimu"
        ),
    },
}


# ---------------------------------------------------------------------------
# Intent-specific retrieval queries
# ---------------------------------------------------------------------------

INTENT_RETRIEVAL_QUERIES = {
    "definition_union": (
        "maana ya Muungano wa Tanganyika na Zanzibar definition of union United Republic "
        "Tanzania Jamhuri ya Muungano muungano ni nini what is the union structure"
    ),
    "reasons_for_union": (
        "sababu za Muungano Tanganyika Zanzibar waliungana historia usalama umoja kisiasa "
        "Mapinduzi Zanzibar 1964 Nyerere Karume Cold War Pan-Africanism why did Tanganyika "
        "and Zanzibar unite reasons for the Union formation kwanini waliungana"
    ),
    "union_date": (
        "tarehe ya Muungano 26 Aprili 1964 22 Aprili hati za muungano when was the union "
        "formed established date of union April 26 1964 siku ya muungano"
    ),
    "founders_signatories": (
        "Nyerere Karume walitia saini hati za Muungano waasisi founders signatories "
        "Articles of Union Julius Nyerere Abeid Karume signed 1964 rais wa tanganyika "
        "rais wa zanzibar"
    ),
    "articles_of_union": (
        "hati za muungano articles of union 1964 Nyerere Karume signed legal document "
        "mkataba makubaliano vifungu provisions"
    ),
    "union_matters": (
        "mambo ya muungano union matters orodha list constitution katiba jedwali la kwanza "
        "mambo 22 ulinzi usalama mambo ya nje uraia polisi benki kuu"
    ),
    "union_benefits": (
        "faida za muungano manufaa umuhimu muhimu benefits importance important value advantages umoja usalama uchumi biashara "
        "elimu vijana maendeleo fursa ajira uhamaji"
    ),
    "union_challenges": (
        "changamoto za muungano challenges problems matatizo kero interpretation "
        "mapato rasilimali uelewa umma uratibu institutions"
    ),
    "revolution_zanzibar": (
        "mapinduzi ya zanzibar 1964 zanzibar revolution sultani karume John Okello ASP "
        "Afro-Shirazi overthrow Januari 1964 serikali ya mapinduzi"
    ),
    "tanganyika_independence": (
        "uhuru wa tanganyika independence tanganyika 1961 Nyerere TANU self-governance "
        "9 desemba 1961 december 9 british territory"
    ),
    "constitution_union": (
        "katiba ya jamhuri ya muungano 1977 constitution tanzania 1977 mswada wa haki "
        "bill of rights vyama vingi multiparty"
    ),
    "zanzibar_constitution": (
        "katiba ya zanzibar 1984 zanzibar constitution 1984 serikali ya mapinduzi baraza "
        "la wawakilishi Ali Hassan Mwinyi revolutionary government"
    ),
    "union_institutions": (
        "taasisi za muungano union institutions bunge parliament rais president jeshi "
        "polisi mahakama cabinet wizara"
    ),
    "youth_and_union": (
        "vijana na muungano youth and union elimu ajira biashara utambulisho ushiriki "
        "wa kiraia civic education students opportunities"
    ),
}


# ---------------------------------------------------------------------------
# Blocked signals per intent — chunk source/title/topic patterns to reject
# ---------------------------------------------------------------------------

INTENT_BLOCKED_SIGNALS = {
    "reasons_for_union": [
        "zanzibar_constitution_1984",
        "katiba_zanzibar_1984",
        "constitution_1984",
        "zanzibar constitution 1984",
        "katiba ya zanzibar ya 1984",
        "katiba zanzibar 1984",
        "1984 constitution",
    ],
    "definition_union": [
        "zanzibar_constitution_1984",
        "katiba_zanzibar_1984",
        "constitution_1984",
        "zanzibar constitution 1984",
        "katiba ya zanzibar ya 1984",
    ],
    "union_date": [
        "zanzibar_constitution_1984",
        "katiba_zanzibar_1984",
        "katiba ya zanzibar ya 1984",
    ],
    "founders_signatories": [
        "zanzibar_constitution_1984",
        "katiba_zanzibar_1984",
        "katiba ya zanzibar ya 1984",
    ],
    "articles_of_union": [
        "zanzibar_constitution_1984",
        "katiba_zanzibar_1984",
    ],
    "union_benefits": [
        "zanzibar_constitution_1984",
        "katiba_zanzibar_1984",
    ],
    "union_challenges": [
        "zanzibar_constitution_1984",
        "katiba_zanzibar_1984",
    ],
}


# ---------------------------------------------------------------------------
# Intent classifier
# ---------------------------------------------------------------------------

def _norm(text):
    text = re.sub(r"[^\w\s]", " ", text.lower())
    return re.sub(r"\s+", " ", text).strip()


def classify_union_intent(question: str) -> str:
    """
    Classify the intent of a Union-related question.

    Priority order: specific intents first, broad ones last.

    Returns one of:
      definition_union, reasons_for_union, union_date, founders_signatories,
      articles_of_union, union_matters, union_benefits, union_challenges,
      zanzibar_revolution, tanganyika_independence, constitution_union,
      zanzibar_constitution, union_institutions, youth_and_union, unrelated
    """
    q = _norm(question)

    # ── founders / signatories ──────────────────────────────────────────────
    _founder_phrases = (
        "nani walitia saini", "nani alitia saini", "waliotia saini",
        "who signed", "walitia saini hati", "signed the articles",
        "nani waliandika", "who were the founders", "nani walikuwa waasisi",
        "waasisi wa muungano", "founders of the union", "who founded",
        "nani walianzisha muungano",
    )
    if any(p in q for p in _founder_phrases):
        return "founders_signatories"
    if (
        ("nyerere" in q or "karume" in q)
        and any(w in q for w in ("saini", "sign", "hati", "articles", "muungano", "union"))
        and any(w in q for w in ("nani", "who", "waasisi", "founders", "alitia", "walitia"))
    ):
        return "founders_signatories"

    # ── articles of union ───────────────────────────────────────────────────
    _articles_phrases = (
        "hati za muungano", "articles of union", "articles of the union",
        "hati ya muungano", "muungano articles", "the articles",
    )
    if any(p in q for p in _articles_phrases) and not any(
        w in q for w in ("nani", "who", "walitia", "signed", "saini")
    ):
        return "articles_of_union"

    # ── zanzibar constitution 1984 (explicit) ───────────────────────────────
    _zconst_phrases = (
        "katiba ya zanzibar ya 1984", "zanzibar constitution 1984",
        "katiba zanzibar 1984", "1984 constitution zanzibar",
        "katiba ya 1984", "1984 zanzibar",
    )
    if any(p in q for p in _zconst_phrases):
        return "zanzibar_constitution"

    # ── constitution union ──────────────────────────────────────────────────
    _const_phrases = (
        "katiba ya jamhuri ya muungano", "constitution of the united republic",
        "constitution of tanzania", "katiba ya muungano", "union constitution",
        "katiba 1977", "constitution 1977", "katiba ya 1977", "katiba ya jmt",
        "mswada wa haki", "bill of rights tanzania",
    )
    if any(p in q for p in _const_phrases):
        return "constitution_union"

    # ── union date (before reasons — no "why") ─────────────────────────────
    _date_phrases = (
        "muungano ulianza lini", "muungano uliundwa lini", "muungano ulifanyika lini",
        "tarehe ya muungano", "mwaka wa muungano", "ulianzishwa lini", "uliundwa lini",
        "when was the union", "when was the union formed", "when did the union",
        "26 aprili", "22 aprili", "april 26", "april 22", "siku ya muungano lini",
    )
    if any(p in q for p in _date_phrases):
        return "union_date"
    _has_why = any(w in q for w in (
        "kwanini", "kwa nini", "kwani", "sababu", "why", "reason", "reasons",
        "what led", "what caused", "how come", "nini kilisababisha",
    ))
    if (
        "lini" in q
        and ("muungano" in q or "union" in q)
        and not _has_why
    ):
        return "union_date"
    if (
        "when" in q
        and ("union" in q or "muungano" in q)
        and not _has_why
        and "why" not in q
    ):
        return "union_date"

    # ── zanzibar revolution ─────────────────────────────────────────────────
    _rev_phrases = (
        "mapinduzi ya zanzibar", "zanzibar revolution",
        "mapinduzi zanzibar", "revolution of zanzibar",
        "12 januari 1964", "january 12 1964",
        "sultan wa zanzibar", "sultani wa zanzibar",
        "john okello", "afro-shirazi",
    )
    if any(p in q for p in _rev_phrases) and not any(
        w in q for w in ("kwanini", "kwa nini", "kwani", "why", "sababu", "waliungana", "unite")
    ):
        return "revolution_zanzibar"

    # ── reasons for union (CRITICAL CASE) ───────────────────────────────────
    _union_ctx = (
        "muungano", "union", "tanganyika", "zanzibar",
        "waliungana", "waliunganika", "unite", "united", "merge",
    )
    _has_union_ctx = any(w in q for w in _union_ctx)
    if _has_why and _has_union_ctx:
        return "reasons_for_union"
    # "waliungana" alone with both place names
    if (
        "waliungana" in q
        and ("tanganyika" in q or "zanzibar" in q)
    ):
        return "reasons_for_union"
    # "why" with union context even without Swahili why-words
    if (
        "why" in q
        and _has_union_ctx
        and any(w in q for w in ("unite", "union", "join", "merge", "form"))
    ):
        return "reasons_for_union"

    # ── union matters ───────────────────────────────────────────────────────
    _matters_phrases = (
        "mambo ya muungano", "mambo gani ya muungano", "union matters",
        "matters of the union", "matters of union", "mambo 22", "22 mambo",
        "orodha ya mambo", "list of union matters",
    )
    if any(p in q for p in _matters_phrases):
        return "union_matters"

    # ── youth and union ─────────────────────────────────────────────────────
    _youth_phrases = (
        "vijana na muungano", "youth and union", "muungano kwa vijana",
        "union for youth", "vijana wajali", "why should youth",
        "kwa nini vijana", "vijana na tanzania", "unawasaidiaje vijana",
        "unasaidiaje vijana", "muungano unawasaidiaje", "muungano unasaidiaje",
        "how does the union benefit youth", "union benefit youth",
    )
    if any(p in q for p in _youth_phrases):
        return "youth_and_union"

    # ── union benefits ──────────────────────────────────────────────────────
    _benefits_phrases = (
        "faida za muungano", "faida ya muungano", "manufaa ya muungano",
        "umuhimu wa muungano", "kwa nini muungano ni muhimu", "muungano ni muhimu",
        "benefits of the union", "benefits of union", "importance of the union",
        "why is the union important", "value of the union", "advantages of union",
        "muungano unafaida", "muungano unasaidia",
    )
    if any(p in q for p in _benefits_phrases):
        return "union_benefits"
    if (
        (
            "faida" in q
            or "manufaa" in q
            or "umuhimu" in q
            or "muhimu" in q
            or "benefit" in q
            or "importance" in q
            or "important" in q
            or "value" in q
            or "advantage" in q
        )
        and _has_union_ctx
    ):
        return "union_benefits"

    # ── union challenges ────────────────────────────────────────────────────
    _challenges_phrases = (
        "changamoto za muungano", "challenges of union", "matatizo ya muungano",
        "kero za muungano", "problems with union", "challenges facing the union",
        "tatizo la muungano",
    )
    if any(p in q for p in _challenges_phrases):
        return "union_challenges"
    if (
        ("changamoto" in q or "challenge" in q or "problem" in q or "matatizo" in q)
        and _has_union_ctx
    ):
        return "union_challenges"

    # ── tanganyika independence ─────────────────────────────────────────────
    _indep_phrases = (
        "uhuru wa tanganyika", "independence of tanganyika", "tanganyika independence",
        "tanganyika uhuru", "uhuru tanganyika", "tanganyika ilipata uhuru",
        "tanganyika became independent",
    )
    if any(p in q for p in _indep_phrases):
        return "tanganyika_independence"

    # ── union institutions ──────────────────────────────────────────────────
    _inst_phrases = (
        "taasisi za muungano", "union institutions", "bunge la muungano",
        "parliament of the union", "serikali ya muungano institutions",
        "jeshi la muungano", "polisi wa muungano",
    )
    if any(p in q for p in _inst_phrases):
        return "union_institutions"

    # ── youth and union ─────────────────────────────────────────────────────
    _youth_phrases = (
        "vijana na muungano", "youth and union", "muungano kwa vijana",
        "union for youth", "vijana wajali", "why should youth",
        "kwa nini vijana", "vijana na tanzania", "unawasaidiaje vijana",
        "unasaidiaje vijana", "muungano unawasaidiaje", "muungano unasaidiaje",
        "how does the union benefit youth", "union benefit youth",
    )
    if any(p in q for p in _youth_phrases):
        return "youth_and_union"

    # ── definition union (broad catch) ─────────────────────────────────────
    _def_phrases = (
        "nini muungano", "muungano ni nini", "what is the union",
        "what is a union", "what is union", "what is muungano",
        "maana ya muungano", "union ni nini", "define union", "define the union",
        "explain the union", "eleza muungano", "describe the union",
        "meaning of union", "union maana", "what does union mean",
        "what is tanzania", "nini tanzania",
    )
    if any(p in q for p in _def_phrases):
        return "definition_union"
    if (
        ("nini" in q or "what" in q)
        and ("muungano" in q or "union" in q)
        and not _has_why
        and "lini" not in q
        and "when" not in q
        and "nani" not in q
        and "who" not in q
    ):
        return "definition_union"

    return "unrelated"

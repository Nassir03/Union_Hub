const BACKGROUND_DEFAULT_VERSION = "20260608-muungano-homepage-default";
const storedBackgroundVersion = localStorage.getItem("muunganohub_background_default_version") || "";
let storedBackground = localStorage.getItem("muunganohub_background") || "";
if (storedBackgroundVersion !== BACKGROUND_DEFAULT_VERSION && (!storedBackground || storedBackground === "digital")) {
  storedBackground = "muungano";
  localStorage.setItem("muunganohub_background", storedBackground);
  localStorage.setItem("muunganohub_background_default_version", BACKGROUND_DEFAULT_VERSION);
}

const state = {
  token: localStorage.getItem("muunganohub_token") || "",
  user: JSON.parse(localStorage.getItem("muunganohub_user") || "null"),
  sessionId: localStorage.getItem("muunganohub_session") || "",
  language: localStorage.getItem("muunganohub_language") || "en",
  currentPage: "home",
  activeStory: 0,
  audioLanguage: localStorage.getItem("muunganohub_audio_language") || "en",
  quizLevel: "beginner",
  quizIndex: 0,
  quizScore: 0,
  quizAnswered: false,
  background: storedBackground || "muungano",
};

let OFFLINE_MODE = !navigator.onLine;
let currentTtsAudio = null;
let ttsQueue = [];
let ttsQueueIndex = 0;
let audioPlaybackId = 0;

const APP_BASE_PATH = (() => {
  const path = window.location.pathname || "/";
  const marker = "/MuunganoHub";
  if (path === marker || path.startsWith(`${marker}/`)) return marker;
  const staticIndex = path.indexOf("/static/");
  return staticIndex > 0 ? path.slice(0, staticIndex) : "";
})();

function appUrl(url) {
  if (!url) return "";
  if (/^(?:https?:|mailto:|tel:|data:|blob:)/i.test(url)) return url;
  if (APP_BASE_PATH && url.startsWith("/static/")) return `${APP_BASE_PATH}${url.slice("/static".length)}`;
  if (APP_BASE_PATH && url.startsWith("static/")) return `${APP_BASE_PATH}/${url.slice("static/".length)}`;
  if (url.startsWith("/static/") || url === "/sw.js") return url;
  if (url.startsWith("static/")) return `/${url}`;
  return url;
}

function attrUrl(url) {
  return escapeAttribute(appUrl(url));
}

function localAssetPath(url) {
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.origin !== window.location.origin) return "";
    let pathname = parsed.pathname;
    if (APP_BASE_PATH && pathname.startsWith(`${APP_BASE_PATH}/`)) pathname = pathname.slice(APP_BASE_PATH.length);
    return pathname;
  } catch {
    return "";
  }
}

function isManagedAssetLink(anchor) {
  const pathname = localAssetPath(anchor.href);
  return pathname.startsWith("/static/assets/docs/") ||
    pathname.startsWith("/static/assets/videos/") ||
    pathname.startsWith("/assets/docs/") ||
    pathname.startsWith("/assets/videos/");
}

function openManagedAsset(anchor) {
  const url = anchor.href;
  const opensNewTab = (anchor.target || "").toLowerCase() === "_blank";
  if (opensNewTab) {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    window.location.href = url;
  }
}

const backgroundOptions = [
  { id: "muungano", label: { en: "Muungano Coast", sw: "Pwani ya Muungano" }, src: "/static/assets/muungano-homepage-bg.png" },
  { id: "digital", label: { en: "Digital Blue", sw: "Digital Blue" }, src: "/static/assets/bg-digital-blue.jpg" },
  { id: "globe", label: { en: "Union Globe", sw: "Globe ya Muungano" }, src: "/static/assets/bg-globe-tech.webp" },
  { id: "ocean", label: { en: "Ocean Sunset", sw: "Bahari Sunset" }, src: "/static/assets/bg-ocean-sunset.webp" },
  { id: "learning", label: { en: "Learning Space", sw: "Learning Space" }, src: "/static/assets/bg-learning-3d.webp" },
  { id: "nature", label: { en: "Fresh Nature", sw: "Asili Safi" }, src: "/static/assets/bg-nature-leaf.webp" },
];

const pageIcons = {
  home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/></svg>`,
  dashboard: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="8" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="15" width="7" height="6" rx="1.5"/></svg>`,
  about: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10v6"/><path d="M12 7.5h.01"/></svg>`,
  history: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10a4 4 0 0 1 4 4v12H7a2 2 0 0 1-2-2z"/><path d="M7 18h12"/><path d="M8 7h7"/><path d="M8 11h5"/></svg>`,
  timeline: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h6"/><path d="M14 6h6"/><path d="M4 18h6"/><path d="M14 18h6"/><path d="M12 6v12"/><circle cx="12" cy="6" r="2"/><circle cx="12" cy="18" r="2"/></svg>`,
  quiz: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9a3 3 0 1 1 5.2 2c-1.2 1-2.2 1.7-2.2 3"/><path d="M12 18h.01"/><circle cx="12" cy="12" r="9"/></svg>`,
  passport: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6"/><circle cx="12" cy="13" r="3"/><path d="M9 17h6"/></svg>`,
  safari: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 5 21l7-4 7 4z"/><path d="M12 2v15"/></svg>`,
  connect: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><path d="M2 21a5 5 0 0 1 10 0"/><path d="M12 21a5 5 0 0 1 10 0"/></svg>`,
  chatbot: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-5 4v-4H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M8 10h8"/><path d="M8 14h5"/></svg>`,
  media: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/></svg>`,
  leaders: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/><path d="M17 5l2-2 2 2"/></svg>`,
  audio: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4z"/><path d="M17 9a4 4 0 0 1 0 6"/><path d="M19.5 6.5a8 8 0 0 1 0 11"/></svg>`,
  profile: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`,
  competition: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M5 5H3v2a4 4 0 0 0 4 4"/><path d="M19 5h2v2a4 4 0 0 1-4 4"/></svg>`,
};

const translations = {
  sw: {
    languageLabel: "Lugha",
    loginTab: "Ingia",
    registerTab: "Jisajili",
    emailLabel: "Barua pepe",
    passwordLabel: "Nenosiri",
    nameLabel: "Jina kamili",
    loginButton: "Ingia",
    registerButton: "Fungua akaunti",
    forgotPasswordButton: "Umesahau nenosiri?",
    passwordResetHelp: "Weka barua pepe ya akaunti yako. Tutatuma msimbo wa kurejesha, kisha utaweka nenosiri jipya.",
    sendResetCodeButton: "Tuma msimbo",
    resetCodeLabel: "Msimbo wa kurejesha",
    newPasswordLabel: "Nenosiri jipya",
    confirmNewPasswordLabel: "Rudia nenosiri jipya",
    resetPasswordButton: "Badili nenosiri",
    backToLoginButton: "Rudi kuingia",
    logoutButton: "Toka",
    newChatButton: "Mazungumzo mapya",
    dashboardButton: "Dashibodi",
    profileButton: "Profile",
    aboutButton: "Kuhusu",
    askAiButton: "Uliza AI",
    backgroundButton: "Mandhari",
    sendButton: "Tuma",
    competitionEyebrow: "UBUNIFU WA MFUMO WA ELIMU YA MUUNGANO KWA UMMA",
    signingIn: "Inaingia...",
    creatingAccount: "Inafungua akaunti...",
    sendingResetCode: "Inatuma msimbo wa kurejesha...",
    resettingPassword: "Inabadilisha nenosiri...",
    resetCodeSent: "Kama barua pepe hiyo imesajiliwa, msimbo wa kurejesha umetumwa.",
    resetEmailSent: "Msimbo wa kurejesha umetumwa kwenye barua pepe yako.",
    resetEndpointMissing: "Backend ya zamani bado inaendelea. Zima server kisha iwashe tena ili kipengele cha Forgot password kifanye kazi.",
    resetEmailConfigProblem: "Email haijasanidiwa vizuri. Tumia msimbo wa majaribio hapa chini au rekebisha SMTP.",
    passwordResetDone: "Nenosiri limebadilishwa. Sasa unaweza kuingia.",
    resetFieldsRequired: "Weka msimbo wa tarakimu 8, nenosiri jipya, na uthibitisho wake.",
    resetCodeInvalid: "Msimbo wa kurejesha lazima uwe na tarakimu 8.",
    searching: "Inatafuta vyanzo...",
    offlineMode: "Offline Mode",
    offline: "Backend haijawashwa",
    offlineLoginReady: "Umeingia kwa offline mode. Data itahifadhiwa kwenye browser hii.",
    offlineRegisterReady: "Akaunti ya offline imeundwa kwenye browser hii.",
    profileSaved: "Profile imehifadhiwa.",
    passwordsDoNotMatch: "Nenosiri jipya na uthibitisho wake havifanani.",
    audioUnsupported: "Browser hii haitumii kusoma kwa sauti.",
    newChatStarted: "Mazungumzo mapya yameanza. Uliza swali kuhusu Muungano kwa Kiswahili au English.",
    chatWelcome: "Karibu. Uliza kuhusu Muungano, Tanganyika, Zanzibar, Katiba, viongozi au historia husika.",
    questionPlaceholder: "Uliza kwa Kiswahili au English...",
      pageTitles: {
        home: "Home",
        dashboard: "Dashboard",
        about: "Kuhusu",
        history: "Historia",
        timeline: "Timeline",
        quiz: "Muungano Challenge",
      passport: "Passport",
      safari: "Safari",
      connect: "Connect",
      leaders: "Viongozi wa Muungano",
      audio: "Sikiliza Historia",
      profile: "Profile",
      media: "Video Gallery",
      chatbot: "Uliza AI",
      competition: "Project Pitch",
    },
  },
  en: {
    languageLabel: "Language",
    loginTab: "Login",
    registerTab: "Register",
    emailLabel: "Email",
    passwordLabel: "Password",
    nameLabel: "Full name",
    loginButton: "Login",
    registerButton: "Create account",
    forgotPasswordButton: "Forgot password?",
    passwordResetHelp: "Enter your account email. We will send a reset code, then you can create a new password.",
    sendResetCodeButton: "Send reset code",
    resetCodeLabel: "Reset code",
    newPasswordLabel: "New password",
    confirmNewPasswordLabel: "Confirm new password",
    resetPasswordButton: "Reset password",
    backToLoginButton: "Back to login",
    logoutButton: "Logout",
    newChatButton: "New Chat",
    dashboardButton: "Dashboard",
    profileButton: "Profile",
    aboutButton: "About",
    askAiButton: "Ask AI",
    backgroundButton: "Background",
    sendButton: "Send",
    competitionEyebrow: "UNION PUBLIC EDUCATION INNOVATION FOR YOUTH",
    signingIn: "Signing in...",
    creatingAccount: "Creating account...",
    sendingResetCode: "Sending reset code...",
    resettingPassword: "Resetting password...",
    resetCodeSent: "If that email is registered, a password reset code has been sent.",
    resetEmailSent: "Reset code sent to your email.",
    resetEndpointMissing: "The old backend is still running. Stop the server and start it again so Forgot password can work.",
    resetEmailConfigProblem: "Email is not configured correctly. Use the development code below or fix SMTP.",
    passwordResetDone: "Password reset successfully. You can now log in.",
    resetFieldsRequired: "Enter the 8-digit reset code, new password, and confirmation.",
    resetCodeInvalid: "Reset code must contain exactly 8 digits.",
    searching: "Searching sources...",
    offlineMode: "Offline Mode",
    offline: "Backend off",
    offlineLoginReady: "You are signed in with offline mode. Data is saved in this browser.",
    offlineRegisterReady: "Offline account created in this browser.",
    profileSaved: "Profile saved.",
    passwordsDoNotMatch: "New password and confirmation do not match.",
    audioUnsupported: "Audio narration is not supported in this browser.",
    newChatStarted: "New chat started. Ask a Union question in Swahili or English.",
    chatWelcome: "Welcome. Ask about the Union, Tanganyika, Zanzibar, constitutions, leaders, or related history.",
    questionPlaceholder: "Ask in English or Swahili...",
      pageTitles: {
        home: "Home",
        dashboard: "Dashboard",
        about: "About",
        history: "History",
        timeline: "Timeline",
        quiz: "Muungano Challenge",
      passport: "Passport",
      safari: "Safari",
      connect: "Connect",
      leaders: "Union Leaders",
      audio: "Listen to History",
      profile: "Profile",
      media: "Video Gallery",
      chatbot: "Ask AI",
      competition: "Project Pitch",
    },
  },
};

const content = {
  sw: {
    authIntro: "Jukwaa la elimu ya Muungano kwa vijana, lenye historia, viongozi, simulizi za kusikiliza, picha, video na chatbot ya kuuliza maswali.",
    home: {
      eyebrow: "Elimu ya Muungano kwa vijana",
      title: "Jifunze. Elewa. Shiriki.",
      text: "MuunganoHub ni jukwaa la kisasa la elimu ya uraia linalotumia akili mnemba kukusaidia kuelewa historia, maadili na umuhimu wa Muungano wa Tanganyika na Zanzibar.",
      primary: "Anza Kujifunza Sasa",
      secondary: "Tazama Video",
      metrics: [
        ["50+", "Documents Indexed"],
        ["180+", "Questions Ready"],
        ["15", "Knowledge Areas"],
        ["2", "Languages Supported"],
      ],
      features: [
        ["AI Tutor", "Uliza maswali ya Muungano na upate majibu yenye vyanzo.", "chatbot"],
        ["Quiz Competition", "Jipime kupitia Muungano Challenge na pata badge.", "quiz"],
        ["Interactive Timeline", "Fuata matukio muhimu kutoka 1964 hadi sasa.", "timeline"],
        ["Youth Impact", "Elewa Muungano unavyogusa elimu, ajira, biashara na utamaduni.", "history"],
      ],
      open: "Fungua",
      spotlight: [
        ["AI yenye vyanzo", "Majibu yanatokana na nyaraka na rejea zilizopangwa."],
        ["Elimu shirikishi", "Quiz, audio, video na timeline huifanya historia iwe hai."],
        ["Kwa vijana", "Imejengwa kwa simu, browser na matumizi ya kila siku."],
      ],
    },
    about: {
      eyebrow: "Kuhusu MuunganoHub",
      title: "Jukwaa la elimu ya Muungano linalounganisha historia, AI na vijana",
      text: "MuunganoHub imeundwa kusaidia vijana kujifunza Muungano kwa njia ya kisasa: kuuliza AI, kusoma timeline, kucheza quiz, kusikiliza simulizi na kuona vyanzo vinavyotumika kujenga majibu.",
      cards: [
        ["Lengo", "Kufikisha elimu ya Muungano kwa jamii, hususan vijana, kwa njia rahisi, shirikishi na inayopimika."],
        ["Ushahidi", "Prototype ina RAG chatbot, hifadhidata ya vyanzo, PWA, auth, quiz na ripoti za majaribio ya awali."],
        ["Upekee", "Mfumo si chatbot pekee; ni learning hub yenye historia, viongozi, audio, video, quiz na citations."],
      ],
    },
    history: {
      eyebrow: "Historia kamili kwa muhtasari",
      title: "Safari ya Muungano wa Tanganyika na Zanzibar",
      text: "Historia imepangwa kama timeline ili vijana waone mfululizo wa matukio na kuelewa kwa nini Muungano ni sehemu muhimu ya utambulisho wa Tanzania.",
      lesson: {
        aim: "Mwisho wa somo hili, unatakiwa kueleza jinsi Tanganyika na Zanzibar zilivyoungana, kutaja tarehe kuu, na kueleza kwa nini Muungano unaendelea kuwa muhimu kwa uraia, amani, utambulisho na maendeleo ya pamoja.",
        points: [
          ["Kilichotangulia", "Tanganyika na Zanzibar zilikuwa maeneo tofauti, lakini ziliunganishwa na jiografia, biashara, lugha, utamaduni na harakati za ukombozi."],
          ["Jinsi Muungano ulivyoundwa", "Mapinduzi ya Zanzibar, kutiwa saini kwa Hati za Muungano, na Siku ya Muungano viliweka msingi wa kikatiba wa Jamhuri ya Muungano."],
          ["Umuhimu wake leo", "Muungano unaimarisha uraia wa pamoja, taasisi za kitaifa, usalama, diplomasia na ushirikiano huku Zanzibar ikiendelea kuwa na taasisi zake muhimu za serikali."],
        ],
        check: "Jipime: baada ya kufungua vipengele vitano vya timeline, eleza Muungano kwa sentensi tatu: kabla ya 1964, Aprili 1964, na baada ya 1964.",
      },
      timeline: [
        ["Kabla ya 1964", "Misingi ya kihistoria", "Tanganyika na Zanzibar zilikuwa na mahusiano ya muda mrefu kupitia biashara, ujirani, lugha ya Kiswahili, harakati za ukombozi na mwingiliano wa kijamii.", "/static/assets/docs/historia-ya-muungano-sw.pdf"],
        ["12 Januari 1964", "Mapinduzi ya Zanzibar", "Mapinduzi ya Zanzibar yaliunda Serikali ya Mapinduzi chini ya Abeid Amani Karume, hatua iliyobadili historia ya Zanzibar.", "https://en.wikipedia.org/wiki/Zanzibar_Revolution"],
        ["22 Aprili 1964", "Hati za Muungano", "Julius Nyerere na Abeid Amani Karume walitia saini Hati za Muungano wa Tanganyika na Zanzibar.", "https://en.wikipedia.org/wiki/Tanzania"],
        ["26 Aprili 1964", "Jamhuri ya Muungano", "Muungano ulitangazwa rasmi na kuwa msingi wa Jamhuri ya Muungano, baadaye Jamhuri ya Muungano wa Tanzania.", "/static/assets/docs/muungano-final-2024.pdf"],
        ["Baada ya 1964", "Taasisi za pamoja", "Muungano uliendelea kupitia Katiba, ulinzi, usalama, uraia, uhamiaji, mambo ya nje, elimu ya juu na mawasiliano.", "/static/assets/docs/katiba-jamhuri-ya-muungano-1977.pdf"],
      ],
    },
    leaders: {
      eyebrow: "Historia kupitia watu",
      title: "Viongozi wa Tanzania na Zanzibar",
      text: "Sehemu hii inaonyesha nafasi ya viongozi katika historia ya Muungano na ujenzi wa taifa.",
      items: [
        ["Julius Kambarage Nyerere", "Rais wa Tanganyika na Rais wa kwanza wa Jamhuri ya Muungano", "Tanganyika / Tanzania Bara", "Alikuwa mmoja wa waasisi wa Muungano na alitia saini Hati za Muungano pamoja na Abeid Amani Karume.", "/static/assets/nyerere-founder.jpg", "https://sw.wikipedia.org/wiki/Julius_Nyerere"],
        ["Abeid Amani Karume", "Rais wa Zanzibar na Mwenyekiti wa Baraza la Mapinduzi", "Zanzibar", "Alikuwa mmoja wa waasisi wa Muungano na uongozi wake baada ya Mapinduzi ulihusika katika kuundwa kwa Muungano.", "/static/assets/abeid-karume-founder.webp", "https://sw.wikipedia.org/wiki/Abeid_Karume"],
        ["Rashid Mfaume Kawawa", "Kiongozi muhimu wa Serikali ya Muungano", "Tanzania Bara", "Alishiriki katika hatua za awali za ujenzi wa Serikali na taasisi za Jamhuri ya Muungano.", "https://commons.wikimedia.org/wiki/Special:FilePath/Rashidi_Kawawa_(cropped).jpg", "https://en.wikipedia.org/wiki/Rashidi_Kawawa"],
        ["Aboud Jumbe Mwinyi", "Rais wa Zanzibar", "Zanzibar", "Aliongoza Zanzibar baada ya Abeid Amani Karume na alihusika katika kipindi muhimu cha kuimarisha nafasi ya Zanzibar ndani ya Muungano.", "", "https://en.wikipedia.org/wiki/Aboud_Jumbe"],
        ["Ali Hassan Mwinyi", "Rais wa Zanzibar na baadaye Rais wa Jamhuri ya Muungano", "Zanzibar / Tanzania", "Aliwahi kuwa Rais wa Zanzibar kabla ya kuwa Rais wa pili wa Jamhuri ya Muungano wa Tanzania.", "https://commons.wikimedia.org/wiki/Special:FilePath/Ali_Hassan_Mwinyi_2.jpg", "https://sw.wikipedia.org/wiki/Ali_Hassan_Mwinyi"],
        ["Idris Abdul Wakil", "Rais wa Zanzibar", "Zanzibar", "Aliongoza Zanzibar katika miaka ya 1980, kipindi kilichofuata Katiba ya Zanzibar ya 1984.", "", "https://en.wikipedia.org/wiki/Idris_Abdul_Wakil"],
        ["Salmin Amour", "Rais wa Zanzibar", "Zanzibar", "Alikuwa Rais wa Zanzibar wakati wa mageuzi ya siasa za vyama vingi na mijadala ya kitaifa kuhusu Muungano.", "", "https://en.wikipedia.org/wiki/Salmin_Amour"],
        ["Amani Abeid Karume", "Rais wa Zanzibar", "Zanzibar", "Aliongoza Zanzibar katika kipindi cha mpito wa kidemokrasia na utawala wa Serikali ya Mapinduzi ya Zanzibar.", "https://commons.wikimedia.org/wiki/Special:FilePath/Amani_Abeid_Karume.jpg", "https://sw.wikipedia.org/wiki/Amani_Abeid_Karume"],
        ["Ali Mohamed Shein", "Rais wa Zanzibar", "Zanzibar", "Aliongoza Zanzibar kabla ya Hussein Ali Mwinyi na aliendelea kusimamia nafasi ya Zanzibar ndani ya Jamhuri ya Muungano.", "https://commons.wikimedia.org/wiki/Special:FilePath/Ali_Mohamed_Shein%2C_September_2014_%28cropped%29.jpg", "https://sw.wikipedia.org/wiki/Ali_Mohamed_Shein"],
        ["Benjamin William Mkapa", "Rais wa tatu wa Jamhuri ya Muungano wa Tanzania", "Tanzania Bara", "Uongozi wake ulihusisha mageuzi ya kiuchumi, taasisi za umma na kuendeleza mfumo wa Jamhuri ya Muungano.", "https://commons.wikimedia.org/wiki/Special:FilePath/Benjamin_Mkapa_2010-05-07.jpg", "https://sw.wikipedia.org/wiki/Benjamin_Mkapa"],
        ["Jakaya Mrisho Kikwete", "Rais wa nne wa Jamhuri ya Muungano wa Tanzania", "Tanzania Bara", "Aliongoza Tanzania katika kipindi cha kupanuka kwa diplomasia, elimu na ushiriki wa vijana katika maendeleo.", "https://commons.wikimedia.org/wiki/Special:FilePath/Jakaya_Kikwete_%287224136464%29.jpg", "https://sw.wikipedia.org/wiki/Jakaya_Kikwete"],
        ["John Pombe Magufuli", "Rais wa tano wa Jamhuri ya Muungano wa Tanzania", "Tanzania Bara", "Aliongoza Tanzania kabla ya Samia Suluhu Hassan na alisisitiza miradi ya miundombinu na utendaji wa serikali.", "https://commons.wikimedia.org/wiki/Special:FilePath/John_Magufuli_2015.png", "https://sw.wikipedia.org/wiki/John_Magufuli"],
        ["Samia Suluhu Hassan", "Rais wa Jamhuri ya Muungano wa Tanzania", "Tanzania / Zanzibar", "Ni mfano wa kizazi cha uongozi kinachobeba historia ya Muungano na nafasi ya Zanzibar katika uongozi wa kitaifa.", "/static/assets/samia-suluhu.jpg", "https://sw.wikipedia.org/wiki/Samia_Suluhu_Hassan"],
        ["Hussein Ali Mwinyi", "Rais wa Zanzibar na Mwenyekiti wa Baraza la Mapinduzi", "Zanzibar", "Uongozi wake unaendeleza nafasi ya Zanzibar ndani ya mfumo wa Jamhuri ya Muungano.", "/static/assets/hussein-mwinyi.webp", "https://sw.wikipedia.org/wiki/Hussein_Ali_Mwinyi"],
      ],
    },
    audio: {
      eyebrow: "Audio learning",
      title: "Sikiliza simulizi za Muungano",
      text: "Chagua simulizi kisha tumia kitufe cha kusikiliza. Mfumo hutumia uwezo wa browser kusoma maandishi kwa sauti.",
      play: "Sikiliza",
      stop: "Simamisha",
      stories: [
        ["Muungano ni nini?", `Muungano ni makubaliano ya kisiasa na kikatiba yanayounganisha jamii mbili au zaidi ili zishirikiane katika mambo makubwa ya pamoja, huku zikiendelea kutunza historia, utambulisho na baadhi ya mamlaka zao. Kwa Tanzania, Muungano unaeleza kuungana kwa Tanganyika na Zanzibar na kuundwa kwa Jamhuri ya Muungano. Dhana hii si tukio la siku moja pekee; ni mfumo wa maisha ya taifa, sheria, taasisi, ulinzi, uraia na ushirikiano wa wananchi.

Kwa mwanafunzi au kijana, maana muhimu ya Muungano ni kwamba taifa linaweza kujenga umoja bila kufuta tofauti zake. Tanganyika na Zanzibar zina historia tofauti, lakini ziliamua kushirikiana katika mambo yanayohitaji nguvu ya pamoja. Ndiyo maana unapojifunza Muungano unatakiwa kuuliza: ni mambo gani yaliunganishwa, ni mamlaka gani zilibaki upande wa Zanzibar, na ni kwa nini umoja huo uliendelea kuwa sehemu ya utambulisho wa Tanzania.

Muungano pia ni somo la uwajibikaji. Unahitaji Katiba, taasisi, viongozi na wananchi wanaoelewa thamani yake. Ukielewa Muungano, unaelewa zaidi kwa nini uraia, amani, mshikamano, elimu, biashara na ulinzi wa taifa vinahitaji historia sahihi na mazungumzo ya heshima.`],
        ["Sababu za kuundwa kwa Muungano", `Sababu za kuundwa kwa Muungano zilihusisha historia, jiografia, usalama, siasa, utamaduni na mahusiano ya watu. Tanganyika na Zanzibar ziko karibu kijiografia, na kwa muda mrefu wananchi wake walikuwa na mwingiliano wa biashara, familia, lugha ya Kiswahili, dini, utamaduni na harakati za ukombozi. Ukaribu huu uliweka msingi wa kuona kuwa ushirikiano wa karibu ungeweza kulinda maslahi ya pande zote mbili.

Baada ya uhuru wa Tanganyika mwaka 1961 na Mapinduzi ya Zanzibar mwaka 1964, viongozi wa pande zote waliona umuhimu wa kujenga mustakabali wa pamoja. Katika kipindi hicho, Afrika ilikuwa bado inakabiliwa na athari za ukoloni, mvutano wa kisiasa wa dunia, na changamoto za kujenga mataifa mapya. Muungano ulionekana kama njia ya kuimarisha usalama, kuzuia mgawanyiko, na kuonyesha kuwa watu wa Afrika Mashariki wanaweza kujenga umoja kwa maamuzi yao wenyewe.

Kwa vijana, sababu hizi zinaonyesha kuwa Muungano haukutokea bila muktadha. Ulizaliwa kutokana na mazingira ya wakati wake, mahitaji ya wananchi, uongozi wa waasisi na matumaini ya kujenga taifa lenye amani. Kujifunza sababu hizi husaidia kuepuka majibu rahisi mno na kuelewa kuwa historia ina tabaka nyingi.`],
        ["Siku muhimu za Muungano", `Siku muhimu za Muungano zinasaidia kupanga historia kwa mfululizo unaoeleweka. Tarehe 12 Januari 1964 ni muhimu kwa sababu Mapinduzi ya Zanzibar yaliunda mazingira mapya ya kisiasa Zanzibar chini ya uongozi wa Abeid Amani Karume. Tarehe 22 Aprili 1964 ni muhimu kwa sababu Hati za Muungano zilisainiwa na viongozi wa pande mbili. Tarehe 26 Aprili 1964 ndiyo siku rasmi ya kuundwa kwa Muungano wa Tanganyika na Zanzibar.

Baada ya tarehe 26 Aprili, hatua nyingine ziliendelea. Kulikuwa na mchakato wa kuunganisha baadhi ya mambo ya serikali, kupanga majukumu ya Serikali ya Jamhuri ya Muungano, na kutambua nafasi ya Serikali ya Mapinduzi ya Zanzibar. Baadaye jina Tanzania lilitokana na kuunganisha Tanganyika na Zanzibar, likawa alama ya utambulisho mpya wa taifa.

Kujua tarehe hizi ni muhimu, lakini haitoshi kuzitaja tu kama kumbukumbu. Kila tarehe ina maana yake: Mapinduzi yalibadili Zanzibar, Hati za Muungano ziliweka makubaliano, na siku ya Muungano ikatangaza mwanzo wa mfumo mpya wa taifa. Hapo ndipo historia inakuwa simulizi, si orodha ya tarehe peke yake.`],
        ["Waasisi wa Muungano", `Waasisi wakuu wa Muungano walikuwa Mwalimu Julius Kambarage Nyerere wa Tanganyika na Sheikh Abeid Amani Karume wa Zanzibar. Nyerere alikuwa kiongozi aliyeamini katika umoja wa Afrika, utu, elimu na mshikamano wa wananchi. Karume alikuwa kiongozi wa Mapinduzi ya Zanzibar na alisimamia mwelekeo mpya wa Zanzibar baada ya Januari 1964. Uamuzi wao wa kushirikiana ulikuwa na uzito mkubwa katika historia ya Tanzania.

Waasisi hawa walikabiliwa na maswali magumu: taifa jipya litajengwaje, usalama utalindwaje, Zanzibar itakuwa na nafasi gani, na Tanganyika itashirikianaje na Zanzibar bila kupoteza heshima ya pande mbili. Majibu yao yaliwekwa katika makubaliano na taasisi zilizoendelea kujengwa baada ya Muungano.

Kwa vijana, kujifunza kuhusu waasisi si kuwakumbuka kama majina tu. Ni kuchunguza maamuzi yao, changamoto zao na maadili waliyotaka kuyaacha. Historia ya viongozi hutusaidia kuuliza sisi wenyewe: tunaendelezaje umoja, tunalindaje ukweli wa historia, na tunajadili vipi hoja za taifa bila kuvunja mshikamano?`],
        ["Katiba na taasisi za Muungano", `Muungano unaendeshwa kupitia Katiba, sheria na taasisi. Katiba ya Jamhuri ya Muungano inaeleza muundo wa nchi, mamlaka ya Serikali ya Muungano, haki na wajibu wa wananchi, na misingi ya uongozi. Kwa upande wa Zanzibar, Katiba ya Zanzibar inaeleza Serikali ya Mapinduzi ya Zanzibar na taasisi zake ndani ya mfumo mpana wa Jamhuri ya Muungano.

Taasisi za Muungano ni muhimu kwa sababu ndizo hubadilisha makubaliano ya kisiasa kuwa huduma, maamuzi na utendaji wa kila siku. Mambo kama ulinzi, usalama, uraia, uhamiaji, mambo ya nje na baadhi ya maeneo ya elimu na mawasiliano yanahitaji uratibu wa kitaifa. Bila taasisi, Muungano ungebaki kuwa kauli nzuri tu, lakini taasisi zinaufanya uwe mfumo unaofanya kazi.

Kijana akijifunza Katiba na taasisi, anaweza kuelewa kwa nini baadhi ya mambo huamuliwa kitaifa na mengine huendeshwa Zanzibar. Uelewa huu hupunguza upotoshaji kwa sababu mtu haishii kusikia maneno ya jumla; anaweza kuuliza, kusoma na kutofautisha kati ya hoja ya kisiasa na msingi wa kikatiba.`],
        ["Faida za Muungano kwa vijana", `Faida za Muungano kwa vijana zinaonekana katika elimu, ajira, biashara, utamaduni, amani na utambulisho wa pamoja. Vijana wanaweza kusoma, kufanya kazi, kufanya biashara na kushirikiana katika maeneo mbalimbali ya Tanzania wakiwa sehemu ya taifa moja. Lugha ya Kiswahili, historia ya pamoja na taasisi za kitaifa hutoa msingi wa mawasiliano na ushirikiano.

Katika elimu, Muungano hutoa nafasi ya kujifunza historia pana ya Tanzania badala ya kuona bara na visiwa kama dunia mbili zisizohusiana. Katika biashara na ajira, kijana anaweza kufikiria fursa kwa mtazamo mpana zaidi: masoko, usafiri, huduma, teknolojia na ubunifu vinaweza kuunganisha vijana wa Tanzania Bara na Zanzibar.

Faida nyingine kubwa ni amani. Muungano ukieleweka vizuri, unaweza kuwa darasa la kuvumiliana, kusikilizana na kujenga suluhisho. Vijana ndio watakaorithi taifa, hivyo wanahitaji kuelewa faida hizi si kama maneno ya sherehe tu, bali kama wajibu wa kutumia umoja kujenga maendeleo, maarifa na heshima kati ya pande zote.`],
        ["Hoja na changamoto za Muungano", `Kama mfumo wowote wa kisiasa, Muungano umekuwa na hoja na changamoto zinazohitaji kujadiliwa kwa maarifa na heshima. Hoja hizi zinaweza kuhusisha mgawanyo wa mamlaka, tafsiri ya masuala ya Muungano, uchumi, taasisi, uwakilishi na namna wananchi wanavyoelewa haki na wajibu wao. Kutaja changamoto hakumaanishi kupinga Muungano; mara nyingi ni sehemu ya kuutunza.

Historia inaonyesha kuwa hoja za Muungano zimekuwa zikijadiliwa na baadhi yake kupatiwa ufumbuzi kupitia mazungumzo, sheria, tume, kamati na maamuzi ya kitaasisi. Njia bora ya kujifunza changamoto si kusikiliza uvumi, bali kusoma vyanzo, kuelewa upande wa Zanzibar, kuelewa upande wa Tanzania Bara, na kuona namna serikali na wananchi wanavyotafuta majibu.

Kwa vijana, somo hapa ni kwamba uzalendo hauzuii kuuliza maswali. Uzalendo wa kweli unahitaji ukweli, nidhamu ya hoja na uwezo wa kutafuta suluhisho. Ukijadili Muungano kwa lugha ya heshima, unasaidia kujenga kizazi kinacholinda umoja bila kuficha mambo yanayohitaji kuboreshwa.`],
        ["Mustakabali wa Muungano", `Mustakabali wa Muungano uko mikononi mwa kizazi kinachojifunza, kuuliza maswali na kutumia teknolojia kwa uwajibikaji. Dunia imebadilika: vijana wanapata taarifa kupitia simu, mitandao ya kijamii, video, podcast na mifumo ya AI. Hii ni fursa kubwa ya kufanya elimu ya Muungano iwe hai, shirikishi na yenye ushahidi.

Ili Muungano uwe na nguvu siku zijazo, elimu yake lazima iwe wazi, sahihi na inayowafikia vijana kwa lugha wanayoielewa. Historia ya waasisi, Katiba, taasisi, faida, changamoto na nafasi ya Zanzibar lazima ifundishwe kwa njia inayoheshimu ukweli na tofauti za uzoefu. Teknolojia inaweza kusaidia kwa kutoa chatbot, audio, video, maswali ya kujipima na nyaraka za rejea.

Lakini teknolojia peke yake haitoshi. Mustakabali mzuri unahitaji maadili: kusikiliza, kuheshimu historia, kupinga upotoshaji na kuwa tayari kujenga taifa. Kijana anayeelewa Muungano anaweza kuwa balozi wa amani, mtafiti, mbunifu na mshiriki mzuri katika mazungumzo ya kitaifa.`],
      ],
    },
    media: {
      eyebrow: "Media center",
      title: "Video za Muungano",
      text: "Tazama video fupi kuhusu historia, viongozi, matukio muhimu na maana ya Muungano kwa vijana.",
      watch: "Tazama video zinazohusiana",
      items: [
        ["Video lesson", "Historia ya Muungano kwa dakika chache", "Muhtasari wa tarehe muhimu, viongozi waasisi na sababu za Muungano.", "Historia ya Muungano wa Tanganyika na Zanzibar"],
        ["Video lesson", "Mapinduzi ya Zanzibar na Muungano", "Somu fupi kuhusu muktadha wa Zanzibar mwaka 1964 na uhusiano wake na Muungano.", "Mapinduzi ya Zanzibar 1964 Muungano"],
        ["Image collection", "Picha za viongozi na nyaraka", "Mkusanyiko wa picha za viongozi, nyaraka na kumbukumbu za kihistoria.", "Julius Nyerere Abeid Karume Articles of Union images"],
      ],
      gallery: ["Hati za Muungano", "Viongozi Waasisi", "Zanzibar 1964", "Tanzania Leo"],
    },
    competition: {
      eyebrow: "Project proposal",
      title: "MuunganoHub kama mfumo wa elimu kwa vijana",
      text: "MuunganoHub ni Website, Education Platform na Digital Campaign inayoweza kupanuliwa kuwa Mobile App na WhatsApp Bot.",
      cards: [
        ["Tatizo", "Vijana wengi hupata taarifa za Muungano kwa vipande, kwa lugha moja au bila vyanzo vinavyoeleweka."],
        ["Suluhisho", "Jukwaa moja lenye historia, viongozi, audio, video, picha na chatbot inayojibu kwa Kiswahili au English."],
        ["Ufikiaji", "Website kwa shule na vyuo, baadaye Mobile App, WhatsApp Bot, QR codes na kampeni za mitandao ya kijamii."],
        ["Teknolojia", "FastAPI, SQLite auth, local RAG, ChromaDB, sentence-transformers, HTML, CSS na JavaScript."],
        ["Matokeo", "Kuongeza uelewa, kupunguza upotoshaji, kuchochea ushiriki wa vijana na kutunza kumbukumbu za Muungano."],
        ["Hatua iliyofikiwa", "Backend ya RAG, auth, website prototype, knowledge base na frontend ya kujifunza vimeanza kutekelezwa."],
      ],
    },
  },
  en: {
    authIntro: "A youth-focused Union education platform with history, leaders, audio stories, images, videos, and a source-grounded chatbot.",
    home: {
      eyebrow: "Union education for youth",
      title: "Learn. Understand. Participate.",
      text: "MuunganoHub is a modern civic learning platform that uses AI to help young people understand the history, values, and importance of the Union of Tanganyika and Zanzibar.",
      primary: "Start Learning Now",
      secondary: "Watch Video",
      metrics: [["50+", "Documents Indexed"], ["180+", "Questions Ready"], ["15", "Knowledge Areas"], ["2", "Languages Supported"]],
      features: [
        ["AI Tutor", "Ask Union questions and receive source-grounded answers.", "chatbot"],
        ["Quiz Competition", "Test yourself with Muungano Challenge and earn a badge.", "quiz"],
        ["Interactive Timeline", "Follow key events from 1964 to the present.", "timeline"],
        ["Youth Impact", "See how the Union affects education, jobs, business, and culture.", "history"],
      ],
      open: "Open",
      spotlight: [
        ["Source-grounded AI", "Answers are built from organized documents and references."],
        ["Interactive learning", "Quiz, audio, video, and timeline make history feel alive."],
        ["Made for youth", "Designed for phones, browsers, and everyday learning habits."],
      ],
    },
    about: {
      eyebrow: "About MuunganoHub",
      title: "A Union education platform connecting history, AI, and youth",
      text: "MuunganoHub helps young people learn about the Union through modern interaction: asking AI, reading timelines, playing quizzes, listening to stories, and seeing the sources behind answers.",
      cards: [
        ["Purpose", "Deliver Union education to the community, especially youth, through simple, interactive, and measurable digital methods."],
        ["Evidence", "The prototype includes a RAG chatbot, source database, PWA, auth flow, quiz, and preliminary evaluation reports."],
        ["What makes it different", "It is not only a chatbot; it is a learning hub with history, leaders, audio, video, quizzes, and citations."],
      ],
    },
    history: {
      eyebrow: "Complete history summary",
      title: "The journey of the Union of Tanganyika and Zanzibar",
      text: "The history is organized as a timeline so young people can follow the events and understand why the Union matters to Tanzania.",
      lesson: {
        aim: "By the end of this lesson, you should be able to explain how Tanganyika and Zanzibar came together, name the main dates, and describe why the Union remains important for citizenship, peace, identity, and shared development.",
        points: [
          ["What came before", "Tanganyika and Zanzibar were separate territories, but they were connected by geography, trade, language, culture, and liberation politics."],
          ["How the Union was formed", "The Zanzibar Revolution, the signing of the Articles of Union, and the official Union Day created the constitutional foundation of the United Republic."],
          ["Why it matters today", "The Union supports common citizenship, shared national institutions, security, diplomacy, and cooperation while Zanzibar keeps its own important government institutions."],
        ],
        check: "Learning check: after opening the five timeline items, explain the Union in three sentences: before 1964, April 1964, and after 1964.",
      },
      timeline: [
        ["Before 1964", "Historical foundations", "Tanganyika and Zanzibar had long relationships through trade, geography, Swahili language, liberation movements, and social interaction.", "/static/assets/docs/historia-ya-muungano-sw.pdf"],
        ["12 January 1964", "Zanzibar Revolution", "The Zanzibar Revolution created a revolutionary government under Abeid Amani Karume.", "https://en.wikipedia.org/wiki/Zanzibar_Revolution"],
        ["22 April 1964", "Articles of Union", "Julius Nyerere and Abeid Amani Karume signed the Articles of Union.", "https://en.wikipedia.org/wiki/Tanzania"],
        ["26 April 1964", "The United Republic", "The Union was officially formed, later becoming the United Republic of Tanzania.", "/static/assets/docs/muungano-final-2024.pdf"],
        ["After 1964", "Shared institutions", "The Union developed through the Constitution and shared institutions for security, citizenship, immigration, foreign affairs, higher education, and communication.", "/static/assets/docs/katiba-jamhuri-ya-muungano-1977.pdf"],
      ],
    },
    leaders: {
      eyebrow: "History through people",
      title: "Leaders of Tanzania and Zanzibar",
      text: "This section shows the role of leaders in the history of the Union and nation-building.",
      items: [
        ["Julius Kambarage Nyerere", "President of Tanganyika and first President of the United Republic", "Tanganyika / Mainland Tanzania", "He was one of the founders of the Union and signed the Articles of Union with Abeid Amani Karume.", "/static/assets/nyerere-founder.jpg", "https://en.wikipedia.org/wiki/Julius_Nyerere"],
        ["Abeid Amani Karume", "President of Zanzibar and Chairman of the Revolutionary Council", "Zanzibar", "He was one of the founders of the Union, and his post-revolution leadership shaped the Union process.", "/static/assets/abeid-karume-founder.webp", "https://en.wikipedia.org/wiki/Abeid_Karume"],
        ["Rashid Mfaume Kawawa", "Important leader in the Union Government", "Mainland Tanzania", "He took part in the early development of the Government and institutions of the United Republic.", "https://commons.wikimedia.org/wiki/Special:FilePath/Rashidi_Kawawa_(cropped).jpg", "https://en.wikipedia.org/wiki/Rashidi_Kawawa"],
        ["Aboud Jumbe Mwinyi", "President of Zanzibar", "Zanzibar", "He led Zanzibar after Abeid Amani Karume during an important period for Zanzibar's place within the Union.", "", "https://en.wikipedia.org/wiki/Aboud_Jumbe"],
        ["Ali Hassan Mwinyi", "President of Zanzibar and later President of the United Republic", "Zanzibar / Tanzania", "He served as President of Zanzibar before becoming the second President of the United Republic of Tanzania.", "https://commons.wikimedia.org/wiki/Special:FilePath/Ali_Hassan_Mwinyi_2.jpg", "https://en.wikipedia.org/wiki/Ali_Hassan_Mwinyi"],
        ["Idris Abdul Wakil", "President of Zanzibar", "Zanzibar", "He led Zanzibar in the 1980s, after the adoption of the 1984 Constitution of Zanzibar.", "", "https://en.wikipedia.org/wiki/Idris_Abdul_Wakil"],
        ["Salmin Amour", "President of Zanzibar", "Zanzibar", "He led Zanzibar during the multiparty reform period and wider national discussions about the Union.", "", "https://en.wikipedia.org/wiki/Salmin_Amour"],
        ["Amani Abeid Karume", "President of Zanzibar", "Zanzibar", "He led Zanzibar during a democratic transition period and continued the work of the Revolutionary Government of Zanzibar.", "https://commons.wikimedia.org/wiki/Special:FilePath/Amani_Abeid_Karume.jpg", "https://en.wikipedia.org/wiki/Amani_Abeid_Karume"],
        ["Ali Mohamed Shein", "President of Zanzibar", "Zanzibar", "He led Zanzibar before Hussein Ali Mwinyi and continued Zanzibar's role within the United Republic.", "https://commons.wikimedia.org/wiki/Special:FilePath/Ali_Mohamed_Shein%2C_September_2014_%28cropped%29.jpg", "https://en.wikipedia.org/wiki/Ali_Mohamed_Shein"],
        ["Benjamin William Mkapa", "Third President of the United Republic of Tanzania", "Mainland Tanzania", "His leadership emphasized economic reforms, public institutions, and continuity of the United Republic framework.", "https://commons.wikimedia.org/wiki/Special:FilePath/Benjamin_Mkapa_2010-05-07.jpg", "https://en.wikipedia.org/wiki/Benjamin_Mkapa"],
        ["Jakaya Mrisho Kikwete", "Fourth President of the United Republic of Tanzania", "Mainland Tanzania", "He led Tanzania during a period of expanded diplomacy, education, and youth participation in development.", "https://commons.wikimedia.org/wiki/Special:FilePath/Jakaya_Kikwete_%287224136464%29.jpg", "https://en.wikipedia.org/wiki/Jakaya_Kikwete"],
        ["John Pombe Magufuli", "Fifth President of the United Republic of Tanzania", "Mainland Tanzania", "He led Tanzania before Samia Suluhu Hassan and emphasized infrastructure projects and government performance.", "https://commons.wikimedia.org/wiki/Special:FilePath/John_Magufuli_2015.png", "https://en.wikipedia.org/wiki/John_Magufuli"],
        ["Samia Suluhu Hassan", "President of the United Republic of Tanzania", "Tanzania / Zanzibar", "She represents a generation of leadership connected to the Union and Zanzibar's role in national leadership.", "/static/assets/samia-suluhu.jpg", "https://en.wikipedia.org/wiki/Samia_Suluhu_Hassan"],
        ["Hussein Ali Mwinyi", "President of Zanzibar and Chairman of the Revolutionary Council", "Zanzibar", "His leadership continues Zanzibar's role within the United Republic framework.", "/static/assets/hussein-mwinyi.webp", "https://en.wikipedia.org/wiki/Hussein_Mwinyi"],
      ],
    },
    audio: {
      eyebrow: "Audio learning",
      title: "Listen to Union stories",
      text: "Choose a story and use the audio button. The platform uses your browser's speech feature to read the text aloud.",
      play: "Play Audio",
      stop: "Stop",
      stories: [
        ["What is the Union?", `A union is a political and constitutional arrangement through which two or more communities agree to cooperate under a shared structure while preserving important parts of their own history, identity, and authority. In Tanzania, the Union refers to the joining of Tanganyika and Zanzibar to form the United Republic. It is not only a date in history; it is a system of national life, law, institutions, citizenship, defence, and cooperation among citizens.

For a student or young person, the most important lesson is that unity does not have to erase difference. Tanganyika and Zanzibar had different historical experiences, yet they chose to work together in matters that required common strength. When studying the Union, it is useful to ask what was united, what powers remained with Zanzibar, and why this arrangement became part of Tanzania's identity.

The Union is also a lesson in responsibility. It depends on a Constitution, institutions, leaders, and citizens who understand its value. When you understand the Union, you also understand why citizenship, peace, solidarity, education, trade, and national security require accurate history and respectful public discussion.`],
        ["Reasons for the Union", `The reasons for the Union included history, geography, security, politics, culture, and social relations. Tanganyika and Zanzibar are close to one another, and their people had long interacted through trade, family ties, the Swahili language, religion, culture, and liberation movements. This closeness created a foundation for deeper cooperation between the two sides.

After Tanganyika's independence in 1961 and the Zanzibar Revolution in 1964, leaders on both sides saw the importance of building a common future. At that time, many African countries were still dealing with the legacy of colonialism, global political tension, and the challenge of building new states. The Union was seen as a way to strengthen security, reduce division, and show that East African peoples could make their own decisions about unity.

For young people, these reasons show that the Union did not appear without context. It was born from the needs of its time, the interests of citizens, the decisions of founding leaders, and the hope of building a peaceful nation. Learning these reasons helps us avoid simple answers and understand that history has many layers.`],
        ["Important Union dates", `Important Union dates help us arrange history in a clear sequence. 12 January 1964 matters because the Zanzibar Revolution created a new political situation in Zanzibar under the leadership of Abeid Amani Karume. 22 April 1964 matters because the Articles of Union were signed by leaders from the two sides. 26 April 1964 is the official date on which the Union of Tanganyika and Zanzibar was formed.

After 26 April, further work continued. There was a process of organizing Union matters, defining the role of the Government of the United Republic, and recognizing the place of the Revolutionary Government of Zanzibar. Later, the name Tanzania came from combining Tanganyika and Zanzibar, becoming a symbol of a new national identity.

Knowing these dates is important, but it is not enough to memorize them. Each date carries meaning: the Revolution changed Zanzibar, the Articles of Union recorded the agreement, and Union Day marked the beginning of a new national structure. That is when history becomes a story, not just a list of dates.`],
        ["Founders of the Union", `The main founders of the Union were Mwalimu Julius Kambarage Nyerere of Tanganyika and Sheikh Abeid Amani Karume of Zanzibar. Nyerere was a leader who believed in African unity, human dignity, education, and solidarity. Karume was the leader of revolutionary Zanzibar and guided the new direction of Zanzibar after January 1964. Their decision to cooperate had a major impact on Tanzania's history.

These founders faced difficult questions: how would the new nation be built, how would security be protected, what place would Zanzibar have, and how would Tanganyika cooperate with Zanzibar while respecting both sides? Their answers were expressed through agreements and institutions that continued to develop after the Union.

For young people, learning about the founders is not just about remembering names. It is about examining their decisions, their challenges, and the values they wanted to leave behind. Leadership history helps us ask ourselves how we continue unity, protect historical truth, and discuss national questions without damaging solidarity.`],
        ["The Constitution and Union institutions", `The Union operates through the Constitution, laws, and institutions. The Constitution of the United Republic explains the structure of the country, the authority of the Union Government, the rights and duties of citizens, and the principles of leadership. On the Zanzibar side, the Constitution of Zanzibar explains the Revolutionary Government of Zanzibar and its institutions within the wider framework of the United Republic.

Union institutions are important because they turn political agreements into daily decisions, services, and administration. Matters such as defence, security, citizenship, immigration, foreign affairs, and some areas of education and communication require national coordination. Without institutions, the Union would remain only a good statement; institutions make it a working system.

When a young person studies the Constitution and institutions, they can understand why some matters are decided nationally while others are administered in Zanzibar. This understanding reduces misinformation because a person does not depend only on general claims. They can read, ask questions, and distinguish between political opinion and constitutional structure.`],
        ["Benefits of the Union for youth", `The benefits of the Union for youth can be seen in education, employment, trade, culture, peace, and shared identity. Young people can study, work, trade, and cooperate across different parts of Tanzania as citizens of one country. The Swahili language, shared history, and national institutions provide a foundation for communication and cooperation.

In education, the Union gives young people a broader understanding of Tanzania instead of seeing the mainland and the islands as separate worlds. In business and employment, youth can think about opportunities more widely: markets, transport, services, technology, and innovation can connect young people from Mainland Tanzania and Zanzibar.

Another major benefit is peace. When the Union is well understood, it can become a classroom for tolerance, listening, and problem solving. Young people will inherit the nation, so they need to understand these benefits not only as ceremonial words, but as a responsibility to use unity for development, knowledge, and respect between both sides.`],
        ["Union questions and challenges", `Like any political arrangement, the Union has had questions and challenges that need to be discussed with knowledge and respect. These questions may involve the distribution of authority, interpretation of Union matters, the economy, institutions, representation, and how citizens understand their rights and duties. Mentioning challenges does not mean opposing the Union; often it is part of caring for it.

History shows that Union questions have been discussed, and some have been addressed through dialogue, laws, commissions, committees, and institutional decisions. The best way to learn about challenges is not to rely on rumours, but to read sources, understand Zanzibar's perspective, understand Mainland Tanzania's perspective, and study how governments and citizens search for answers.

For young people, the lesson is that patriotism does not prevent questions. Real patriotism needs truth, disciplined discussion, and a commitment to solutions. When you discuss the Union respectfully, you help build a generation that protects unity while still facing issues that need improvement.`],
        ["The future of the Union", `The future of the Union is in the hands of a generation that learns, asks questions, and uses technology responsibly. The world has changed: young people receive information through phones, social media, videos, podcasts, and AI systems. This creates a major opportunity to make Union education alive, interactive, and evidence-based.

For the Union to remain strong in the future, its education must be clear, accurate, and accessible to young people in language they understand. The history of the founders, the Constitution, institutions, benefits, challenges, and the place of Zanzibar must be taught in ways that respect truth and different experiences. Technology can help through chatbots, audio, video, quizzes, and reference documents.

But technology alone is not enough. A good future requires values: listening, respecting history, resisting misinformation, and being ready to build the nation. A young person who understands the Union can become an ambassador of peace, a researcher, an innovator, and a responsible participant in national dialogue.`],
      ],
    },
    media: {
      eyebrow: "Media center",
      title: "Union videos",
      text: "Watch short videos about Union history, leaders, key events, and what the Union means for youth.",
      watch: "Watch related videos",
      items: [
        ["Video lesson", "Union history in a few minutes", "A quick summary of key dates, founding leaders, and reasons for the Union.", "History of the Union of Tanganyika and Zanzibar"],
        ["Video lesson", "The Zanzibar Revolution and the Union", "A short lesson about Zanzibar in 1964 and its connection to the Union.", "Zanzibar Revolution 1964 Union"],
        ["Image collection", "Leader and document images", "A collection prompt for leaders, documents, and historical memory.", "Julius Nyerere Abeid Karume Articles of Union images"],
      ],
      gallery: ["Articles of Union", "Founding Leaders", "Zanzibar 1964", "Tanzania Today"],
    },
    competition: {
      eyebrow: "Project proposal",
      title: "MuunganoHub as a youth education platform",
      text: "MuunganoHub is a website, education platform, and digital campaign that can later expand into a mobile app and WhatsApp bot.",
      cards: [
        ["Problem", "Many young people receive fragmented Union information, often in one language or without clear sources."],
        ["Solution", "One platform with history, leaders, audio, video, images, and a chatbot that answers in Swahili or English."],
        ["Reach", "Website for schools and colleges, later expanded through mobile app, WhatsApp bot, QR codes, and social media campaigns."],
        ["Technology", "FastAPI, SQLite auth, local RAG, ChromaDB, sentence-transformers, HTML, CSS, and JavaScript."],
        ["Impact", "Increase awareness, reduce misinformation, encourage youth participation, and preserve Union memory."],
        ["Current progress", "RAG backend, auth, website prototype, knowledge base, and learning frontend are already implemented."],
      ],
    },
  },
};

const youthImpact = {
  sw: [
    ["Elimu", "Fursa za elimu ya juu, utafiti na kubadilishana maarifa kati ya Tanzania Bara na Zanzibar."],
    ["Biashara", "Ushirikiano wa masoko, usafiri, huduma na ujasiriamali kati ya pande mbili za Muungano."],
    ["Ajira", "Uhamaji na nafasi za kufanya kazi ndani ya Tanzania kwa uelewa wa taasisi na sheria."],
    ["Umoja wa Taifa", "Utambulisho wa pamoja unaowaunganisha vijana wa Tanzania Bara na Zanzibar."],
    ["Utamaduni", "Kubadilishana lugha, sanaa, historia, maadili na urithi wa Kiswahili."],
  ],
  en: [
    ["Education", "Higher education, research, and knowledge exchange opportunities between Mainland Tanzania and Zanzibar."],
    ["Business", "Shared markets, transport, services, and entrepreneurship across both sides of the Union."],
    ["Employment", "Mobility and work opportunities supported by understanding Union institutions and laws."],
    ["National Unity", "A shared identity connecting young people from Mainland Tanzania and Zanzibar."],
    ["Culture", "Exchange of language, arts, history, values, and Swahili heritage."],
  ],
};

const timelineEvents = {
  sw: [
    ["1964", "Muungano wa Tanganyika na Zanzibar", "Tanganyika na Zanzibar ziliungana na kuunda Jamhuri ya Muungano. Hati za Muungano zilisainiwa tarehe 22 Aprili na Muungano ukaanza rasmi tarehe 26 Aprili 1964.", "Waasisi: Julius Nyerere na Abeid Amani Karume", "/static/assets/docs/historia-ya-muungano-sw.pdf"],
    ["1977", "Katiba Mpya", "Katiba ya Jamhuri ya Muungano wa Tanzania ya 1977 iliimarisha mfumo wa kikatiba, taasisi za Muungano na mamlaka ya Serikali ya Jamhuri ya Muungano.", "Msingi wa sasa wa kikatiba", "/static/assets/docs/katiba-jamhuri-ya-muungano-1977.pdf"],
    ["1984", "Katiba ya Zanzibar", "Katiba ya Zanzibar ya 1984 iliweka mfumo wa Serikali ya Mapinduzi ya Zanzibar na Baraza la Wawakilishi ndani ya muundo wa Jamhuri ya Muungano.", "Utambulisho wa Zanzibar ndani ya Muungano", "/static/assets/docs/katiba-zanzibar-1984.pdf"],
    ["1992", "Mfumo wa Vyama Vingi", "Mageuzi ya siasa za vyama vingi yaliimarisha ushiriki wa wananchi katika siasa za Jamhuri ya Muungano na Zanzibar.", "Ushiriki mpana wa kidemokrasia", "https://en.wikipedia.org/wiki/Politics_of_Tanzania"],
    ["2022", "Rejea ya Historia ya Muungano", "Kitabu cha historia ya Muungano kilikusanya chimbuko, misingi, maendeleo, hoja na utatuzi wake ili kusaidia elimu kwa umma.", "Vyanzo vilivyoandaliwa kwa kizazi kipya", "/static/assets/docs/historia-ya-muungano-sw.pdf"],
    ["2024", "Miaka 60 ya Muungano", "Tanzania iliadhimisha miaka 60 ya Muungano, tukio linaloonyesha uimara, mijadala na nafasi ya Muungano kwa vijana wa sasa.", "Kumbukumbu ya miaka 60", "/static/assets/docs/muungano-final-2024.pdf"],
  ],
  en: [
    ["1964", "Union of Tanganyika and Zanzibar", "Tanganyika and Zanzibar united to form the United Republic. The Articles of Union were signed on 22 April and the Union formally began on 26 April 1964.", "Founders: Julius Nyerere and Abeid Amani Karume", "/static/assets/docs/historia-ya-muungano-sw.pdf"],
    ["1977", "New Constitution", "The 1977 Constitution of the United Republic of Tanzania strengthened the constitutional framework, Union institutions, and Union Government authority.", "Current constitutional foundation", "/static/assets/docs/katiba-jamhuri-ya-muungano-1977.pdf"],
    ["1984", "Zanzibar Constitution", "The 1984 Constitution of Zanzibar established the Revolutionary Government of Zanzibar and House of Representatives within the United Republic framework.", "Zanzibar identity within the Union", "/static/assets/docs/katiba-zanzibar-1984.pdf"],
    ["1992", "Multiparty System", "Multiparty political reforms expanded public participation in the politics of the United Republic and Zanzibar.", "Broader democratic participation", "https://en.wikipedia.org/wiki/Politics_of_Tanzania"],
    ["2022", "Union History Reference", "A Union history book documented the origins, foundations, development, Union questions, and their resolution for public education.", "Reference for a new generation", "/static/assets/docs/historia-ya-muungano-sw.pdf"],
    ["2024", "60 Years of the Union", "Tanzania marked 60 years of the Union, showing its endurance, debates, and relevance for today's youth.", "Sixty-year milestone", "/static/assets/docs/muungano-final-2024.pdf"],
  ],
};

const mediaVideos = [
  {
    url: "/static/assets/videos/ifahamu-historia-ya-muungano.mp4",
    title: { sw: "Ifahamu historia ya Muungano", en: "Union history" },
    text: {
      sw: "Tazama somo la video kuhusu chimbuko, waasisi na maana ya Muungano.",
      en: "Watch a video lesson on the Union's origins, founders, and meaning.",
    },
  },
  {
    url: "/static/assets/videos/historia-ya-muungano-tanzania.mp4",
    title: { sw: "Muungano kwa ufupi", en: "The Union in brief" },
    text: {
      sw: "Video fupi inayosaidia kuelewa matukio muhimu na mfululizo wa historia.",
      en: "A short video that helps explain key events and the historical sequence.",
    },
  },
  {
    url: "/static/assets/videos/faces-of-africa-mwalimu-julius-nyerere.mp4",
    title: { sw: "Mwalimu Julius Nyerere", en: "Mwalimu Julius Nyerere" },
    text: {
      sw: "Jifunze nafasi ya viongozi waasisi katika kujenga Jamhuri ya Muungano.",
      en: "Learn about the role of founding leaders in building the United Republic.",
    },
  },
  {
    url: "/static/assets/videos/muungano-wa-tanganyika-na-zanzibar.mp4",
    title: { sw: "Zanzibar na Muungano", en: "Zanzibar and the Union" },
    text: {
      sw: "Video inayohusisha historia ya Zanzibar na safari ya kuundwa kwa Muungano.",
      en: "A video connecting Zanzibar's history with the formation of the Union.",
    },
  },
  {
    url: "/static/assets/videos/ifahamu-historia-ya-jamhuri-ya-muungano.mp4",
    title: { sw: "Miaka 60 ya Muungano", en: "60 years of the Union" },
    text: {
      sw: "Tazama kumbukumbu na tafakari kuhusu miaka 60 ya Jamhuri ya Muungano.",
      en: "Watch reflections and memories from 60 years of the United Republic.",
    },
  },
  {
    url: "/static/assets/videos/historia-ya-muungano-kaziinaendelea.mp4",
    title: { sw: "Elimu ya Muungano kwa vijana", en: "Union education for youth" },
    text: {
      sw: "Maudhui ya kuona yanayorahisisha vijana kujifunza na kujadili Muungano.",
      en: "Visual learning content that helps youth learn and discuss the Union.",
    },
  },
];

const quizQuestions = {
  sw: {
    beginner: [
      { question: "Muungano wa Tanganyika na Zanzibar ulianzishwa rasmi mwaka gani?", options: ["1961", "1964", "1977", "1984"], answer: 1, explain: "Muungano ulitangazwa rasmi tarehe 26 Aprili 1964." },
      { question: "Nani alikuwa Rais wa Zanzibar wakati wa Muungano?", options: ["Julius Nyerere", "Abeid Amani Karume", "Rashid Kawawa", "Ali Hassan Mwinyi"], answer: 1, explain: "Abeid Amani Karume alikuwa Rais wa Zanzibar na mmoja wa waasisi wa Muungano." },
      { question: "Hati za Muungano zilisainiwa tarehe gani?", options: ["12 Januari 1964", "22 Aprili 1964", "26 Aprili 1964", "9 Desemba 1961"], answer: 1, explain: "Hati za Muungano zilisainiwa tarehe 22 Aprili 1964." },
      { question: "Moja ya faida za Muungano ni ipi?", options: ["Kutenganisha vijana", "Kupunguza umoja", "Kuimarisha ushirikiano", "Kufuta historia"], answer: 2, explain: "Muungano unaimarisha umoja, ushirikiano na taasisi za pamoja." },
    ],
    intermediate: [
      { question: "Katiba ya Jamhuri ya Muungano wa Tanzania inayotumika kama msingi mkuu ilitungwa mwaka gani?", options: ["1964", "1977", "1984", "1992"], answer: 1, explain: "Katiba ya Jamhuri ya Muungano wa Tanzania ya 1977 ni msingi mkuu wa sasa wa kikatiba." },
      { question: "Katiba ya Zanzibar inayotajwa sana katika mfumo wa Muungano ni ya mwaka gani?", options: ["1964", "1977", "1984", "2009"], answer: 2, explain: "Katiba ya Zanzibar ya 1984 inaeleza mfumo wa Serikali ya Mapinduzi ya Zanzibar." },
      { question: "Kwa nini vyanzo ni muhimu kwenye chatbot ya Muungano?", options: ["Kuongeza mapambo", "Kuthibitisha majibu", "Kupunguza maswali", "Kubadili lugha"], answer: 1, explain: "Vyanzo husaidia mtumiaji kuamini majibu na kurejea ushahidi." },
      { question: "Muungano unahusisha pande zipi mbili?", options: ["Kenya na Tanzania", "Tanganyika na Zanzibar", "Uganda na Zanzibar", "Pemba na Unguja"], answer: 1, explain: "Muungano uliundwa kati ya Tanganyika na Zanzibar." },
    ],
    expert: [
      { question: "Kwa mfumo wa elimu ya kidigitali, kipengele gani hupunguza upotoshaji zaidi?", options: ["Majibu bila rejea", "Source citations", "Rangi nyingi", "Login pekee"], answer: 1, explain: "Source citations hutoa ushahidi unaoweza kurejelewa." },
      { question: "Katika RAG chatbot, hatua gani hutafuta taarifa kabla ya kutoa jibu?", options: ["Authentication", "Retrieval", "Styling", "Registration"], answer: 1, explain: "Retrieval hutafuta chunks muhimu kutoka database ya nyaraka." },
      { question: "Kwa vijana, Muungano una maana gani ya kijamii?", options: ["Kutenganisha utambulisho", "Kuimarisha umoja na kubadilishana utamaduni", "Kuzuia elimu", "Kupunguza mawasiliano"], answer: 1, explain: "Muungano unasaidia umoja wa taifa na mwingiliano wa kiutamaduni." },
      { question: "Nini thamani ya kuongeza WhatsApp Bot katika awamu ya pili?", options: ["Kuficha mfumo", "Kuwafikia vijana wengi zaidi", "Kuondoa website", "Kuzima AI"], answer: 1, explain: "WhatsApp Bot inaweza kuwafikia vijana kwenye njia wanayotumia kila siku." },
    ],
  },
  en: {
    beginner: [
      { question: "In which year was the Union of Tanganyika and Zanzibar officially formed?", options: ["1961", "1964", "1977", "1984"], answer: 1, explain: "The Union was officially formed on 26 April 1964." },
      { question: "Who was President of Zanzibar at the time of the Union?", options: ["Julius Nyerere", "Abeid Amani Karume", "Rashid Kawawa", "Ali Hassan Mwinyi"], answer: 1, explain: "Abeid Amani Karume was President of Zanzibar and one of the Union founders." },
      { question: "When were the Articles of Union signed?", options: ["12 January 1964", "22 April 1964", "26 April 1964", "9 December 1961"], answer: 1, explain: "The Articles of Union were signed on 22 April 1964." },
      { question: "Which is one benefit of the Union?", options: ["Separating youth", "Weakening unity", "Strengthening cooperation", "Deleting history"], answer: 2, explain: "The Union strengthens unity, cooperation, and shared institutions." },
    ],
    intermediate: [
      { question: "Which year is the main Constitution of the United Republic of Tanzania associated with?", options: ["1964", "1977", "1984", "1992"], answer: 1, explain: "The 1977 Constitution is the key constitutional foundation of the United Republic." },
      { question: "Which Zanzibar Constitution is commonly referenced in the Union framework?", options: ["1964", "1977", "1984", "2009"], answer: 2, explain: "The 1984 Constitution of Zanzibar describes the Revolutionary Government of Zanzibar framework." },
      { question: "Why are sources important in a Union chatbot?", options: ["Decoration", "To verify answers", "To reduce questions", "To change language"], answer: 1, explain: "Sources help users trust the answer and review the evidence." },
      { question: "Which two sides formed the Union?", options: ["Kenya and Tanzania", "Tanganyika and Zanzibar", "Uganda and Zanzibar", "Pemba and Unguja"], answer: 1, explain: "The Union was formed by Tanganyika and Zanzibar." },
    ],
    expert: [
      { question: "For a digital education platform, which feature best reduces misinformation?", options: ["Answers without references", "Source citations", "Many colors", "Login only"], answer: 1, explain: "Source citations provide evidence that users can check." },
      { question: "In a RAG chatbot, which step finds information before generating an answer?", options: ["Authentication", "Retrieval", "Styling", "Registration"], answer: 1, explain: "Retrieval searches the document chunks for relevant evidence." },
      { question: "What social value does the Union offer young people?", options: ["Dividing identity", "Strengthening unity and cultural exchange", "Blocking education", "Reducing communication"], answer: 1, explain: "The Union supports national unity and cultural exchange." },
      { question: "What is the value of adding a WhatsApp Bot in phase two?", options: ["Hiding the system", "Reaching more young people", "Removing the website", "Turning off AI"], answer: 1, explain: "A WhatsApp Bot can reach young people through a channel they already use." },
    ],
  },
};

if (window.muunganoQuizQuestions) {
  quizQuestions.sw = window.muunganoQuizQuestions.sw;
  quizQuestions.en = window.muunganoQuizQuestions.en;
}

const projectStatus = {
  sw: [
    ["Website Prototype", "Done"],
    ["RAG Chatbot", "Done"],
    ["Document Database", "Done"],
    ["Quiz System", "Done"],
    ["Mobile App", "Done"],
    ["WhatsApp Bot", "Ready"],
  ],
  en: [
    ["Website Prototype", "Done"],
    ["RAG Chatbot", "Done"],
    ["Document Database", "Done"],
    ["Quiz System", "Done"],
    ["Mobile App", "Done"],
    ["WhatsApp Bot", "Ready"],
  ],
};

const futureVision = {
  sw: ["Mobile App", "WhatsApp Bot", "AI Voice Assistant", "School Integration", "National Deployment"],
  en: ["Mobile App", "WhatsApp Bot", "AI Voice Assistant", "School Integration", "National Deployment"],
};

const safariEvents = [
  ["tanganyika-independence", "Tanganyika Independence", "9 Dec 1961", "Tanganyika became independent, laying an important foundation for self-government and later national unity.", "/static/assets/nyerere-founder.jpg"],
  ["zanzibar-revolution", "Zanzibar Revolution", "12 Jan 1964", "The Revolution reshaped Zanzibar's political history and opened the path to new leadership under Abeid Amani Karume.", "/static/assets/abeid-karume-founder.webp"],
  ["articles-of-union", "Articles of Union", "22 Apr 1964", "The Articles of Union were signed by Julius Nyerere and Abeid Amani Karume to unite Tanganyika and Zanzibar.", "/static/assets/safari-articles-of-union.png"],
  ["united-republic-formation", "Formation of the United Republic of Tanzania", "26 Apr 1964", "The Union was officially proclaimed, creating the United Republic and a shared national framework.", "/static/assets/muungano-homepage-bg.png"],
  ["union-day", "Union Day", "26 Apr", "Union Day marks the anniversary of the Union and invites citizens to reflect on unity, identity, and shared responsibility.", "/static/assets/safari-union-day.png"],
  ["union-institutions", "Union Institutions", "Ongoing", "Shared institutions help coordinate Union matters such as citizenship, defense, foreign affairs, and national identity.", "/static/assets/safari-union-institutions.png"],
];

const connectData = {
  events: [
    ["civic-education-week", "Civic Education Week", "Wed 18 Jun", "Student clubs discuss Union history and constitutional basics."],
    ["union-day-forum", "Union Day Forum", "Fri 20 Jun", "Youth speakers share ideas on unity, jobs, and digital learning."],
    ["community-learning-hour", "Community Learning Hour", "Mon 23 Jun", "A guided MuunganoHub session for local schools."],
    ["youth-debate-night", "Youth Debate Night", "Wed 25 Jun", "Open debate on civic rights and the role of the Union in modern Tanzania."],
    ["muungano-reading-club", "Muungano Reading Club", "Sat 28 Jun", "Group reading and discussion of key chapters from Union history texts."],
    ["digital-civics-workshop", "Digital Civics Workshop", "Tue 1 Jul", "Hands-on session using MuunganoHub tools for civic learning and research."],
    ["constitution-study-circle", "Constitution Study Circle", "Thu 3 Jul", "Youth-led deep dive into the 1977 and 1984 constitutions."],
    ["union-quiz-championship", "Union Quiz Championship", "Wed 9 Jul", "Inter-school Muungano Challenge quiz — earn points and badges."],
    ["community-service-day", "Community Service Day", "Sat 12 Jul", "Youth volunteer day connecting civic learning to real community action."],
    ["east-africa-youth-forum", "East Africa Youth Forum", "Thu 17 Jul", "Regional youth forum on unity, development, and civic participation."],
  ],
  topics: ["How can youth protect national unity?", "What should every student know about the Articles of Union?", "How can digital tools improve civic education?"],
  clubs: ["Muungano Debate Club", "History Readers Circle", "Civic Innovation Lab"],
};

const progressDefaults = {
  points: 0,
  level: "Beginner",
  completedLessons: [],
  completedQuizzes: [],
  quizScores: [],
  earnedBadges: [],
  historyOpened: [],
  safariVisited: [],
  safariLearned: [],
  safariQuizzed: [],
  connectActivities: [],
  learningStreak: 0,
  lastActivityDate: null,
};

const badgeCatalog = [
  { id: "union-beginner", title: "Union Beginner", text: "Complete your first lesson.", icon: "history" },
  { id: "quiz-champion", title: "Quiz Champion", text: "Score 80% or above in any quiz.", icon: "quiz" },
  { id: "history-explorer", title: "History Explorer", text: "Explore 5 Safari journeys.", icon: "safari" },
  { id: "active-learner", title: "Active Learner", text: "Complete 3 quizzes.", icon: "passport" },
  { id: "civic-ambassador", title: "Civic Ambassador", text: "Complete 2 Connect activities.", icon: "connect" },
  { id: "unity-builder", title: "Unity Builder", text: "Reach 500 points.", icon: "passport" },
];

const lessonCatalog = [
  { id: "history-foundations", title: "Union history foundations", page: "history" },
  { id: "timeline-events", title: "Timeline of key events", page: "timeline" },
  { id: "union-leaders", title: "Union leaders", page: "leaders" },
  { id: "audio-history", title: "Listen to history", page: "audio" },
];

const knowledgeAreas = {
  sw: [
    "Historia ya Muungano",
    "Waasisi",
    "Hati za Muungano",
    "Katiba",
    "Taasisi za Muungano",
    "Faida za Muungano",
    "Changamoto za Muungano",
    "Muungano na Vijana",
    "Uchumi na Biashara",
    "Elimu",
    "Utamaduni",
    "Maswali ya Mara kwa Mara",
    "Hotuba",
    "Machapisho ya Serikali",
    "Matukio Muhimu",
  ],
  en: [
    "History of the Union",
    "Founders",
    "Union Agreements",
    "Constitutions",
    "Union Institutions",
    "Benefits of the Union",
    "Challenges of the Union",
    "Union and Youth",
    "Economy and Trade",
    "Education",
    "Culture",
    "Frequently Asked Questions",
    "Speeches",
    "Government Publications",
    "Important Events",
  ],
};

const leaderSections = {
  sw: [
    {
      eyebrow: "Muungano na Uongozi wa Kwanza",
      title: "Waasisi na viongozi wa mwanzo",
      text: "Nyerere na Karume walitia saini Hati za Muungano na kuanzisha Jamhuri ya Muungano wa Tanzania tarehe 26 Aprili 1964.",
      color: "gold",
      featured: true,
      items: [
        ["Mwalimu Julius Kambarage Nyerere", "Rais wa kwanza wa Jamhuri ya Muungano", "Tanzania", "26 Apr, 1964 – 5 Nov, 1985", "Mwasisi wa Muungano na kiongozi wa kwanza wa Jamhuri ya Muungano wa Tanzania. Alitia saini Hati za Muungano na kuongoza taifa kwa miaka 21.", "/static/assets/nyerere-founder.jpg", "https://sw.wikipedia.org/wiki/Julius_Nyerere"],
        ["Sheikh Abeid Amani Karume", "Rais wa kwanza wa Zanzibar", "Zanzibar", "12 Jan, 1964 – 7 Apr, 1972", "Mwasisi wa Muungano na Rais wa kwanza wa Zanzibar baada ya Mapinduzi ya Zanzibar. Alishirikiana na Nyerere kuunda Jamhuri ya Muungano.", "/static/assets/abeid-karume-founder.webp", "https://sw.wikipedia.org/wiki/Abeid_Karume"],
      ],
    },
    {
      eyebrow: "Uongozi wa Sasa",
      title: "Marais wa sasa",
      text: "Viongozi wa sasa wanaoendeleza kazi ya Muungano katika Jamhuri ya Muungano wa Tanzania na Serikali ya Mapinduzi ya Zanzibar.",
      color: "green",
      items: [
        ["H.E. Dr. Samia Suluhu Hassan", "Rais wa Jamhuri ya Muungano wa Tanzania", "Tanzania", "19 Mar, 2021 – Sasa", "Rais wa sasa wa Jamhuri ya Muungano wa Tanzania — rais wa kwanza wa kike na mfano muhimu wa nafasi ya Zanzibar katika uongozi wa kitaifa.", "/static/assets/samia-suluhu.jpg", "https://sw.wikipedia.org/wiki/Samia_Suluhu_Hassan"],
        ["H.E. Dr. Hussein Ali Mwinyi", "Rais wa Zanzibar", "Zanzibar", "3 Nov, 2020 – Sasa", "Rais wa sasa wa Zanzibar na Mwenyekiti wa Baraza la Mapinduzi, anaendeleza maendeleo ya Zanzibar ndani ya Muungano.", "/static/assets/hussein-mwinyi.webp", "https://sw.wikipedia.org/wiki/Hussein_Ali_Mwinyi"],
      ],
    },
    {
      eyebrow: "Marais Waliopita — Tanzania",
      title: "Marais waliopita wa Jamhuri ya Muungano",
      text: "Orodha hii inaonyesha uongozi wa Jamhuri ya Muungano wa Tanzania kwa vipindi tofauti. Nyerere anaonekana katika sehemu ya Waasisi hapo juu.",
      color: "teal",
      items: [
        ["H.E. Ali Hassan Mwinyi", "Rais wa pili", "Tanzania", "5 Nov, 1985 – 23 Nov, 1995", "Aliongoza kipindi cha mageuzi ya kiuchumi na kisiasa. Alikuwa pia Rais wa Zanzibar (1984–1985) — mtu pekee aliyeongoza pande zote mbili za Muungano.", "/static/assets/President_Ali_Hassan_Mwinyi.jpg", "https://sw.wikipedia.org/wiki/Ali_Hassan_Mwinyi"],
        ["H.E. Benjamin William Mkapa", "Rais wa tatu", "Tanzania", "23 Nov, 1995 – 21 Dec, 2005", "Alisisitiza mageuzi ya uchumi, uimarishaji wa taasisi na uongozi bora wa umma.", "/static/assets/president_mkapa.webp", "https://sw.wikipedia.org/wiki/Benjamin_Mkapa"],
        ["H.E. Jakaya Mrisho Kikwete", "Rais wa nne", "Tanzania", "21 Dec, 2005 – 5 Nov, 2015", "Aliongoza kipindi cha diplomasia, upanuzi wa elimu na ushiriki wa vijana katika maendeleo.", "/static/assets/president_kikwete.webp", "https://sw.wikipedia.org/wiki/Jakaya_Kikwete"],
        ["H.E. John Pombe Magufuli", "Rais wa tano", "Tanzania", "5 Nov, 2015 – 17 Mar, 2021", "Alisisitiza miundombinu, nidhamu ya utendaji wa serikali na miradi mikubwa ya maendeleo.", "/static/assets/president_magufuli.webp", "https://sw.wikipedia.org/wiki/John_Magufuli"],
      ],
    },
    {
      eyebrow: "Marais Waliopita — Zanzibar",
      title: "Marais waliopita wa Zanzibar",
      text: "Orodha hii inaonyesha viongozi wa Zanzibar na kipindi walichoongoza. Karume anaonekana katika sehemu ya Waasisi hapo juu.",
      color: "brick",
      items: [
        ["H.E. Aboud Jumbe Mwinyi", "Rais wa Zanzibar", "Zanzibar", "7 Apr, 1972 – 27 Jan, 1984", "Aliongoza Zanzibar baada ya Karume na kipindi chake kilihusisha hatua muhimu za kikatiba na kuimarisha Muungano.", "/static/assets/President_Aboud_Jumbe_Mwinyi.jpg", "https://en.wikipedia.org/wiki/Aboud_Jumbe"],
        ["H.E. Sheikh Idrisa Abdulwakil", "Rais wa Zanzibar", "Zanzibar", "17 Oct, 1985 – 25 Oct, 1990", "Aliongoza Zanzibar katika kipindi kilichofuata mabadiliko muhimu ya kikatiba ya miaka ya 1980.", "/static/assets/President_Sheikh_Idrisa_Abdulwakil.jpg", "https://en.wikipedia.org/wiki/Idris_Abdul_Wakil"],
        ["H.E. Dr. Salmin Amour Juma", "Rais wa Zanzibar", "Zanzibar", "25 Oct, 1990 – 8 Nov, 2000", "Aliongoza Zanzibar wakati wa mageuzi ya vyama vingi na mijadala mipana ya kisiasa na kikatiba.", "/static/assets/President_Dr_Salmin_Amour_Juma.jpg", "https://en.wikipedia.org/wiki/Salmin_Amour"],
        ["H.E. Aman Abeid Aman Karume", "Rais wa Zanzibar", "Zanzibar", "8 Nov, 2000 – 3 Nov, 2010", "Aliongoza Zanzibar katika kipindi cha maridhiano ya kisiasa na mabadiliko ya kidemokrasia.", "/static/assets/President_Aman_Abeid_Aman_Karume.jpg", "https://sw.wikipedia.org/wiki/Amani_Abeid_Karume"],
        ["H.E. Dr. Ali Mohammed Shein", "Rais wa Zanzibar", "Zanzibar", "3 Nov, 2010 – 3 Nov, 2020", "Aliongoza Zanzibar kwa miaka kumi na kuimarisha ushirikiano wa Zanzibar na Tanzania Bara.", "/static/assets/President_Dr_Ali_Mohammed_Shein.jpg", "https://sw.wikipedia.org/wiki/Ali_Mohamed_Shein"],
      ],
    },
  ],
  en: [
    {
      eyebrow: "Union and First Leadership",
      title: "Founders and first leaders",
      text: "Nyerere and Karume signed the Articles of Union and established the United Republic of Tanzania on 26 April 1964.",
      color: "gold",
      featured: true,
      items: [
        ["Mwalimu Julius Kambarage Nyerere", "First President of the United Republic", "Tanzania", "26 Apr, 1964 – 5 Nov, 1985", "A founder of the Union and the first President of the United Republic of Tanzania. He signed the Articles of Union and led the nation for 21 years.", "/static/assets/nyerere-founder.jpg", "https://en.wikipedia.org/wiki/Julius_Nyerere"],
        ["Sheikh Abeid Amani Karume", "First President of Zanzibar", "Zanzibar", "12 Jan, 1964 – 7 Apr, 1972", "A founder of the Union and the first President of Zanzibar after the Zanzibar Revolution. He partnered with Nyerere to create the United Republic.", "/static/assets/abeid-karume-founder.webp", "https://en.wikipedia.org/wiki/Abeid_Karume"],
      ],
    },
    {
      eyebrow: "Leading Today",
      title: "Current Presidents",
      text: "The current leaders continuing the work of the Union in the United Republic of Tanzania and the Revolutionary Government of Zanzibar.",
      color: "green",
      items: [
        ["H.E. Dr. Samia Suluhu Hassan", "President of the United Republic of Tanzania", "Tanzania", "19 Mar, 2021 – Present", "Current President of the United Republic of Tanzania — the first female president and an important symbol of Zanzibar's role in national leadership.", "/static/assets/samia-suluhu.jpg", "https://en.wikipedia.org/wiki/Samia_Suluhu_Hassan"],
        ["H.E. Dr. Hussein Ali Mwinyi", "President of Zanzibar", "Zanzibar", "3 Nov, 2020 – Present", "Current President of Zanzibar and Chairman of the Revolutionary Council, continuing the development of Zanzibar within the Union.", "/static/assets/hussein-mwinyi.webp", "https://en.wikipedia.org/wiki/Hussein_Mwinyi"],
      ],
    },
    {
      eyebrow: "Previous Presidents — Tanzania",
      title: "Previous Presidents of the United Republic",
      text: "The presidential leadership of the United Republic of Tanzania across different periods. Nyerere is shown in the Founders section above.",
      color: "teal",
      items: [
        ["H.E. Ali Hassan Mwinyi", "Second President", "Tanzania", "5 Nov, 1985 – 23 Nov, 1995", "He led Tanzania through economic and political reforms. He also served as President of Zanzibar (1984–1985), making him the only person to have led both sides of the Union.", "/static/assets/President_Ali_Hassan_Mwinyi.jpg", "https://en.wikipedia.org/wiki/Ali_Hassan_Mwinyi"],
        ["H.E. Benjamin William Mkapa", "Third President", "Tanzania", "23 Nov, 1995 – 21 Dec, 2005", "His leadership emphasized economic reforms, stronger institutions, and improvements in public administration.", "/static/assets/president_mkapa.webp", "https://en.wikipedia.org/wiki/Benjamin_Mkapa"],
        ["H.E. Jakaya Mrisho Kikwete", "Fourth President", "Tanzania", "21 Dec, 2005 – 5 Nov, 2015", "He led a period of diplomacy, education expansion, and increased youth participation in national development.", "/static/assets/president_kikwete.webp", "https://en.wikipedia.org/wiki/Jakaya_Kikwete"],
        ["H.E. John Pombe Magufuli", "Fifth President", "Tanzania", "5 Nov, 2015 – 17 Mar, 2021", "He emphasized infrastructure development, government accountability, and large-scale national development projects.", "/static/assets/president_magufuli.webp", "https://en.wikipedia.org/wiki/John_Magufuli"],
      ],
    },
    {
      eyebrow: "Previous Presidents — Zanzibar",
      title: "Previous Presidents of Zanzibar",
      text: "Zanzibar's presidential leadership across different periods. Karume is shown in the Founders section above.",
      color: "brick",
      items: [
        ["H.E. Aboud Jumbe Mwinyi", "President of Zanzibar", "Zanzibar", "7 Apr, 1972 – 27 Jan, 1984", "He led Zanzibar after Karume, overseeing important constitutional developments and strengthening the Union relationship.", "/static/assets/President_Aboud_Jumbe_Mwinyi.jpg", "https://en.wikipedia.org/wiki/Aboud_Jumbe"],
        ["H.E. Sheikh Idrisa Abdulwakil", "President of Zanzibar", "Zanzibar", "17 Oct, 1985 – 25 Oct, 1990", "He led Zanzibar in the period following the major constitutional reforms of the 1980s.", "/static/assets/President_Sheikh_Idrisa_Abdulwakil.jpg", "https://en.wikipedia.org/wiki/Idris_Abdul_Wakil"],
        ["H.E. Dr. Salmin Amour Juma", "President of Zanzibar", "Zanzibar", "25 Oct, 1990 – 8 Nov, 2000", "He led Zanzibar through multiparty reforms and broad political and constitutional debates.", "/static/assets/President_Dr_Salmin_Amour_Juma.jpg", "https://en.wikipedia.org/wiki/Salmin_Amour"],
        ["H.E. Aman Abeid Aman Karume", "President of Zanzibar", "Zanzibar", "8 Nov, 2000 – 3 Nov, 2010", "He led Zanzibar through a period of political reconciliation and democratic transition.", "/static/assets/President_Aman_Abeid_Aman_Karume.jpg", "https://en.wikipedia.org/wiki/Amani_Abeid_Karume"],
        ["H.E. Dr. Ali Mohammed Shein", "President of Zanzibar", "Zanzibar", "3 Nov, 2010 – 3 Nov, 2020", "He led Zanzibar for a decade, strengthening cooperation between Zanzibar and Mainland Tanzania.", "/static/assets/President_Dr_Ali_Mohammed_Shein.jpg", "https://en.wikipedia.org/wiki/Ali_Mohamed_Shein"],
      ],
    },
  ],
};

const homeQuestions = {
  sw: [
    "Muungano ulianzishwa lini?",
    "Nani walikuwa waasisi wa Muungano?",
    "Faida za Muungano kwa vijana ni zipi?",
    "Mambo ya Muungano ni yapi?",
    "Kwa nini Hati za Muungano ni muhimu?",
  ],
  en: [
    "When was the Union formed?",
    "Who were the founders of the Union?",
    "How does the Union help young people?",
    "What are Union matters?",
    "Why are the Articles of Union important?",
  ],
};

const trustSignals = {
  sw: [
    ["Official-first RAG", "Retrieval inapendelea Katiba, Hati za Muungano na vyanzo rasmi."],
    ["Source-Cited", "Majibu muhimu yanaonyesha nyaraka na sehemu za kurejea."],
    ["Bilingual Tutor", "Mtumiaji anaweza kuuliza kwa Kiswahili au English."],
    ["Competition Ready", "Demo ina maswali, audio, timeline, quiz na offline fallback."],
  ],
  en: [
    ["Official-first RAG", "Retrieval prioritizes constitutions, Articles of Union, and official sources."],
    ["Source-Cited", "Important answers show documents and reference locations."],
    ["Bilingual Tutor", "Users can ask in Swahili or English."],
    ["Competition Ready", "The demo combines questions, audio, timeline, quiz, and offline fallback."],
  ],
};

const offlineAnswers = {
  sw: [
    {
      keys: ["muungano ni nini", "nini muungano", "maana ya muungano", "muungano maana", "muungano ni", "unganisho ni nini", "jamhuri ya muungano ni nini", "muungano wa tanganyika", "tanganyika na zanzibar waliungana", "muungano ulikuwa nini", "muungano unamaanisha nini"],
      answer: "Muungano ni makubaliano ya kisiasa na kikatiba yaliyounganisha Tanganyika na Zanzibar na kuunda Jamhuri ya Muungano wa Tanzania. Kwa Tanzania, Muungano ulianza rasmi tarehe 26 Aprili 1964 baada ya Hati za Muungano kusainiwa tarehe 22 Aprili 1964.\n\nVyanzo:\n[1] Historia ya Muungano wa Tanganyika na Zanzibar\n[2] Katiba ya Jamhuri ya Muungano wa Tanzania ya 1977",
    },
    {
      keys: ["kwa nini waliungana", "kwanini waliungana", "sababu za muungano", "sababu za", "kwa nini tanganyika", "kwanini tanganyika", "kwa nini zanzibar", "waliungana kwa sababu", "kwa nini muungano", "kwanini muungano", "sababu gani"],
      answer: "Sababu za Muungano zilikuwa nyingi. Tanganyika na Zanzibar zilikuwa karibu kijiografia, na watu wake walikuwa na uhusiano wa muda mrefu kupitia biashara, lugha ya Kiswahili, na harakati za ukombozi. Baada ya Uhuru wa Tanganyika (1961) na Mapinduzi ya Zanzibar (1964), viongozi wa pande zote mbili waliamua kuungana ili kuimarisha usalama, kupunguza mgawanyiko, na kujenga taifa lenye nguvu.\n\nVyanzo:\n[1] Historia ya Muungano wa Tanganyika na Zanzibar\n[2] Hati za Muungano za 1964",
    },
    {
      keys: ["ulianzishwa lini", "lini muungano", "tarehe ya muungano", "mwaka wa muungano", "tarehe gani", "mwaka gani", "26 aprili", "muungano uliundwa", "muungano ulianza"],
      answer: "Muungano wa Tanganyika na Zanzibar ulianzishwa rasmi tarehe 26 Aprili 1964. Hati za Muungano zilisainiwa tarehe 22 Aprili 1964 na Julius Kambarage Nyerere na Abeid Amani Karume.\n\nVyanzo:\n[1] Historia ya Muungano wa Tanganyika na Zanzibar\n[2] Hati za Muungano",
    },
    {
      keys: ["waasisi", "nani walianzisha", "nani walitia saini", "walitia saini", "nani aliunda", "nyerere", "karume"],
      answer: "Waasisi wakuu wa Muungano walikuwa Mwalimu Julius Kambarage Nyerere wa Tanganyika na Sheikh Abeid Amani Karume wa Zanzibar. Wao walitia saini Hati za Muungano na kuongoza hatua za awali za kuunda Jamhuri ya Muungano.\n\nVyanzo:\n[1] Historia ya Muungano wa Tanganyika na Zanzibar\n[2] Rejea za viongozi wa Tanzania na Zanzibar",
    },
    {
      keys: ["hati za muungano", "hati ni nini", "makubaliano ya muungano", "hati za"],
      answer: "Hati za Muungano ni nyaraka zilizosainiwa tarehe 22 Aprili 1964 na Julius Nyerere na Abeid Amani Karume. Hati hizi ziliweka msingi wa kisheria wa kuunganisha Tanganyika na Zanzibar. Zina vifungu 22 vinavyoainisha muundo wa Muungano, mamlaka ya Serikali ya Muungano, na nafasi ya Zanzibar.\n\nVyanzo:\n[1] Hati za Muungano 1964\n[2] Historia ya Muungano wa Tanganyika na Zanzibar",
    },
    {
      keys: ["mambo ya muungano", "mambo gani", "mambo ya pamoja", "orodha ya mambo"],
      answer: "Mambo ya Muungano ni mambo yanayosimamiwa na Serikali ya Muungano. Yanajumuisha: ulinzi na usalama, uraia na uhamiaji, mambo ya nje, fedha na benki kuu, elimu ya juu, mawasiliano, na usafiri wa anga. Mambo mengine yanabaki chini ya Serikali ya Zanzibar.\n\nVyanzo:\n[1] Katiba ya Jamhuri ya Muungano wa Tanzania ya 1977\n[2] Hati za Muungano",
    },
    {
      keys: ["faida za muungano", "faida", "manufaa", "umuhimu wa muungano", "umuhimu", "kwa nini muungano ni muhimu", "muungano ni muhimu", "vijana", "wanafunzi", "ajira", "biashara", "muungano unasaidia"],
      answer: "Umuhimu wa Muungano ni kuimarisha umoja wa taifa, kulinda amani na usalama, kuongeza ushirikiano kati ya Tanzania Bara na Zanzibar, na kujenga utambulisho wa pamoja wa Watanzania. Pia unarahisisha fursa za elimu, biashara, ajira, mawasiliano na mwingiliano wa watu wa pande zote mbili.\n\nVyanzo:\n[1] Union and Youth knowledge notes\n[2] Historia ya Muungano wa Tanganyika na Zanzibar",
    },
    {
      keys: ["changamoto za muungano", "changamoto", "matatizo ya muungano", "migogoro ya muungano"],
      answer: "Changamoto za Muungano ni pamoja na: mgawanyo wa rasilimali na mapato kati ya Tanzania Bara na Zanzibar, maswali kuhusu mfumo wa serikali mbili au tatu, tofauti za mifumo ya kisheria, na mijadala ya mara kwa mara kuhusu mgawanyo wa mamlaka. Changamoto hizi zimekuwa mada ya mazungumzo ya kitaifa tangu miaka ya 1990.\n\nVyanzo:\n[1] Historia ya Muungano wa Tanganyika na Zanzibar\n[2] Katiba ya Jamhuri ya Muungano wa Tanzania ya 1977",
    },
    {
      keys: ["mapinduzi ya zanzibar", "mapinduzi zanzibar", "zanzibar revolution", "12 januari 1964", "januari 1964"],
      answer: "Mapinduzi ya Zanzibar yalifanyika tarehe 12 Januari 1964. Chini ya uongozi wa Abeid Amani Karume, Serikali ya Usultani wa Zanzibar iliondolewa na Serikali ya Mapinduzi ilianzishwa. Mapinduzi haya yaliunda mazingira ya kisiasa yaliyofanya Muungano na Tanganyika uwezekane miezi michache baadaye.\n\nVyanzo:\n[1] Historia ya Mapinduzi ya Zanzibar 1964\n[2] Historia ya Muungano wa Tanganyika na Zanzibar",
    },
    {
      keys: ["uhuru wa tanganyika", "tanganyika ilipata uhuru", "tanganyika uhuru", "9 desemba 1961", "uhuru tanganyika"],
      answer: "Tanganyika ilipata uhuru tarehe 9 Desemba 1961. Julius Kambarage Nyerere alikuwa kiongozi mkuu wa harakati za uhuru na akawa Waziri Mkuu wa kwanza, kisha Rais wa kwanza wa Tanganyika. Uhuru huu ulikuwa hatua muhimu iliyotangulia kuundwa kwa Muungano mwaka 1964.\n\nVyanzo:\n[1] Historia ya Muungano wa Tanganyika na Zanzibar\n[2] Rejea za viongozi wa Tanzania na Zanzibar",
    },
    {
      keys: ["historia ya muungano", "historia ya tanzania", "historia", "tanzania historia"],
      answer: "Historia ya Muungano inaanza kabla ya 1964, wakati Tanganyika na Zanzibar zilikuwa na mahusiano ya biashara, lugha na utamaduni. Baada ya Uhuru wa Tanganyika (1961), Mapinduzi ya Zanzibar (12 Januari 1964), na kusainiwa kwa Hati za Muungano (22 Aprili 1964), Jamhuri ya Muungano wa Tanzania ilitangazwa rasmi tarehe 26 Aprili 1964.\n\nVyanzo:\n[1] Historia ya Muungano wa Tanganyika na Zanzibar\n[2] Hati za Muungano 1964",
    },
  ],
  en: [
    {
      keys: ["what is union", "meaning of union", "what is the union", "define union", "united republic", "what is tanzania"],
      answer: "The Union is the political and constitutional arrangement that joined Tanganyika and Zanzibar to form the United Republic of Tanzania. It formally began on 26 April 1964 after the Articles of Union were signed on 22 April 1964.\n\nSources:\n[1] History of the Union of Tanganyika and Zanzibar\n[2] Constitution of the United Republic of Tanzania, 1977",
    },
    {
      keys: ["why did tanganyika", "why did zanzibar", "why did they unite", "reasons for union", "reasons for the union", "why was union formed", "why union"],
      answer: "The reasons for the Union included geography, security, politics, culture, and social bonds. Tanganyika and Zanzibar had long historical ties through trade, the Swahili language, and liberation movements. After Tanganyika's independence (1961) and the Zanzibar Revolution (1964), leaders chose to unite to strengthen security and build a stronger nation.\n\nSources:\n[1] History of the Union of Tanganyika and Zanzibar\n[2] Articles of Union 1964",
    },
    {
      keys: ["when was", "when did", "what date", "what year", "formed", "26 april", "april 1964"],
      answer: "The Union of Tanganyika and Zanzibar was officially formed on 26 April 1964. The Articles of Union were signed on 22 April 1964 by Julius Kambarage Nyerere and Abeid Amani Karume.\n\nSources:\n[1] History of the Union of Tanganyika and Zanzibar\n[2] Articles of Union",
    },
    {
      keys: ["founders", "who founded", "who signed", "who created", "nyerere", "karume"],
      answer: "The main founders of the Union were Mwalimu Julius Kambarage Nyerere of Tanganyika and Sheikh Abeid Amani Karume of Zanzibar. They signed the Articles of Union and led the early formation of the United Republic.\n\nSources:\n[1] History of the Union of Tanganyika and Zanzibar\n[2] Tanzania and Zanzibar leader references",
    },
    {
      keys: ["articles of union", "what are the articles", "union articles"],
      answer: "The Articles of Union are the legal documents signed on 22 April 1964 by Julius Nyerere and Abeid Amani Karume. They contain 22 articles that established the framework of the Union, defined the powers of the Union Government, and recognized Zanzibar's place within the United Republic.\n\nSources:\n[1] Articles of Union 1964\n[2] History of the Union of Tanganyika and Zanzibar",
    },
    {
      keys: ["union matters", "what are union matters", "matters of union"],
      answer: "Union matters are areas governed by the Union Government and include: defence and security, citizenship and immigration, foreign affairs, currency and the central bank, higher education, telecommunications, and air transport. Other matters remain under the Zanzibar Government.\n\nSources:\n[1] Constitution of the United Republic of Tanzania, 1977\n[2] Articles of Union",
    },
    {
      keys: ["benefits", "importance of the union", "why is the union important", "union is important", "important union", "advantages", "value of the union", "youth", "students", "jobs", "business", "how does union help"],
      answer: "The importance of the Union includes strengthening national unity, protecting peace and security, increasing cooperation between Mainland Tanzania and Zanzibar, and building a shared Tanzanian identity. It also supports education, trade, employment, communication, and interaction between people from both sides.\n\nSources:\n[1] Union and Youth knowledge notes\n[2] History of the Union of Tanganyika and Zanzibar",
    },
    {
      keys: ["challenges", "problems with union", "union problems", "difficulties"],
      answer: "Challenges of the Union include debates over resource sharing between Mainland Tanzania and Zanzibar, discussions about whether to have two or three governments, differences in legal systems, and recurring discussions about the division of powers. These have been ongoing topics of national dialogue since the 1990s.\n\nSources:\n[1] History of the Union of Tanganyika and Zanzibar\n[2] Constitution of the United Republic of Tanzania, 1977",
    },
    {
      keys: ["zanzibar revolution", "revolution", "january 1964", "12 january"],
      answer: "The Zanzibar Revolution took place on 12 January 1964. Under the leadership of Abeid Amani Karume, the Sultanate of Zanzibar was overthrown and the Revolutionary Government was established. This event created the political conditions that made the Union with Tanganyika possible months later.\n\nSources:\n[1] History of the Zanzibar Revolution 1964\n[2] History of the Union of Tanganyika and Zanzibar",
    },
    {
      keys: ["tanganyika independence", "when did tanganyika", "december 1961", "9 december"],
      answer: "Tanganyika gained independence on 9 December 1961. Julius Kambarage Nyerere was the leader of the independence movement and became the first Prime Minister, then the first President of Tanganyika. This independence was a key step that preceded the formation of the Union in 1964.\n\nSources:\n[1] History of the Union of Tanganyika and Zanzibar\n[2] Tanzania and Zanzibar leader references",
    },
    {
      keys: ["history of union", "history of tanzania", "union history", "tanzania history"],
      answer: "The history of the Union begins before 1964, when Tanganyika and Zanzibar had ties through trade, language, and culture. After Tanganyika's independence (1961), the Zanzibar Revolution (12 January 1964), and the signing of the Articles of Union (22 April 1964), the United Republic of Tanzania was officially proclaimed on 26 April 1964.\n\nSources:\n[1] History of the Union of Tanganyika and Zanzibar\n[2] Articles of Union 1964",
    },
  ],
};

const authView = document.querySelector("#authView");
const platformView = document.querySelector("#platformView");
const languageSelect = document.querySelector("#languageSelect");
const loginTab = document.querySelector("#loginTab");
const registerTab = document.querySelector("#registerTab");
const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const passwordResetForm = document.querySelector("#passwordResetForm");
const forgotPasswordButton = document.querySelector("#forgotPasswordButton");
const requestResetButton = document.querySelector("#requestResetButton");
const backToLoginButton = document.querySelector("#backToLoginButton");
const authStatus = document.querySelector("#authStatus");
const chatStatus = document.querySelector("#chatStatus");
const loginEmail = document.querySelector("#loginEmail");
const loginPassword = document.querySelector("#loginPassword");
const registerName = document.querySelector("#registerName");
const registerEmail = document.querySelector("#registerEmail");
const registerPassword = document.querySelector("#registerPassword");
const resetEmail = document.querySelector("#resetEmail");
const resetToken = document.querySelector("#resetToken");
const resetNewPassword = document.querySelector("#resetNewPassword");
const resetConfirmPassword = document.querySelector("#resetConfirmPassword");
const messages = document.querySelector("#messages");
const chatForm = document.querySelector("#chatForm");
const questionInput = document.querySelector("#questionInput");
const sendButton = document.querySelector("#sendButton");
const logoutButton = document.querySelector("#logoutButton");
const mobileLogoutButton = document.querySelector("#mobileLogoutButton");
const newChatButton = document.querySelector("#newChatButton");
const userEmail = document.querySelector("#userEmail");
const pageTitle = document.querySelector("#pageTitle");
const chatWelcome = document.querySelector("#chatWelcome");
const topLanguageButton = document.querySelector("#topLanguageButton");
const topLanguageLabel = document.querySelector("#topLanguageLabel");
const topAuthButton = document.querySelector("#topAuthButton");

function tr(key) {
  return translations[state.language][key] || translations.sw[key] || key;
}

function pageLabel(page) {
  return translations[state.language].pageTitles[page];
}

function pageIcon(page) {
  return pageIcons[page] || pageIcons.home;
}

function pageExists(page) {
  return Boolean(page && document.querySelector(`#page-${page}`));
}

function normalizedPage(page) {
  return pageExists(page) ? page : "home";
}

function pageUrl(page) {
  const url = new URL(window.location.href);
  if (page === "home") {
    url.searchParams.delete("page");
  } else {
    url.searchParams.set("page", page);
  }
  url.hash = "";
  return url;
}

function syncPageUrl(page, replace = false) {
  const url = pageUrl(page);
  if (url.href === window.location.href) return;
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({ page }, "", url);
}

function resetPageScroll() {
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  document.querySelector(".content-shell")?.scrollTo?.({ top: 0, behavior });
  window.scrollTo({ top: 0, behavior });
}

function closeFloatingPanels() {
  document.querySelector("#backgroundPanel")?.classList.remove("open");
  document.querySelector("#backgroundButton")?.setAttribute("aria-expanded", "false");
  closeMainMenu();
}

function closeMainMenu() {
  document.querySelector("#mainMenuPanel")?.classList.remove("open");
  document.querySelector("#mainMenuButton")?.setAttribute("aria-expanded", "false");
}

function toggleMainMenu() {
  const menuPanel = document.querySelector("#mainMenuPanel");
  const menuButton = document.querySelector("#mainMenuButton");
  if (!menuPanel || !menuButton) return;
  const isOpen = menuPanel.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
}

function navigateToPage(page) {
  const publicPages = new Set(["home", "about", "media"]);
  if (!state.token && !publicPages.has(page)) {
    showAuth();
    return;
  }
  setPage(page, { updateUrl: true, scroll: true });
  closeFloatingPanels();
}

function bindMainMenuControl() {
  const menuButton = document.querySelector("#mainMenuButton");
  if (!menuButton || menuButton.dataset.menuBound === "true") return;
  menuButton.dataset.menuBound = "true";
  menuButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleMainMenu();
  });
}

function bindNavigationControls(root = document) {
  root.querySelectorAll("[data-page]").forEach((control) => {
    if (control.dataset.navigationBound === "true") return;
    control.dataset.navigationBound = "true";
    control.addEventListener("click", (event) => {
      const nearestPageControl = event.target.closest("[data-page]");
      if (nearestPageControl !== control) return;
      event.preventDefault();
      navigateToPage(control.dataset.page);
    });
  });
}

function setLanguage(language) {
  state.language = language;
  state.audioLanguage = language;
  state.activeStory = 0;
  state.quizLevel = "beginner";
  state.quizIndex = 0;
  state.quizScore = 0;
  state.quizAnswered = false;
  localStorage.setItem("muunganohub_language", language);
  localStorage.setItem("muunganohub_audio_language", language);
  document.documentElement.lang = language === "sw" ? "sw" : "en";
  languageSelect.value = language;
  applyLanguage();
}

function applyLanguage() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = tr(element.dataset.i18n);
  });
  document.querySelector(".brand-panel p").textContent = content[state.language].authIntro;
  questionInput.placeholder = tr("questionPlaceholder");
  chatWelcome.textContent = tr("chatWelcome");
  if (topLanguageLabel) topLanguageLabel.textContent = state.language === "sw" ? "Swahili" : "English";
  if (topAuthButton && !state.token) topAuthButton.textContent = "Login / Sign Up";
  document.querySelectorAll(".nav-button").forEach((button) => {
    const label = button.dataset.menuLabel ? tr(button.dataset.menuLabel) : pageLabel(button.dataset.page);
    button.innerHTML = `<span class="nav-icon">${pageIcon(button.dataset.page)}</span><span class="nav-label"></span>`;
    button.querySelector(".nav-label").textContent = label;
  });
  renderBackgroundOptions();
  applyBackground();
  if (platformView && !platformView.classList.contains("hidden")) {
    renderAllPages();
    setPage(state.currentPage, { replaceUrl: true, scroll: false });
  }
  bindMainMenuControl();
  bindNavigationControls();
}

function applyBackground() {
  const selected = backgroundOptions.find((option) => option.id === state.background) || backgroundOptions[0];
  document.documentElement.style.setProperty("--app-bg-image", `url("${appUrl(selected.src)}")`);
  document.documentElement.dataset.background = selected.id;
  localStorage.setItem("muunganohub_background", selected.id);
}

function renderBackgroundOptions() {
  const panel = document.querySelector("#backgroundPanel");
  if (!panel) return;
  panel.innerHTML = backgroundOptions.map((option) => `
    <button class="background-choice ${option.id === state.background ? "active" : ""}" data-background="${option.id}" type="button">
      <img src="${attrUrl(option.src)}" alt="" />
      <span>${option.label[state.language]}</span>
    </button>
  `).join("");
}

function setStatus(element, message, tone = "") {
  element.textContent = message;
  element.dataset.tone = tone;
}

function progressStorageKey() {
  const userKey = state.user?.email || state.user?.id || "guest";
  return `muunganohub_user_progress_${String(userKey).toLowerCase()}`;
}

function getUserProgress() {
  const parsed = JSON.parse(localStorage.getItem(progressStorageKey()) || "null") || {};
  const progress = {
    ...progressDefaults,
    ...parsed,
    completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
    completedQuizzes: Array.isArray(parsed.completedQuizzes) ? parsed.completedQuizzes : [],
    quizScores: Array.isArray(parsed.quizScores) ? parsed.quizScores : [],
    earnedBadges: Array.isArray(parsed.earnedBadges) ? parsed.earnedBadges : [],
    historyOpened: Array.isArray(parsed.historyOpened) ? parsed.historyOpened : [],
    safariVisited: Array.isArray(parsed.safariVisited) ? parsed.safariVisited : [],
    safariLearned: Array.isArray(parsed.safariLearned) ? parsed.safariLearned : [],
    safariQuizzed: Array.isArray(parsed.safariQuizzed) ? parsed.safariQuizzed : [],
    connectActivities: Array.isArray(parsed.connectActivities) ? parsed.connectActivities : [],
  };
  progress.points = Number(progress.points) || 0;
  progress.learningStreak = Number(progress.learningStreak) || 0;
  progress.level = calculateLevel(progress.points);
  return progress;
}

function saveUserProgress(progress) {
  const normalized = { ...progress, level: calculateLevel(progress.points) };
  localStorage.setItem(progressStorageKey(), JSON.stringify(normalized));
  return normalized;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(dateA, dateB) {
  const a = new Date(`${dateA}T00:00:00`);
  const b = new Date(`${dateB}T00:00:00`);
  return Math.round((b - a) / 86400000);
}

function calculateLevel(points) {
  if (points >= 1000) return "Civic Ambassador";
  if (points >= 500) return "Unity Builder";
  if (points >= 200) return "Civic Explorer";
  return "Beginner";
}

function nextLevelTarget(points) {
  if (points < 200) return { current: 0, next: 200, label: "Civic Explorer" };
  if (points < 500) return { current: 200, next: 500, label: "Unity Builder" };
  if (points < 1000) return { current: 500, next: 1000, label: "Civic Ambassador" };
  return { current: 1000, next: Math.max(points, 1000), label: "Max level" };
}

function updateLearningStreak(progress = getUserProgress()) {
  const today = todayKey();
  if (progress.lastActivityDate === today) return progress;
  if (!progress.lastActivityDate) {
    progress.learningStreak = 1;
  } else if (daysBetween(progress.lastActivityDate, today) === 1) {
    progress.learningStreak += 1;
  } else {
    progress.learningStreak = 1;
  }
  progress.lastActivityDate = today;
  progress.points += 20;
  return saveUserProgress(progress);
}

function addPoints(amount, reason = "") {
  const progress = getUserProgress();
  progress.points += amount;
  progress.level = calculateLevel(progress.points);
  saveUserProgress(progress);
  return progress;
}

function completeQuiz(quizId, score) {
  let progress = updateLearningStreak();
  const alreadyCompleted = progress.completedQuizzes.includes(quizId);
  if (!alreadyCompleted) {
    progress.completedQuizzes.push(quizId);
    progress.points += 100;
  }
  progress.quizScores.push({ quizId, score, date: todayKey() });
  if (score >= 80 && !alreadyCompleted) progress.points += 50;
  progress = saveUserProgress(progress);
  const unlocked = checkAndUnlockBadges();
  refreshProgressViews();
  showProgressNotification(`Hongera! Your Passport has been updated.${unlocked.length ? ` Badge unlocked: ${unlocked.map((badge) => badge.title).join(", ")}.` : ""}`);
  return getUserProgress();
}

function completeLesson(lessonId) {
  let progress = updateLearningStreak();
  if (progress.completedLessons.includes(lessonId)) return progress;
  progress.completedLessons.push(lessonId);
  if (lessonId === "history-foundations") {
    content[state.language].history.timeline.forEach((_, index) => {
      const itemId = `history-${index}`;
      if (!progress.historyOpened.includes(itemId)) progress.historyOpened.push(itemId);
    });
  }
  progress.points += 50;
  progress = saveUserProgress(progress);
  const unlocked = checkAndUnlockBadges();
  refreshProgressViews();
  if (state.currentPage === "history") renderHistory();
  bindProgressControls(platformView);
  bindNavigationControls(platformView);
  showProgressNotification(`Lesson completed. Passport updated.${unlocked.length ? ` Badge unlocked: ${unlocked.map((badge) => badge.title).join(", ")}.` : ""}`);
  return getUserProgress();
}

function completeHistoryItem(itemId) {
  let progress = updateLearningStreak();
  if (!progress.historyOpened.includes(itemId)) {
    progress.historyOpened.push(itemId);
    progress.points += 15;
  }
  const historyItemIds = content[state.language].history.timeline.map((_, index) => `history-${index}`);
  const allHistoryItemsOpened = historyItemIds.every((id) => progress.historyOpened.includes(id));
  if (allHistoryItemsOpened && !progress.completedLessons.includes("history-foundations")) {
    progress.completedLessons.push("history-foundations");
    progress.points += 50;
  }
  progress = saveUserProgress(progress);
  const unlocked = checkAndUnlockBadges();
  refreshProgressViews();
  if (state.currentPage === "history") renderHistory();
  bindProgressControls(platformView);
  bindNavigationControls(platformView);
  showProgressNotification(`${state.language === "sw" ? "Umesoma kipengele cha historia." : "History item completed."} Passport updated.${unlocked.length ? ` Badge unlocked: ${unlocked.map((badge) => badge.title).join(", ")}.` : ""}`);
  return getUserProgress();
}

function openHistoryReference(item) {
  const url = item.dataset.historyUrl || "";
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function completeSafariItem(itemId) {
  let progress = updateLearningStreak();
  if (progress.safariVisited.includes(itemId)) return progress;
  progress.safariVisited.push(itemId);
  progress.points += 40;
  progress = saveUserProgress(progress);
  const unlocked = checkAndUnlockBadges();
  refreshProgressViews();
  showProgressNotification(`Safari journey explored. Passport updated.${unlocked.length ? ` Badge unlocked: ${unlocked.map((badge) => badge.title).join(", ")}.` : ""}`);
  return getUserProgress();
}

function recordSafariAction(itemId, action) {
  let progress = getUserProgress();
  if (action === "learn" && !progress.safariLearned.includes(itemId)) {
    progress.safariLearned.push(itemId);
    saveUserProgress(progress);
  }
  if (action === "quiz" && !progress.safariQuizzed.includes(itemId)) {
    progress.safariQuizzed.push(itemId);
    saveUserProgress(progress);
  }
  progress = getUserProgress();
  if (progress.safariLearned.includes(itemId) && progress.safariQuizzed.includes(itemId)) {
    completeSafariItem(itemId);
  }
}

function completeConnectActivity(activityId) {
  let progress = updateLearningStreak();
  if (progress.connectActivities.includes(activityId)) return progress;
  progress.connectActivities.push(activityId);
  progress.points += 80;
  progress = saveUserProgress(progress);
  const unlocked = checkAndUnlockBadges();
  refreshProgressViews();
  showProgressNotification(`Connect activity completed. Passport updated.${unlocked.length ? ` Badge unlocked: ${unlocked.map((badge) => badge.title).join(", ")}.` : ""}`);
  return getUserProgress();
}

function checkAndUnlockBadges() {
  const progress = getUserProgress();
  const earned = new Set(progress.earnedBadges);
  const unlocked = [];
  const unlockIf = (condition, badgeId) => {
    if (!condition || earned.has(badgeId)) return;
    earned.add(badgeId);
    const badge = badgeCatalog.find((item) => item.id === badgeId);
    if (badge) unlocked.push(badge);
  };
  unlockIf(progress.completedLessons.length >= 1, "union-beginner");
  unlockIf(progress.quizScores.some((item) => Number(item.score) >= 80), "quiz-champion");
  unlockIf(progress.safariVisited.length >= 5, "history-explorer");
  unlockIf(progress.completedQuizzes.length >= 3, "active-learner");
  unlockIf(progress.connectActivities.length >= 2, "civic-ambassador");
  unlockIf(progress.points >= 500, "unity-builder");
  progress.earnedBadges = Array.from(earned);
  saveUserProgress(progress);
  return unlocked;
}

function averageQuizScore(progress = getUserProgress()) {
  if (!progress.quizScores.length) return 0;
  const total = progress.quizScores.reduce((sum, item) => sum + Number(item.score || 0), 0);
  return Math.round(total / progress.quizScores.length);
}

function recommendedAction(progress = getUserProgress()) {
  if (!progress.completedQuizzes.length) return { page: "quiz", title: "Take your first Quiz", text: "Complete a Muungano Challenge quiz to start building your Passport." };
  if (progress.safariVisited.length < 3) return { page: "safari", title: "Explore Safari ya Muungano", text: "Visit at least three history journeys to strengthen your timeline knowledge." };
  if (!progress.connectActivities.length) return { page: "connect", title: "Join UnionConnect", text: "Complete one civic challenge or event to start your participation record." };
  const nextLesson = lessonCatalog.find((lesson) => !progress.completedLessons.includes(lesson.id)) || lessonCatalog[0];
  return { page: nextLesson.page, title: `Continue lesson: ${nextLesson.title}`, text: "Complete another learning module to keep your streak moving." };
}

function refreshProgressViews() {
  renderDashboard();
  renderPassport();
  renderSafari();
  renderConnect();
  bindProgressControls(platformView);
  bindNavigationControls(platformView);
}

function bindProgressControls(root = document) {
  root.querySelectorAll("[data-complete-history]").forEach((item) => {
    if (item.dataset.progressBound === "true") return;
    item.dataset.progressBound = "true";
    item.addEventListener("click", (event) => {
      if (event.target.closest("a[href]")) {
        window.setTimeout(() => completeHistoryItem(item.dataset.completeHistory), 120);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (!item.classList.contains("completed")) completeHistoryItem(item.dataset.completeHistory);
      openHistoryReference(item);
    });
    item.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (!item.classList.contains("completed")) completeHistoryItem(item.dataset.completeHistory);
      openHistoryReference(item);
    });
  });
  root.querySelectorAll("[data-open-history-items]").forEach((button) => {
    if (button.dataset.progressBound === "true") return;
    button.dataset.progressBound = "true";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (button.disabled) return;
      completeLesson(button.dataset.openHistoryItems);
    });
  });
  root.querySelectorAll("[data-complete-connect]").forEach((button) => {
    if (button.dataset.progressBound === "true") return;
    button.dataset.progressBound = "true";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      completeConnectActivity(button.dataset.completeConnect);
    });
  });
}

function showProgressNotification(message) {
  let toast = document.querySelector("#progressToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "progressToast";
    toast.className = "progress-toast";
    toast.setAttribute("role", "status");
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.classList.remove("show");
  window.requestAnimationFrame(() => toast.classList.add("show"));
  window.clearTimeout(showProgressNotification.timer);
  showProgressNotification.timer = window.setTimeout(() => toast.classList.remove("show"), 4200);
}

function apiHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  return headers;
}

async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(path, { ...options, headers: { ...apiHeaders(), ...(options.headers || {}) } });
  } catch (error) {
    error.offline = true;
    throw error;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.detail || "Request failed.");
    error.status = response.status;
    throw error;
  }
  return payload;
}

function canUseOfflineFallback(error) {
  return Boolean(error.offline || /mysql|database|not configured|not running/i.test(error.message || ""));
}

function offlineUsers() {
  return JSON.parse(localStorage.getItem("muunganohub_offline_users") || "[]");
}

function saveOfflineUsers(users) {
  localStorage.setItem("muunganohub_offline_users", JSON.stringify(users));
}

function offlineToken(email) {
  return `offline:${email}:${Date.now()}`;
}

function offlineRegister(name, email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = offlineUsers();
  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error(state.language === "sw" ? "Barua pepe hii tayari imesajiliwa kwenye offline mode." : "This email is already registered in offline mode.");
  }
  const user = {
    id: Date.now(),
    name: name.trim(),
    email: normalizedEmail,
    password,
    profile_status: state.language === "sw" ? "Ninajifunza kuhusu Muungano." : "Learning about the Union.",
    profile_photo_url: "",
    profile_photo_thumb_url: "",
  };
  users.push(user);
  saveOfflineUsers(users);
  return { token: offlineToken(normalizedEmail), user: publicOfflineUser(user) };
}

function offlineLogin(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = offlineUsers().find((item) => item.email === normalizedEmail && item.password === password);
  if (!user) {
    throw new Error(state.language === "sw" ? "Akaunti haipo kwenye offline mode au nenosiri si sahihi." : "Offline account was not found or the password is incorrect.");
  }
  return { token: offlineToken(normalizedEmail), user: publicOfflineUser(user) };
}

function publicOfflineUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profile_status: user.profile_status || "",
    profile_photo_url: user.profile_photo_url || "",
    profile_photo_thumb_url: user.profile_photo_thumb_url || "",
  };
}

function updateOfflineProfile({ name, profile_status, profile_photo_url, current_password, new_password }) {
  const users = offlineUsers();
  let index = users.findIndex((user) => user.email === state.user?.email);
  if (index < 0 && state.user?.email) {
    users.push({
      id: state.user.id || Date.now(),
      name: state.user.name || name.trim(),
      email: state.user.email,
      password: current_password || "",
      profile_status: state.user.profile_status || "",
      profile_photo_url: state.user.profile_photo_url || "",
      profile_photo_thumb_url: state.user.profile_photo_thumb_url || "",
    });
    index = users.length - 1;
  }
  if (index < 0) throw new Error(state.language === "sw" ? "Offline profile haijapatikana." : "Offline profile was not found.");
  if (new_password) {
    if (users[index].password !== current_password) {
      throw new Error(state.language === "sw" ? "Nenosiri la sasa si sahihi." : "Current password is not correct.");
    }
    users[index].password = new_password;
  }
  users[index].name = name.trim();
  users[index].profile_status = profile_status.trim();
  users[index].profile_photo_url = profile_photo_url || "";
  saveOfflineUsers(users);
  return publicOfflineUser(users[index]);
}

function saveProfilePhotoDraft(photoUrl, thumbUrl = "") {
  if (!state.user) return;
  state.user = { ...state.user, profile_photo_url: photoUrl || "", profile_photo_thumb_url: thumbUrl || photoUrl || "" };
  localStorage.setItem("muunganohub_user", JSON.stringify(state.user));
  if (!(OFFLINE_MODE || state.token.startsWith("offline:"))) return;
  const users = offlineUsers();
  const index = users.findIndex((user) => user.email === state.user?.email);
  if (index >= 0) {
    users[index].profile_photo_url = photoUrl || "";
    users[index].profile_photo_thumb_url = thumbUrl || photoUrl || "";
    saveOfflineUsers(users);
  }
}

function detectOfflineLanguage(text) {
  const swMarkers = [
    "nini", "lini", "nani", "kwa ", "vipi", " ni ", " ni?", "ni nini", "ya ", " ya ",
    "muungano", "tanganyika", "zanzibar", "sababu", "faida", "manufaa", "umuhimu", "muhimu", "hati", "mambo",
    "changamoto", "vijana", "uhuru", "mapinduzi", "historia", "tarehe", "waasisi",
    "katiba", "serikali", "elimu", "biashara", "ajira", "waliungana", "ulianzishwa",
    "uliundwa", "ulianza", "walitia", "walianzisha", "kwanini",
  ];
  return swMarkers.some((m) => text.includes(m)) ? "sw" : "en";
}

function offlineChatAnswer(question) {
  const normalized = question.toLowerCase().trim();
  const questionLang = detectOfflineLanguage(normalized);
  const otherLang = questionLang === "sw" ? "en" : "sw";
  const found =
    offlineAnswers[questionLang].find((item) => item.keys.some((key) => normalized.includes(key))) ||
    offlineAnswers[otherLang].find((item) => item.keys.some((key) => normalized.includes(key)));
  if (found) return found.answer;
  return questionLang === "sw"
    ? "Swali hili halijapatikana vizuri kwenye maarifa ya offline ya Muungano. Ukiwa online, MuunganoHub itatumia RAG knowledge base kutafuta vyanzo zaidi.\n\nVyanzo:\n[1] Offline MuunganoHub knowledge base"
    : "This question was not matched clearly in the offline Union knowledge. When online, MuunganoHub will use the RAG knowledge base to search more sources.\n\nSources:\n[1] Offline MuunganoHub knowledge base";
}

function saveAuth(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("muunganohub_token", token);
  localStorage.setItem("muunganohub_user", JSON.stringify(user));
}

function clearAuth() {
  state.token = "";
  state.user = null;
  state.sessionId = "";
  localStorage.removeItem("muunganohub_token");
  localStorage.removeItem("muunganohub_user");
  localStorage.removeItem("muunganohub_session");
}

function showAuth() {
  authView.classList.remove("hidden");
  platformView.classList.add("hidden");
  switchAuthMode("login");
}

function showPublicLanding() {
  authView.classList.add("hidden");
  platformView.classList.remove("hidden");
  userEmail.textContent = "";
  if (topAuthButton) {
    topAuthButton.classList.remove("hidden");
    topAuthButton.textContent = "Login / Sign Up";
  }
  if (mobileLogoutButton) mobileLogoutButton.classList.add("hidden");
  renderAllPages();
  bindMainMenuControl();
  bindNavigationControls(platformView);
  setPage("home", { replaceUrl: true, scroll: false });
}

function showPlatform() {
  authView.classList.add("hidden");
  platformView.classList.remove("hidden");
  userEmail.textContent = state.user?.email || "";
  if (topAuthButton) topAuthButton.classList.add("hidden");
  if (mobileLogoutButton) mobileLogoutButton.classList.remove("hidden");
  renderAllPages();
  bindMainMenuControl();
  bindNavigationControls(platformView);
  setPage(initialPageFromUrl() || state.currentPage, { replaceUrl: true, scroll: false });
}

function switchAuthMode(mode) {
  const login = mode === "login";
  const reset = mode === "reset";
  loginTab.classList.toggle("active", login);
  registerTab.classList.toggle("active", mode === "register");
  loginForm.classList.toggle("hidden", !login);
  registerForm.classList.toggle("hidden", mode !== "register");
  passwordResetForm.classList.toggle("hidden", !reset);
  if (reset && loginEmail.value && !resetEmail.value) resetEmail.value = loginEmail.value;
  setStatus(authStatus, "");
}

function setPage(page, options = {}) {
  page = normalizedPage(page);
  state.currentPage = page;
  platformView.dataset.page = page;
  pageTitle.textContent = pageLabel(page);
  document.querySelectorAll(".page").forEach((section) => section.classList.remove("active"));
  document.querySelector(`#page-${page}`).classList.add("active");
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
  });
  document.querySelectorAll(".sample-nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
  });
  if (options.updateUrl) syncPageUrl(page);
  if (options.replaceUrl) syncPageUrl(page, true);
  if (options.scroll) resetPageScroll();
  if (page === "chatbot") questionInput.focus();
}

function initialPageFromUrl() {
  const page = new URLSearchParams(window.location.search).get("page");
  return pageExists(page) ? page : "";
}

function renderAllPages() {
  renderHome();
  renderDashboard();
  renderAbout();
  renderHistory();
  renderTimeline();
  renderQuiz();
  renderPassport();
  renderSafari();
  renderConnect();
  renderLeaders();
  renderAudio();
  renderMedia();
  renderProfile();
  renderChatTools();
  renderCompetition();
  bindProgressControls(platformView);
  bindNavigationControls(platformView);
}

function renderHome() {
  const data = content[state.language].home;
  const homeFeatures = state.language === "sw"
    ? [
        ["AI Tutor", "Uliza maswali, pata majibu sahihi na yanayokubalika kitaaluma.", "chatbot"],
        ["Somo Interaktif", "Soma, jifunze na fanya mazoezi kupitia masomo ya kuvutia na rahisi.", "dashboard"],
        ["Majaribio (Quiz)", "Pima uelewa wako kwa maswali ya kufurahisha na ya elimu.", "quiz"],
        ["Historia & Timeline", "Gundua matukio muhimu ya Muungano kwa mpangilio wa wakati.", "timeline"],
        ["Multimedia", "Tazama video, sikiliza sauti na pata nyenzo mbalimbali za kujifunza.", "media"],
        ["Washiriki", "Jifunze, shiriki maarifa na ujenge jamii yenye uelewa mpana.", "connect"],
      ]
    : [
        ["AI Tutor", "Ask questions and receive accurate, academically grounded answers.", "chatbot"],
        ["Interactive Lessons", "Read, learn, and practice through simple engaging lessons.", "dashboard"],
        ["Quiz Practice", "Test your understanding with educational questions.", "quiz"],
        ["History & Timeline", "Discover key Union events in chronological order.", "timeline"],
        ["Multimedia", "Watch videos, listen to audio, and explore learning resources.", "media"],
        ["Community", "Learn, share knowledge, and build a wider informed community.", "connect"],
      ];
  const heroTitleParts = data.title.split(".").map((part) => part.trim()).filter(Boolean);
  document.querySelector("#page-home").innerHTML = `
    <section class="home-hero">
      <div class="home-hero-copy">
        <p class="hero-pill"><span class="flag-dot"></span>${state.language === "sw" ? "Elimu bora. Umoja imara. Maendeleo endelevu." : "Better learning. Strong unity. Shared progress."}</p>
        <h1>${heroTitleParts.map((part, index) => `<span class="${index === heroTitleParts.length - 1 ? "accent-word" : ""}">${part}.</span>`).join("")}</h1>
        <p>${data.text}</p>
        <div class="hero-actions">
          <button class="primary-button page-link" data-page="chatbot" type="button">${data.primary}</button>
          <button class="secondary-button page-link" data-page="media" type="button">${data.secondary}</button>
        </div>
      </div>
    </section>
    <section class="home-feature-row">
      ${homeFeatures.map(([title, text, page]) => `
        <article class="sample-feature-card page-card" data-page="${page}" role="button" tabindex="0">
          <span class="sample-card-icon">${pageIcon(page)}</span>
          <h3>${title}</h3>
          <p>${text}</p>
          <button class="text-button page-link" data-page="${page}" type="button" aria-label="${title}">${data.open} →</button>
        </article>
      `).join("")}
    </section>
  `;
}

function renderDashboard() {
  const progress = getUserProgress();
  const recommendation = recommendedAction(progress);
  const averageScore = averageQuizScore(progress);
  const nextLevel = nextLevelTarget(progress.points);
  const missionCards = dashboardMissionCards(progress, averageScore);
  const passportCompletion = Math.round(((progress.earnedBadges.length + progress.safariVisited.length + Math.min(progress.connectActivities.length, 6)) / (badgeCatalog.length + safariEvents.length + 6)) * 100);
  document.querySelector("#page-dashboard").innerHTML = `
    <section class="module-hero dashboard-hero">
      <div>
        <p class="eyebrow">${state.language === "sw" ? "Kituo cha leo" : "Today hub"}</p>
        <h1>${state.language === "sw" ? "Chagua hatua inayokupeleka mbele" : "Pick the move that grows your Passport"}</h1>
        <p>${state.language === "sw" ? "Dashboard inaonyesha hatua muhimu za leo. Badges, stamps na rekodi kamili zipo kwenye Passport." : "Dashboard shows what matters next. Your full badges, stamps, and identity record stay inside Passport."}</p>
        <button class="primary-button page-link" data-page="${recommendation.page}" type="button">${state.language === "sw" ? "Anza hatua inayopendekezwa" : "Start recommended action"}</button>
      </div>
      <article class="passport-level-card">
        <span>${progress.points} points</span>
        <strong>${progress.level}</strong>
        ${levelProgressBar(progress)}
      </article>
    </section>
    <section class="dashboard-focus-grid">
      <article class="dashboard-focus-card page-card" data-page="${recommendation.page}" role="button" tabindex="0">
        <p class="eyebrow">${state.language === "sw" ? "Hatua bora sasa" : "Best next move"}</p>
        <h3>${recommendation.title}</h3>
        <p>${recommendation.text}</p>
        <span>${state.language === "sw" ? "Fungua" : "Open"} ${pageIcon(recommendation.page)}</span>
      </article>
      <article class="dashboard-focus-card page-card" data-page="passport" role="button" tabindex="0">
        <p class="eyebrow">Passport</p>
        <h3>${state.language === "sw" ? "Utambulisho wako unaendelea kujengwa" : "Your learning identity is taking shape"}</h3>
        <p>${state.language === "sw" ? `${passportCompletion}% ya badges na stamps kuu zimefunguliwa.` : `${passportCompletion}% of core badges and stamps are unlocked.`}</p>
        ${progressBar(passportCompletion, 100, state.language === "sw" ? "Maendeleo ya Passport" : "Passport completion")}
      </article>
    </section>
    <section class="dashboard-metrics dashboard-metrics-compact">
      ${metricTile(state.language === "sw" ? "Masomo" : "Lessons", `${progress.completedLessons.length}/${lessonCatalog.length}`, state.language === "sw" ? "yamekamilika" : "completed", "history")}
      ${metricTile(state.language === "sw" ? "Quiz" : "Quiz", progress.completedQuizzes.length, `${averageScore}% ${state.language === "sw" ? "wastani" : "average"}`, "quiz")}
      ${metricTile("Safari", `${progress.safariVisited.length}/${safariEvents.length}`, state.language === "sw" ? "stamps" : "stamps", "safari")}
      ${metricTile("Connect", progress.connectActivities.length, state.language === "sw" ? "vitendo vya kiraia" : "civic actions", "connect")}
      ${metricTile(state.language === "sw" ? "Streak" : "Streak", `${progress.learningStreak} days`, state.language === "sw" ? "kujifunza kila siku" : "daily learning", "connect")}
      ${metricTile(state.language === "sw" ? "Level inayofuata" : "Next level", nextLevel.label, `${progress.points}/${nextLevel.next} points`, "passport")}
    </section>
    <section class="dashboard-section dashboard-mission-panel">
      <div class="passport-section-head">
        <p class="eyebrow">${state.language === "sw" ? "Njia ya maendeleo" : "Progress path"}</p>
        <h2>${state.language === "sw" ? "Kamilisha hatua hizi, kisha angalia Passport" : "Complete these moves, then check Passport"}</h2>
        <p>${state.language === "sw" ? "Hakuna marudio ya badges hapa; Dashboard ni sehemu ya kuchukua hatua." : "No badge repetition here; Dashboard is for action."}</p>
      </div>
      <div class="dashboard-mission-grid">
        ${missionCards.map((card) => dashboardMissionCard(card)).join("")}
      </div>
    </section>
  `;
}

function dashboardMissionCards(progress, averageScore) {
  return [
    {
      page: "history",
      icon: "history",
      title: state.language === "sw" ? "Maliza somo la historia" : "Finish the history lesson",
      text: state.language === "sw" ? `${progress.completedLessons.length}/${lessonCatalog.length} masomo yamekamilika.` : `${progress.completedLessons.length}/${lessonCatalog.length} lessons completed.`,
      value: progress.completedLessons.length,
      max: lessonCatalog.length,
    },
    {
      page: "quiz",
      icon: "quiz",
      title: state.language === "sw" ? "Pima uelewa wako" : "Test your understanding",
      text: state.language === "sw" ? `${progress.completedQuizzes.length} quiz, wastani ${averageScore}%.` : `${progress.completedQuizzes.length} quiz completions, ${averageScore}% average.`,
      value: Math.min(progress.completedQuizzes.length, 3),
      max: 3,
    },
    {
      page: "safari",
      icon: "safari",
      title: state.language === "sw" ? "Fungua Safari stamps" : "Unlock Safari stamps",
      text: `${progress.safariVisited.length}/${safariEvents.length} ${state.language === "sw" ? "zimechunguzwa." : "journeys explored."}`,
      value: progress.safariVisited.length,
      max: safariEvents.length,
    },
    {
      page: "connect",
      icon: "connect",
      title: state.language === "sw" ? "Shiriki kiraia" : "Join civic action",
      text: `${progress.connectActivities.length} ${state.language === "sw" ? "shughuli zimekamilika." : "activities completed."}`,
      value: Math.min(progress.connectActivities.length, 2),
      max: 2,
    },
  ];
}

function renderPassport() {
  const progress = getUserProgress();
  const averageScore = averageQuizScore(progress);
  const sw = state.language === "sw";
  document.querySelector("#page-passport").innerHTML = `
    <section class="module-hero passport-hero">
      <div>
        <p class="eyebrow">Muungano Passport</p>
        <h1>${sw ? "Kitambulisho chako cha safari ya elimu" : "Your Union learning identity"}</h1>
        <p>${sw ? "Fuatilia level yako, mafanikio, na ushiriki wako wa kiraia." : "Track your level, achievements, and civic participation."}</p>
      </div>
      <article class="passport-level-card">
        <span>${progress.points} ${sw ? "pointi" : "points"}</span>
        <strong>${progress.level}</strong>
        ${levelProgressBar(progress)}
      </article>
    </section>
    <section class="passport-stats">
      ${metricTile(sw ? "Maswali yaliyokamilika" : "Completed quizzes", progress.completedQuizzes.length, `${averageScore}% ${sw ? "wastani" : "average"}`, "quiz")}
      ${metricTile(sw ? "Alama za Safari" : "Safari stamps", `${progress.safariVisited.length}/${safariEvents.length}`, sw ? "zilizochunguzwa" : "explored", "safari")}
      ${metricTile(sw ? "Alama za Connect" : "Connect stamps", progress.connectActivities.length, sw ? "zilizokamilika" : "completed", "connect")}
      ${metricTile(sw ? "Masomo yaliyokamilika" : "Completed lessons", progress.completedLessons.length, sw ? "maendeleo ya masomo" : "lesson progress", "history")}
    </section>
    <div class="passport-section">
      <div class="passport-section-head">
        <p class="eyebrow">${sw ? "Tuzo" : "Badges"}</p>
        <h2>${sw ? "Mafanikio yako" : "Your achievements"}</h2>
      </div>
      <section class="passport-badge-grid">
        ${badgeCatalog.map((badge) => badgeCard(badge, progress)).join("")}
      </section>
    </div>
    <div class="passport-section">
      <div class="passport-section-head">
        <p class="eyebrow">Safari stamps</p>
        <h2>${sw ? "Safari ulizokamilisha" : "Explored journeys"}</h2>
        <p>${sw ? `${progress.safariVisited.length} kati ya ${safariEvents.length} zimefungwa` : `${progress.safariVisited.length} of ${safariEvents.length} unlocked`}</p>
      </div>
      <section class="stamp-grid">${safariEvents.map(([id, title, date]) => stampCard(title, date, progress.safariVisited.includes(id))).join("")}</section>
    </div>
    <div class="passport-section">
      <div class="passport-section-head">
        <p class="eyebrow">Connect stamps</p>
        <h2>${sw ? "Ushiriki wa kiraia" : "Civic participation"}</h2>
        <p>${sw ? `${progress.connectActivities.length} shughuli zilizokamilika` : `${progress.connectActivities.length} activities completed`}</p>
      </div>
      <section class="stamp-grid">${connectData.events.map(([id, title, date]) => stampCard(title, date, progress.connectActivities.includes(id))).join("")}</section>
    </div>
  `;
}

function renderSafari() {
  const progress = getUserProgress();
  document.querySelector("#page-safari").innerHTML = `
    <section class="module-hero safari-hero">
      <div>
        <p class="eyebrow">Safari ya Muungano</p>
        <h1>${state.language === "sw" ? "Tembelea matukio muhimu ya Muungano" : "Explore key Union events and places"}</h1>
        <p>${state.language === "sw" ? "Kadi hizi zinasaidia kujifunza historia kwa vipande vidogo vinavyoweza kufuatwa na quiz." : "These cards make history easier to explore in small, quiz-ready moments."}</p>
      </div>
      <div class="safari-hero-badge" aria-hidden="true">
        <span>${progress.safariVisited.length}/${safariEvents.length}</span>
        <strong>Explored</strong>
      </div>
    </section>
    <section class="safari-grid">
      ${safariEvents.map(([id, title, date, text, image]) => {
        const explored = progress.safariVisited.includes(id);
        return `
        <article class="safari-card ${explored ? "completed" : ""}">
          <div class="safari-image"><img src="${attrUrl(image)}" alt="" loading="lazy" /></div>
          <div class="safari-body">
            <span>${date}</span>
            <h3>${title}</h3>
            <p>${text}</p>
            <strong class="safari-stamp-status">${explored ? (state.language === "sw" ? "Stamped in Passport" : "Stamped in Passport") : (state.language === "sw" ? "Passport stamp locked" : "Passport stamp locked")}</strong>
            <div class="safari-actions">
              <button class="secondary-button compact" data-safari-learn="${id}" type="button">${state.language === "sw" ? "Jifunze Zaidi" : "Learn More"}</button>
              <button class="primary-button compact" data-safari-quiz="${id}" type="button">${state.language === "sw" ? "Fanya Quiz" : "Take Quiz"}</button>
            </div>
            <button class="text-button" data-teach="${state.language === "sw" ? title : title}" type="button" style="margin-top:6px;font-size:0.82rem">${state.language === "sw" ? "Uliza AI →" : "Ask AI →"}</button>
          </div>
        </article>
      `}).join("")}
    </section>
  `;
}

function renderConnect() {
  const progress = getUserProgress();
  const sw = state.language === "sw";
  const connectActivitiesCount = progress.connectActivities?.length || 0;
  const discussionsJoinedCount = progress.discussionsJoined?.length || 0;
  const safariVisitedCount = progress.safariVisited?.length || 0;
  const completedQuizzesCount = progress.completedQuizzes?.length || 0;
  const totalPoints = progress.points || 0;
  const streak = progress.learningStreak || 0;
  const totalCivicActivities = connectActivitiesCount + discussionsJoinedCount + safariVisitedCount + completedQuizzesCount;

  const impactScore = Math.min(100, Math.round(
    (connectActivitiesCount * 25) +
    (discussionsJoinedCount * 15) +
    (completedQuizzesCount * 10) +
    (safariVisitedCount * 10)
  ));

  let missionDone = 0;
  if (completedQuizzesCount >= 2) missionDone++;
  if (safariVisitedCount >= 1) missionDone++;
  if (connectActivitiesCount >= 1) missionDone++;

  const missionNote = missionDone < 3
    ? (sw ? `Kamilisha ${3 - missionDone} zaidi kupata alama zaidi.` : `Complete ${3 - missionDone} more to earn bonus points.`)
    : (sw ? "Dhamira imekamilika! Tuzo ya ziada imefunguliwa." : "Mission complete! Bonus reward unlocked.");

  const certProgress = Math.min(100, Math.round(totalCivicActivities / 5 * 100));

  const streakNote = streak === 0
    ? (sw ? "Anza shughuli yako ya kwanza ya kiraia leo." : "Start your first civic activity today.")
    : streak === 1
      ? (sw ? "Mwanzo mzuri! Endelea kesho." : "Good start! Continue tomorrow.")
      : (sw ? "Jua jema! Endelea kila siku." : "Great streak! Keep it daily.");

  const userName = ((state.user && (state.user.name || state.user.email)) || (sw ? "Wewe" : "You")).split(" ")[0];

  document.querySelector("#page-connect").innerHTML = `
    <section class="module-hero connect-hero">
      <div>
        <p class="eyebrow">UnionConnect</p>
        <h1>${sw ? "Ushiriki wa vijana kwa elimu ya uraia" : "Youth civic engagement hub"}</h1>
        <p>${sw ? "Nafasi rahisi ya kuona matukio, mada za kujadili, changamoto ya wiki na klabu za Muungano." : "A simple place for events, discussion topics, weekly challenges, and Muungano clubs."}</p>
      </div>
      <button class="primary-button compact" data-question="${sw ? "Nina wazo kuhusu elimu ya Muungano, nisaidie kuiboresha" : "I have an idea about Union education, help me refine it"}" type="button">${sw ? "Wasilisha Wazo" : "Submit Your Idea"}</button>
    </section>
    <section class="connect-layout">
      <div class="connect-left">
        <article class="status-panel">
          <p class="eyebrow">${sw ? "Matukio yajayo" : "Upcoming events"}</p>
          <div class="connect-list">${connectData.events.map(([id, title, date, text]) => {
            const completed = progress.connectActivities.includes(id);
            return `<div class="${completed ? "completed" : ""}"><span>${date}</span><strong>${title}</strong><p>${text}</p><button class="secondary-button compact progress-action" data-complete-connect="${id}" type="button" ${completed ? "disabled" : ""}>${completed ? (sw ? "Imekamilika" : "Completed") : (sw ? "Jiunge" : "Join Challenge")}</button></div>`;
          }).join("")}</div>
        </article>
        <article class="status-panel">
          <p class="eyebrow">${sw ? "Mada za vijana" : "Youth topics"}</p>
          <div class="future-list">${connectData.topics.map((item) => `<span>${item}</span>`).join("")}</div>
        </article>
        <article class="status-panel">
          <p class="eyebrow">Muungano clubs</p>
          <div class="future-list">${connectData.clubs.map((item) => `<span>${item}</span>`).join("")}</div>
        </article>
      </div>
      <div class="connect-right">
        <article class="status-panel challenge-card">
          <p class="eyebrow">${sw ? "Changamoto ya wiki" : "Weekly civic challenge"}</p>
          <div class="challenge-title-row">
            <h3>${sw ? "Muulize mwanafunzi mmoja maana ya Muungano" : "Ask one student what the Union means"}</h3>
            <span class="challenge-pts-badge">+80 pts</span>
          </div>
          <p class="challenge-intro">${sw ? "Andika majibu matatu uliyojifunza kisha uyalinganishe na maelezo ya AI Tutor." : "Write down three answers and compare them with the AI Tutor explanation."}</p>
          <div class="challenge-steps">
            <p class="challenge-steps-label">${sw ? "Jinsi ya kukamilisha" : "How to complete"}</p>
            <div class="challenge-step"><span class="step-num">1</span><p>${sw ? "Pata mwanafunzi, rafiki au mwanafamilia na umuulize: \"Muungano unamaanisha nini kwako?\"" : "Find a classmate, friend, or family member and ask: \"What does the Union mean to you?\""}</p></div>
            <div class="challenge-step"><span class="step-num">2</span><p>${sw ? "Andika jibu lao kwa maneno yako mwenyewe." : "Write down their answer in your own words."}</p></div>
            <div class="challenge-step"><span class="step-num">3</span><p>${sw ? "Uliza AI Tutor swali hilo hilo na linganisha majibu." : "Ask the AI Tutor the same question and compare the answers."}</p></div>
            <div class="challenge-step"><span class="step-num">4</span><p>${sw ? "Bonyeza 'Kamilisha' kupata alama na muhuri wa Passport." : "Tap Mark as Completed below to earn your points and Passport stamp."}</p></div>
          </div>
          <div class="challenge-why">
            <strong>${sw ? "Kwa nini inafaa" : "Why it matters"}</strong>
            <p>${sw ? "Kuelewa jinsi wengine wanavyofikiri kuhusu Muungano kunakusaidia kuona mitazamo tofauti — ujuzi muhimu wa uraia." : "Understanding how others think about the Union trains you to see multiple perspectives — a core civic skill."}</p>
          </div>
          <div class="challenge-fact">
            <strong>${sw ? "Ukweli wa haraka" : "Quick fact"}</strong>
            <p>${sw ? "Muungano wa Tanganyika na Zanzibar ulianzishwa rasmi tarehe 26 Aprili 1964 — zaidi ya miaka 60 iliyopita." : "The Union of Tanganyika and Zanzibar was officially formed on 26 April 1964 — over 60 years ago."}</p>
          </div>
          <div class="challenge-bonus-tip">
            <span class="tip-icon">💡</span>
            <p>${sw ? "Kidokezo: Tumia AI Tutor kuuliza \"Muungano ni nini?\" na ulinganishe jibu na ulichosikia." : "Tip: Use the AI Tutor to ask \"What is the Union?\" then compare with what you heard."}</p>
            <button class="text-button" data-page="chatbot" type="button">${sw ? "Fungua AI Tutor →" : "Open AI Tutor →"}</button>
          </div>
          <button class="primary-button challenge-complete-btn progress-action" data-complete-connect="weekly-civic-challenge" type="button" ${progress.connectActivities.includes("weekly-civic-challenge") ? "disabled" : ""}>${progress.connectActivities.includes("weekly-civic-challenge") ? (sw ? "✓ Imekamilika" : "✓ Completed") : (sw ? "Kamilisha Changamoto" : "Mark as Completed")}</button>
        </article>
        <article class="status-panel connect-widget">
          <p class="eyebrow">${sw ? "Alama ya athari ya jamii" : "Community impact score"}</p>
          <div class="connect-impact-row">
            <span class="connect-impact-value">${impactScore}</span>
            <span class="connect-impact-max">/ 100</span>
          </div>
          <div class="connect-impact-bar"><div style="width:${impactScore}%"></div></div>
          <p class="connect-widget-note">${connectActivitiesCount} ${sw ? "shughuli · " : "activities · "}${totalPoints} ${sw ? "pointi" : "points"}</p>
        </article>
        <article class="status-panel connect-widget">
          <p class="eyebrow">${sw ? "Mfululizo wa kujifunza" : "Civic learning streak"}</p>
          <div class="connect-impact-row">
            <span class="connect-impact-value">${streak}</span>
            <span class="connect-impact-max">&nbsp;${sw ? "siku" : "days"}</span>
          </div>
          <p class="connect-widget-note">${streakNote}</p>
        </article>
        <article class="status-panel connect-widget">
          <p class="eyebrow">${sw ? "Dhamira za wiki" : "Weekly mission progress"}</p>
          <div class="connect-mission-row">
            ${[1, 2, 3].map((n) => `<div class="connect-mission-dot ${missionDone >= n ? "done" : ""}"><span>${n}</span></div>`).join("")}
            <span class="connect-mission-label">${missionDone}/3 ${sw ? "zimekamilika" : "done"}</span>
          </div>
          <p class="connect-widget-note">${missionNote}</p>
        </article>
        <article class="status-panel connect-widget">
          <p class="eyebrow">${sw ? "Cheo chako cha kiraia" : "Your civic rank"}</p>
          <div class="contributor-list">
            <div class="contributor-item you">
              <span class="contributor-rank">⭐</span>
              <strong class="contributor-name">${userName}</strong>
              <span class="contributor-pts">${totalPoints} pts</span>
            </div>
            <div class="contributor-item">
              <span class="contributor-rank" style="color:var(--muted)">🏅</span>
              <strong class="contributor-name">${sw ? "Badge" : "Badges"}</strong>
              <span class="contributor-pts">${progress.earnedBadges.length} / ${badgeCatalog.length}</span>
            </div>
            <div class="contributor-item">
              <span class="contributor-rank" style="color:var(--muted)">📋</span>
              <strong class="contributor-name">${sw ? "Shughuli zote" : "Total activities"}</strong>
              <span class="contributor-pts">${totalCivicActivities}</span>
            </div>
          </div>
        </article>
        <article class="status-panel connect-widget">
          <p class="eyebrow">${sw ? "Cheti cha ushiriki" : "Participation certificate"}</p>
          <p class="connect-widget-note" style="margin-bottom:10px">${sw ? "Kamilisha shughuli 5 kupata cheti chako cha uraia." : "Complete 5 civic activities to unlock your certificate."}</p>
          <div class="connect-impact-bar" style="margin-bottom:8px"><div style="width:${certProgress}%"></div></div>
          <p class="connect-widget-note" style="margin-bottom:10px">${totalCivicActivities}/5 ${sw ? "zimekamilika" : "completed"}</p>
          <button class="primary-button compact" id="downloadCertificateButton" type="button" ${totalCivicActivities < 5 ? "disabled" : ""}>${totalCivicActivities >= 5 ? (sw ? "Pakua Cheti" : "Download Certificate") : (sw ? "Bado Umefungwa" : "Not Yet Unlocked")}</button>
        </article>
      </div>
    </section>
  `;
}

function metricTile(label, value, text, page) {
  return `<article class="metric-tile page-card" data-page="${page}" role="button" tabindex="0"><span class="module-icon">${pageIcon(page)}</span><strong>${value}</strong><p>${label}</p><small>${text}</small></article>`;
}

function badgeCard(badge, progress) {
  const earned = progress.earnedBadges.includes(badge.id);
  return `<article class="passport-badge-card ${earned ? "earned" : "locked"}"><span class="module-icon">${pageIcon(badge.icon)}</span><h3>${badge.title}</h3><p>${badge.text}</p><strong>${earned ? "Unlocked" : "Locked"}</strong></article>`;
}

function miniBadge(badge, progress) {
  const earned = progress.earnedBadges.includes(badge.id);
  return `<div class="${earned ? "earned" : "locked"}"><span>${badge.title}</span><strong>${earned ? "Unlocked" : "Locked"}</strong><small>${badge.text}</small></div>`;
}

function recommendCard({ page, icon, title, text, done }) {
  return `<button class="recommend-card ${done ? "done" : ""} page-card" data-page="${page}" type="button">
    <span class="recommend-icon">${pageIcon(icon)}</span>
    <span class="recommend-info"><strong>${title}</strong><small>${text}</small></span>
    <span class="recommend-arrow">${done ? "✓" : "→"}</span>
  </button>`;
}

function dashboardMissionCard({ page, icon, title, text, value, max }) {
  const complete = Number(value) >= Number(max);
  return `<article class="dashboard-mission-card ${complete ? "complete" : ""} page-card" data-page="${page}" role="button" tabindex="0">
    <span class="dashboard-mission-icon">${pageIcon(icon)}</span>
    <div>
      <h3>${title}</h3>
      <p>${text}</p>
      ${progressBar(value, max, complete ? (state.language === "sw" ? "Imekamilika" : "Complete") : `${value}/${max}`)}
    </div>
    <strong>${complete ? "Done" : "->"}</strong>
  </article>`;
}

function badgeChip(badge, progress) {
  const earned = progress.earnedBadges.includes(badge.id);
  return `<div class="badge-chip ${earned ? "earned" : "locked"}">
    <span class="badge-chip-icon">${pageIcon(badge.icon)}</span>
    <span class="badge-chip-info"><strong>${badge.title}</strong><small>${badge.text}</small></span>
    <span class="badge-chip-status">${earned ? "Unlocked" : "Locked"}</span>
  </div>`;
}

function progressBar(value, max, label) {
  const percent = Math.max(0, Math.min(100, Math.round((Number(value) / Number(max || 1)) * 100)));
  return `<div class="progress-wrap" aria-label="${label}"><span><i style="width: ${percent}%"></i></span><small>${label}</small></div>`;
}

function levelProgressBar(progress) {
  const target = nextLevelTarget(progress.points);
  if (target.next === target.current) return progressBar(1, 1, `${progress.points} points`);
  return progressBar(progress.points - target.current, target.next - target.current, `${progress.points}/${target.next} points to ${target.label}`);
}

function stampCard(title, date, completed) {
  return `<article class="stamp-card ${completed ? "earned" : "locked"}"><span>${date}</span><h3>${title}</h3><strong>${completed ? "Stamped" : "Locked"}</strong></article>`;
}

function renderAbout() {
  const data = content[state.language].about;
  document.querySelector("#page-about").innerHTML = `
    <section class="about-hero">
      <div class="about-copy">
        <p class="eyebrow">${data.eyebrow}</p>
        <h1>${data.title}</h1>
        <p>${data.text}</p>
        <div class="about-actions">
          <button class="primary-button page-link" data-page="chatbot" type="button">${state.language === "sw" ? "Uliza AI" : "Ask AI"}</button>
          <button class="secondary-button page-link" data-page="quiz" type="button">${state.language === "sw" ? "Cheza Challenge" : "Start Challenge"}</button>
        </div>
      </div>
      <div class="about-photo-wall" aria-hidden="true">
        <img src="${attrUrl("/static/assets/nyerere-founder.jpg")}" alt="" />
        <img src="${attrUrl("/static/assets/abeid-karume-founder.webp")}" alt="" />
        <img src="${attrUrl("/static/assets/samia-suluhu.jpg")}" alt="" />
      </div>
    </section>
    <div class="pitch-grid about-card-grid">
      ${data.cards.map(([title, text]) => `<article class="pitch-card"><h3>${title}</h3><p>${text}</p></article>`).join("")}
    </div>
  `;
}

function renderChatTools() {
  document.querySelector("#chatTools").innerHTML = `
    <div style="display:flex;justify-content:flex-end;padding-bottom:12px">
      <button class="secondary-button compact" id="newChatButton" type="button">${tr("newChatButton")}</button>
    </div>
  `;
}

function featureCard(title, text, page, openLabel) {
  return `<article class="feature-card page-card" data-page="${page}" role="button" tabindex="0"><h3>${title}</h3><p>${text}</p><button class="text-button page-link" data-page="${page}" type="button">${openLabel}</button></article>`;
}

function statusLabel(value) {
  if (value === "In Progress" || value === "Planned" || value === "Ready") return value;
  return "Done";
}

function renderHistory() {
  const data = content[state.language].history;
  const progress = getUserProgress();
  const lessonDone = progress.completedLessons.includes("history-foundations");
  const historyItemIds = data.timeline.map((_, index) => `history-${index}`);
  const openedCount = historyItemIds.filter((id) => progress.historyOpened.includes(id)).length;
  const completedCount = lessonDone ? data.timeline.length : openedCount;
  const progressLabel = state.language === "sw"
    ? `${completedCount}/${data.timeline.length} vipengele vimekamilika`
    : `${completedCount}/${data.timeline.length} items completed`;
  document.querySelector("#page-history").innerHTML = `
    <section class="section-header history-section-header"><p class="eyebrow">${data.eyebrow}</p><h1>${data.title}</h1><p>${data.text}</p></section>
    <section class="history-lesson-guide" aria-label="${state.language === "sw" ? "Mwongozo wa somo" : "Lesson guide"}">
      <article class="history-lesson-overview">
        <p class="eyebrow">${state.language === "sw" ? "Lengo la somo" : "Lesson aim"}</p>
        <p>${data.lesson.aim}</p>
      </article>
      <div class="history-lesson-points">
        ${data.lesson.points.map(([title, text]) => `<article><h3>${title}</h3><p>${text}</p></article>`).join("")}
      </div>
      <article class="history-learning-check">
        <p>${data.lesson.check}</p>
        <button class="text-button" data-teach="${state.language === "sw" ? "historia ya Muungano wa Tanganyika na Zanzibar" : "the Union of Tanganyika and Zanzibar"}" type="button" style="margin-top:10px">${state.language === "sw" ? "Uliza AI Tutor →" : "Ask AI Tutor →"}</button>
      </article>
    </section>
    <section class="lesson-complete-panel status-panel history-progress-panel">
      <div>
        <p class="eyebrow">${state.language === "sw" ? "Lesson progress" : "Lesson progress"}</p>
        <h3>${state.language === "sw" ? "Historia ya Muungano" : "Union history lesson"}</h3>
        <p>${state.language === "sw" ? "Weka somo hili kuwa limekamilika ili kuongeza points na Passport badge." : "Mark this lesson complete to add points and update your Passport badges."}</p>
        <div class="history-progress-meter" aria-label="${escapeAttribute(progressLabel)}">
          <span><i style="width: ${(completedCount / data.timeline.length) * 100}%"></i></span>
          <small>${progressLabel}</small>
        </div>
      </div>
      <span class="primary-button compact progress-action lesson-status-badge${lessonDone ? " done" : ""}" aria-live="polite">${lessonDone ? (state.language === "sw" ? "✓ Somo limekamilika" : "✓ Lesson completed") : (state.language === "sw" ? "Fungua vipengele vyote kukamilisha" : "Open all items to complete")}</span>
    </section>
    <div class="timeline history-timeline">${data.timeline.map(([year, title, text, url], index) => {
      const itemId = `history-${index}`;
      const itemDone = lessonDone || progress.historyOpened.includes(itemId);
      const status = itemDone
        ? (state.language === "sw" ? "Imekamilika" : "Completed")
        : (state.language === "sw" ? "Fungua" : "Open");
      const safeUrl = url ? attrUrl(url) : "";
      const statusMarkup = url
        ? `<a class="history-open-link" href="${safeUrl}" target="_blank" rel="noreferrer">${status}</a>`
        : `<strong>${status}</strong>`;
      const body = `<span class="history-year">${year}</span><div><div class="history-item-top"><h3>${title}</h3>${statusMarkup}</div><p>${text}</p></div>`;
      return url
        ? `<article class="timeline-item history-link ${itemDone ? "completed" : ""}" data-complete-history="${itemId}" data-history-url="${safeUrl}" role="button" tabindex="0" aria-label="${escapeAttribute(title)}">${body}</article>`
        : `<article class="timeline-item history-link ${itemDone ? "completed" : ""}" data-complete-history="${itemId}" role="button" tabindex="0" aria-label="${escapeAttribute(title)}">${body}</article>`;
    }).join("")}</div>
  `;
}

function renderTimeline() {
  const title = state.language === "sw" ? "Timeline ya Muungano" : "Union Timeline";
  const text = state.language === "sw"
    ? "Chagua tukio kuona maelezo yake, au fungua rejea rasmi inayothibitisha taarifa hiyo."
    : "Select an event to see its detail, or open the official reference that supports the information.";
  const firstEvent = timelineEvents[state.language][0];
  document.querySelector("#page-timeline").innerHTML = `
    <section class="section-header timeline-heading"><p class="eyebrow">${state.language === "sw" ? "Matukio muhimu" : "Key events"}</p><h1>${title}</h1><p>${text}</p></section>
    <section class="timeline-workspace">
      <div class="interactive-timeline" aria-label="${title}">
        ${timelineEvents[state.language].map(([year, heading, detail, note, url], index) => `
          <article class="timeline-node ${index === 0 ? "active" : ""}" data-timeline="${index}">
            <span class="timeline-dot"></span>
            <button class="timeline-select" data-timeline="${index}" type="button" aria-label="${state.language === "sw" ? "Fungua tukio la" : "Open timeline event"} ${year}">
              <strong>${year}</strong>
              <span>${heading}</span>
              <small>${note}</small>
            </button>
            ${timelineSourceButton(url)}
          </article>
        `).join("")}
      </div>
      <article class="timeline-detail" id="timelineDetail">
        ${timelineDetailMarkup(firstEvent)}
      </article>
    </section>
  `;
}

function timelineLink(url) {
  if (!url) return "";
  const name = sourceName(url);
  const label = state.language === "sw" ? `Soma zaidi: ${name}` : `Read more: ${name}`;
  return `<a class="primary-link timeline-source-link" href="${attrUrl(url)}" target="_blank" rel="noreferrer">${label}</a>`;
}

function timelineSourceButton(url) {
  if (!url) return "";
  const label = state.language === "sw" ? "Soma zaidi" : "Read more";
  return `<a class="timeline-card-source" href="${attrUrl(url)}" target="_blank" rel="noreferrer" aria-label="${label}">${label}</a>`;
}

function offlineReferenceLabel(url) {
  return "";
}

function sourceName(url) {
  if (!url) return "";
  if (url.includes("historia-ya-muungano-sw.pdf")) return state.language === "sw" ? "Historia ya Muungano" : "Union History PDF";
  if (url.includes("katiba-jamhuri-ya-muungano-1977.pdf")) return state.language === "sw" ? "Katiba ya JMT 1977" : "1977 Union Constitution PDF";
  if (url.includes("katiba-zanzibar-1984.pdf")) return state.language === "sw" ? "Katiba ya Zanzibar 1984" : "1984 Zanzibar Constitution PDF";
  if (url.includes("muungano-final-2024.pdf")) return state.language === "sw" ? "Hotuba ya Miaka 60 ya Muungano" : "60 Years of the Union PDF";
  if (url.includes("wikipedia.org")) return "Wikipedia snapshot";
  if (url.includes("katiba-jamhuri-ya-muungano-1977.pdf")) return state.language === "sw" ? "Katiba ya JMT 1977" : "1977 Constitution";
  if (url.includes("katiba-zanzibar-1984.pdf")) return state.language === "sw" ? "Katiba ya Zanzibar 1984" : "1984 Zanzibar Constitution";
  if (url.includes("tzaffairs.org")) return "Tanzania Affairs";
  if (url.includes("https://www.nbs.go.tz/nbs/takwimu/Census2022/matokeomwanzooktoba2022.pdf")) return state.language === "sw" ? "Sensa ya Watu na Makazi 2022" : "2022 Census";
  if (url.includes("tanzania.go.tz")) return state.language === "sw" ? "Tovuti Kuu ya Serikali" : "Tanzania Government Portal";
  if (url.includes("parliament.go.tz")) return state.language === "sw" ? "Bunge la Tanzania" : "Parliament of Tanzania";
  if (url.includes("zanzibarassembly.go.tz")) return state.language === "sw" ? "Baraza la Wawakilishi Zanzibar" : "Zanzibar House of Representatives";
  if (url.includes("vpo.go.tz")) return state.language === "sw" ? "Ofisi ya Makamu wa Rais" : "Vice President's Office";
  if (url.includes("ikulu.go.tz")) return state.language === "sw" ? "Ikulu Tanzania" : "State House Tanzania";
  return state.language === "sw" ? "Rejea ya mtandaoni" : "Online reference";
}

function timelineDetailMarkup(eventData) {
  const [year, heading, detail, note, url] = eventData;
  return `
    <div class="timeline-detail-top">
      <strong>${year}</strong>
      <span>${note}</span>
    </div>
    <h3>${heading}</h3>
    <p>${detail}</p>
    ${timelineLink(url)}
  `;
}

function renderQuiz() {
  const questions = quizQuestions[state.language][state.quizLevel];
  const finished = state.quizIndex >= questions.length;
  const badge = getQuizBadge();

  if (finished) {
    const scorePercent = questions.length ? Math.round((state.quizScore / questions.length) * 100) : 0;
    document.querySelector("#page-quiz").innerHTML = `
      <section class="quiz-finish">
        <p class="eyebrow">Muungano Challenge</p>
        <h1>${state.language === "sw" ? "Badge Uliyopata" : "Badge Earned"}: ${badge}</h1>
        <p>${state.language === "sw" ? "Umemaliza quiz." : "You completed the quiz."} Hongera! Your Passport has been updated.</p>
        <strong>${state.language === "sw" ? "Alama" : "Score"}: ${state.quizScore}/${questions.length}</strong>
        <p>${state.language === "sw" ? "Asilimia" : "Percent"}: ${scorePercent}%</p>
        <p>${state.language === "sw" ? "Level" : "Level"}: ${quizLevelLabel(state.quizLevel)}</p>
        <button class="primary-button" id="restartQuizButton" type="button">${state.language === "sw" ? "Cheza tena" : "Play again"}</button>
      </section>
    `;
    bindQuizControls();
    return;
  }

  const current = questions[state.quizIndex];
  document.querySelector("#page-quiz").innerHTML = `
    <section class="quiz-card">
      <p class="eyebrow">Muungano Challenge</p>
      <div class="level-selector">
        ${Object.keys(quizQuestions[state.language]).map((level) => `<button class="level-button ${state.quizLevel === level ? "active" : ""}" data-level="${level}" type="button">${quizLevelLabel(level)}</button>`).join("")}
      </div>
      <div class="quiz-top">
        <h1>${state.language === "sw" ? "Swali" : "Question"} ${state.quizIndex + 1}</h1>
        <span>${state.language === "sw" ? "Alama" : "Score"}: ${state.quizScore}/${questions.length}</span>
      </div>
      <h2>${current.question}</h2>
      <div class="quiz-options">
        ${current.options.map((option, index) => `<button class="quiz-option" data-answer="${index}" type="button">${String.fromCharCode(65 + index)}) ${option}</button>`).join("")}
      </div>
      <p class="quiz-feedback" id="quizFeedback"></p>
      <button class="secondary-button compact hidden" id="nextQuizButton" type="button">${state.quizIndex === questions.length - 1 ? (state.language === "sw" ? "Maliza" : "Finish") : (state.language === "sw" ? "Swali linalofuata" : "Next question")}</button>
    </section>
  `;
  bindQuizControls();
}

function bindQuizControls() {
  const quizPage = document.querySelector("#page-quiz");
  if (!quizPage) return;

  quizPage.querySelectorAll("[data-level]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setQuizLevel(button.dataset.level);
    });
  });

  quizPage.querySelectorAll("[data-answer]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      answerQuiz(Number(button.dataset.answer));
    });
  });

  quizPage.querySelector("#nextQuizButton")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    goToNextQuizQuestion();
  });

  quizPage.querySelector("#restartQuizButton")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    restartQuiz();
  });
}

function quizLevelLabel(level) {
  const labels = {
    beginner: state.language === "sw" ? "Beginner" : "Beginner",
    intermediate: state.language === "sw" ? "Intermediate" : "Intermediate",
    expert: state.language === "sw" ? "Expert" : "Expert",
  };
  return labels[level] || level;
}

function getQuizBadge() {
  const questions = quizQuestions[state.language][state.quizLevel];
  const ratio = questions.length ? state.quizScore / questions.length : 0;
  if (ratio >= 0.8) return "🏆 Muungano Champion";
  if (ratio >= 0.5) return state.language === "sw" ? "Muungano Explorer" : "Muungano Explorer";
  return state.language === "sw" ? "Muungano Learner" : "Muungano Learner";
}

function setQuizLevel(level) {
  if (!quizQuestions[state.language][level]) return;
  state.quizLevel = level;
  state.quizIndex = 0;
  state.quizScore = 0;
  state.quizAnswered = false;
  renderQuiz();
}

function answerQuiz(selectedIndex) {
  if (state.quizAnswered) return;

  const questions = quizQuestions[state.language][state.quizLevel];
  const current = questions[state.quizIndex];
  const isCorrect = selectedIndex === current.answer;
  state.quizAnswered = true;
  if (isCorrect) state.quizScore += 1;

  document.querySelectorAll(".quiz-option").forEach((button) => {
    const index = Number(button.dataset.answer);
    button.disabled = true;
    if (index === current.answer) button.classList.add("correct");
    if (index === selectedIndex && !isCorrect) button.classList.add("wrong");
  });

  const feedback = document.querySelector("#quizFeedback");
  feedback.textContent = `${isCorrect ? (state.language === "sw" ? "Sahihi." : "Correct.") : (state.language === "sw" ? "Si sahihi." : "Not correct.")} ${current.explain}`;
  feedback.dataset.tone = isCorrect ? "correct" : "wrong";
  document.querySelector("#nextQuizButton").classList.remove("hidden");
}

function goToNextQuizQuestion() {
  const questions = quizQuestions[state.language][state.quizLevel];
  if (state.quizIndex === questions.length - 1) {
    const score = questions.length ? Math.round((state.quizScore / questions.length) * 100) : 0;
    completeQuiz(`${state.language}-${state.quizLevel}`, score);
  }
  state.quizIndex += 1;
  state.quizAnswered = false;
  renderQuiz();
}

function restartQuiz() {
  state.quizIndex = 0;
  state.quizScore = 0;
  state.quizAnswered = false;
  renderQuiz();
}

function updateTimeline(index) {
  const eventData = timelineEvents[state.language][index];
  if (!eventData) return;
  document.querySelectorAll(".timeline-node").forEach((node) => {
    node.classList.toggle("active", Number(node.dataset.timeline) === index);
  });
  document.querySelector("#timelineDetail").innerHTML = timelineDetailMarkup(eventData);
}

function renderLeaders() {
  const data = content[state.language].leaders;
  const sections = leaderSections[state.language];
  const sw = state.language === "sw";
  document.querySelector("#page-leaders").innerHTML = `
    <section class="module-hero leaders-hero">
      <div>
        <p class="eyebrow">${data.eyebrow}</p>
        <h1>${data.title}</h1>
        <p>${data.text}</p>
      </div>
      <div class="leaders-hero-counts" aria-hidden="true">
        <div><strong>${sections.reduce((n, s) => n + s.items.length, 0)}</strong><span>${sw ? "Viongozi" : "Leaders"}</span></div>
        <div><strong>60+</strong><span>${sw ? "Miaka ya Muungano" : "Years of Union"}</span></div>
      </div>
    </section>
    <div class="leader-sections">
      ${sections.map((section) => {
        const isFeatured = !!section.featured;
        const isCurrent = section.color === "green";
        const isHist = !isFeatured && !isCurrent;
        const sectionClass = isFeatured
          ? "leader-section-featured"
          : isCurrent
            ? "leader-section-current"
            : "leader-section-hist leader-section-hist--" + section.color;
        const useSmallGrid = isFeatured || isCurrent;
        const inOfficeBadge = isCurrent
          ? `<div class="leader-current-tag"><span class="live-dot" aria-hidden="true"></span><span>${sw ? "Wanaongoza Sasa" : "In Office"}</span></div>`
          : "";
        const regionChips = isHist
          ? `<div class="leader-section-chips"><span class="leader-region-chip leader-chip-${section.color}">${section.color === "teal" ? "Tanzania" : "Zanzibar"}</span><span class="leader-count-chip">${section.items.length} ${sw ? "viongozi" : "presidents"}</span></div>`
          : "";
        return `
          <section class="leader-section ${sectionClass}">
            <div class="leader-section-heading">
              ${inOfficeBadge}${regionChips}
              <p class="eyebrow leaders-eyebrow-${section.color || "green"}">${section.eyebrow}</p>
              <h2>${section.title}</h2>
              <p>${section.text}</p>
            </div>
            <div class="leader-grid leadership-grid${useSmallGrid ? " leader-founders-grid" : ""}">
              ${section.items.map(([name, role, region, period, text, image, url]) => leadershipCardMarkup(name, role, region, period, text, image, url)).join("")}
            </div>
          </section>`;
      }).join("")}
    </div>
  `;
}

function leadershipCardMarkup(name, role, region, period, text, image, url) {
  const safeUrl = url ? attrUrl(url) : "";
  const photoBlock = safeUrl
    ? `<a class="leader-image-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer" data-leader-link="true" aria-label="${escapeAttribute(name)}">${leaderPhotoMarkup(name, image)}</a>`
    : leaderPhotoMarkup(name, image);
  const readMoreLabel = state.language === "sw" ? "Soma zaidi" : "Read more";
  const readMoreBlock = safeUrl
    ? `<a class="primary-link leader-read-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer" data-leader-link="true">${readMoreLabel}</a>`
    : "";
  return `
    <article class="leader-card leadership-card">
      ${photoBlock}
      <div class="leader-body">
        <div class="leader-card-top">
          <span>${region}</span>
          <strong class="leader-period">${period}</strong>
        </div>
        <h3>${name}</h3>
        <strong>${role}</strong>
        <p>${text}</p>
        ${readMoreBlock}
      </div>
    </article>
  `;
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-leader-link='true']");
  if (!link) return;

  event.preventDefault();
  event.stopPropagation();

  const href = link.getAttribute("href");
  if (!href) return;

  window.open(href, "_blank", "noopener,noreferrer");
});

function leaderCardMarkup(name, role, region, text, image, url) {
  const hasLink = !OFFLINE_MODE && Boolean(url);
  const tag = hasLink ? "a" : "article";
  const href = hasLink ? ` href="${attrUrl(url)}" target="_blank" rel="noreferrer"` : "";
  return `
      <${tag} class="leader-card ${OFFLINE_MODE ? "offline-item" : ""}"${href} aria-label="${name}">
        ${leaderPhotoMarkup(name, image)}
        <div class="leader-body">
          <span>${region}</span>
          <h3>${name}</h3>
          <strong>${role}</strong>
          <p>${text}</p>
          ${OFFLINE_MODE ? offlineReferenceLabel(url) : ""}
        </div>
      </${tag}>
  `;
}

function leaderPhotoMarkup(name, image) {
  if (image) {
    return `
      <div class="leader-photo">
        <img src="${attrUrl(image)}" alt="${escapeAttribute(name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.classList.add('leader-placeholder'); this.remove();">
      </div>
    `;
  }
  return `<div class="leader-photo leader-placeholder" aria-hidden="true"><strong>${initials(name)}</strong></div>`;
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}


function renderAudio() {
  const data = content[state.audioLanguage].audio;
  const story = data.stories[state.activeStory];
  const languageLabel = state.audioLanguage === "sw" ? "Kiswahili" : "English";
  document.querySelector("#page-audio").innerHTML = `
    <section class="section-header audio-section-header"><p class="eyebrow">Audio learning</p><h1>${state.audioLanguage === "sw" ? "Sikiliza simulizi za Muungano" : "Listen to Union stories"}</h1><p>${state.audioLanguage === "sw" ? "Chagua lugha ya simulizi, kisha soma au sikiliza historia kwa lugha hiyo." : "Choose the narration language, then read or listen to the story in that language."}</p></section>
    <section class="audio-language-panel">
      <div>
        <p class="eyebrow">${state.audioLanguage === "sw" ? "Lugha ya simulizi" : "Narration language"}</p>
        <h3>${state.audioLanguage === "sw" ? "Chagua lugha ya kusoma na kusikiliza" : "Choose reading and audio language"}</h3>
      </div>
      <div class="audio-language-toggle" role="group" aria-label="Audio language">
        <button class="level-button ${state.audioLanguage === "en" ? "active" : ""}" data-audio-language="en" type="button">English</button>
        <button class="level-button ${state.audioLanguage === "sw" ? "active" : ""}" data-audio-language="sw" type="button">Kiswahili</button>
      </div>
    </section>
    <div class="audio-layout">
      <div class="story-list">${data.stories.map(([title], index) => `<button class="story-button ${index === state.activeStory ? "active" : ""}" data-story="${index}" type="button"><span>${index + 1}</span>${title}</button>`).join("")}</div>
      <article class="audio-player">
        <div class="audio-topline">
          <span>${languageLabel}</span>
          <strong>${state.audioLanguage === "sw" ? "Somo" : "Lesson"} ${state.activeStory + 1}/${data.stories.length}</strong>
        </div>
        <h3 id="storyTitle">${story[0]}</h3>
        <div class="audio-article" id="storyText">${storyParagraphs(story[1])}</div>
        <div class="audio-controls">
          <button class="primary-button" data-play-language="${state.audioLanguage}" type="button">${state.audioLanguage === "sw" ? "Sikiliza kwa Kiswahili" : "Listen in English"}</button>
          <button class="secondary-button compact" id="stopStoryButton" type="button">${data.stop}</button>
        </div>
        <p class="status-message audio-status" id="audioStatus" aria-live="polite"></p>
      </article>
    </div>
  `;
  bindAudioControls();
}

function bindAudioControls() {
  const audioPage = document.querySelector("#page-audio");
  if (!audioPage) return;

  audioPage.querySelectorAll("[data-story]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      state.activeStory = Number(button.dataset.story);
      stopStory();
      renderAudio();
    });
  });

  audioPage.querySelectorAll("[data-audio-language]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      state.audioLanguage = button.dataset.audioLanguage;
      localStorage.setItem("muunganohub_audio_language", state.audioLanguage);
      stopStory();
      renderAudio();
    });
  });

  audioPage.querySelector("[data-play-language]")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    playStory(event.currentTarget.dataset.playLanguage);
  });

  audioPage.querySelector("#stopStoryButton")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    stopStory();
    const audioStatus = document.querySelector("#audioStatus");
    if (audioStatus) setStatus(audioStatus, state.audioLanguage === "sw" ? "Imesimamishwa." : "Audio stopped.");
  });
}

function storyParagraphs(text) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${paragraph.trim()}</p>`)
    .join("");
}

function renderMedia() {
  const data = content[state.language].media;
  document.querySelector("#page-media").innerHTML = `
    <section class="section-header media-section-header"><p class="eyebrow">${data.eyebrow}</p><h1>${data.title}</h1><p>${data.text}</p></section>
    <div class="media-grid">${mediaVideos.map((video, index) => `
      <article class="media-card video-card">
        ${mediaThumbMarkup(video, index)}
        <div class="media-card-body">
          <span class="media-lesson-label">${state.language === "sw" ? "Somo" : "Lesson"} ${index + 1}</span>
          ${mediaTitleMarkup(video)}
          <p>${video.text[state.language]}</p>
        </div>
        ${mediaActionMarkup(video, data.watch)}
      </article>
    `).join("")}</div>
  `;
}

function renderProfile() {
  const rawStatus = state.user?.profile_status || "";
  const status = looksLikeEmail(rawStatus) ? "" : rawStatus;
  const photo = state.user?.profile_photo_url || "";
  const changePhotoLabel = photo
    ? (state.language === "sw" ? "Badili picha" : "Change photo")
    : (state.language === "sw" ? "Weka picha" : "Add photo");
  const displayName = state.user?.name || "MuunganoHub User";
  const displayEmail = state.user?.email || "";
  const statusText = status || (state.language === "sw" ? "Hakuna status bado." : "No status yet.");
  document.querySelector("#page-profile").innerHTML = `
    <section class="section-header profile-section-header">
      <p class="eyebrow">${state.language === "sw" ? "Akaunti ya mtumiaji" : "User account"}</p>
      <h1>${state.language === "sw" ? "Profile yako" : "Your profile"}</h1>
      <p>${state.language === "sw" ? "Sasisha jina, picha na ujumbe mfupi unaoonekana kwenye akaunti yako ya MuunganoHub." : "Update your name, photo, and short learning status for your MuunganoHub account."}</p>
    </section>
    <section class="profile-layout profile-layout-polished">
      <article class="profile-card profile-identity-card">
        <div class="profile-cover" aria-hidden="true"></div>
        <div class="profile-identity-body">
          <div class="profile-avatar-wrap">
            <label class="profile-avatar-label" for="profilePhotoInput" aria-label="${changePhotoLabel}">
              ${profileAvatarMarkup(photo, "preview")}
              <span class="profile-photo-camera" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>
              </span>
            </label>
            <input class="profile-photo-file-input" id="profilePhotoInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" />
            <input id="profilePhotoValue" type="hidden" value="${escapeAttribute(photo)}" />
          </div>
          <div class="profile-identity-info">
            <p class="eyebrow">${state.language === "sw" ? "Mwanachama wa MuunganoHub" : "MuunganoHub member"}</p>
            <h3 class="profile-identity-name">${escapeAttribute(displayName)}</h3>
            <p class="profile-identity-email">${escapeAttribute(displayEmail)}</p>
          </div>
          <div class="profile-avatar-actions">
            <label for="profilePhotoInput" class="secondary-button compact profile-photo-trigger">${changePhotoLabel}</label>
            <button class="text-button ${photo ? "" : "hidden"}" id="removeProfilePhotoButton" type="button">${state.language === "sw" ? "Ondoa" : "Remove"}</button>
          </div>
          <p class="profile-photo-name ${photo ? "" : "hidden"}" id="profilePhotoName">${photo ? (state.language === "sw" ? "Picha imechaguliwa" : "Photo selected") : ""}</p>
          <p class="status-message" id="profilePhotoStatusMessage" aria-live="polite"></p>
          <div class="profile-status-display">
            <span class="profile-status-pill">${escapeAttribute(statusText)}</span>
          </div>
          <div class="profile-mini-stats" aria-label="${state.language === "sw" ? "Muhtasari wa profile" : "Profile summary"}">
            <span><strong>${photo ? "1" : "0"}</strong>${state.language === "sw" ? "Picha" : "Photo"}</span>
            <span><strong>${status ? "1" : "0"}</strong>${state.language === "sw" ? "Status" : "Status"}</span>
          </div>
        </div>
      </article>
      <form class="profile-form profile-editor-card" id="profileForm">
        <div class="profile-form-heading">
          <div>
            <p class="eyebrow">${state.language === "sw" ? "Hariri profile" : "Edit profile"}</p>
            <h3>${state.language === "sw" ? "Taarifa zako" : "Your details"}</h3>
          </div>
          <span>${state.language === "sw" ? "Salama" : "Secure"}</span>
        </div>
        <div class="profile-field-grid">
          <label>
            <span>${state.language === "sw" ? "Jina" : "Name"}</span>
            <input id="profileName" name="name" type="text" minlength="2" maxlength="80" required value="${escapeAttribute(displayName)}" />
          </label>
          <label>
            <span>${state.language === "sw" ? "Barua pepe" : "Email"}</span>
            <input id="profileEmail" type="email" value="${escapeAttribute(displayEmail)}" readonly />
          </label>
        </div>
        <label>
          <span>${state.language === "sw" ? "Profile status" : "Profile status"}</span>
          <input id="profileStatus" name="profile_status" type="text" maxlength="160" value="${escapeAttribute(status)}" placeholder="${state.language === "sw" ? "Mfano: Ninajifunza historia ya Muungano" : "Example: Learning Union history"}" />
        </label>
        <section class="profile-password-panel" aria-label="${state.language === "sw" ? "Usalama wa nenosiri" : "Password security"}">
          <div>
            <p class="eyebrow">${state.language === "sw" ? "Usalama" : "Password"}</p>
            <h4>${state.language === "sw" ? "Badili nenosiri kwa hiari" : "Change password optionally"}</h4>
          </div>
          <div class="profile-password-grid">
            <label>
              <span>${state.language === "sw" ? "Nenosiri la sasa" : "Current password"}</span>
              <input id="currentPassword" name="current_password" type="password" minlength="8" autocomplete="current-password" />
            </label>
            <label>
              <span>${state.language === "sw" ? "Nenosiri jipya" : "New password"}</span>
              <input id="newPassword" name="new_password" type="password" minlength="8" autocomplete="new-password" />
            </label>
            <label>
              <span>${state.language === "sw" ? "Rudia nenosiri jipya" : "Confirm new password"}</span>
              <input id="confirmPassword" type="password" minlength="8" autocomplete="new-password" />
            </label>
          </div>
        </section>
        <div class="profile-submit-row">
          <button class="primary-button" type="submit">${state.language === "sw" ? "Hifadhi profile" : "Save profile"}</button>
          <p class="status-message" id="profileStatusMessage" aria-live="polite"></p>
        </div>
      </form>
    </section>
  `;
}

function profileAvatarMarkup(photo, variant = "") {
  const className = `profile-avatar ${variant === "preview" ? "profile-avatar-preview" : ""}`.trim();
  if (photo) {
    return `<img class="${className}" src="${escapeAttribute(appUrl(photo))}" alt="${state.language === "sw" ? "Picha ya profile" : "Profile photo"}" onerror="this.onerror=null;this.style.display='none'" />`;
  }
  return `<div class="brand-mark ${className} notranslate" translate="no">MH</div>`;
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest(
    ".profile-avatar-label, .profile-photo-button, label[for='profilePhotoInput']"
  );

  if (!trigger) return;

  const input = document.querySelector("#profilePhotoInput");
  if (!input) return;

  event.preventDefault();
  input.click();
});

document.addEventListener("click", (event) => {
  const trigger = event.target.closest(
    ".profile-avatar-label, .profile-photo-trigger, label[for='profilePhotoInput']"
  );

  if (!trigger) return;

  const input = document.querySelector("#profilePhotoInput");
  if (!input) return;

  event.preventDefault();
  input.click();
});

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

async function uploadProfilePhoto(file) {
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  const allowedExtensions = /\.(jpe?g|png|webp|gif)$/i;
  if (!allowedTypes.has(file.type) && !allowedExtensions.test(file.name || "")) {
    throw new Error(state.language === "sw" ? "Tafadhali chagua JPG, PNG, WebP au GIF." : "Please choose a JPG, PNG, WebP, or GIF image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error(state.language === "sw" ? "Picha ni kubwa mno. Ukubwa wa juu ni 5 MB." : "The photo is too large. Maximum size is 5 MB.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(appUrl("/auth/profile/photo"), {
    method: "POST",
    headers: { Authorization: `Bearer ${state.token}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || (state.language === "sw" ? "Upakiaji wa picha umeshindwa." : "Photo upload failed."));
  }

  return response.json();
}

function updateProfilePhotoPreview(photo, fileName = "") {
  const value = document.querySelector("#profilePhotoValue");
  const removeButton = document.querySelector("#removeProfilePhotoButton");
  const nameLabel = document.querySelector("#profilePhotoName");
  if (value) value.value = photo || "";
  if (removeButton) removeButton.classList.toggle("hidden", !photo);
  if (nameLabel) {
    nameLabel.classList.toggle("hidden", !photo);
    if (photo) {
      nameLabel.textContent = fileName || (state.language === "sw" ? "Picha imechaguliwa" : "Photo selected");
    }
  }
  document.querySelectorAll(".profile-avatar").forEach((avatar) => {
    const isPreview = avatar.classList.contains("profile-avatar-preview");
    const wrapper = document.createElement("div");
    wrapper.innerHTML = profileAvatarMarkup(photo, isPreview ? "preview" : "");
    avatar.replaceWith(wrapper.firstElementChild);
  });
}

document.addEventListener("change", async (event) => {
  const input = event.target;

  if (!input.matches("#profilePhotoInput")) return;

  const file = input.files?.[0];
  if (!file) return;

  const status = document.querySelector("#profilePhotoStatusMessage");

  try {
    if (status) {
      status.textContent =
        state.language === "sw"
          ? "Inapakia picha..."
          : "Uploading photo...";
    }

    const result = await uploadProfilePhoto(file);

    const photoUrl = result.profile_photo_url || "";
    const thumbUrl = result.profile_photo_thumb_url || photoUrl;

    state.user.profile_photo_url = photoUrl;
    state.user.profile_photo_thumb_url = thumbUrl;

    const updatedUser = await apiFetch("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify({
        profile_photo_url: photoUrl,
        profile_photo_thumb_url: thumbUrl,
      }),
    });

    state.user = updatedUser;

    localStorage.setItem(
      "muunganohub_user",
      JSON.stringify(state.user)
    );

    updateProfilePhotoPreview(photoUrl, file.name);

    if (status) {
      status.textContent =
        state.language === "sw"
          ? "Picha imepakiwa na kuhifadhiwa."
          : "Photo uploaded and saved.";
    }
  } catch (err) {
    if (status) {
      status.textContent =
        err.message ||
        (state.language === "sw"
          ? "Imeshindikana kupakia picha."
          : "Photo upload failed.");
    }
  } finally {
    input.value = "";
  }
});

function mediaThumbMarkup(video, index) {
  const label = state.language === "sw" ? `Somo ${index + 1}` : `Lesson ${index + 1}`;
  const thumb = youtubeThumbnail(video.url);
  const title = video.title[state.language];
  const safeUrl = attrUrl(video.url);
  const safeTitle = escapeAttribute(title);
  if (isLocalVideo(video.url)) {
    const fallback = state.language === "sw"
      ? "Video haijapatikana au browser imeshindwa kuifungua."
      : "The video is missing or your browser could not open it.";
    return `
      <div class="media-thumb video-thumb local-video-thumb" aria-label="${safeTitle}">
        <video controls preload="metadata" playsinline controlslist="nodownload" onerror="this.closest('.video-card')?.classList.add('media-load-error')">
          <source src="${safeUrl}" type="video/mp4">
          <a href="${safeUrl}">${state.language === "sw" ? "Fungua video" : "Open video"}</a>
        </video>
        <p class="media-fallback-message">${fallback}</p>
        <small>${label}</small>
      </div>
    `;
  }
  return `
    <a class="media-thumb video-thumb" href="${safeUrl}" target="_blank" rel="noreferrer" aria-label="${safeTitle}">
      ${thumb ? `<img src="${escapeAttribute(thumb)}" alt="${safeTitle}" loading="lazy">` : ""}
      <span class="video-overlay"></span>
      <span class="play-button" aria-hidden="true"></span>
      <small>${label}</small>
    </a>
  `;
}

function mediaTitleMarkup(video) {
  const title = video.title[state.language];
  return `<h3><a class="media-title-link" href="${attrUrl(video.url)}" target="_blank" rel="noreferrer">${title}</a></h3>`;
}

function youtubeThumbnail(url) {
  const match = url.match(/youtu\.be\/([^?&]+)/);
  if (!match) return "";
  return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
}

function isLocalVideo(url) {
  return /(?:^|\/)static\/assets\/videos\/.+\.mp4$/i.test(url);
}

function mediaActionMarkup(video, watchLabel) {
  const label = state.language === "sw" ? "Fungua Video" : "Open Video";
  const missingLabel = state.language === "sw" ? "Ikiwa haifunguki, faili la video halipo." : "If it does not open, the video file is missing.";
  return `<a class="primary-link media-open-link" href="${attrUrl(video.url)}" target="_blank" rel="noreferrer">${label || watchLabel}</a><p class="media-missing-note">${missingLabel}</p>`;
}

function renderCompetition() {
  const data = content[state.language].competition;
  document.querySelector("#page-competition").innerHTML = `
    <section class="section-header proposal-section-header">
      <p class="eyebrow">${data.eyebrow}</p>
      <h1>${data.title}</h1>
      <p>${data.text}</p>
      <div class="proposal-hero-tags" aria-label="${state.language === "sw" ? "Nguvu za mradi" : "Project strengths"}">
        <span>RAG</span>
        <span>FastAPI</span>
        <span>Offline-ready</span>
        <span>Swahili + English</span>
      </div>
    </section>
    <section class="proposal-board">
      <article class="proposal-lead-card">
        <p class="eyebrow">${state.language === "sw" ? "Toleo la sasa" : "Current version"}</p>
        <h3>${state.language === "sw" ? "Prototype inayofanya kazi kwa elimu ya Muungano" : "A working prototype for Union education"}</h3>
        <p>${state.language === "sw" ? "MuunganoHub inaunganisha historia, viongozi, video, audio, quiz, Passport ya maendeleo na chatbot yenye vyanzo ili vijana wajifunze kwa njia moja iliyo wazi." : "MuunganoHub brings history, leaders, video, audio, quizzes, Passport progress, and a source-grounded chatbot into one clear learning experience for young people."}</p>
      </article>
      <div class="proposal-card-grid">${data.cards.map(([title, text], index) => `<article class="pitch-card proposal-card"><span>${String(index + 1).padStart(2, "0")}</span><h3>${title}</h3><p>${text}</p></article>`).join("")}</div>
    </section>
  `;
}

function appendMessage(role, text) {
  const article = document.createElement("article");
  article.className = `message ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "You" : "MH";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = formatAnswer(text);
  article.append(avatar, bubble);
  messages.append(article);
  messages.scrollTop = messages.scrollHeight;
}

function formatAnswer(text) {
  const escapeHtml = (s) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const applyInline = (s) =>
    escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  const lines = text.split("\n");
  const html = [];
  let inSources = false;
  let sourceLines = [];

  const flushSources = () => {
    if (!sourceLines.length) return;
    html.push('<div class="source-block">');
    for (const sl of sourceLines) {
      const parts = sl.replace(/^\[\d+\]\s*/, "").split(" | ");
      const title = escapeHtml(parts[0] || "");
      const meta = parts.slice(1).join(" &nbsp;·&nbsp; ");
      html.push(
        `<div class="source-line"><span class="source-num">[${sl.match(/^\[(\d+)\]/)?.[1] || "?"}]</span>` +
        `<span class="source-title">${title}</span>` +
        (meta ? `<span class="source-meta">${meta}</span>` : "") +
        `</div>`
      );
    }
    html.push("</div>");
    sourceLines = [];
    inSources = false;
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (inSources) flushSources();
      continue;
    }
    const isSrcHeader = /^(Sources|Vyanzo)\s*:?\s*$/i.test(trimmed);
    if (isSrcHeader) {
      flushSources();
      inSources = true;
      html.push(`<p class="sources-heading">${escapeHtml(trimmed)}</p>`);
      continue;
    }
    const isSrcLine = /^\[\d+\]/.test(trimmed);
    if (isSrcLine) {
      inSources = true;
      sourceLines.push(trimmed);
      continue;
    }
    if (inSources) flushSources();
    const isBoldHeader = /^\*\*(.+)\*\*$/.test(trimmed);
    if (isBoldHeader) {
      html.push(`<p class="answer-heading">${applyInline(trimmed)}</p>`);
    } else if (/^\d+\.\s+/.test(trimmed)) {
      html.push(`<p class="answer-numbered">${applyInline(trimmed)}</p>`);
    } else {
      html.push(`<p>${applyInline(trimmed)}</p>`);
    }
  }
  if (inSources) flushSources();
  return html.join("");
}

async function checkHealth() {
  try {
    const health = await apiRequest("/health", { method: "GET" });
    OFFLINE_MODE = !navigator.onLine;
  } catch {
    OFFLINE_MODE = true;
  }
  if (platformView && !platformView.classList.contains("hidden")) renderAllPages();
}

async function verifySession() {
  if (!state.token) {
    showPublicLanding();
    return;
  }
  if (state.token.startsWith("offline:")) {
    OFFLINE_MODE = true;
    showPlatform();
    return;
  }
  try {
    const user = await apiRequest("/auth/me", { method: "GET" });
    OFFLINE_MODE = false;
    state.user = user;
    localStorage.setItem("muunganohub_user", JSON.stringify(user));
    showPlatform();
  } catch {
    if (state.user) {
      OFFLINE_MODE = true;
      showPlatform();
    } else {
      clearAuth();
      showPublicLanding();
    }
  }
}

function printCertificate() {
  const name = state.user?.name || (state.language === "sw" ? "Mshiriki" : "Participant");
  const progress = getUserProgress();
  const date = new Date().toLocaleDateString(state.language === "sw" ? "sw-TZ" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  const sw = state.language === "sw";
  const win = window.open("", "_blank", "width=700,height=540");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html lang="${sw ? "sw" : "en"}">
<head>
<meta charset="UTF-8">
<title>${sw ? "Cheti cha Ushiriki - MuunganoHub" : "Certificate of Participation - MuunganoHub"}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Inter,Georgia,serif;background:#f8fafc;color:#102a43;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .cert{background:#fff;border:2px solid #0d9488;border-radius:16px;padding:48px 52px;max-width:640px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.10)}
  .logo{display:inline-block;background:linear-gradient(135deg,#0d9488,#2563eb);color:#fff;font-size:24px;font-weight:900;padding:14px 22px;border-radius:10px;letter-spacing:.04em;margin-bottom:20px}
  .org{font-size:13px;color:#0d9488;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px}
  h1{font-size:26px;font-weight:900;color:#102a43;margin-bottom:6px}
  .subtitle{color:#64748b;font-size:14px;margin-bottom:22px}
  .name{font-size:32px;font-weight:900;color:#0f766e;margin:18px 0;font-style:italic;border-bottom:2px solid #e2e8f0;padding-bottom:18px}
  .body{color:#334155;font-size:15px;line-height:1.7;margin-bottom:22px}
  .stats{display:flex;gap:24px;justify-content:center;margin:18px 0;flex-wrap:wrap}
  .stat{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 18px;font-size:13px;color:#166534;font-weight:700}
  .date{color:#94a3b8;font-size:13px;margin-top:20px}
  .seal{font-size:52px;margin:8px 0 16px}
  @media print{body{background:#fff;padding:0}button{display:none}}
</style>
</head>
<body>
<div class="cert">
  <div class="logo">MH</div>
  <p class="org">MuunganoHub &mdash; Jifunze. Elewa. Shiriki.</p>
  <div class="seal">🏆</div>
  <h1>${sw ? "Cheti cha Ushiriki wa Kiraia" : "Certificate of Civic Participation"}</h1>
  <p class="subtitle">${sw ? "Hii inathibitisha kwamba" : "This certifies that"}</p>
  <div class="name">${name}</div>
  <p class="body">${sw
    ? "amekamilisha shughuli za ushiriki wa kiraia kwenye MuunganoHub, jukwaa la elimu ya Muungano wa Tanganyika na Zanzibar."
    : "has successfully completed civic engagement activities on MuunganoHub, a learning platform dedicated to the Union of Tanganyika and Zanzibar."}</p>
  <div class="stats">
    <span class="stat">${progress.points} ${sw ? "Pointi" : "Points"}</span>
    <span class="stat">${progress.earnedBadges.length} ${sw ? "Badges" : "Badges"}</span>
    <span class="stat">${progress.connectActivities.length} ${sw ? "Shughuli" : "Activities"}</span>
  </div>
  <p class="date">${date}</p>
</div>
</body>
</html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

document.addEventListener("click", (event) => {
  const managedAssetAnchor = event.target.closest("a[href]");
  if (managedAssetAnchor && isManagedAssetLink(managedAssetAnchor)) {
    event.preventDefault();
    event.stopPropagation();
    openManagedAsset(managedAssetAnchor);
    return;
  }

  const backgroundButton = event.target.closest("#backgroundButton");
  const backgroundPanel = document.querySelector("#backgroundPanel");
  if (backgroundButton && backgroundPanel) {
    const isOpen = backgroundPanel.classList.toggle("open");
    backgroundButton.setAttribute("aria-expanded", String(isOpen));
    return;
  }

  const backgroundChoice = event.target.closest(".background-choice[data-background]");
  if (backgroundChoice) {
    state.background = backgroundChoice.dataset.background;
    applyBackground();
    renderBackgroundOptions();
    backgroundPanel?.classList.remove("open");
    document.querySelector("#backgroundButton")?.setAttribute("aria-expanded", "false");
    return;
  }

  if (backgroundPanel && !event.target.closest(".background-wrap")) {
    backgroundPanel.classList.remove("open");
    document.querySelector("#backgroundButton")?.setAttribute("aria-expanded", "false");
  }

  const menuPanel = document.querySelector("#mainMenuPanel");
  if (menuPanel && !event.target.closest(".menu-wrap")) {
    closeMainMenu();
  }

  if (event.target.closest("#newChatButton")) {
    startNewChat();
    return;
  }

  if (event.target.id === "downloadCertificateButton" && !event.target.disabled) {
    printCertificate();
    return;
  }

  const exampleButton = event.target.closest("[data-question]");
  if (exampleButton) {
    navigateToPage("chatbot");
    if (!state.token) return;
    questionInput.value = exampleButton.dataset.question;
    chatForm.requestSubmit();
    return;
  }

  const teachButton = event.target.closest("[data-teach]");
  if (teachButton) {
    navigateToPage("chatbot");
    if (!state.token) return;
    questionInput.value = state.language === "sw"
      ? `Nifundishe kuhusu ${teachButton.dataset.teach}`
      : `Teach me about ${teachButton.dataset.teach}`;
    chatForm.requestSubmit();
    return;
  }

  const timelineTarget = event.target.closest("[data-timeline]");
  if (timelineTarget && !event.target.closest("a")) {
    updateTimeline(Number(timelineTarget.dataset.timeline));
    return;
  }

  const safariLearnButton = event.target.closest("[data-safari-learn]");
  if (safariLearnButton) {
    recordSafariAction(safariLearnButton.dataset.safariLearn, "learn");
    navigateToPage("history");
    return;
  }

  const safariQuizButton = event.target.closest("[data-safari-quiz]");
  if (safariQuizButton) {
    recordSafariAction(safariQuizButton.dataset.safariQuiz, "quiz");
    navigateToPage("quiz");
    return;
  }

  const connectButton = event.target.closest("[data-complete-connect]");
  if (connectButton) {
    completeConnectActivity(connectButton.dataset.completeConnect);
    return;
  }

  const quizButton = event.target.closest("[data-answer]");
  if (quizButton) {
    answerQuiz(Number(quizButton.dataset.answer));
    return;
  }

  const levelButton = event.target.closest("[data-level]");
  if (levelButton) {
    setQuizLevel(levelButton.dataset.level);
    return;
  }

  if (event.target.id === "nextQuizButton") {
    goToNextQuizQuestion();
    return;
  }
  if (event.target.id === "restartQuizButton") {
    restartQuiz();
    return;
  }

  const navButton = event.target.closest("[data-page]");
  if (navButton) {
    event.preventDefault();
    navigateToPage(navButton.dataset.page);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const pageCard = event.target.closest(".page-card[data-page]");
  if (!pageCard || event.target.closest("button, a, input, textarea, select")) return;
  event.preventDefault();
  navigateToPage(pageCard.dataset.page);
});

function playStory(language = state.audioLanguage) {
  if (!["en", "sw"].includes(language)) return;
  stopStory();
  const playbackId = ++audioPlaybackId;
  const story = content[language].audio.stories[state.activeStory];
  const narrationText = `${story[0]}. ${story[1]}`;
  const audioStatus = document.querySelector("#audioStatus");
  if (audioStatus) {
    setStatus(audioStatus, language === "sw" ? "Inaanza kusoma simulizi..." : "Starting audio narration...");
  }

  playServerTts(narrationText, language, playbackId).catch(() => {
    if (playbackId === audioPlaybackId) playBrowserNarration(narrationText, language, playbackId);
  });
}

function playBrowserNarration(text, language, playbackId = audioPlaybackId) {
  if (playbackId !== audioPlaybackId || !["en", "sw"].includes(language)) return;
  if (!("speechSynthesis" in window)) {
    setStatus(document.querySelector("#audioStatus") || chatStatus, tr("audioUnsupported"), "error");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === "sw" ? "sw-TZ" : "en-US";
  const voice = pickVoice(language);
  if (voice) utterance.voice = voice;
  utterance.rate = 0.92;
  utterance.onstart = () => {
    if (playbackId === audioPlaybackId) setStatus(document.querySelector("#audioStatus") || chatStatus, language === "sw" ? "Inasoma sasa..." : "Audio is playing...");
  };
  utterance.onend = () => {
    if (playbackId === audioPlaybackId) setStatus(document.querySelector("#audioStatus") || chatStatus, language === "sw" ? "Simulizi limeisha." : "Audio finished.");
  };
  utterance.onerror = () => {
    if (playbackId === audioPlaybackId) setStatus(document.querySelector("#audioStatus") || chatStatus, tr("audioUnsupported"), "error");
  };
  window.speechSynthesis.speak(utterance);
}

function stopStory() {
  audioPlaybackId += 1;
  ttsQueue = [];
  ttsQueueIndex = 0;
  if (currentTtsAudio) {
    currentTtsAudio.onended = null;
    currentTtsAudio.onerror = null;
    currentTtsAudio.onplay = null;
    currentTtsAudio.pause();
    currentTtsAudio.src = "";
    currentTtsAudio.load();
    currentTtsAudio = null;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

async function playServerTts(text, languageCode, playbackId) {
  if (playbackId !== audioPlaybackId || !["en", "sw"].includes(languageCode)) return;
  ttsQueue = splitTtsText(text, 150);
  ttsQueueIndex = 0;
  await playNextTtsChunk(languageCode, playbackId);
}

function playNextTtsChunk(languageCode, playbackId) {
  return new Promise((resolve, reject) => {
    if (playbackId !== audioPlaybackId) {
      resolve();
      return;
    }
    if (ttsQueueIndex >= ttsQueue.length) {
      currentTtsAudio = null;
      resolve();
      return;
    }

    const chunk = ttsQueue[ttsQueueIndex];
    const src = `/tts?lang=${encodeURIComponent(languageCode)}&text=${encodeURIComponent(chunk)}`;
    currentTtsAudio = new Audio(src);
    currentTtsAudio.onended = () => {
      if (playbackId !== audioPlaybackId) {
        resolve();
        return;
      }
      ttsQueueIndex += 1;
      playNextTtsChunk(languageCode, playbackId).then(resolve).catch(reject);
    };
    currentTtsAudio.onerror = () => {
      if (playbackId === audioPlaybackId) reject();
      else resolve();
    };
    currentTtsAudio.onplay = () => {
      if (playbackId === audioPlaybackId) setStatus(document.querySelector("#audioStatus") || chatStatus, languageCode === "sw" ? "Inasoma sasa..." : "Audio is playing...");
    };
    currentTtsAudio.play().catch(() => {
      if (playbackId === audioPlaybackId) reject();
      else resolve();
    });
  });
}

function splitTtsText(text, maxLength) {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  const chunks = [];
  let current = "";

  sentences.forEach((sentence) => {
    if ((current + " " + sentence).trim().length <= maxLength) {
      current = (current + " " + sentence).trim();
      return;
    }
    if (current) chunks.push(current);
    if (sentence.length <= maxLength) {
      current = sentence;
      return;
    }
    for (let start = 0; start < sentence.length; start += maxLength) {
      chunks.push(sentence.slice(start, start + maxLength));
    }
    current = "";
  });

  if (current) chunks.push(current);
  return chunks;
}

function pickVoice(language) {
  if (!("speechSynthesis" in window)) return null;
  const target = language === "sw" ? "sw" : "en";
  return window.speechSynthesis
    .getVoices()
    .find((voice) => voice.lang.toLowerCase().startsWith(target)) || null;
}

function isValidGmail(email) {
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email.trim());
}

function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
}

languageSelect.addEventListener("change", () => setLanguage(languageSelect.value));
loginTab.addEventListener("click", () => switchAuthMode("login"));
registerTab.addEventListener("click", () => switchAuthMode("register"));
forgotPasswordButton.addEventListener("click", () => switchAuthMode("reset"));
backToLoginButton.addEventListener("click", () => switchAuthMode("login"));

requestResetButton.addEventListener("click", async () => {
  if (!resetEmail.value.trim()) {
    resetEmail.focus();
    return;
  }
  if (!isValidGmail(resetEmail.value)) {
    setStatus(authStatus, "Please enter a valid Gmail address ending with @gmail.com.", "error");
    resetEmail.focus();
    return;
  }

  setStatus(authStatus, tr("sendingResetCode"));
  requestResetButton.disabled = true;
  try {
    const payload = await apiRequest("/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email: resetEmail.value }),
    });
    if (payload.dev_reset_token) {
      resetToken.value = payload.dev_reset_token;
      const problems = payload.email_config?.problems?.length ? ` ${payload.email_config.problems.join(" ")}` : "";
      setStatus(authStatus, `${tr("resetEmailConfigProblem")}${problems}`);
    } else if (payload.email_sent) {
      setStatus(authStatus, tr("resetEmailSent"));
    } else {
      setStatus(authStatus, payload.message || tr("resetCodeSent"));
    }
  } catch (error) {
    const message = error.status === 404 ? tr("resetEndpointMissing") : error.message;
    setStatus(authStatus, message, "error");
  } finally {
    requestResetButton.disabled = false;
  }
});

passwordResetForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const cleanResetCode = resetToken.value.replace(/\s+/g, "");

  if (!cleanResetCode || !resetNewPassword.value || !resetConfirmPassword.value) {
    setStatus(authStatus, tr("resetFieldsRequired"), "error");
    return;
  }

  if (!/^\d{8}$/.test(cleanResetCode)) {
    setStatus(authStatus, tr("resetCodeInvalid"), "error");
    return;
  }

  if (resetNewPassword.value !== resetConfirmPassword.value) {
    setStatus(authStatus, tr("passwordsDoNotMatch"), "error");
    return;
  }
  if (!isStrongPassword(resetNewPassword.value)) {
    setStatus(authStatus, "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.", "error");
    resetNewPassword.focus();
    return;
  }

  setStatus(authStatus, tr("resettingPassword"));
  try {
    const payload = await apiRequest("/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({ token: cleanResetCode, new_password: resetNewPassword.value }),
    });
    loginEmail.value = resetEmail.value;
    loginPassword.value = "";
    resetToken.value = "";
    resetNewPassword.value = "";
    resetConfirmPassword.value = "";
    switchAuthMode("login");
    setStatus(authStatus, payload.message || tr("passwordResetDone"));
  } catch (error) {
    setStatus(authStatus, error.message, "error");
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isValidGmail(loginEmail.value)) {
    setStatus(authStatus, "Please enter a valid Gmail address ending with @gmail.com.", "error");
    loginEmail.focus();
    return;
  }
  if (!isStrongPassword(loginPassword.value)) {
    setStatus(authStatus, "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.", "error");
    loginPassword.focus();
    return;
  }
  setStatus(authStatus, tr("signingIn"));
  try {
    const payload = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: loginEmail.value, password: loginPassword.value }),
    });
    OFFLINE_MODE = false;
    saveAuth(payload.token, payload.user);
    setStatus(authStatus, "");
    showPlatform();
  } catch (error) {
    if (!canUseOfflineFallback(error)) {
      setStatus(authStatus, error.message, "error");
      return;
    }
    try {
      OFFLINE_MODE = true;
      const payload = offlineLogin(loginEmail.value, loginPassword.value);
      saveAuth(payload.token, payload.user);
      setStatus(authStatus, tr("offlineLoginReady"));
      showPlatform();
    } catch (offlineError) {
      setStatus(authStatus, offlineError.message, "error");
    }
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isValidGmail(registerEmail.value)) {
    setStatus(authStatus, "Please enter a valid Gmail address ending with @gmail.com.", "error");
    registerEmail.focus();
    return;
  }
  if (!isStrongPassword(registerPassword.value)) {
    setStatus(authStatus, "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.", "error");
    registerPassword.focus();
    return;
  }
  setStatus(authStatus, tr("creatingAccount"));
  try {
    const payload = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: registerName.value, email: registerEmail.value, password: registerPassword.value }),
    });
    OFFLINE_MODE = false;
    saveAuth(payload.token, payload.user);
    setStatus(authStatus, "");
    showPlatform();
  } catch (error) {
    if (!canUseOfflineFallback(error)) {
      setStatus(authStatus, error.message, "error");
      return;
    }
    try {
      OFFLINE_MODE = true;
      const payload = offlineRegister(registerName.value, registerEmail.value, registerPassword.value);
      saveAuth(payload.token, payload.user);
      setStatus(authStatus, tr("offlineRegisterReady"));
      showPlatform();
    } catch (offlineError) {
      setStatus(authStatus, offlineError.message, "error");
    }
  }
});

document.addEventListener("submit", async (event) => {
  if (event.target.id !== "profileForm") return;
  event.preventDefault();

  const message = document.querySelector("#profileStatusMessage");
  const name = document.querySelector("#profileName").value;
  const profileStatusInput = document.querySelector("#profileStatus").value.trim();
  const profileStatusValue = looksLikeEmail(profileStatusInput) ? "" : profileStatusInput;
  const currentPassword = document.querySelector("#currentPassword").value;
  const newPassword = document.querySelector("#newPassword").value;
  const confirmPassword = document.querySelector("#confirmPassword").value;
  const photoValue = document.querySelector("#profilePhotoValue")?.value || "";

  if (newPassword && newPassword !== confirmPassword) {
    setStatus(message, tr("passwordsDoNotMatch"), "error");
    return;
  }

  try {
    const profilePayload = {
      name,
      profile_status: profileStatusValue,
      profile_photo_url: photoValue,
      profile_photo_thumb_url: state.user?.profile_photo_thumb_url || photoValue || "",
      current_password: currentPassword || null,
      new_password: newPassword || null,
    };

    let updatedUser;
    if (OFFLINE_MODE || state.token.startsWith("offline:")) {
      updatedUser = updateOfflineProfile(profilePayload);
    } else {
      updatedUser = await apiRequest("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(profilePayload),
      });
    }
    state.user = updatedUser;
    localStorage.setItem("muunganohub_user", JSON.stringify(updatedUser));
    renderProfile();
    userEmail.textContent = state.user?.email || "";
    setStatus(document.querySelector("#profileStatusMessage"), tr("profileSaved"));
  } catch (error) {
    setStatus(message, error.message, "error");
  }
});

document.addEventListener("change", async (event) => {
  if (event.target.id !== "profilePhotoInput") return;
  const message = document.querySelector("#profilePhotoStatusMessage");
  const file = event.target.files?.[0];
  if (!file) return;
  if (OFFLINE_MODE || state.token?.startsWith("offline:")) {
    event.target.value = "";
    setStatus(message, state.language === "sw" ? "Upakiaji wa picha hauwezekani bila muunganiko." : "Photo upload is not available in offline mode.", "error");
    return;
  }
  setStatus(message, state.language === "sw" ? "Inapakia picha..." : "Uploading photo...");
  try {
    const result = await uploadProfilePhoto(file);
    const photoUrl = result.profile_photo_url || "";
    const thumbUrl = result.profile_photo_thumb_url || photoUrl;
    updateProfilePhotoPreview(photoUrl, file.name);
    saveProfilePhotoDraft(photoUrl, thumbUrl);
    setStatus(message, state.language === "sw" ? "Picha imepakiwa. Bonyeza Hifadhi profile." : "Photo uploaded. Click Save profile.");
  } catch (error) {
    event.target.value = "";
    setStatus(message, error.message, "error");
  }
});

document.addEventListener("click", (event) => {
  if (event.target.closest("#removeProfilePhotoButton")) {
    event.preventDefault();
    event.stopPropagation();
    const input = document.querySelector("#profilePhotoInput");
    if (input) input.value = "";
    updateProfilePhotoPreview("");
    saveProfilePhotoDraft("", "");
    setStatus(document.querySelector("#profilePhotoStatusMessage"), state.language === "sw" ? "Picha imeondolewa. Bonyeza Hifadhi profile." : "Photo removed. Click Save profile.");
  }
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = questionInput.value.trim();
  if (!question) return;
  appendMessage("user", question);
  questionInput.value = "";
  sendButton.disabled = true;
  setStatus(chatStatus, tr("searching"));
  try {
    const payload = await apiRequest("/chat", {
      method: "POST",
      body: JSON.stringify({ question, session_id: state.sessionId || null }),
    });
    OFFLINE_MODE = false;
    state.sessionId = payload.session_id;
    localStorage.setItem("muunganohub_session", state.sessionId);
    appendMessage("assistant", payload.answer);
    setStatus(chatStatus, "");
  } catch (error) {
    if (error.offline || OFFLINE_MODE || (state.token?.startsWith("offline:") && error.status === 401)) {
      OFFLINE_MODE = true;
      appendMessage("assistant", offlineChatAnswer(question));
      setStatus(chatStatus, tr("offlineMode"));
    } else {
      appendMessage("assistant", error.message);
      setStatus(chatStatus, error.message, "error");
    }
  } finally {
    sendButton.disabled = false;
    questionInput.focus();
  }
});

questionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

function startNewChat() {
  state.sessionId = "";
  localStorage.removeItem("muunganohub_session");
  messages.innerHTML = "";
  appendMessage("assistant", tr("newChatStarted"));
  navigateToPage("chatbot");
}

async function handleLogout() {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch {
    // Local logout should still succeed even if the server is unreachable.
  }
  stopStory();
  clearAuth();
  showPublicLanding();
}

logoutButton.addEventListener("click", handleLogout);
mobileLogoutButton?.addEventListener("click", handleLogout);

topLanguageButton?.addEventListener("click", () => {
  setLanguage(state.language === "sw" ? "en" : "sw");
});

topAuthButton?.addEventListener("click", async () => {
  showAuth();
});

window.addEventListener("popstate", () => {
  if (platformView.classList.contains("hidden")) return;
  setPage(initialPageFromUrl() || "home", { scroll: true });
  closeFloatingPanels();
});

window.addEventListener("online", checkHealth);
window.addEventListener("offline", () => {
  OFFLINE_MODE = true;
  if (platformView && !platformView.classList.contains("hidden")) renderAllPages();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    navigator.serviceWorker.register(appUrl("/sw.js")).then((registration) => {
      registration.update().catch(() => {});
    }).catch(() => {
      // The app still works normally if service worker registration is unavailable.
    });
  });
}

setLanguage(state.language);
checkHealth();
verifySession();

// English / हिंदी. Short labels: data-i18n="key" (text) or data-i18n-ph="key" (placeholder).
// Long blocks: write both versions in the HTML with data-lang="en" / data-lang="hi"; CSS shows the active one.
// Dynamic text in app.js uses t("key", {vars}).
// NOTE: Hindi drafted by the developer; have a native speaker read it before public launch.
"use strict";
const I18N = {
  en: {
    title: "TollCheck India",
    sub: "For Indian highways: which tolls does the FASTag Annual Pass cover on your trip?",
    howItWorks: "ⓘ How it works",
    from: "From", to: "To", phFrom: "e.g. Mumbai", phTo: "e.g. Pune",
    compare: "Compare routes", swap: "Swap from and to", try: "Try:",
    legendOnCovered: "On road, pass covers", legendNearCovered: "Nearby / interchange, pass covers",
    legendOnPaid: "On road, you pay", legendNearPaid: "Nearby, you pay", legendUnknown: "Unknown",
    whatColours: "ⓘ What do the colours mean?",
    reportBtn: "＋ Report a toll", reportTitle: "Report a toll", takePhoto: "📷 Take a photo of the toll board",
    retakePhoto: "Retake photo", gettingLoc: "📍 Getting your location…", locFound: "📍 Location found (accurate to about {m} m)",
    locNone: "📍 Location not available on this device.", locBlocked: "📍 Location blocked.", tryAgain: "Try again",
    coveredQ: "Is this toll covered by the FASTag Annual Pass?", typeNhai: "NHAI / National", typeState: "State / Local",
    typeUnknown: "Don't know", addMore: "Add name or mobile (optional)", phTollName: "Toll name (if you know it)",
    phMobile: "Mobile number (optional)", mobileNote: "Your number is used only to contact you about this report. It is never shown in the app.",
    cancel: "Cancel", sendReport: "Send report", gotIt: "Got it", helpTitle: "How to read the map",
    storageFull: "Phone storage is full: delete older reports first.",
    reportThanks: "Thank you! Your toll report is saved. It will be checked before it is added for everyone.",
    reportedByYou: "Toll you reported", waitingReview: "waiting for review",
    plazasLoaded: "{n} toll plazas loaded (unconfirmed data).", plazasFail: "Could not load plaza data.",
    findingPlaces: "Finding places…", findingRoutes: "Finding routes…", routesFound: "{from} → {to}: {n} route(s) found.",
    notFound: "We couldn't find \"{q}\". Please type the nearest city or town instead (for example, the town your village is near).",
    usingInstead: "Using {place} (you typed {typed}).", noMatch: "No match for this name. Try the nearest city or town instead.",
    kmFrom: "{km} km from {place}", genericError: "Something went wrong.", noRoute: "No route found",
    route: "Route", bestForPass: "Best for pass", tolls1: "1 toll:", tollsN: "{n} tolls:", tolls0: "0 tolls",
    youPay: "{n} you pay", coveredByPass: "{n} covered by pass", unknownN: "{n} unknown",
    usesTrips: "uses <b>{n} Annual Pass trips</b>", noTollsData: "<b>No tolls in our data</b> for this road. The data has gaps, so it may still have tolls.",
    zeroExtra: "<b class=\"ok\">₹0 extra</b>: every toll we know of is covered by the pass",
    extraUnknown: "<b>Extra cost unknown</b>: {n} toll(s) not yet confirmed as covered or not",
    extraPay: "<b class=\"paid\">{amt} extra</b>", unknownAmt: "Unknown", unpriced: " + {n} toll(s) with unknown rate",
    unknownCoverage: " · {n} toll(s) with unknown coverage", tollList: "Toll list",
    mainRoads: "Main roads: <b>{roads}</b>. In Google/Apple Maps, pick the route via these roads; the toll list is for this road only.",
    showOnMap: "Show on map", googleMaps: "Google Maps ↗", appleMaps: "Apple Maps ↗", saveRoute: "☆ Save route", share: "Share ↗",
    expressway: "Expressway", closedToll: "(closed toll, pay once)", enterExit: "enter near {a}, exit near {b}",
    myRoutes: "My routes", via: "via {r}", savedPay: "{p} you pay, {c} covered", delete: "Delete",
    savedMsg: "Saved: {from} → {to}{via}.", copied: "Route summary copied. Paste it in WhatsApp or anywhere.",
    shareTolls: "{km} km, {time}. {n} tolls: {p} you pay, {c} covered by FASTag Annual Pass (uses {t} pass trips).",
    shareCovered: "covered by pass", sharePay: "YOU PAY", shareUnknown: "unknown",
    shareOpen: "Open in Google Maps: {url}", shareNote: "(Toll info is for planning; check the road on Google Maps before driving.)",
    popCovered: "Covered by Annual Pass (national plaza)", popPaid: "Not covered (state plaza): you pay", popUnknown: "Coverage unknown",
    carOneWay: "Car one-way: {v}", rateUnknown: "Rate unknown", why: "Why: {w}", operator: "Operator: {o}",
    locDoubt: "Location may be wrong in source data", sources: "Sources: {s} · unconfirmed",
    onThisRoad: "On this road", nearbyNot: "Nearby, not on this road", interchange: "Expressway interchange you drive past (no extra toll)",
    h: "h", min: "min",
    myLocation: "My location",
    locOff: "Location is off. Allow location for this site in your phone or browser settings.",
    reportSoon: "Reporting tolls is coming soon. Thank you for wanting to help!",
    installApp: "⬇ Install app",
    installIos: "To install on iPhone: in Safari tap the Share button <b>⬆︎</b>, then <b>Add to Home Screen</b>.",
    installOther: "To install: open your browser menu <b>⋮</b> and choose <b>Install app</b> or <b>Add to Home screen</b>.",
    planningNote: "<b>For planning only.</b> Use it to see which tolls are on a route. Drive with Google Maps or Apple Maps: they show live traffic, road closures and construction.",
    helpCovered: "<b>On your road: pass covers it.</b> A national highway or national expressway toll. With the FASTag Annual Pass you pay nothing here; it uses one of your pass trips.",
    helpNearCovered: "<b>Nearby, pass covers it.</b> Not on your road (within 5 km), or an expressway interchange you drive past without stopping. No toll for you on this route.",
    helpPaid: "<b>On your road: you pay.</b> A state, city or private toll. The Annual Pass is <b>not</b> valid here; the normal FASTag charge is taken.",
    helpNearPaid: "<b>Nearby, you pay.</b> A pay toll within 5 km of your road. Not on this route, but you would hit it if you change roads.",
    helpUnknown: "<b>Unknown.</b> The official lists disagree or say nothing about this toll. We are checking these one by one.",
    helpReported: "<b>Reported by you.</b> A toll you added with \"Report a toll\", waiting for review.",
    helpTripsTitle: "How the Annual Pass counts trips",
    helpTrip1: "Valid for private cars, jeeps and vans, at national highway and national expressway toll plazas only.",
    helpTrip2: "It lasts one year or 200 trips, whichever comes first.",
    helpTrip3: "<b>Normal toll plaza:</b> every crossing is one trip. Going and coming back is two trips.",
    helpTrip4: "<b>Closed expressway</b> (you pay between where you get on and where you get off, e.g. the Delhi–Mumbai Expressway): one entry and exit together is <b>one trip</b>.",
    helpSrc: "Source: IHMCL Annual Pass FAQ (Q11) and the Ministry of Road Transport & Highways.",
    helpBestTitle: "\"Best for pass\"",
    helpBest: "The route with the fewest tolls you pay, then the fewest pass trips used. A faster route wins only if it saves more than 15 minutes.",
    helpDataTitle: "Where the data comes from",
    helpData: "The official list of national highway toll plazas (IHMCL, July 2026), the FASTag toll plaza list (NETC, September 2026), OpenStreetMap and GeoNames. Rates are older (2022–2024) and only a guide.",
    helpNoteTitle: "Please note",
    helpNote: "<b>This is for planning.</b> Drive with Google Maps or Apple Maps: they know about traffic, closures and construction. If a toll is wrong, tap <b>＋ Report a toll</b> when you are there.",
    footerNote: "<strong>Unconfirmed data.</strong> Pass coverage comes from IHMCL's National Highway fee plaza list (July 2026); locations from the NETC FASTag plaza list (Sep 2026) and OpenStreetMap. Rates are 2022–2024 estimates. Check plazas in the Rajmargyatra app before you rely on them.",
  },
  hi: {
    title: "TollCheck India",
    sub: "भारत के हाईवे के लिए: आपकी यात्रा में कौन से टोल FASTag एनुअल पास में शामिल हैं?",
    howItWorks: "ⓘ यह कैसे काम करता है",
    from: "कहाँ से", to: "कहाँ तक", phFrom: "जैसे: मुंबई", phTo: "जैसे: पुणे",
    compare: "रूट देखें", swap: "कहाँ से / कहाँ तक बदलें", try: "आज़माएँ:",
    legendOnCovered: "रास्ते पर, पास में शामिल", legendNearCovered: "आसपास / इंटरचेंज, पास में शामिल",
    legendOnPaid: "रास्ते पर, आपको भुगतान करना होगा", legendNearPaid: "आसपास, भुगतान वाला", legendUnknown: "पता नहीं",
    whatColours: "ⓘ रंगों का मतलब क्या है?",
    reportBtn: "＋ टोल बताएँ", reportTitle: "टोल की जानकारी दें", takePhoto: "📷 टोल बोर्ड की फ़ोटो लें",
    retakePhoto: "दोबारा फ़ोटो लें", gettingLoc: "📍 आपकी लोकेशन ली जा रही है…", locFound: "📍 लोकेशन मिल गई (लगभग {m} मीटर तक सही)",
    locNone: "📍 इस डिवाइस पर लोकेशन उपलब्ध नहीं है।", locBlocked: "📍 लोकेशन की अनुमति नहीं मिली।", tryAgain: "फिर से कोशिश करें",
    coveredQ: "क्या यह टोल FASTag एनुअल पास में शामिल है?", typeNhai: "NHAI / राष्ट्रीय", typeState: "राज्य / स्थानीय",
    typeUnknown: "पता नहीं", addMore: "नाम या मोबाइल जोड़ें (वैकल्पिक)", phTollName: "टोल का नाम (अगर पता हो)",
    phMobile: "मोबाइल नंबर (वैकल्पिक)", mobileNote: "आपका नंबर सिर्फ़ इस जानकारी के बारे में आपसे संपर्क करने के लिए है। यह ऐप में कभी नहीं दिखेगा।",
    cancel: "रद्द करें", sendReport: "भेजें", gotIt: "समझ गया", helpTitle: "नक्शा कैसे पढ़ें",
    storageFull: "फ़ोन की मेमोरी भर गई है: पहले पुरानी जानकारी हटाएँ।",
    reportThanks: "धन्यवाद! आपकी टोल जानकारी सेव हो गई है। सबके लिए जोड़ने से पहले इसकी जाँच होगी।",
    reportedByYou: "आपके बताए टोल", waitingReview: "जाँच बाकी है",
    plazasLoaded: "{n} टोल प्लाज़ा लोड हुए (जानकारी अपुष्ट है)।", plazasFail: "टोल प्लाज़ा का डेटा लोड नहीं हो सका।",
    findingPlaces: "जगहें ढूँढी जा रही हैं…", findingRoutes: "रूट ढूँढे जा रहे हैं…", routesFound: "{from} → {to}: {n} रूट मिले।",
    notFound: "\"{q}\" नहीं मिला। कृपया पास का शहर या कस्बा लिखें (जैसे, आपका गाँव जिस कस्बे के पास है)।",
    usingInstead: "{place} लिया गया (आपने {typed} लिखा था)।", noMatch: "इस नाम से कुछ नहीं मिला। पास का शहर या कस्बा लिखकर देखें।",
    kmFrom: "{place} से {km} किमी", genericError: "कुछ गड़बड़ हो गई।", noRoute: "कोई रूट नहीं मिला",
    route: "रूट", bestForPass: "पास के लिए सबसे अच्छा", tolls1: "1 टोल:", tollsN: "{n} टोल:", tolls0: "0 टोल",
    youPay: "{n} पर भुगतान", coveredByPass: "{n} पास में शामिल", unknownN: "{n} का पता नहीं",
    usesTrips: "<b>{n} एनुअल पास ट्रिप</b> लगेंगी", noTollsData: "इस सड़क के लिए <b>हमारे डेटा में कोई टोल नहीं</b>। डेटा अधूरा है, इसलिए टोल हो भी सकता है।",
    zeroExtra: "<b class=\"ok\">₹0 अतिरिक्त</b>: हमें पता हर टोल पास में शामिल है",
    extraUnknown: "<b>अतिरिक्त खर्च पता नहीं</b>: {n} टोल की पुष्टि अभी बाकी है",
    extraPay: "<b class=\"paid\">अतिरिक्त खर्च: {amt}</b>", unknownAmt: "पता नहीं", unpriced: " + {n} टोल की दर पता नहीं",
    unknownCoverage: " · {n} टोल के बारे में पता नहीं", tollList: "टोल की सूची",
    mainRoads: "मुख्य सड़कें: <b>{roads}</b>। Google/Apple Maps में इन्हीं सड़कों वाला रूट चुनें; टोल सूची सिर्फ़ इसी रूट की है।",
    showOnMap: "नक्शे पर देखें", googleMaps: "Google Maps ↗", appleMaps: "Apple Maps ↗", saveRoute: "☆ रूट सेव करें", share: "शेयर करें ↗",
    expressway: "एक्सप्रेसवे", closedToll: "(क्लोज़्ड टोल, एक बार भुगतान)", enterExit: "{a} के पास चढ़ें, {b} के पास उतरें",
    myRoutes: "मेरे रूट", via: "{r} से होकर", savedPay: "{p} पर भुगतान, {c} शामिल", delete: "हटाएँ",
    savedMsg: "सेव हो गया: {from} → {to}{via}।", copied: "रूट की जानकारी कॉपी हो गई। WhatsApp या कहीं भी पेस्ट करें।",
    shareTolls: "{km} किमी, {time}। {n} टोल: {p} पर भुगतान, {c} FASTag एनुअल पास में शामिल ({t} पास ट्रिप)।",
    shareCovered: "पास में शामिल", sharePay: "भुगतान करना होगा", shareUnknown: "पता नहीं",
    shareOpen: "Google Maps में खोलें: {url}", shareNote: "(टोल की जानकारी योजना के लिए है; चलने से पहले Google Maps पर सड़क देख लें।)",
    popCovered: "एनुअल पास में शामिल (राष्ट्रीय प्लाज़ा)", popPaid: "पास में शामिल नहीं (राज्य प्लाज़ा): भुगतान करना होगा", popUnknown: "पता नहीं",
    carOneWay: "कार, एक तरफ़: {v}", rateUnknown: "दर पता नहीं", why: "कारण: {w}", operator: "संचालक: {o}",
    locDoubt: "स्रोत में लोकेशन गलत हो सकती है", sources: "स्रोत: {s} · अपुष्ट",
    onThisRoad: "इसी रास्ते पर", nearbyNot: "आसपास, इस रास्ते पर नहीं", interchange: "एक्सप्रेसवे इंटरचेंज जिसके पास से आप गुज़रते हैं (कोई अतिरिक्त टोल नहीं)",
    h: "घंटे", min: "मिनट",
    myLocation: "मेरी लोकेशन",
    locOff: "लोकेशन बंद है। फ़ोन या ब्राउज़र की सेटिंग में इस साइट के लिए लोकेशन की अनुमति दें।",
    reportSoon: "टोल की जानकारी देने की सुविधा जल्द आ रही है। मदद करना चाहने के लिए धन्यवाद!",
    installApp: "⬇ ऐप इंस्टॉल करें",
    installIos: "iPhone पर इंस्टॉल करने के लिए: Safari में शेयर बटन <b>⬆︎</b> दबाएँ, फिर <b>Add to Home Screen</b> चुनें।",
    installOther: "इंस्टॉल करने के लिए: ब्राउज़र का मेन्यू <b>⋮</b> खोलें और <b>Install app</b> या <b>Add to Home screen</b> चुनें।",
    planningNote: "<b>सिर्फ़ योजना के लिए।</b> इससे देखें कि रास्ते में कौन से टोल हैं। गाड़ी चलाते समय Google Maps या Apple Maps इस्तेमाल करें: उनमें लाइव ट्रैफ़िक, बंद सड़कें और निर्माण कार्य दिखते हैं।",
    helpCovered: "<b>आपके रास्ते पर: पास में शामिल।</b> राष्ट्रीय राजमार्ग या राष्ट्रीय एक्सप्रेसवे का टोल। FASTag एनुअल पास से यहाँ कोई पैसा नहीं लगता; आपकी एक पास ट्रिप लगती है।",
    helpNearCovered: "<b>आसपास, पास में शामिल।</b> आपके रास्ते पर नहीं (5 किमी के अंदर), या एक्सप्रेसवे का इंटरचेंज जिसके पास से आप बिना रुके गुज़रते हैं। इस रूट पर आपके लिए कोई टोल नहीं।",
    helpPaid: "<b>आपके रास्ते पर: भुगतान करना होगा।</b> राज्य, शहर या निजी टोल। यहाँ एनुअल पास <b>मान्य नहीं</b> है; FASTag से सामान्य शुल्क कटेगा।",
    helpNearPaid: "<b>आसपास, भुगतान वाला।</b> आपकी सड़क से 5 किमी के अंदर भुगतान वाला टोल। इस रूट पर नहीं, पर सड़क बदलने पर आ सकता है।",
    helpUnknown: "<b>पता नहीं।</b> सरकारी सूचियाँ इस टोल के बारे में अलग-अलग बात कहती हैं या कुछ नहीं कहतीं। हम इन्हें एक-एक करके जाँच रहे हैं।",
    helpReported: "<b>आपके बताए टोल।</b> \"टोल बताएँ\" से जोड़ा गया टोल, जिसकी जाँच बाकी है।",
    helpTripsTitle: "एनुअल पास ट्रिप कैसे गिनता है",
    helpTrip1: "सिर्फ़ निजी कार, जीप और वैन के लिए, और सिर्फ़ राष्ट्रीय राजमार्ग व राष्ट्रीय एक्सप्रेसवे के टोल प्लाज़ा पर मान्य।",
    helpTrip2: "एक साल या 200 ट्रिप, जो भी पहले पूरा हो।",
    helpTrip3: "<b>सामान्य टोल प्लाज़ा:</b> हर बार पार करना एक ट्रिप है। जाना और वापस आना दो ट्रिप हैं।",
    helpTrip4: "<b>क्लोज़्ड एक्सप्रेसवे</b> (जहाँ से चढ़ें और जहाँ उतरें, उसके बीच का भुगतान, जैसे दिल्ली–मुंबई एक्सप्रेसवे): एक बार चढ़ना और उतरना मिलकर <b>एक ट्रिप</b>।",
    helpSrc: "स्रोत: IHMCL एनुअल पास FAQ (प्रश्न 11) और सड़क परिवहन एवं राजमार्ग मंत्रालय।",
    helpBestTitle: "\"पास के लिए सबसे अच्छा\"",
    helpBest: "वह रूट जिसमें सबसे कम टोल पर भुगतान करना पड़े, फिर सबसे कम पास ट्रिप लगें। तेज़ रूट तभी चुना जाता है जब वह 15 मिनट से ज़्यादा बचाए।",
    helpDataTitle: "डेटा कहाँ से आता है",
    helpData: "राष्ट्रीय राजमार्ग टोल प्लाज़ा की सरकारी सूची (IHMCL, जुलाई 2026), FASTag टोल प्लाज़ा सूची (NETC, सितंबर 2026), OpenStreetMap और GeoNames। टोल दरें पुरानी हैं (2022–2024) और सिर्फ़ अंदाज़े के लिए हैं।",
    helpNoteTitle: "ध्यान दें",
    helpNote: "<b>यह सिर्फ़ योजना के लिए है।</b> गाड़ी चलाते समय Google Maps या Apple Maps इस्तेमाल करें: उन्हें ट्रैफ़िक, बंद सड़कों और निर्माण कार्य की जानकारी रहती है। अगर कोई टोल गलत दिखे, तो वहाँ पहुँचकर <b>＋ टोल बताएँ</b> दबाएँ।",
    footerNote: "<strong>जानकारी अपुष्ट है।</strong> पास में शामिल टोल की जानकारी IHMCL की राष्ट्रीय राजमार्ग टोल सूची (जुलाई 2026) से; लोकेशन NETC FASTag सूची (सितंबर 2026) और OpenStreetMap से। दरें 2022–2024 का अंदाज़ा हैं। भरोसा करने से पहले Rajmargyatra ऐप में टोल जाँच लें।",
  },
};
// Dropdown order (agreed): English, Hindi, then the other major Indian languages.
// en + hi live in this file; the others are loaded on demand from lang/<code>.json (draft translations).
const LANGS = [["en", "English"], ["hi", "हिंदी"], ["gu", "ગુજરાતી"], ["mr", "मराठी"], ["bn", "বাংলা"], ["pa", "ਪੰਜਾਬੀ"],
               ["kn", "ಕನ್ನಡ"], ["ta", "தமிழ்"], ["te", "తెలుగు"], ["ml", "മലയാളം"]];
async function loadLang(code) {
  if (I18N[code]) return true;
  try { const r = await fetch(`lang/${code}.json`); if (!r.ok) return false; I18N[code] = await r.json(); return true; }
  catch { return false; }
}
const LANG_KEY = "fastag-pass-routes:lang";
let LANG = (() => {
  const q = new URLSearchParams(location.search).get("lang");
  if (q && LANGS.some(([c]) => c === q)) return q;
  try { return localStorage.getItem(LANG_KEY) || "en"; } catch { return "en"; }
})();
function t(key, vars = {}) {
  const s = (I18N[LANG] && I18N[LANG][key]) ?? I18N.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}
function applyLang() {
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });   // our own texts only
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => { el.title = t(el.dataset.i18nTitle); el.setAttribute("aria-label", t(el.dataset.i18nTitle)); });
  const sel = document.getElementById("lang");
  if (sel && !sel.options.length) sel.innerHTML = LANGS.map(([c, n]) => `<option value="${c}">${n}</option>`).join("");
  if (sel) sel.value = LANG;
  document.title = t("title");
}
async function setLang(l) {
  await loadLang(l);
  LANG = I18N[l] ? l : "en";
  try { localStorage.setItem(LANG_KEY, l); } catch { /* not saved */ }
  applyLang();
  document.dispatchEvent(new Event("langchange"));
}

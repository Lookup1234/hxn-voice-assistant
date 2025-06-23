let recognition;
let isListening = false;
let openedWindows = [];
let allCoins = [];

const reminders = [];


// Speech Recognition start
function startListening() {
  if (isListening) return;
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-IN";
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;
    document.getElementById("status").textContent = "🎧 Listening... Say 'stop listening' to mute.";
  };

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    document.getElementById("user-text").textContent = transcript;
    respondToCommand(transcript.toLowerCase());
  };

  recognition.onerror = (event) => {
    console.error("Recognition error:", event.error);
    recognition.stop();
    isListening = false;
    document.getElementById("status").textContent = "❌ Error occurred. Click to restart.";
  };

  recognition.onend = () => {
    if (isListening) recognition.start();
  };

  recognition.start();
}

function stopListening() {
  if (recognition && isListening) {
    recognition.stop();
    isListening = false;
    document.getElementById("status").textContent = "🔇 Muted. Say 'start listening' or click to reactivate.";
  }
}

function detectLang(text) {
  const devanagariRegex = /[\u0900-\u097F]/;
  return devanagariRegex.test(text) ? "hi" : "en";
}

function speak(text, lang = "en") {
  if (!text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === "hi" ? "hi-IN" : "en-US";

  // Optional: pick correct voice
  const voices = window.speechSynthesis.getVoices();
  const voiceMatch = voices.find(v => v.lang === utterance.lang);
  if (voiceMatch) utterance.voice = voiceMatch;

  window.speechSynthesis.speak(utterance);
}

async function respond(text, langOverride = null) {
  const userText = document.getElementById("user-text").textContent;
  const detectedLang = langOverride || detectLang(userText);

  if (detectedLang === "hi") {
    try {
      const response = await fetch("https://libretranslate.de/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: "en",
          target: "hi",
          format: "text"
        })
      });

      const data = await response.json();
      const translated = data.translatedText;

      speak(translated, "hi");
      document.getElementById("ai-text").textContent = translated;
    } catch (err) {
      console.error("Translation error:", err);
      speak(text, "en");
      document.getElementById("ai-text").textContent = text;
    }
  } else {
    speak(text, "en");
    document.getElementById("ai-text").textContent = text;
  }
}


function openLink(url) {
  const frame = document.getElementById("ai-frame");
  frame.src = url;
  frame.style.display = "block";
  const closeBtn = document.getElementById("close-frame-btn");
  if (closeBtn) closeBtn.style.display = "inline-block";
}

function closeIframe() {
  const frame = document.getElementById("ai-frame");
  const closeBtn = document.getElementById("close-frame-btn");
  if (frame) frame.src = "", frame.style.display = "none";
  if (closeBtn) closeBtn.style.display = "none";
}

function closeAllOpenedWindows() {
  openedWindows = openedWindows.filter(win => {
    if (!win.closed) { win.close(); return false; }
    return false;
  });
  openedWindows = [];
}

function setReminder(task, delayMs) {
  reminders.push({ task, time: Date.now() + delayMs });
  document.getElementById("reminderStatus").textContent = `Reminder set for: ${task}`;
  setTimeout(() => {
    alert(`Reminder: ${task}`);
    speak(`Reminder: ${task}`);
    document.getElementById("reminderStatus").textContent = `No reminders set.`;
  }, delayMs);
}

function loadTopicFreq() {
  const freqStr = localStorage.getItem("topicFrequency");
  return freqStr ? JSON.parse(freqStr) : {};
}

function saveTopicFreq(freq) {
  try {
    localStorage.setItem("topicFrequency", JSON.stringify(freq));
  } catch {}
}

function trackTopicFrequency(topic) {
  if (!topic) return;
  const freq = loadTopicFreq();
  freq[topic] = (freq[topic] || 0) + 1;
  saveTopicFreq(freq);
}

function suggestRelatedTopics(topic) {
  const freq = loadTopicFreq();
  if (freq[topic] >= 3) {
    respond(`You’ve asked about ${topic} a few times. Want related topics?`);
  }
}

function saveUserInterest(topic) {
  if (!topic) {
    respond("Please tell me what you like after saying 'I like'.");
    return;
  }
  let interests = JSON.parse(localStorage.getItem("userInterests") || "[]");
  if (!interests.includes(topic)) {
    interests.push(topic);
    localStorage.setItem("userInterests", JSON.stringify(interests));
    respond(`Got it, you like ${topic}.`);
  } else {
    respond(`I already know you like ${topic}.`);
  }
}

function recallUserInterest() {
  let interests = JSON.parse(localStorage.getItem("userInterests") || "[]");
  if (interests.length > 0) {
    respond(`You’ve told me you like: ${interests.join(", ")}`);
  } else {
    respond("You haven't told me what you like yet.");
  }
}

function clearMemory() {
  localStorage.removeItem("userInterests");
  localStorage.removeItem("topicFrequency");
  respond("Memory cleared.");
}

function extractMainTopic(text) {
  const removePhrases = ["tell me about", "what is", "who is", "price of", "play", "news", "i like"];
  let topic = text.toLowerCase();
  removePhrases.forEach(phrase => topic = topic.replace(phrase, ""));
  return topic.trim().split(" ")[0] || "";
}

// === API HANDLERS ===
function getWikipediaSummary(query, callback) {
  fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`)
    .then(response => response.json())
    .then(data => {
      if (data.extract) {
        respond(data.extract); // Uses smart detection and speaks accordingly
        if (callback) callback(true);
      } else {
        if (callback) callback(false);
      }
    })
    .catch(() => {
      respond("Sorry, I had trouble reaching Wikipedia.");
      if (callback) callback(false);
    });
}

async function loadAllCoinsWithNames() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/coins/list");
    allCoins = await res.json(); // [{ id, symbol, name }]
    console.log(`✅ Loaded ${allCoins.length} coins from CoinGecko`);

    // Optional preview in console
    const formatted = allCoins.map(c => `${capitalize(c.name)} (${c.symbol.toUpperCase()})`);
    console.log("🔍 Top Coins:", formatted.slice(0, 20));
    localStorage.setItem("allCoinsList", JSON.stringify(formatted));
  } catch (err) {
    console.error("❌ Failed to load coin list:", err);
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function findCoinIdFromUserInput(text) {
  const cleanedText = text.toLowerCase().trim().replace(/[^\w\s]/gi, "");

  return (
    allCoins.find(c => cleanedText === c.symbol.toLowerCase())?.id ||
    allCoins.find(c => cleanedText === c.name.toLowerCase())?.id ||
    allCoins.find(c =>
      cleanedText.includes(c.symbol.toLowerCase()) || cleanedText.includes(c.name.toLowerCase())
    )?.id || null
  );
}

function getCryptoPrice(userInput) {
  const coinId = findCoinIdFromUserInput(userInput);

  if (!coinId) {
    // Suggest similar coins (top 3 matches)
    const matches = allCoins
      .filter(c =>
        c.name.toLowerCase().includes(userInput.toLowerCase()) ||
        c.symbol.toLowerCase().includes(userInput.toLowerCase())
      )
      .slice(0, 3)
      .map(c => `${capitalize(c.name)} (${c.symbol.toUpperCase()})`)
      .join(", ");

    const suggestionMsg = matches
      ? `❌ I couldn’t find "${userInput}". Did you mean: ${matches}?`
      : `❌ I couldn’t find any coin related to "${userInput}". Try a different name or symbol.`;

    respond(suggestionMsg);
    return;
  }

  fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd,inr`)
    .then(res => res.json())
    .then(data => {
      if (data[coinId]?.usd) {
        const usd = data[coinId].usd.toLocaleString(undefined, { minimumFractionDigits: 2 });
        const inr = data[coinId].inr.toLocaleString(undefined, { minimumFractionDigits: 2 });

        respond(`🪙 The current price of ${capitalize(coinId)} is $${usd} USD or ₹${inr} INR.`);
      } else {
        respond(`⚠️ I couldn’t retrieve the price for ${capitalize(coinId)}.`);
      }
    })
    .catch(() => respond("🚫 Error fetching cryptocurrency price."));
}

// Auto-load on page
window.onload = () => {
  loadAllCoinsWithNames();
};


function getWeather(city) {
  fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json`)
    .then(res => res.json())
    .then(locationData => {
      if (!locationData.length) return respond(`Location not found: ${city}`);
      const { lat, lon } = locationData[0];
      return fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    })
    .then(res => res?.json?.())
    .then(weather => {
      const w = weather?.current_weather;
      if (!w) return respond(`No weather data.`);
      respond(`Weather in ${city}: ${w.temperature}°C, Wind ${w.windspeed} km/h`);
    })
    .catch(() => respond("Error getting weather."));
}

function getNews() {
  fetch("https://gnews.io/api/v4/top-headlines?lang=en&country=in&max=3&token=27dbfa23b24a7a7be1f7d75f1e73e4d0")
    .then(res => res.json())
    .then(data => {
      const headlines = data.articles?.map(a => a.title).join(". ");
      respond(headlines ? `Top news: ${headlines}` : "No news available.");
    })
    .catch(() => respond("Error fetching news."));
}

function getDefinition(word) {
  fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
    .then(res => res.json())
    .then(data => {
      if (data.title === "No Definitions Found") return respond("Definition not found.");
      const meaning = data[0]?.meanings?.[0]?.definitions?.[0]?.definition;
      respond(`Definition of ${word}: ${meaning}`);
    })
    .catch(() => respond("Definition error."));
}

function getTrivia() {
  fetch("https://opentdb.com/api.php?amount=1&type=multiple")
    .then(res => res.json())
    .then(data => {
      const q = data.results?.[0]?.question.replace(/&quot;/g, '"').replace(/&#039;/g, "'");
      respond(q ? `Trivia: ${q}` : "Trivia not available.");
    })
    .catch(() => respond("Trivia error."));
}

// === Main command router ===
function respondToCommand(text) {
  text = text.toLowerCase();
  closeIframe();

  if (text.startsWith("i like ")) return saveUserInterest(text.replace("i like ", "").trim());
  if (text.includes("what do i like") || text.includes("remember what i like")) return recallUserInterest();
  if (text.includes("forget what i like") || text.includes("clear memory")) return clearMemory();

  const topic = extractMainTopic(text);
  if (topic) trackTopicFrequency(topic), suggestRelatedTopics(topic);

  if (text.includes("remind me to")) {
    const m = text.match(/remind me to (.+) in (\d+) (second|seconds|minute|minutes|hour|hours)/);
    if (!m) return respond("Say: 'remind me to drink water in 10 minutes'");
    const task = m[1], amt = +m[2], unit = m[3];
    const delay = unit.startsWith("second") ? amt * 1000 : unit.startsWith("minute") ? amt * 60000 : amt * 3600000;
    setReminder(task, delay);
    return respond(`Reminder set for ${task} in ${amt} ${unit}`);
  }

  if (/hello|hi|hey/.test(text)) return respond("Hello! How can I help?");
  if (text.includes("how are you")) return respond("I'm great, thanks!");
  if (text.includes("time")) return respond("It's " + new Date().toLocaleTimeString());
  if (text.includes("date")) return respond("Today is " + new Date().toLocaleDateString());
  if (text.includes("your name")) return respond("I am HXN, your AI assistant.");
  if (text.includes("tell me a joke")) {
    const jokes = [
      "Why don't robots panic? They’ve got nerves of steel!",
      "Why did the computer visit the doctor? It had a virus!",
      "Why do programmers prefer dark mode? Because light attracts bugs!"
    ];
    return respond(jokes[Math.floor(Math.random() * jokes.length)]);
  }
  if (text.includes("weather in")) {
    const m = text.match(/weather in ([a-zA-Z\s]+)/);
    return m ? getWeather(m[1].trim()) : respond("Say: 'weather in Mumbai'");
  }
  if (text.includes("latest news") || text.includes("news update")) return getNews();
  if (text.startsWith("define ") || text.startsWith("definition of ")) return getDefinition(text.split(" ").slice(1).join(" "));
  if (text.includes("trivia") || text.includes("quiz") || text.includes("ask me a question")) return getTrivia();
  if (/what is|who is|tell me about|explain/.test(text)) return getWikipediaSummary(text.replace(/what is|who is|tell me about|explain/, "").trim());
if (text.includes("price of") || text.includes("rate of") || text.includes("value of") || text.includes("price")) {
  const cleaned = text
    .replace(/price of|rate of|value of|price/gi, "")
    .trim();
  return getCryptoPrice(cleaned);
}
  if (text.startsWith("play ")) return openLink(`https://www.youtube.com/results?search_query=${encodeURIComponent(text.replace("play ", ""))}`);
  if (text.includes("stop listening") || text.includes("mute")) return stopListening(), respond("Muted.");
  if (text.includes("start listening") || text.includes("wake up")) return startListening(), respond("Listening again.");

// Try Wikipedia first before falling back to Google
getWikipediaSummary(text, function(found) {
  if (!found) {
    respond(`I didn’t find it on Wikipedia. Searching Google for "${text}"`);
    openLink(`https://www.google.com/search?q=${encodeURIComponent(text)}`);
  }
});
}



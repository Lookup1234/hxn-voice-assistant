let recognition;
let isListening = false;
let openedWindows = []; // Track opened windows to close or focus back if needed

const reminders = [];
const coinMap = {
  bitcoin: "bitcoin",
  btc: "bitcoin",
  ethereum: "ethereum",
  eth: "ethereum",
  bnb: "binancecoin",
  binancecoin: "binancecoin",
  dogecoin: "dogecoin",
  doge: "dogecoin",
  litecoin: "litecoin",
  ltc: "litecoin",
  // add more coins if needed
};

// Speech Recognition start
function startListening() {
  if (isListening) return;

  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";
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
    if (isListening) recognition.start(); // Restart listening for continuous recognition
  };

  recognition.start();
}

// Stop speech recognition
function stopListening() {
  if (recognition && isListening) {
    recognition.stop();
    isListening = false;
    document.getElementById("status").textContent = "🔇 Muted. Say 'start listening' or click button to reactivate.";
  }
}

// Text-to-speech
function speak(text) {
  if (!text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
}

// Reminder feature
function setReminder(task, delayMs) {
  reminders.push({ task, time: Date.now() + delayMs });
  document.getElementById("reminderStatus").textContent = `Reminder set for: ${task}`;

  setTimeout(() => {
    alert(`Reminder: ${task}`);
    speak(`Reminder: ${task}`);
    document.getElementById("reminderStatus").textContent = `No reminders set.`;
  }, delayMs);
}

// Wikipedia summary fetch
function getWikipediaSummary(query) {
  fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`)
    .then(response => response.json())
    .then(data => {
      if (data.extract) {
        speak(data.extract);
        document.getElementById('ai-text').textContent = data.extract;
      } else {
        speak("Sorry, I couldn't find information on that topic.");
        document.getElementById('ai-text').textContent = "No info found.";
      }
    })
    .catch(() => {
      speak("Sorry, I had trouble reaching Wikipedia.");
      document.getElementById('ai-text').textContent = "Error fetching Wikipedia.";
    });
}

// Crypto price fetch
function getCryptoPrice(coin) {
  fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`)
    .then(response => response.json())
    .then(data => {
      if (data[coin] && data[coin].usd) {
        const price = data[coin].usd;
        const reply = `The current price of ${coin} is $${price} USD.`;
        speak(reply);
        document.getElementById('ai-text').textContent = reply;
      } else {
        speak("Sorry, I couldn't find that cryptocurrency.");
        document.getElementById('ai-text').textContent = "Crypto not found.";
      }
    })
    .catch(() => {
      speak("Sorry, I had trouble fetching cryptocurrency prices.");
      document.getElementById('ai-text').textContent = "Error fetching crypto.";
    });
}

// Open URL in iframe
function openLink(url) {
  const frame = document.getElementById("ai-frame");
  frame.src = url;
  frame.style.display = "block";
  const closeBtn = document.getElementById("close-frame-btn");
  if (closeBtn) closeBtn.style.display = "inline-block";
}

// Close iframe and hide close button
function closeIframe() {
  const frame = document.getElementById("ai-frame");
  const closeBtn = document.getElementById("close-frame-btn");
  if (frame) {
    frame.src = "";
    frame.style.display = "none";
  }
  if (closeBtn) {
    closeBtn.style.display = "none";
  }
}

// Close all opened windows (for popups if any)
function closeAllOpenedWindows() {
  openedWindows = openedWindows.filter(win => {
    if (!win.closed) {
      win.close();
      return false;
    }
    return false;
  });
  openedWindows = [];
}

// Respond helper
function respond(text) {
  speak(text);
  document.getElementById("ai-text").textContent = text;
}

// USER INTEREST TRACKING — for frequency and suggestions

// Load frequency map from localStorage
function loadTopicFreq() {
  const freqStr = localStorage.getItem("topicFrequency");
  return freqStr ? JSON.parse(freqStr) : {};
}

// Save frequency map to localStorage
function saveTopicFreq(freq) {
  try {
    localStorage.setItem("topicFrequency", JSON.stringify(freq));
  } catch {
    // localStorage full or blocked; optionally clear or ignore
  }
}

// Track topic frequency count
function trackTopicFrequency(topic) {
  if (!topic) return;
  const freq = loadTopicFreq();
  freq[topic] = (freq[topic] || 0) + 1;
  saveTopicFreq(freq);
}

// Suggest related topics after repeated queries
function suggestRelatedTopics(topic) {
  const freq = loadTopicFreq();
  if (freq[topic] >= 3) { // after 3 or more times
    respond(`I've noticed you ask about ${topic} quite a bit. Would you like me to suggest related topics or more details?`);
  }
}

// Save user liked topics (memory)
function saveUserInterest(topic) {
  if (!topic) {
    respond("Please tell me what you like after saying 'I like'.");
    return;
  }
  let interests = JSON.parse(localStorage.getItem("userInterests") || "[]");
  if (!interests.includes(topic)) {
    interests.push(topic);
    localStorage.setItem("userInterests", JSON.stringify(interests));
    respond(`Got it, I will remember that you like ${topic}.`);
  } else {
    respond(`I already know you like ${topic}.`);
  }
}

// Recall user interests
function recallUserInterest() {
  let interests = JSON.parse(localStorage.getItem("userInterests") || "[]");
  if (interests.length > 0) {
    respond(`You have told me you like: ${interests.join(", ")}.`);
  } else {
    respond("You haven't told me what you like yet.");
  }
}

// Clear memory
function clearMemory() {
  localStorage.removeItem("userInterests");
  localStorage.removeItem("topicFrequency");
  respond("I've cleared my memory of what you like.");
}

// Extract main topic keyword from user text (simple)
function extractMainTopic(text) {
  const removePhrases = ["tell me about", "what is", "who is", "price of", "play", "news", "i like"];
  let topic = text.toLowerCase();
  removePhrases.forEach(phrase => {
    topic = topic.replace(phrase, "");
  });
  return topic.trim().split(" ")[0] || ""; // first keyword
}

// Main command processor
function respondToCommand(text) {
  text = text.toLowerCase();

  // Auto-close iframe (webview) on any new command
  closeIframe();

  // Save user interest commands
  if (text.startsWith("i like ")) {
    const topic = text.replace("i like ", "").trim();
    saveUserInterest(topic);
    return;
  }

  // Recall user interests
  if (text.includes("what do i like") || text.includes("do you remember what i like")) {
    recallUserInterest();
    return;
  }

  // Clear memory commands
  if (
    text.includes("forget what i like") ||
    text.includes("clear your memory") ||
    text.includes("delete memory") ||
    text.includes("forget memory")
  ) {
    clearMemory();
    return;
  }

  // Track main topic and suggest if repeated
  const mainTopic = extractMainTopic(text);
  if (mainTopic) {
    trackTopicFrequency(mainTopic);
    suggestRelatedTopics(mainTopic);
  }

  // Reminder command
  if (text.includes("remind me to")) {
    const remindText = text.match(/remind me to (.+) in (\d+) (second|seconds|minute|minutes|hour|hours)/);
    if (remindText) {
      const task = remindText[1];
      const amount = parseInt(remindText[2]);
      const unit = remindText[3];
      let delayMs = 0;
      if (unit.startsWith("second")) delayMs = amount * 1000;
      else if (unit.startsWith("minute")) delayMs = amount * 60 * 1000;
      else if (unit.startsWith("hour")) delayMs = amount * 60 * 60 * 1000;

      if (delayMs > 0) {
        setReminder(task, delayMs);
        respond(`Reminder set: ${task} in ${amount} ${unit}`);
      } else {
        respond("Sorry, I couldn't understand the time for the reminder.");
      }
    } else {
      respond("Please specify what to remind and when, like 'remind me to call mom in 10 minutes.'");
    }
    return;
  }

  // Greetings
  if (/hello|hi|hey/.test(text)) {
    respond("Hello! How can I help you today?");
    return;
  }

  if (text.includes("how are you")) {
    respond("I'm doing great, thanks for asking!");
    return;
  }

  if (text.includes("time")) {
    respond("It's " + new Date().toLocaleTimeString());
    return;
  }

  if (text.includes("date")) {
    respond("Today's date is " + new Date().toLocaleDateString());
    return;
  }

  if (text.includes("your name")) {
    respond("I am HXN, your helpful voice assistant!");
    return;
  }

  // Jokes with variety
  if (text.includes("tell me a joke")) {
    const jokes = [
      "Why don't robots panic? Because they’ve got nerves of steel!",
      "Why was the math book sad? Because it had too many problems.",
      "Why did the computer go to the doctor? Because it caught a virus!",
      "Why do programmers prefer dark mode? Because light attracts bugs!",
      "Why did the robot cross the road? Because it was programmed by a chicken.",
      "Why can’t AI keep secrets? Because they always byte their tongue!",
      "I would tell you a construction joke, but I'm still working on it.",
      "Why did the smartphone need glasses? Because it lost its contacts."
    ];
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    respond(joke);
    return;
  }

  // Compliments on joke
  if (
    text.includes("nice joke") ||
    text.includes("good one") ||
    text.includes("that was funny") ||
    text.includes("funny") ||
    text.includes("i liked that") ||
    text.includes("haha")
  ) {
    respond("Glad you liked it! Want to hear another one?");
    return;
  }

  if (text === "yes" || text.includes("another one")) {
    const jokes = [
      "Why don't robots panic? Because they’ve got nerves of steel!",
      "Why was the math book sad? Because it had too many problems.",
      "Why did the computer go to the doctor? Because it caught a virus!",
      "Why do programmers prefer dark mode? Because light attracts bugs!",
      "Why did the robot cross the road? Because it was programmed by a chicken.",
      "Why can’t AI keep secrets? Because they always byte their tongue!",
      "I would tell you a construction joke, but I'm still working on it.",
      "Why did the smartphone need glasses? Because it lost its contacts."
    ];
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    respond(joke);
    return;
  }


  // Wikipedia queries
  if (/what is|who is|tell me about|explain|define/.test(text)) {
    const topic = text.replace(/what is|who is|tell me about|explain|define/, "").trim();
    if (topic.length > 0) {
      getWikipediaSummary(topic);
      respond(`Searching Wikipedia for ${topic}`);
      return;
    }
  }

  // Crypto price lookup
  if (text.includes("price of")) {
    const match = text.match(/price of ([a-zA-Z0-9]+)/);
    if (match) {
      const inputCoin = match[1].toLowerCase();
      const coin = coinMap[inputCoin];
      if (coin) {
        getCryptoPrice(coin);
        respond(`Getting price of ${inputCoin}`);
      } else {
        respond(`Sorry, I don't have data for ${inputCoin}`);
      }
      return;
    }
  }

  // Play song on YouTube
  if (text.startsWith("play ")) {
    const song = text.replace("play ", "").trim();
    respond(`Playing ${song} on YouTube.`);
    openLink(`https://www.youtube.com/results?search_query=${encodeURIComponent(song)}`);
    return;
  }

// Open Google News site
if (text.includes("open news") || text === "news") {
  respond("Opening Google News for you.");
  openLink("https://news.google.com");
  return;
}

  // Return to home page
  if (text.includes("go back home") || text.includes("return home") || text.includes("go home")) {
    respond("Returning to the assistant home page.");
    closeAllOpenedWindows();
    window.focus();
    return;
  }

  // Stop listening
  if (text.includes("stop listening") || text.includes("mute")) {
    respond("Muting now. Say 'start listening' to wake me.");
    stopListening();
    return;
  }

  // Start listening
  if (text.includes("start listening") || text.includes("wake up")) {
    if (!isListening) {
      startListening();
      respond("I'm back and listening!");
    } else {
      respond("I'm already listening!");
    }
    return;
  }

  // Fallback - Google Search only if no other command matched
  respond(`I didn't find an exact answer. Searching Google for "${text}"`);
  openLink(`https://www.google.com/search?q=${encodeURIComponent(text)}`);
}

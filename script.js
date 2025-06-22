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
  // add more as needed
};

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
    if (isListening) recognition.start(); // Keep listening continuously
  };

  recognition.start();
}

function stopListening() {
  if (recognition && isListening) {
    recognition.stop();
    isListening = false;
    document.getElementById("status").textContent = "🔇 Muted. Say 'start listening' or click button to reactivate.";
  }
}

function speak(text) {
  const synth = window.speechSynthesis;
  if (!text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  synth.speak(utterance);
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

function getWikipediaSummary(query) {
  fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`)
    .then(response => response.json())
    .then(data => {
      if (data.extract) {
        const summary = data.extract;
        speak(summary);
        document.getElementById('ai-text').textContent = summary;
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

// Helper to open link in new window/tab and track it
function openLink(url) {
  // Open in new tab/window and keep track of window reference
  const newWin = window.open(url, "_blank");
  if (newWin) {
    openedWindows.push(newWin);
  }
}

// Close all opened windows (if still open)
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

function respond(text) {
  speak(text);
  document.getElementById("ai-text").textContent = text;
}

function respondToCommand(text) {
  text = text.toLowerCase();
  let response = "Sorry, I didn't catch that.";

  // Reminders
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
        response = `Reminder set: ${task} in ${amount} ${unit}`;
      } else {
        response = "Sorry, I couldn't understand the time for the reminder.";
      }
    } else {
      response = "Please specify what to remind and when, like 'remind me to call mom in 10 minutes.'";
    }
  }
  // Greetings & basic info
  else if (/hello|hi|hey/.test(text)) {
    response = "Hello! How can I help you today?";
  }
  else if (text.includes("how are you")) {
    response = "I'm doing great, thanks for asking!";
  }
  else if (text.includes("time")) {
    response = "It's " + new Date().toLocaleTimeString();
  }
  else if (text.includes("date")) {
    response = "Today's date is " + new Date().toLocaleDateString();
  }
  else if (text.includes("your name")) {
    response = "I am HXN, your helpful voice assistant!";
  }
  else if (text.includes("tell me a joke")) {
    response = "Why don't robots panic? Because they’ve got nerves of steel!";
  }
  // Wikipedia info
  else if (text.startsWith("tell me about ") || text.startsWith("who is ") || text.startsWith("what is ")) {
    const topic = text.replace(/tell me about |who is |what is /, "").trim();
    getWikipediaSummary(topic);
    response = `Searching Wikipedia for ${topic}`;
  }
  // Crypto price lookup
  else if (text.includes("price of")) {
    const match = text.match(/price of ([a-zA-Z0-9]+)/);
    if (match) {
      const inputCoin = match[1].toLowerCase();
      const coin = coinMap[inputCoin];
      if (coin) {
        getCryptoPrice(coin);
        response = `Getting price of ${inputCoin}`;
      } else {
        response = `Sorry, I don't have data for ${inputCoin}`;
        respond(response);
        return;
      }
    }
  }
  // Play song on YouTube
  else if (text.startsWith("play ")) {
    const song = text.replace("play ", "").trim();
    response = `Playing ${song} on YouTube.`;
    openLink(`https://www.youtube.com/results?search_query=${encodeURIComponent(song)}`);
  }
  // Open Google News
  else if (text.includes("news")) {
    response = "Opening today's top news headlines for you.";
    openLink("https://news.google.com");
  }
  // Return to home page
  else if (text.includes("go back home") || text.includes("return home") || text.includes("go home")) {
    response = "Returning to the assistant home page.";
    closeAllOpenedWindows();
    window.focus();
  }
  // Stop listening
  else if (text.includes("stop listening") || text.includes("mute")) {
    response = "Muting now. Say 'start listening' to wake me.";
    stopListening();
  }
  // Start listening
  else if (text.includes("start listening") || text.includes("wake up")) {
    if (!isListening) {
      startListening();
      response = "I'm back and listening!";
    } else {
      response = "I'm already listening!";
    }
  }
  // Fallback - Google Search
  else {
    response = `I didn't find an exact answer. Searching Google for "${text}"`;
    openLink(`https://www.google.com/search?q=${encodeURIComponent(text)}`);
  }

  respond(response);
}

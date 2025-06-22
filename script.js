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

function stopListening() {
  if (recognition && isListening) {
    recognition.stop();
    isListening = false;
    document.getElementById("status").textContent = "🔇 Muted. Say 'start listening' or click button to reactivate.";
  }
}

function speak(text) {
  if (!text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
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

function openLink(url) {
  const frame = document.getElementById("ai-frame");
  frame.src = url;
  frame.style.display = "block";
}

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

  // ✅ Auto-close iframe (webview) on any new command
  const frame = document.getElementById("ai-frame");
  const closeBtn = document.getElementById("close-frame-btn");
  if (frame) {
    frame.src = "";
    frame.style.display = "none";
  }
  if (closeBtn) {
    closeBtn.style.display = "none";
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
      return;
    } else {
      respond("Please specify what to remind and when, like 'remind me to call mom in 10 minutes.'");
      return;
    }
  }

  // Greetings & basics
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

  if (text.includes("tell me a joke")) {
    respond("Why don't robots panic? Because they’ve got nerves of steel!");
    return;
  }

  // You can continue adding more commands below as needed...
}


  // Wikipedia queries - aggressive fallback
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

  // Open Google News
  if (text.includes("news")) {
    respond("Opening today's top news headlines for you.");
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

  // Fallback - Google Search only if no other command matched
  respond(`I didn't find an exact answer. Searching Google for "${text}"`);
  openLink(`https://www.google.com/search?q=${encodeURIComponent(text)}`);
}

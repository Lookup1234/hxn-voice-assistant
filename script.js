let recognition;
let isListening = false;

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
};

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

// Helper functions

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
    if (isListening) recognition.start();
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
  document.getElementById("ai-text").textContent = text;
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

// Wikipedia summary
function getWikipediaSummary(query) {
  // Auto-close iframe if open
  const frame = document.getElementById("ai-frame");
  const closeBtn = document.getElementById("close-frame-btn");
  if (frame) {
    frame.src = "";
    frame.style.display = "none";
  }
  if (closeBtn) {
    closeBtn.style.display = "none";
  }

  fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => {
      if (data.extract) {
        speak(data.extract);
        document.getElementById("ai-text").textContent = data.extract;
      } else {
        speak("Sorry, I couldn't find information on that topic.");
        document.getElementById("ai-text").textContent = "No information found.";
      }
    })
    .catch(() => {
      speak("Sorry, I had trouble reaching Wikipedia.");
      document.getElementById("ai-text").textContent = "Error reaching Wikipedia.";
    });
}

// Crypto price
function getCryptoPrice(coin) {
  fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`)
    .then(res => res.json())
    .then(data => {
      if (data[coin] && data[coin].usd) {
        const price = data[coin].usd;
        speak(`The current price of ${coin} is $${price} USD.`);
      } else {
        speak("Sorry, I couldn't find that cryptocurrency.");
      }
    })
    .catch(() => {
      speak("Sorry, I had trouble fetching cryptocurrency prices.");
    });
}

// Weather info (using OpenWeatherMap free API - you need to get your own API key and insert below)
const OPENWEATHER_API_KEY = "YOUR_OPENWEATHERMAP_API_KEY";

function getWeather(city) {
  if (!city) {
    speak("Please tell me the city name for the weather.");
    return;
  }
  fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric`)
    .then(res => res.json())
    .then(data => {
      if (data && data.weather) {
        const desc = data.weather[0].description;
        const temp = data.main.temp;
        speak(`The weather in ${city} is ${desc} with a temperature of ${temp} degrees Celsius.`);
      } else {
        speak(`Sorry, I couldn't find the weather for ${city}.`);
      }
    })
    .catch(() => {
      speak("Sorry, I had trouble getting the weather.");
    });
}

// News headlines (using NewsAPI free tier — you need your API key)
const NEWSAPI_KEY = "YOUR_NEWSAPI_KEY";

function getNews() {
  fetch(`https://newsapi.org/v2/top-headlines?country=us&pageSize=3&apiKey=${NEWSAPI_KEY}`)
    .then(res => res.json())
    .then(data => {
      if (data.articles && data.articles.length > 0) {
        const headlines = data.articles.map((a, i) => `${i+1}. ${a.title}`).join(" ");
        speak(`Here are the top news headlines: ${headlines}`);
      } else {
        speak("Sorry, I couldn't find any news.");
      }
    })
    .catch(() => {
      speak("Sorry, I had trouble fetching news.");
    });
}

// Dictionary lookup
function getDefinition(word) {
  fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        const def = data[0].meanings[0].definitions[0].definition;
        speak(`Definition of ${word}: ${def}`);
      } else {
        speak(`Sorry, I couldn't find the definition of ${word}.`);
      }
    })
    .catch(() => {
      speak("Sorry, I had trouble getting the definition.");
    });
}

// Trivia question
function getTrivia() {
  fetch('https://opentdb.com/api.php?amount=1&type=multiple')
    .then(res => res.json())
    .then(data => {
      if (data.results && data.results.length > 0) {
        const question = data.results[0].question;
        speak(`Here's a trivia question: ${question}`);
      } else {
        speak("Sorry, I couldn't find a trivia question.");
      }
    })
    .catch(() => {
      speak("Sorry, I had trouble fetching trivia.");
    });
}

// Local time of city/timezone
function getLocalTime(city) {
  fetch(`http://worldtimeapi.org/api/timezone`)
    .then(res => res.json())
    .then(timezones => {
      const tz = timezones.find(tz => tz.toLowerCase().includes(city.toLowerCase()));
      if (!tz) {
        speak(`Sorry, I couldn't find the timezone for ${city}.`);
        return;
      }
      fetch(`http://worldtimeapi.org/api/timezone/${tz}`)
        .then(res => res.json())
        .then(data => {
          if (data.datetime) {
            const dt = new Date(data.datetime);
            speak(`The local time in ${city} is ${dt.toLocaleTimeString()}`);
          } else {
            speak(`Sorry, couldn't get the local time for ${city}.`);
          }
        });
    })
    .catch(() => {
      speak("Sorry, I had trouble fetching the local time.");
    });
}

function respond(text) {
  speak(text);
}

// Main command parser

function respondToCommand(text) {
  text = text.toLowerCase();

  // Auto-close iframe/webview if you have one
  const frame = document.getElementById("ai-frame");
  if (frame) {
    frame.src = "";
    frame.style.display = "none";
  }

  // Reminders
  if (text.includes("remind me to")) {
    const match = text.match(/remind me to (.+) in (\d+) (second|seconds|minute|minutes|hour|hours)/);
    if (match) {
      const task = match[1];
      const amount = parseInt(match[2]);
      const unit = match[3];
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

  // Greetings
  if (/hello|hi|hey/.test(text)) {
    respond("Hello! How can I help you today?");
    return;
  }
  if (text.includes("how are you")) {
    respond("I'm doing great, thanks for asking!");
    return;
  }
  if (text.includes("your name")) {
    respond("I am HXN, your helpful voice assistant!");
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

  // Jokes
  if (text.includes("tell me a joke")) {
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    respond(joke);
    return;
  }
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

  // Crypto price
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

  // Weather query
  if (text.includes("weather")) {
    // Try to extract city: e.g. "weather in Mumbai"
    const cityMatch = text.match(/weather in ([a-zA-Z\s]+)/);
    const city = cityMatch ? cityMatch[1].trim() : null;
    getWeather(city);
    return;
  }

  // News
  if (text.includes("news")) {
    getNews();
    return;
  }

  // Dictionary lookup
  if (text.includes("define") || text.includes("meaning of")) {
    const wordMatch = text.match(/define ([a-zA-Z]+)/) || text.match(/meaning of ([a-zA-Z]+)/);
    const word = wordMatch ? wordMatch[1] : null;
    if (word) {
      getDefinition(word);
    } else {
      respond("Please tell me which word you want me to define.");
    }
    return;
  }

  // Trivia
  if (text.includes("trivia") || text.includes("quiz")) {
    getTrivia();
    return;
  }

  // Local time in city
  if (text.includes("local time in")) {
    const cityMatch = text.match(/local time in ([a-zA-Z\s]+)/);
    const city = cityMatch ? cityMatch[1].trim() : null;
    if (city) {
      getLocalTime(city);
    } else {
      respond("Please tell me which city's local time you want.");
    }
    return;
  }

  // Play song on YouTube
  if (text.startsWith("play ")) {
    const song = text.replace("play ", "").trim();
    respond(`Playing ${song} on YouTube.`);
    openLink(`https://www.youtube.com/results?search_query=${encodeURIComponent(song)}`);
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
// Try short direct names as Wikipedia lookup
if (text.split(" ").length <= 3 && /^[a-zA-Z\s]+$/.test(text)) {
  getWikipediaSummary(text);
  respond(`I found this. Here's what I found about ${text}.`);
  return;
}


  // Default fallback - Google search
  respond(`I didn't find an exact answer. Searching Google for "${text}"`);
  openLink(`https://www.google.com/search?q=${encodeURIComponent(text)}`);
}

function openLink(url) {
  const frame = document.getElementById("ai-frame");

  // Try iframe if allowed
  if (frame && !url.includes("google.com")) {
    frame.src = url;
    frame.style.display = "block";
    document.getElementById("ai-text").innerHTML += `<br><a href="${url}" target="_blank">(Open in new tab)</a>`;
  } else {
    // Fallback for blocked pages like google.com
    document.getElementById("ai-text").innerHTML = `I found this for you: <a href="${url}" target="_blank">${url}</a>`;
    speak("I found this. Tap the link to open it.");
  }
}

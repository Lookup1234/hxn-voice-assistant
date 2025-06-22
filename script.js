let recognition;
let isListening = false;

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
    if (isListening) recognition.start(); // Keep going
  };

  recognition.start();
}

function respondToCommand(text) {
  let response = "Sorry, I didn't catch that.";

  if (text.includes("hello")) {
    response = "Hello! I'm your HXN voice assistant.";
  } else if (text.includes("how are you")) {
    response = "I'm functioning perfectly, thanks!";
  } else if (text.includes("time")) {
    response = "It's " + new Date().toLocaleTimeString();
  } else if (text.includes("date")) {
    response = "Today's date is " + new Date().toLocaleDateString();
  } else if (text.includes("your name")) {
    response = "I am HXN, your helpful voice assistant!";
  } else if (text.includes("tell me a joke")) {
    response = "Why don't robots panic? Because they’ve got nerves of steel!";
  } else if (text.includes("open google")) {
    response = "Opening Google.";
    window.open("https://www.google.com", "_blank");
  } else if (text.startsWith("search for")) {
    const query = text.replace("search for", "").trim();
    response = `Searching for ${query}`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
  } else if (text.includes("stop listening")) {
    response = "Muting now. Say 'start listening' again to wake me.";
    stopListening();
  } else if (text.includes("start listening")) {
    if (!isListening) {
      startListening();
      response = "I'm back and listening!";
    } else {
      response = "I'm already listening!";
    }
  }

  speak(response);
  document.getElementById("ai-text").textContent = response;
}

function speak(text) {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  synth.speak(utterance);
}

function stopListening() {
  if (recognition && isListening) {
    recognition.stop();
    isListening = false;
    document.getElementById("status").textContent = "🔇 Muted. Say 'start listening' or click button to reactivate.";
  }
}

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';

function startListening() {
  document.getElementById('status').textContent = 'Listening...';
  recognition.start();
}

recognition.onresult = async function (event) {
  const userText = event.results[0][0].transcript;
  document.getElementById('user-text').textContent = userText;

  // Simulated AI response (can replace with API call later)
  const aiResponse = await getAIResponse(userText);
  document.getElementById('ai-text').textContent = aiResponse;

  // Speak the response
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(aiResponse);
  synth.speak(utter);
};

async function getAIResponse(prompt) {
  // Simple example replies:
  if (prompt.toLowerCase().includes("event")) return "You have a meeting at 5 PM.";
  if (prompt.toLowerCase().includes("hello")) return "Hello! How can I help you today?";
  return "I'm still learning. Try asking me about your day or events.";
}

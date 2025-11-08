// Groq API client for cheap, fast LLM inference
// Free tier: 30 requests/minute for llama3-8b-8192

export async function sendMessageToAI(
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;

  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    return "Hi! I'd love to chat, but the AI API isn't configured yet. Please add your Groq API key to the .env.local file. Get a free key at https://console.groq.com";
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mixtral', // Fast and cheap model
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "Sorry, I didn't catch that. Could you say that again?";
  } catch (error) {
    console.error('Error calling Groq API:', error);
    return "Oops! I'm having trouble connecting right now. Try again in a moment?";
  }
}

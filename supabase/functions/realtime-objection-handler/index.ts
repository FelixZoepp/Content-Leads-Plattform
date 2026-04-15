import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let openAIWs: WebSocket | null = null;
  let sessionId: string | null = null;
  let systemContext = "";
  let leadContext = "";

  socket.onopen = () => {
    console.log("Client WebSocket connected");
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log("Received message:", message.type);

      if (message.type === 'start_session') {
        // Initialize OpenAI Realtime API connection
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        if (!OPENAI_API_KEY) {
          socket.send(JSON.stringify({ 
            type: 'error', 
            error: 'OpenAI API key not configured' 
          }));
          return;
        }

        systemContext = message.systemContext || "";
        leadContext = message.leadContext || "";

        // Connect to OpenAI Realtime API
        openAIWs = new WebSocket(
          "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01",
          {
            headers: {
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
              "OpenAI-Beta": "realtime=v1",
            },
          }
        );

        openAIWs.onopen = () => {
          console.log("Connected to OpenAI Realtime API");
          
          // Wait for session.created event before sending session.update
          const handleSessionCreated = (evt: MessageEvent) => {
            const data = JSON.parse(evt.data);
            if (data.type === 'session.created') {
              console.log("Session created, sending configuration");
              
              // Configure session
              openAIWs?.send(JSON.stringify({
                type: "session.update",
                session: {
                  modalities: ["text", "audio"],
                  instructions: `You are a sales objection handling assistant. Listen to the conversation and detect when the prospect raises objections.

System Context:
${systemContext}

Lead Context:
${leadContext}

When you detect an objection, immediately provide a concise, actionable response that the salesperson can use. Focus on:
1. Acknowledging the concern
2. Providing a clear counter-argument or solution
3. Keeping responses under 100 words for quick reading during a live call

Format your responses as direct talking points the salesperson can use immediately.`,
                  voice: "alloy",
                  input_audio_format: "pcm16",
                  output_audio_format: "pcm16",
                  input_audio_transcription: {
                    model: "whisper-1"
                  },
                  turn_detection: {
                    type: "server_vad",
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 1000
                  },
                  temperature: 0.7,
                }
              }));
              
              // Remove the listener after handling
              openAIWs?.removeEventListener('message', handleSessionCreated);
            }
          };
          
          openAIWs?.addEventListener('message', handleSessionCreated);
        };

        openAIWs.onmessage = (evt) => {
          const data = JSON.parse(evt.data);
          console.log("OpenAI event:", data.type);

          // Forward relevant events to client
          if (data.type === 'session.created' || 
              data.type === 'session.updated' ||
              data.type === 'input_audio_buffer.speech_started' ||
              data.type === 'input_audio_buffer.speech_stopped' ||
              data.type === 'conversation.item.created' ||
              data.type === 'response.created' ||
              data.type === 'response.done' ||
              data.type === 'response.text.delta' ||
              data.type === 'response.text.done' ||
              data.type === 'response.audio_transcript.delta' ||
              data.type === 'error') {
            socket.send(JSON.stringify(data));
          }

          // Handle objection detection in transcript
          if (data.type === 'conversation.item.created' && 
              data.item?.role === 'user' &&
              data.item?.content?.[0]?.transcript) {
            
            const transcript = data.item.content[0].transcript.toLowerCase();
            
            // Simple objection keywords detection
            const objectionKeywords = [
              'zu teuer', 'zu viel', 'preis', 'budget', 'keine zeit',
              'später', 'nachdenken', 'nicht interessiert', 'chef',
              'entscheider', 'bereits', 'schon', 'zufrieden'
            ];
            
            const hasObjection = objectionKeywords.some(keyword => 
              transcript.includes(keyword)
            );

            if (hasObjection) {
              console.log("Objection detected in transcript");
              // Request AI to provide objection handling
              openAIWs?.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'message',
                  role: 'user',
                  content: [{
                    type: 'input_text',
                    text: `OBJECTION DETECTED: "${data.item.content[0].transcript}"\n\nProvide a brief, actionable response (max 100 words) that addresses this objection.`
                  }]
                }
              }));
              
              openAIWs?.send(JSON.stringify({ type: 'response.create' }));
            }
          }
        };

        openAIWs.onerror = (error) => {
          console.error("OpenAI WebSocket error:", error);
          socket.send(JSON.stringify({ 
            type: 'error', 
            error: 'OpenAI connection error' 
          }));
        };

        openAIWs.onclose = () => {
          console.log("OpenAI WebSocket closed");
          socket.send(JSON.stringify({ type: 'session_ended' }));
        };

        socket.send(JSON.stringify({ 
          type: 'session_started',
          message: 'Connected to AI objection handler'
        }));

      } else if (message.type === 'audio_data' && openAIWs) {
        // Forward audio data to OpenAI
        openAIWs.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: message.audio
        }));

      } else if (message.type === 'end_session') {
        openAIWs?.close();
        socket.send(JSON.stringify({ type: 'session_ended' }));
      }

    } catch (error) {
      console.error("Error processing message:", error);
      socket.send(JSON.stringify({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  socket.onclose = () => {
    console.log("Client WebSocket disconnected");
    openAIWs?.close();
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    openAIWs?.close();
  };

  return response;
});
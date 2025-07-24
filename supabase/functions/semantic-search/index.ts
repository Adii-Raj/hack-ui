import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NOMIC_KEY = Deno.env.get("NOMIC_API_KEY")!;
const GROQ_KEY  = Deno.env.get("GROQ_API_KEY")!;
const SUPA_URL  = Deno.env.get("SUPABASE_URL")!;
const SUPA_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPA_URL, SUPA_ANON);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { query } = await req.json();

  // 1. Nomic embedding (768-dim)
  const embRes = await fetch("https://api-atlas.nomic.ai/v1/embedding", {
    method: "POST",
    headers: { Authorization: `Bearer ${NOMIC_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text-v1", text: query }),
  });
  const { embeddings } = await embRes.json();
  const vec = embeddings[0];

  // 2. semantic search
  const { data: rows } = await supabase.rpc("match_items_nomic", {
    query_embedding: vec,
    match_threshold: 0.78,
    match_count: 10,
  });

  // 3. Groq chat
  const chatRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-instruct",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant for a hackathon demo shop. Answer in 1-2 sentences. If the user asks about the site, explain it's a live demo. If product query, give a concise summary.",
        },
        { role: "user", content: query },
      ],
      max_tokens: 80,
    }),
  });
  const { choices } = await chatRes.json();
  const reply = choices[0]?.message?.content || "";

  return new Response(JSON.stringify({ items: rows || [], reply }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
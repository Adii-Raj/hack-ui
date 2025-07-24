import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';

export default function SmartShop() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [assistantText, setAssistantText] = useState('');
  const [listening, setListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const recognitionRef = useRef(null);

  // Initial load
  useEffect(() => {
    supabase.from('items').select('*').then(r => setItems(r.data || []));
  }, []);

  // Cleanup voice recognition
  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  // Smart search
  const runSearch = async (q) => {
    if (!q.trim()) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('semantic-search', {
        body: { query: q },
      });
      if (error) throw error;
      setItems(data?.items || []);
      setAssistantText(data?.reply || "No results found.");
    } catch (err) {
      console.error("Search failed:", err);
      setAssistantText("Sorry, something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  // Voice assistant
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition not supported in your browser.");
      return;
    }

    const rec = new window.webkitSpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onresult = (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim();
      if (!transcript) return;

      if (transcript.toLowerCase() === "stop listening") {
        setListening(false);
        return;
      }
      runSearch(transcript);
    };

    rec.onerror = (e) => {
      console.error("Voice error:", e.error);
      setListening(false);
    };

    rec.start();
    recognitionRef.current = rec;
  };

  useEffect(() => {
    if (listening) startListening();
    else recognitionRef.current?.stop();
  }, [listening]);

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch(query)}
          placeholder="Type or speak..."
          className="border px-2 py-1 rounded"
        />
        <button 
          onClick={() => runSearch(query)} 
          disabled={isLoading}
          className="btn"
        >
          {isLoading ? "Searching..." : "Search"}
        </button>
        <button 
          onClick={() => setListening(!listening)} 
          className="btn"
        >
          {listening ? "🛑 Stop" : "🎤 Voice"}
        </button>
      </div>
      {listening && <p className="text-sm italic">Listening... Say "stop listening" to cancel.</p>}
      {assistantText && <p className="mb-2 italic">{assistantText}</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map(i => (
          <div key={i.id} className="border p-2 rounded">
            <h3 className="font-bold">{i.name}</h3>
            <p>₹{i.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
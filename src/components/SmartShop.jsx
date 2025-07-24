// src/components/SmartShop.jsx
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';

export default function SmartShop() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [assistantText, setAssistantText] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  // Initial load
  useEffect(() => {
    supabase.from('items').select('*').then(r => setItems(r.data));
  }, []);

  // Smart search
  const runSearch = async (q) => {
    const res = await supabase.functions.invoke('semantic-search', { body: { query: q } });
    setItems(res.data.items || []);
    setAssistantText(res.data.reply);
  };

  // Voice assistant
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) return alert('Speech not supported');
    const rec = new window.webkitSpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1][0].transcript.trim().toLowerCase();
      if (last === 'stop listening') {
        setListening(false);
        rec.stop();
        return;
      }
      runSearch(last);
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
        <button onClick={() => runSearch(query)} className="btn">Search</button>
        <button onClick={() => setListening(!listening)} className="btn">
          {listening ? '🛑 Stop' : '🎤 Voice'}
        </button>
      </div>
      {assistantText && <p className="mb-2 italic">{assistantText}</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map(i => (
          <div key={i.id} className="border p-2 rounded">
            <h3 className="font-bold">{i.name}</h3>
            <p>${i.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
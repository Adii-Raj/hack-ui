// src/App.jsx
import React from 'react';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import SmartShop from './components/SmartShop'; // Import the SmartShop component

export default function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const load = async () => {
    const { data } = await supabase.from('items').select('*');
    setItems(data || []);
  };

  const add = async () => {
    if (!name || !price) return;
    await supabase.from('items').insert([{ name, price: parseFloat(price) }]);
    setName(''); setPrice('');
    load();
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h2>Items</h2>
      <ul>
        {items.map(i => <li key={i.id}>{i.name} - ₹{i.price}</li>)}
      </ul>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
      <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Price" type="number" />
      <button onClick={add}>Add</button>

      <hr />

      <h2>Smart Shop</h2>
      <SmartShop /> {/* Render the SmartShop component */}
    </div>
  );
}
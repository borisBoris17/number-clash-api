import supabase from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { playerId } = req.body;

    const { data, error } = await supabase
      .from('match_queue')
      .insert({
        player_id: playerId,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const response = await fetch('http://localhost:3000/api/matchmaker', {
      method: 'POST',
    });

    if (response.status !== 200 ) {
      return res.status(500).json({ error: 'Error while attempting matchmaking.' });
    }

    const result = await response.json();

    return res.status(200).json(data, result);
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('match_queue')
      .select('*')
      .order('joined_at', { ascending: false })
      .limit(10)

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
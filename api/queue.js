import supabase from '../lib/supabase.js';

export default async function handler(req, res) {

  const HOST_URL = process.env.HOST_URL || 'http://localhost:3000';
  
  if (req.method === 'POST') {
    const { playerId } = req.body;

    const { data: existingQueue, error: selectError } = await supabase
      .from('match_queue')
      .select('*')
      .eq('player_id', playerId)
      .eq('status', 'waiting')
      .maybeSingle();

    if (selectError) {
      return res.status(500).json({ error: selectError.message });
    }

    if (existingQueue) {
      return res.status(200).json(existingQueue);
    }

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

      const response = await fetch(`${HOST_URL}/api/matchmaker`, {
        method: 'POST',
      });

      if (response.status !== 200) {
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
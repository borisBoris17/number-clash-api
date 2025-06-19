import supabase from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { playerId } = req.query;

    const {data, error } = await supabase
      .from('match_queue')
      .select('*')
      .eq('player_id', playerId)

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
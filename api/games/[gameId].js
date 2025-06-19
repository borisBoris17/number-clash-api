import supabase from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { gameId } = req.query;

    const { data, error } = await supabase
      .from('games')
      .select(`
      *,
      rounds (
        id,
        round_number,
        player1_input,
        player2_input,
        winner_id,
        status,
        created_at
      )
    `)
      .eq('id', gameId)
      .single(); // expect only one row

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json(data);
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
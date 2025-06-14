import supabase from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { player1Id, player2Id } = req.body;

  const { data, error } = await supabase
    .from('games')
    .insert({
      player1_id: player1Id,
      player2_id: player2Id,
      status: 'in_progress',
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Optionally create first round
  const { error: roundError } = await supabase.from('rounds').insert({
    game_id: data.id,
    round_number: 1,
    status: 'waiting',
  });

  if (roundError) {
    return res.status(500).json({ error: roundError.message });
  }

  res.status(200).json(data);
}
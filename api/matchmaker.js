import supabase from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { data: waitingPlayers } = await supabase
      .from('match_queue')
      .select('player_id, id')
      .eq('status', 'waiting')
      .order('joined_at')
      .limit(2);

    if (waitingPlayers.length >= 2) {
      const [p1, p2] = waitingPlayers;

      const { data: game } = await supabase
        .from('games')
        .insert({
          player1_id: p1.player_id,
          player2_id: p2.player_id,
          status: 'in_progress',
        })
        .select()
        .single();

      // 4. Update both queue rows
      const { data: queueData, error } = await supabase
        .from('match_queue')
        .update({ status: 'matched', game_id: game.id })
        .or(`player_id.eq.${p1.player_id},player_id.eq.${p2.player_id}`)

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ matchFound: true, game });
    }

    return res.status(200).json({ matchFound: false });
  }
}
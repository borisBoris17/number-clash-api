import supabase from '../lib/supabase.js';

export default async function handler(req, res) {

  const HOST_URL = process.env.HOST_URL || 'http://localhost:3000';
  
  if (req.method === 'POST') {
    const { data: waitingPlayers } = await supabase
      .from('match_queue')
      .select('player_id, id')
      .eq('status', 'waiting')
      .order('joined_at')
      .limit(2);

    if (waitingPlayers.length >= 2) {
      const [p1, p2] = waitingPlayers;

      console.log(p1.player_id)
      console.log(p2.player_id)

      const response = await fetch(`${HOST_URL}/api/games`, {
        method: 'POST',
        body: JSON.stringify({
          player1Id: p1.player_id,
          player2Id: p2.player_id
        }),
      });
      
      if (response.status !== 200) {
        return res.status(500).json({ error: 'Error while attempting to Create Game.' });
      }

      const result = await response.json();

      console.log(result)

      // 4. Update both queue rows
      const { data: queueData, error } = await supabase
        .from('match_queue')
        .update({ status: 'matched', game_id: result.id })
        .or(`player_id.eq.${p1.player_id},player_id.eq.${p2.player_id}`)

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ matchFound: true, result });
    }

    return res.status(200).json({ matchFound: false });
  }
}
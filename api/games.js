import supabase from '../lib/supabase.js';

export default async function handler(req, res) {

  if (req.method === 'POST') {
    console.log("in games")
    const { player1Id, player2Id } = JSON.parse(req.body);

      console.log(player1Id)
      console.log(player2Id)
      console.log(req.body)
      console.log(req.body.player1Id)
      console.log(req.body.player2Id)

    const { data, error } = await supabase
      .from('games')
      .insert({
        player1_id: player1Id,
        player2_id: player2Id,
        status: 'in_progress',
      })
      .select()
      .single();

      console.log(data)
      console.log(error)

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    console.log("before round")

    const { error: roundError } = await supabase.from('rounds').insert({
      game_id: data.id,
      round_number: 1,
      status: 'waiting',
    });

    if (roundError) {
      return res.status(500).json({ error: roundError.message });
    }

    return res.status(200).json(data);
  } else if (req.method === 'GET') {
    const { playerId } = req.query;
    if (playerId) {
      // get games for player
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`) // "or" condition
     
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data);
    } else {
      // get most recent 9 games
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data);
    }
  }
  return res.status(405).json({ message: 'Method Not Allowed' });
}
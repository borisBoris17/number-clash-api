import supabase from '../../lib/supabase.js';

export default async function handler(req, res) {
  const HOST_URL = process.env.HOST_URL || 'http://localhost:3000';

  if (req.method === 'POST') {
    const { roundId } = req.query;
    const { gameId, playerId, selectedNum } = req.body;


    const parsedNum = parseInt(selectedNum);

    if (Number.isNaN(parsedNum)) {
      return res.status(400).json({ error: 'Invalid Selected Number' });
    }

    const response = await fetch(`${HOST_URL}/api/games/${gameId}`, {
      method: 'GET',
    });

    if (response.status !== 200) {
      return res.status(500).json({ error: 'Error while fetching Game.' });
    }

    const gameJson = await response.json();

    const player1_score = gameJson.player1_score
    const player2_score = gameJson.player2_score
    const isFirstPlayer = gameJson.player1_id === playerId

    let roundToReturn;

    if (isFirstPlayer) {
      const { data: updateRoundData, error: updateRoundError } = await supabase
        .from('rounds')
        .update({ player1_input: parsedNum, status: 'playing' })
        .eq('id', roundId)
        .select();

      var firstPlayerSelections = gameJson.player1_nums
      firstPlayerSelections.push(parsedNum)

      await supabase
        .from('games')
        .update({ player1_nums: firstPlayerSelections })
        .eq('id', gameId)

      roundToReturn = updateRoundData
      // return res.status(200).json({updateRoundData})

    } else {
      const { data: updateRoundData, error: updateRoundError } = await supabase
        .from('rounds')
        .update({ player2_input: selectedNum, status: 'playing' })
        .eq('id', roundId)
        .select();

      var secondPlayerSelections = gameJson.player2_nums
      secondPlayerSelections.push(parsedNum)

      await supabase
        .from('games')
        .update({ player2_nums: secondPlayerSelections })
        .eq('id', gameId)
        .select();

      roundToReturn = updateRoundData
      // return res.status(200).json({updateRoundData})
    }

    const { data: roundData, error: roundError } = await supabase
      .from('rounds')
      .select('*')
      .eq('id', roundId)
      .single()

    if (roundError) {
      return res.status(500).json({ error: roundError.message });
    }

    // check if both inputs have been submitted
    if (roundData.player1_input && roundData.player2_input) {
      let winner = 'tie'
      let score = 0
      //check if the selections are opposites (10 and 1, 9 and 2, etc.) 
      if (roundData.player1_input + roundData.player2_input === 11) {
        winner = roundData.player1_input > roundData.player2_input ? 'player1' : 'player2'
        score = roundData.player1_input > roundData.player2_input ? roundData.player1_input : roundData.player2_input
      } else if (roundData.player1_input !== roundData.player2_input) {
        winner = roundData.player1_input < roundData.player2_input ? 'player1' : 'player2'
        score = roundData.player1_input < roundData.player2_input ? roundData.player1_input : roundData.player2_input
      }

      const { data: updateGameWinnerData, error: updateGameWinnerError } = await supabase
        .from('rounds')
        .update({ winner: winner, points_won: score, status: 'scored' })
        .eq('id', roundId)
        .select()
        .single();

      if (updateGameWinnerError) {
        return res.status(500).json({ error: roundError.message });
      }

      if (winner === 'player1') {
        const updatedScore = player1_score + score;
        await supabase
          .from('games')
          .update({ player1_score: updatedScore })
          .eq('id', gameId)
          .select();
      } else if (winner === 'player2') {
        const updatedScore = player2_score + score;
        await supabase
          .from('games')
          .update({ player2_score: updatedScore })
          .eq('id', gameId)
          .select();
      }

      if (updateGameWinnerData.round_number < 10) {
        const { error: addRoundError } = await supabase
          .from('rounds')
          .insert({
            game_id: updateGameWinnerData.game_id,
            round_number: updateGameWinnerData.round_number + 1,
            status: 'waiting',
          });

        if (addRoundError) {
          return res.status(500).json({ error: addRoundError.message });
        }
      }

      roundToReturn = updateGameWinnerData
    }
    return res.status(200).json({ roundToReturn })
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
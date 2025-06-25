import supabase from '../../lib/supabase.js';

export default async function handler(req, res) {
  const HOST_URL = process.env.HOST_URL || 'http://localhost:3000';

  if (req.method === 'POST') {
    const { roundId } = req.query;
    const { gameId, playerId, selectedNum } = req.body;

    const { data: existingRoundData, error } = await supabase
      .from('rounds')
      .select('*')
      .eq('id', roundId)
      .single()

    if (error) {
      return res.status(500).json({ error: error.message });
    }

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
      if (existingRoundData.player1_input) {
        return res.status(500).json({ error: `Player 1 already submitted ${existingRoundData.player1_input} For this Round.` });
      }

      const { data: updateRoundData, error: updateRoundError } = await supabase
        .from('rounds')
        .update({ player1_input: parsedNum, status: 'playing' })
        .eq('id', roundId)
        .select();

      var firstPlayerSelections = gameJson.player1_nums
      if (firstPlayerSelections.includes(parsedNum)) {
        return res.status(500).json({ error: `${parsedNum} already selected by player 1.` });
      }
      firstPlayerSelections.push(parsedNum)

      await supabase
        .from('games')
        .update({ player1_nums: firstPlayerSelections })
        .eq('id', gameId)

      roundToReturn = updateRoundData
      // return res.status(200).json({updateRoundData})

    } else {
      if (existingRoundData.player2_input) {
        return res.status(500).json({ error: `Player 2 already submitted ${existingRoundData.player2_input} For this Round.` });
      }

      const { data: updateRoundData, error: updateRoundError } = await supabase
        .from('rounds')
        .update({ player2_input: selectedNum, status: 'playing' })
        .eq('id', roundId)
        .select();

      var secondPlayerSelections = gameJson.player2_nums
      if (secondPlayerSelections.includes(parsedNum)) {
        return res.status(500).json({ error: `${parsedNum} already selected by player 2.` });
      }
      secondPlayerSelections.push(parsedNum)

      await supabase
        .from('games')
        .update({ player2_nums: secondPlayerSelections })
        .eq('id', gameId)
        .select();

      roundToReturn = updateRoundData
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

        const { error: updateCurrentRoundError } = await supabase
          .from('games')
          .update({ current_round: updateGameWinnerData.round_number + 1 })
          .eq('id', gameId)

        if (updateCurrentRoundError) {
          return res.status(500).json({ error: updateCurrentRoundError.message });
        }

      } else {
        const { error: updateStatusError } = await supabase
          .from('games')
          .update({ status: 'complete' })
          .eq('id', gameId)

        if (updateStatusError) {
          return res.status(500).json({ error: updateStatusError.message });
        }
      }

      roundToReturn = updateGameWinnerData
    }
    return res.status(200).json({ roundToReturn })
  } else if (req.method === 'GET') {
    const { roundId } = req.query;


    const { data, error } = await supabase
      .from('rounds')
      .select(`*,
    game:games (
      *
    )`)
      .eq('id', roundId)
      .single()

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data })
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
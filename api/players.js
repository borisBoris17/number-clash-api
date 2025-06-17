import supabase from '../lib/supabase.js';

export default async function handler(req, res) {

  if (req.method === 'POST') {
    const { username } = req.body;

    const { data, error } = await supabase
      .from('players')
      .insert({
        username: username,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  } else if(req.method === 'GET') {
    const {data, error } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
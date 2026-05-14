CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  player1_id uuid REFERENCES players(id) NOT NULL,
  player2_id uuid REFERENCES players(id),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','playing','finished')),
  current_round int NOT NULL DEFAULT 0,
  rounds jsonb NOT NULL DEFAULT '[]'::jsonb,
  round_started_at timestamptz,
  p1_ready boolean NOT NULL DEFAULT false,
  p2_ready boolean NOT NULL DEFAULT false,
  winner_id uuid REFERENCES players(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read their rooms"
  ON rooms FOR SELECT
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Players can create rooms"
  ON rooms FOR INSERT
  WITH CHECK (auth.uid() = player1_id);

CREATE POLICY "Players can update their rooms"
  ON rooms FOR UPDATE
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

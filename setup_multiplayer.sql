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

ALTER TABLE rooms REPLICA IDENTITY FULL;
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

CREATE OR REPLACE FUNCTION join_room_by_code(room_code text, player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_record rooms%ROWTYPE;
BEGIN
  SELECT * INTO room_record FROM rooms WHERE code = room_code LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Room not found');
  END IF;

  IF room_record.status != 'waiting' THEN
    RETURN jsonb_build_object('error', 'Room is already full or in progress');
  END IF;

  IF room_record.player1_id = player_id THEN
    RETURN jsonb_build_object('error', 'You cannot join your own room');
  END IF;

  UPDATE rooms
  SET player2_id = player_id,
      status = 'playing',
      round_started_at = now()
  WHERE id = room_record.id
  RETURNING * INTO room_record;

  RETURN to_jsonb(room_record);
END;
$$;

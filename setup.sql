-- RPC function for username uniqueness check (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION check_username_available(username text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM players WHERE players.username = check_username_available.username);
$$;

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION check_username_available TO authenticated;
GRANT EXECUTE ON FUNCTION check_username_available TO anon;

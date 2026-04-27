-- 020_seed_agent_avatars.sql
-- Point the three default agents at their uploaded pixel-art avatars
-- (already in the brand-assets/agent-avatars/ Storage prefix).

UPDATE agent_settings SET avatar_url =
  'https://lsslorfkwtmmgbhjtdto.supabase.co/storage/v1/object/public/brand-assets/agent-avatars/social_media.png'
WHERE agent_key = 'social_media' AND avatar_url IS NULL;

UPDATE agent_settings SET avatar_url =
  'https://lsslorfkwtmmgbhjtdto.supabase.co/storage/v1/object/public/brand-assets/agent-avatars/cro.png'
WHERE agent_key = 'cro' AND avatar_url IS NULL;

UPDATE agent_settings SET avatar_url =
  'https://lsslorfkwtmmgbhjtdto.supabase.co/storage/v1/object/public/brand-assets/agent-avatars/acquisition.png'
WHERE agent_key = 'acquisition' AND avatar_url IS NULL;

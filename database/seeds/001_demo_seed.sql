-- Minimal SQL seed for PostgreSQL deployments.
-- The local Node demo also creates seeded JSON data automatically.

INSERT INTO skills (normalized_name, display_name, category)
VALUES
  ('javascript', 'JavaScript', 'frontend'),
  ('react', 'React', 'frontend'),
  ('css', 'CSS', 'frontend'),
  ('node.js', 'Node.js', 'backend'),
  ('sql', 'SQL', 'data'),
  ('machine learning', 'Machine Learning', 'ai'),
  ('accessibility', 'Accessibility', 'frontend'),
  ('docker', 'Docker', 'cloud')
ON CONFLICT (normalized_name) DO NOTHING;

INSERT INTO companies (id, name, slug, industry, location, website, size_band, verification_status, safety_policy_url, description)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  'Novalytics AI',
  'novalytics-ai',
  'AI SaaS',
  'Bengaluru, India',
  'https://novalytics.example',
  '201-500',
  'verified',
  'https://novalytics.example/safety',
  'Novalytics AI builds analytics copilots and runs a documented inclusive hiring program.'
) ON CONFLICT (id) DO NOTHING;

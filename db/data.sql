-- data.sql
INSERT INTO events (name, date, venue) VALUES
  ('Event 1', '2024-01-25', 'Venue A'),
  ('Event 2', '2024-02-10', 'Venue B');

INSERT INTO tickets (event_id, price, availability) VALUES
  (1, 20.00, 100),
  (2, 15.00, 50);

-- Add other sample data as needed

-- Switched the calendar backend from Google Calendar (service account) to
-- Cal.com's API — "google_event_id" is now a misnomer, it stores a Cal.com
-- booking uid instead.
alter table appointments rename column google_event_id to calendar_event_id;

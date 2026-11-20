-- Source-listed, not proof that a broadcast actually played on Android.
-- 15 canonical stations from merged QuantaPhi PR #1691. Re-import is idempotent.
INSERT INTO radio_stations (id,name,state_code,frequency,genre,city,player,source_url,stream_url,low_stream_url,schedule_url,status)
VALUES
  ('who', 'NEWSRADIO 1040 WHO', 'IA', '1040 AM', 'News & Talk', 'Des Moines', 'iheart', 'https://www.iheart.com/live/1040-who-925/', NULL, NULL, 'https://whoradio.iheart.com/schedule/', 'listed'),
  ('kxno', 'KXNO Sports', 'IA', '1460 AM / 106.3 FM', 'Sports', 'Des Moines', 'iheart', 'https://www.iheart.com/live/1460-and-1063-kxno-921/', NULL, NULL, NULL, 'listed'),
  ('ipr-news', 'Iowa Public Radio News', 'IA', 'WOI 640 AM', 'Public News', 'Statewide', 'mp3', 'https://www.iowapublicradio.org/listening-digitally', 'https://news-stream.iowapublicradio.org/News.mp3', 'https://news-stream.iowapublicradio.org/NewsLow.mp3', NULL, 'listed'),
  ('the-bus', '100.3 The Bus', 'IA', '100.3 FM', 'Classic Hits', 'Des Moines', 'iheart', 'https://www.iheart.com/live/1003-the-bus-2744/', NULL, NULL, NULL, 'listed'),
  ('ipr-studio-one', 'IPR Studio One', 'IA', '94.1 FM (Central Iowa)', 'Alternative Music', 'Statewide', 'mp3', 'https://www.iowapublicradio.org/listening-digitally', 'https://studioone-stream.iowapublicradio.org/StudioOne.mp3', 'https://studioone-stream.iowapublicradio.org/StudioOneLow.mp3', NULL, 'listed'),
  ('kiss', '107.5 Kiss FM', 'IA', '107.5 FM', 'Pop & Hits', 'Des Moines', 'iheart', 'https://www.iheart.com/live/1075-kiss-fm-2740/', NULL, NULL, NULL, 'listed'),
  ('ipr-classical', 'IPR Classical', 'IA', '105.9 FM (Des Moines)', 'Classical Music', 'Statewide', 'mp3', 'https://www.iowapublicradio.org/listening-digitally', 'https://classical-stream.iowapublicradio.org/Classical.mp3', 'https://classical-stream.iowapublicradio.org/ClassicalLow.mp3', NULL, 'listed'),
  ('kexp', 'KEXP', 'WA', '90.3 FM', 'Independent Music', 'Seattle', 'mp3', 'https://www.kexp.org/mobile/kexp-livestreams/', 'https://kexp.streamguys1.com/kexp160.aac', 'https://kexp.streamguys1.com/kexp64.aac', NULL, 'listed'),
  ('jazz24', 'Jazz24', 'WA', 'Online', 'Jazz', 'Seattle', 'mp3', 'https://www.jazz24.org/streaming-links/', 'https://knkx-live-a.edge.audiocdn.com/6285_128k', 'https://knkx-live-a.edge.audiocdn.com/6285_64k', NULL, 'listed'),
  ('knkx', 'KNKX Public Radio', 'WA', '88.5 FM', 'News & Jazz', 'Seattle–Tacoma', 'mp3', 'https://www.knkx.org/stream-knkx-online', 'https://knkx-live-a.edge.audiocdn.com/6284_128k', 'https://knkx-live-a.edge.audiocdn.com/6284_64k', NULL, 'listed'),
  ('wfmu', 'WFMU Freeform', 'NJ', '91.1 FM', 'Freeform Music', 'New Jersey', 'mp3', 'https://www.wfmu.org/audiostream.shtml', 'https://stream0.wfmu.org/freeform-128k', NULL, NULL, 'listed'),
  ('radiomv-english', 'RadioMV English', 'WORLD', 'Online', 'Christian Radio', 'Worldwide', 'mp3', 'https://player.radiomv.com/english.html', 'https://stream.radiomv.com/stream/english.mp3', NULL, NULL, 'listed'),
  ('radiomv-espanol', 'RadioMV Español', 'WORLD', 'Online', 'Christian Radio · Spanish', 'Worldwide', 'mp3', 'https://player.radiomv.com/spanish.html', 'https://stream.radiomv.com/stream/spanish.mp3', NULL, NULL, 'listed'),
  ('radiomv-deutsch', 'RadioMV Deutsch', 'WORLD', 'Online', 'Christian Radio · German', 'Worldwide', 'mp3', 'https://player.radiomv.com/german.html', 'https://stream.radiomv.com/stream/german.mp3', NULL, NULL, 'listed'),
  ('radiomv-slavic', 'RadioMV Slavic', 'WORLD', 'Online', 'Christian Radio · Slavic', 'Worldwide', 'mp3', 'https://player.radiomv.com/slavic.html', 'https://stream.radiomv.com/stream/slavic.mp3', NULL, NULL, 'listed')
ON CONFLICT(id) DO NOTHING;

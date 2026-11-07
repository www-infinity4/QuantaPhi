"""Verify movie trailers require a real publisher video and an exact Google trend."""
from datetime import datetime, timezone
import importlib.util
from pathlib import Path
import unittest

path = Path(__file__).resolve().parents[1] / "scripts/sync_trending_movies.py"
spec = importlib.util.spec_from_file_location("movie_sync",path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
NOW = datetime(2026,11,7,2,20,tzinfo=timezone.utc)
ATOM = "http://www.w3.org/2005/Atom"
YT = "http://www.youtube.com/xml/schemas/2015"
SOURCE = "https://trends.google.com/trending/rss?geo=US"

def yt_feed(video_title="Godzilla Minus Zero Trailer #2 (2026)",video_id="Qwerty12345"):
    return ('<feed xmlns="'+ATOM+'" xmlns:yt="'+YT+'"><entry>'
            '<yt:videoId>'+video_id+'</yt:videoId><title>'+video_title+'</title>'
            '<published>2026-11-06T12:00:00Z</published></entry></feed>').encode()

def trend(query="godzilla minus zero"):
    return {"schema_version":1,"source_url":SOURCE,"region":"US","checked_at":"2026-11-07T02:15:00Z",
            "topics":[{"query":query,"approx_searches":"20K+","published_at":"2026-11-07T01:00:00Z"}]}

class SourceTests(unittest.TestCase):
    def test_film_title_from_real_trailer(self):
        self.assertEqual(mod.movie_title("Godzilla Minus Zero Trailer #2 (2026)"),"Godzilla Minus Zero")
        self.assertEqual(mod.movie_title("Dune: Part Three | Final Trailer"),"Dune: Part Three")
        self.assertEqual(mod.movie_title("NEW TRAILER for 'Jumanji: Open World' (2026)"),"Jumanji: Open World")
        self.assertEqual(mod.movie_title("New Trailers This Week | Week 44"),"")
        self.assertEqual(mod.movie_title("Godzilla Explained and Reviewed"),"")

    def test_real_video_id_and_attributed_metadata(self):
        uploads=mod.parse_youtube_xml(yt_feed(),"Rotten Tomatoes Trailers",NOW)
        self.assertEqual(len(uploads),1)
        self.assertEqual(uploads[0]["video_id"],"Qwerty12345")
        self.assertEqual(uploads[0]["publisher"],"Rotten Tomatoes Trailers")
        self.assertEqual(mod.parse_youtube_xml(yt_feed(video_id="bad"),"Rotten Tomatoes Trailers",NOW),[])

    def test_source_matched_movie_becomes_google_trending(self):
        upload=mod.parse_youtube_xml(yt_feed(),"Rotten Tomatoes Trailers",NOW)
        result=mod.compile_movies(trend(),upload,NOW)
        self.assertEqual(len(result["items"]),1)
        self.assertTrue(result["items"][0]["google_trending"])
        self.assertEqual(result["items"][0]["approx_searches"],"20K+")

    def test_unrelated_trend_never_labels_movie_trending(self):
        upload=mod.parse_youtube_xml(yt_feed(),"Rotten Tomatoes Trailers",NOW)
        result=mod.compile_movies(trend("spurs vs kings"),upload,NOW)
        self.assertEqual(len(result["items"]),1)
        self.assertFalse(result["items"][0]["google_trending"])
        self.assertNotIn("approx_searches",result["items"][0])

    def test_no_movie_upload_means_no_fabricated_movie_cards(self):
        result=mod.compile_movies(trend(),[],NOW)
        self.assertEqual(result["items"],[])

    def test_stale_google_snapshot_rejected(self):
        data=trend()
        data["checked_at"]="2026-10-01T00:00:00Z"
        with self.assertRaises(ValueError):
            mod.compile_movies(data,mod.parse_youtube_xml(yt_feed(),"Rotten Tomatoes Trailers",NOW),NOW)

if __name__=="__main__":
    unittest.main()

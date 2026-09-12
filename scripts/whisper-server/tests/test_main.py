import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

from asbplayer_whisper_server.main import cache_key, normalize_url, source_key, validate_options, whisper_line_progress


class WhisperServerTests(unittest.TestCase):
    def test_normalizes_equivalent_urls(self):
        self.assertEqual(
            normalize_url("https://www.youtube.com/watch?b=2&a=1#player"),
            "https://www.youtube.com/watch?a=1&b=2",
        )

    def test_rejects_unknown_options(self):
        with self.assertRaisesRegex(ValueError, "Unsupported Whisper option"):
            validate_options({"not-a-whisper-option": True})

    def test_runtime_options_do_not_change_cache_key(self):
        identity = {"extractor": "Youtube", "id": "video-id", "url": "https://example.test/watch?v=video-id"}
        standard = validate_options({"model": "small", "device": "cpu"})
        accelerated = validate_options({"model": "small", "device": "cuda", "threads": 8})
        different_model = validate_options({"model": "medium", "device": "cpu"})

        self.assertEqual(source_key(identity), source_key(identity))
        self.assertEqual(cache_key(identity, standard), cache_key(identity, accelerated))
        self.assertNotEqual(cache_key(identity, standard), cache_key(identity, different_model))

    def test_reports_transcription_progress_from_verbose_whisper_timestamps(self):
        self.assertEqual(whisper_line_progress("[00:12.000 --> 00:30.000] A subtitle", 120), 25)
        self.assertEqual(whisper_line_progress("[01:00:00.000 --> 01:30:00.000] A subtitle", 7200), 75)
        self.assertIsNone(whisper_line_progress("Detecting language", 120))


if __name__ == "__main__":
    unittest.main()

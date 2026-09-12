---
sidebar_position: 10
---

# Generate subtitles locally

asbplayer can generate an SRT subtitle track for a streaming video using a Whisper service running on your own computer. The service downloads audio through `yt-dlp`, then Whisper uses FFmpeg to decode and preprocess it. It does not send your video or subtitles to an asbplayer server.

YouTube is supported directly. Other streaming sites are supported when `yt-dlp` can extract their audio; DRM-protected and unsupported sites cannot be processed.

## Install the local service

Install [Python 3.10+](https://www.python.org/downloads/) and [FFmpeg](https://ffmpeg.org/download.html), then clone this repository and run:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install ./scripts/whisper-server
asbplayer-whisper-server
```

On Windows, activate the virtual environment with `.venv\\Scripts\\activate` instead. The first transcription downloads the selected Whisper model, which can take time and disk space.

For reliable YouTube support, install a JavaScript runtime as well (on macOS, `brew install node`). yt-dlp's extractors change frequently; if a source starts reporting an extraction or page-reload error, stop the service and update its downloader in the same virtual environment:

```bash
python -m pip install --upgrade --pre "yt-dlp[default,curl-cffi]" yt-dlp-ejs
asbplayer-whisper-server
```

The service listens only on `http://127.0.0.1:8767`. Confirm that it is running with:

```bash
curl http://127.0.0.1:8767/v1/health
```

This service is separate from the optional WebSocket/AnkiConnect companion server.

## Generate and reuse a subtitle track

1. Open asbplayer's **Select Subtitles** pop-out on a desktop streaming page.
2. Choose **Generate Subtitles** at the bottom.
3. Configure Whisper and choose **Generate**. The dialog reports download and transcription state; canceling the dialog cancels its job.
4. When finished, the generated SRT is added and selected in the first empty subtitle slot. Select **OK** to load it.

The service stores completed SRT files in your local user cache directory. A revisit to the same video lists cached variants and selects the newest available result. Cache identity includes the video and output-affecting Whisper options, so changing a model or decoding setting creates a separate result while changing a runtime setting such as CPU thread count does not.

## Notes

- The generator is not available for local video files or mobile extension builds.
- The popup exposes every option from the version-pinned Whisper command line except input audio, output directory/format, and verbose output. asbplayer supplies the current page URL, always requests an SRT, and uses Whisper's native frame counter and time estimate for progress.
- Long videos can take substantial time, CPU/GPU memory, and disk space. The service runs one job at a time to avoid competing Whisper processes.

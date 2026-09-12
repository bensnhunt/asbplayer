import type { SubtitleGenerationMessage, SubtitleGenerationResponse } from '@project/common';

export const whisperServerUrl = 'http://127.0.0.1:8767';

const responseError = (error: unknown): SubtitleGenerationResponse => ({
    error: error instanceof Error ? error.message : String(error),
});

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
};

const fetchJson = async (path: string, init?: RequestInit) => {
    const response = await fetch(`${whisperServerUrl}${path}`, init);
    const contentType = response.headers.get('content-type') ?? '';
    const body = contentType.includes('application/json') ? await response.json() : { error: await response.text() };

    if (!response.ok) {
        throw new Error(body.error || body.detail || `Whisper service returned ${response.status}`);
    }

    return body;
};

const validSourceUrl = (sourceUrl: string | undefined) => {
    if (!sourceUrl) return false;

    try {
        return ['http:', 'https:'].includes(new URL(sourceUrl).protocol);
    } catch {
        return false;
    }
};

/**
 * The service is deliberately accessed only by the extension background. Page
 * frames cannot make loopback requests, which prevents CSP and CORS from
 * affecting subtitle generation.
 */
export const requestWhisperServer = async (message: SubtitleGenerationMessage): Promise<SubtitleGenerationResponse> => {
    try {
        switch (message.operation) {
            case 'capabilities':
                return { capabilities: await fetchJson('/v1/capabilities') };
            case 'cached': {
                if (!validSourceUrl(message.sourceUrl)) return { error: 'A valid video URL is required.' };
                const query = new URLSearchParams({ sourceUrl: message.sourceUrl! });
                return { entries: await fetchJson(`/v1/cache?${query}`) };
            }
            case 'start': {
                if (!validSourceUrl(message.sourceUrl)) return { error: 'A valid video URL is required.' };
                return {
                    job: await fetchJson('/v1/jobs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sourceUrl: message.sourceUrl,
                            whisperOptions: message.whisperOptions ?? {},
                        }),
                    }),
                };
            }
            case 'status':
                if (!message.jobId) return { error: 'A subtitle generation job ID is required.' };
                return { job: await fetchJson(`/v1/jobs/${encodeURIComponent(message.jobId)}`) };
            case 'cancel':
                if (!message.jobId) return { error: 'A subtitle generation job ID is required.' };
                return {
                    job: await fetchJson(`/v1/jobs/${encodeURIComponent(message.jobId)}`, { method: 'DELETE' }),
                };
            case 'download': {
                if (!message.cacheEntryId) return { error: 'A generated subtitle cache ID is required.' };
                const response = await fetch(
                    `${whisperServerUrl}/v1/cache/${encodeURIComponent(message.cacheEntryId)}/srt`
                );
                if (!response.ok)
                    throw new Error((await response.text()) || `Whisper service returned ${response.status}`);
                const disposition = response.headers.get('content-disposition') ?? '';
                const fileName = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? 'generated-subtitles.srt';
                return { srtBase64: arrayBufferToBase64(await response.arrayBuffer()), fileName };
            }
        }
    } catch (error) {
        return responseError(error);
    }
};

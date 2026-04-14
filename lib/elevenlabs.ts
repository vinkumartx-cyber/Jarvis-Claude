const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export interface TextToSpeechOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  speakingRate?: number;
  modelId?: string;
}

export async function textToSpeech(
  text: string,
  options: TextToSpeechOptions = {}
): Promise<ArrayBuffer | null> {
  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('Missing ELEVENLABS_API_KEY environment variable');
    }

    const {
      voiceId = 'EXAVITQu4vr4xnSDxMaL', // Default voice
      stability = 0.5,
      similarityBoost = 0.75,
      speakingRate = 1.0,
      modelId = 'eleven_multilingual_v2',
    } = options;

    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorData}`);
    }

    // Check if the response is actually audio
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('audio')) {
      throw new Error('Invalid response from ElevenLabs: expected audio');
    }

    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
  } catch (error) {
    console.error('Error converting text to speech:', error);
    return null;
  }
}

export async function generateAndUploadBriefingAudio(text: string, userId: string): Promise<{ url: string; duration: number } | null> {
  try {
    const audioBuffer = await textToSpeech(text, {
      stability: 0.5,
      similarityBoost: 0.75,
      speakingRate: 1.0,
    });

    if (!audioBuffer) {
      return null;
    }

    // Estimate duration based on text length and speech rate
    // Average speech rate is ~150 words per minute
    const wordCount = text.split(/\s+/).length;
    const estimatedDurationSeconds = (wordCount / 150) * 60;

    // Upload to Supabase Storage
    const fileName = `briefings/${userId}/${Date.now()}.mp3`;
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });

    // Use server-side upload
    const uploadResponse = await fetch('/api/upload-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName,
        audioData: Buffer.from(audioBuffer).toString('base64'),
      }),
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload audio');
    }

    const { url } = await uploadResponse.json();

    return {
      url,
      duration: estimatedDurationSeconds,
    };
  } catch (error) {
    console.error('Error generating and uploading briefing audio:', error);
    return null;
  }
}

export async function getAvailableVoices(): Promise<Array<{ voiceId: string; name: string; gender: string }> | null> {
  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('Missing ELEVENLABS_API_KEY environment variable');
    }

    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const data = (await response.json()) as { voices?: Array<{ voice_id: string; name: string; labels?: Record<string, string> }> };
    const voices = data.voices || [];

    return voices.map((voice) => ({
      voiceId: voice.voice_id,
      name: voice.name,
      gender: voice.labels?.gender || 'unknown',
    }));
  } catch (error) {
    console.error('Error fetching available voices:', error);
    return null;
  }
}

export async function getAudioFromBuffer(buffer: ArrayBuffer): Promise<Blob> {
  return new Blob([buffer], { type: 'audio/mpeg' });
}

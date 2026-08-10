
<br />

<br />

The Gemini API can transform text input into single speaker or multi-speaker audio using native text-to-speech (TTS) generation capabilities. Text-to-speech (TTS) generation is*[controllable](https://ai.google.dev/gemini-api/docs/speech-generation#controllable)* , meaning you can use natural language to structure interactions and guide the*style* ,*accent* ,*pace* , and*tone*of the audio.

The TTS capability differs from speech generation provided through the[Live API](https://ai.google.dev/gemini-api/docs/live), which is designed for interactive, unstructured audio, and multimodal inputs and outputs. While the Live API excels in dynamic conversational contexts, TTS through the Gemini API is tailored for scenarios that require exact text recitation with fine-grained control over style and sound, such as podcast or audiobook generation.

This guide shows you how to generate single-speaker and multi-speaker audio from text.
| **Preview:** Native text-to-speech (TTS) is in[Preview](https://ai.google.dev/gemini-api/docs/models#preview).

## Before you begin

Ensure you use a Gemini 2.5 model variant with native text-to-speech (TTS) capabilities, as listed in the[Supported models](https://ai.google.dev/gemini-api/docs/speech-generation#supported-models)section. For optimal results, consider which model best fits your specific use case.

You may find it useful to[test the Gemini 2.5 TTS models in AI Studio](https://aistudio.google.com/generate-speech)before you start building.
| **Note:** TTS models accept text-only inputs and produce audio-only outputs. For a complete list of restrictions specific to TTS models, review the[Limitations](https://ai.google.dev/gemini-api/docs/speech-generation#limitations)section.

## Single-speaker text-to-speech

To convert text to single-speaker audio, set the response modality to "audio", and pass a`SpeechConfig`object with`VoiceConfig`set. You'll need to choose a voice name from the prebuilt[output voices](https://ai.google.dev/gemini-api/docs/speech-generation#voices).

This example saves the output audio from the model in a wave file:  

### Python

    from google import genai
    from google.genai import types
    import wave

    # Set up the wave file to save the output:
    def wave_file(filename, pcm, channels=1, rate=24000, sample_width=2):
       with wave.open(filename, "wb") as wf:
          wf.setnchannels(channels)
          wf.setsampwidth(sample_width)
          wf.setframerate(rate)
          wf.writeframes(pcm)

    client = genai.Client()

    response = client.models.generate_content(
       model="gemini-2.5-flash-preview-tts",
       contents="Say cheerfully: Have a wonderful day!",
       config=types.GenerateContentConfig(
          response_modalities=["AUDIO"],
          speech_config=types.SpeechConfig(
             voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                   voice_name='Kore',
                )
             )
          ),
       )
    )

    data = response.candidates[0].content.parts[0].inline_data.data

    file_name='out.wav'
    wave_file(file_name, data) # Saves the file to current directory

| For more code samples, refer to the "TTS - Get Started" file in the cookbooks repository:
|
| [View on GitHub](https://colab.research.google.com/github/google-gemini/cookbook/blob/main/quickstarts/Get_started_TTS.ipynb)

### JavaScript

    import {GoogleGenAI} from '@google/genai';
    import wav from 'wav';

    async function saveWaveFile(
       filename,
       pcmData,
       channels = 1,
       rate = 24000,
       sampleWidth = 2,
    ) {
       return new Promise((resolve, reject) => {
          const writer = new wav.FileWriter(filename, {
                channels,
                sampleRate: rate,
                bitDepth: sampleWidth * 8,
          });

          writer.on('finish', resolve);
          writer.on('error', reject);

          writer.write(pcmData);
          writer.end();
       });
    }

    async function main() {
       const ai = new GoogleGenAI({});

       const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: 'Say cheerfully: Have a wonderful day!' }] }],
          config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                   voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Kore' },
                   },
                },
          },
       });

       const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
       const audioBuffer = Buffer.from(data, 'base64');

       const fileName = 'out.wav';
       await saveWaveFile(fileName, audioBuffer);
    }
    await main();

### REST

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -X POST \
      -H "Content-Type: application/json" \
      -d '{
            "contents": [{
              "parts":[{
                "text": "Say cheerfully: Have a wonderful day!"
              }]
            }],
            "generationConfig": {
              "responseModalities": ["AUDIO"],
              "speechConfig": {
                "voiceConfig": {
                  "prebuiltVoiceConfig": {
                    "voiceName": "Kore"
                  }
                }
              }
            },
            "model": "gemini-2.5-flash-preview-tts",
        }' | jq -r '.candidates[0].content.parts[0].inlineData.data' | \
              base64 --decode >out.pcm
    # You may need to install ffmpeg.
    ffmpeg -f s16le -ar 24000 -ac 1 -i out.pcm out.wav

## Multi-speaker text-to-speech

For multi-speaker audio, you'll need a`MultiSpeakerVoiceConfig`object with each speaker (up to 2) configured as a`SpeakerVoiceConfig`. You'll need to define each`speaker`with the same names used in the[prompt](https://ai.google.dev/gemini-api/docs/speech-generation#controllable):  

### Python

    from google import genai
    from google.genai import types
    import wave

    # Set up the wave file to save the output:
    def wave_file(filename, pcm, channels=1, rate=24000, sample_width=2):
       with wave.open(filename, "wb") as wf:
          wf.setnchannels(channels)
          wf.setsampwidth(sample_width)
          wf.setframerate(rate)
          wf.writeframes(pcm)

    client = genai.Client()

    prompt = """TTS the following conversation between Joe and Jane:
             Joe: How's it going today Jane?
             Jane: Not too bad, how about you?"""

    response = client.models.generate_content(
       model="gemini-2.5-flash-preview-tts",
       contents=prompt,
       config=types.GenerateContentConfig(
          response_modalities=["AUDIO"],
          speech_config=types.SpeechConfig(
             multi_speaker_voice_config=types.MultiSpeakerVoiceConfig(
                speaker_voice_configs=[
                   types.SpeakerVoiceConfig(
                      speaker='Joe',
                      voice_config=types.VoiceConfig(
                         prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name='Kore',
                         )
                      )
                   ),
                   types.SpeakerVoiceConfig(
                      speaker='Jane',
                      voice_config=types.VoiceConfig(
                         prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name='Puck',
                         )
                      )
                   ),
                ]
             )
          )
       )
    )

    data = response.candidates[0].content.parts[0].inline_data.data

    file_name='out.wav'
    wave_file(file_name, data) # Saves the file to current directory

### JavaScript

    import {GoogleGenAI} from '@google/genai';
    import wav from 'wav';

    async function saveWaveFile(
       filename,
       pcmData,
       channels = 1,
       rate = 24000,
       sampleWidth = 2,
    ) {
       return new Promise((resolve, reject) => {
          const writer = new wav.FileWriter(filename, {
                channels,
                sampleRate: rate,
                bitDepth: sampleWidth * 8,
          });

          writer.on('finish', resolve);
          writer.on('error', reject);

          writer.write(pcmData);
          writer.end();
       });
    }

    async function main() {
       const ai = new GoogleGenAI({});

       const prompt = `TTS the following conversation between Joe and Jane:
             Joe: How's it going today Jane?
             Jane: Not too bad, how about you?`;

       const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: prompt }] }],
          config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                   multiSpeakerVoiceConfig: {
                      speakerVoiceConfigs: [
                            {
                               speaker: 'Joe',
                               voiceConfig: {
                                  prebuiltVoiceConfig: { voiceName: 'Kore' }
                               }
                            },
                            {
                               speaker: 'Jane',
                               voiceConfig: {
                                  prebuiltVoiceConfig: { voiceName: 'Puck' }
                               }
                            }
                      ]
                   }
                }
          }
       });

       const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
       const audioBuffer = Buffer.from(data, 'base64');

       const fileName = 'out.wav';
       await saveWaveFile(fileName, audioBuffer);
    }

    await main();

### REST

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -X POST \
      -H "Content-Type: application/json" \
      -d '{
      "contents": [{
        "parts":[{
          "text": "TTS the following conversation between Joe and Jane:
                    Joe: Hows it going today Jane?
                    Jane: Not too bad, how about you?"
        }]
      }],
      "generationConfig": {
        "responseModalities": ["AUDIO"],
        "speechConfig": {
          "multiSpeakerVoiceConfig": {
            "speakerVoiceConfigs": [{
                "speaker": "Joe",
                "voiceConfig": {
                  "prebuiltVoiceConfig": {
                    "voiceName": "Kore"
                  }
                }
              }, {
                "speaker": "Jane",
                "voiceConfig": {
                  "prebuiltVoiceConfig": {
                    "voiceName": "Puck"
                  }
                }
              }]
          }
        }
      },
      "model": "gemini-2.5-flash-preview-tts",
    }' | jq -r '.candidates[0].content.parts[0].inlineData.data' | \
        base64 --decode > out.pcm
    # You may need to install ffmpeg.
    ffmpeg -f s16le -ar 24000 -ac 1 -i out.pcm out.wav

## Controlling speech style with prompts

You can control style, tone, accent, and pace using natural language prompts for both single- and multi-speaker TTS. For example, in a single-speaker prompt, you can say:  

    Say in an spooky whisper:
    "By the pricking of my thumbs...
    Something wicked this way comes"

In a multi-speaker prompt, provide the model with each speaker's name and corresponding transcript. You can also provide guidance for each speaker individually:  

    Make Speaker1 sound tired and bored, and Speaker2 sound excited and happy:

    Speaker1: So... what's on the agenda today?
    Speaker2: You're never going to guess!

Try using a[voice option](https://ai.google.dev/gemini-api/docs/speech-generation#voices)that corresponds to the style or emotion you want to convey, to emphasize it even more. In the previous prompt, for example,*Enceladus* 's breathiness might emphasize "tired" and "bored", while*Puck*'s upbeat tone could complement "excited" and "happy".

## Generating a prompt to convert to audio

The TTS models only output audio, but you can use[other models](https://ai.google.dev/gemini-api/docs/models)to generate a transcript first, then pass that transcript to the TTS model to read aloud.  

### Python

    from google import genai
    from google.genai import types

    client = genai.Client()

    transcript = client.models.generate_content(
       model="gemini-2.5-flash",
       contents="""Generate a short transcript around 100 words that reads
                like it was clipped from a podcast by excited herpetologists.
                The hosts names are Dr. Anya and Liam.""").text

    response = client.models.generate_content(
       model="gemini-2.5-flash-preview-tts",
       contents=transcript,
       config=types.GenerateContentConfig(
          response_modalities=["AUDIO"],
          speech_config=types.SpeechConfig(
             multi_speaker_voice_config=types.MultiSpeakerVoiceConfig(
                speaker_voice_configs=[
                   types.SpeakerVoiceConfig(
                      speaker='Dr. Anya',
                      voice_config=types.VoiceConfig(
                         prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name='Kore',
                         )
                      )
                   ),
                   types.SpeakerVoiceConfig(
                      speaker='Liam',
                      voice_config=types.VoiceConfig(
                         prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name='Puck',
                         )
                      )
                   ),
                ]
             )
          )
       )
    )

    # ...Code to stream or save the output

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const ai = new GoogleGenAI({});

    async function main() {

    const transcript = await ai.models.generateContent({
       model: "gemini-2.5-flash",
       contents: "Generate a short transcript around 100 words that reads like it was clipped from a podcast by excited herpetologists. The hosts names are Dr. Anya and Liam.",
       })

    const response = await ai.models.generateContent({
       model: "gemini-2.5-flash-preview-tts",
       contents: transcript,
       config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
             multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                       {
                         speaker: "Dr. Anya",
                         voiceConfig: {
                            prebuiltVoiceConfig: {voiceName: "Kore"},
                         }
                      },
                      {
                         speaker: "Liam",
                         voiceConfig: {
                            prebuiltVoiceConfig: {voiceName: "Puck"},
                        }
                      }
                    ]
                  }
                }
          }
      });
    }
    // ..JavaScript code for exporting .wav file for output audio

    await main();

## Voice options

TTS models support the following 30 voice options in the`voice_name`field:  

|----------------------------|----------------------------------|--------------------------------|
| **Zephyr** --*Bright*      | **Puck** --*Upbeat*              | **Charon** --*Informative*     |
| **Kore** --*Firm*          | **Fenrir** --*Excitable*         | **Leda** --*Youthful*          |
| **Orus** --*Firm*          | **Aoede** --*Breezy*             | **Callirrhoe** --*Easy-going*  |
| **Autonoe** --*Bright*     | **Enceladus** --*Breathy*        | **Iapetus** --*Clear*          |
| **Umbriel** --*Easy-going* | **Algieba** --*Smooth*           | **Despina** --*Smooth*         |
| **Erinome** --*Clear*      | **Algenib** --*Gravelly*         | **Rasalgethi** --*Informative* |
| **Laomedeia** --*Upbeat*   | **Achernar** --*Soft*            | **Alnilam** --*Firm*           |
| **Schedar** --*Even*       | **Gacrux** --*Mature*            | **Pulcherrima** --*Forward*    |
| **Achird** --*Friendly*    | **Zubenelgenubi** --*Casual*     | **Vindemiatrix** --*Gentle*    |
| **Sadachbia** --*Lively*   | **Sadaltager** --*Knowledgeable* | **Sulafat** --*Warm*           |

You can hear all the voice options in[AI Studio](https://aistudio.google.com/generate-speech).

## Supported languages

The TTS models detect the input language automatically. They support the following 24 languages:

|        Language        |      BCP-47 Code       |       Language       | BCP-47 Code |
|------------------------|------------------------|----------------------|-------------|
| Arabic (Egyptian)      | `ar-EG`                | German (Germany)     | `de-DE`     |
| English (US)           | `en-US`                | Spanish (US)         | `es-US`     |
| French (France)        | `fr-FR`                | Hindi (India)        | `hi-IN`     |
| Indonesian (Indonesia) | `id-ID`                | Italian (Italy)      | `it-IT`     |
| Japanese (Japan)       | `ja-JP`                | Korean (Korea)       | `ko-KR`     |
| Portuguese (Brazil)    | `pt-BR`                | Russian (Russia)     | `ru-RU`     |
| Dutch (Netherlands)    | `nl-NL`                | Polish (Poland)      | `pl-PL`     |
| Thai (Thailand)        | `th-TH`                | Turkish (Turkey)     | `tr-TR`     |
| Vietnamese (Vietnam)   | `vi-VN`                | Romanian (Romania)   | `ro-RO`     |
| Ukrainian (Ukraine)    | `uk-UA`                | Bengali (Bangladesh) | `bn-BD`     |
| English (India)        | `en-IN`\&`hi-IN`bundle | Marathi (India)      | `mr-IN`     |
| Tamil (India)          | `ta-IN`                | Telugu (India)       | `te-IN`     |

## Supported models

|                                                   Model                                                   | Single speaker | Multispeaker |
|-----------------------------------------------------------------------------------------------------------|----------------|--------------|
| [Gemini 2.5 Flash Preview TTS](https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-preview-tts) | âœ”ï¸             | âœ”ï¸           |
| [Gemini 2.5 Pro Preview TTS](https://ai.google.dev/gemini-api/docs/models#gemini-2.5-pro-preview-tts)     | âœ”ï¸             | âœ”ï¸           |

## Limitations

- TTS models can only receive text inputs and generate audio outputs.
- A TTS session has a[context window](https://ai.google.dev/gemini-api/docs/long-context)limit of 32k tokens.
- Review[Languages](https://ai.google.dev/gemini-api/docs/speech-generation#languages)section for language support.

## Prompting guide

The**Gemini Native Audio Generation Text-to-Speech (TTS)** model differentiates itself from traditional TTS models by using a large language model that knows***not only what to say, but also how to say it***.

To unlock this capability, users can think of themselves as directors setting a scene for a virtual voice talent to perform. To craft a prompt, we recommend considering the following components: an**Audio Profile** that defines the character's core identity and archetype; a**Scene description** that establishes the physical environment and emotional "vibe"; and**Director's Notes**that offer more precise performance guidance regarding style, accent and pace control.

By providing nuanced instructions such as a precise regional accent, specific paralinguistic features (e.g. breathiness), or pacing, users can leverage the model's context awareness to generate highly dynamic, natural and expressive audio performances. For optimal performance, we recommend the**Transcript** and directorial prompts align,*so that "who is saying it"* matches with*"what is said"* and*"how it is being said."*

The purpose of this guide is to offer fundamental direction and spark ideas when developing audio experiences using Gemini TTS audio generation. We are excited to witness what you create!

### Prompting structure

A robust prompt ideally includes the following elements that come together to craft a great performance:

- **Audio Profile**- Establishes a persona for the voice, defining a character identity, archetype and any other characteristics like age, background etc.
- **Scene**- Sets the stage. Describes both the physical environment and the "vibe".
- **Director's Notes**- Performance guidance where you can break down which instructions are important for your virtual talent to take note of. Examples are style, breathing, pacing, articulation and accent.
- **Sample context**- Gives the model a contextual starting point, so your virtual actor enters the scene you set up naturally.
- **Transcript**- The text that the model will speak out. For best performance, remember that the transcript topic and writing style should correlate to the directions you are giving.

| **Note:** Have Gemini help you build your prompt, just give it a blank outline of the format below and ask it to sketch out a character for you.

Example full prompt:  

    # AUDIO PROFILE: Jaz R.
    ## "The Morning Hype"

    ## THE SCENE: The London Studio
    It is 10:00 PM in a glass-walled studio overlooking the moonlit London skyline,
    but inside, it is blindingly bright. The red "ON AIR" tally light is blazing.
    Jaz is standing up, not sitting, bouncing on the balls of their heels to the
    rhythm of a thumping backing track. Their hands fly across the faders on a
    massive mixing desk. It is a chaotic, caffeine-fueled cockpit designed to wake
    up an entire nation.

    ### DIRECTOR'S NOTES
    Style:
    * The "Vocal Smile": You must hear the grin in the audio. The soft palate is
    always raised to keep the tone bright, sunny, and explicitly inviting.
    * Dynamics: High projection without shouting. Punchy consonants and elongated
    vowels on excitement words (e.g., "Beauuutiful morning").

    Pace: Speaks at an energetic pace, keeping up with the fast music.  Speaks
    with A "bouncing" cadence. High-speed delivery with fluid transitions --- no dead
    air, no gaps.

    Accent: Jaz is from Brixton, London

    ### SAMPLE CONTEXT
    Jaz is the industry standard for Top 40 radio, high-octane event promos, or any
    script that requires a charismatic Estuary accent and 11/10 infectious energy.

    #### TRANSCRIPT
    Yes, massive vibes in the studio! You are locked in and it is absolutely
    popping off in London right now. If you're stuck on the tube, or just sat
    there pretending to work... stop it. Seriously, I see you. Turn this up!
    We've got the project roadmap landing in three, two... let's go!

### Detailed Prompting Strategies

Let's break down each element of the prompt.

#### Audio Profile

Briefly describe the persona of the character.

- **Name.**Giving your character a name helps ground the model and tight performance together, Refer to the character by name when setting the scene and context
- **Role.**Core identity and archetype of the character that's playing out in the scene. e.g., Radio DJ, Podcaster, News reporter etc.

Examples:  

    # AUDIO PROFILE: Jaz R.
    ## "The Morning Hype"

<br />

    # AUDIO PROFILE: Monica A.
    ## "The Beauty Influencer"

#### Scene

Set the context for the scene, including location, mood, and environmental details that establish the tone and vibe. Describe what is happening around the character and how it affects them. The scene provides the environmental context for the entire interaction and guides the acting performance in a subtle, organic way.

Examples:  

    ## THE SCENE: The London Studio
    It is 10:00 PM in a glass-walled studio overlooking the moonlit London skyline,
    but inside, it is blindingly bright. The red "ON AIR" tally light is blazing.
    Jaz is standing up, not sitting, bouncing on the balls of their heels to the
    rhythm of a thumping backing track. Their hands fly across the faders on a
    massive mixing desk. It is a chaotic, caffeine-fueled cockpit designed to
    wake up an entire nation.

<br />

    ## THE SCENE: Homegrown Studio
    A meticulously sound-treated bedroom in a suburban home. The space is
    deadened by plush velvet curtains and a heavy rug, but there is a
    distinct "proximity effect."

#### Directors notes

This critical section includes specific performance guidance. You can skip all the other elements, but we recommend you include this element.

Define only what's important to the performance, being careful to not overspecify. Too many strict rules will limit the models' creativity and may result in a worse performance. Balance the role and scene description with the specific performance rules.

The most common directions are**Style, Pacing and Accent**, but the model is not limited to these, nor requires them. Feel free to include custom instructions to cover any additional details important to your performance, and go into as much or as little detail as necessary.

For example:  

    ### DIRECTOR'S NOTES

    Style: Enthusiastic and Sassy GenZ beauty YouTuber

    Pacing: Speaks at an energetic pace, keeping up with the extremely fast, rapid
    delivery influencers use in short form videos.

    Accent: Southern california valley girl from Laguna Beach |

**Style:**

Sets the tone and Style of the generated speech. Include things like upbeat, energetic, relaxed, bored etc. to guide the performance. Be descriptive and provide as much detail as necessary:*"Infectious enthusiasm. The listener should feel like they are part of a massive, exciting community event."* works better than simply saying*"energetic and enthusiastic".*

You can even try terms that are popular in the voiceover industry, like "vocal smile". You can layer as many style characteristics as you want.

Examples:

Simple Emotion  

    DIRECTORS NOTES
    ...
    Style: Frustrated and angry developer who can't get the build to run.
    ...

More depth  

    DIRECTORS NOTES
    ...
    Style: Sassy GenZ beauty YouTuber, who mostly creates content for YouTube Shorts.
    ...

Complex  

    DIRECTORS NOTES
    Style:
    * The "Vocal Smile": You must hear the grin in the audio. The soft palate is
    always raised to keep the tone bright, sunny, and explicitly inviting.
    *Dynamics: High projection without shouting. Punchy consonants and
    elongated vowels on excitement words (e.g., "Beauuutiful morning").

**Accent:**

Describe the desired accent. The more specific you are, the better the results are. For example use "*British English accent as heard in Croydon, England* " vs "*British Accent*".

Examples:  

    ### DIRECTORS NOTES
    ...
    Accent: Southern california valley girl from Laguna Beach
    ...

<br />

    ### DIRECTORS NOTES
    ...
    Accent: Jaz is a from Brixton, London
    ...

**Pacing:**

Overall pacing and pace variation throughout the piece.

Examples:

Simple  

    ### DIRECTORS NOTES
    ...
    Pacing: Speak as fast as possible
    ...

More Depth  

    ### DIRECTORS NOTES
    ...
    Pacing: Speaks at a faster, energetic pace, keeping up with fast paced music.
    ...

Complex  

    ### DIRECTORS NOTES
    ...
    Pacing: The "Drift": The tempo is incredibly slow and liquid. Words bleed into each other. There is zero urgency.
    ...

**Give it a try**

Try some of these examples yourself on[AI Studio](https://aistudio.google.com/generate-speech), play with our[TTS App](http://aistudio.google.com/app/apps/bundled/synergy_intro)and let Gemini put you in the directors chair. Keep these tips in mind to make great vocal performances:

- Remember to keep the entire prompt coherent -- the script and direction go hand in hand in creating a great performance.
- Don't feel you have to describe everything, sometimes giving the model space to fill in the gaps helps naturalness. (Just like a talented actor)
- If you ever are feeling stuck, have Gemini lend you a hand to help you craft your script or performance.

## What's next

- Try the[audio generation cookbook](https://colab.research.google.com/github/google-gemini/cookbook/blob/main/quickstarts/Get_started_TTS.ipynb).
- Gemini's[Live API](https://ai.google.dev/gemini-api/docs/live)offers interactive audio generation options you can interleave with other modalities.
- For working with audio*inputs* , visit the[Audio understanding](https://ai.google.dev/gemini-api/docs/audio)guide.

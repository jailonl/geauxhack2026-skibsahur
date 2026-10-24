// DeepSpace AI: writes bot posts for the feed and replies from each chat channel's AI operator.
// Worker-only (imported by src/cron.ts and src/actions/index.ts). Calls are billed to the app owner's credits.
// If an AI call fails, bot posts fall back to the scripted lines in bots.ts.
import { createDeepSpaceAI } from 'deepspace/worker'
import { generateText } from 'ai'
import type { Env } from '../../../worker'
import { BODY_LABELS, formatDelay, lightDelaySeconds } from '../../lib/space'
import { pickPersona, scriptedLine, toBotPost, type BotPost } from './bots'
import type { Channel } from './channels'

const MODEL = 'claude-haiku-5-5' // fast and cheap: good for short in-character posts
const MAX_TOKENS = 200

/** Real facts the AI can draw on so posts stay grounded in actual space science. */
function factSheet(now: number): string {
  return [
    `Current Earth–Mars one-way light delay: ${formatDelay(lightDelaySeconds('earth', 'mars', now))}.`,
    'Earth–Moon light delay: about 1.3 seconds.',
    'A Mars day (sol) is 24 h 39 min 35 s. Mars surface pressure is under 1% of Earth\'s.',
    'Mars surface temperatures typically range from about -125 °C to 20 °C.',
    'Curiosity measured about 0.67 mSv/day of radiation on the Mars surface.',
    'The ISS recycles about 98% of its water.',
  ].join('\n')
}

function clean(text: string, maxLength: number): string {
  return text.trim().replace(/^["']|["']$/g, '').slice(0, maxLength)
}

/** One feed post from a random persona, written by DeepSpace AI. Falls back to a scripted line. */
export async function generateBotPost(env: Env, now: number = Date.now()): Promise<BotPost> {
  const persona = pickPersona()
  try {
    const ai = createDeepSpaceAI(env, 'anthropic')
    const { text } = await generateText({
      model: ai(MODEL),
      maxOutputTokens: MAX_TOKENS,
      system:
        `You are ${persona.name}, ${persona.voice}. You post short updates to a social feed used by human colonists ` +
        'living off Earth. Write ONE post under 240 characters, in character. No hashtags, no emoji, no quotation marks. ' +
        'Keep it friendly and suitable for all ages. Stay consistent with these real facts when relevant:\n' +
        factSheet(now),
      prompt: 'Write your next post. Example of your style: ' + scriptedLine(persona, now),
    })
    const post = clean(text, 280)
    if (post) return toBotPost(persona, post)
  } catch (err) {
    console.error('[ai] bot post failed, using scripted line:', err)
  }
  return toBotPost(persona, scriptedLine(persona, now))
}

/** A channel operator's in-character reply to a colonist's message. Returns null if the AI call fails. */
export async function generateOperatorReply(
  env: Env,
  channel: Channel,
  message: { content: string; authorName: string; fromBody: keyof typeof BODY_LABELS },
  now: number = Date.now(),
): Promise<string | null> {
  try {
    const delay = lightDelaySeconds(message.fromBody, channel.body, now)
    const ai = createDeepSpaceAI(env, 'anthropic')
    const { text } = await generateText({
      model: ai(MODEL),
      maxOutputTokens: MAX_TOKENS,
      system:
        `You are ${channel.operator}, ${channel.operatorVoice}, answering the "${channel.name}" comms channel ` +
        `on ${BODY_LABELS[channel.body]}. The message came from ${BODY_LABELS[message.fromBody]}; ` +
        `it took ${formatDelay(delay)} to reach you and your reply takes as long to get back. ` +
        'Reply in under 300 characters, in character, helpful and friendly. No emoji. ' +
        'Never claim to be human. Stay consistent with these real facts when relevant:\n' +
        factSheet(now),
      prompt: `${message.authorName} says: ${message.content}`,
    })
    return clean(text, 500) || null
  } catch (err) {
    console.error('[ai] operator reply failed:', err)
    return null
  }
}

// DeepSpace AI: writes bot posts for the feed and replies from the AI operators in direct messages.
// Worker-only (imported by src/cron.ts and src/actions/index.ts). Calls are billed to the app owner's credits.
// If an AI call fails, bot posts fall back to the scripted lines in bots.ts.
// Every prompt that includes text people wrote is protected against prompt injection (see aiSafety.ts).
import { createDeepSpaceAI } from 'deepspace/worker'
import { generateText } from 'ai'
import type { Env } from '../../../worker'
import { BODY_LABELS, formatDelay, lightDelaySeconds, type Place } from '../../lib/space'
import { SAFETY_RULES, safeName, safeOutput, untrusted } from './aiSafety'
import { pickPersona, scriptedLine, toBotPost, type BotPost, type Persona } from './bots'
import type { Colonist } from '../forums/colonists'
import type { Operator } from '../social/operators'

const MODEL = 'claude-haiku-5-5' // fast and cheap: good for short in-character posts
// Generous ceiling so the model never runs out of room before writing its answer. Billing is by actual
// usage, and the prompts ask for short replies, so this doesn't raise the normal cost.
const MAX_TOKENS = 1000

/** Turn any thrown value into one readable log string (Workers logs drop Error objects' messages). */
export function describeError(err: unknown): string {
  return err instanceof Error ? `${err.name}: ${err.message}` : String(err)
}

/** Real facts the AI can draw on so posts stay grounded in actual space science. */
function factSheet(now: number): string {
  return [
    `Current Earth–Mars one-way light delay (only applies to messages between Earth and Mars): ${formatDelay(lightDelaySeconds('earth', 'mars', now))}.`,
    'Earth–Moon light delay: about 1.3 seconds.',
    'A Mars day (sol) is 24 h 39 min 35 s. Mars surface pressure is under 1% of Earth\'s.',
    'Mars surface temperatures typically range from about -125 °C to 20 °C.',
    'Curiosity measured about 0.67 mSv/day of radiation on the Mars surface.',
    'The ISS recycles about 98% of its water.',
  ].join('\n')
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
        factSheet(now) + '\n\n' + SAFETY_RULES,
      prompt: 'Write your next post. Example of your style: ' + scriptedLine(persona, now),
    })
    const post = safeOutput(text, 280)
    if (post) return toBotPost(persona, post)
    console.warn('[ai] bot post came back empty, using scripted line')
  } catch (err) {
    console.error(`[ai] bot post failed, using scripted line: ${describeError(err)}`)
  }
  return toBotPost(persona, scriptedLine(persona, now))
}

export type ChatLine = { authorName: string; content: string; fromBody: Place }

/**
 * An AI operator's in-character reply to a colonist's direct message. `history` is their recent
 * conversation (oldest first) so the operator can follow along. Returns null if the AI call fails.
 */
export async function generateOperatorReply(
  env: Env,
  operator: Operator,
  message: ChatLine,
  history: ChatLine[] = [],
  now: number = Date.now(),
): Promise<string | null> {
  try {
    const transcript = history
      .map((line) => `[${safeName(line.authorName)}, from ${BODY_LABELS[line.fromBody] ?? 'Earth'}]: ${untrusted(line.content, 300)}`)
      .join('\n')
    const delay = lightDelaySeconds(message.fromBody, operator.body, now)
    const ai = createDeepSpaceAI(env, 'anthropic')
    const { text, finishReason } = await generateText({
      model: ai(MODEL),
      maxOutputTokens: MAX_TOKENS,
      system:
        `You are ${operator.name}, ${operator.voice}, at ${operator.place}, answering a direct message from ` +
        `a colonist named ${safeName(message.authorName)}. Their message came from ${BODY_LABELS[message.fromBody] ?? 'Earth'}. ` +
        // Same world (or next door): say so plainly, so the model doesn't borrow the Earth–Mars number from the facts.
        (delay < 2
          ? 'You are on the same world as them (or right next to it), so messages arrive almost instantly. Do not mention any light delay. '
          : `It took ${formatDelay(delay)} to reach you and your reply takes exactly as long to get back. Use only this number for the delay. `) +
        'Reply in under 300 characters, in character, helpful and friendly. No emoji. ' +
        'Never claim to be human. Stay consistent with these real facts when relevant:\n' +
        factSheet(now) + '\n\n' + SAFETY_RULES,
      prompt:
        (transcript ? `Your recent conversation with them, oldest first:\n${transcript}\n\n` : '') +
        `New message to answer. ${safeName(message.authorName)} says: ${untrusted(message.content, 600)}`,
    })
    const reply = safeOutput(text, 500)
    if (!reply) console.warn(`[ai] operator reply came back empty (finishReason: ${finishReason})`)
    return reply || null
  } catch (err) {
    console.error(`[ai] operator reply failed: ${describeError(err)}`)
    return null
  }
}

// ---- Liveliness: bot replies to people's posts, and bot colonists chatting in the forums ----

/** A feed bot's short, in-character reply to a colonist's post. Returns null if the AI call fails. */
export async function generateBotReply(
  env: Env,
  persona: Persona,
  post: { authorName: string; text: string },
  now: number = Date.now(),
): Promise<string | null> {
  try {
    const ai = createDeepSpaceAI(env, 'anthropic')
    const { text } = await generateText({
      model: ai(MODEL),
      maxOutputTokens: MAX_TOKENS,
      system:
        `You are ${persona.name}, ${persona.voice}. You are replying to a colonist's post on a social feed used by ` +
        'humans living off Earth. Write ONE friendly reply under 200 characters, in character, that responds to what ' +
        'they actually said. No hashtags, no emoji, no quotation marks. Suitable for all ages. Real facts you can use:\n' +
        factSheet(now) + '\n\n' + SAFETY_RULES,
      prompt: `@${safeName(post.authorName)} posted: ${untrusted(post.text, 400)}`,
    })
    return safeOutput(text, 280)
  } catch (err) {
    console.error(`[ai] bot reply failed: ${describeError(err)}`)
    return null
  }
}

/** A new forum thread from a bot colonist: { title, text }. Returns null if the AI call fails. */
export async function generateForumThread(
  env: Env,
  colonist: Colonist,
  forum: { name: string; tagline: string },
  now: number = Date.now(),
): Promise<{ title: string; text: string } | null> {
  try {
    const ai = createDeepSpaceAI(env, 'anthropic')
    const { text } = await generateText({
      model: ai(MODEL),
      maxOutputTokens: MAX_TOKENS,
      system:
        `You are ${colonist.name} (@${colonist.handle}), ${colonist.voice}. You live at ${colonist.home}. ` +
        `You are starting a new thread in the forum ${forum.name} ("${forum.tagline}"). ` +
        'Write casual, specific, everyday colonist chatter: a question, a story, a tip, or a small complaint. ' +
        'Reply with exactly two lines: the first line is the title (under 80 characters), the second line is the post ' +
        '(under 300 characters). No emoji, no hashtags, no labels like "Title:". Suitable for all ages. Real facts:\n' +
        factSheet(now) + '\n\n' + SAFETY_RULES,
      prompt: 'Write your new thread.',
    })
    const [title, ...rest] = text.trim().split('\n').map((l) => l.trim()).filter(Boolean)
    const body = rest.join(' ')
    const safeTitle = title ? safeOutput(title.replace(/^title:\s*/i, ''), 120) : null
    const safeBody = safeOutput(body.replace(/^(post|body):\s*/i, ''), 600)
    if (!safeTitle) return null
    return { title: safeTitle, text: safeBody ?? '' }
  } catch (err) {
    console.error(`[ai] forum thread failed: ${describeError(err)}`)
    return null
  }
}

/** A bot colonist's comment on a forum thread, aware of the thread and its latest comments. */
export async function generateForumComment(
  env: Env,
  colonist: Colonist,
  forum: { name: string },
  thread: { title: string; text?: string },
  recent: { author: string; text: string }[],
  now: number = Date.now(),
): Promise<string | null> {
  try {
    const transcript = recent.map((c) => `@${safeName(c.author)}: ${untrusted(c.text, 300)}`).join('\n')
    const ai = createDeepSpaceAI(env, 'anthropic')
    const { text } = await generateText({
      model: ai(MODEL),
      maxOutputTokens: MAX_TOKENS,
      system:
        `You are ${colonist.name} (@${colonist.handle}), ${colonist.voice}. You live at ${colonist.home}. ` +
        `You are commenting on a thread in the forum ${forum.name}. Write ONE casual comment under 250 characters that ` +
        'adds to the conversation (answer, joke, story, or follow-up question). No emoji, no hashtags, no quotation ' +
        'marks. Suitable for all ages. Real facts you can use:\n' + factSheet(now) + '\n\n' + SAFETY_RULES,
      prompt:
        `Thread title: ${untrusted(thread.title, 150)}\n${thread.text ? `Thread post: ${untrusted(thread.text, 500)}\n` : ''}` +
        (transcript ? `Latest comments, oldest first:\n${transcript}\n` : '') + 'Write your comment.',
    })
    return safeOutput(text, 400)
  } catch (err) {
    console.error(`[ai] forum comment failed: ${describeError(err)}`)
    return null
  }
}

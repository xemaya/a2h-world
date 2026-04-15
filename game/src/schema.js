import { z } from 'zod';

const EmotionSchema = z.enum(['happy', 'blank', 'concern']);

const DialogueLineSchema = z.object({
  speaker: z.enum(['partner', 'echo', 'narrator']),
  emotion: z.string().min(1),
  text: z.string().min(1)
});

const PartnerSchema = z.object({
  sprite: z.string(),
  name: z.string().min(1)
});

const ColdOpenSchema = z.object({
  type: z.literal('cold_open'),
  image: z.string(),
  narration: z.string()
});

const VnSchema = z.object({
  type: z.literal('vn'),
  bg: z.string(),
  partner: PartnerSchema,
  dialogue: z.array(DialogueLineSchema).min(1)
});

const ChoiceOptionSchema = z.object({
  id: z.enum(['A', 'B']),
  text: z.string().min(1),
  score: z.union([z.literal(0), z.literal(8)]),
  reaction: z.object({ speaker: z.enum(['partner', 'echo']), text: z.string().min(1) }),
  echo_emotion_after: EmotionSchema
});

const ChoiceSchema = z.object({
  type: z.literal('choice'),
  bg: z.string(),
  prompt: z.string().min(1),
  options: z.array(ChoiceOptionSchema).length(2)
});

const OutroSchema = z.object({
  type: z.literal('outro'),
  image: z.string(),
  learned_feeling_display: z.string().min(1)
});

export const EpisodeSchema = z.object({
  id: z.string().regex(/^EP\d{2}$/),
  title: z.string().min(1),
  learned_feeling: z.string().min(1),
  score_delta_hint: z.union([z.literal(0), z.literal(8)]),
  screens: z.tuple([ColdOpenSchema, VnSchema, VnSchema, ChoiceSchema, OutroSchema])
});

export const ScriptFileSchema = z.record(z.string().regex(/^EP\d{2}$/), EpisodeSchema);

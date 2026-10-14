import { builder } from '../../../server/schema/builder'
import { requireUser } from './files'

const Provider = builder.enumType('LlmProvider', {
  values: ['OPENROUTER'] as const,
})
const Model = builder.enumType('LlmModel', {
  values: {
    GEMINI3_1_FLASH_IMAGE: { value: 'google/gemini-3.1-flash-image-preview' },
  },
})
const Ratio = builder.enumType('LLMImageGenerationAspectRatioInput', {
  values: {
    AspectRatio_16_9: { value: '16:9' },
    AspectRatio_1_1: { value: '1:1' },
  },
})
const Size = builder.enumType('LLMImageGenerationImageSizeInput', {
  values: { ImageSize_1K: { value: '1K' } },
})
const Input = builder.inputType('LLMImageGenerationInput', {
  fields: (t) => ({
    provider: t.field({ type: Provider, required: true }),
    model: t.field({ type: Model, required: true }),
    prompt: t.string({ required: true }),
    aspectRatio: t.field({ type: Ratio }),
    imageSize: t.field({ type: Size }),
  }),
})
const Image = builder.simpleObject('LLMImage', {
  fields: (t) => ({ imageUrl: t.string({ nullable: false }) }),
})
const Message = builder.simpleObject('LLMImageMessage', {
  fields: (t) => ({ images: t.field({ type: [Image], nullable: false }) }),
})
const Choice = builder.simpleObject('LLMImageChoice', {
  fields: (t) => ({ message: t.field({ type: Message, nullable: false }) }),
})
const Response = builder.simpleObject('LLMImageResponse', {
  fields: (t) => ({ choices: t.field({ type: [Choice], nullable: false }) }),
})
interface ProviderResponse {
  error?: { message?: string }
  choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[]
}
builder.mutationField('llmImageGeneration', (t) =>
  t.field({
    type: Response,
    nullable: false,
    args: { input: t.arg({ type: Input, required: true }) },
    resolve: async (_, { input }, ctx) => {
      const user = requireUser(ctx)
      if (user.status !== 'active') {
        throw new Error('Active account required')
      }
      if (process.env.ALLOW_GENERATE_IMAGES !== 'true') {
        throw new Error('Image generation is disabled')
      }
      const key = process.env.OPENROUTER_API_KEY
      if (!key) {
        throw new Error('OPENROUTER_API_KEY is not configured')
      }
      if (!input.prompt.trim() || input.prompt.length > 16000) {
        throw new Error('Invalid prompt')
      }
      const response = await fetch(
        `${(process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '')}/chat/completions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(120000),
          body: JSON.stringify({
            model: input.model,
            messages: [{ role: 'user', content: input.prompt }],
            image_config: {
              aspect_ratio: input.aspectRatio ?? '1:1',
              image_size: input.imageSize ?? '1K',
            },
          }),
        },
      )
      if (!response.ok) {
        throw new Error(`Image generation failed (${response.status})`)
      }
      const raw = (await response.json()) as ProviderResponse
      if (raw.error) {
        throw new Error(raw.error.message || 'Image generation failed')
      }
      const choices = (raw.choices ?? []).map((choice) => ({
        message: {
          images: (choice.message?.images ?? []).flatMap((image) =>
            image.image_url?.url ? [{ imageUrl: image.image_url.url }] : [],
          ),
        },
      }))
      if (!choices.some((choice) => choice.message.images.length)) {
        throw new Error('No image returned')
      }
      return { choices }
    },
  }),
)

import { Textarea } from 'app/Custom/components/controls/Textarea'
import { ImageGeneratorStyled } from './styles'
import { useCallback } from 'react'
import { Button } from 'app/Custom/components/Button'
import { useSnackbar } from 'app/Custom/hooks/useSnackbar'
import { useMutation } from '@apollo/client/react'
import { ApolloCache } from '@apollo/client'
import { useAppContext } from 'app/Custom/hooks/useAppContext'
import {
  LlmImageGenerationAspectRatioInput,
  LlmImageGenerationImageSizeInput,
  LlmImageGenerationInput,
  LlmImageGenerationMutation,
  LlmModel,
  LlmProvider,
  UserStatusEnum,
} from 'app/gql/generated'

type ImageGeneratorProps = {
  prompt: string
  generateImage: useMutation.MutationFunction<
    LlmImageGenerationMutation,
    {
      input: LlmImageGenerationInput
    },
    ApolloCache
  >
  setGeneratedBase64: React.Dispatch<React.SetStateAction<string | null>>
  setPrompt: React.Dispatch<React.SetStateAction<string>>
  disabled: boolean
  generating: boolean
}

const ALLOW_GENERATE_IMAGES =
  import.meta.env.VITE_ALLOW_GENERATE_IMAGES === 'true'

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({
  prompt,
  generateImage,
  setGeneratedBase64,
  setPrompt,
  disabled,
  generating,
}) => {
  const { user: currentUser } = useAppContext()

  const { addMessage } = useSnackbar() || {}

  const handleGenerate = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()

      if (!prompt.trim()) {
        return
      }

      generateImage({
        variables: {
          input: {
            provider: LlmProvider.OPENROUTER,
            model: LlmModel.GEMINI3_1_FLASH_IMAGE,
            prompt,
            aspectRatio: LlmImageGenerationAspectRatioInput.ASPECTRATIO_16_9,
            imageSize: LlmImageGenerationImageSizeInput.IMAGESIZE_1K,
          },
        },
      })
        .then((r) => {
          const imageUrl = r.data?.llmImageGeneration.choices
            .at(0)
            ?.message.images?.at(0)?.imageUrl

          if (imageUrl) {
            setGeneratedBase64(imageUrl)
          }
        })
        .catch((error) => {
          addMessage?.(
            (error as Error | undefined)?.message || 'Generation error',
          )
        })
    },
    [addMessage, generateImage, prompt, setGeneratedBase64],
  )

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      setPrompt(e.currentTarget.value),
    [setPrompt],
  )

  return (
    ALLOW_GENERATE_IMAGES &&
    currentUser?.status === UserStatusEnum.ACTIVE && (
      <ImageGeneratorStyled>
        <Textarea
          value={prompt}
          onChange={onChange}
          placeholder="Describe the image to generate..."
          disabled={disabled}
        />
        <div>
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || disabled}
            type="button"
          >
            {generating ? 'Generating...' : 'Generate image'}
          </Button>
        </div>
      </ImageGeneratorStyled>
    )
  )
}

import { useAppContext } from 'app/Custom/hooks/useAppContext'
import { FileView } from 'app/Custom/components/FileView'
import { MarkdownFileStyled } from './styles'
import { useFileQuery } from 'app/gql/generated'

type MarkdownFileProps = {
  id: string
  fileName: React.ReactNode
}

export const MarkdownFile: React.FC<MarkdownFileProps> = ({ id }) => {
  const { user } = useAppContext()

  const response = useFileQuery({
    variables: {
      where: {
        id,
      },
    },
  })

  const file = response.data?.file

  return (
    file && (
      <MarkdownFileStyled>
        <FileView file={file} currentUser={user} />
      </MarkdownFileStyled>
    )
  )
}

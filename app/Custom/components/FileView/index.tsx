import React, { lazy, Suspense, useState, useCallback } from 'react'
import { Markdown } from '../Markdown'
import { Image } from '../Image'
import { Button } from '../Button'
import { FileViewStyled } from './styles'
import { FileFragment, MeQuery, useUpdateFileMutation } from 'app/gql/generated'
const Editor = lazy(() =>
  import('../Markdown/Editor').then((module) => ({
    default: module.MarkdownEditor,
  })),
)
export const FileView: React.FC<{
  file: FileFragment
  currentUser: MeQuery['me'] | undefined
}> = ({ file, currentUser }) => {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(file.name ?? '')
  const [description, setDescription] = useState(file.description ?? '')
  const [content, setContent] = useState(file.content ?? '')
  const [update, { loading, error }] = useUpdateFileMutation()
  const startEditing = useCallback(() => setEditing(true), [])
  const stopEditing = useCallback(() => setEditing(false), [])
  const changeName = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value),
    [],
  )
  const changeDescription = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) =>
      setDescription(event.target.value),
    [],
  )
  const submit = useCallback(
    (event: React.SubmitEvent) => {
      event.preventDefault()
      void update({
        variables: {
          where: { id: file.id },
          data: { name, description, content },
        },
      })
        .then(stopEditing)
        .catch((error: unknown) => {
          console.error('File update failed', error)
        })
    },
    [update, file.id, name, description, content, stopEditing],
  )
  return (
    <FileViewStyled>
      {editing ? (
        <form onSubmit={submit}>
          <label>
            Name
            <input value={name} onChange={changeName} />
          </label>
          <label>
            Description
            <textarea value={description} onChange={changeDescription} />
          </label>
          <Suspense fallback={<p>Loading editor…</p>}>
            <Editor value={content} onChange={setContent} />
          </Suspense>
          {error && <p role="alert">{error.message}</p>}
          <Button disabled={loading} type="submit">
            Save
          </Button>
          <Button type="button" onClick={stopEditing}>
            Cancel
          </Button>
        </form>
      ) : (
        <>
          {file.mimetype.startsWith('image/') && (
            <Image
              src={`/images/resized/middle/${file.path}`}
              alt={file.name || file.filename || ''}
            />
          )}
          <strong>{file.name || file.filename || file.id}</strong>
          <Markdown>{file.description}</Markdown>
          <Markdown>{file.content}</Markdown>
          <small>
            {file.createdAt &&
              new Date(file.createdAt).toISOString().slice(0, 10)}{' '}
            {file.CreatedBy?.fullname || file.CreatedBy?.username}
          </small>
          <a
            href={`/uploads/${file.path}`}
            download={file.filename || undefined}
          >
            Download
          </a>
          {(currentUser?.sudo || currentUser?.id === file.createdById) && (
            <Button type="button" onClick={startEditing}>
              Edit
            </Button>
          )}
        </>
      )}
    </FileViewStyled>
  )
}

import * as React from 'react'
import { Link } from 'react-router'
import { useProjectQuery } from '../../../gql/generated'
import { useAppContext } from '../../hooks/useAppContext'
import { ProjectEditForm } from './Project/View/Form'
import { localized, type Entry, type Locale } from '../Site/data'
import { projectsViewLexicon } from '../Site/projectsLexicon'

export const ProjectActions: React.FC<{ project: Entry; locale: Locale }> = ({
  project,
  locale,
}) => {
  const { user } = useAppContext()
  const [editing, setEditing] = React.useState(false)
  const canEdit = Boolean(
    user && (user.sudo || project.CreatedBy?.id === user.id),
  )
  const { data, loading, error } = useProjectQuery({
    variables: { where: { id: project.id } },
    skip: !editing || !canEdit,
    fetchPolicy: 'no-cache',
    context: { headers: { 'x-locale': 'ru' } },
  })
  const startEditing = React.useCallback(() => setEditing(true), [])
  const stopEditing = React.useCallback(() => setEditing(false), [])
  if (!canEdit) {
    return null
  }
  if (!editing) {
    return (
      <p>
        <button type="button" onClick={startEditing}>
          Edit project
        </button>
      </p>
    )
  }
  if (data?.project && !loading && !error) {
    return (
      <ProjectEditForm
        project={data.project}
        locale={locale}
        cancelHandler={stopEditing}
      />
    )
  }
  return (
    <div>
      {loading ? (
        <p>Loading project…</p>
      ) : (
        <p role="alert">{error?.message || 'Project not found'}</p>
      )}
      <button type="button" onClick={stopEditing}>
        Cancel
      </button>
    </div>
  )
}

export const CreateProjectLink: React.FC<{ locale: Locale }> = ({ locale }) => {
  const { user } = useAppContext()
  return user?.sudo ? (
    <p>
      <Link to={localized('/projects/create', locale)}>
        {projectsViewLexicon[locale].hero.create}
      </Link>
    </p>
  ) : null
}

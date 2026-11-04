import React, { useCallback, useState } from 'react'
import { Button } from 'app/Custom/components/Button'
import {
  PageErrorSort,
  PageErrorStatus,
  usePageErrorsQuery,
  useUpdatePageErrorMutation,
  useClearResolvedPageErrorsMutation,
} from 'app/gql/generated'

export const ErrorList: React.FC = () => {
  const [sort, setSort] = useState(PageErrorSort.URL)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const { data, loading, error, refetch } = usePageErrorsQuery({
    variables: { sort },
    fetchPolicy: 'network-only',
  })
  const [update, { loading: updating }] = useUpdatePageErrorMutation()
  const [clear, { loading: clearing }] = useClearResolvedPageErrorsMutation()
  const busy = loading || updating || clearing
  const refresh = useCallback(async (): Promise<void> => {
    setActionError('')
    try {
      await refetch()
    } catch {
      setActionError('Could not refresh the error log.')
    }
  }, [refetch])
  const changeStatus = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
      const row = data?.pageErrors.find(
        (entry) => entry.url === event.currentTarget.dataset.url,
      )
      if (!row) {
        return
      }
      setActionError('')
      setNotice('')
      try {
        await update({
          variables: {
            url: row.url,
            count: row.count,
            status:
              row.status === PageErrorStatus.REVIEW
                ? PageErrorStatus.RESOLVED
                : PageErrorStatus.REVIEW,
          },
        })
        await refetch()
      } catch {
        setActionError(
          'Could not update the status. Refresh the list: a new error may have occurred.',
        )
      }
    },
    [data, update, refetch],
  )
  const clearResolved = useCallback(async (): Promise<void> => {
    setActionError('')
    setNotice('')
    try {
      const result = await clear()
      setNotice(
        `Deleted resolved records: ${result.data?.clearResolvedPageErrors ?? 0}.`,
      )
      await refetch()
    } catch {
      setActionError('Could not clear resolved records or refresh the list.')
    }
  }, [clear, refetch])
  const changeSort = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      setSort(
        event.target.value === PageErrorSort.URL
          ? PageErrorSort.URL
          : PageErrorSort.LASTOCCURREDAT,
      )
    },
    [],
  )
  return (
    <>
      <div className="toolbar">
        <label>
          Sort by{' '}
          <select value={sort} disabled={busy} onChange={changeSort}>
            <option value={PageErrorSort.URL}>URL</option>
            <option value={PageErrorSort.LASTOCCURREDAT}>Latest error</option>
          </select>
        </label>
        <Button disabled={busy} onClick={refresh}>
          Refresh
        </Button>
        <Button variant="danger" disabled={busy} onClick={clearResolved}>
          Clear database
        </Button>
      </div>
      <p>
        Fixed errors enter Review. Recheck the URL, then mark it Resolved.
        Clearing deletes only resolved records.
      </p>
      {loading && <p role="status">Loading errors…</p>}
      {notice && <p role="status">{notice}</p>}
      {(error || actionError) && (
        <p role="alert">{actionError || 'Could not load the error log.'}</p>
      )}
      {!loading && !error && data?.pageErrors.length === 0 && (
        <p>No unresolved page errors.</p>
      )}
      {!!data?.pageErrors.length && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">URL</th>
                <th scope="col">Last event</th>
                <th scope="col">HTTP status</th>
                <th scope="col">Count</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.pageErrors.map((row) => (
                <tr key={row.url}>
                  <td>
                    <a href={row.url} target="_blank" rel="noopener noreferrer">
                      {row.url}
                    </a>
                  </td>
                  <td>
                    <time dateTime={row.lastOccurredAt}>
                      {new Date(row.lastOccurredAt).toLocaleString()}
                    </time>
                  </td>
                  <td>{row.statusCode ?? '—'}</td>
                  <td>{row.count}</td>
                  <td>{row.status ?? '—'}</td>
                  <td>
                    <Button
                      size="small"
                      disabled={busy}
                      data-url={row.url}
                      onClick={changeStatus}
                    >
                      {row.status === PageErrorStatus.REVIEW
                        ? 'Mark resolved'
                        : 'Fixed'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

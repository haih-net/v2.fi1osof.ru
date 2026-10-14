import { styled } from '@linaria/react'

export const FilesUploaderEditorStyled = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 8px;
  margin: 8px 0;
`

export const DropZoneStyled = styled.div`
  border: 2px dashed var(--color-border, #ccc);
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--color-primary, #007bff);
    background: var(--color-bg-hover, rgba(0, 123, 255, 0.05));
  }

  &[data-isdragging='true'] {
    border-color: var(--color-primary, #007bff);
    background: var(--color-bg-hover, rgba(0, 123, 255, 0.1));
  }
`

export const FileListStyled = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const FileItemStyled = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--color-bg-secondary, #f5f5f5);
  border-radius: 6px;
`

export const FileInfoStyled = styled.div`
  flex: 1;
  min-width: 0;
`

export const FileNameStyled = styled.div`
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const ProgressBarStyled = styled.div`
  width: 100px;
  height: 6px;
  background: var(--color-bg-tertiary, #e0e0e0);
  border-radius: 3px;
  overflow: hidden;
`

export const ProgressFillStyled = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${({ $progress }) => $progress}%;
  background: var(--color-primary, #007bff);
  transition: width 0.3s ease;
`

export const FileStatusStyled = styled.span<{ $status: string }>`
  font-size: 12px;
  color: ${({ $status }) => ($status === 'success' ? 'var(--color-success, #28a745)' : $status === 'error' ? 'var(--color-error, #dc3545)' : 'inherit')};
`

export const RemoveButtonStyled = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  color: var(--color-text-secondary, #666);

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: var(--color-error, #dc3545);
  }
`

export function isArchive(src: string): boolean {
  return (
    src.endsWith('.rar') ||
    src.endsWith('.zip') ||
    src.endsWith('.7z') ||
    src.endsWith('.asice')
  )
}

export function downloadSGF(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/x-go-sgf;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

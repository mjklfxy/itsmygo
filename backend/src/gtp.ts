export interface GtpResponse {
  id: number
  success: boolean
  data: string
  error?: string
}

/** Encode a GTP command string */
export function encodeGtpCommand(id: number, command: string, args: string[]): string {
  return `${id} ${command} ${args.join(' ')}\n`
}

/** Parse a GTP response block. Returns null if buffer is incomplete. */
export function parseGtpResponse(buffer: string): { response: GtpResponse; consumed: number } | null {
  // GTP responses are terminated by a blank line
  const endIdx = buffer.indexOf('\n\n')
  if (endIdx === -1) return null

  const block = buffer.substring(0, endIdx)
  const consumed = endIdx + 2

  const lines = block.split('\n')
  const statusLine = lines[lines.length - 1]

  const successMatch = statusLine.match(/^=(\d*)\s*(.*)/)
  const errorMatch = statusLine.match(/^\?(\d*)\s*(.*)/)

  if (successMatch) {
    const dataLines = lines.slice(0, -1)
    const data = dataLines.length > 0 ? dataLines.join('\n') : successMatch[2]
    return {
      response: {
        id: successMatch[1] ? parseInt(successMatch[1], 10) : 0,
        success: true,
        data: data.trim(),
      },
      consumed,
    }
  }

  if (errorMatch) {
    return {
      response: {
        id: errorMatch[1] ? parseInt(errorMatch[1], 10) : 0,
        success: false,
        data: '',
        error: errorMatch[2].trim() || lines.slice(0, -1).join('\n').trim(),
      },
      consumed,
    }
  }

  // Unrecognized response format
  return {
    response: {
      id: 0,
      success: false,
      data: '',
      error: `Unexpected GTP response: ${block}`,
    },
    consumed,
  }
}

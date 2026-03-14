function getEnvConfig() {
  return {
    url: process.env.N8N_VOICE_WEBHOOK_URL,
    headerName: process.env.N8N_HEADER_NAME,
    headerValue: process.env.N8N_HEADER_VALUE,
  }
}

function getAuthHeader() {
  const { headerName, headerValue } = getEnvConfig()
  if (!headerName || !headerValue) return null
  return { [headerName]: headerValue }
}

function buildForwardHeaders({ contentType }) {
  const headers = {}

  if (contentType) headers['content-type'] = contentType

  const authHeader = getAuthHeader()
  if (authHeader) {
    Object.assign(headers, authHeader)
  }

  return headers
}

function parseResponseBody(response, buffer) {
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.toLowerCase().includes('application/json')

  if (!isJson) {
    return { isJson: false, body: buffer }
  }

  try {
    const text = buffer.toString('utf-8')
    return { isJson: true, body: text ? JSON.parse(text) : {} }
  } catch {
    return { isJson: false, body: buffer }
  }
}

export const forwardVoiceFeedback = async ({ request, isMultipart, jsonBody }) => {
  const { url, headerName } = getEnvConfig()
  if (!url) {
    return {
      error: {
        error: 'n8n_not_configured',
        mensaje: 'Falta configurar N8N_VOICE_WEBHOOK_URL en el servidor.',
      },
      status: 500,
    }
  }

  const authHeader = getAuthHeader()
  if (!authHeader) {
    return {
      error: {
        error: 'n8n_auth_not_configured',
        mensaje: 'Falta configurar N8N_HEADER_NAME y N8N_HEADER_VALUE en el servidor.',
      },
      status: 500,
    }
  }

  console.log('[voice] forwarding to n8n:', url)
  console.log('[voice] auth header name:', headerName || '(missing)')

  const options = {
    method: 'POST',
    headers: buildForwardHeaders({
      contentType: request.headers['content-type'],
    }),
  }

  if (isMultipart) {
    options.body = request
    options.duplex = 'half'
  } else {
    options.headers['content-type'] = 'application/json'
    options.body = JSON.stringify(jsonBody || {})
  }

  const response = await fetch(url, options)
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const parsed = parseResponseBody(response, buffer)

  return {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') || undefined,
      'content-disposition': response.headers.get('content-disposition') || undefined,
    },
    ...parsed,
  }
}

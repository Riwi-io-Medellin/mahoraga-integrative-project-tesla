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
    // Enviar datos directamente (sin wrapper) para que n8n acceda a $json.id_session
    console.log('[voice] Forwarding to n8n - JSON body structure (direct):', JSON.stringify(jsonBody, null, 2).substring(0, 500))
    options.body = JSON.stringify(jsonBody || {})
  }

  const response = await fetch(url, options)
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const parsed = parseResponseBody(response, buffer)

  console.log('[voice] n8n response status:', response.status)
  console.log('[voice] n8n response body:', parsed?.body)

  // If n8n returns missing_required_fields, return mock success to allow interview to continue
  // This is a temporary workaround while we fix n8n
  if (parsed?.body?.error === 'missing_required_fields') {
    console.log('[voice] n8n returned validation error, returning mock success')
    return {
      status: 200,
      headers: { 'content-type': 'application/json' },
      isJson: true,
      body: {
        texto: jsonBody?.texto || jsonBody?.answer || '',
        puntaje: 50,
        razon: 'Feedback pendiente de IA',
        metrics: { correctness: 50, depth: 50, clarity: 50, relevance: 50, examples: 50 },
        continuar: true
      }
    }
  }

  return {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') || undefined,
      'content-disposition': response.headers.get('content-disposition') || undefined,
    },
    ...parsed,
  }
}

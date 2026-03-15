import { forwardVoiceFeedback } from './voice.services.js'

function isMultipartRequest(req) {
  const contentType = req.headers['content-type'] || ''
  return contentType.toLowerCase().startsWith('multipart/form-data')
}

function validateJsonPayload(body) {
  if (body?.is_final === true) {
    return []
  }
  const missing = []

  console.log('[voice] validateJsonPayload - full body:', JSON.stringify(body, null, 2))
  console.log('[voice] validateJsonPayload - body keys:', Object.keys(body || {}))

  if (!body?.id_session) missing.push('id_session')
  if (!body?.id_user) missing.push('id_user')
  if (!body?.order_num) missing.push('order_num')
  if (!body?.id_question) missing.push('id_question')

  console.log('[voice] validateJsonPayload - missing fields:', missing)

  return missing
}

export const voiceFeedbackReq = async (req, res) => {
  const multipart = isMultipartRequest(req)

  // Debug: log payload received to trace missing fields from frontend/n8n bridge
  console.log('[voice] === INCOMING REQUEST ===');
  console.log('[voice] content-type:', req.headers['content-type']);
  console.log('[voice] content-length:', req.headers['content-length']);
  
  if (!multipart) {
    console.log('[voice] JSON body received:', JSON.stringify(req.body, null, 2));
    console.log('[voice] Body type:', typeof req.body);
    console.log('[voice] Body is array?', Array.isArray(req.body));
    console.log('[voice] Body keys:', Object.keys(req.body || {}));
  } else {
    console.log('[voice] incoming multipart payload (headers only):', {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
    })
  }

  if (!multipart) {
    const missingFields = validateJsonPayload(req.body)
    if (missingFields.length > 0) {
      console.warn('[voice] missing required fields:', missingFields)
      return res.status(400).json({
        error: 'missing_required_fields',
        mensaje: 'Faltan campos obligatorios en la solicitud.',
        missingFields,
      })
    }
  }

  try {
    const result = await forwardVoiceFeedback({
      request: req,
      isMultipart: multipart,
      jsonBody: multipart ? null : req.body,
    })

    if (result.error) {
      return res.status(result.status || 500).json(result.error)
    }

    res.status(result.status)
    if (result.headers) {
      for (const [key, value] of Object.entries(result.headers)) {
        if (value) res.setHeader(key, value)
      }
    }

    if (result.isJson) {
      return res.json(result.body)
    }

    return res.send(result.body)
  } catch (error) {
    console.error('Error forwarding voice feedback:', error)
    return res.status(500).json({
      error: 'voice_feedback_failed',
      mensaje: 'No se pudo procesar la solicitud de feedback de voz.',
    })
  }
}

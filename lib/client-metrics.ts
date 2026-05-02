'use client'

type ClientMetricName =
  | 'vent_submitted'
  | 'personality_switch'
  | 'hear_from_clicked'
  | 'api_call'
  | 'response_generated'
  | 'api_error'
  | 'rate_limit_hit'
  | 'client_cooldown_hit'

type ClientMetricPayload = {
  personality?: string
  status?: number
  ttftMs?: number
  totalMs?: number
  characters?: number
}

type ClientMetric = ClientMetricPayload & {
  name: ClientMetricName
  at: string
}

type VentMetricsWindow = Window & {
  __VENT_AI_METRICS__?: ClientMetric[]
}

export function recordClientMetric(name: ClientMetricName, payload: ClientMetricPayload = {}) {
  if (typeof window === 'undefined') return

  const metricsWindow = window as VentMetricsWindow
  const metric: ClientMetric = {
    name,
    at: new Date().toISOString(),
    ...payload,
  }

  metricsWindow.__VENT_AI_METRICS__ ??= []
  metricsWindow.__VENT_AI_METRICS__.push(metric)

  if (process.env.NODE_ENV === 'development') {
    console.info('[vent.ai metric]', metric)
  }
}

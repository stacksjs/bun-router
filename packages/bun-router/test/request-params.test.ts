import { describe, expect, it } from 'bun:test'
import { applyRequestEnhancements, Router } from '../src/router'

describe('request route parameters', () => {
  it('reads valid route parameters as integers', () => {
    const request = new Router().enhanceRequest(
      new Request('https://example.test/errors/42'),
      { id: '42', negative: '-7' },
    )

    expect(request.getParamAsInt('id')).toBe(42)
    expect(request.getParamAsInt('negative')).toBe(-7)
  })

  it('returns null for missing or invalid integers', () => {
    const request = applyRequestEnhancements(
      new Request('https://example.test/errors/invalid'),
      { empty: '', fractional: '1.5', malformed: '12px', unsafe: '9007199254740992' },
    )

    expect(request.getParamAsInt('missing')).toBeNull()
    expect(request.getParamAsInt('empty')).toBeNull()
    expect(request.getParamAsInt('fractional')).toBeNull()
    expect(request.getParamAsInt('malformed')).toBeNull()
    expect(request.getParamAsInt('unsafe')).toBeNull()
  })
})

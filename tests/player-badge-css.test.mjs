import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const css = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))
  assert.ok(match, `missing CSS rule: ${selector}`)
  return match[1]
}

test('approved schedule badge remains the 42px top-left visual reference', () => {
  const declarations = rule('.player-schedule-notice')
  assert.match(declarations, /top:\s*clamp\(20px, 3\.8vh, 42px\)/)
  assert.match(declarations, /left:\s*clamp\(20px, 2\.6vw, 50px\)/)
  assert.match(declarations, /min-height:\s*42px/)
  assert.match(declarations, /border-radius:\s*9px/)
  assert.match(declarations, /background:\s*rgba\(4, 18, 42, 0\.9\)/)
})

for (const selector of ['.offline-cache-status', '.tv-pause-badge']) {
  test(`${selector} uses the approved compact dimensions at bottom-right`, () => {
    const declarations = rule(selector)
    assert.match(declarations, /box-sizing:\s*border-box/)
    assert.match(declarations, /right:\s*18px/)
    assert.match(declarations, /bottom:\s*18px/)
    assert.match(declarations, /min-height:\s*42px/)
    assert.match(declarations, /padding:\s*6px 8px/)
    assert.match(declarations, /border-radius:\s*9px/)
    assert.match(declarations, /font-size:\s*10px/)
    assert.match(declarations, /line-height:\s*1\.15/)
    assert.match(declarations, /white-space:\s*nowrap/)
    assert.match(declarations, /text-overflow:\s*ellipsis/)
  })
}

test('simultaneous cache and pause badges stack without overlap', () => {
  const declarations = rule('.offline-cache-status ~ .tv-pause-badge')
  assert.match(declarations, /bottom:\s*68px/)
})

test('portrait rotation keeps simultaneous cache and pause badges separated', () => {
  const declarations = rule('.player-screen.portrait-mode .offline-cache-status ~ .tv-pause-badge')
  assert.match(declarations, /bottom:\s*147px/)
})

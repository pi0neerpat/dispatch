import test from 'node:test'
import assert from 'node:assert/strict'
import { createSessionEventStore, appendChunkToEventStore, parseChunkWithAdapters } from './eventPipeline.js'

test('parseChunkWithAdapters detects claude/codex/generic', () => {
  let st = { agentKind: 'generic', leftover: '' }
  let out = parseChunkWithAdapters('Claude Code ready\n', st)
  assert.equal(out.nextState.agentKind, 'claude')

  st = { agentKind: 'generic', leftover: '' }
  out = parseChunkWithAdapters('OpenAI Codex session started\n', st)
  assert.equal(out.nextState.agentKind, 'codex')

  st = { agentKind: 'generic', leftover: '' }
  out = parseChunkWithAdapters('hello world\n', st)
  assert.equal(out.nextState.agentKind, 'generic')
})

test('appendChunkToEventStore handles line buffering and summary', () => {
  const store = createSessionEventStore({ sessionId: 's1', repo: 'hub', baseDir: process.cwd(), ringSize: 50 })

  appendChunkToEventStore(store, 'Status: running')
  assert.equal(store.events.length, 0)

  appendChunkToEventStore(store, '\nERROR: failed to run\n')
  assert.equal(store.events.length, 2)
  assert.ok(store.summary.lastStep)
  assert.ok(store.summary.lastError)
})

test('appendChunkToEventStore coalesces action fragments and drops tiny noise', () => {
  const store = createSessionEventStore({ sessionId: 's2', repo: 'hub', baseDir: process.cwd(), ringSize: 50 })

  appendChunkToEventStore(
    store,
    [
      'to\n',
      'running\n',
      'build\n',
      '.\n',
      'Step: compiling\n',
    ].join('')
  )

  assert.equal(store.events.length, 2)
  assert.equal(store.events[0].kind, 'action')
  assert.equal(store.events[0].text, 'running build')
  assert.equal(store.events[1].kind, 'progress')
})

test('appendChunkToEventStore dedupes immediate repeats', () => {
  const store = createSessionEventStore({ sessionId: 's3', repo: 'hub', baseDir: process.cwd(), ringSize: 50 })

  appendChunkToEventStore(store, 'Status: running\n')
  appendChunkToEventStore(store, 'Status: running\n')
  appendChunkToEventStore(store, 'Status: running\n')

  assert.equal(store.events.length, 1)
  assert.equal(store.events[0].text, 'Status: running')
})

test('appendChunkToEventStore truncates oversized event text', () => {
  const store = createSessionEventStore({ sessionId: 's4', repo: 'hub', baseDir: process.cwd(), ringSize: 50 })
  const long = `Status: ${'x'.repeat(5000)}\n`

  appendChunkToEventStore(store, long)
  assert.equal(store.events.length, 1)
  assert.ok(store.events[0].text.length <= 700)
  assert.ok(store.events[0].text.endsWith('...[truncated]'))
})

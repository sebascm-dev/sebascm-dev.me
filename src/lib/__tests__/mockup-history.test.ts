import { describe, it, expect } from 'vitest'
import { canRedo, canUndo, commit, createHistory, redo, undo } from '../mockup/history'

describe('history', () => {
  it('starts with nothing to undo or redo', () => {
    const history = createHistory('a')
    expect(history.present).toBe('a')
    expect(canUndo(history)).toBe(false)
    expect(canRedo(history)).toBe(false)
  })

  it('undoes and redoes a committed change', () => {
    const history = commit(createHistory('a'), 'b', { coalesce: false })
    expect(undo(history).present).toBe('a')
    expect(redo(undo(history)).present).toBe('b')
  })

  // A slider drag emits a change per pixel; coalescing folds the whole drag
  // into one step, so undo does not rewind it one pixel at a time.
  it('folds coalesced changes into the current step', () => {
    let history = commit(createHistory(0), 1, { coalesce: false })
    history = commit(history, 2, { coalesce: true })
    history = commit(history, 3, { coalesce: true })
    expect(history.present).toBe(3)
    expect(undo(history).present).toBe(0)
  })

  it('drops the redo branch when a new change is made after undoing', () => {
    const history = commit(undo(commit(createHistory('a'), 'b', { coalesce: false })), 'c', { coalesce: false })
    expect(canRedo(history)).toBe(false)
    expect(undo(history).present).toBe('a')
  })

  it('ignores a commit that does not change anything', () => {
    const history = createHistory('a')
    expect(commit(history, 'a', { coalesce: false })).toBe(history)
  })

  it('keeps at most the configured number of steps', () => {
    let history = createHistory(0)
    for (let i = 1; i <= 10; i++) history = commit(history, i, { coalesce: false, limit: 3 })
    expect(history.past).toEqual([7, 8, 9])
  })

  it('leaves the history untouched when there is nothing to undo or redo', () => {
    const history = createHistory('a')
    expect(undo(history)).toBe(history)
    expect(redo(history)).toBe(history)
  })
})

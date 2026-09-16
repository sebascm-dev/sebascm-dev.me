import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CustomCursor, { cursorStateFor } from '../CustomCursor'

/** Simulates the device: `fine` = mouse or trackpad, `reduced` = prefers reduced motion */
function mockDevice({ fine, reduced = false }: { fine: boolean; reduced?: boolean }) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduced-motion') ? reduced : fine,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.classList.remove('custom-cursor')
  document.body.innerHTML = ''
})

describe('cursorStateFor', () => {
  const build = (html: string) => {
    document.body.innerHTML = html
    return document.body
  }

  it('grows over anything clickable', () => {
    const root = build(`
      <a href="/x"><span id="in-link">link</span></a>
      <button id="button">go</button>
      <div role="button" id="role">role</div>
      <svg><circle data-repo-hit id="repo"></circle></svg>
      <div data-cursor="pointer" id="custom">custom</div>
    `)
    for (const id of ['in-link', 'button', 'role', 'repo', 'custom']) {
      expect(cursorStateFor(root.querySelector(`#${id}`))).toBe('interactive')
    }
  })

  it('stays small over disabled buttons and plain content', () => {
    const root = build('<button disabled id="off">off</button><p id="text">hola</p>')
    expect(cursorStateFor(root.querySelector('#off'))).toBe('default')
    expect(cursorStateFor(root.querySelector('#text'))).toBe('default')
    expect(cursorStateFor(null)).toBe('default')
  })

  it('gives way to the text cursor over fields you type in', () => {
    const root = build(`
      <input id="field" />
      <textarea id="area"></textarea>
      <div contenteditable="true" id="editable">x</div>
      <input type="submit" id="submit" />
    `)
    expect(cursorStateFor(root.querySelector('#field'))).toBe('text')
    expect(cursorStateFor(root.querySelector('#area'))).toBe('text')
    expect(cursorStateFor(root.querySelector('#editable'))).toBe('text')
    expect(cursorStateFor(root.querySelector('#submit'))).toBe('interactive')
  })
})

describe('CustomCursor', () => {
  it('does nothing on touch devices', () => {
    mockDevice({ fine: false })
    const { container } = render(<CustomCursor />)

    expect(container).toBeEmptyDOMElement()
    expect(document.documentElement).not.toHaveClass('custom-cursor')
  })

  it('replaces the native cursor while mounted on devices with a mouse', () => {
    mockDevice({ fine: true })
    const { unmount } = render(<CustomCursor />)

    expect(document.documentElement).toHaveClass('custom-cursor')
    expect(screen.getByTestId('custom-cursor')).toHaveAttribute('data-state', 'hidden')

    unmount()
    expect(document.documentElement).not.toHaveClass('custom-cursor')
  })

  it('appears on the first move and grows over a button', () => {
    mockDevice({ fine: true })
    render(
      <>
        <CustomCursor />
        <button>go</button>
      </>
    )
    const cursor = screen.getByTestId('custom-cursor')

    act(() => {
      fireEvent.pointerMove(document, { clientX: 10, clientY: 20 })
    })
    expect(cursor).toHaveAttribute('data-state', 'default')

    act(() => {
      fireEvent.pointerOver(screen.getByRole('button'))
    })
    expect(cursor).toHaveAttribute('data-state', 'interactive')
  })

  it('hides when the pointer leaves the window', () => {
    mockDevice({ fine: true })
    render(<CustomCursor />)
    const cursor = screen.getByTestId('custom-cursor')

    act(() => {
      fireEvent.pointerMove(document, { clientX: 10, clientY: 20 })
    })
    act(() => {
      fireEvent.pointerLeave(document.documentElement)
    })
    expect(cursor).toHaveAttribute('data-state', 'hidden')
  })

  it('marks the press so the circle can pulse', () => {
    mockDevice({ fine: true })
    render(<CustomCursor />)
    const cursor = screen.getByTestId('custom-cursor')

    act(() => {
      fireEvent.pointerMove(document, { clientX: 10, clientY: 20 })
      fireEvent.pointerDown(document)
    })
    expect(cursor).toHaveAttribute('data-pressed', 'true')

    act(() => {
      fireEvent.pointerUp(document)
    })
    expect(cursor).toHaveAttribute('data-pressed', 'false')
  })
})

import { useEffect, useState } from 'react'

const PADDING = 8

function targetRect(selector) {
  const element = document.querySelector(selector)
  if (!element) return { element: null, rect: null }
  return { element, rect: element.getBoundingClientRect() }
}

function blockerStyle(position, rect) {
  const top = Math.max(0, rect.top - PADDING)
  const left = Math.max(0, rect.left - PADDING)
  const right = Math.min(window.innerWidth, rect.right + PADDING)
  const bottom = Math.min(window.innerHeight, rect.bottom + PADDING)
  const shared = { position: 'fixed', zIndex: 1000, background: 'rgba(10, 8, 6, 0.72)', pointerEvents: 'auto' }

  if (position === 'top') return { ...shared, inset: `0 0 auto 0`, height: top }
  if (position === 'left') return { ...shared, top, left: 0, width: left, height: Math.max(0, bottom - top) }
  if (position === 'right') return { ...shared, top, left: right, right: 0, height: Math.max(0, bottom - top) }
  return { ...shared, top: bottom, right: 0, bottom: 0, left: 0 }
}

function tooltipPosition(rect) {
  const width = Math.min(360, window.innerWidth - 32)
  const left = Math.min(Math.max(16, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 16)
  const roomBelow = window.innerHeight - rect.bottom
  const top = roomBelow >= 210 ? rect.bottom + 18 : Math.max(16, rect.top - 190)
  return { width, left, top }
}

async function copyToClipboard(value) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
    const input = document.createElement('textarea')
    input.value = value
    input.style.position = 'fixed'
    input.style.opacity = '0'
    document.body.appendChild(input)
    input.select()
    const copied = document.execCommand('copy')
    input.remove()
    return copied
  } catch {
    return false
  }
}

export default function GuidedTour({ steps }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState(null)
  const [active, setActive] = useState(true)
  const [missingStepIndex, setMissingStepIndex] = useState(null)
  const [copiedStepIndex, setCopiedStepIndex] = useState(null)

  const step = steps[stepIndex]
  const complete = stepIndex >= steps.length

  useEffect(() => {
    if (!active || complete || !step?.selector) return undefined

    let target = null
    let hasScrolled = false
    let missingTimer = null
    const update = () => {
      const found = targetRect(step.selector)
      target = found.element
      if (!target) {
        setRect(null)
        return
      }
      if (missingTimer) {
        window.clearTimeout(missingTimer)
        missingTimer = null
      }
      if (!hasScrolled) {
        hasScrolled = true
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      }
      setRect(target.getBoundingClientRect())
      if (typeof target.focus === 'function') target.focus({ preventScroll: true })
    }

    update()
    if (!target) missingTimer = window.setTimeout(() => setMissingStepIndex(stepIndex), 8000)
    const interval = window.setInterval(update, 120)
    const observer = new MutationObserver(update)
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)

    function guardEvent(event) {
      if (event.target.closest?.('[data-demo-tour-continue]')) {
        event.preventDefault()
        event.stopPropagation()
        setStepIndex(index => index + 1)
        return
      }
      if (event.target.closest?.('[data-demo-tour-recovery]')) {
        event.preventDefault()
        event.stopPropagation()
        window.location.reload()
        return
      }
      if (event.target.closest?.('[data-demo-tour-copy]')) {
        event.preventDefault()
        event.stopPropagation()
        copyToClipboard(step.example).then(copied => {
          if (copied) setCopiedStepIndex(stepIndex)
        })
        return
      }
      const currentTarget = document.querySelector(step.selector)
      if (!currentTarget || !currentTarget.contains(event.target)) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      if (step.event === 'manual') {
        event.preventDefault()
        event.stopPropagation()
        return
      }

      const actionMatches = !step.actionSelector || event.target.closest?.(step.actionSelector)
      const validationPasses = !step.validate || step.validate(currentTarget, event)
      const clickedControl = event.type === 'click' && event.target.closest?.('button, [role="button"]')
      const attemptedAction = event.type === step.event && actionMatches
      if ((step.actionSelector && clickedControl && !actionMatches) || (attemptedAction && !validationPasses)) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      if (attemptedAction && validationPasses) {
        window.setTimeout(() => setStepIndex(index => index + 1), step.delay || 120)
      }
    }

    function guardKeyboard(event) {
      const currentTarget = document.querySelector(step.selector)
      const isMultilineInput = document.activeElement?.tagName === 'TEXTAREA'
      const blockedActionShortcut = step.actionSelector && (event.key === 'Escape' || (event.key === 'Enter' && !isMultilineInput))
      if (event.key === 'Tab' && step.allowTab && currentTarget?.contains(document.activeElement)) {
        const focusable = [...currentTarget.querySelectorAll('input, select, textarea, button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
          .filter(element => element.getClientRects().length > 0)
        const currentIndex = focusable.indexOf(document.activeElement)
        const movingBeforeStart = event.shiftKey && currentIndex <= 0
        const movingPastEnd = !event.shiftKey && currentIndex === focusable.length - 1
        if (movingBeforeStart || movingPastEnd) {
          event.preventDefault()
          focusable[movingBeforeStart ? focusable.length - 1 : 0]?.focus()
        }
        return
      }
      if (blockedActionShortcut || event.key === 'Tab' || !currentTarget?.contains(document.activeElement)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    function blockManualScroll(event) {
      const currentTarget = document.querySelector(step.selector)
      if (!currentTarget?.contains(event.target)) event.preventDefault()
    }

    document.addEventListener('click', guardEvent, true)
    document.addEventListener('input', guardEvent, true)
    document.addEventListener('change', guardEvent, true)
    document.addEventListener('keydown', guardKeyboard, true)
    document.addEventListener('wheel', blockManualScroll, { capture: true, passive: false })
    document.addEventListener('touchmove', blockManualScroll, { capture: true, passive: false })

    return () => {
      window.clearInterval(interval)
      if (missingTimer) window.clearTimeout(missingTimer)
      observer.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      document.removeEventListener('click', guardEvent, true)
      document.removeEventListener('input', guardEvent, true)
      document.removeEventListener('change', guardEvent, true)
      document.removeEventListener('keydown', guardKeyboard, true)
      document.removeEventListener('wheel', blockManualScroll, true)
      document.removeEventListener('touchmove', blockManualScroll, true)
    }
  }, [active, complete, step, stepIndex])

  if (!active) return null

  if (complete) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4" role="dialog" aria-modal="true" aria-labelledby="tour-complete-title">
        <div className="w-full max-w-md rounded-3xl border border-[#F0D7C8] bg-white p-7 text-center shadow-2xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">✓</div>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#E35336]">Demo complete</p>
          <h2 id="tour-complete-title" className="mt-2 text-2xl font-semibold text-[#12100A]">You have seen the full rehearsal loop.</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">You can now explore every screen and control freely. Reset the demo whenever you want to restart this guided tour.</p>
          <button autoFocus onClick={() => setActive(false)} className="mt-6 w-full rounded-xl bg-[#12100A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2a2415]">
            Explore on my own
          </button>
        </div>
      </div>
    )
  }

  if (!rect) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70" role="status">
        <div className="max-w-sm rounded-2xl bg-white px-5 py-4 text-center shadow-2xl">
          <p className="text-sm font-semibold text-gray-700">{missingStepIndex === stepIndex ? 'This tour step did not load correctly.' : 'Preparing the next step…'}</p>
          {missingStepIndex === stepIndex && (
            <button data-demo-tour-recovery className="mt-3 rounded-lg bg-[#12100A] px-4 py-2 text-xs font-semibold text-white">Reload demo</button>
          )}
        </div>
      </div>
    )
  }

  const tooltip = tooltipPosition(rect)

  return (
    <div aria-live="polite">
      {['top', 'left', 'right', 'bottom'].map(position => <div key={position} style={blockerStyle(position, rect)} />)}
      <div
        className="pointer-events-none fixed z-[1001] rounded-xl ring-4 ring-[#FFD3AC] ring-offset-2 ring-offset-[#E35336]"
        style={{ top: rect.top - PADDING, left: rect.left - PADDING, width: rect.width + PADDING * 2, height: rect.height + PADDING * 2 }}
      />
      <div className="pointer-events-none fixed z-[1002] rounded-2xl border border-[#F0D7C8] bg-white p-5 shadow-2xl" style={tooltip} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#E35336]">{step.chapter || 'Guided demo'} · {stepIndex + 1}/{steps.length}</span>
          <span className="text-[10px] font-semibold text-gray-400">Complete the action to continue</span>
        </div>
        <h2 className="mt-2 text-base font-semibold text-[#12100A]">{step.title}</h2>
        <p className="mt-1 text-sm leading-6 text-gray-600">{step.description}</p>
        {step.example && (
          <div className="pointer-events-auto mt-3 rounded-xl border border-[#F0D7C8] bg-[#FFF9F5] p-3">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-[#5F5550]">{step.example}</pre>
            <button data-demo-tour-copy className="mt-2 rounded-lg border border-[#E35336] bg-white px-3 py-1.5 text-xs font-semibold text-[#8A2B0E]">
              {copiedStepIndex === stepIndex ? 'Copied — paste into Lyrics' : 'Copy both lyric lines'}
            </button>
          </div>
        )}
        {step.event === 'manual' && (
          <button data-demo-tour-continue className="pointer-events-auto mt-4 rounded-lg bg-[#12100A] px-4 py-2 text-xs font-semibold text-white">Got it, continue</button>
        )}
      </div>
    </div>
  )
}

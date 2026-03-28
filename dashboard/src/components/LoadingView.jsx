import { useState, useEffect } from 'react'
import { Send } from 'lucide-react'
import { cn } from '../lib/utils'

function CursorSVG() {
  return (
    <svg width="18" height="24" viewBox="0 0 18 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 2L2 20L6 15.5L8.5 21.5L11.5 20.5L9 14L15 14L2 2Z"
        fill="rgba(235,235,235,0.93)"
        stroke="#0d0d0f"
        strokeWidth="1.1"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function LoadingView() {
  const [btnPhase, setBtnPhase] = useState('idle')
  // hidden | rising | holding | clicking | sinking
  const [cursorPhase, setCursorPhase] = useState('hidden')

  useEffect(() => {
    let cancelled = false

    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    }

    async function loop() {
      while (!cancelled) {
        await sleep(3000)
        if (cancelled) return

        setCursorPhase('rising')
        await sleep(600)
        if (cancelled) return

        setCursorPhase('holding')
        await sleep(200)
        if (cancelled) return

        // Click — trigger button shake
        setCursorPhase('clicking')
        setBtnPhase('shaking')
        await sleep(400)
        if (cancelled) return

        // Button + glow slide out, cursor sinks
        setBtnPhase('sliding')
        setCursorPhase('sinking')
        await sleep(480)
        if (cancelled) return

        setBtnPhase('hidden')
        await sleep(900)
        if (cancelled) return

        setBtnPhase('returning')
        await sleep(600)
        if (cancelled) return

        setBtnPhase('idle')
        setCursorPhase('hidden')
      }
    }

    loop()
    return () => { cancelled = true }
  }, [])

  const isActive = btnPhase !== 'idle' && btnPhase !== 'returning'

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center overflow-hidden">
      {/*
        Outer div: cursor's positioning reference — never moves.
        Inner div: button + glow as a unit — slides together.
      */}
      <div className="relative flex items-center justify-center">

        {/* ── Button + glow unit — translates together ── */}
        <div
          className={cn(
            'relative flex items-center justify-center',
            btnPhase === 'shaking' && 'animate-dispatch-shake',
            (btnPhase === 'sliding' || btnPhase === 'hidden') && 'animate-loading-btn-out',
            btnPhase === 'returning' && 'animate-loading-btn-in',
          )}
        >
          {/* Outer halo — very soft, large blur */}
          <div
            className="absolute pointer-events-none animate-loading-halo"
            style={{
              width: '204px',
              height: '66px',
              background: '#8bab8f',
              borderRadius: '50%',
              filter: 'blur(35px)',
            }}
          />

          {/* Primary core glow — sage green pulse */}
          <div
            className="absolute pointer-events-none animate-loading-glow"
            style={{
              width: '108px',
              height: '38px',
              background: '#8bab8f',
              borderRadius: '50%',
              filter: 'blur(19px)',
            }}
          />

          {/* Secondary drifting layer — teal, slowly shifts position */}
          <div
            className="absolute pointer-events-none animate-loading-glow-shift"
            style={{
              width: '90px',
              height: '32px',
              background: '#7ea89a',
              borderRadius: '50%',
              filter: 'blur(17px)',
            }}
          />

          {/* Button */}
          <button
            style={{
              background: 'linear-gradient(135deg, #8bab8f 0%, #6d9472 100%)',
              color: '#1a1b1e',
              boxShadow: isActive
                ? '0 0 24px 8px rgba(139,171,143,0.52)'
                : '0 0 12px 3px rgba(139,171,143,0.22)',
              transition: 'box-shadow 400ms ease',
            }}
            className="inline-flex items-center gap-2.5 pl-5 pr-6 h-10 rounded-full text-[13px] font-semibold shrink-0 relative z-10 cursor-default select-none"
          >
            <Send size={15} />
            Dispatch
          </button>
        </div>

        {/* ── Cursor — anchored to center, independent of button translation ── */}
        <div
          className="absolute pointer-events-none z-20"
          style={{ top: '100%', left: '50%', transform: 'translateX(5px)', marginTop: '2px' }}
        >
          <div
            className={cn(
              cursorPhase === 'hidden'   && 'translate-y-[50px] opacity-0',
              cursorPhase === 'rising'   && 'animate-cursor-rise',
              cursorPhase === 'holding'  && 'translate-y-[-20px] opacity-100',
              cursorPhase === 'clicking' && 'animate-cursor-click',
              cursorPhase === 'sinking'  && 'animate-cursor-sink',
            )}
          >
            <CursorSVG />
          </div>
        </div>

      </div>
    </div>
  )
}

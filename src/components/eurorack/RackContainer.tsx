"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import type { PortId, PortDef, Cable, Point } from "../engine/types"
import {
  CABLE_COLORS,
  WAVEFORMS,
  SCALE_NAMES,
  ROOT_NOTES,
} from "../engine/constants"
import { midiToHz, quantizeToScale, midiName } from "../engine/utils"
import { ALL_PORT_DEFS } from "../engine/portDefs"
import { Knob } from "../ui/Knob"
import { Port } from "../ui/Port"
import { DigitalDisplay } from "../ui/DigitalDisplay"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"

// Shared inline styles for small section labels and arrow buttons
// (hex colors cannot be used as Tailwind classNames)
const labelStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', 'Courier New', monospace",
  fontSize: "8px",
  color: "#6e6860",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
}

const arrowStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', 'Courier New', monospace",
  fontSize: "10px",
  color: "#6e6860",
  lineHeight: 1,
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "0 4px",
}

export default function RackContainer() {
  // ── Audio nodes ────────────────────────────────────────────────────────────
  const ctx = useRef<AudioContext | null>(null)
  const oscNode = useRef<OscillatorNode | null>(null)
  const lfoNode = useRef<OscillatorNode | null>(null)
  const lfoGain = useRef<GainNode | null>(null)
  const filterNode = useRef<BiquadFilterNode | null>(null)
  const vcaGain = useRef<GainNode | null>(null)
  const masterGain = useRef<GainNode | null>(null)
  const analyser = useRef<AnalyserNode | null>(null)
  const reverbConv = useRef<ConvolverNode | null>(null)
  const reverbWet = useRef<GainNode | null>(null)
  const reverbDry = useRef<GainNode | null>(null)
  const delayNode = useRef<DelayNode | null>(null)
  const delayFbGain = useRef<GainNode | null>(null)
  const delayWet = useRef<GainNode | null>(null)
  const adsrEnvGain = useRef<GainNode | null>(null)
  const seqCvGain = useRef<GainNode | null>(null)

  // ── Ping pong delay nodes ──────────────────────────────────────────────────
  const ppDelayL = useRef<DelayNode | null>(null)
  const ppDelayR = useRef<DelayNode | null>(null)
  const ppFbL = useRef<GainNode | null>(null)
  const ppFbR = useRef<GainNode | null>(null)
  const ppMerger = useRef<ChannelMergerNode | null>(null)
  const ppWet = useRef<GainNode | null>(null)
  const ppDry = useRef<GainNode | null>(null)

  // ── Refs ───────────────────────────────────────────────────────────────────
  const portRefs = useRef<Partial<Record<PortId, HTMLDivElement>>>({})
  const rackRef = useRef<HTMLDivElement>(null)
  const waveRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const seqStepRef = useRef(0)
  const adsrTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const audioStarted = useRef(false)

  // ── Patch state ────────────────────────────────────────────────────────────
  const [cables, setCables] = useState<Cable[]>([])
  const [dragging, setDragging] = useState<{
    portId: PortId
    color: string
  } | null>(null)
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 })
  const [colorIdx, setColorIdx] = useState(0)

  // ── Module state ───────────────────────────────────────────────────────────
  const [bpm, setBpm] = useState(120)
  const [clockBeat, setClockBeat] = useState(false)
  const [seqStep, setSeqStep] = useState(0)
  const [seqNotes, setSeqNotes] = useState([48, 52, 55, 60, 63])
  const seqNotesRef = useRef(seqNotes)
  const [scaleIdx, setScaleIdx] = useState(1)
  const [rootIdx, setRootIdx] = useState(0)
  const [lfoRate, setLfoRate] = useState(0.5)
  const [lfoDepth, setLfoDepth] = useState(100)
  const [oscFreq, setOscFreq] = useState(440)
  const [oscWaveIdx, setOscWaveIdx] = useState(0)
  const [attack, setAttack] = useState(0.05)
  const [decay, setDecay] = useState(0.2)
  const [sustain, setSustain] = useState(0.7)
  const [release, setRelease] = useState(0.4)
  const [filterType, setFilterType] = useState<BiquadFilterType>("lowpass")
  const [filterCutoff, setFilterCutoff] = useState(1200)
  const [filterRes, setFilterRes] = useState(1)
  const [vcaLevel, setVcaLevel] = useState(0.8)
  const [reverbSize, setReverbSize] = useState(0.5)
  const [reverbMix, setReverbMix] = useState(0.3)
  const [delayTime, setDelayTime] = useState(0.3)
  const [delayFb, setDelayFb] = useState(0.4)
  const [delayMix, setDelayMix] = useState(0.35)
  const [pingPong, setPingPong] = useState(false)
  const [ppDivision, setPpDivision] = useState(4)
  const [masterVol, setMasterVol] = useState(0.6)

  // ── ADSR value refs ────────────────────────────────────────────────────────
  const attackRef = useRef(attack)
  const decayRef = useRef(decay)
  const sustainRef = useRef(sustain)
  const releaseRef = useRef(release)
  const vcaLevelRef = useRef(vcaLevel)

  // ── Button interaction state ───────────────────────────────────────────────
  const [btnHover, setBtnHover] = useState<"clear" | "patch" | null>(null)
  const [btnPress, setBtnPress] = useState<"clear" | "patch" | null>(null)

  // ── Mobile / orientation detection ────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)
  const [mobilePatchReady, setMobilePatchReady] = useState(false)

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 1024)
      setIsPortrait(window.innerHeight > window.innerWidth)
    }
    check()
    window.addEventListener("resize", check)
    window.addEventListener("orientationchange", () => setTimeout(check, 100))
    return () => {
      window.removeEventListener("resize", check)
      window.removeEventListener("orientationchange", () =>
        setTimeout(check, 100)
      )
    }
  }, [])

  // ── Derived ────────────────────────────────────────────────────────────────
  const cableMap = cables.reduce<Partial<Record<PortId, PortId>>>((acc, c) => {
    acc[c.from] = c.to
    acc[c.to] = c.from
    return acc
  }, {})
  const linked = (a: PortId, b: PortId) =>
    cableMap[a] === b || cableMap[b] === a
  const connectedPorts = new Set<PortId>(cables.flatMap((c) => [c.from, c.to]))
  const ppDelayTime = 60 / bpm / ppDivision

  // ── Build impulse response ─────────────────────────────────────────────────
  const buildImpulse = useCallback((audioCtx: AudioContext, size: number) => {
    const rate = audioCtx.sampleRate
    const length = rate * (0.5 + size * 3.5)
    const buf = audioCtx.createBuffer(2, length, rate)
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch)
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 1.5 + size)
      }
    }
    return buf
  }, [])

  // ── Audio init ─────────────────────────────────────────────────────────────
  const initAudio = useCallback(() => {
    if (audioStarted.current) return
    audioStarted.current = true
    const ac = new AudioContext()
    ctx.current = ac

    const osc = ac.createOscillator()
    osc.type = WAVEFORMS[oscWaveIdx]
    osc.frequency.value = oscFreq
    osc.start()
    oscNode.current = osc

    const lfo = ac.createOscillator()
    lfo.type = "sine"
    lfo.frequency.value = lfoRate
    lfo.start()
    lfoNode.current = lfo
    const lg = ac.createGain()
    lg.gain.value = 0
    lfo.connect(lg)
    lfoGain.current = lg

    const scg = ac.createGain()
    scg.gain.value = 0
    seqCvGain.current = scg

    const filt = ac.createBiquadFilter()
    filt.type = filterType
    filt.frequency.value = filterCutoff
    filt.Q.value = filterRes
    filterNode.current = filt

    const vca = ac.createGain()
    vca.gain.value = vcaLevel
    vcaGain.current = vca

    const envG = ac.createGain()
    envG.gain.value = 0
    adsrEnvGain.current = envG

    const conv = ac.createConvolver()
    conv.buffer = buildImpulse(ac, reverbSize)
    reverbConv.current = conv
    const rwet = ac.createGain()
    rwet.gain.value = reverbMix
    reverbWet.current = rwet
    const rdry = ac.createGain()
    rdry.gain.value = 1.0
    reverbDry.current = rdry
    conv.connect(rwet)

    const dly = ac.createDelay(4)
    dly.delayTime.value = delayTime
    delayNode.current = dly
    const dfb = ac.createGain()
    dfb.gain.value = delayFb
    delayFbGain.current = dfb
    const dwet = ac.createGain()
    dwet.gain.value = delayMix
    delayWet.current = dwet
    dly.connect(dfb)
    dfb.connect(dly)
    dly.connect(dwet)

    const initPpTime = 60 / bpm / ppDivision
    const pDlyL = ac.createDelay(4)
    pDlyL.delayTime.value = initPpTime
    ppDelayL.current = pDlyL
    const pDlyR = ac.createDelay(4)
    pDlyR.delayTime.value = initPpTime * 2
    ppDelayR.current = pDlyR
    const pFbL = ac.createGain()
    pFbL.gain.value = delayFb
    ppFbL.current = pFbL
    const pFbR = ac.createGain()
    pFbR.gain.value = delayFb
    ppFbR.current = pFbR
    pDlyL.connect(pFbL)
    pFbL.connect(pDlyR)
    pDlyR.connect(pFbR)
    pFbR.connect(pDlyL)
    const merger = ac.createChannelMerger(2)
    ppMerger.current = merger
    pDlyL.connect(merger, 0, 0)
    pDlyR.connect(merger, 0, 1)
    const panL = ac.createStereoPanner()
    panL.pan.value = -1
    const panR = ac.createStereoPanner()
    panR.pan.value = 1
    const splitter = ac.createChannelSplitter(2)
    merger.connect(splitter)
    splitter.connect(panL, 0)
    splitter.connect(panR, 1)
    const pWet = ac.createGain()
    pWet.gain.value = delayMix * 2
    ppWet.current = pWet
    panL.connect(pWet)
    panR.connect(pWet)
    const pDry = ac.createGain()
    pDry.gain.value = 1.0
    ppDry.current = pDry

    const master = ac.createGain()
    master.gain.value = masterVol
    masterGain.current = master
    const an = ac.createAnalyser()
    an.fftSize = 512
    analyser.current = an
    master.connect(ac.destination)
    master.connect(an)
  }, []) // eslint-disable-line

  // ── Sync audio graph ───────────────────────────────────────────────────────
  const syncGraph = useCallback(
    (newCables: Cable[]) => {
      const ac = ctx.current
      if (!ac) return
      const map = newCables.reduce<Partial<Record<PortId, PortId>>>((a, c) => {
        a[c.from] = c.to
        a[c.to] = c.from
        return a
      }, {})
      const lk = (a: PortId, b: PortId) => map[a] === b || map[b] === a

      const nodes = [
        oscNode,
        lfoGain,
        seqCvGain,
        filterNode,
        vcaGain,
        adsrEnvGain,
        reverbConv,
        reverbWet,
        reverbDry,
        delayWet,
        masterGain,
        ppWet,
        ppDry,
        ppMerger,
      ]
      nodes.forEach((r) => {
        try {
          r.current?.disconnect()
        } catch {}
      })

      if (reverbConv.current && reverbWet.current)
        reverbConv.current.connect(reverbWet.current)

      const pDlyL = ppDelayL.current
      const pDlyR = ppDelayR.current
      const pFbL = ppFbL.current
      const pFbR = ppFbR.current
      const merger = ppMerger.current
      const pWet = ppWet.current
      const pDry = ppDry.current
      if (pDlyL && pDlyR && pFbL && pFbR && merger && pWet && pDry) {
        pDlyL.connect(pFbL)
        pFbL.connect(pDlyR)
        pDlyR.connect(pFbR)
        pFbR.connect(pDlyL)
        pDlyL.connect(merger, 0, 0)
        pDlyR.connect(merger, 0, 1)
        merger.connect(pWet)
      }

      const osc = oscNode.current
      const lg = lfoGain.current
      const filt = filterNode.current
      const vca = vcaGain.current
      const conv = reverbConv.current
      const rwet = reverbWet.current
      const rdry = reverbDry.current
      const dly = delayNode.current
      const dwet = delayWet.current
      const master = masterGain.current
      const an = analyser.current
      if (!osc || !lg || !filt || !vca || !master || !an) return

      master.connect(ac.destination)
      master.connect(an)

      if (lk("lfo-out", "filter-cv-in")) lg.connect(filt.frequency)
      if (lk("lfo-out", "osc-fm-in")) lg.connect(osc.frequency)
      lg.gain.setTargetAtTime(
        lk("lfo-out", "osc-fm-in") || lk("lfo-out", "filter-cv-in")
          ? lfoDepth
          : 0,
        ac.currentTime,
        0.05
      )

      if (lk("osc-out", "filter-audio-in")) {
        osc.connect(filt)
        let sig: AudioNode = filt
        if (lk("filter-audio-out", "vca-audio-in")) {
          filt.connect(vca)
          sig = vca
        }
        routeToFX(
          sig,
          lk,
          conv,
          rwet,
          rdry,
          dly,
          dwet,
          pDlyL,
          pDlyR,
          pWet,
          pDry,
          master,
          pingPong
        )
      } else if (lk("osc-out", "vca-audio-in")) {
        osc.connect(vca)
        routeToFX(
          vca,
          lk,
          conv,
          rwet,
          rdry,
          dly,
          dwet,
          pDlyL,
          pDlyR,
          pWet,
          pDry,
          master,
          pingPong
        )
      } else if (lk("osc-out", "reverb-audio-in") && conv && rwet && rdry) {
        osc.connect(conv)
        osc.connect(rdry)
        if (lk("reverb-audio-out", "out-in")) {
          rwet.connect(master)
          rdry.connect(master)
        }
      } else if (lk("osc-out", "delay-audio-in")) {
        if (pingPong && pDlyL && pWet && pDry) {
          osc.connect(pDlyL)
          osc.connect(pDry)
          if (lk("delay-audio-out", "out-in")) {
            pWet.connect(master)
            pDry.connect(master)
          }
        } else if (dly && dwet) {
          osc.connect(dly)
          osc.connect(master)
          if (lk("delay-audio-out", "out-in")) dwet.connect(master)
        }
      } else if (lk("osc-out", "out-in")) {
        osc.connect(master)
      }

      master.gain.setTargetAtTime(masterVol, ac.currentTime, 0.05)
    },
    [lfoDepth, masterVol, pingPong]
  ) // eslint-disable-line

  function routeToFX(
    src: AudioNode,
    lk: (a: PortId, b: PortId) => boolean,
    conv: ConvolverNode | null,
    rwet: GainNode | null,
    rdry: GainNode | null,
    dly: DelayNode | null,
    dwet: GainNode | null,
    pDlyL: DelayNode | null,
    pDlyR: DelayNode | null,
    pWet: GainNode | null,
    pDry: GainNode | null,
    master: GainNode,
    isPingPong: boolean
  ) {
    if (
      lk("reverb-audio-in", "vca-out") ||
      lk("reverb-audio-in", "filter-audio-out")
    ) {
      if (conv && rwet && rdry) {
        src.connect(conv)
        src.connect(rdry)
        if (lk("reverb-audio-out", "delay-audio-in")) {
          if (isPingPong && pDlyL && pWet && pDry) {
            rwet.connect(pDlyL)
            rdry.connect(pDlyL)
            rwet.connect(pDry)
            rdry.connect(pDry)
            if (lk("delay-audio-out", "out-in")) {
              pWet.connect(master)
              pDry.connect(master)
            }
          } else if (dly && dwet) {
            rwet.connect(dly)
            rdry.connect(dly)
            if (lk("delay-audio-out", "out-in")) {
              dly.connect(master)
              dwet.connect(master)
            }
          }
        } else if (lk("reverb-audio-out", "out-in")) {
          rwet.connect(master)
          rdry.connect(master)
        }
        return
      }
    }
    if (
      lk("delay-audio-in", "vca-out") ||
      lk("delay-audio-in", "filter-audio-out")
    ) {
      if (isPingPong && pDlyL && pWet && pDry) {
        src.connect(pDlyL)
        src.connect(pDry)
        if (lk("delay-audio-out", "out-in")) {
          pWet.connect(master)
          pDry.connect(master)
        }
      } else if (dly && dwet) {
        src.connect(dly)
        src.connect(master)
        if (lk("delay-audio-out", "out-in")) dwet.connect(master)
      }
      return
    }
    if (lk("vca-out", "out-in") || lk("filter-audio-out", "out-in"))
      src.connect(master)
  }

  // ── ADSR trigger ───────────────────────────────────────────────────────────
  const triggerADSR = useCallback(() => {
    const ac = ctx.current
    const vca = vcaGain.current
    if (!ac || !vca) return
    if (!linked("adsr-env-out", "vca-cv-in")) return
    const attack = attackRef.current
    const decay = decayRef.current
    const sustain = sustainRef.current
    const release = releaseRef.current
    adsrTimers.current.forEach(clearTimeout)
    adsrTimers.current = []
    const now = ac.currentTime
    // Cancel any ongoing envelope to prevent clicks, then start new one , using cancelHoldAtTime to allow for quick re-triggers without needing to return to zero first
    if (vca.gain.cancelAndHoldAtTime) {
      vca.gain.cancelAndHoldAtTime(now)
    } else {
      vca.gain.cancelScheduledValues(now)
    }
    // Short 5ms ramp to zero before attack — eliminates click from any
    // residual gain value when a new note retriggers mid-envelope
    const preAttack = 0.005
    vca.gain.linearRampToValueAtTime(0, now + preAttack)
    vca.gain.linearRampToValueAtTime(vcaLevel, now + preAttack + attack)
    vca.gain.setValueAtTime(
      vcaLevel * sustain,
      now + preAttack + attack + decay
    )
    vca.gain.linearRampToValueAtTime(
      vcaLevel * sustain,
      now + preAttack + attack + decay
    )
    // Short 5ms ramp at release end instead of hard snap to zero
    vca.gain.linearRampToValueAtTime(
      0,
      now + preAttack + attack + decay + 0.05 + release
    )
  }, [attack, decay, sustain, release, vcaLevel, cables])

  // ── Sequencer ──────────────────────────────────────────────────────────────
  const stepSeq = useCallback(() => {
    setSeqStep((prev) => {
      const next = (prev + 1) % 5
      seqStepRef.current = next
      if (
        ctx.current &&
        oscNode.current &&
        linked("seq-cv-out", "osc-voct-in")
      ) {
        const quantized = quantizeToScale(
          seqNotesRef.current[next],
          SCALE_NAMES[scaleIdx],
          rootIdx
        )
        oscNode.current.frequency.setTargetAtTime(
          midiToHz(quantized),
          ctx.current.currentTime,
          0.01
        )
      }
      if (linked("seq-gate-out", "adsr-gate-in")) triggerADSR()
      return next
    })
    setClockBeat(true)
    setTimeout(() => setClockBeat(false), 80)
  }, [scaleIdx, rootIdx, cables]) // eslint-disable-line

  useEffect(() => {
    seqNotesRef.current = seqNotes
  }, [seqNotes])

  // ── Clock interval ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (clockRef.current) clearInterval(clockRef.current)
    const interval = (60 / bpm) * 1000
    clockRef.current = setInterval(() => {
      if (!ctx.current) return
      if (linked("clock-out", "seq-clock-in")) stepSeq()
    }, interval)
    return () => {
      if (clockRef.current) clearInterval(clockRef.current)
    }
  }, [bpm, stepSeq, cables]) // eslint-disable-line

  // ── Param → audio sync ─────────────────────────────────────────────────────
  useEffect(() => {
    if (lfoNode.current && ctx.current)
      lfoNode.current.frequency.setTargetAtTime(
        lfoRate,
        ctx.current.currentTime,
        0.05
      )
  }, [lfoRate])
  useEffect(() => {
    if (lfoGain.current && ctx.current) {
      const on =
        linked("lfo-out", "osc-fm-in") || linked("lfo-out", "filter-cv-in")
      lfoGain.current.gain.setTargetAtTime(
        on ? lfoDepth : 0,
        ctx.current.currentTime,
        0.05
      )
    }
  }, [lfoDepth, cables]) // eslint-disable-line
  useEffect(() => {
    if (oscNode.current) oscNode.current.type = WAVEFORMS[oscWaveIdx]
  }, [oscWaveIdx])
  useEffect(() => {
    if (filterNode.current) filterNode.current.type = filterType
  }, [filterType])
  useEffect(() => {
    if (filterNode.current && ctx.current)
      filterNode.current.frequency.setTargetAtTime(
        filterCutoff,
        ctx.current.currentTime,
        0.05
      )
  }, [filterCutoff])
  useEffect(() => {
    if (filterNode.current && ctx.current)
      filterNode.current.Q.setTargetAtTime(
        filterRes,
        ctx.current.currentTime,
        0.05
      )
  }, [filterRes])
  useEffect(() => {
    if (masterGain.current && ctx.current)
      masterGain.current.gain.setTargetAtTime(
        masterVol,
        ctx.current.currentTime,
        0.05
      )
  }, [masterVol])
  useEffect(() => {
    if (!reverbConv.current || !ctx.current) return
    reverbConv.current.buffer = buildImpulse(ctx.current, reverbSize)
  }, [reverbSize, buildImpulse])
  useEffect(() => {
    if (!reverbWet.current || !ctx.current) return
    reverbWet.current.gain.setTargetAtTime(
      reverbMix,
      ctx.current.currentTime,
      0.05
    )
  }, [reverbMix])
  useEffect(() => {
    if (
      delayNode.current &&
      ctx.current &&
      !linked("delay-clock-in", "clock-out")
    )
      delayNode.current.delayTime.setTargetAtTime(
        delayTime,
        ctx.current.currentTime,
        0.05
      )
  }, [delayTime])
  useEffect(() => {
    if (delayFbGain.current && ctx.current)
      delayFbGain.current.gain.setTargetAtTime(
        delayFb,
        ctx.current.currentTime,
        0.05
      )
  }, [delayFb])
  useEffect(() => {
    if (!ctx.current) return
    if (delayWet.current)
      delayWet.current.gain.setTargetAtTime(
        delayMix,
        ctx.current.currentTime,
        0.05
      )
    if (ppWet.current)
      ppWet.current.gain.setTargetAtTime(
        delayMix * 2,
        ctx.current.currentTime,
        0.05
      )
  }, [delayMix])
  useEffect(() => {
    if (!ctx.current) return
    const clocked = linked("delay-clock-in", "clock-out")
    const t = 60 / bpm / ppDivision
    // Ping pong: sync to BPM only when clock-in is patched, otherwise use current value to avoid clicks
    if (clocked) {
      if (ppDelayL.current)
        ppDelayL.current.delayTime.setTargetAtTime(
          t,
          ctx.current.currentTime,
          0.01
        )
      if (ppDelayR.current)
        ppDelayR.current.delayTime.setTargetAtTime(
          t * 2,
          ctx.current.currentTime,
          0.01
        )
      if (delayNode.current)
        delayNode.current.delayTime.setTargetAtTime(
          60 / bpm,
          ctx.current.currentTime,
          0.01
        )
    }
  }, [bpm, ppDivision])
  useEffect(() => {
    if (ctx.current) syncGraph(cables)
  }, [pingPong]) // eslint-disable-line
  useEffect(() => {
    if (oscNode.current && ctx.current && !linked("seq-cv-out", "osc-voct-in"))
      oscNode.current.frequency.setTargetAtTime(
        oscFreq,
        ctx.current.currentTime,
        0.05
      )
  }, [oscFreq, cables]) // eslint-disable-line
  useEffect(() => {
    if (vcaGain.current && ctx.current && !linked("adsr-env-out", "vca-cv-in"))
      vcaGain.current.gain.setTargetAtTime(
        vcaLevel,
        ctx.current.currentTime,
        0.05
      )
  }, [vcaLevel, cables]) // eslint-disable-line
  useEffect(() => {
    attackRef.current = attack
  }, [attack])
  useEffect(() => {
    decayRef.current = decay
  }, [decay])
  useEffect(() => {
    sustainRef.current = sustain
  }, [sustain])
  useEffect(() => {
    releaseRef.current = release
  }, [release])
  useEffect(() => {
    vcaLevelRef.current = vcaLevel
  }, [vcaLevel])

  // ── Waveform canvas ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = waveRef.current
    if (!canvas) return
    const c2d = canvas.getContext("2d")
    if (!c2d) return
    const buf = new Uint8Array(512)
    const draw = () => {
      animRef.current = requestAnimationFrame(draw)
      const an = analyser.current
      if (an) an.getByteTimeDomainData(buf)
      c2d.clearRect(0, 0, canvas.width, canvas.height)
      c2d.strokeStyle = "#f5a623"
      c2d.lineWidth = 1.5
      c2d.beginPath()
      for (let i = 0; i < canvas.width; i++) {
        const v =
          (an ? buf[Math.floor((i * buf.length) / canvas.width)] : 128) / 128 -
          1
        const y = (v * canvas.height) / 2 + canvas.height / 2
        i === 0 ? c2d.moveTo(i, y) : c2d.lineTo(i, y)
      }
      c2d.stroke()
    }
    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  // ── Mouse tracking ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const r = rackRef.current?.getBoundingClientRect()
      if (r) setMousePos({ x: e.clientX - r.left, y: e.clientY - r.top })
    }
    window.addEventListener("mousemove", onMove)
    return () => window.removeEventListener("mousemove", onMove)
  }, [])

  // ── Auto patch cables ──────────────────────────────────────────────────────
  const AUTO_PATCH_CABLES: Cable[] = [
    { from: "clock-out", to: "seq-clock-in", color: CABLE_COLORS[0] },
    { from: "clock-out", to: "delay-clock-in", color: CABLE_COLORS[0] },
    { from: "seq-cv-out", to: "osc-voct-in", color: CABLE_COLORS[1] },
    { from: "osc-out", to: "filter-audio-in", color: CABLE_COLORS[2] },
    { from: "lfo-out", to: "filter-cv-in", color: CABLE_COLORS[3] },
    { from: "lfo-out", to: "osc-fm-in", color: CABLE_COLORS[3] },
    { from: "filter-audio-out", to: "vca-audio-in", color: CABLE_COLORS[4] },
    { from: "adsr-env-out", to: "vca-cv-in", color: CABLE_COLORS[5] },
    { from: "seq-gate-out", to: "adsr-gate-in", color: CABLE_COLORS[6] },
    { from: "vca-out", to: "reverb-audio-in", color: CABLE_COLORS[7] },
    { from: "reverb-audio-out", to: "delay-audio-in", color: CABLE_COLORS[8] },
    { from: "delay-audio-out", to: "out-in", color: CABLE_COLORS[9] },
  ]

  const doAutoPatch = useCallback(() => {
    initAudio()
    setCables(AUTO_PATCH_CABLES)
    setColorIdx(0)
    syncGraph(AUTO_PATCH_CABLES)
  }, [initAudio, syncGraph]) // eslint-disable-line

  // ── Mobile: auto-patch on landscape entry ─────────────────────────────────
  useEffect(() => {
    if (isMobile && !isPortrait && !mobilePatchReady) {
      doAutoPatch()
      setMobilePatchReady(true)
    }
  }, [isMobile, isPortrait, mobilePatchReady, doAutoPatch])

  // ── Port click ─────────────────────────────────────────────────────────────
  const handlePortClick = useCallback(
    (portId: PortId) => {
      initAudio()
      const toDef = ALL_PORT_DEFS.find((p) => p.id === portId)!
      if (dragging) {
        if (dragging.portId === portId) {
          setDragging(null)
          return
        }
        const fromDef = ALL_PORT_DEFS.find((p) => p.id === dragging.portId)!
        if (fromDef.type === toDef.type) {
          setDragging(null)
          return
        }
        const dup = cables.some(
          (c) =>
            (c.from === dragging.portId && c.to === portId) ||
            (c.from === portId && c.to === dragging.portId)
        )
        if (dup) {
          setDragging(null)
          return
        }
        const cable: Cable = {
          from: fromDef.type === "output" ? dragging.portId : portId,
          to: fromDef.type === "output" ? portId : dragging.portId,
          color: dragging.color,
        }
        const nc = [...cables, cable]
        setCables(nc)
        setDragging(null)
        setColorIdx((i) => (i + 1) % CABLE_COLORS.length)
        syncGraph(nc)
      } else {
        const existIdx = cables.findIndex(
          (c) => c.from === portId || c.to === portId
        )
        if (existIdx >= 0) {
          const nc = cables.filter((_, i) => i !== existIdx)
          setCables(nc)
          syncGraph(nc)
          return
        }
        setDragging({ portId, color: CABLE_COLORS[colorIdx] })
      }
    },
    [dragging, cables, colorIdx, initAudio, syncGraph]
  )

  // ── Cable helpers ──────────────────────────────────────────────────────────
  const getCenter = (id: PortId): Point | null => {
    const el = portRefs.current[id]
    const rack = rackRef.current
    if (!el || !rack) return null
    const pr = el.getBoundingClientRect()
    const rr = rack.getBoundingClientRect()
    return {
      x: pr.left + pr.width / 2 - rr.left,
      y: pr.top + pr.height / 2 - rr.top,
    }
  }

  const cablePath = (p1: Point, p2: Point) => {
    const dx = p2.x - p1.x
    const sag = Math.min(80, Math.abs(p2.y - p1.y) * 0.4 + 30)
    return `M${p1.x},${p1.y} C${p1.x + dx * 0.3},${p1.y + sag} ${
      p2.x - dx * 0.3
    },${p2.y + sag} ${p2.x},${p2.y}`
  }

  // ── Port render helper ─────────────────────────────────────────────────────
  const mkPort = (def: PortDef) => {
    const fromDef = dragging
      ? ALL_PORT_DEFS.find((p) => p.id === dragging.portId)
      : null
    const highlighted =
      !!dragging && dragging.portId !== def.id && fromDef?.type !== def.type
    return (
      <Port
        key={def.id}
        def={def}
        connected={connectedPorts.has(def.id)}
        cableColor={
          cables.find((c) => c.from === def.id || c.to === def.id)?.color
        }
        highlighted={highlighted}
        dragging={!!dragging}
        onRef={(id, el) => {
          portRefs.current[id] = el ?? undefined
        }}
        onClick={handlePortClick}
      />
    )
  }

  // ── MOBILE: Portrait — rotate prompt ──────────────────────────────────────
  if (isMobile && isPortrait) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100dvh",
          background: "#000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          userSelect: "none",
        }}
      >
        <div
          style={{
            width: 40,
            height: 1,
            background: "#3a2800",
            marginBottom: "2rem",
          }}
        />
        <span
          style={{
            fontFamily: "'Bebas Neue', 'Impact', sans-serif",
            fontSize: "clamp(28px, 10vw, 42px)",
            fontWeight: 700,
            color: "#e8e2d4",
            letterSpacing: "0.15em",
            lineHeight: 1,
            textAlign: "center",
          }}
        >
          PLAYGROUND
        </span>
        <div
          style={{
            width: "100%",
            maxWidth: 200,
            height: 1,
            background: "#1e1e1e",
            margin: "1.5rem 0",
          }}
        />
        <span style={{ fontSize: "2rem", marginBottom: "1rem", opacity: 0.5 }}>
          ⟳
        </span>
        <span
          style={{
            fontFamily: "'DM Mono', 'Courier New', monospace",
            fontSize: "11px",
            color: "#6e6860",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            textAlign: "center",
            lineHeight: 2.2,
          }}
        >
          rotate to landscape
          <br />
          to load the synth
        </span>
        <div
          style={{
            width: 40,
            height: 1,
            background: "#3a2800",
            marginTop: "2rem",
          }}
        />
        <a
          href="https://ritasilva.online"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            color: "#3a3028",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            textDecoration: "none",
            marginTop: "3rem",
          }}
        >
          ritasilva.online
        </a>
      </div>
    )
  }

  // ── MOBILE: Landscape — preset-only performance view ──────────────────────
  if (isMobile && !isPortrait) {
    // mini patch view (modules + cables) from actual patch
    // Rack layout for auto-patch: CLK → SEQ → OSC → FILTER → VCA → REVERB → DELAY → OUT
    const MINI_MODULES = [
      { id: "clock", label: "clock" },
      { id: "seq", label: "seq" },
      { id: "osc", label: "osc" },
      { id: "filter", label: "filt" },
      { id: "vca", label: "vca" },
      { id: "reverb", label: "rvb" },
      { id: "delay", label: "dly" },
      { id: "out", label: "out" },
    ]
    // cable colour mapping for mini patch view (matches auto-patch cables)
    const cableColorMap: Record<string, string> = {
      "clock-out-seq-clock-in": CABLE_COLORS[0],
      "clock-out-delay-clock-in": CABLE_COLORS[0],
      "seq-cv-out-osc-voct-in": CABLE_COLORS[1],
      "osc-out-filter-audio-in": CABLE_COLORS[2],
      "lfo-out-filter-cv-in": CABLE_COLORS[3],
      "lfo-out-osc-fm-in": CABLE_COLORS[3],
      "filter-audio-out-vca-audio-in": CABLE_COLORS[4],
      "adsr-env-out-vca-cv-in": CABLE_COLORS[5],
      "seq-gate-out-adsr-gate-in": CABLE_COLORS[6],
      "vca-out-reverb-audio-in": CABLE_COLORS[7],
      "reverb-audio-out-delay-audio-in": CABLE_COLORS[8],
      "delay-audio-out-out-in": CABLE_COLORS[9],
    }
    // derive cables for mini patch view from actual cables, using colour mapping above
    const miniCables = cables
      .filter((c) => {
        const key1 = `${c.from}-${c.to}`
        const key2 = `${c.to}-${c.from}`
        return cableColorMap[key1] || cableColorMap[key2]
      })
      .map((c) => {
        const key1 = `${c.from}-${c.to}`
        const key2 = `${c.to}-${c.from}`
        return {
          from: c.from.split("-")[0], // get module id from port id
          to: c.to.split("-")[0],
          color: cableColorMap[key1] || cableColorMap[key2] || "#fff",
        }
      })

    // SVG layout constants
    const BOX_W = 38
    const BOX_H = 24
    const GAP = 16
    const SVG_W = MINI_MODULES.length * BOX_W + (MINI_MODULES.length - 1) * GAP
    const SVG_H = 90
    const BOX_Y = 30 // y position of module boxes
    const PORT_Y = BOX_Y + BOX_H // bottom port y
    const TOP_PORT_Y = BOX_Y // top port y

    // Centre x of module box by index
    const cx = (i: number) => i * (BOX_W + GAP) + BOX_W / 2

    // Module index lookup
    const modIndex = (id: string) => MINI_MODULES.findIndex((m) => m.id === id)

    // Separate sidechain cables (LFO→filter, ADSR→vca, seq-gate→adsr)
    // from main chain cables so we can draw them differently
    const SIDECHAIN_IDS = new Set(["lfo", "adsr"])
    const mainCables = miniCables.filter((c) => !SIDECHAIN_IDS.has(c.from))
    const sidechainCables = miniCables.filter((c) => SIDECHAIN_IDS.has(c.from))

    return (
      <div
        style={{
          width: "100vw",
          height: "100dvh",
          background: "#000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem 1.5rem",
          userSelect: "none",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            fontFamily: "'Bebas Neue', 'Impact', sans-serif",
            fontSize: "22px",
            fontWeight: 700,
            color: "#e8e2d4",
            letterSpacing: "0.2em",
            marginBottom: "2px",
          }}
        >
          PLAYGROUND
        </span>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "7px",
            color: "#3a3028",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "18px",
          }}
        >
          preset — auto patch
        </span>

        {/* Mini patch SVG */}
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{
            width: "min(90vw, 480px)",
            height: "auto",
            overflow: "visible",
            marginBottom: "18px",
          }}
        >
          {/* Main chain cables — curved paths between module bottom ports */}
          {mainCables.map((cable, i) => {
            const fromIdx = modIndex(cable.from)
            const toIdx = modIndex(cable.to)
            if (fromIdx < 0 || toIdx < 0) return null
            const x1 = cx(fromIdx)
            const x2 = cx(toIdx)
            const sag = 20
            return (
              <path
                key={`main-${i}`}
                d={`M${x1},${PORT_Y} C${x1},${PORT_Y + sag} ${x2},${
                  PORT_Y + sag
                } ${x2},${PORT_Y}`}
                stroke={cable.color}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                opacity="0.9"
              />
            )
          })}

          {/* Sidechain cables — dashed lines dropping into module top ports */}
          {sidechainCables.map((cable, i) => {
            const toIdx = modIndex(cable.to)
            if (toIdx < 0) return null
            const x = cx(toIdx)
            const labelY = TOP_PORT_Y - 18
            return (
              <g key={`side-${i}`}>
                <text
                  x={x}
                  y={labelY}
                  textAnchor="middle"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "6px",
                    fill: cable.color,
                    letterSpacing: "0.08em",
                    fontWeight: 700,
                  }}
                >
                  {cable.from.toUpperCase()}
                </text>
                <line
                  x1={x}
                  y1={labelY + 4}
                  x2={x}
                  y2={TOP_PORT_Y}
                  stroke={cable.color}
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                  opacity="0.75"
                />
                <circle
                  cx={x}
                  cy={TOP_PORT_Y}
                  r="2"
                  fill={cable.color}
                  opacity="0.9"
                />
              </g>
            )
          })}

          {/* Module boxes */}
          {MINI_MODULES.map((mod, i) => (
            <g key={mod.id}>
              <rect
                x={cx(i) - BOX_W / 2}
                y={BOX_Y}
                width={BOX_W}
                height={BOX_H}
                rx={3}
                fill="#0d0d0d"
                stroke="#2a2a2a"
                strokeWidth="1"
              />
              <text
                x={cx(i)}
                y={BOX_Y + BOX_H / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "7px",
                  fill: "#c8c0b0",
                  letterSpacing: "0.06em",
                  fontWeight: 700,
                }}
              >
                {mod.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Vol knob */}
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "8px",
            color: "#6e6860",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          master volume
        </span>
        <Knob
          value={masterVol}
          min={0}
          max={1}
          label="vol"
          sublabel={`${Math.round(masterVol * 100)}%`}
          size={52}
          onChange={(v) => {
            setMasterVol(v)
            if (masterGain.current && ctx.current)
              masterGain.current.gain.setTargetAtTime(
                v,
                ctx.current.currentTime,
                0.05
              )
          }}
        />
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: mobilePatchReady ? "#f5a623" : "#1a0e00",
            boxShadow: mobilePatchReady ? "0 0 8px #f5a623" : "none",
            marginTop: "16px",
          }}
        />
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "7px",
            color: mobilePatchReady ? "#6a5030" : "#2a2020",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginTop: "6px",
          }}
        >
          {mobilePatchReady ? "playing" : "loading..."}
        </span>
        <a
          href="https://ritasilva.online"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "8px",
            color: "#2a2820",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            textDecoration: "none",
            marginTop: "auto",
            paddingTop: "2rem",
          }}
        >
          ritasilva.online
        </a>
      </div>
    )
  }

  // ── DESKTOP / TABLET: Full rack ────────────────────────────────────────────
  return (
    <div
      className="flex flex-col items-center gap-3 p-4 select-none w-full overflow-hidden"
      style={{ cursor: dragging ? "none" : "default" }}
    >
      <div
        className="relative flex gap-2 rounded-xl p-3"
        style={{ marginBottom: "0px" }}
      >
        <div
          ref={rackRef}
          className="relative flex gap-2 rounded-xl"
          style={{
            background: "#0d0d0d",
            border: "2px solid #1a1a1a",
            width: "fit-content",
            //marginBottom: "120px",
          }}
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest("[data-port]") && dragging)
              setDragging(null)
          }}
        >
          {/* SVG cable layer */}
          <svg
            className="absolute pointer-events-none"
            style={{
              top: 0,
              left: 0,
              width: "100%",
              height: "calc(100% + 120px)",
              overflow: "visible",
              zIndex: 20,
            }}
          >
            {cables.map((cable, i) => {
              const p1 = getCenter(cable.from),
                p2 = getCenter(cable.to)
              if (!p1 || !p2) return null
              return (
                <g key={i}>
                  <path
                    d={cablePath(p1, p2)}
                    stroke={cable.color}
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                  <circle
                    cx={p1.x}
                    cy={p1.y}
                    r="4.5"
                    fill={cable.color}
                    stroke="#fff"
                    strokeWidth="1"
                  />
                  <circle
                    cx={p2.x}
                    cy={p2.y}
                    r="4.5"
                    fill={cable.color}
                    stroke="#fff"
                    strokeWidth="1"
                  />
                </g>
              )
            })}
            {dragging &&
              (() => {
                const p1 = getCenter(dragging.portId)
                if (!p1) return null
                return (
                  <g>
                    <path
                      d={cablePath(p1, mousePos)}
                      stroke={dragging.color}
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      opacity="0.55"
                      strokeDasharray="6 4"
                    />
                    <circle
                      cx={mousePos.x}
                      cy={mousePos.y}
                      r="6"
                      fill={dragging.color}
                      stroke="#fff"
                      strokeWidth="1.5"
                    />
                    <line
                      x1={mousePos.x}
                      y1={mousePos.y + 6}
                      x2={mousePos.x}
                      y2={mousePos.y + 14}
                      stroke={dragging.color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </g>
                )
              })()}
          </svg>

          {/* ── CLOCK ────────────────────────────────────────────── */}
          <ModuleFrontPanel title="clock" width={110}>
            <div className="flex flex-col items-center gap-1">
              <DigitalDisplay value={`${Math.round(bpm)} bpm`} width={88} />
              <div
                className="w-2 h-2 rounded-full mt-1 transition-all duration-75"
                style={{
                  background: clockBeat ? "#f5a623" : "#1a0e00",
                  boxShadow: clockBeat ? "0 0 6px #f5a623" : "none",
                }}
              />
            </div>
            <Knob
              value={bpm}
              min={30}
              max={300}
              label="bpm"
              sublabel={`${Math.round(bpm)}`}
              onChange={setBpm}
            />
            <PortSection>
              {mkPort({ id: "clock-out", label: "clock out", type: "output" })}
            </PortSection>
          </ModuleFrontPanel>

          {/* ── SEQUENCER ────────────────────────────────────────── */}
          <ModuleFrontPanel title="5 STEP SEQUENCER" width={270}>
            <div
              style={{
                display: "flex",
                gap: "12px",
                width: "100%",
                padding: "0 16px",
                boxSizing: "border-box",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span
                  style={{ ...labelStyle, textAlign: "center", width: "100%" }}
                >
                  scale
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    width: "100%",
                  }}
                >
                  <button
                    onClick={() =>
                      setScaleIdx(
                        (i) => (i - 1 + SCALE_NAMES.length) % SCALE_NAMES.length
                      )
                    }
                    style={arrowStyle}
                  >
                    ◀
                  </button>
                  <DigitalDisplay value={SCALE_NAMES[scaleIdx]} width={72} />
                  <button
                    onClick={() =>
                      setScaleIdx((i) => (i + 1) % SCALE_NAMES.length)
                    }
                    style={arrowStyle}
                  >
                    ▶
                  </button>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span
                  style={{ ...labelStyle, textAlign: "center", width: "100%" }}
                >
                  root
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                  }}
                >
                  <button
                    onClick={() => setRootIdx((i) => (i - 1 + 12) % 12)}
                    style={arrowStyle}
                  >
                    ◀
                  </button>
                  <DigitalDisplay value={ROOT_NOTES[rootIdx]} width={30} />
                  <button
                    onClick={() => setRootIdx((i) => (i + 1) % 12)}
                    style={arrowStyle}
                  >
                    ▶
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-center">
              {seqNotes.map((note, i) => {
                const quantized = quantizeToScale(
                  note,
                  SCALE_NAMES[scaleIdx],
                  rootIdx
                )
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full transition-all duration-75"
                      style={{
                        background: seqStep === i ? "#f5a623" : "#0a0806",
                        boxShadow: seqStep === i ? "0 0 6px #f5a623bb" : "none",
                        border: "1px solid #1e1e1e",
                      }}
                    />
                    <Knob
                      value={note}
                      min={36}
                      max={84}
                      label={`s${i + 1}`}
                      sublabel={midiName(quantized)}
                      size={28}
                      onChange={(v) =>
                        setSeqNotes((prev) => {
                          const n = [...prev]
                          n[i] = Math.round(v)
                          return n
                        })
                      }
                    />
                  </div>
                )
              })}
            </div>
            <PortSection>
              {mkPort({ id: "seq-clock-in", label: "clk in", type: "input" })}
              {mkPort({ id: "seq-cv-out", label: "cv out", type: "output" })}
              {mkPort({
                id: "seq-gate-out",
                label: "gate out",
                type: "output",
              })}
            </PortSection>
          </ModuleFrontPanel>

          {/* ── ADSR ─────────────────────────────────────────────── */}
          <ModuleFrontPanel title="adsr" width={110}>
            <Knob
              value={attack}
              min={0.001}
              max={2}
              label="attack"
              sublabel={`${attack.toFixed(2)}s`}
              onChange={setAttack}
            />
            <Knob
              value={decay}
              min={0.01}
              max={2}
              label="decay"
              sublabel={`${decay.toFixed(2)}s`}
              onChange={setDecay}
            />
            <Knob
              value={sustain}
              min={0}
              max={1}
              label="sustain"
              sublabel={`${Math.round(sustain * 100)}%`}
              onChange={setSustain}
            />
            <Knob
              value={release}
              min={0.01}
              max={4}
              label="release"
              sublabel={`${release.toFixed(2)}s`}
              onChange={setRelease}
            />
            <PortSection>
              {mkPort({ id: "adsr-gate-in", label: "gate in", type: "input" })}
              {mkPort({ id: "adsr-env-out", label: "env out", type: "output" })}
            </PortSection>
          </ModuleFrontPanel>

          {/* ── LFO ──────────────────────────────────────────────── */}
          <ModuleFrontPanel title="lfo" width={95}>
            <Knob
              value={lfoRate}
              min={0.01}
              max={20}
              label="rate"
              sublabel={`${lfoRate.toFixed(1)} Hz`}
              onChange={setLfoRate}
            />
            <Knob
              value={lfoDepth}
              min={0}
              max={800}
              label="depth"
              sublabel={`${Math.round(lfoDepth)}`}
              onChange={setLfoDepth}
            />
            <PortSection>
              {mkPort({ id: "lfo-out", label: "out", type: "output" })}
            </PortSection>
          </ModuleFrontPanel>

          {/* ── OSC ──────────────────────────────────────────────── */}
          <ModuleFrontPanel title="osc" width={110}>
            <Knob
              value={oscFreq}
              min={20}
              max={2000}
              label="freq"
              sublabel={`${Math.round(oscFreq)} Hz`}
              onChange={setOscFreq}
            />
            <Knob
              value={oscWaveIdx}
              min={0}
              max={3}
              label="wave"
              sublabel={WAVEFORMS[Math.round(oscWaveIdx)]}
              onChange={(v) => setOscWaveIdx(Math.round(v))}
            />
            <PortSection>
              {mkPort({ id: "osc-voct-in", label: "v/oct in", type: "input" })}
              {mkPort({ id: "osc-fm-in", label: "fm in", type: "input" })}
              {mkPort({ id: "osc-out", label: "out", type: "output" })}
            </PortSection>
          </ModuleFrontPanel>

          {/* ── FILTER ───────────────────────────────────────────── */}
          <ModuleFrontPanel title="filter" width={120}>
            <div className="flex gap-1">
              {(["lowpass", "bandpass", "highpass"] as BiquadFilterType[]).map(
                (t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "7px",
                      textTransform: "uppercase",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      cursor: "pointer",
                      background: filterType === t ? "#2a1f00" : "#080808",
                      color: filterType === t ? "#f5a623" : "#4a4440",
                      border:
                        filterType === t
                          ? "1px solid #5a3800"
                          : "1px solid #1a1a1a",
                    }}
                  >
                    {t === "lowpass" ? "LP" : t === "bandpass" ? "BP" : "HP"}
                  </button>
                )
              )}
            </div>
            <Knob
              value={filterCutoff}
              min={20}
              max={18000}
              label="cutoff"
              sublabel={`${Math.round(filterCutoff)} Hz`}
              onChange={setFilterCutoff}
            />
            <Knob
              value={filterRes}
              min={0.1}
              max={20}
              label="res"
              sublabel={filterRes.toFixed(1)}
              onChange={setFilterRes}
            />
            <PortSection>
              {mkPort({
                id: "filter-audio-in",
                label: "audio in",
                type: "input",
              })}
              {mkPort({ id: "filter-cv-in", label: "cv in", type: "input" })}
              {mkPort({
                id: "filter-audio-out",
                label: "audio out",
                type: "output",
              })}
            </PortSection>
          </ModuleFrontPanel>

          {/* ── VCA ──────────────────────────────────────────────── */}
          <ModuleFrontPanel title="vca" width={110}>
            <Knob
              value={vcaLevel}
              min={0}
              max={1}
              label="level"
              sublabel={`${Math.round(vcaLevel * 100)}%`}
              onChange={setVcaLevel}
            />
            <canvas
              ref={waveRef}
              width={90}
              height={28}
              className="rounded"
              style={{ background: "#050505", border: "1px solid #1e1a14" }}
            />
            <PortSection>
              {mkPort({ id: "vca-cv-in", label: "cv in", type: "input" })}
              {mkPort({ id: "vca-audio-in", label: "audio in", type: "input" })}
              {mkPort({ id: "vca-out", label: "out", type: "output" })}
            </PortSection>
          </ModuleFrontPanel>

          {/* ── REVERB ───────────────────────────────────────────── */}
          <ModuleFrontPanel title="reverb" width={110}>
            <Knob
              value={reverbSize}
              min={0.01}
              max={1}
              label="size"
              sublabel={`${Math.round(reverbSize * 100)}%`}
              onChange={setReverbSize}
            />
            <Knob
              value={reverbMix}
              min={0}
              max={1}
              label="mix"
              sublabel={`${Math.round(reverbMix * 100)}%`}
              onChange={setReverbMix}
            />
            <PortSection>
              {mkPort({
                id: "reverb-audio-in",
                label: "audio in",
                type: "input",
              })}
              {mkPort({
                id: "reverb-audio-out",
                label: "audio out",
                type: "output",
              })}
            </PortSection>
          </ModuleFrontPanel>

          {/* ── DELAY ────────────────────────────────────────────── */}
          <ModuleFrontPanel title="delay" width={135}>
            <div className="flex gap-1 w-full px-2">
              <button
                onClick={() => setPingPong(false)}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "7px",
                  textTransform: "uppercase",
                  padding: "2px 8px",
                  borderRadius: "3px",
                  cursor: "pointer",
                  flex: 1,
                  background: !pingPong ? "#1c1000" : "#080808",
                  color: !pingPong ? "#f5a623" : "#4a4440",
                  border: !pingPong ? "1px solid #5a3800" : "1px solid #1a1a1a",
                }}
              >
                basic
              </button>
              <button
                onClick={() => setPingPong(true)}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "7px",
                  textTransform: "uppercase",
                  padding: "2px 8px",
                  borderRadius: "3px",
                  cursor: "pointer",
                  flex: 1,
                  background: pingPong ? "#1c1000" : "#080808",
                  color: pingPong ? "#f5a623" : "#4a4440",
                  border: pingPong ? "1px solid #5a3800" : "1px solid #1a1a1a",
                }}
              >
                ping pong
              </button>
            </div>
            {pingPong && (
              <div className="flex flex-col gap-1 w-full px-2">
                <span style={labelStyle}>division</span>
                <div className="flex flex-wrap gap-0.5">
                  {([1, 2, 3, 4, 6, 8, 16] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setPpDivision(d)}
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "8px",
                        padding: "2px 5px",
                        borderRadius: "3px",
                        cursor: "pointer",
                        background: ppDivision === d ? "#1c1000" : "#080808",
                        color: ppDivision === d ? "#f5a623" : "#4a4440",
                        border:
                          ppDivision === d
                            ? "1px solid #5a3800"
                            : "1px solid #1a1a1a",
                      }}
                    >
                      1/{d}
                    </button>
                  ))}
                </div>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "8px",
                    color: "#6a5030",
                  }}
                >
                  {(ppDelayTime * 1000).toFixed(0)}ms @ {Math.round(bpm)} bpm
                </span>
              </div>
            )}
            {!pingPong &&
              (linked("delay-clock-in", "clock-out") ? (
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "8px",
                    color: "#6a5030",
                  }}
                >
                  {(60000 / bpm).toFixed(0)}ms @ {Math.round(bpm)} bpm
                </span>
              ) : (
                <Knob
                  value={delayTime}
                  min={0.01}
                  max={2}
                  label="time"
                  sublabel={`${delayTime.toFixed(2)}s`}
                  onChange={setDelayTime}
                />
              ))}
            <Knob
              value={delayFb}
              min={0}
              max={0.95}
              label="feedback"
              sublabel={`${Math.round(delayFb * 100)}%`}
              onChange={setDelayFb}
            />
            <Knob
              value={delayMix}
              min={0}
              max={1}
              label="mix"
              sublabel={`${Math.round(delayMix * 100)}%`}
              onChange={setDelayMix}
            />
            <PortSection>
              {mkPort({ id: "delay-clock-in", label: "clk in", type: "input" })}
              {mkPort({
                id: "delay-audio-in",
                label: "audio in",
                type: "input",
              })}
              {mkPort({
                id: "delay-audio-out",
                label: "audio out",
                type: "output",
              })}
            </PortSection>
          </ModuleFrontPanel>

          {/* ── OUTPUT ───────────────────────────────────────────── */}
          <ModuleFrontPanel title="out" width={80}>
            <div
              className="w-2.5 h-2.5 rounded-full transition-all duration-150"
              style={{
                background: connectedPorts.has("out-in")
                  ? "#f5a623"
                  : "#1a0e00",
                boxShadow: connectedPorts.has("out-in")
                  ? "0 0 8px #f5a62388"
                  : "none",
                border: "1px solid #2a1a00",
              }}
            />
            <Knob
              value={masterVol}
              min={0}
              max={1}
              label="vol"
              sublabel={`${Math.round(masterVol * 100)}%`}
              onChange={setMasterVol}
            />
            <PortSection>
              {mkPort({ id: "out-in", label: "in", type: "input" })}
            </PortSection>
          </ModuleFrontPanel>
        </div>
      </div>

      {/* Status + controls */}
      <div
        className="flex flex-col items-center w-full"
        style={{
          maxWidth: "fit-content",
          marginTop: "24px",
        }}
      >
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "0.05em",
            color: dragging
              ? "#f5a623"
              : cables.length > 0
              ? "#c8b890"
              : "#2e2e2e",
          }}
        >
          {dragging
            ? "click destination port to connect"
            : cables.length === 0
            ? "patch a cable to start"
            : `${cables.length} cable${cables.length !== 1 ? "s" : ""} patched`}
        </span>
        <div className="flex gap-2" style={{ marginTop: "16px" }}>
          <button
            onClick={() => {
              setCables([])
              syncGraph([])
              setDragging(null)
            }}
            onMouseEnter={() => setBtnHover("clear")}
            onMouseLeave={() => {
              setBtnHover(null)
              setBtnPress(null)
            }}
            onMouseDown={() => setBtnPress("clear")}
            onMouseUp={() => setBtnPress(null)}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              background:
                btnPress === "clear"
                  ? "#f5a623"
                  : btnHover === "clear"
                  ? "#2a1f00"
                  : "#0a0a0a",
              color:
                btnPress === "clear"
                  ? "#000"
                  : btnHover === "clear"
                  ? "#c8a060"
                  : "#4a4440",
              border:
                btnPress === "clear"
                  ? "1px solid #f5a623"
                  : btnHover === "clear"
                  ? "1px solid #5a3800"
                  : "1px solid #1a1a1a",
              transition: "background 0.1s, color 0.1s, border-color 0.1s",
            }}
          >
            clear all
          </button>
          <button
            onClick={doAutoPatch}
            onMouseEnter={() => setBtnHover("patch")}
            onMouseLeave={() => {
              setBtnHover(null)
              setBtnPress(null)
            }}
            onMouseDown={() => setBtnPress("patch")}
            onMouseUp={() => setBtnPress(null)}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              background:
                btnPress === "patch"
                  ? "#f5a623"
                  : btnHover === "patch"
                  ? "#2a1f00"
                  : "#0a0a0a",
              color:
                btnPress === "patch"
                  ? "#000"
                  : btnHover === "patch"
                  ? "#c8a060"
                  : "#6e6860",
              border:
                btnPress === "patch"
                  ? "1px solid #f5a623"
                  : btnHover === "patch"
                  ? "1px solid #5a3800"
                  : "1px solid #2a2018",
              transition: "background 0.1s, color 0.1s, border-color 0.1s",
            }}
          >
            auto patch
          </button>
        </div>
      </div>
    </div>
  )
}

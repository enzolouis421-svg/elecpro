// Assistant IA flottant — Groq avec actions directes et contexte complet
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, X, Send, RefreshCw, Mic, MicOff, BarChart2, ArrowRight, ChevronRight } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import {
  callGroq, buildContext, buildSystemPrompt, parseAction,
  promptAnalyseActivite, getQuickSuggestions,
} from '../../lib/groq'
import toast from 'react-hot-toast'

const hasSpeechRecognition = typeof window !== 'undefined' &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition)

// Rendu markdown minimaliste (gras, bullet points)
function renderMarkdown(text) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Bullet point
    if (line.match(/^[-•*]\s/)) {
      const content = line.replace(/^[-•*]\s/, '')
      return (
        <div key={i} className="flex gap-2 items-start">
          <span className="text-amber-400 mt-0.5 flex-shrink-0">•</span>
          <span dangerouslySetInnerHTML={{ __html: formatInline(content) }} />
        </div>
      )
    }
    if (line.trim() === '') return <div key={i} className="h-1" />
    return <p key={i} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
  })
}

function formatInline(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code class="bg-slate-600 px-1 rounded text-xs">$1</code>')
}

export default function AIAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceCountdown, setVoiceCountdown] = useState(null)

  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)
  const sendTimerRef = useRef(null)
  const countdownRef = useRef(null)
  const inputRef = useRef(null)

  const location = useLocation()
  const navigate = useNavigate()
  const {
    settings, clients, devis, factures, chantiers, getKpis,
    interventions, tresorerie, addIntervention,
  } = useApp()

  const kpis = getKpis()
  const context = buildContext({ clients, devis, factures, chantiers, kpis, interventions, tresorerie })
  const suggestions = getQuickSuggestions(location.pathname)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Réinitialise la conversation au changement de page
  useEffect(() => {
    setMessages([])
    stopListening()
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => stopListening()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── RECONNAISSANCE VOCALE ────────────────────────────
  function startListening() {
    if (!hasSpeechRecognition) return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recog = new SpeechRecognition()
    recog.lang = 'fr-FR'
    recog.continuous = true
    recog.interimResults = true

    recog.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('')
      setInput(transcript)

      if (e.results[e.results.length - 1].isFinal) {
        clearTimeout(sendTimerRef.current)
        clearInterval(countdownRef.current)
        let seconds = 3
        setVoiceCountdown(seconds)
        countdownRef.current = setInterval(() => {
          seconds -= 1
          setVoiceCountdown(seconds)
          if (seconds <= 0) clearInterval(countdownRef.current)
        }, 1000)
        sendTimerRef.current = setTimeout(() => {
          stopListening()
          sendMessage(transcript)
        }, 3000)
      }
    }

    recog.onerror = () => { setIsListening(false); setVoiceCountdown(null) }
    recog.onend = () => { setIsListening(false); setVoiceCountdown(null) }

    recognitionRef.current = recog
    recog.start()
    setIsListening(true)
  }

  function stopListening() {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    clearTimeout(sendTimerRef.current)
    clearInterval(countdownRef.current)
    setIsListening(false)
    setVoiceCountdown(null)
  }

  function toggleListening() {
    isListening ? stopListening() : startListening()
  }

  // ── ENVOI MESSAGE ────────────────────────────────────
  async function sendMessage(text) {
    const msg = (typeof text === 'string' ? text : input).trim()
    if (!msg || loading) return
    setInput('')
    stopListening()

    const apiKey = settings?.ia?.groq_key
    if (!apiKey) {
      setMessages(prev => [...prev,
        { role: 'user', content: msg },
        { role: 'assistant', content: '⚠️ Clé API Groq non configurée.\nAllez dans **Paramètres → IA** pour saisir votre clé Groq (gratuite sur console.groq.com).' },
      ])
      return
    }

    const newMessages = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const systemContent = buildSystemPrompt(location.pathname, context)
      const reply = await callGroq(
        [{ role: 'system', content: systemContent }, ...newMessages],
        apiKey,
        settings?.ia?.modele,
      )
      const { text: cleanText, action } = parseAction(reply)
      setMessages(prev => [...prev, { role: 'assistant', content: cleanText, action }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Erreur : ${e.message}`,
      }])
    } finally {
      setLoading(false)
    }
  }

  // ── EXÉCUTER UNE ACTION ──────────────────────────────
  function handleAction(action) {
    if (!action) return

    // Action directe : créer une intervention dans le planning
    if (action.type === 'intervention') {
      const { type, label, ...data } = action
      addIntervention(data)
      toast.success(`"${data.titre}" ajouté au planning ✅`)
      setOpen(false)
      // Si on n'est pas sur le planning, proposer d'y aller
      if (!location.pathname.startsWith('/planning')) {
        setTimeout(() => navigate('/planning'), 500)
      }
      return
    }

    // Navigation vers une route (avec prefill optionnel)
    if (action.route) {
      navigate(action.route, { state: { prefill: action.prefill } })
      setOpen(false)
    }
  }

  // ── ANALYSER L'ACTIVITÉ ──────────────────────────────
  function handleAnalyse() {
    const prompt = promptAnalyseActivite(kpis, clients, devis, factures)
    sendMessage(prompt)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── RENDER ───────────────────────────────────────────
  return (
    <>
      {/* Bouton flottant */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 w-12 h-12 bg-amber-500 hover:bg-amber-400 rounded-full shadow-2xl flex items-center justify-center z-50 text-black"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open
            ? <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X size={20} /></motion.span>
            : <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Zap size={20} /></motion.span>
          }
        </AnimatePresence>
      </motion.button>

      {/* Panel chat */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-36 md:bottom-24 right-2 left-2 md:left-auto md:right-6 md:w-[400px] bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 flex flex-col"
            style={{ maxHeight: '72vh' }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700 flex-shrink-0">
              <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap size={14} className="text-black" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold">Assistant IA</p>
                <p className="text-slate-500 text-xs truncate">
                  {isListening
                    ? voiceCountdown != null ? `Envoi dans ${voiceCountdown}s…` : 'En écoute…'
                    : 'Propulsé par Groq · Llama 3.3'}
                </p>
              </div>
              <button
                onClick={() => setMessages([])}
                className="ml-auto text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
                title="Effacer la conversation"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.length === 0 && (
                <div className="flex flex-col gap-3">
                  {/* Bouton analyse rapide */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAnalyse}
                    disabled={loading}
                    className="flex items-center gap-2 w-full px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <BarChart2 size={15} className="flex-shrink-0" />
                    <span>Analyser mon activité</span>
                    <ArrowRight size={13} className="ml-auto" />
                  </motion.button>

                  {/* Suggestions contextuelles par page */}
                  <div className="space-y-1.5">
                    {suggestions.map((s, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        whileHover={{ x: 3 }}
                        onClick={() => sendMessage(s)}
                        disabled={loading}
                        className="flex items-center gap-2 w-full px-3 py-2 text-left text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-xl text-xs transition-colors disabled:opacity-50"
                      >
                        <ChevronRight size={12} className="text-amber-500/60 flex-shrink-0" />
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`max-w-[90%] px-3 py-2.5 rounded-xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-amber-500 text-black font-medium'
                      : 'bg-slate-700 text-white space-y-1'
                  }`}>
                    {m.role === 'assistant'
                      ? <div className="space-y-0.5">{renderMarkdown(m.content)}</div>
                      : m.content
                    }
                  </div>

                  {/* Bouton d'action */}
                  {m.action && (
                    <motion.button
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAction(m.action)}
                      className={`mt-2 flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-colors ${
                        m.action.type === 'intervention'
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                          : 'bg-amber-500 hover:bg-amber-400 text-black'
                      }`}
                    >
                      <ArrowRight size={13} />
                      {m.action.label}
                      {m.action.type === 'intervention' && (
                        <span className="ml-1 opacity-80">→ Planning</span>
                      )}
                    </motion.button>
                  )}
                </motion.div>
              ))}

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-slate-700 px-3 py-2 rounded-xl">
                    <div className="flex gap-1 items-center">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 bg-amber-500 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Indicateur écoute vocale */}
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-1 overflow-hidden flex-shrink-0"
                >
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-1.5">
                    <motion.div
                      className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <p className="text-red-400 text-xs">
                      {voiceCountdown != null
                        ? `Envoi dans ${voiceCountdown}s — continuez à parler pour annuler`
                        : 'En écoute… parlez maintenant'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Saisie */}
            <div className="p-3 border-t border-slate-700 flex gap-2 flex-shrink-0">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? 'Parlez…' : 'Votre question…'}
                disabled={loading}
                className="flex-1 bg-slate-900 border border-slate-600 rounded-xl text-white text-sm px-3 py-2 focus:border-amber-500 focus:outline-none placeholder-slate-500 disabled:opacity-50 min-w-0"
              />
              {hasSpeechRecognition && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleListening}
                  title={isListening ? "Arrêter l'écoute" : 'Parler'}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 transition-colors ${
                    isListening
                      ? 'bg-red-500 hover:bg-red-400 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-9 h-9 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 rounded-xl flex items-center justify-center text-black flex-shrink-0"
              >
                <Send size={15} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

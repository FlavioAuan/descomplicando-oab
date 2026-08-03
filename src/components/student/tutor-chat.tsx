'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, Loader2, Bot, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { User } from '@/types'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface TutorChatProps {
  user: User
  subjects: Array<{ id: string; name: string }>
}

export function TutorChat({ user, subjects }: TutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Olá, ${user.name.split(' ')[0]}! 👋 Sou seu tutor jurídico especializado na OAB.\n\nPosso te ajudar com:\n- Explicações de artigos e leis\n- Questões de exames anteriores\n- Conceitos jurídicos complexos\n- Jurisprudência do STF e STJ\n- Dúvidas sobre qualquer disciplina\n\nSobre qual tema você quer estudar hoje?`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    // Add empty assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          subjectId: selectedSubject || undefined,
          conversationHistory: messages.slice(-8),
          stream: true,
        }),
      })

      if (!response.ok) throw new Error('Request failed')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No stream')

      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        fullResponse += chunk

        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: fullResponse,
          }
          return updated
        })
      }
    } catch (error) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro. Tente novamente.',
        }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function clearChat() {
    setMessages([{
      role: 'assistant',
      content: 'Conversa reiniciada. Como posso ajudá-lo?',
    }])
  }

  return (
    <Card className="h-full flex flex-col">
      {/* Controls */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Bot className="w-5 h-5 text-blue-600" />
        <span className="font-medium text-gray-700">Tutor IA</span>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-48 h-8 text-sm">
            <SelectValue placeholder="Todas as disciplinas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas as disciplinas</SelectItem>
            {subjects.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={clearChat} className="ml-auto">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5">
                  <AvatarFallback className="bg-blue-600 text-white text-xs">IA</AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <ReactMarkdown
                    className="prose prose-sm max-w-none"
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      code: ({ children }) => (
                        <code className="bg-gray-200 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
                      ),
                    }}
                  >
                    {msg.content || '▌'}
                  </ReactMarkdown>
                ) : (
                  <span>{msg.content}</span>
                )}
              </div>
              {msg.role === 'user' && (
                <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5">
                  <AvatarFallback className="bg-gray-600 text-white text-xs">
                    {user.name[0]}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Faça sua dúvida jurídica... (Enter para enviar)"
            className="resize-none min-h-[60px] max-h-[120px]"
            rows={2}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 px-4"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Respostas baseadas em legislação vigente e jurisprudência do STF/STJ
        </p>
      </div>
    </Card>
  )
}

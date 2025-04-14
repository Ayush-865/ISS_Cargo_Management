"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageSquare, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import './ChatBot.css'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export function ChatBot() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m your ISS Assistant. How can I help you today?' }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of messages whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (input.trim() === '') return
    
    // Add user message
    const userMessage: Message = { role: 'user', content: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    
    // Set loading state
    setIsLoading(true)
    
    try {
      // Call our API route which connects to Gemini
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
        }),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Add assistant message with the response
      const botMessage: Message = { 
        role: 'assistant', 
        content: data.response
      }
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error processing your request. Please try again later.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!open ? (
        // Chat Button
        <Button
          onClick={() => setOpen(true)}
          className="rounded-full w-14 h-14 p-0 flex items-center justify-center shadow-lg bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 ease-in-out"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      ) : (
        // Expanded Chat Interface
        <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-xl text-white w-[480px] h-[650px] flex flex-col chat-container animate-expand">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-blue-400 font-bold">ISS Assistant</h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-full hover:bg-gray-800"
            >
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
          
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  } markdown-content`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-lg p-3 bg-gray-800 text-gray-300">
                  Typing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Form */}
          <form onSubmit={handleSend} className="flex gap-2 p-4 border-t border-gray-800">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-gray-800 border-gray-700 text-white"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              disabled={isLoading || input.trim() === ''}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Send
            </Button>
          </form>
        </div>
      )}
    </div>
  )
} 
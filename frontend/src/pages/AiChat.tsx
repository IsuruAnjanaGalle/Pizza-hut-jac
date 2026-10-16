import React, { useState } from 'react';
import { Bot, Send, Sparkles, User, Layers, Server } from 'lucide-react';

export const AiChat: React.FC = () => {
  const [input, setInput] = useState('');

  const sampleMessages = [
    {
      sender: 'ai',
      text: "👋 Hey there! I'm your Pizza Hut AI concierge. I can recommend pizzas based on your taste, build customized crust combos, or check on your active orders. What are you craving today?",
      time: '18:55',
    },
    {
      sender: 'user',
      text: 'Do you have something spicy with extra cheese?',
      time: '18:56',
    },
    {
      sender: 'ai',
      text: "You'll love our **Spicy Chicken Pan Pizza** with triple mozzarella stuffed crust and pickled jalapeños! Would you like me to add it to your cart?",
      time: '18:56',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col h-[calc(100vh-5rem)]">
      {/* Developer Banner */}
      <div className="mb-6 p-4 rounded-xl border border-dashed border-red-500/40 bg-red-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-600/20 text-[#E31837]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Developer 3 Branch: Conversational AI Ordering</h2>
            <p className="text-xs text-zinc-400">
              Contract Node: <code className="text-red-300 font-mono">ChatSession</code> | Walker: <code className="text-red-300 font-mono">backend/walkers_chat.jac</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
          <Server className="w-3.5 h-3.5 text-emerald-400" />
          <span>Endpoint: /walker/chat_session</span>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-zinc-900/90 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden shadow-2xl">
        {/* Chat Header */}
        <div className="p-4 sm:px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/95">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E31837] to-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/30">
                <Bot className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Pizza Hut AI Assistant</h3>
                <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-semibold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Jaseci byLLM
                </span>
              </div>
              <p className="text-xs text-zinc-400">Session ID: <span className="font-mono text-zinc-300">sess_demo_001</span></p>
            </div>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {sampleMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-zinc-800 text-zinc-300'
                    : 'bg-[#E31837] text-white shadow-sm shadow-red-600/30'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#E31837] text-white rounded-tr-none'
                    : 'bg-zinc-800/90 text-zinc-200 border border-zinc-700/60 rounded-tl-none'
                }`}
              >
                <p>{msg.text}</p>
                <span
                  className={`block text-[10px] mt-1 font-mono ${
                    msg.sender === 'user' ? 'text-red-200' : 'text-zinc-500'
                  }`}
                >
                  {msg.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Suggested Quick Prompts */}
        <div className="px-4 sm:px-6 py-2 border-t border-zinc-800/60 bg-zinc-950/40 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] text-zinc-500 shrink-0">Try asking:</span>
          {[
            '🍕 Any 2-for-1 deals today?',
            '🌶️ Recommend a spicy vegetarian pizza',
            '📦 Where is order #PH-8942-X?',
          ].map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => setInput(prompt.replace(/^[^\s]+\s/, ''))}
              className="text-xs px-3 py-1 rounded-full bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors shrink-0 border border-zinc-700/50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/95">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setInput('');
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or customize your pizza order..."
              className="flex-1 px-4 py-3 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-[#E31837] text-white text-xs font-semibold hover:bg-red-700 transition-colors flex items-center gap-2 shadow-md shadow-red-600/20"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AiChat;

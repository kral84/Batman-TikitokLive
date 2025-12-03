'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface QuestionData {
  username: string
  nickname: string
  question: string
  questionId: string
  timestamp: string
}

interface QuestionPanelProps {
  questions: QuestionData[]
}

export default function QuestionPanel({ questions }: QuestionPanelProps) {
  return (
    <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6 h-[400px] flex flex-col">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-3 border-b-2 border-yellow-500 flex items-center gap-2">
        ❓ Sorular (Q&A)
      </h2>
      
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {questions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Sorular burada görünecek...</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {questions.map((q, index) => {
              // Unique key oluştur - index kullanma
              const uniqueKey = `${q.username}-${q.timestamp}-${q.questionId}`

              return (
                <motion.div
                  key={uniqueKey}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 border-l-4 border-yellow-500 hover:shadow-md transition-shadow"
                >
                <div className="flex items-start gap-3">
                  <div className="text-3xl flex-shrink-0">❓</div>
                  
                  <div className="flex-1">
                    <div className="font-bold text-yellow-700 mb-2">
                      {q.nickname}
                      <span className="text-xs text-gray-500 ml-2">@{q.username}</span>
                    </div>
                    <div className="text-gray-800 text-lg leading-relaxed mb-2">
                      "{q.question}"
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(q.timestamp).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

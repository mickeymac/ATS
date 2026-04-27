import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Card, CardHeader, CardBody, CardFooter, Input, ScrollShadow } from '@nextui-org/react';
import { MessageCircle, X, Send, User, ChevronUp } from 'lucide-react';
import { Logo } from './Logo';

// Dummy FAQ dataset
const faqs = [
  {
    question: "How do I create a new job?",
    keywords: ["create", "make", "post", "new", "job", "position"],
    answer: "You can create a new job by navigating to the Jobs page and clicking the 'Create Job' button at the top right corner."
  },
  {
    question: "How can I invite a recruiter?",
    keywords: ["invite", "add", "recruiter", "team", "colleague"],
    answer: "Go to the Users page, click 'Add User', and select 'Recruiter' as their role when sending the invitation."
  },
  {
    question: "Where do I review applications?",
    keywords: ["review", "candidates", "applications", "applicants", "view", "score"],
    answer: "Navigate to the Applications page to see all submissions, or go to the Review page to use the AI Smart Extractor for deep candidate analysis."
  },
  {
    question: "How do I update my profile?",
    keywords: ["update", "edit", "change", "profile", "password", "settings"],
    answer: "Click on your profile picture in the navigation bar, select 'Profile', and you can update your details there."
  },
  {
    question: "How does the AI Smart Extractor work?",
    keywords: ["ai", "smart", "extractor", "extraction", "how", "work", "resume", "parse"],
    answer: "The AI Smart Extractor uses large language models to automatically parse resumes, extract skills & experience, and score them against the job requirements."
  },
  {
    question: "What happens if I forget my password?",
    keywords: ["forget", "forgot", "password", "reset", "lost"],
    answer: "If you forget your password, click 'Forgot password?' on the login screen. We will send an OTP to your registered email to help you reset it securely."
  }
];

export default function ChatAssistant() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  // Suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const messagesEndRef = useRef(null);

  // Initialize with welcome message when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: Date.now(),
        sender: 'bot',
        text: "Hi there! I'm your digital assistant. You can ask me any frequently asked questions or select one below to get started.",
        timestamp: new Date()
      }]);
    }
  }, [isOpen, messages.length]);

  // Auto-scroll Down
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Handle ESC mapping to close the panel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Autosuggest logic
  useEffect(() => {
    if (inputValue.trim().length > 1) {
      const searchTerms = inputValue.toLowerCase().split(' ').filter(word => word.length > 2);
      
      const scoredSuggestions = faqs.map(faq => {
        let score = 0;
        // Direct question match
        if (faq.question.toLowerCase().includes(inputValue.toLowerCase())) score += 10;
        
        // Keyword overlap match
        searchTerms.forEach(term => {
          if (faq.keywords.some(kw => kw.toLowerCase().includes(term))) {
            score += 1;
          }
        });
        return { ...faq, score };
      }).filter(faq => faq.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);

      setSuggestions(scoredSuggestions);
      setActiveIndex(-1);
    } else {
      setSuggestions([]);
      setActiveIndex(-1);
    }
  }, [inputValue]);

  // Find best answer for user input
  const getBotResponse = (userInput) => {
    const words = userInput.toLowerCase().split(/[ \W]+/).filter(w => w.length >= 4);
    
    // Fallback if no robust words are given but question matches directly
    const directMatch = faqs.find(f => f.question.toLowerCase() === userInput.toLowerCase().trim());
    if (directMatch) return directMatch.answer;

    let bestMatch = null;
    let maxOverlap = 0;

    faqs.forEach(faq => {
      let overlap = 0;
      words.forEach(word => {
        if (faq.keywords.some(kw => kw.includes(word) || word.includes(kw))) {
          overlap++;
        }
      });
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestMatch = faq;
      }
    });

    if (maxOverlap > 0 && bestMatch) {
      return bestMatch.answer;
    }

    return "I'm not sure about that. Try asking in a different way or picking one of the suggested FAQs.";
  };

  const handleSendMessage = (textOverride = null) => {
    const textToSubmit = textOverride || inputValue.trim();
    if (!textToSubmit) return;

    // Clear input & suggestions
    setInputValue("");
    setSuggestions([]);
    
    // Add user message
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'user',
      text: textToSubmit,
      timestamp: new Date()
    }]);

    setIsTyping(true);

    // Simulate network delay for bot response
    setTimeout(() => {
      const answer = getBotResponse(textToSubmit);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: answer,
        timestamp: new Date()
      }]);
    }, 500);
  };

  const handleInputKeyDown = (e) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Tab' || (e.key === 'Enter' && activeIndex >= 0)) {
        e.preventDefault();
        const selected = suggestions[activeIndex]?.question || suggestions[0].question;
        setInputValue(selected);
        setSuggestions([]);
      }
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (location.pathname === '/' || location.pathname.startsWith('/chat')) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Panel */}
      {isOpen && (
        <Card className="mb-4 w-[380px] h-[550px] shadow-2xl border border-divider/50 rounded-2xl flex flex-col overflow-hidden animate-appearance-in">
          {/* Header */}
          <CardHeader className="flex px-4 py-4 justify-between bg-primary items-center shrink-0">
            <div className="flex gap-3 items-center text-primary-foreground">
              <div className="p-1.5 bg-primary-foreground/20 rounded-full">
                <Logo size={20} className="text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-semibold text-sm">Assistant</h3>
                <span className="text-xs text-primary-foreground/80">Typically replies instantly</span>
              </div>
            </div>
            <Button 
              isIconOnly 
              variant="light" 
              className="text-primary-foreground/80 hover:bg-primary-foreground/20 hover:text-primary-foreground" 
              onClick={() => setIsOpen(false)}
              size="sm"
            >
              <X size={20} />
            </Button>
          </CardHeader>

          {/* Body */}
          <CardBody className="p-0 overflow-hidden flex flex-col relative bg-content2/30">
            <ScrollShadow className="flex-1 p-4 overflow-y-auto">
              {/* Default FAQs / Welcome State */}
              {messages.length === 1 && (
                <div className="mb-6 space-y-2 animate-appearance-in">
                  <p className="text-xs font-semibold text-default-500 mb-3 px-2 uppercase tracking-wider">Frequently Asked Questions</p>
                  <div className="flex flex-wrap gap-2">
                    {faqs.map((faq, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(faq.question)}
                        className="text-left text-sm bg-background border border-divider/60 hover:bg-content2 hover:border-primary/50 text-default-700 rounded-xl px-3 py-2 transition-all"
                      >
                        {faq.question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages Array */}
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.sender === 'bot' && (
                      <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-2 mt-auto">
                        <Logo size={14} />
                      </div>
                    )}
                    
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm
                      ${msg.sender === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-br-sm' 
                        : 'bg-background border border-divider/50 text-default-800 rounded-bl-sm'}
                    `}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      <div className={`text-[10px] mt-1 text-right ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-default-400'}`}>
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>

                    {msg.sender === 'user' && (
                      <div className="bg-default-200 text-default-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ml-2 mt-auto">
                        <User size={14} />
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start items-end mt-4">
                    <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-2">
                      <Logo size={14} />
                    </div>
                    <div className="bg-background border border-divider/50 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollShadow>
            
            {/* Suggestions Overlay */}
            {suggestions.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-content1 border-t border-divider/50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] rounded-t-2xl max-h-[220px] overflow-y-auto animate-appearance-in z-20">
                <div className="p-2 flex flex-col gap-1">
                  <div className="text-xs text-default-400 px-2 py-1 flex justify-between">
                    <span>Suggestions</span>
                    <span className="flex gap-1 items-center">Use <ChevronUp size={12}/> <ChevronUp size={12} className="rotate-180"/> to navigate</span>
                  </div>
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      className={`text-left text-sm px-3 py-2 rounded-xl transition-colors
                        ${activeIndex === idx ? 'bg-primary/20 text-primary font-medium' : 'hover:bg-content2 text-default-700'}
                      `}
                      onClick={() => {
                        setInputValue(suggestion.question);
                        setSuggestions([]);
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                    >
                      {suggestion.question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardBody>

          {/* Footer Input */}
          <CardFooter className="px-3 py-3 bg-content1 border-t border-divider/50 shrink-0 relative z-30">
            <form 
              className="w-full flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
            >
              <Input
                placeholder="Ask me anything..."
                value={inputValue}
                onValueChange={setInputValue}
                onKeyDown={handleInputKeyDown}
                size="sm"
                radius="full"
                classNames={{
                  inputWrapper: "bg-content2 hover:bg-content3/80 shadow-inner px-4 h-10",
                  input: "text-default-700 text-sm"
                }}
              />
              <Button
                isIconOnly
                type="submit"
                color="primary"
                radius="full"
                size="sm"
                className="w-10 h-10 shrink-0 shadow-md"
                isDisabled={!inputValue.trim()}
              >
                <Send size={16} className={inputValue.trim() ? "translate-x-0.5" : ""} />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}

      {/* Floating Button */}
      <Button
        isIconOnly
        color="primary"
        className="w-14 h-14 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={26} /> : <MessageCircle size={26} />}
      </Button>
    </div>
  );
}

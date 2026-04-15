import React from 'react';
import { MessageSquare, Send, Search, User, Phone, Video, MoreVertical, Paperclip, Smile, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface MessagingScreenProps {
  onBack: () => void;
}

export default function MessagingScreen({ onBack }: MessagingScreenProps) {
  const contacts = [
    { id: '1', name: 'Dr. Sarah Miller', role: 'Biology Instructor', avatar: 'https://picsum.photos/seed/sarah/100', online: true },
    { id: '2', name: 'Prof. Helena Vance', role: 'Mathematics Head', avatar: 'https://picsum.photos/seed/helena/100', online: false },
    { id: '3', name: 'Admin Support', role: 'Institutional Help', avatar: 'https://picsum.photos/seed/admin/100', online: true },
  ];

  const [activeContact, setActiveContact] = React.useState(contacts[0]);
  const [message, setMessage] = React.useState('');
  const [chatMessages, setChatMessages] = React.useState([
    { 
      id: '1', 
      text: "Hello! I've reviewed your child's latest lab report. They are showing great progress in Biology – Cell Structure. Would you like to schedule a brief call to discuss Term 2 goals?", 
      sender: 'sarah', 
      time: '10:24 AM' 
    },
    { 
      id: '2', 
      text: "That sounds wonderful, Dr. Miller. I'm available this Thursday afternoon after 3 PM. Does that work for you?", 
      sender: 'me', 
      time: '10:45 AM' 
    }
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      text: message,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages([...chatMessages, newMessage]);
    setMessage('');
  };

  return (
    <div className="space-y-6 flex flex-col flex-1 min-h-[600px]">
      {/* Header */}
      <section className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-outline hover:text-white transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Back to Dashboard</span>
        </button>
      </section>

      <div className="flex-1 flex bg-surface-container-low rounded-2xl overflow-hidden border border-outline-variant/5">
        {/* Sidebar */}
        <aside className="w-80 border-r border-outline-variant/5 flex flex-col bg-surface-container-low/50">
          <div className="p-6 space-y-4">
            <h3 className="text-[10px] font-bold text-outline uppercase tracking-widest">Messages</h3>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search contacts..." 
                className="w-full bg-surface-container-high border border-outline-variant/10 rounded-full px-10 py-2.5 text-xs text-white outline-none focus:border-brand-green/40 transition-all"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" size={14} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.map((contact) => (
              <button 
                key={contact.id} 
                onClick={() => setActiveContact(contact)}
                className={`w-full p-4 flex items-center gap-4 hover:bg-surface-container-high transition-colors border-b border-outline-variant/5 group ${activeContact.id === contact.id ? 'bg-surface-container-high' : ''}`}
              >
                <div className="relative">
                  <img src={contact.avatar} alt={contact.name} className="w-10 h-10 rounded-xl object-cover" />
                  {contact.online && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-brand-green rounded-full border-2 border-surface-container-low"></div>}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-brand-green transition-colors">{contact.name}</h4>
                  <p className="text-[9px] text-outline font-medium uppercase tracking-wider truncate">{contact.role}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col">
          {/* Chat Header */}
          <header className="px-6 py-4 border-b border-outline-variant/5 flex justify-between items-center bg-surface-container-low/80">
            <div className="flex items-center gap-4">
              <img src={activeContact.avatar} alt={activeContact.name} className="w-10 h-10 rounded-xl object-cover" />
              <div>
                <h4 className="text-sm font-bold text-white">{activeContact.name}</h4>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${activeContact.online ? 'bg-brand-green' : 'bg-outline'}`} />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-outline">
                    {activeContact.online ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {[Phone, Video, MoreVertical].map((Icon, idx) => (
                <button 
                  key={idx}
                  className="p-2 text-outline hover:text-white transition-colors"
                >
                  <Icon size={18} />
                </button>
              ))}
            </div>
          </header>

          {/* Messages */}
          <div className="flex-1 p-8 overflow-y-auto space-y-8">
            <div className="flex justify-center">
              <span className="px-4 py-1 rounded-full bg-surface-container-high text-[9px] font-bold text-outline uppercase tracking-widest">Today</span>
            </div>
            
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 max-w-[80%] ${msg.sender === 'me' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`p-4 rounded-2xl ${msg.sender === 'me' ? 'bg-brand-green text-surface rounded-tr-none' : 'bg-surface-container-high text-white rounded-tl-none'}`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <span className={`text-[9px] mt-2 block font-medium ${msg.sender === 'me' ? 'text-surface/60' : 'text-outline'}`}>{msg.time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <footer className="p-6">
            <form 
              onSubmit={handleSend}
              className="bg-surface-container-high rounded-2xl px-6 py-2 flex items-center gap-4 border border-outline-variant/10 focus-within:border-brand-green/40 transition-all"
            >
              <button 
                type="button" 
                className="text-outline hover:text-white transition-colors"
              >
                <Paperclip size={20} />
              </button>
              <input 
                type="text" 
                placeholder="Type your message..." 
                className="flex-1 bg-transparent border-none outline-none text-sm text-white py-3"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button 
                type="submit"
                className="w-10 h-10 rounded-xl bg-brand-green flex items-center justify-center text-surface hover:opacity-90 active:scale-95 transition-all"
              >
                <Send size={18} />
              </button>
            </form>
          </footer>
        </main>
      </div>
    </div>
  );
}

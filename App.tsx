
import React, { useState, useRef, useEffect } from 'react';
import { 
  Stethoscope, Activity, Calculator, ShieldAlert, Pill, 
  Thermometer, Wind, Zap, ClipboardList, 
  GraduationCap, Library, Sparkles, 
  MessageSquare, Menu, Send, Camera, Mic, Volume2, 
  Heart, Droplets, Scale, Clock, AlertTriangle, Leaf, 
  Search, Settings, Trash2, Star, Share2,
  ChevronRight, PlayCircle, BookOpen, CheckCircle2, Languages,
  X, LogOut, Plus, ChevronLeft, LayoutGrid
} from 'lucide-react';
import { AppMode, Message, AppLanguage, UserProfile, VitalSigns, Course } from './types';
import { gemini } from './services/geminiService';
import { storageService } from './services/storageService';
import { decode, decodeAudioData } from './utils/audioUtils';

const PROFESSIONS = ['Estudante', 'Técnico', 'Enfermeiro', 'Outro'];
const COUNTRIES = [
  { id: 'BR', name: 'Brasil', code: '+55', flag: '🇧🇷' },
  { id: 'AO', name: 'Angola', code: '+244', flag: '🇦🇴' },
  { id: 'PT', name: 'Portugal', code: '+351', flag: '🇵🇹' },
  { id: 'MZ', name: 'Moçambique', code: '+258', flag: '🇲🇿' },
  { id: 'CV', name: 'Cabo Verde', code: '+238', flag: '🇨🇻' },
  { id: 'GW', name: 'Guiné-Bissau', code: '+245', flag: '🇬🇼' },
  { id: 'ST', name: 'São Tomé e Príncipe', code: '+239', flag: '🇸🇹' },
];

const LANGUAGES: { id: AppLanguage, name: string, flag: string }[] = [
  { id: 'pt-BR', name: 'Português', flag: '🇧🇷' },
  { id: 'en', name: 'English', flag: '🇺🇸' },
  { id: 'es', name: 'Español', flag: '🇪🇸' },
  { id: 'fr', name: 'Français', flag: '🇫🇷' }
];

const COURSES: Course[] = [
  { id: 'enf-1', title: 'Fundamentos de Enfermagem', category: 'Nursing', description: 'Técnicas básicas e ética profissional.', icon: 'ClipboardList' },
  { id: 'med-1', title: 'Farmacologia Clínica', category: 'General Medicine', description: 'Interações e administração de fármacos.', icon: 'Pill' },
  { id: 'phy-1', title: 'Fitoterapia Aplicada', category: 'Natural Medicine', description: 'Uso terapêutico e contraindicações.', icon: 'Leaf' },
];

const App: React.FC = () => {
  const [activePhone, setActivePhone] = useState<string | null>(() => localStorage.getItem('active_user_phone'));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  const [language, setLanguage] = useState<AppLanguage>('pt-BR');
  
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [profession, setProfession] = useState<any>('Estudante');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isToolboxOpen, setIsToolboxOpen] = useState(window.innerWidth > 1024);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);

  const [vitals, setVitals] = useState<VitalSigns>({
    bpSistolic: 120, bpDiastolic: 80, heartRate: 75, respRate: 16, temp: 36.5, spo2: 98, timestamp: new Date()
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activePhone) {
      const data = storageService.getUserData(activePhone);
      if (data) {
        setUser(data.profile);
        setChatHistory(data.sessions || []);
        setIsStarted(true);
      }
    }
  }, [activePhone]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, mode]);

  const handleLogin = () => {
    if (!phoneInput || !nameInput) return;
    const fullPhone = `${selectedCountry.code}${phoneInput.replace(/\D/g, '')}`;
    const newUser: UserProfile = { 
      name: nameInput, 
      phone: fullPhone, 
      countryCode: selectedCountry.code, 
      country: selectedCountry.name,
      profession 
    };
    setUser(newUser);
    setActivePhone(fullPhone);
    localStorage.setItem('active_user_phone', fullPhone);
    storageService.syncUser(fullPhone, newUser, [], { level: 'intermediário', lang: language });
    setIsStarted(true);
  };

  const handleSend = async (customText?: string, isDeepDive = false) => {
    const text = customText || input;
    if (!text || isLoading || !user) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMsg]);
    setInput('');
    setIsPlusMenuOpen(false);
    setIsLoading(true);
    setMode(AppMode.CHAT);

    try {
      const resp = await gemini.generateContent(text, user.name, user.profession, language, isDeepDive);
      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: resp.text, 
        timestamp: new Date(),
        canDeepDive: !isDeepDive
      };
      const newHistory = [...chatHistory, userMsg, aiMsg];
      setChatHistory(newHistory);
      if (activePhone) storageService.syncUser(activePhone, user, newHistory, { level: 'intermediário', lang: language });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const playSpeech = async (text: string) => {
    try {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const base64 = await gemini.textToSpeech(text, language);
      const buffer = await decodeAudioData(decode(base64), audioContextRef.current, 24000, 1);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch (e) { console.error("TTS Error:", e); }
  };

  if (!isStarted || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-teal-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl mb-6 animate-bounce">
          <Stethoscope size={40} />
        </div>
        <h1 className="text-3xl font-black text-slate-800 mb-1">EnfermaFit Pro</h1>
        <p className="text-slate-500 mb-8 text-sm font-medium">Assistente Global de Enfermagem</p>
        
        <div className="w-full max-w-md bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-4">
          <div className="flex justify-center gap-2 mb-2">
             {LANGUAGES.map(l => (
               <button key={l.id} onClick={() => setLanguage(l.id)} 
                className={`w-9 h-9 rounded-full flex items-center justify-center text-lg border-2 transition-all ${language === l.id ? 'border-teal-500 bg-teal-50 scale-110' : 'border-transparent opacity-60'}`}>
                {l.flag}
               </button>
             ))}
          </div>

          <div className="space-y-3">
            <input type="text" placeholder="Seu Nome" value={nameInput} onChange={e => setNameInput(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-teal-500 rounded-xl outline-none font-bold text-sm" />
            
            <div className="flex gap-2">
              <select 
                value={selectedCountry.id} 
                onChange={e => setSelectedCountry(COUNTRIES.find(c => c.id === e.target.value)!)}
                className="w-28 px-2 py-4 bg-slate-50 border-2 border-transparent focus:border-teal-500 rounded-xl outline-none font-bold text-xs"
              >
                {COUNTRIES.map(c => <option key={c.id} value={c.id}>{c.flag} {c.code}</option>)}
              </select>
              <input type="tel" placeholder="Telefone" value={phoneInput} onChange={e => setPhoneInput(e.target.value)}
                className="flex-1 px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-teal-500 rounded-xl outline-none font-bold text-sm" />
            </div>
            
            <select value={profession} onChange={e => setProfession(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-teal-500 rounded-xl outline-none font-bold text-xs text-slate-700">
              {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <button onClick={handleLogin} className="w-full py-5 bg-teal-600 text-white font-black rounded-xl shadow-lg hover:bg-teal-700 transition-all flex items-center justify-center gap-2">
            ACESSAR SISTEMA <ChevronRight size={18}/>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar Histórico (Esquerda) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center shadow-lg"><Stethoscope size={18} /></div>
          <h1 className="font-black text-base tracking-tighter">EnfermaFit</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden ml-auto p-1.5 text-white/40"><X size={16}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <p className="px-2 mb-2 text-[10px] font-black text-white/30 uppercase tracking-widest">Recentes</p>
            {chatHistory.filter(m => m.role === 'user').slice(-6).reverse().map(m => (
              <button key={m.id} onClick={() => setMode(AppMode.CHAT)} className="w-full text-left px-3 py-2 rounded-lg text-xs text-white/50 hover:bg-white/5 hover:text-white truncate transition-all">
                {m.content}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-white/5 border-t border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center font-bold text-white text-xs">{user.name[0]}</div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-xs truncate">{user.name}</p>
            <p className="text-[9px] text-white/30 font-bold uppercase">{user.profession}</p>
          </div>
          <button onClick={() => { localStorage.removeItem('active_user_phone'); window.location.reload(); }} className="text-white/20 hover:text-red-400"><LogOut size={16}/></button>
        </div>
      </aside>

      {/* Área Principal do Chat */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-slate-50 rounded-lg text-slate-500"><Menu size={18}/></button>
            <h2 className="font-black text-xs text-slate-800 uppercase tracking-widest flex items-center gap-2">
               <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
               {mode === AppMode.CHAT ? 'Consultoria IA' : mode}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsToolboxOpen(!isToolboxOpen)} className={`p-2 rounded-lg transition-all ${isToolboxOpen ? 'bg-teal-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
              <LayoutGrid size={18}/>
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col relative bg-slate-50/30">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-28 scroll-smooth">
              {mode === AppMode.CHAT ? (
                <div className="max-w-3xl mx-auto w-full space-y-6">
                  {chatHistory.length === 0 && (
                    <div className="py-20 text-center animate-in zoom-in-95 duration-700">
                      <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner"><Sparkles size={32}/></div>
                      <h3 className="text-xl font-black text-slate-800 mb-2">Olá, {user.name}! 😊</h3>
                      <p className="text-slate-400 text-sm font-medium max-w-xs mx-auto">Em que posso auxiliar sua jornada de enfermagem hoje?</p>
                    </div>
                  )}
                  {chatHistory.map((msg) => (
                    <MessageBubble key={msg.id} {...msg} onPlay={() => playSpeech(msg.content)} onDeepDive={() => handleSend(msg.content, true)} />
                  ))}
                  {isLoading && (
                    <div className="flex gap-1.5 p-4 bg-white border border-slate-100 rounded-2xl w-max animate-pulse">
                      <div className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce delay-75"></div>
                      <div className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce delay-150"></div>
                    </div>
                  )}
                </div>
              ) : mode === AppMode.EMERGENCY ? (
                <EmergencyView onBack={() => setMode(AppMode.CHAT)} />
              ) : mode === AppMode.CALCULATOR ? (
                <CalculatorView onBack={() => setMode(AppMode.CHAT)} />
              ) : mode === AppMode.MONITOR ? (
                <VitalsMonitor vitals={vitals} onBack={() => setMode(AppMode.CHAT)} />
              ) : mode === AppMode.PHYTOTHERAPY ? (
                <PhytoView onBack={() => setMode(AppMode.CHAT)} />
              ) : mode === AppMode.LIBRARY ? (
                <LibraryView onBack={() => setMode(AppMode.CHAT)} onSelect={(t) => handleSend(t)} />
              ) : null}
            </div>

            {/* Input Área */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-30">
              <div className="relative">
                {isPlusMenuOpen && (
                  <div className="absolute bottom-20 left-0 bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 grid grid-cols-3 gap-3 animate-in slide-in-from-bottom-4 duration-200 w-full ring-1 ring-slate-900/5">
                    <QuickMenuBtn icon={<ShieldAlert size={18}/>} label="Emergência" color="text-red-600 bg-red-50" onClick={() => { setMode(AppMode.EMERGENCY); setIsPlusMenuOpen(false); }} />
                    <QuickMenuBtn icon={<Calculator size={18}/>} label="Cálculos" color="text-blue-600 bg-blue-50" onClick={() => { setMode(AppMode.CALCULATOR); setIsPlusMenuOpen(false); }} />
                    <QuickMenuBtn icon={<Leaf size={18}/>} label="Fitoterapia" color="text-emerald-600 bg-emerald-50" onClick={() => { setMode(AppMode.PHYTOTHERAPY); setIsPlusMenuOpen(false); }} />
                    <QuickMenuBtn icon={<Activity size={18}/>} label="Sinais Vitais" color="text-teal-600 bg-teal-50" onClick={() => { setMode(AppMode.MONITOR); setIsPlusMenuOpen(false); }} />
                    <QuickMenuBtn icon={<GraduationCap size={18}/>} label="Biblioteca" color="text-indigo-600 bg-indigo-50" onClick={() => { setMode(AppMode.LIBRARY); setIsPlusMenuOpen(false); }} />
                    <QuickMenuBtn icon={<Camera size={18}/>} label="Escanear" color="text-slate-400 bg-slate-50" onClick={() => setIsPlusMenuOpen(false)} />
                  </div>
                )}
                <div className="bg-white rounded-[1.75rem] border border-slate-200 shadow-xl flex items-center p-1.5 ring-4 ring-slate-900/5">
                  <button onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)} className={`p-3 rounded-full transition-all ${isPlusMenuOpen ? 'bg-slate-900 text-white rotate-45' : 'bg-slate-50 text-slate-400 hover:text-teal-600'}`}>
                    <Plus size={20}/>
                  </button>
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Pergunte sobre procedimentos, medicamentos..." className="flex-1 bg-transparent px-3 py-3 outline-none font-bold text-sm text-slate-700 placeholder:text-slate-300" />
                  <button onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="p-3 bg-teal-600 text-white rounded-2xl shadow-lg disabled:opacity-30 transition-all hover:scale-105">
                    {isLoading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Send size={18}/>}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Ferramentas Direita (Desktop) */}
          <aside className={`w-72 border-l border-slate-100 bg-white p-6 overflow-y-auto transition-all duration-300 hidden lg:block ${isToolboxOpen ? 'translate-x-0' : 'translate-x-full w-0 p-0 border-none'}`}>
             <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Painel de Suporte</h3>
                <ToolCard title="Emergência RCP" icon={<ShieldAlert size={18}/>} color="bg-red-50 text-red-600" onClick={() => setMode(AppMode.EMERGENCY)} />
                <ToolCard title="Guia Fitoterápico" icon={<Leaf size={18}/>} color="bg-emerald-50 text-emerald-600" onClick={() => setMode(AppMode.PHYTOTHERAPY)} />
                <ToolCard title="Gotejamento" icon={<Droplets size={18}/>} color="bg-blue-50 text-blue-600" onClick={() => setMode(AppMode.CALCULATOR)} />
                <ToolCard title="Sinais Vitais" icon={<Activity size={18}/>} color="bg-teal-50 text-teal-600" onClick={() => setMode(AppMode.MONITOR)} />
                <ToolCard title="Cursos Pro" icon={<GraduationCap size={18}/>} color="bg-indigo-50 text-indigo-600" onClick={() => setMode(AppMode.LIBRARY)} />
                
                <div className="pt-6 border-t border-slate-50 mt-4">
                  <div className="bg-slate-900 rounded-2xl p-4 text-white relative overflow-hidden group">
                     <p className="text-[8px] font-black uppercase text-teal-400 mb-1">Dica do Mentor</p>
                     <p className="text-[10px] leading-relaxed opacity-80">"A excelência na enfermagem está na atenção aos mínimos detalhes e na empatia constante."</p>
                     <Zap size={32} className="absolute -right-2 -bottom-2 text-white/5" />
                  </div>
                </div>
             </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

// --- Componentes Auxiliares ---

const MessageBubble = ({ role, content, onPlay, onDeepDive }: any) => (
  <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} group animate-in slide-in-from-bottom-2`}>
    <div className={`max-w-[90%] md:max-w-[80%] p-4 rounded-2xl ${role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-sm'}`}>
      <div className="prose prose-slate max-w-none text-xs md:text-sm font-medium leading-relaxed whitespace-pre-wrap">{content}</div>
      {role === 'assistant' && (
        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onPlay} className="text-teal-600 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 hover:bg-teal-50 px-2 py-1 rounded-lg"><Volume2 size={12}/> OUVIR</button>
          <button onClick={onDeepDive} className="text-indigo-600 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded-lg"><Search size={12}/> APROFUNDAR</button>
          <button className="ml-auto text-slate-200 hover:text-slate-400"><Share2 size={14}/></button>
        </div>
      )}
    </div>
  </div>
);

const ToolCard = ({ title, icon, color, onClick }: any) => (
  <button onClick={onClick} className="w-full text-left p-3 rounded-xl bg-white border border-slate-100 hover:border-teal-200 hover:shadow-sm transition-all flex items-center gap-3 group">
    <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>{icon}</div>
    <span className="font-black text-[10px] text-slate-700 uppercase tracking-tighter">{title}</span>
  </button>
);

const QuickMenuBtn = ({ icon, label, color, onClick }: any) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1.5 group">
    <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all shadow-sm`}>{icon}</div>
    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{label}</span>
  </button>
);

const EmergencyView = ({ onBack }: any) => {
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);
  useEffect(() => {
    let interval: any;
    if (isActive) interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-slate-800 transition-colors"><ChevronLeft size={14}/> Voltar ao Chat</button>
      <div className="bg-red-600 text-white p-6 rounded-3xl shadow-xl flex items-center justify-between relative overflow-hidden">
        <div>
          <h3 className="text-lg font-black mb-1 uppercase tracking-tighter">Protocolo RCP (OMS/AHA)</h3>
          <p className="text-[10px] font-bold opacity-80 flex items-center gap-1.5"><Zap size={12} className="animate-pulse"/> 100-120 Compressões/min 🚨</p>
        </div>
        <div className="text-3xl font-mono font-black bg-black/20 px-4 py-2 rounded-xl backdrop-blur-md">{Math.floor(timer/60)}:{(timer%60).toString().padStart(2, '0')}</div>
      </div>
      <div className="grid grid-cols-1 gap-2">
        <div className="p-4 bg-white rounded-2xl border border-red-100 flex items-start gap-3">
          <span className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center font-black text-[10px]">1</span>
          <p className="text-xs font-bold text-slate-600">Avalie responsividade e chame ajuda (DEA).</p>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-red-100 flex items-start gap-3">
          <span className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center font-black text-[10px]">2</span>
          <p className="text-xs font-bold text-slate-600">Inicie compressões torácicas imediatas (5-6cm).</p>
        </div>
      </div>
      <button onClick={() => setIsActive(!isActive)} className={`w-full py-5 text-lg font-black rounded-2xl shadow-xl transition-all ${isActive ? 'bg-slate-800 text-white' : 'bg-red-600 text-white animate-pulse'}`}>
        {isActive ? 'INTERROMPER CICLO' : 'INICIAR RCP AGORA'}
      </button>
    </div>
  );
};

const CalculatorView = ({ onBack }: any) => (
  <div className="max-w-xl mx-auto space-y-4">
    <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-slate-800 transition-colors"><ChevronLeft size={14}/> Voltar ao Chat</button>
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
      <h3 className="text-sm font-black flex items-center gap-2"><Droplets size={16} className="text-blue-500"/> Cálculo de Gotejamento</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Volume (ml)</label><input type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-xs" /></div>
        <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Tempo (h)</label><input type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-xs" /></div>
      </div>
      <button className="w-full py-4 bg-blue-600 text-white font-black rounded-xl text-xs">CALCULAR MACROGOTAS</button>
    </div>
  </div>
);

const VitalsMonitor = ({ vitals, onBack }: any) => (
  <div className="max-w-xl mx-auto space-y-4">
     <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-slate-800 transition-colors"><ChevronLeft size={14}/> Voltar ao Chat</button>
     <div className="grid grid-cols-2 gap-3">
        <VitalBox icon={<Heart className="text-red-500"/>} label="PA" value={`${vitals.bpSistolic}/${vitals.bpDiastolic}`} unit="mmHg" />
        <VitalBox icon={<Zap className="text-orange-500"/>} label="FC" value={vitals.heartRate} unit="bpm" />
        <VitalBox icon={<Thermometer className="text-blue-500"/>} label="TEMP" value={vitals.temp} unit="°C" />
        <VitalBox icon={<Droplets className="text-cyan-500"/>} label="SpO2" value={vitals.spo2} unit="%" />
     </div>
  </div>
);

const VitalBox = ({ icon, label, value, unit }: any) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
    <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{icon} {label}</div>
    <div className="flex items-baseline gap-1"><span className="text-xl font-black text-slate-800">{value}</span><span className="text-[9px] font-bold text-slate-300">{unit}</span></div>
  </div>
);

const PhytoView = ({ onBack }: any) => (
  <div className="max-w-xl mx-auto space-y-4">
    <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-slate-800 transition-colors"><ChevronLeft size={14}/> Voltar ao Chat</button>
    <div className="bg-emerald-600 text-white p-6 rounded-3xl relative overflow-hidden">
       <Leaf className="absolute -right-4 -top-4 w-32 h-32 text-white/10" />
       <h3 className="text-lg font-black mb-1">Guia Botânico Pro 🌿</h3>
       <p className="text-[10px] opacity-70 mb-4 max-w-xs">Identifique e aprenda condutas baseadas em fitoterapia clínica baseada em evidência.</p>
       <button className="px-5 py-2.5 bg-white text-emerald-600 font-black text-[10px] rounded-lg flex items-center gap-2"><Camera size={14}/> ESCANEAR PLANTA</button>
    </div>
  </div>
);

const LibraryView = ({ onBack, onSelect }: any) => (
  <div className="max-w-xl mx-auto space-y-4">
    <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-slate-800 transition-colors"><ChevronLeft size={14}/> Voltar ao Chat</button>
    <div className="grid grid-cols-1 gap-3">
       {COURSES.map(c => (
         <button key={c.id} onClick={() => onSelect(`Dê uma aula sobre: ${c.title}`)} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 hover:border-indigo-400 transition-all text-left">
           <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><BookOpen size={20}/></div>
           <div className="flex-1">
             <h4 className="text-xs font-black text-slate-800">{c.title}</h4>
             <p className="text-[9px] text-slate-400 font-medium">{c.category}</p>
           </div>
           <ChevronRight size={16} className="text-slate-200" />
         </button>
       ))}
    </div>
  </div>
);

export default App;

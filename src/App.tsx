/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, ArrowDown, Heart, Loader2, Settings, X, Key, Copy, Check, Volume2, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

const AVAILABLE_MODELS = [
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'google', desc: 'Maior capacidade de empatia e análise (Google).' },
  { id: 'gemini-3.0-flash', name: 'Gemini 3.0 Flash', provider: 'google', desc: 'Rápido e preciso (Google).' },
  { id: 'gpt-4o', name: 'ChatGPT-4o', provider: 'openai', desc: 'Modelo mais avançado e inteligente (OpenAI).' },
  { id: 'gpt-4o-mini', name: 'ChatGPT-4o Mini', provider: 'openai', desc: 'Ágil e eficiente (OpenAI).' },
];

const COMMON_PHRASES = [
  "Faz o que você quiser, eu não me importo mais.",
  "Engraçado como você sempre tem tempo para os seus amigos, né?",
  "Não precisa me ajudar, eu dou conta de fazer tudo sozinho mesmo.",
  "Tá tudo bem. Não aconteceu nada, relaxa.",
  "Deixa pra lá. Não sei por que eu ainda tento falar sobre isso.",
  "Você que sabe, a vida é sua.",
  "Tanto faz, depois a gente vê.",
  "Eu não tô brava, só tô cansada.",
  "Se você não sabe por que eu tô chateada, não sou eu que vou te explicar."
];

const COMMON_SITUATIONS = [
  "Meu parceiro chega do trabalho e vai direto pro celular. Quando eu reclamo que não temos tempo juntos, ele diz que está cansado e que eu estou cobrando demais.",
  "Combinamos de dividir as tarefas da casa, mas eu acabo tendo que lembrar ela de fazer tudo. Sinto que além de fazer a minha parte, ainda sou o 'gerente' da casa.",
  "Ele tomou uma decisão importante financeira sem me consultar. Quando eu disse que fiquei chateada, ele disse que o dinheiro era do bônus dele e que eu estava querendo controlar a vida dele.",
  "Sempre que tento falar de uma atitude que me magoou, ela vira o jogo e começa a listar coisas do passado que eu fiz de errado. No final eu que acabo pedindo desculpa.",
  "Sinto que ele não me prioriza. Nos finais de semana a prioridade é sempre o futebol e os amigos, e o que sobra de tempo fica pra mim. Quando falo disso, sou chamada de carente."
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'traducao' | 'analise'>('traducao');
  const [showSettings, setShowSettings] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('entrelinhas_gemini_key') || '');
  const [openAIApiKey, setOpenAIApiKey] = useState(() => localStorage.getItem('entrelinhas_openai_key') || '');
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('entrelinhas_model') || 'gemini-3.1-pro-preview');

  useEffect(() => {
    localStorage.setItem('entrelinhas_gemini_key', geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    localStorage.setItem('entrelinhas_openai_key', openAIApiKey);
  }, [openAIApiKey]);

  useEffect(() => {
    localStorage.setItem('entrelinhas_model', selectedModel);
  }, [selectedModel]);
  
  const [inputPhrase, setInputPhrase] = useState('');
  const [trueIntention, setTrueIntention] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState('');

  const [relationshipContext, setRelationshipContext] = useState('');
  const [relationshipAnalysis, setRelationshipAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const generateRandomPhrase = () => {
    const phrase = COMMON_PHRASES[Math.floor(Math.random() * COMMON_PHRASES.length)];
    setInputPhrase(phrase);
    setTrueIntention('');
  };

  const generateRandomSituation = () => {
    const situation = COMMON_SITUATIONS[Math.floor(Math.random() * COMMON_SITUATIONS.length)];
    setRelationshipContext(situation);
    setRelationshipAnalysis('');
  };

  const playAudio = async (text: string) => {
    if (isPlayingAudio) return;
    try {
      setIsPlayingAudio(true);
      const modelDef = AVAILABLE_MODELS.find(m => m.id === selectedModel);
      
      if (modelDef?.provider === 'openai' && openAIApiKey) {
        const res = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAIApiKey}`
          },
          body: JSON.stringify({
            model: 'tts-1',
            voice: 'nova',
            input: text
          })
        });
        if (!res.ok) throw new Error('Falha no áudio da OpenAI');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => setIsPlayingAudio(false);
        audio.play();
      } else {
        const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('API Key do Gemini não configurada.');
        const client = new GoogleGenAI({ apiKey });
        const response = await client.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' }
              }
            }
          }
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          // PCM 16-bit 24000Hz decoding
          const binaryString = atob(base64Audio);
          const float32Data = new Float32Array(binaryString.length / 2);
          const dataView = new DataView(new ArrayBuffer(2));
          for (let i = 0; i < float32Data.length; i++) {
            dataView.setUint8(0, binaryString.charCodeAt(i * 2));
            dataView.setUint8(1, binaryString.charCodeAt(i * 2 + 1));
            float32Data[i] = dataView.getInt16(0, true) / 32768.0;
          }
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          const buffer = audioCtx.createBuffer(1, float32Data.length, 24000);
          buffer.getChannelData(0).set(float32Data);
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(audioCtx.destination);
          source.onended = () => setIsPlayingAudio(false);
          source.start();
        } else {
          throw new Error('Sem áudio na resposta.');
        }
      }
    } catch (err) {
      console.error("Audio error:", err);
      // Fallback nativo
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const callAI = async (prompt: string, systemInstruction: string, temperature: number) => {
    const modelDef = AVAILABLE_MODELS.find(m => m.id === selectedModel);
    
    if (modelDef?.provider === 'openai') {
      if (!openAIApiKey) {
         throw new Error('Chave da API da OpenAI (ChatGPT) não configurada.');
      }
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIApiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
          ],
          temperature: temperature
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Erro na API da OpenAI');
      }
      const data = await res.json();
      return data.choices[0].message.content;
    } else {
      // Default to Gemini
      const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Chave da API do Gemini não configurada.');
      }
      const client = new GoogleGenAI({ apiKey });
      const response = await client.models.generateContent({
        model: selectedModel,
        contents: prompt,
        config: {
          systemInstruction,
          temperature,
        },
      });
      return response.text;
    }
  };

  const handleTranslate = async () => {
    if (!inputPhrase.trim()) return;

    setIsTranslating(true);
    setError('');
    setTrueIntention('');

    try {
      const text = await callAI(
        inputPhrase,
        `Você é um psicólogo especialista em empatia, comunicação não-violenta e análise de discurso. 
Sua tarefa é receber frases que pessoas dizem (muitas vezes no calor do momento, de forma passivo-agressiva, ou ocultando sentimentos por medo da vulnerabilidade) e traduzi-las para as SUAS VERDADEIRAS INTENÇÕES e necessidades emocionais.
Seja direto, profundo, compassivo e maduro.
Retorne APENAS a frase traduzida na primeira pessoa do singular (ex: "Eu me sinto... e preciso de..."). Não inclua explicações ou introduções adicionais.`,
        0.7
      );

      if (text) {
        setTrueIntention(text.trim());
      } else {
        setError('Não foi possível traduzir a intenção desta vez. Tente novamente.');
      }
    } catch (err: any) {
      console.error('Translation error:', err);
      setError(err.message || 'Ocorreu um erro ao conectar com a inteligência artificial.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleAnalyze = async () => {
    if (!relationshipContext.trim()) return;

    setIsAnalyzing(true);
    setError('');
    setRelationshipAnalysis('');

    try {
      const text = await callAI(
        relationshipContext,
        `Você é um conselheiro de casais experiente e um psicólogo focado em dinâmicas de relacionamento e comunicação não-violenta.
Sua tarefa é ler um desabafo ou descrição de um conflito/dinâmica de um casal e fornecer uma ANÁLISE RACIONAL, imparcial e construtiva.
Estruture sua análise em 3 partes breves e diretas:
1. "A Dinâmica Oculta": O que realmente está acontecendo por trás dessa briga ou sentimento? (Ex: "Vocês não estão brigando sobre a louça, estão brigando sobre quem se sente mais valorizado.")
2. "As Necessidades": O que cada um (provavelmente) está precisando e não está dizendo?
3. "Um Passo Prático": Uma sugestão clara de como quebrar esse ciclo ou puxar o assunto de forma diferente.

Mantenha o tom neutro, empático e focado na solução. Não tome partido e não escreva um texto muito longo. Retorne os pontos formatados de forma clara, usando Markdown simples.`,
        0.6
      );

      if (text) {
        setRelationshipAnalysis(text.trim());
      } else {
        setError('Não foi possível analisar a situação desta vez. Tente novamente.');
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Ocorreu um erro ao conectar com a inteligência artificial para análise.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (activeTab === 'traducao') {
        handleTranslate();
      } else {
        handleAnalyze();
      }
    }
  };

  return (
    <div className="min-h-screen py-16 px-6 md:px-12 max-w-4xl mx-auto flex flex-col pt-24 font-sans text-[#2D2D2D]">
      <header className="mb-12 flex justify-between items-center text-center md:text-left">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <div className="w-10 h-10 bg-[#FF6B6B] rounded-xl flex items-center justify-center shadow-lg transform -rotate-6">
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Entrelinhas
            </h1>
          </div>
          <p className="text-[#666] text-lg font-semibold tracking-wide max-w-lg mt-4 h-14">
            {activeTab === 'traducao' 
              ? 'Transforme palavras ditas no calor da emoção naquilo que você realmente queria dizer.'
              : 'Descreva uma situação ou briga e receba uma análise racional, imparcial e construtiva.'}
          </p>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-3 bg-[#FFD93D] border-2 border-[#2D2D2D] rounded-xl shadow-[4px_4px_0px_0px_#2D2D2D] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#2D2D2D] transition-all"
          title="Configurações de API e IA"
        >
          <Settings className="w-8 h-8 text-[#2D2D2D]" />
        </button>
      </header>

      <main className="flex-1 flex flex-col gap-6">
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setActiveTab('traducao')}
            className={`px-6 py-2 rounded-full font-bold tracking-wider text-sm transition-all ${
              activeTab === 'traducao' 
                ? 'bg-[#FF6B6B] text-white shadow-md' 
                : 'bg-white text-[#2D2D2D] border-2 border-[#2D2D2D] hover:bg-gray-50'
            }`}
          >
            Tradução
          </button>
          <button
            onClick={() => setActiveTab('analise')}
            className={`px-6 py-2 rounded-full font-bold tracking-wider text-sm transition-all ${
              activeTab === 'analise' 
                ? 'bg-[#FF6B6B] text-white shadow-md' 
                : 'bg-white text-[#2D2D2D] border-2 border-[#2D2D2D] hover:bg-gray-50'
            }`}
          >
            Análise de Relacionamento
          </button>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-[12px_12px_0px_0px_#4D96FF] border-2 border-[#4D96FF] transition-all focus-within:shadow-[16px_16px_0px_0px_#4D96FF] focus-within:-translate-y-1">
          {activeTab === 'traducao' ? (
            <>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                <label htmlFor="phrase" className="inline-block px-4 py-1 bg-[#FFD93D] rounded-full text-xs font-bold uppercase tracking-wider w-fit">
                  O que você disse
                </label>
                <button 
                  onClick={generateRandomPhrase}
                  className="flex items-center gap-2 text-xs font-bold text-[#4D96FF] hover:text-[#2D2D2D] transition-colors bg-[#4D96FF]/10 px-3 py-1.5 rounded-full w-fit hover:bg-gray-100"
                >
                  <Wand2 className="w-4 h-4" /> Sugerir exemplo
                </button>
              </div>
              <textarea
                id="phrase"
                value={inputPhrase}
                onChange={(e) => setInputPhrase(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ex: 'Faz o que você quiser, não me importo mais.'"
                className="w-full resize-none text-2xl md:text-3xl font-extrabold leading-tight mb-4 text-[#2D2D2D] placeholder:text-[#999] bg-transparent border-none outline-none focus:ring-0 p-2 min-h-[140px]"
                disabled={isTranslating}
              />
              
              <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end mt-2 gap-4">
                <span className="text-xs text-[#999] px-2 font-semibold hidden sm:inline-block">Pressione Enter para traduzir</span>
                <button
                  onClick={handleTranslate}
                  disabled={isTranslating || !inputPhrase.trim()}
                  className="w-full sm:w-auto bg-[#FF6B6B] text-white px-8 py-4 sm:py-5 rounded-2xl font-bold text-lg sm:text-xl shadow-lg hover:brightness-105 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Traduzindo
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Descobrir intenção
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                <label htmlFor="context" className="inline-block px-4 py-1 bg-[#FFD93D] rounded-full text-xs font-bold uppercase tracking-wider w-fit">
                  Qual é a situação de vocês?
                </label>
                <button 
                  onClick={generateRandomSituation}
                  className="flex items-center gap-2 text-xs font-bold text-[#4D96FF] hover:text-[#2D2D2D] transition-colors bg-[#4D96FF]/10 px-3 py-1.5 rounded-full w-fit hover:bg-gray-100"
                >
                  <Wand2 className="w-4 h-4" /> Sugerir situação
                </button>
              </div>
              <textarea
                id="context"
                value={relationshipContext}
                onChange={(e) => setRelationshipContext(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Descreva o conflito, a briga, ou como estão se sentindo..."
                className="w-full resize-none text-xl md:text-2xl font-semibold leading-relaxed mb-4 text-[#2D2D2D] placeholder:text-[#999] bg-transparent border-none outline-none focus:ring-0 p-2 min-h-[180px]"
                disabled={isAnalyzing}
              />
              
              <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end mt-2 gap-4">
                <span className="text-xs text-[#999] px-2 font-semibold hidden sm:inline-block">Pressione Enter para analisar</span>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !relationshipContext.trim()}
                  className="w-full sm:w-auto bg-[#4D96FF] text-white px-8 py-4 sm:py-5 rounded-2xl font-bold text-lg sm:text-xl shadow-lg hover:brightness-105 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analisando Dinâmica
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Analisar Relacionamento
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-500 text-sm px-6"
            >
              {error}
            </motion.div>
          )}

          {activeTab === 'traducao' && trueIntention && (
            <motion.div
              key="traducao-result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-6 relative"
            >
              <div className="absolute left-1/2 -top-8 -translate-x-1/2 text-[#2D2D2D]">
                <ArrowDown className="w-8 h-8 font-bold" />
              </div>
              
              <div className="bg-[#6BCB77] p-8 md:p-10 rounded-[40px] shadow-[12px_12px_0px_0px_#2D2D2D] border-2 border-[#2D2D2D] relative flex flex-col justify-center">
                <div className="absolute top-0 right-0 p-8 opacity-20 text-[#2D2D2D]">
                  <Heart className="w-32 h-32" />
                </div>
                
                <h2 className="px-4 py-1 bg-white inline-block w-fit rounded-full text-xs font-bold uppercase tracking-wider mb-6 text-[#2D2D2D]">
                  A intenção real
                </h2>
                <p className="text-3xl md:text-4xl font-extrabold text-white leading-tight relative z-10 drop-shadow-md mb-6">
                  "{trueIntention}"
                </p>
                
                <div className="flex items-center gap-3 relative z-10">
                  <button
                    onClick={() => handleCopy(trueIntention)}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  >
                    {copiedText ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedText ? 'Copiado!' : 'Copiar'}
                  </button>
                  <button
                    onClick={() => playAudio(trueIntention)}
                    disabled={isPlayingAudio}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPlayingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                    {isPlayingAudio ? 'Reproduzindo...' : 'Ouvir'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analise' && relationshipAnalysis && (
             <motion.div
              key="analise-result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-6 relative"
            >
              <div className="absolute left-1/2 -top-8 -translate-x-1/2 text-[#2D2D2D]">
                <ArrowDown className="w-8 h-8 font-bold" />
              </div>
              
              <div className="bg-[#FFD93D] p-8 md:p-10 rounded-[40px] shadow-[12px_12px_0px_0px_#2D2D2D] border-2 border-[#2D2D2D] relative flex flex-col justify-center">
                <div className="absolute top-0 right-0 p-8 opacity-10 text-[#2D2D2D]">
                  <Sparkles className="w-32 h-32" />
                </div>
                
                <h2 className="px-4 py-1 bg-white inline-block w-fit rounded-full text-xs font-bold uppercase tracking-wider mb-6 text-[#2D2D2D]">
                  Análise da Dinâmica
                </h2>
                <div className="prose prose-lg text-[#2D2D2D] relative z-10 font-medium leading-relaxed max-w-none prose-headings:font-extrabold prose-headings:mb-2 prose-p:mb-6 prose-strong:font-extrabold prose-strong:bg-white/50 prose-strong:px-1 prose-strong:rounded mb-6">
                  <ReactMarkdown>
                    {relationshipAnalysis}
                  </ReactMarkdown>
                </div>

                <div className="flex items-center gap-3 relative z-10 mt-auto pt-4 border-t-2 border-[#2D2D2D]/10">
                  <button
                    onClick={() => handleCopy(relationshipAnalysis)}
                    className="flex items-center gap-2 bg-[#2D2D2D]/10 hover:bg-[#2D2D2D]/20 text-[#2D2D2D] px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  >
                    {copiedText ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedText ? 'Copiado!' : 'Copiar'}
                  </button>
                  <button
                    onClick={() => playAudio(relationshipAnalysis)}
                    disabled={isPlayingAudio}
                    className="flex items-center gap-2 bg-[#2D2D2D]/10 hover:bg-[#2D2D2D]/20 text-[#2D2D2D] px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPlayingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                    {isPlayingAudio ? 'Reproduzindo...' : 'Ouvir'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white border-2 border-[#2D2D2D] rounded-[32px] p-8 max-w-lg w-full shadow-[16px_16px_0px_0px_#4D96FF] relative"
            >
              <button 
                onClick={() => setShowSettings(false)}
                className="absolute top-6 right-6 p-2 bg-[#F2F2F2] rounded-full hover:bg-gray-200 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5 text-[#2D2D2D]" />
              </button>

              <h2 className="text-2xl font-extrabold mb-6 text-[#2D2D2D]">Configurações da IA</h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-blue-50/50 p-4 border-2 border-[#4D96FF]/30 rounded-xl">
                    <label className="block text-sm font-bold uppercase tracking-wider mb-2 text-[#4D96FF] flex items-center gap-2">
                       <Key className="w-4 h-4" />
                       API Key: Gemini (Google)
                    </label>
                    <input 
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="Sua chave do Google AI Studio..."
                      className="w-full border-2 border-[#4D96FF]/30 rounded-lg p-2 bg-white focus:border-[#4D96FF] focus:outline-none transition-all text-sm font-semibold text-[#2D2D2D]"
                    />
                  </div>

                  <div className="bg-green-50/50 p-4 border-2 border-[#6BCB77]/30 rounded-xl">
                    <label className="block text-sm font-bold uppercase tracking-wider mb-2 text-[#6BCB77] flex items-center gap-2">
                       <Key className="w-4 h-4" />
                       API Key: ChatGPT (OpenAI)
                    </label>
                    <input 
                      type="password"
                      value={openAIApiKey}
                      onChange={(e) => setOpenAIApiKey(e.target.value)}
                      placeholder="Sua chave da OpenAI (sk-proj-...)"
                      className="w-full border-2 border-[#6BCB77]/30 rounded-lg p-2 bg-white focus:border-[#6BCB77] focus:outline-none transition-all text-sm font-semibold text-[#2D2D2D]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider mb-3 text-[#2D2D2D]">
                    Escolha a IA para usar:
                  </label>
                  <div className="flex flex-col gap-3 max-h-[35vh] overflow-y-auto pr-2">
                    {AVAILABLE_MODELS.map(model => (
                      <label 
                        key={model.id}
                        className={`flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          selectedModel === model.id 
                            ? 'border-[#4D96FF] bg-[#4D96FF]/10 shadow-[4px_4px_0px_0px_#4D96FF]' 
                            : 'border-[#DDD] hover:border-[#4D96FF] hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <input 
                            type="radio" 
                            name="model" 
                            value={model.id}
                            checked={selectedModel === model.id}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-4 h-4 text-[#4D96FF] focus:ring-[#4D96FF]"
                          />
                          <span className="font-bold text-[#2D2D2D]">{model.name}</span>
                        </div>
                        <span className="text-xs text-[#666] ml-6 font-medium">{model.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full bg-[#2D2D2D] text-white py-4 rounded-xl font-bold tracking-wide hover:brightness-110 transition-all text-lg shadow-[4px_4px_0px_0px_#4D96FF]"
                >
                  Salvar Configurações
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

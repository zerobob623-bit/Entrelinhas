/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, ArrowDown, Heart, Loader2, Settings, X, Key, Copy, Check, Volume2, Wand2, HeartPulse } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

const AVAILABLE_MODELS = [
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'google', desc: 'Maior capacidade de empatia e análise (Google).' },
  { id: 'gemini-3.0-flash', name: 'Gemini 3.0 Flash', provider: 'google', desc: 'Rápido e preciso (Google).' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', desc: 'Mais rápido e eficiente (Google).' },
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

const QUIZ_QUESTIONS = [
  {
    question: "No fim de semana, você prefere:",
    options: ["Ficar em casa relaxando maratonando séries", "Sair e conhecer lugares novos/viajar", "Jantar com amigos íntimos", "Uma aventura na natureza ou esporte"]
  },
  {
    question: "Quando surge um problema no relacionamento, como você reage?",
    options: ["Tento resolver na hora conversando", "Preciso de um tempo sozinho(a) para pensar", "Fico irritado(a) rápido, mas depois relevo", "Evito o conflito ao máximo até não aguentar mais"]
  },
  {
    question: "Qual dessas linguagens do amor é mais importante para você?",
    options: ["Palavras de Afirmação", "Tempo de Qualidade", "Toque Físico ou Atos de Serviço", "Presentes e surpresas"]
  },
  {
    question: "Como você lida com dinheiro e planejamento futuro?",
    options: ["Sou super organizado(a) e guardo tudo que posso", "Gosto de viver o hoje e gasto com experiências", "Tento equilibrar, mas às vezes extrapolo", "Não ligo muito para dinheiro/deixo a vida me levar"]
  },
  {
    question: "O que para você é um limite inegociável?",
    options: ["Mentiras e traição de qualquer tipo", "Falta de apoio nos meus sonhos e carreira", "Desrespeito na forma de falar durante brigas", "Frieza emocional e desconexão"]
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'traducao' | 'analise' | 'quiz'>('traducao');
  const [showSettings, setShowSettings] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('entrelinhas_gemini_key') || '');
  const [openAIApiKey, setOpenAIApiKey] = useState(() => localStorage.getItem('entrelinhas_openai_key') || '');
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('entrelinhas_model_v2') || 'gemini-2.5-flash');

  useEffect(() => {
    localStorage.setItem('entrelinhas_gemini_key', geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    localStorage.setItem('entrelinhas_openai_key', openAIApiKey);
  }, [openAIApiKey]);

  useEffect(() => {
    localStorage.setItem('entrelinhas_model_v2', selectedModel);
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

  // Quiz State
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [quizResult, setQuizResult] = useState('');
  const [isGeneratingQuizResult, setIsGeneratingQuizResult] = useState(false);

  // New Game State
  const [gameMode, setGameMode] = useState<'' | 'par_ideal' | 'trivia' | 'tres_pistas' | 'casal'>('');
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [gameQuestions, setGameQuestions] = useState<any[]>([]);
  const [currentGameRound, setCurrentGameRound] = useState(0);
  const [gameStep, setGameStep] = useState<'setup' | 'playing' | 'finished'>('setup');
  const [isGeneratingGame, setIsGeneratingGame] = useState(false);
  const [gameFeedback, setGameFeedback] = useState('');
  const [gameInput, setGameInput] = useState('');
  
  const [scorePlateia, setScorePlateia] = useState(0);
  const [currentClueIndex, setCurrentClueIndex] = useState(0);
  const [isPlateiaTurn, setIsPlateiaTurn] = useState(false);
  const [wrongFeedback, setWrongFeedback] = useState('');
  
  const [casalAnswers, setCasalAnswers] = useState<{question: string, chosen: string}[]>([]);
  const [casalAnalysis, setCasalAnalysis] = useState('');
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);

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
        let ttsModel = "gemini-2.5-flash";
        if (!geminiApiKey) {
          ttsModel = "gemini-3-flash-preview";
        }
        
        try {
          const response = await client.models.generateContent({
            model: ttsModel,
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
          if (!base64Audio) {
            throw new Error('Sem áudio na resposta.');
          }
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
        } catch(apiErr: any) {
             if (apiErr?.status === 403 || apiErr?.message?.includes('PERMISSION_DENIED') || apiErr?.message?.includes('403') || apiErr?.message?.includes('NOT_FOUND')) {
                throw new Error('Sem permissão para este modelo ou versão de áudio. Por favor, adicione SUA PRÓPRIA API KEY na engrenagem de configurações.');
             }
             throw apiErr;
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
        if (errData.error?.code === 403) {
          throw new Error('Erro 403: Sem permissão. (Verifique sua API KEY nas configurações).');
        }
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
      
      let actualModel = selectedModel;
      // Tratar os modelos para funcionar com a chave proxy do AI Studio se o usuário usar o padrão
      if (!geminiApiKey && actualModel.startsWith('gemini')) {
        actualModel = 'gemini-3-flash-preview';
      }

      try {
        const response = await client.models.generateContent({
          model: actualModel,
          contents: prompt,
          config: {
            systemInstruction,
            temperature,
          },
        });
        return response.text;
      } catch (apiErr: any) {
         if (apiErr?.status === 403 || apiErr?.message?.includes('PERMISSION_DENIED') || apiErr?.message?.includes('403')) {
          throw new Error('Sem permissão para este modelo. Por favor, adicione SUA PRÓPRIA API KEY na engrenagem de configurações.');
         }
         throw apiErr;
      }
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
      } else if (activeTab === 'analise') {
        handleAnalyze();
      }
    }
  };

  const handleQuizOption = async (option: string) => {
    const newAnswers = [...quizAnswers, option];
    setQuizAnswers(newAnswers);

    if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Finished quiz
      await evaluateQuiz(newAnswers);
    }
  };

  const evaluateQuiz = async (answers: string[]) => {
    setIsGeneratingQuizResult(true);
    setError('');
    
    const prompt = QUIZ_QUESTIONS.map((q, i) => `Pergunta: ${q.question}\nResposta: ${answers[i]}`).join('\n\n');

    try {
      const text = await callAI(
        prompt,
        `Você é um especialista em perfis comportamentais e relacionamentos.
Com base nas respostas do usuário a este quiz de 5 perguntas, crie uma análise divertida, mas profunda.
Sua análise deve conter:
1. **❤️ Seu Par Ideal:** Um título curto do tipo de pessoa ideal para o usuário. Inclua características principais e explique POR QUE dá certo.
2. **❌ A Grande Cilada (Par Imperfeito):** Um título curto do tipo de pessoa que seria um desastre. Inclua características e explique POR QUE daria errado.
3. **Resumo da sua Persona no Amor:** 2 parágrafos no máximo descrevendo o estilo de amar do usuário.

Use emojis. Formate tudo em Markdown. Deixe a leitura dinâmica, madura e engajante.`,
        0.7
      );

      if (text) {
        setQuizResult(text.trim());
      } else {
        setError('Não foi possível gerar seu resultado agora. Tente novamente.');
      }
    } catch (err: any) {
       console.error('Quiz error:', err);
       setError(err.message || 'Ocorreu um erro ao conectar com a inteligência artificial.');
    } finally {
      setIsGeneratingQuizResult(false);
    }
  };

  const resetQuiz = () => {
    setQuizStarted(false);
    setCurrentQuestionIndex(0);
    setQuizAnswers([]);
    setQuizResult('');
    setIsGeneratingQuizResult(false);
    setGameMode('');
    setGameStep('setup');
  };

  const startGame = async (mode: 'trivia' | 'tres_pistas' | 'casal') => {
    if (!player1 || !player2) {
      setError('Por favor, preencha o nome dos dois jogadores.');
      return;
    }
    setGameMode(mode);
    setScore1(0);
    setScore2(0);
    setScorePlateia(0);
    setCurrentPlayer(1);
    setCurrentClueIndex(0);
    setIsPlateiaTurn(false);
    setWrongFeedback('');
    setCurrentGameRound(0);
    setGameQuestions([]);
    setIsGeneratingGame(true);
    setGameFeedback('');
    setGameInput('');
    setError('');
    
    setCasalAnswers([]);
    setCasalAnalysis('');
    setIsGeneratingAnalysis(false);

    let prompt = '';
    if (mode === 'trivia') {
       prompt = `Gere 5 perguntas INÉDITAS E ALEATÓRIAS de conhecimentos gerais estilo trivial pursuit em JSON. Formato obrigatório: [{"question": "...", "options": ["A", "B", "C", "D"], "answer": "Resposta exata"}]`;
    } else if (mode === 'tres_pistas') {
       prompt = `Gere 6 desafios ALEATÓRIOS E INÉDITOS de três pistas sobre objetos, pessoas, animais ou lugares. Varie bastante os temas para que nunca sejam repetidos de um jogo para o outro. Formato obrigatório em JSON: [{"clues": ["pista1", "pista2", "pista3"], "answer": "Resposta exata"}]`;
    } else if (mode === 'casal') {
       prompt = `Gere 12 perguntas divertidas INÉDITAS sobre o casal ${player1} e ${player2}. TODAS as 12 perguntas DEVEM ser obrigatoriamente no formato comparativo "Quem é mais...?", "Quem faz mais...?", "Qual dos dois...?", "Quem é mais provável que...". Teste o quanto eles se conhecem! Retorne em JSON. Formato obrigatório: [{"question": "..."}]`;
    }

    try {
      const text = await callAI(
        prompt, 
        'Você é um gerador de jogos. Responda APENAS com um array JSON válido. Sem formatação markdown, sem blocos de código ```json, apenas o array JSON puro e cru empezando com [ e terminando com ].', 
        0.8
      );
      if (text) {
         let cleanJson = text;
         if (text.startsWith('```')) {
            cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
         }
         const parsed = JSON.parse(cleanJson);
         setGameQuestions(parsed);
         setGameStep('playing');
      } else {
        throw new Error('Falha ao gerar perguntas.');
      }
    } catch(err: any) {
      setError('Erro ao criar o jogo: Verifique as configurações da API ou tente novamente.');
      setGameStep('setup');
      setGameMode('');
    } finally {
      setIsGeneratingGame(false);
    }
  };

  const nextGameRound = () => {
    if (currentGameRound < gameQuestions.length - 1) {
       setCurrentGameRound(r => r + 1);
       setCurrentPlayer(p => p === 1 ? 2 : 1);
       setGameFeedback('');
       setGameInput('');
       setCurrentClueIndex(0);
       setIsPlateiaTurn(false);
       setWrongFeedback('');
    } else {
       setGameStep('finished');
    }
  };

  const checkAnswer = (selectedOpt?: string, isCorrectOverride?: boolean) => {
     if (isGeneratingGame || gameStep !== 'playing') return;

     let isCorrect = false;
     let correctAnswer = '';
     const q = gameQuestions[currentGameRound];

     if (isCorrectOverride !== undefined) {
         isCorrect = isCorrectOverride;
         correctAnswer = q.answer;
     } else if (gameMode === 'trivia') {
        isCorrect = (selectedOpt === q.answer);
        correctAnswer = q.answer;
     } else if (gameMode === 'tres_pistas') {
        const checkStr = selectedOpt || gameInput;
        const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        isCorrect = normalize(checkStr) === normalize(q.answer);
        correctAnswer = q.answer;
     }

     if (isCorrect) {
       let pts = 1;
       if (gameMode === 'tres_pistas') {
           pts = 3 - currentClueIndex;
           setGameFeedback(`🎉 Parabéns! <strong>${currentPlayer === 1 ? player1 : player2}</strong> acertou e ganhou ${pts} ${pts > 1 ? 'pontos' : 'ponto'}! A resposta era: ${correctAnswer}`);
       } else {
           setGameFeedback('🎉 Parabéns, você acertou!');
       }
       if (currentPlayer === 1) setScore1(s => s + pts);
       else setScore2(s => s + pts);
     } else {
       if (gameMode === 'tres_pistas') {
           setGameInput('');
           if (currentClueIndex < 2) {
               setWrongFeedback('❌ Errou! Passando a vez...');
               setTimeout(() => setWrongFeedback(''), 2000);
               setCurrentClueIndex(c => c + 1);
               setCurrentPlayer(p => p === 1 ? 2 : 1);
           } else {
               setIsPlateiaTurn(true);
           }
       } else {
           setGameFeedback(`❌ Que pena, você errou. A resposta era: ${correctAnswer}`);
       }
     }
  };

  const handlePlateia = (acertou: boolean) => {
      if (acertou) {
          setScorePlateia(s => s + 3);
          setGameFeedback(`🎉 A Plateia acertou a resposta: "<strong>${gameQuestions[currentGameRound].answer}</strong>" e ganhou 3 pontos!`);
      } else {
          setGameFeedback(`❌ Ninguém acertou! A resposta era: "<strong>${gameQuestions[currentGameRound].answer}</strong>"`);
      }
  };

  const handleCasalScore = async (chosenPlayerIndex: 1 | 2) => {
      const chosenPlayerName = chosenPlayerIndex === 1 ? player1 : player2;
      const newAnswers = [...casalAnswers, { question: gameQuestions[currentGameRound].question, chosen: chosenPlayerName }];
      setCasalAnswers(newAnswers);

      if (chosenPlayerIndex === 1) setScore1(s => s + 1);
      else setScore2(s => s + 1);

      if (currentGameRound < gameQuestions.length - 1) {
         setCurrentGameRound(r => r + 1);
      } else {
         setGameStep('finished');
         setIsGeneratingAnalysis(true);
         try {
            const prompt = `Faça uma análise bem humorada do casal ${player1} e ${player2} baseada nas respostas do jogo "Quem é mais?".\n\nAbaixo estão as perguntas e quem foi eleito em cada uma:\n${newAnswers.map(a => `- ${a.question} R: ${a.chosen}`).join('\n')}\n\nFaça um texto contínuo, curto e direto, apontando em tom humorado quem levou a pior, os pontos fortes/engraçados, quem é mais positivo e mais negativo/problemático na relação. Utilize Markdown para formatar (negrito, etc) e use emojis. Não seja professoral, seja divertido!`;
            const analysis = await callAI(prompt, 'Você é um terapeuta de casais humorista e sincero.', 0.8);
            setCasalAnalysis(analysis || 'Não foi possível gerar a análise.');
         } catch(e) {
            setCasalAnalysis('Erro ao gerar a análise.');
         } finally {
            setIsGeneratingAnalysis(false);
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
          <p className="text-[#666] text-lg font-semibold tracking-wide max-w-xl mt-4 min-h-[56px]">
            {activeTab === 'traducao' 
              ? 'Transforme palavras ditas no calor da emoção naquilo que você realmente queria dizer.'
              : activeTab === 'analise'
              ? 'Descreva uma situação ou briga e receba uma análise racional, imparcial e construtiva.'
              : 'Responda o quiz para descobrir seu par ideal e as maiores ciladas para o seu estilo de amar.'}
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
        <div className="flex flex-wrap gap-4 mb-4">
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
          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-6 py-2 rounded-full font-bold tracking-wider text-sm transition-all ${
              activeTab === 'quiz' 
                ? 'bg-[#FF6B6B] text-white shadow-md' 
                : 'bg-white text-[#2D2D2D] border-2 border-[#2D2D2D] hover:bg-gray-50'
            }`}
          >
            Quiz/Jogos
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
          ) : activeTab === 'analise' ? (
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
          ) : activeTab === 'quiz' ? (
             <div className="flex flex-col h-full min-h-[300px]">
               {gameMode === '' ? (
                 <div className="flex flex-col items-center justify-center flex-1 space-y-8 py-6">
                    <h3 className="text-2xl md:text-3xl font-extrabold text-[#2D2D2D]">Escolha seu Quiz ou Desafio!</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                       <button
                         onClick={() => setGameMode('par_ideal')}
                         className="flex flex-col items-center justify-center bg-white border-4 border-[#2D2D2D]/10 hover:border-[#FF6B6B] p-6 rounded-2xl transition-all shadow-[4px_4px_0px_0px_rgba(45,45,45,0.1)] hover:shadow-[4px_4px_0px_0px_#FF6B6B] hover:-translate-y-1"
                       >
                          <Heart className="w-8 h-8 text-[#FF6B6B] mb-2" />
                          <span className="font-bold text-lg">Par Ideal</span>
                          <span className="text-sm text-[#666] text-center mt-2">Quiz para descobrir seu perfil amoroso e quem seria uma cilada.</span>
                       </button>

                       <button
                         onClick={() => setGameStep('setup') || setGameMode('trivia')}
                         className="flex flex-col items-center justify-center bg-white border-4 border-[#2D2D2D]/10 hover:border-[#4D96FF] p-6 rounded-2xl transition-all shadow-[4px_4px_0px_0px_rgba(45,45,45,0.1)] hover:shadow-[4px_4px_0px_0px_#4D96FF] hover:-translate-y-1"
                       >
                          <Wand2 className="w-8 h-8 text-[#4D96FF] mb-2" />
                          <span className="font-bold text-lg">Conhecimentos Gerais</span>
                          <span className="text-sm text-[#666] text-center mt-2">Jogue contra alguém para ver quem sabe mais.</span>
                       </button>

                       <button
                         onClick={() => setGameStep('setup') || setGameMode('tres_pistas')}
                         className="flex flex-col items-center justify-center bg-white border-4 border-[#2D2D2D]/10 hover:border-[#FFD93D] p-6 rounded-2xl transition-all shadow-[4px_4px_0px_0px_rgba(45,45,45,0.1)] hover:shadow-[4px_4px_0px_0px_#FFD93D] hover:-translate-y-1"
                       >
                          <Sparkles className="w-8 h-8 text-[#FFD93D] mb-2" />
                          <span className="font-bold text-lg">Jogo das Três Pistas</span>
                          <span className="text-sm text-[#666] text-center mt-2">Tente adivinhar a palavra com as dicas!</span>
                       </button>

                       <button
                         onClick={() => setGameStep('setup') || setGameMode('casal')}
                         className="flex flex-col items-center justify-center bg-white border-4 border-[#2D2D2D]/10 hover:border-[#6BCB77] p-6 rounded-2xl transition-all shadow-[4px_4px_0px_0px_rgba(45,45,45,0.1)] hover:shadow-[4px_4px_0px_0px_#6BCB77] hover:-translate-y-1"
                       >
                          <HeartPulse className="w-8 h-8 text-[#6BCB77] mb-2" />
                          <span className="font-bold text-lg">12 Perguntas (Casal)</span>
                          <span className="text-sm text-[#666] text-center mt-2">Testem o quanto vocês se conhecem de verdade.</span>
                       </button>
                    </div>
                 </div>
               ) : gameMode === 'par_ideal' ? (
                 <>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                  <label className="inline-block px-4 py-1 bg-[#6BCB77] text-white rounded-full text-xs font-bold uppercase tracking-wider w-fit">
                    Descubra seu Par Ideal & A Grande Cilada
                  </label>
                  <button onClick={resetQuiz} className="text-xs font-bold text-[#6BCB77] hover:bg-gray-100 px-3 py-1.5 rounded-full transition-colors">Voltar</button>
                </div>

                {!quizStarted && !quizResult && !isGeneratingQuizResult ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-center space-y-6 py-6">
                    <h3 className="text-2xl md:text-3xl font-extrabold text-[#2D2D2D]">Pronto para descobrir o mapa da sua cara metade?</h3>
                    <p className="text-lg text-[#666] max-w-lg font-medium">
                      Responda a 5 perguntinhas rápidas sobre você e vamos descobrir com quem você daria <strong>muito certo</strong> e qual personalidade seria um verdadeiro <strong>desastre</strong>.
                    </p>
                    <button
                      onClick={() => setQuizStarted(true)}
                      className="w-full sm:w-auto bg-[#6BCB77] text-white px-8 py-4 sm:py-5 rounded-2xl font-bold text-lg sm:text-xl shadow-lg hover:brightness-105 transition-all flex justify-center items-center gap-2"
                    >
                      <Heart className="w-6 h-6" />
                      Começar o Quiz
                    </button>
                  </div>
                ) : isGeneratingQuizResult ? (
                  <div className="flex flex-col items-center justify-center flex-1 space-y-4 py-12">
                    <Loader2 className="w-12 h-12 text-[#6BCB77] animate-spin" />
                    <p className="text-xl font-bold text-[#2D2D2D]">Lendo o seu perfil e o mapa humano...</p>
                  </div>
                ) : quizResult ? (
                  <div className="flex flex-col flex-1">
                     <div className="prose prose-lg text-[#2D2D2D] relative z-10 font-medium leading-relaxed max-w-none prose-headings:font-extrabold prose-headings:mb-4 prose-p:mb-6 prose-strong:font-extrabold prose-strong:bg-[#6BCB77]/20 prose-strong:px-1 prose-strong:rounded mb-6">
                        <ReactMarkdown>
                          {quizResult}
                        </ReactMarkdown>
                     </div>
                     <div className="flex items-center gap-3 relative z-10 mt-auto pt-4 border-t-2 border-[#2D2D2D]/10 w-full flex-wrap">
                        <button
                          onClick={() => handleCopy(quizResult)}
                          className="flex items-center gap-2 bg-[#2D2D2D]/10 hover:bg-[#2D2D2D]/20 text-[#2D2D2D] px-4 py-2 rounded-xl text-sm font-bold transition-all"
                        >
                          {copiedText ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copiedText ? 'Copiado!' : 'Copiar'}
                        </button>
                        <button
                          onClick={() => playAudio(quizResult)}
                          disabled={isPlayingAudio}
                          className="flex items-center gap-2 bg-[#2D2D2D]/10 hover:bg-[#2D2D2D]/20 text-[#2D2D2D] px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPlayingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                          {isPlayingAudio ? 'Reproduzindo...' : 'Ouvir'}
                        </button>
                        <button
                          onClick={() => { setQuizResult(''); setQuizStarted(false); setCurrentQuestionIndex(0); setQuizAnswers([]); }}
                          className="ml-auto flex items-center gap-2 bg-[#2D2D2D] hover:bg-[#444] text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
                        >
                          Refazer Quiz
                        </button>
                     </div>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1 space-y-6">
                    <p className="text-[#6BCB77] font-bold text-sm uppercase tracking-wider">Pergunta {currentQuestionIndex + 1} de {QUIZ_QUESTIONS.length}</p>
                    <h3 className="text-2xl md:text-3xl font-extrabold text-[#2D2D2D] leading-tight">
                      {QUIZ_QUESTIONS[currentQuestionIndex].question}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      {QUIZ_QUESTIONS[currentQuestionIndex].options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuizOption(option)}
                          className="text-left bg-white border-4 border-[#2D2D2D]/10 hover:border-[#6BCB77] text-[#2D2D2D] font-bold p-6 rounded-2xl transition-all h-full text-lg shadow-[4px_4px_0px_0px_rgba(45,45,45,0.1)] hover:shadow-[4px_4px_0px_0px_#6BCB77] hover:-translate-y-1"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                 </>
               ) : (
                 <div className="flex flex-col h-full flex-1 w-full">
                    <div className="flex justify-between items-center mb-6 border-b-2 border-gray-100 pb-4">
                      <h2 className="text-xl font-extrabold uppercase text-[#4D96FF]">
                        {gameMode === 'trivia' && 'Conhecimentos Gerais'}
                        {gameMode === 'tres_pistas' && 'Jogo das Três Pistas'}
                        {gameMode === 'casal' && 'Teste de Casal'}
                      </h2>
                      <button onClick={resetQuiz} className="text-sm font-bold text-gray-500 hover:text-black">
                         ← Voltar Menu
                      </button>
                    </div>
                    
                    {gameStep === 'setup' ? (
                       <div className="flex justify-center flex-col items-center w-full px-6 py-4 relative gap-6 text-center">
                          <p className="text-lg font-bold">Quem vai jogar?</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                             <input type="text" value={player1} onChange={e => setPlayer1(e.target.value)} placeholder="Jogador 1" className="bg-gray-100 border-2 border-transparent focus:border-[#4D96FF] p-4 font-bold rounded-xl text-center outline-none transition-all placeholder:font-medium text-[#2D2D2D]" />
                             <input type="text" value={player2} onChange={e => setPlayer2(e.target.value)} placeholder="Jogador 2" className="bg-gray-100 border-2 border-transparent focus:border-[#4D96FF] p-4 font-bold rounded-xl text-center outline-none transition-all placeholder:font-medium text-[#2D2D2D]" />
                          </div>
                          <button
                            onClick={() => startGame(gameMode as any)}
                            disabled={!player1 || !player2 || isGeneratingGame}
                            className="bg-[#4D96FF] text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center min-w-[200px] disabled:opacity-50"
                          >
                             {isGeneratingGame ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Começar!'}
                          </button>
                       </div>
                    ) : gameStep === 'playing' ? (
                       <div className="flex flex-col w-full h-full relative">
                          <div className={`flex justify-between items-center mb-8 px-4 bg-gray-50 p-4 rounded-2xl w-full ${gameMode === 'tres_pistas' ? 'max-w-2xl' : 'max-w-md'} mx-auto shadow-sm border border-gray-100`}>
                             <div className={`font-bold p-2 px-4 rounded-lg flex-1 text-center ${currentPlayer === 1 ? 'bg-[#4D96FF] text-white shadow-md' : 'text-gray-500'}`}>
                                {player1} <span className="ml-2 bg-black/10 px-2 rounded-full">{score1}</span>
                             </div>
                             <div className="font-extrabold text-[#2D2D2D] opacity-40 mx-4">VS</div>
                             <div className={`font-bold p-2 px-4 rounded-lg flex-1 text-center ${currentPlayer === 2 ? 'bg-[#FF6B6B] text-white shadow-md' : 'text-gray-500'}`}>
                                {player2} <span className="ml-2 bg-black/10 px-2 rounded-full">{score2}</span>
                             </div>
                             {gameMode === 'tres_pistas' && (
                                <>
                                   <div className="font-extrabold text-[#2D2D2D] opacity-40 mx-4">VS</div>
                                   <div className={`font-bold p-2 px-4 rounded-lg flex-1 text-center ${isPlateiaTurn ? 'bg-[#FFD93D] text-[#2D2D2D] shadow-md border-2 border-transparent' : 'text-amber-700 bg-amber-50 border-2 border-amber-200'}`}>
                                      Plateia <span className={`ml-2 px-2 rounded-full ${isPlateiaTurn ? 'bg-black/10' : 'bg-white'}`}>{scorePlateia}</span>
                                   </div>
                                </>
                             )}
                          </div>
                          
                          <div className="flex flex-col text-center space-y-6">
                             <span className="text-[#4D96FF] font-bold text-sm tracking-widest uppercase">Pergunta {currentGameRound + 1} de {gameQuestions.length}</span>
                             
                             {gameMode !== 'tres_pistas' && (
                                <p className="text-2xl font-extrabold pb-4 max-w-2xl mx-auto">
                                  {gameQuestions[currentGameRound].question}
                                </p>
                             )}
                             
                             {gameFeedback ? (
                                <div className="space-y-6 py-6 pb-0">
                                   <p className="text-xl font-bold" dangerouslySetInnerHTML={{__html: gameFeedback}} />
                                   <button onClick={nextGameRound} className="mx-auto block bg-black text-white px-8 py-3 rounded-full font-bold hover:scale-105 transition-all">Próxima Rodada →</button>
                                </div>
                             ) : gameMode === 'trivia' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 w-full max-w-2xl mx-auto">
                                  {gameQuestions[currentGameRound].options?.map((opt: string) => (
                                     <button key={opt} onClick={() => checkAnswer(opt)} className="bg-white border-2 border-gray-200 p-4 rounded-xl font-bold hover:border-[#4D96FF] transition-all">
                                        {opt}
                                     </button>
                                  ))}
                                </div>
                             ) : gameMode === 'tres_pistas' ? (
                                <div className="flex flex-col gap-4 mt-4 w-full max-w-lg mx-auto">
                                   {isPlateiaTurn ? (
                                       <div className="flex flex-col items-center gap-6 p-6 bg-[#FFD93D]/20 rounded-2xl border-4 border-[#FFD93D] mt-2">
                                          <p className="text-xl font-bold">Nenhum dos dois acertou!</p>
                                          <p className="text-lg">Agora é a vez da <span className="font-extrabold text-2xl uppercase text-amber-500 drop-shadow-sm">Plateia</span> ✨</p>
                                          <div className="flex flex-col sm:flex-row gap-4">
                                              <button onClick={() => handlePlateia(true)} className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold transition-colors">A Plateia Acertou (+3 pts)</button>
                                              <button onClick={() => handlePlateia(false)} className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-bold transition-colors">Ninguém na Plateia Acertou</button>
                                          </div>
                                       </div>
                                   ) : (
                                       <div className="flex flex-col items-center gap-4 w-full">
                                          <div className="flex gap-2 w-full justify-center flex-wrap mb-2">
                                             <span className={`px-4 py-2 rounded-full text-sm font-bold ${currentClueIndex >= 0 ? 'bg-amber-100 border-2 border-amber-400 text-amber-700' : 'bg-gray-100 text-gray-400 border-2 border-transparent'}`}>1ª Pista (3pts)</span>
                                             <span className={`px-4 py-2 rounded-full text-sm font-bold ${currentClueIndex >= 1 ? 'bg-amber-100 border-2 border-amber-400 text-amber-700' : 'bg-gray-100 text-gray-400 border-2 border-transparent'}`}>2ª Pista (2pts)</span>
                                             <span className={`px-4 py-2 rounded-full text-sm font-bold ${currentClueIndex >= 2 ? 'bg-amber-100 border-2 border-amber-400 text-amber-700' : 'bg-gray-100 text-gray-400 border-2 border-transparent'}`}>3ª Pista (1pt)</span>
                                          </div>
                                          
                                          <div className="p-6 bg-white border-2 border-gray-100 rounded-xl shadow-sm w-full text-center space-y-4 relative min-h-[150px] flex flex-col justify-center">
                                              {gameQuestions[currentGameRound].clues?.slice(0, currentClueIndex + 1).map((clue: string, idx: number) => (
                                                  <p key={idx} className={`text-xl sm:text-2xl font-extrabold ${idx === currentClueIndex ? 'text-[#2D2D2D]' : 'text-gray-400 text-lg sm:text-xl'}`}>{clue}</p>
                                              ))}
                                          </div>
                                          
                                          <div className="h-6">
                                             {wrongFeedback && <p className="text-red-500 font-bold animate-bounce">{wrongFeedback}</p>}
                                          </div>

                                          <p className="font-bold my-2 text-lg">Vez de responder: <span className={currentPlayer === 1 ? 'text-[#4D96FF] border-b-2 border-[#4D96FF]' : 'text-[#FF6B6B] border-b-2 border-[#FF6B6B]'}>{currentPlayer === 1 ? player1 : player2}</span></p>
                                          
                                          <div className="flex flex-col items-center gap-2 mt-2 mb-4 p-4 border-4 border-dashed border-gray-200 bg-gray-50 rounded-2xl w-full">
                                             <p className="text-xs text-gray-500 uppercase tracking-widest font-extrabold text-center">Resposta (Apenas para o Mestre)</p>
                                             <p className="text-xl md:text-2xl font-black text-[#2D2D2D] uppercase tracking-wide bg-white px-6 py-2 rounded-xl border border-gray-100 shadow-sm text-center">{gameQuestions[currentGameRound].answer}</p>
                                          </div>

                                          <div className="flex w-full flex-col sm:flex-row gap-4 mt-2">
                                             <button onClick={() => checkAnswer(undefined, true)} className="flex-1 bg-[#6BCB77] text-white px-4 py-4 rounded-xl font-bold hover:brightness-105 hover:-translate-y-0.5 transition-all shadow-[0px_4px_0px_0px_rgba(0,0,0,0.1)] text-lg">👍 Acertou</button>
                                             <button onClick={() => checkAnswer(undefined, false)} className="flex-1 bg-[#FF6B6B] text-white px-4 py-4 rounded-xl font-bold hover:brightness-105 hover:-translate-y-0.5 transition-all shadow-[0px_4px_0px_0px_rgba(0,0,0,0.1)] text-lg">👎 Errou</button>
                                          </div>
                                       </div>
                                   )}
                                </div>
                             ) : (
                                <div className="flex w-full flex-col sm:flex-row gap-4 mt-8">
                                   <button onClick={() => handleCasalScore(1)} className="flex-1 bg-[#4D96FF] text-white px-6 py-6 rounded-xl font-black hover:brightness-105 hover:-translate-y-1 shadow-[0px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all text-xl">{player1}</button>
                                   <button onClick={() => handleCasalScore(2)} className="flex-1 bg-[#FF6B6B] text-white px-6 py-6 rounded-xl font-black hover:brightness-105 hover:-translate-y-1 shadow-[0px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all text-xl">{player2}</button>
                                </div>
                             )}
                          </div>
                       </div>
                    ) : (
                       <div className="flex flex-col w-full h-full justify-center items-center gap-6 py-10">
                          <h3 className="text-4xl font-extrabold text-[#4D96FF] mb-4">🏆 Fim de Jogo!</h3>
                          
                          <div className="flex justify-center items-center w-full max-w-3xl flex-wrap gap-4 px-2">
                             <div className="flex-1 bg-gray-100 p-6 rounded-3xl text-center font-bold min-w-[140px] max-w-[200px]">
                               <p className="text-gray-500 text-sm md:text-base mb-2 truncate" title={player1}>{player1}</p>
                               <span className="text-4xl">{score1}</span>
                             </div>
                             
                             <div className="text-2xl font-bold opacity-30 px-2">x</div>
                             
                             <div className="flex-1 bg-gray-100 p-6 rounded-3xl text-center font-bold min-w-[140px] max-w-[200px]">
                               <p className="text-gray-500 text-sm md:text-base mb-2 truncate" title={player2}>{player2}</p>
                               <span className="text-4xl">{score2}</span>
                             </div>
                             
                             {gameMode === 'tres_pistas' && (
                               <>
                                 <div className="text-2xl font-bold opacity-30 px-2">x</div>
                                 <div className="flex-1 bg-amber-100 border-2 border-amber-300 p-6 rounded-3xl text-center font-bold min-w-[140px] max-w-[200px] shadow-sm">
                                   <p className="text-amber-700 text-sm md:text-base mb-2">Plateia</p>
                                   <span className="text-4xl text-amber-700">{scorePlateia}</span>
                                 </div>
                               </>
                             )}
                          </div>
                          
                          <div className="mt-8 w-full">
                             {gameMode === 'casal' ? (
                                <div className="w-full max-w-3xl bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 text-left mt-4 mx-auto">
                                   <h4 className="text-2xl font-extrabold text-[#2D2D2D] mb-4 flex items-center justify-center gap-3"><Sparkles className="w-8 h-8 text-[#4D96FF]" /> Veredito do Casal</h4>
                                   {isGeneratingAnalysis ? (
                                      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                         <Loader2 className="w-10 h-10 animate-spin mb-4 text-[#FF6B6B]" />
                                         <p className="font-bold text-lg animate-pulse uppercase tracking-wider text-center">Analisando as escolhas de vocês...</p>
                                      </div>
                                   ) : (
                                      <div className="markdown-body prose prose-lg max-w-none prose-p:text-lg prose-p:leading-relaxed prose-headings:text-[#2D2D2D]">
                                         <ReactMarkdown>{casalAnalysis}</ReactMarkdown>
                                      </div>
                                   )}
                                </div>
                             ) : (
                               (() => {
                                const maxScore = Math.max(score1, score2, gameMode === 'tres_pistas' ? scorePlateia : -1);
                                const winners = [];
                                if (score1 === maxScore) winners.push(player1);
                                if (score2 === maxScore) winners.push(player2);
                                if (gameMode === 'tres_pistas' && scorePlateia === maxScore) winners.push('A Plateia');
                                
                                return (
                                   <p className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-[#FF6B6B] text-center drop-shadow-sm">
                                      {winners.length > 1 ? `Empate Histórico entre ${winners.join(' e ')}! 🤝` : `${winners[0]} venceu!! 👑`}
                                   </p>
                                );
                               })()
                             )}
                          </div>
                          
                          <button onClick={() => startGame(gameMode as any)} className="bg-[#2D2D2D] text-white mt-8 px-8 py-4 rounded-xl text-lg font-bold hover:bg-black hover:scale-105 transition-all shadow-lg">Jogar Novamente</button>
                       </div>
                    )}
                 </div>
               )}
             </div>
          ) : null}
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

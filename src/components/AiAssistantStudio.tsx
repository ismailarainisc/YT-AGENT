import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Zap,
  Copy,
  Check,
  Send,
  Wand2,
  ListOrdered,
  FileText,
  MessageSquare,
  Bot,
  User as UserIcon,
  Cpu,
  Layers,
  ShieldCheck,
  RefreshCw,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';
import { YouTubeChannel, AiProviderConfig, AiChatMessage } from '../types.ts';
import { ErrorNotice } from './ErrorNotice.tsx';
import { AppError } from '../utils/errorDiagnostics.ts';

interface AiAssistantStudioProps {
  channel: YouTubeChannel | null;
  onNavigateUpload?: () => void;
}

export const AiAssistantStudio: React.FC<AiAssistantStudioProps> = ({ channel }) => {
  const [activeMainTab, setActiveMainTab] = useState<'chat' | 'creator_tools' | 'orchestrator'>('chat');

  // Conversational Agent State
  const [chatMessages, setChatMessages] = useState<AiChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am your Multi-Agent Studio Assistant for ${channel?.title || 'your YouTube channel'}. I can help you analyze viewer comments, draft contextual replies, teach and manage resource links, optimize titles/SEO, or route requests through Gemini, OpenRouter, and NVIDIA NIM. How can I assist you today?`,
      provider: 'Google Gemini',
      model: 'gemini-3.8-flash',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Creative Tools State
  const [activeTool, setActiveTool] = useState<'titles' | 'description' | 'tags' | 'script' | 'community'>('titles');
  const [promptInput, setPromptInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Orchestrator State
  const [providers, setProviders] = useState<AiProviderConfig[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [updatingProviderId, setUpdatingProviderId] = useState<string | null>(null);
  const [editKeys, setEditKeys] = useState<{ [id: string]: string }>({});

  const [error, setError] = useState<AppError | null>(null);

  const fetchProviders = async () => {
    setLoadingProviders(true);
    try {
      const res = await fetch('/api/ai/providers');
      const data = await res.json();
      setProviders(data.providers || []);
    } catch (err) {
      console.warn('Notice fetching providers:', err);
    } finally {
      setLoadingProviders(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    if (activeMainTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeMainTab]);

  const handleSendChat = async (textToSend?: string) => {
    const message = (textToSend || chatInput).trim();
    if (!message || isChatSending) return;

    const userMsg: AiChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsChatSending(true);

    try {
      const historyPayload = chatMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      if (res.ok && data.text) {
        const assistantMsg: AiChatMessage = {
          id: 'asst_' + Date.now(),
          role: 'assistant',
          content: data.text,
          provider: data.provider || 'Gemini',
          model: data.model || 'gemini-3.8-flash',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || 'Failed to receive AI agent response.');
      }
    } catch (err: any) {
      const errorMsg: AiChatMessage = {
        id: 'err_' + Date.now(),
        role: 'system',
        content: `Error: ${err.message || 'Could not communicate with AI agent.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatSending(false);
    }
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunCreatorTool = async (e?: React.FormEvent) => {
    if (e?.preventDefault) e.preventDefault();
    if (!promptInput.trim()) return;

    setIsProcessing(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/ai/seo-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: promptInput.trim(),
          contentType: activeTool === 'script' ? 'short' : 'video',
          targetAudience: `Audience for ${channel?.title || 'YouTube Creator'} focused on ${activeTool}`,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const pkg = json.seoPackage;

        if (activeTool === 'titles') {
          setResult({
            titles: pkg.suggestedTitles || [
              `How to Master ${promptInput} (Complete Guide)`,
              `The Truth About ${promptInput} in 2026`,
              `I Tested ${promptInput} for 30 Days`,
            ],
            strategy: 'Curiosity gaps matched with search intent.',
          });
        } else if (activeTool === 'description') {
          setResult({
            description: pkg.description || `In this video, we explore ${promptInput} in depth.\n\nTimestamps:\n0:00 - Introduction\n1:20 - Fundamentals\n3:40 - Action Steps\n7:10 - Conclusion`,
          });
        } else if (activeTool === 'tags') {
          setResult({
            tags: pkg.tags || ['youtube creator', promptInput, 'tutorial 2026'],
            hashtags: pkg.hashtags || ['#' + promptInput.replace(/\s+/g, ''), '#CreatorStudio'],
          });
        } else if (activeTool === 'script') {
          setResult({
            hook: `If you are trying to understand ${promptInput}, stop doing what everyone else is doing. Here is the verified breakthrough.`,
            structure: [
              '0:00 - 0:05: High-energy pattern interrupt hook',
              '0:05 - 0:45: Problem framing and audience pain point',
              '0:45 - 3:00: Step-by-step breakdown & screen demo',
              '3:00 - 4:00: Call to action: Comment for resource link',
            ],
          });
        } else if (activeTool === 'community') {
          setResult({
            postText: `Quick question for everyone watching the recent videos on ${promptInput}: What is your biggest hurdle right now?\n\nDrop a comment below and I'll send you our cheat sheet!`,
            pollOptions: ['Understanding the setup', 'Executing consistently', 'Scaling results', 'Other (comment below)'],
          });
        }
      } else {
        throw new Error('Failed to generate creator asset.');
      }
    } catch (err: any) {
      setError({
        title: 'AI Generation Notice',
        operation: 'Generate Creator Asset',
        message: err.message || 'Could not complete generation request.',
        code: 'AI_STUDIO_FAILED',
        timestamp: new Date().toISOString(),
        suggestedFix: 'Check connection or adjust prompt text.',
        page: 'AI Studio',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveProviderKey = async (providerId: string) => {
    const key = editKeys[providerId];
    if (!key) return;

    setUpdatingProviderId(providerId);
    try {
      const res = await fetch('/api/ai/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          apiKey: key,
          isEnabled: 1,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProviders(data.providers);
        setEditKeys((prev) => ({ ...prev, [providerId]: '' }));
      }
    } catch (err) {
      console.warn('Update provider key error:', err);
    } finally {
      setUpdatingProviderId(null);
    }
  };

  const quickPrompts = [
    'How should I respond to viewers asking for project files?',
    'Review recent comment sentiment on our latest uploads',
    'Generate 3 high-retention video ideas for our audience',
    'What trigger keywords are currently in my Link Memory?',
  ];

  const tools = [
    { id: 'titles', label: 'Title Brainstormer', icon: Sparkles, desc: 'High-CTR, curiosity-driven YouTube titles' },
    { id: 'description', label: 'SEO Description & Chapters', icon: FileText, desc: 'Keyword-optimized descriptions & timestamps' },
    { id: 'tags', label: 'High-Ranking Tags', icon: ListOrdered, desc: 'Search-optimized tags and hashtags' },
    { id: 'script', label: 'Hook & Script Blueprint', icon: Wand2, desc: 'Retention-focused hooks & structure' },
    { id: 'community', label: 'Community Engagement', icon: MessageSquare, desc: 'Audience polls & community questions' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {error && (
        <ErrorNotice
          error={error}
          onRetry={handleRunCreatorTool}
          onDismiss={() => setError(null)}
          isRetrying={isProcessing}
        />
      )}

      {/* Top Header - Apple iOS Style */}
      <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-white">AI Assistant Studio</h2>
            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
              Orchestrator Online
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Intelligent multi-model agent backed by Google Gemini with automatic failover to OpenRouter, NVIDIA NIM, and Mistral.
          </p>
        </div>

        {/* Active Provider Badge */}
        <div className="flex items-center gap-2 text-xs bg-zinc-950/80 border border-zinc-800 px-3.5 py-2 rounded-2xl">
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-zinc-400">Primary:</span>
          <span className="font-semibold text-white">Google Gemini 3.8 Flash</span>
        </div>
      </div>

      {/* Apple-style Segmented Control */}
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <div className="inline-flex p-1.5 bg-zinc-900/90 backdrop-blur-md border border-zinc-800/80 rounded-2xl text-xs font-medium gap-1">
          <button
            onClick={() => setActiveMainTab('chat')}
            className={`min-h-[38px] px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeMainTab === 'chat'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-red-400" />
            <span>Interactive Copilot Chat</span>
          </button>
          <button
            onClick={() => setActiveMainTab('creator_tools')}
            className={`min-h-[38px] px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeMainTab === 'creator_tools'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Creative Content Lab</span>
          </button>
          <button
            onClick={() => setActiveMainTab('orchestrator')}
            className={`min-h-[38px] px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeMainTab === 'orchestrator'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Model Router & Failover ({providers.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Conversational Copilot Chat */}
      {activeMainTab === 'chat' && (
        <div className="rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 shadow-2xl flex flex-col h-[650px] overflow-hidden">
          {/* Chat Messages Log */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            {chatMessages.map((msg, idx) => (
              <div
                key={msg.id ? `msg-${msg.id}-${idx}` : `chat-msg-${idx}`}
                className={`flex gap-3 max-w-3xl ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                    msg.role === 'user'
                      ? 'bg-red-600 text-white'
                      : msg.role === 'system'
                      ? 'bg-amber-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                  }`}
                >
                  {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className="space-y-1 max-w-[85%]">
                  <div
                    className={`p-4 rounded-3xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-red-600 text-white rounded-tr-xs'
                        : msg.role === 'system'
                        ? 'bg-amber-950/60 text-amber-200 border border-amber-800/40 rounded-tl-xs'
                        : 'bg-zinc-950/90 text-zinc-200 border border-zinc-800/90 rounded-tl-xs whitespace-pre-wrap'
                    }`}
                  >
                    {msg.content}
                  </div>

                  <div
                    className={`flex items-center gap-1.5 text-[10px] text-zinc-500 px-2 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {msg.provider && (
                      <>
                        <span>·</span>
                        <span className="text-zinc-400">{msg.provider}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isChatSending && (
              <div className="flex gap-3 items-center text-xs text-zinc-400">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                </div>
                <span>Agent thinking with intelligent router...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Action Prompt Chips */}
          <div className="px-4 py-2 border-t border-zinc-800/80 bg-zinc-950/40 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 min-w-max">
              <span className="text-[10px] uppercase font-semibold text-zinc-500 mr-1">Suggestions:</span>
              {quickPrompts.map((prompt, i) => (
                <button
                  key={`quick-prompt-${i}`}
                  type="button"
                  onClick={() => handleSendChat(prompt)}
                  disabled={isChatSending}
                  className="px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[11px] border border-zinc-800 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/80">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask your assistant anything about your videos, comments, or strategy..."
                className="flex-1 min-h-[44px] px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
              <button
                type="submit"
                disabled={isChatSending || !chatInput.trim()}
                className="min-h-[44px] px-5 bg-red-600 hover:bg-red-500 active:scale-95 text-white rounded-2xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: Creative Content Lab */}
      {activeMainTab === 'creator_tools' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {tools.map((t) => {
              const Icon = t.icon;
              const isActive = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTool(t.id as any)}
                  className={`min-h-[64px] p-3 rounded-2xl border text-left transition-all ${
                    isActive
                      ? 'bg-zinc-800 border-zinc-700 text-white shadow-md'
                      : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1.5 ${isActive ? 'text-red-400' : 'text-zinc-500'}`} />
                  <div className="text-xs font-semibold truncate">{t.label}</div>
                </button>
              );
            })}
          </div>

          {/* Generator Form */}
          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 space-y-4">
            <form onSubmit={handleRunCreatorTool} className="space-y-4">
              <div className="space-y-1 text-xs">
                <label className="font-semibold text-zinc-300">Target Topic, Idea, or Question</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="e.g. 5 AI tools that automate YouTube channels in 2026"
                    className="flex-1 min-h-[44px] px-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !promptInput.trim()}
                    className="min-h-[44px] px-6 bg-red-600 hover:bg-red-500 active:scale-95 text-white rounded-2xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 shadow-md shadow-red-600/25"
                  >
                    <Sparkles className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                    <span>{isProcessing ? 'Generating...' : 'Generate with AI'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Generated Output Card */}
            {result && (
              <div className="pt-4 border-t border-zinc-800/80 space-y-4">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Generated Package</span>
                </h4>

                {result.titles && (
                  <div className="space-y-2">
                    {result.titles.map((t: string, idx: number) => (
                      <div
                        key={`title-${idx}`}
                        className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="text-white font-medium">{t}</span>
                        <button
                          onClick={() => handleCopy(`title_${idx}`, t)}
                          className="text-zinc-400 hover:text-white p-1.5 rounded-lg transition-colors shrink-0"
                        >
                          {copiedKey === `title_${idx}` ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {result.description && (
                  <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-zinc-400 text-[11px]">
                      <span>SEO Description</span>
                      <button
                        onClick={() => handleCopy('desc', result.description)}
                        className="hover:text-white flex items-center gap-1"
                      >
                        {copiedKey === 'desc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <pre className="text-zinc-300 font-sans whitespace-pre-wrap leading-relaxed">
                      {result.description}
                    </pre>
                  </div>
                )}

                {result.hook && (
                  <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3 text-xs">
                    <div>
                      <span className="text-zinc-400 text-[11px] font-semibold">High Retention Hook</span>
                      <p className="text-white mt-1 italic">&quot;{result.hook}&quot;</p>
                    </div>
                    {result.structure && (
                      <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                        <span className="text-zinc-400 text-[11px] font-semibold">Structure Timeline</span>
                        {result.structure.map((item: string, i: number) => (
                          <div key={`structure-${i}`} className="text-zinc-300 text-xs pl-2">
                            • {item}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {result.tags && (
                  <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-zinc-400 text-[11px]">
                      <span>Recommended Tags</span>
                      <button
                        onClick={() => handleCopy('tags', result.tags.join(', '))}
                        className="hover:text-white flex items-center gap-1"
                      >
                        {copiedKey === 'tags' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy All</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.tags.map((t: string, i: number) => (
                        <span key={`tag-${i}`} className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.postText && (
                  <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3 text-xs">
                    <div className="flex justify-between items-center text-zinc-400 text-[11px]">
                      <span>Community Post Draft</span>
                      <button
                        onClick={() => handleCopy('postText', result.postText)}
                        className="hover:text-white flex items-center gap-1"
                      >
                        {copiedKey === 'postText' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy Post</span>
                      </button>
                    </div>
                    <pre className="text-zinc-300 font-sans whitespace-pre-wrap leading-relaxed">
                      {result.postText}
                    </pre>

                    {result.pollOptions && (
                      <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                        <span className="text-zinc-400 text-[11px] font-semibold">Poll Options</span>
                        <div className="space-y-1">
                          {result.pollOptions.map((opt: string, optIdx: number) => (
                            <div key={`poll-${optIdx}`} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-mono flex items-center justify-center shrink-0">
                                {optIdx + 1}
                              </span>
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Multi-Provider Orchestrator Status */}
      {activeMainTab === 'orchestrator' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Universal AI Orchestration & Failover Pipeline</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Calls are automatically executed using our cost-efficient tiered cascade. If Google Gemini experiences a rate limit or transient network error, the system seamlessly cascades to OpenRouter, NVIDIA NIM, and Mistral without interrupting your operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map((p, pIdx) => {
              const pKey = p.provider_id || (p as any).providerId || p.id || `provider-${pIdx}`;
              const pName = p.provider_name || (p as any).providerName || (pKey === 'gemini' ? 'Google Gemini' : pKey === 'openrouter' ? 'OpenRouter' : pKey === 'nvidia' ? 'NVIDIA NIM' : pKey === 'mistral' ? 'Mistral AI' : pKey);
              const pModel = p.model_name || (p as any).modelName || 'gemini-3.8-flash';
              const pPriority = p.priority_order ?? (p as any).priorityOrder ?? (pIdx + 1);
              const pFailures = p.consecutive_failures ?? (p as any).failureCount ?? 0;
              const pMaskedKey = p.api_key_masked || (p as any).maskedKey;
              const pIsFreeTier = p.is_free_tier === 1 || Boolean((p as any).isFreeTier);

              return (
                <div
                  key={pKey}
                  className="p-5 rounded-3xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs">{pName}</span>
                        {pIsFreeTier && (
                          <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                            Free Tier Supported
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        Priority #{pPriority}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-400 space-y-1">
                      <div>
                        Default Model: <span className="text-zinc-200 font-mono">{pModel}</span>
                      </div>
                      <div>
                        Circuit Breaker: <span className="text-zinc-300">{pFailures} failures recorded</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Custom API Key Override</span>
                      <span>{pMaskedKey ? 'Key Configured' : 'Using Environment Key'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        placeholder="Optional provider key"
                        value={editKeys[pKey] || ''}
                        onChange={(e) =>
                          setEditKeys((prev) => ({ ...prev, [pKey]: e.target.value }))
                        }
                        className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                      />
                      <button
                        onClick={() => handleSaveProviderKey(pKey)}
                        disabled={updatingProviderId === pKey || !editKeys[pKey]}
                        className="min-h-[34px] px-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-40"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

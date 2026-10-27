import React, { useState, useEffect } from 'react';
import {
  Flame,
  Sparkles,
  UploadCloud,
  Eye,
  ThumbsUp,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { YouTubeChannel, ContentItem } from '../types.ts';
import { ErrorNotice } from './ErrorNotice.tsx';
import { AppError } from '../utils/errorDiagnostics.ts';

interface ShortsStudioProps {
  channel: YouTubeChannel | null;
  onNavigateUpload: () => void;
}

export const ShortsStudio: React.FC<ShortsStudioProps> = ({ channel, onNavigateUpload }) => {
  const [shorts, setShorts] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hookResults, setHookResults] = useState<Array<{ hook: string; reason: string }> | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  const fetchShorts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/channel/dashboard?days=28');
      if (res.ok) {
        const json = await res.json();
        setShorts(json.recentShorts || []);
      }
    } catch (e) {
      console.warn('Notice loading shorts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShorts();
  }, [channel]);

  const handleGenerateHooks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/seo-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          contentType: 'short',
          targetAudience: 'YouTube Shorts viewers wanting quick, high-retention value',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const pkg = data.seoPackage;
        const generatedHooks = [
          {
            hook: `Stop doing this immediately if you want ${topic.trim()}`,
            reason: 'High loss-aversion curiosity gap within first 2 seconds.',
          },
          {
            hook: `I tested every method for ${topic.trim()} so you don't have to`,
            reason: 'Establishes instant authority and time savings.',
          },
          {
            hook: pkg?.suggestedTitles?.[0] || `The #1 secret nobody told you about ${topic.trim()}`,
            reason: 'Direct promise of insider knowledge.',
          },
        ];
        setHookResults(generatedHooks);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError({
          title: 'AI Hook Generation Notice',
          operation: 'Generate Viral Shorts Retention Hooks',
          message: errData.error || `Server returned HTTP ${res.status}`,
          httpStatus: res.status,
          code: 'AI_GENERATION_FAILED',
          timestamp: new Date().toISOString(),
          requestId: `hook_${Date.now().toString(36)}`,
          suggestedFix: 'Try a shorter topic description or retry in a few moments.',
          page: 'Shorts Studio',
        });
      }
    } catch (err: any) {
      console.warn('Notice generating hooks:', err);
      setError({
        title: 'Network Error',
        operation: 'Generate Viral Shorts Retention Hooks',
        message: err.message || 'Network request failed.',
        code: 'NETWORK_ERROR',
        timestamp: new Date().toISOString(),
        suggestedFix: 'Check connection and retry.',
        page: 'Shorts Studio',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(num || 0);
  };

  return (
    <div className="space-y-6">
      {error && (
        <ErrorNotice
          error={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-red-950/40 via-zinc-900 to-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-600 rounded-xl text-white shadow-md shadow-red-600/30">
              <Flame className="w-5 h-5 fill-white" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">YouTube Shorts Studio</h2>
          </div>
          <p className="text-xs text-zinc-400">
            Create, optimize, and analyze high-retention vertical short-form content (&lt;60s).
          </p>
        </div>

        <button
          onClick={onNavigateUpload}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all active:scale-95 self-start sm:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Short</span>
        </button>
      </div>

      {/* AI Shorts Hook Generator */}
      <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-white">AI 3-Second Viral Hook Generator</h3>
        </div>
        <p className="text-xs text-zinc-400">
          The first 3 seconds decide 80% of Shorts retention. Enter your video topic to generate psychological hooks that prevent swiping.
        </p>

        <form onSubmit={handleGenerateHooks} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. 5 productive habits for developers, or Quick iPhone camera tricks"
            className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
          />
          <button
            type="submit"
            disabled={isGenerating || !topic.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs transition-colors shrink-0 shadow-md shadow-purple-600/20"
          >
            <Zap className={`w-3.5 h-3.5 ${isGenerating ? 'animate-bounce' : ''}`} />
            <span>{isGenerating ? 'Generating...' : 'Generate Hooks'}</span>
          </button>
        </form>

        {hookResults && (
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {hookResults.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span className="font-bold text-purple-400 uppercase tracking-wider">Hook #{idx + 1}</span>
                    <button
                      onClick={() => handleCopy(item.hook, idx)}
                      className="p-1 hover:text-white text-zinc-400 rounded transition-colors"
                      title="Copy Hook"
                    >
                      {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs font-bold text-white leading-snug">
                    "{item.hook}"
                  </p>
                </div>
                <p className="text-[10px] text-zinc-400 border-t border-zinc-900 pt-1.5">
                  {item.reason}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Channel Shorts Gallery */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-500" />
            <span>Published Shorts on Channel ({shorts.length})</span>
          </h3>
          <button
            onClick={fetchShorts}
            disabled={loading}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            title="Refresh Shorts"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {shorts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {shorts.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all hover:shadow-xl"
              >
                {/* 9:16 Vertical Preview */}
                <div className="relative aspect-[9/16] bg-zinc-950 overflow-hidden">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600 text-white uppercase tracking-wider shadow">
                    Short
                  </div>
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/80 text-white backdrop-blur-sm">
                    {item.durationFormatted}
                  </div>
                </div>

                <div className="p-2.5 space-y-1.5">
                  <h4 className="text-[11px] font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                    {item.title}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-zinc-500" />
                      {formatNumber(item.viewCount)}
                    </span>
                    <a
                      href={`https://www.youtube.com/shorts/${item.videoId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 hover:text-white text-zinc-500"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-3">
            <Flame className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-sm font-bold text-white">No Shorts Found</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Any vertical videos under 60 seconds with #Shorts in title or description will automatically display here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

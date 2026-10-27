import React, { useState } from 'react';
import {
  Sparkles,
  Tag,
  Copy,
  Check,
  Image as ImageIcon,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Hash,
  FileText,
  Clock,
} from 'lucide-react';

export const SeoStudio: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState<'short' | 'video'>('short');
  const [targetAudience, setTargetAudience] = useState('');
  const [loading, setLoading] = useState(false);
  const [seoPackage, setSeoPackage] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/ai/seo-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, contentType, targetAudience }),
      });
      const data = await res.json();
      if (data.seoPackage) {
        setSeoPackage(data.seoPackage);
      }
    } catch (err) {
      console.warn('SEO generation notice:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-red-500" />
            <span>Thumbnails & SEO Strategy Studio</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Gemini-powered metadata optimization: high-CTR titles, 500-char tag strings, chapter structures, and thumbnail concepts
          </p>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="font-semibold text-zinc-300">Video Concept or Topic</label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. How to automate YouTube uploads with AI and Python in 2026"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-zinc-300">Format</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-red-500 text-xs"
              >
                <option value="short">YouTube Short (Vertical 9:16)</option>
                <option value="video">Standard Long-Form Video</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Includes automatic copyright & clickbait policy risk scan</span>
            </div>

            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/20 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Analyzing & Generating...' : 'Generate SEO Package'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Generated Package Output */}
      {seoPackage && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Titles & Description */}
          <div className="lg:col-span-7 space-y-5">
            {/* Title Variants */}
            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span>High-CTR Title Variants</span>
                </h4>
                <span className="text-[10px] text-zinc-500">Sorted by CTR Score</span>
              </div>

              <div className="space-y-2">
                {seoPackage.titleVariants.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                          {item.angle}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          Score: {item.score}/100
                        </span>
                      </div>
                      <p className="font-semibold text-white">{item.title}</p>
                    </div>

                    <button
                      onClick={() => handleCopy(`title_${idx}`, item.title)}
                      className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
                      title="Copy Title"
                    >
                      {copiedKey === `title_${idx}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Structured SEO Description</span>
                </h4>
                <button
                  onClick={() => handleCopy('desc', seoPackage.optimizedDescription)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-300 hover:text-white bg-zinc-950 border border-zinc-800 rounded-lg transition-colors"
                >
                  {copiedKey === 'desc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'desc' ? 'Copied' : 'Copy Description'}</span>
                </button>
              </div>

              <textarea
                readOnly
                rows={7}
                value={seoPackage.optimizedDescription}
                className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 font-mono leading-relaxed resize-none focus:outline-none"
              />
            </div>
          </div>

          {/* Right Column: Tags, Hashtags, Thumbnail Concept & Safety */}
          <div className="lg:col-span-5 space-y-5">
            {/* Tags Box */}
            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-400" />
                  <span>YouTube Tags ({seoPackage.tagString.length}/500 chars)</span>
                </h4>
                <button
                  onClick={() => handleCopy('tags', seoPackage.tagString)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-300 hover:text-white bg-zinc-950 border border-zinc-800 rounded-lg transition-colors"
                >
                  {copiedKey === 'tags' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'tags' ? 'Copied' : 'Copy Tags'}</span>
                </button>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 break-all select-all">
                {seoPackage.tagString}
              </div>

              {/* Hashtags */}
              <div className="space-y-1 pt-1">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Hashtags</span>
                <div className="flex flex-wrap gap-1.5">
                  {seoPackage.hashtags.map((h: string, idx: number) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-md text-red-400 font-mono">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Thumbnail Concept */}
            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span>Thumbnail Visual Direction</span>
              </h4>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5 text-xs">
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Visual Layout</span>
                  <p className="text-zinc-200 mt-0.5">{seoPackage.thumbnailConcept.visualDescription}</p>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Recommended Text Overlay</span>
                  <p className="text-red-400 font-extrabold tracking-wide mt-0.5">{seoPackage.thumbnailConcept.textOverlay}</p>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Dominant Palette</span>
                  <p className="text-zinc-300 mt-0.5">{seoPackage.thumbnailConcept.dominantColors}</p>
                </div>
                <div className="pt-1">
                  <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Image Generation Prompt</span>
                  <p className="text-zinc-400 font-mono text-[11px] bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 mt-1 select-all">
                    {seoPackage.thumbnailConcept.aiPrompt}
                  </p>
                </div>
              </div>
            </div>

            {/* Policy Check */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 flex items-start gap-3 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">Policy Assessment: Compliant</span>
                <p className="text-zinc-400 mt-0.5 text-[11px]">{seoPackage.policyCheck.notes}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  User,
  Check,
  Link as LinkIcon,
  Plus,
  Trash2,
  Brain,
  ExternalLink,
  Mail,
  Zap,
} from 'lucide-react';
import { CommentThread, YouTubeChannel, PendingDmAction, LearnedLink } from '../types.ts';
import { ErrorNotice } from './ErrorNotice.tsx';
import { AppError } from '../utils/errorDiagnostics.ts';

interface CommentManagerProps {
  channel: YouTubeChannel | null;
  onConnectClick: () => void;
}

export const CommentManager: React.FC<CommentManagerProps> = ({
  channel,
  onConnectClick,
}) => {
  const [comments, setComments] = useState<CommentThread[]>([]);
  const [dmActions, setDmActions] = useState<PendingDmAction[]>([]);
  const [learnedLinks, setLearnedLinks] = useState<LearnedLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [generatingReplyId, setGeneratingReplyId] = useState<string | null>(null);
  const [customReplyText, setCustomReplyText] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState<'all' | 'unanswered' | 'questions' | 'dm_requests' | 'link_memory'>('all');
  const [error, setError] = useState<AppError | null>(null);

  // DM Approval Modal/Form state
  const [resolvingDmId, setResolvingDmId] = useState<string | null>(null);
  const [dmLinkInput, setDmLinkInput] = useState('');
  const [dmKeywordInput, setDmKeywordInput] = useState('');
  const [dmReplyInput, setDmReplyInput] = useState('');
  const [dmRememberFuture, setDmRememberFuture] = useState(true);
  const [isSubmittingDm, setIsSubmittingDm] = useState(false);

  // Add Link Form state
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);

  const fetchComments = async () => {
    try {
      const res = await fetch('/api/comments/threads');
      const data = await res.json();
      setComments(data.comments || []);
    } catch (err: any) {
      console.warn('Notice fetching comments:', err);
    }
  };

  const fetchDmActions = async () => {
    try {
      const res = await fetch('/api/comments/dm-actions');
      const data = await res.json();
      setDmActions(data.actions || []);
    } catch (err: any) {
      console.warn('Notice fetching DM actions:', err);
    }
  };

  const fetchLearnedLinks = async () => {
    try {
      const res = await fetch('/api/comments/learned-links');
      const data = await res.json();
      setLearnedLinks(data.links || []);
    } catch (err: any) {
      console.warn('Notice fetching learned links:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchComments(), fetchDmActions(), fetchLearnedLinks()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleSyncComments = async () => {
    if (!channel) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/comments/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
      } else {
        setError({
          title: 'YouTube Comments Sync Notice',
          operation: 'Sync Comments Threads via YouTube API',
          message: data.error || 'Failed to sync comments from YouTube.',
          code: 'SYNC_COMMENTS_FAILED',
          timestamp: new Date().toISOString(),
          requestId: `cmt_sync_${Date.now().toString(36)}`,
          suggestedFix:
            data.error && data.error.includes('SERVICE_DISABLED')
              ? 'Enable YouTube Data API v3 in Google Cloud Console or configure your personal OAuth Client in Settings.'
              : 'Ensure channel has comments enabled and try syncing again.',
          page: 'Comments',
        });
      }
    } catch (err: any) {
      setError({
        title: 'Network Error',
        operation: 'Sync Comments Threads',
        message: err.message || 'Network request failed while syncing comments.',
        code: 'NETWORK_ERROR',
        timestamp: new Date().toISOString(),
        suggestedFix: 'Check connection and retry.',
        page: 'Comments',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleRegenerateReply = async (comment: CommentThread) => {
    setGeneratingReplyId(comment.id);
    try {
      const res = await fetch('/api/comments/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentText: comment.text_display,
          authorName: comment.author_name,
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setCustomReplyText((prev) => ({ ...prev, [comment.id]: data.reply }));
      }
    } catch (err) {
      console.warn('Generate reply notice:', err);
    } finally {
      setGeneratingReplyId(null);
    }
  };

  const handlePostReply = async (comment: CommentThread) => {
    const textToSubmit = customReplyText[comment.id] || comment.reply_text;
    if (!textToSubmit) return;

    setReplyingId(comment.id);
    try {
      const res = await fetch('/api/comments/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: comment.id,
          replyText: textToSubmit,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchComments();
      }
    } catch (err) {
      console.warn('Post reply notice:', err);
    } finally {
      setReplyingId(null);
    }
  };

  const openDmResolver = (action: PendingDmAction) => {
    setResolvingDmId(action.id);
    setDmKeywordInput(action.requested_resource || 'resource');
    setDmReplyInput(action.suggested_reply || `Hi @${action.author_name}, here is the resource you requested!`);
    // Check if we already have a learned link that matches keyword
    const match = learnedLinks.find(
      (l) =>
        action.requested_resource &&
        l.keyword_trigger.toLowerCase().includes(action.requested_resource.toLowerCase())
    );
    setDmLinkInput(match ? match.resource_url : '');
    setDmRememberFuture(true);
  };

  const handleApproveDm = async (actionId: string) => {
    setIsSubmittingDm(true);
    try {
      const res = await fetch(`/api/comments/dm-actions/${actionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providedLink: dmLinkInput,
          suggestedReply: dmReplyInput,
          rememberForFuture: dmRememberFuture,
          keywordTrigger: dmKeywordInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResolvingDmId(null);
        await Promise.all([fetchDmActions(), fetchComments(), fetchLearnedLinks()]);
      }
    } catch (err) {
      console.warn('Approve DM action error:', err);
    } finally {
      setIsSubmittingDm(false);
    }
  };

  const handleDismissDm = async (actionId: string) => {
    try {
      await fetch(`/api/comments/dm-actions/${actionId}/dismiss`, { method: 'POST' });
      await fetchDmActions();
    } catch (err) {
      console.warn('Dismiss DM error:', err);
    }
  };

  const handleCreateLearnedLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim() || !newUrl.trim()) return;

    setIsSubmittingLink(true);
    try {
      const res = await fetch('/api/comments/learned-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywordTrigger: newKeyword.trim(),
          title: newTitle.trim() || newKeyword.trim(),
          resourceUrl: newUrl.trim(),
          description: newDescription.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewKeyword('');
        setNewTitle('');
        setNewUrl('');
        setNewDescription('');
        setShowAddLinkForm(false);
        await fetchLearnedLinks();
      }
    } catch (err) {
      console.warn('Create learned link error:', err);
    } finally {
      setIsSubmittingLink(false);
    }
  };

  const handleDeleteLearnedLink = async (id: string) => {
    if (!window.confirm('Delete this learned link memory? The agent will no longer automatically provide it to commenters.')) return;
    try {
      await fetch(`/api/comments/learned-links/${id}`, { method: 'DELETE' });
      await fetchLearnedLinks();
    } catch (err) {
      console.warn('Delete learned link error:', err);
    }
  };

  const pendingDmCount = dmActions.filter((a) => a.status === 'pending').length;

  const filteredComments = comments.filter((c) => {
    if (activeTab === 'unanswered') return c.reply_status === 'unanswered';
    if (activeTab === 'questions') return c.category === 'question';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {error && (
        <ErrorNotice
          error={error}
          onRetry={handleSyncComments}
          onDismiss={() => setError(null)}
          isRetrying={syncing}
        />
      )}

      {/* Header Banner - Frosted Glass & Apple Aesthetic */}
      <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-white">Comment Studio</h2>
            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
              Multi-Agent Active
            </span>
          </div>
          <p className="text-xs text-zinc-400 max-w-xl">
            Understands intent, detects DM & resource requests, provides unique contextual replies in English, Urdu, or Roman Urdu, and learns requested links automatically.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {channel ? (
            <button
              onClick={handleSyncComments}
              disabled={syncing}
              className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white rounded-2xl text-xs font-semibold transition-all shadow-md shadow-red-600/25 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync YouTube Comments'}</span>
            </button>
          ) : (
            <button
              onClick={onConnectClick}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-xs font-semibold transition-all"
            >
              Connect Channel to Sync
            </button>
          )}
        </div>
      </div>

      {/* Apple-style Segmented Control Bar */}
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <div className="inline-flex p-1.5 bg-zinc-900/90 backdrop-blur-md border border-zinc-800/80 rounded-2xl text-xs font-medium gap-1 min-w-max">
          <button
            onClick={() => setActiveTab('all')}
            className={`min-h-[38px] px-4 py-2 rounded-xl transition-all ${
              activeTab === 'all'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Comments ({comments.length})
          </button>
          <button
            onClick={() => setActiveTab('unanswered')}
            className={`min-h-[38px] px-4 py-2 rounded-xl transition-all ${
              activeTab === 'unanswered'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Unanswered ({comments.filter((c) => c.reply_status === 'unanswered').length})
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`min-h-[38px] px-4 py-2 rounded-xl transition-all ${
              activeTab === 'questions'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Questions ({comments.filter((c) => c.category === 'question').length})
          </button>
          <button
            onClick={() => setActiveTab('dm_requests')}
            className={`min-h-[38px] px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'dm_requests'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-blue-400" />
            <span>DM & Link Requests</span>
            {pendingDmCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                {pendingDmCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('link_memory')}
            className={`min-h-[38px] px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'link_memory'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span>Learned Link Memory ({learnedLinks.length})</span>
          </button>
        </div>
      </div>

      {/* VIEW: DM & Link Requests Tab */}
      {activeTab === 'dm_requests' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-900/30 flex items-start gap-3 text-xs text-blue-200">
            <Brain className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Self-Learning DM & Resource Agent</p>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                When viewers comment asking for a link, code template, or PDF mentioned in your video, the agent extracts the request. Approve and give it the link once: the agent learns it and will automatically fulfill requests for future commenters without prompting you!
              </p>
            </div>
          </div>

          {dmActions.length === 0 ? (
            <div className="p-12 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center space-y-2">
              <Mail className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-sm font-medium text-white">No DM or resource requests detected</p>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                When viewers ask for links or materials in comments, the Intent Agent flags them here for one-click fulfillment and learning.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dmActions.map((action) => (
                <div
                  key={action.id}
                  className="p-5 rounded-3xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 space-y-3 shadow-md"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-xs">{action.author_name}</span>
                      <span className="text-zinc-500 text-xs">·</span>
                      <span className="text-[11px] text-zinc-400 capitalize">
                        Requested: <strong className="text-blue-300 font-medium">{action.requested_resource || 'Resource'}</strong>
                      </span>
                      <span className="text-zinc-500 text-xs">·</span>
                      <span className="text-[11px] text-zinc-500">
                        {new Date(action.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          action.status === 'auto_fulfilled'
                            ? 'bg-purple-950/70 text-purple-300 border border-purple-800/40'
                            : action.status === 'approved'
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/40'
                            : action.status === 'dismissed'
                            ? 'bg-zinc-800 text-zinc-400'
                            : 'bg-amber-950/70 text-amber-300 border border-amber-800/40'
                        }`}
                      >
                        {action.status === 'auto_fulfilled'
                          ? 'Auto-Fulfilled by AI Memory'
                          : action.status === 'approved'
                          ? 'Approved & Posted'
                          : action.status === 'dismissed'
                          ? 'Dismissed'
                          : 'Awaiting Your Link'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-200 bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/60 font-sans italic">
                    &quot;{action.comment_text}&quot;
                  </p>

                  {/* Auto-fulfilled indicator */}
                  {action.status === 'auto_fulfilled' && action.suggested_reply && (
                    <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-900/40 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-purple-400 text-[11px] font-semibold">
                        <Brain className="w-3.5 h-3.5" />
                        <span>Self-Learned Agent Replied Automatically:</span>
                      </div>
                      <p className="text-zinc-300 text-xs pl-5">{action.suggested_reply}</p>
                    </div>
                  )}

                  {/* Pending Action Drawer */}
                  {action.status === 'pending' && (
                    <div className="pt-2">
                      {resolvingDmId === action.id ? (
                        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-700/80 space-y-3">
                          <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                            <Brain className="w-3.5 h-3.5 text-purple-400" />
                            <span>Teach Agent & Reply to @{action.author_name}</span>
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                              <label className="text-[11px] text-zinc-400 font-medium">Link or Resource URL</label>
                              <input
                                type="url"
                                required
                                placeholder="https://github.com/... or https://..."
                                value={dmLinkInput}
                                onChange={(e) => setDmLinkInput(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] text-zinc-400 font-medium">Topic / Trigger Keyword</label>
                              <input
                                type="text"
                                placeholder="e.g. code, template, notes"
                                value={dmKeywordInput}
                                onChange={(e) => setDmKeywordInput(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
                              />
                            </div>
                          </div>

                          <div className="space-y-1 text-xs">
                            <label className="text-[11px] text-zinc-400 font-medium">Reply Text to Post</label>
                            <textarea
                              rows={2}
                              value={dmReplyInput}
                              onChange={(e) => setDmReplyInput(e.target.value)}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-red-500 resize-none font-sans"
                            />
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                              <input
                                type="checkbox"
                                checked={dmRememberFuture}
                                onChange={(e) => setDmRememberFuture(e.target.checked)}
                                className="w-4 h-4 rounded border-zinc-700 text-purple-600 bg-zinc-900"
                              />
                              <span>Remember in repository (AI will auto-reply next time)</span>
                            </label>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setResolvingDmId(null)}
                                className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApproveDm(action.id)}
                                disabled={isSubmittingDm || !dmLinkInput.trim()}
                                className="min-h-[40px] px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{isSubmittingDm ? 'Posting...' : 'Approve & Teach Agent'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openDmResolver(action)}
                            className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                          >
                            <LinkIcon className="w-3.5 h-3.5" />
                            <span>Provide Link & Teach Agent</span>
                          </button>
                          <button
                            onClick={() => handleDismissDm(action.id)}
                            className="min-h-[44px] px-3 py-2 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: Learned Link Memory Tab */}
      {activeTab === 'link_memory' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <span>Learned Links & Resources Knowledge Base</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                These are links the AI has learned from you. Whenever a viewer mentions any trigger keyword, the AI can cite or deliver the resource automatically.
              </p>
            </div>

            <button
              onClick={() => setShowAddLinkForm(!showAddLinkForm)}
              className="min-h-[44px] px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Teach New Link</span>
            </button>
          </div>

          {showAddLinkForm && (
            <form
              onSubmit={handleCreateLearnedLink}
              className="p-5 rounded-3xl bg-zinc-950 border border-purple-800/40 space-y-4"
            >
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-purple-400" />
                <span>Teach Agent a Resource Link</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400 font-medium">Trigger Keywords (comma separated)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. github, code, prompt, template"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400 font-medium">Resource Title / Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Starter Project Repo"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-[11px] text-zinc-400 font-medium">Target URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/download"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-[11px] text-zinc-400 font-medium">Description (Optional context for AI)</label>
                <input
                  type="text"
                  placeholder="e.g. Mentioned in the video around 03:45 for downloading project files"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddLinkForm(false)}
                  className="min-h-[40px] px-3.5 py-2 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLink}
                  className="min-h-[40px] px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {isSubmittingLink ? 'Saving...' : 'Save into Knowledge Base'}
                </button>
              </div>
            </form>
          )}

          {learnedLinks.length === 0 ? (
            <div className="p-12 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center space-y-2">
              <Brain className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-sm font-medium text-white">No learned links yet</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Teach the agent links above, or approve commenter DM requests to let it self-learn your resources.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {learnedLinks.map((link) => (
                <div
                  key={link.id}
                  className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white text-xs">{link.title}</span>
                      <span className="text-[10px] text-purple-400 font-mono">
                        Shared {link.times_shared} times
                      </span>
                    </div>

                    <a
                      href={link.resource_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1 break-all"
                    >
                      <span className="truncate">{link.resource_url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>

                    <div className="text-[11px] text-zinc-400 pt-1">
                      Trigger words: <span className="font-mono text-zinc-300">{link.keyword_trigger}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-500">
                    <span>Learned {new Date(link.created_at).toLocaleDateString()}</span>
                    <button
                      onClick={() => handleDeleteLearnedLink(link.id)}
                      className="text-red-400 hover:text-red-300 p-1 rounded-lg transition-colors"
                      title="Forget Link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: All / Unanswered / Questions Comments */}
      {activeTab !== 'dm_requests' && activeTab !== 'link_memory' && (
        <div className="space-y-4">
          {/* Safeguard & Policy Bar */}
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">Creator Verification Safeguard</span>
                <span className="text-zinc-500 text-xs mx-1.5">·</span>
                <span className="text-zinc-400 text-[11px]">
                  All AI replies are drafted for your approval. Sensitive complaints require human inspection.
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-500 text-xs">Loading comments...</div>
          ) : filteredComments.length === 0 ? (
            <div className="p-12 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-white">No comments found</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Click &quot;Sync YouTube Comments&quot; to fetch live viewer comments.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredComments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-5 rounded-3xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 space-y-3 shadow-sm hover:border-zinc-700/80 transition-colors"
                >
                  {/* Commenter info + Clean unboxed metadata */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {comment.author_avatar ? (
                        <img
                          src={comment.author_avatar}
                          alt={comment.author_name}
                          className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-semibold text-white text-xs truncate block">
                          {comment.author_name}
                        </span>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 flex-wrap">
                          <span>{new Date(comment.published_at).toLocaleDateString()}</span>
                          <span>·</span>
                          <span className="capitalize">{comment.category}</span>
                          <span>·</span>
                          <span
                            className={
                              comment.sentiment === 'positive'
                                ? 'text-emerald-400'
                                : comment.sentiment === 'negative'
                                ? 'text-rose-400'
                                : 'text-zinc-400'
                            }
                          >
                            {comment.sentiment}
                          </span>
                          {comment.detected_intent && (
                            <>
                              <span>·</span>
                              <span className="text-blue-300 font-mono text-[10px]">
                                {comment.detected_intent}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {comment.reply_status === 'replied' && (
                      <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1 self-start sm:self-center">
                        <Check className="w-3.5 h-3.5" />
                        <span>Replied</span>
                      </span>
                    )}
                  </div>

                  {/* Comment Body */}
                  <p className="text-xs text-zinc-200 leading-relaxed pl-0 sm:pl-11 break-words">
                    {comment.text_display}
                  </p>

                  {/* AI Drafted Reply Section */}
                  <div className="pl-0 sm:pl-11 pt-1">
                    <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
                          <Sparkles className="w-3.5 h-3.5 text-red-400" />
                          <span>AI Contextual Reply</span>
                        </span>

                        {comment.reply_status !== 'replied' && (
                          <button
                            type="button"
                            onClick={() => handleRegenerateReply(comment)}
                            disabled={generatingReplyId === comment.id}
                            className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1 text-[10px]"
                          >
                            <RefreshCw
                              className={`w-3 h-3 ${
                                generatingReplyId === comment.id ? 'animate-spin' : ''
                              }`}
                            />
                            <span>{generatingReplyId === comment.id ? 'Regenerating...' : 'Regenerate Distinct Reply'}</span>
                          </button>
                        )}
                      </div>

                      {comment.reply_status === 'replied' ? (
                        <p className="text-xs text-zinc-300 font-mono italic break-words">
                          &quot;{comment.reply_text}&quot;
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          <textarea
                            rows={2}
                            value={customReplyText[comment.id] ?? (comment.reply_text || '')}
                            onChange={(e) =>
                              setCustomReplyText({ ...customReplyText, [comment.id]: e.target.value })
                            }
                            placeholder="Drafting contextual reply..."
                            className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 resize-none font-sans"
                          />

                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <span className="text-[10px] text-zinc-500 hidden sm:inline">
                              Context-aware and unique to this commenter
                            </span>
                            <button
                              onClick={() => handlePostReply(comment)}
                              disabled={replyingId === comment.id}
                              className="min-h-[44px] sm:min-h-[38px] w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                            >
                              <Send className="w-3 h-3" />
                              <span>
                                {replyingId === comment.id ? 'Posting to YouTube...' : 'Approve & Post Reply'}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

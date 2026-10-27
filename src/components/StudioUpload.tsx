import React, { useState, useRef } from 'react';
import {
  Upload,
  Sparkles,
  Video,
  Play,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Layers,
  Clock,
  Calendar,
  Tag,
  Languages,
  Eye,
  Lock,
  Globe,
  ArrowRight,
  Info,
  Check,
  Link as LinkIcon,
  MessageSquare,
  Sliders,
  UserCheck,
} from 'lucide-react';
import { ExecutionPlan, PolicyResult, YouTubeChannel } from '../types.ts';
import { ErrorNotice } from './ErrorNotice.tsx';

interface StudioUploadProps {
  channel: YouTubeChannel | null;
  onJobEnqueued: (jobId: string) => void;
  onConnectClick: () => void;
}

export const StudioUpload: React.FC<StudioUploadProps> = ({
  channel,
  onJobEnqueued,
  onConnectClick,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isVertical, setIsVertical] = useState<boolean>(false);
  const [uploadedServerPath, setUploadedServerPath] = useState<string | null>(null);

  // Instruction & AI state
  const [instruction, setInstruction] = useState<string>('');
  const [isAutonomous, setIsAutonomous] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Generated Plan & Form Edit state
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [policy, setPolicy] = useState<PolicyResult | null>(null);
  const [editableTitle, setEditableTitle] = useState<string>('');
  const [editableDescription, setEditableDescription] = useState<string>('');
  const [editableTags, setEditableTags] = useState<string>('');
  const [editableHashtags, setEditableHashtags] = useState<string>('');
  const [editablePrivacy, setEditablePrivacy] = useState<'private' | 'unlisted' | 'public'>('public');
  const [editablePublishAt, setEditablePublishAt] = useState<string>('');
  const [editableCategory, setEditableCategory] = useState<string>('27');
  const [editableMadeForKids, setEditableMadeForKids] = useState<boolean>(false);
  const [editableIsShort, setEditableIsShort] = useState<boolean>(false);
  const [allowPublicOverride, setAllowPublicOverride] = useState<boolean>(true);

  // Pre-Analysis Direct YouTube Publishing Controls
  const [targetPrivacy, setTargetPrivacy] = useState<'public' | 'private' | 'unlisted' | 'auto'>('public');
  const [targetKids, setTargetKids] = useState<'none' | 'no' | 'yes'>('none');
  const [targetComments, setTargetComments] = useState<'allow_all' | 'hold_inappropriate' | 'disabled'>('allow_all');
  const [descriptionStyle, setDescriptionStyle] = useState<'viral_long' | 'standard' | 'short'>('viral_long');
  const [customLinks, setCustomLinks] = useState<string>('https://youtube.com/@IslamNoorae');
  const [targetRecordingDate, setTargetRecordingDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // File selection handler
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|webm|mkv|avi)$/i)) {
      setAnalysisError('Please choose a valid video file (MP4, MOV, WebM, MKV).');
      return;
    }

    setSelectedFile(file);
    setAnalysisError(null);
    setPlan(null);
    setUploadedServerPath(null);

    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);

    // Read metadata
    const videoElement = document.createElement('video');
    videoElement.src = url;
    videoElement.onloadedmetadata = () => {
      setVideoDuration(Math.round(videoElement.duration));
      const vertical = videoElement.videoHeight > videoElement.videoWidth;
      setIsVertical(vertical);
      if (vertical || videoElement.duration <= 60) {
        setEditableIsShort(true);
      }
    };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Preset prompts
  const presets = [
    {
      label: 'وائرل پبلک شارٹ (ملینز ویوز)',
      text: 'اس ویڈیو کو یوٹیوب شارٹ کے طور پر 100% پبلک اپلوڈ کریں۔ دل کو چھو لینے والا پرکشش سبق آموز ٹائٹل، خوبصورت تفصیلی ڈسکرپشن، ہائی سرچ ٹیگز اور وائرل ہیش ٹیگز لگائیں۔ کمنٹس آن رکھیں۔',
    },
    {
      label: 'Viral Public Short (Urdu & English)',
      text: 'Upload as a viral YouTube Short strictly Public. Create a high-CTR emotional Urdu/English title, rich engaging story description, top trending search tags, and viral hashtags.',
    },
    {
      label: 'تفصیلی اسلامی ویڈیو (پبلک)',
      text: 'مکمل ویڈیو کے طور پر پبلک اپلوڈ کریں۔ لمبا اور گہرا سبق آموز ڈسکرپشن لکھیں، چینل کا لنک اور اہم ہیش ٹیگز شامل کریں اور کمنٹس کو آن رکھیں۔',
    },
    {
      label: 'Schedule Tomorrow (6 PM Public)',
      text: 'Upload video with high-ranking SEO tags and catchy title, schedule publication for tomorrow at 6:00 PM Public.',
    },
  ];

  // Analyze Instruction & Generate Execution Plan
  const handleAnalyzeInstruction = async () => {
    if (!selectedFile) {
      setAnalysisError('Please select a video file first.');
      return;
    }

    if (!instruction.trim()) {
      setAnalysisError('Please enter instructions for the AI Agent.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // 1. Upload video file to server temporary store
      let serverPath = uploadedServerPath;
      if (!serverPath) {
        setUploadProgress(15);
        const formData = new FormData();
        formData.append('video', selectedFile);

        const uploadRes = await fetch('/api/upload/file', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || 'Failed to upload video to server.');
        }

        const uploadData = await uploadRes.json();
        serverPath = uploadData.file.path;
        setUploadedServerPath(serverPath);
        setUploadProgress(40);
      }

      // 2. Request AI Plan from Gemini with User Preferences
      const planRes = await fetch('/api/ai/parse-instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction,
          filename: selectedFile.name,
          duration: videoDuration,
          isVertical,
          fileSize: selectedFile.size,
          preferences: {
            forcedPrivacy: targetPrivacy,
            madeForKids: targetKids,
            commentsPolicy: targetComments,
            descriptionLength: descriptionStyle,
            customLinks,
            channelName: channel?.title || 'IslamNoorae',
          },
        }),
      });

      if (!planRes.ok) {
        const planErr = await planRes.json();
        throw new Error(planErr.error || 'Failed to parse instruction.');
      }

      const { plan: generatedPlan, policy: evaluatedPolicy } = await planRes.json();

      setPlan(generatedPlan);
      setPolicy(evaluatedPolicy);

      // Populate editable fields strictly adhering to user settings
      setEditableTitle(generatedPlan.title);
      setEditableDescription(generatedPlan.description);
      setEditableTags(generatedPlan.tags.join(', '));
      setEditableHashtags(generatedPlan.hashtags.join(' '));

      const effectivePrivacy = targetPrivacy !== 'auto' ? targetPrivacy : evaluatedPolicy.sanitizedPrivacy;
      setEditablePrivacy(effectivePrivacy);
      if (effectivePrivacy === 'public') {
        setAllowPublicOverride(true);
      }

      setEditableCategory(generatedPlan.categoryId);
      setEditableMadeForKids(targetKids === 'yes' ? true : targetKids === 'no' ? false : generatedPlan.madeForKids);
      setEditableIsShort(generatedPlan.isShort);

      if (generatedPlan.scheduledTime) {
        try {
          const d = new Date(generatedPlan.scheduledTime);
          if (!isNaN(d.getTime())) {
            const pad = (n: number) => n.toString().padStart(2, '0');
            const localStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            setEditablePublishAt(localStr);
          }
        } catch (e) {
          setEditablePublishAt('');
        }
      } else {
        setEditablePublishAt('');
      }

      setUploadProgress(100);

      // If autonomous mode, submit immediately
      if (isAutonomous && serverPath) {
        await executeFinalSubmission(serverPath, generatedPlan, evaluatedPolicy.sanitizedPrivacy);
      }
    } catch (err: any) {
      setAnalysisError(err.message || 'Error parsing instruction');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit and Enqueue
  const executeFinalSubmission = async (
    filePathToUse: string,
    planToUse: ExecutionPlan,
    privacyToUse: 'private' | 'unlisted' | 'public'
  ) => {
    setIsUploading(true);
    setAnalysisError(null);

    try {
      const scheduledIso = editablePublishAt
        ? new Date(editablePublishAt).toISOString()
        : planToUse.scheduledTime
        ? new Date(planToUse.scheduledTime).toISOString()
        : null;

      const res = await fetch('/api/upload/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: filePathToUse,
          originalFilename: selectedFile?.name || 'video.mp4',
          title: editableTitle || planToUse.title,
          description: editableDescription || planToUse.description,
          tags: editableTags.split(',').map((t) => t.trim()).filter(Boolean),
          hashtags: editableHashtags.split(' ').map((h) => h.trim()).filter(Boolean),
          categoryId: editableCategory,
          privacyStatus: editablePrivacy,
          publishAt: scheduledIso,
          madeForKids: editableMadeForKids,
          isShort: editableIsShort,
          duration: videoDuration,
          autonomousMode: isAutonomous,
          allowPublicOverride: editablePrivacy === 'public' || allowPublicOverride,
          recordingDate: targetRecordingDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to enqueue job');
      }

      onJobEnqueued(data.jobId);

      // Reset
      setSelectedFile(null);
      setVideoPreviewUrl(null);
      setPlan(null);
      setInstruction('');
      setUploadedServerPath(null);
      setEditablePublishAt('');
    } catch (err: any) {
      setAnalysisError(err.message || 'Failed to submit upload job');
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualSubmit = () => {
    if (!uploadedServerPath || !plan) return;
    executeFinalSubmission(uploadedServerPath, plan, editablePrivacy);
  };

  return (
    <div className="space-y-6">
      {!channel && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>YouTube channel not connected. Connect your Google account to enable live publishing.</span>
          </div>
          <button
            onClick={onConnectClick}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
          >
            Connect Channel
          </button>
        </div>
      )}

      {/* Main Grid: Upload Dropzone + Natural-Language Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: File Picker & Video Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-red-500" />
                <span>Upload Video</span>
              </h3>
              {videoPreviewUrl && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-zinc-400 hover:text-white underline"
                >
                  Change Video
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            {!videoPreviewUrl ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-800 hover:border-red-500/60 rounded-2xl p-8 text-center cursor-pointer transition-all bg-zinc-950/40 hover:bg-zinc-950/80 group"
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-900 group-hover:bg-red-600/10 border border-zinc-800 group-hover:border-red-500/30 flex items-center justify-center text-zinc-400 group-hover:text-red-500 mx-auto transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-semibold text-white">Click or drag video here</p>
                  <p className="text-[11px] text-zinc-500">
                    Supports MP4, MOV, WebM, MKV (Desktop, iPhone, Android)
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-zinc-800">
                  <video
                    src={videoPreviewUrl}
                    controls
                    className="max-h-full max-w-full rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate max-w-[180px]">
                      {selectedFile?.name}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{((selectedFile?.size || 0) / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {editableIsShort ? (
                      <span className="text-[11px] font-semibold text-red-400 bg-red-950/40 border border-red-800/40 px-2 py-0.5 rounded-md">
                        YouTube Short
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-md">
                        Long-Form
                      </span>
                    )}
                    <span>{videoDuration}s</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Natural-Language Instruction Box */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-red-500" />
                  <span>Natural-Language Instruction Engine</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Write requests in English, Urdu (اردو), or Roman Urdu
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setIsAutonomous(false)}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    !isAutonomous ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Review Mode
                </button>
                <button
                  type="button"
                  onClick={() => setIsAutonomous(true)}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    isAutonomous ? 'bg-red-600 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Autonomous Mode
                </button>
              </div>
            </div>

            {/* Instruction Textarea */}
            <div className="space-y-2">
              <textarea
                rows={4}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Example: Upload this video as a YouTube Short. Write a professional title, description, relevant hashtags, and tags. Keep the video Private. Never publish it publicly."
                className="w-full p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 leading-relaxed resize-none"
              />

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-zinc-500 mr-1 flex items-center gap-1">
                  <Languages className="w-3 h-3" />
                  Templates:
                </span>
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInstruction(p.text)}
                    className="text-[11px] text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-800 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* YouTube Direct Publishing & Audience Controls (یوٹیوب کنٹرولز) */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-3.5">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-bold text-white tracking-tight">
                    YouTube Publishing & Audience Controls (آڈینس اور پبلشنگ کنٹرولز)
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full font-medium">
                  100% Authentic YouTube Sync
                </span>
              </div>

              {/* 1. Target Visibility */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Visibility Status (ویڈیو اسٹیٹس):</span>
                  </label>
                  <span className="text-[10px] text-zinc-400">
                    {targetPrivacy === 'public'
                      ? '🟢 100% پبلک (فوری طور پر دنیا کے لیے لائیو)'
                      : targetPrivacy === 'private'
                      ? '🔒 پرائیویٹ'
                      : targetPrivacy === 'unlisted'
                      ? '🔗 ان لسٹڈ'
                      : '🤖 پرامپٹ کے مطابق'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetPrivacy('public')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all ${
                      targetPrivacy === 'public'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    <span>Public (پبلک)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetPrivacy('unlisted')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all ${
                      targetPrivacy === 'unlisted'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Unlisted (ان لسٹڈ)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetPrivacy('private')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all ${
                      targetPrivacy === 'private'
                        ? 'bg-zinc-700 text-white shadow-md'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    <Lock className="w-3 h-3" />
                    <span>Private (پرائیویٹ)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetPrivacy('auto')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all ${
                      targetPrivacy === 'auto'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>From Prompt</span>
                  </button>
                </div>
              </div>

              {/* 2. Made for Kids (COPPA) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Made for Kids (کیا یہ ویڈیو بچوں کے لیے ہے؟):</span>
                  </label>
                  <span className="text-[10px] text-zinc-400">
                    {targetKids === 'none'
                      ? '✨ نن (None - خودکار ڈیٹیکشن)'
                      : targetKids === 'no'
                      ? 'عام ناظرین (Not for kids)'
                      : 'بچوں کے لیے (Made for kids)'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetKids('none')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      targetKids === 'none'
                        ? 'bg-zinc-200 text-zinc-950 font-bold shadow-xs'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    None / Auto (نن)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetKids('no')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      targetKids === 'no'
                        ? 'bg-red-600 text-white font-bold shadow-xs'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    No, Not for kids (نہیں)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetKids('yes')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      targetKids === 'yes'
                        ? 'bg-amber-600 text-white font-bold shadow-xs'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    Yes, for kids (ہاں)
                  </button>
                </div>
              </div>

              {/* 3. Comments Policy, Description Style & Recording Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Comments */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Comments (کمنٹس):</span>
                  </label>
                  <select
                    value={targetComments}
                    onChange={(e: any) => setTargetComments(e.target.value)}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="allow_all">Allow all comments (کمنٹس آن)</option>
                    <option value="hold_inappropriate">Hold inappropriate (ریویو)</option>
                    <option value="disabled">Disable comments (کمنٹس آف)</option>
                  </select>
                </div>

                {/* Description Style */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Description (ڈسکرپشن):</span>
                  </label>
                  <select
                    value={descriptionStyle}
                    onChange={(e: any) => setDescriptionStyle(e.target.value)}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="viral_long">Viral & Detailed (ملینز ویوز)</option>
                    <option value="standard">Standard YouTube (معیاری)</option>
                    <option value="short">Short & Punchy (مختصر)</option>
                  </select>
                </div>

                {/* Recording Date */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Recording Date (تاریخ ریکارڈنگ):</span>
                  </label>
                  <input
                    type="date"
                    value={targetRecordingDate}
                    onChange={(e) => setTargetRecordingDate(e.target.value)}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* 4. Custom Links */}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-semibold text-zinc-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Include Links in Description (ڈسکرپشن میں لنکس شامل کریں):</span>
                  </span>
                  <span className="text-[10px] text-zinc-400">AI خودکار ڈسکرپشن میں لگائے گا</span>
                </label>
                <input
                  type="text"
                  value={customLinks}
                  onChange={(e) => setCustomLinks(e.target.value)}
                  placeholder="https://youtube.com/@IslamNoorae یا کوئی بھی اہم لنکس"
                  className="w-full py-1.5 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {analysisError && (
              <ErrorNotice
                error={{
                  title: 'Upload Processing Failed',
                  operation: 'AI Video Analysis & Policy Verification',
                  message: analysisError,
                  code: 'UPLOAD_ANALYSIS_FAILED',
                  timestamp: new Date().toISOString(),
                  suggestedFix:
                    'Check video file format/codec and verify local server is running. You can also re-try the action.',
                  page: 'Upload Video',
                }}
                onDismiss={() => setAnalysisError(null)}
              />
            )}

            {/* Action Button */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {targetPrivacy === 'public'
                    ? 'پبلک سلیکٹڈ: ویڈیو سیدھی پبلک جائے گی۔'
                    : 'محفوظ موڈ فعال ہے۔'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAnalyzeInstruction}
                disabled={isAnalyzing || !selectedFile || !instruction.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-red-600/20 disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>{isAnalyzing ? 'Agent Parsing Instruction...' : 'Analyze & Build Plan'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Execution Plan (Review Mode) */}
      {plan && (
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Structured Execution Plan</h3>
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-md">
                  {plan.detectedLanguage} Detected · {(plan.confidence * 100).toFixed(0)}% Confidence
                </span>
              </div>
              <p className="text-xs text-zinc-400">{plan.explanation}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleManualSubmit}
                disabled={isUploading}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/30 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isUploading ? 'Enqueuing to YouTube Queue...' : 'Approve & Queue Upload'}</span>
              </button>
            </div>
          </div>

          {/* Alternative Titles Bar */}
          {plan.suggestedTitles && plan.suggestedTitles.length > 1 && (
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Click any AI-suggested title to apply:
              </span>
              <div className="flex flex-wrap gap-2">
                {plan.suggestedTitles.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setEditableTitle(t)}
                    className={`text-xs px-3 py-1.5 rounded-lg border text-left transition-colors ${
                      editableTitle === t
                        ? 'bg-red-600/20 border-red-500 text-white font-medium'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Plan Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Title */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="font-semibold text-zinc-300">Video Title (max 100 chars)</label>
              <input
                type="text"
                value={editableTitle}
                maxLength={100}
                onChange={(e) => setEditableTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="font-semibold text-zinc-300">Description & Timestamps</label>
              <textarea
                rows={5}
                value={editableDescription}
                onChange={(e) => setEditableDescription(e.target.value)}
                className="w-full p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-red-500 leading-relaxed font-mono"
              />
            </div>

            {/* SEO Tags */}
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-zinc-400" />
                <span>YouTube Tags (comma-separated, max 500 chars)</span>
              </label>
              <input
                type="text"
                value={editableTags}
                onChange={(e) => setEditableTags(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-red-500 font-mono"
              />
            </div>

            {/* Hashtags */}
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-300">Hashtags (#Shorts, #Trending)</label>
              <input
                type="text"
                value={editableHashtags}
                onChange={(e) => setEditableHashtags(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-red-500 font-mono"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-300">YouTube Category</label>
              <select
                value={editableCategory}
                onChange={(e) => setEditableCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
              >
                <option value="28">Science & Technology</option>
                <option value="24">Entertainment</option>
                <option value="27">Education</option>
                <option value="20">Gaming</option>
                <option value="22">People & Blogs</option>
                <option value="10">Music</option>
                <option value="17">Sports</option>
                <option value="25">News & Politics</option>
                <option value="26">Howto & Style</option>
              </select>
            </div>

            {/* Privacy Setting */}
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Authoritative Privacy Policy</span>
              </label>
              <select
                value={editablePrivacy}
                onChange={(e) => {
                  const val = e.target.value as 'private' | 'unlisted' | 'public';
                  setEditablePrivacy(val);
                }}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
              >
                <option value="private">Private (Default & Recommended)</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public (Requires Explicit Authorization)</option>
              </select>
            </div>

            {/* Scheduled Release (Present & Future Years) */}
            <div className="space-y-2 md:col-span-2 p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/90">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="font-semibold text-zinc-200 flex items-center gap-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Scheduled Publication (Present & Future Years)</span>
                  <span className="text-[10px] text-zinc-400 font-normal">(Optional)</span>
                </label>
                {editablePublishAt && (
                  <span className="text-[11px] font-mono text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/60">
                    Release: {new Date(editablePublishAt).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <input
                  type="datetime-local"
                  value={editablePublishAt}
                  onChange={(e) => setEditablePublishAt(e.target.value)}
                  className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none focus:border-red-500 flex-1 font-mono"
                />

                {/* Quick Presets for Present and Future Years */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditablePublishAt('')}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border ${
                      !editablePublishAt
                        ? 'bg-zinc-800 text-white border-zinc-600'
                        : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    Immediate (Now)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
                      d.setHours(18, 0, 0, 0);
                      const pad = (n: number) => n.toString().padStart(2, '0');
                      setEditablePublishAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00`);
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-zinc-900/60 text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:text-white transition-colors"
                  >
                    Tomorrow 6 PM
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                      d.setHours(18, 0, 0, 0);
                      const pad = (n: number) => n.toString().padStart(2, '0');
                      setEditablePublishAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00`);
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-zinc-900/60 text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:text-white transition-colors"
                  >
                    Next Week
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const yr = new Date().getFullYear() + 1;
                      setEditablePublishAt(`${yr}-01-01T12:00`);
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-amber-950/40 text-amber-300 border border-amber-800/60 hover:bg-amber-900/40 transition-colors"
                    title={`Schedule premiere for Year ${new Date().getFullYear() + 1}`}
                  >
                    Year {new Date().getFullYear() + 1}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const yr = new Date().getFullYear() + 2;
                      setEditablePublishAt(`${yr}-01-01T12:00`);
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-zinc-900/60 text-zinc-400 border border-zinc-800 hover:text-white transition-colors"
                    title={`Schedule for Year ${new Date().getFullYear() + 2}`}
                  >
                    Year {new Date().getFullYear() + 2}
                  </button>
                </div>
              </div>

              {editablePublishAt && (
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 pt-1">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    Staged in persistent database queue. The video will be verified as Private and automatically released at the designated time.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Strict Public Override Safeguard */}
          {editablePrivacy === 'public' && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/80 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-red-300 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Deterministic Policy Safety Rule: Public Publication Warning</span>
              </div>
              <p className="text-zinc-300 leading-relaxed">
                Publishing directly as Public makes this video immediately accessible to everyone on YouTube. By default, the policy engine requires you to explicitly authorize this action.
              </p>
              <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowPublicOverride}
                  onChange={(e) => setAllowPublicOverride(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 text-red-600 focus:ring-0 bg-zinc-900"
                />
                <span className="text-white font-medium">
                  I explicitly authorize publishing this video publicly on my channel
                </span>
              </label>
            </div>
          )}

          {/* Toggles */}
          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-zinc-800 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
              <input
                type="checkbox"
                checked={editableIsShort}
                onChange={(e) => setEditableIsShort(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 text-red-600 bg-zinc-900"
              />
              <span>Format as YouTube Short (&lt; 60 seconds)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
              <input
                type="checkbox"
                checked={editableMadeForKids}
                onChange={(e) => setEditableMadeForKids(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 text-red-600 bg-zinc-900"
              />
              <span>Made for Kids (COPPA compliant)</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

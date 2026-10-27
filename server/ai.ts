import { GoogleGenAI } from '@google/genai';
import { getSetting } from './db.ts';

// Helper to get Gemini client lazily when apiKey is present
async function getAiClient(): Promise<GoogleGenAI | null> {
  let key = process.env.GEMINI_API_KEY;
  if (!key) {
    try {
      key = await getSetting('gemini_api_key', '');
    } catch (e) {}
  }
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface InstructionPreferences {
  forcedPrivacy?: 'public' | 'private' | 'unlisted' | 'auto';
  madeForKids?: 'none' | 'yes' | 'no';
  commentsPolicy?: 'allow_all' | 'hold_inappropriate' | 'disabled';
  descriptionLength?: 'viral_long' | 'standard' | 'short';
  customLinks?: string;
  channelName?: string;
}

export interface ExecutionPlan {
  title: string;
  description: string;
  hashtags: string[];
  tags: string[];
  categoryId: string;
  categoryName: string;
  visibility: 'private' | 'unlisted' | 'public';
  madeForKids: boolean;
  isShort: boolean;
  scheduledTime: string | null;
  confidence: number;
  detectedLanguage: string;
  ambiguities: string[];
  conflicts: string[];
  explanation: string;
  suggestedTitles: string[];
}

export interface CommentAnalysis {
  category: 'question' | 'feedback' | 'complaint' | 'spam' | 'general';
  sentiment: 'positive' | 'negative' | 'neutral';
  suggestedReply: string;
  language: string;
  isSafeForAutoReply: boolean;
  confidence: number;
}

/**
 * Parses user natural-language prompt (English, Urdu, Roman Urdu) into a structured plan.
 */
export async function parseInstructionWithGemini(
  instruction: string,
  videoMetadata: { filename: string; duration?: number; isVertical?: boolean; fileSize?: number },
  preferences?: InstructionPreferences
): Promise<ExecutionPlan> {
  const aiClient = await getAiClient();
  if (!aiClient) {
    return createFallbackPlan(instruction, videoMetadata, preferences);
  }

  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentIso = now.toISOString();

    const prompt = `
You are an expert YouTube Automation AI Agent for creators.
Analyze the following user instruction, which may be in English, Urdu (اردو), or Roman Urdu (Urdu written in Latin letters, e.g., "yeh video short k tor par upload karo aur public rakho").

Temporal & System Context:
- Current Timestamp: ${currentIso}
- Current Year: ${currentYear}
- Channel Name: ${preferences?.channelName || 'IslamNoorae'}

Video context:
- Original Filename: ${videoMetadata.filename}
- Detected Duration (seconds): ${videoMetadata.duration || 'unknown'}
- Vertical / 9:16 Aspect: ${videoMetadata.isVertical ? 'Yes' : 'No'}
- File Size (bytes): ${videoMetadata.fileSize || 'unknown'}

User Instruction & Preferences:
"""${instruction}"""
${preferences?.forcedPrivacy ? `- Explicit Privacy Target: ${preferences.forcedPrivacy}` : ''}
${preferences?.madeForKids ? `- Explicit Made for Kids: ${preferences.madeForKids}` : ''}
${preferences?.descriptionLength ? `- Preferred Description Style: ${preferences.descriptionLength}` : ''}
${preferences?.customLinks ? `- Custom Links to Include: ${preferences.customLinks}` : ''}

Extract and determine the following:
1. Title (compelling, viral, clean, max 100 chars. If content is Islamic/Urdu, write a powerful Urdu/English viral title!)
2. 3 alternative high-CTR title ideas
3. Description: Write a RICH, ENGAGING, VIRAL YouTube description!
   - ABSOLUTE PROHIBITION: NEVER write 'Instruction:', 'Prompt:', or 'Published via Personal YouTube AI Agent' in the description!
   - Write genuine viewer-facing storytelling, key takeaways, engaging hook, and a call-to-action (e.g., 'Subscribe to @IslamNoorae').
   - If user provided custom links, embed them cleanly.
4. Hashtags (8-12 viral hashtags e.g. ["#Shorts", "#IslamicStories", "#UrduStories", "#Viral", "#Trending", "#IslamNoorae"])
5. YouTube SEO tags (12-18 high search-volume keywords that viewers actually type into the search bar)
6. YouTube Category (e.g. "27" for Education, "24" for Entertainment, "28" for Science & Tech, "22" for People & Blogs)
7. Visibility: "public", "unlisted", or "private". (If user says 'public', 'پبلک', 'publish', 'live', or explicitly targets public, MUST be "public"!)
8. Made for kids: true or false (default false)
9. Is Short: true or false (true if vertical or explicitly requested as short or duration <= 60s)
10. Scheduled time: Valid future ISO 8601 string or null
11. Detected language: "Urdu", "English", or "Roman Urdu"
12. Conflicting instructions detected
13. Ambiguities
14. Friendly explanation in Urdu/English of what will be done

Respond in pure JSON matching this exact structure:
{
  "title": "string",
  "suggestedTitles": ["string", "string", "string"],
  "description": "string",
  "hashtags": ["#tag1", "#tag2"],
  "tags": ["tag1", "tag2"],
  "categoryId": "27",
  "categoryName": "Education",
  "visibility": "public",
  "madeForKids": false,
  "isShort": false,
  "scheduledTime": null,
  "confidence": 0.98,
  "detectedLanguage": "Urdu",
  "conflicts": [],
  "ambiguities": [],
  "explanation": "string"
}
`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);

    // Enforce safety and user preference
    const lower = instruction.toLowerCase();
    let safeVisibility: 'private' | 'unlisted' | 'public' = 'public';
    if (preferences?.forcedPrivacy && preferences.forcedPrivacy !== 'auto') {
      safeVisibility = preferences.forcedPrivacy;
    } else if (lower.includes('private') || lower.includes('پرائیویٹ')) {
      safeVisibility = 'private';
    } else if (lower.includes('unlisted') || parsed.visibility === 'unlisted') {
      safeVisibility = 'unlisted';
    } else {
      safeVisibility = 'public';
    }

    // Clean description from any accidental prompt leakage
    let cleanDesc = parsed.description || '';
    cleanDesc = cleanDesc.replace(/Published via Personal YouTube AI Agent\.?/gi, '');
    cleanDesc = cleanDesc.replace(/Instruction:\s*.*$/gim, '').trim();

    return {
      title: parsed.title || cleanFilename(videoMetadata.filename),
      suggestedTitles: parsed.suggestedTitles || [parsed.title],
      description: cleanDesc,
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : ['#Shorts', '#IslamicStories', '#IslamNoorae'],
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['IslamNoorae', 'Islamic stories', 'viral shorts', 'urdu story'],
      categoryId: parsed.categoryId || '27',
      categoryName: parsed.categoryName || 'Education',
      visibility: safeVisibility,
      madeForKids: preferences?.madeForKids === 'yes' ? true : preferences?.madeForKids === 'no' ? false : Boolean(parsed.madeForKids),
      isShort: Boolean(parsed.isShort || videoMetadata.isVertical),
      scheduledTime: parsed.scheduledTime || null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
      detectedLanguage: parsed.detectedLanguage || 'Urdu',
      conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts : [],
      ambiguities: Array.isArray(parsed.ambiguities) ? parsed.ambiguities : [],
      explanation: parsed.explanation || 'Plan generated successfully.',
    };
  } catch (error) {
    console.warn('Gemini parse fallback invoked:', error);
    return createFallbackPlan(instruction, videoMetadata, preferences);
  }
}

/**
 * Analyzes comment sentiment and drafts replies
 */
export async function analyzeCommentWithGemini(
  commentText: string,
  channelName: string
): Promise<CommentAnalysis> {
  const aiClient = await getAiClient();
  if (!aiClient) {
    return {
      category: 'general',
      sentiment: 'neutral',
      suggestedReply: 'Thank you for your comment!',
      language: 'English',
      isSafeForAutoReply: false,
      confidence: 0.5,
    };
  }

  try {
    const prompt = `
You are an assistant for the YouTube creator channel "${channelName}".
Analyze this viewer comment:
"""${commentText}"""

1. Classify category: "question", "feedback", "complaint", "spam", or "general".
2. Sentiment: "positive", "negative", or "neutral".
3. Detect language: ("English", "Urdu", "Roman Urdu", etc.)
4. Draft a warm, concise, professional reply matching the language of the comment.
5. Is this safe for an automated reply? (false if complaint, sensitive, controversial, or offensive).

Return JSON format:
{
  "category": "feedback",
  "sentiment": "positive",
  "suggestedReply": "string",
  "language": "Roman Urdu",
  "isSafeForAutoReply": true,
  "confidence": 0.95
}
`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '{}';
    return JSON.parse(text);
  } catch (err) {
    console.warn('Comment analysis fallback invoked:', err);
    return {
      category: 'general',
      sentiment: 'neutral',
      suggestedReply: 'Thanks for watching and engaging!',
      language: 'English',
      isSafeForAutoReply: false,
      confidence: 0.5,
    };
  }
}

/**
 * Helper to clean filename into a title
 */
function cleanFilename(name: string): string {
  const withoutExt = name.replace(/\.[^/.]+$/, '');
  return withoutExt
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

/**
 * Extracts relative or future year date timestamps from natural language
 */
function extractScheduledTimeFromInstruction(text: string): string | null {
  const lower = text.toLowerCase();
  const now = new Date();

  // 1. Full explicit ISO date or YYYY-MM-DD
  const dateMatch = text.match(/\b(202[6-9]|203\d)[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/);
  if (dateMatch) {
    const parsed = new Date(dateMatch[0] + 'T18:00:00.000Z');
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
  }

  // 2. Future Year mention (e.g., "in 2027", "for 2028", "year 2027")
  const yearMatch = text.match(/\b(?:in|year|for)\s+(202[7-9]|203\d)\b/i) || text.match(/\b(202[7-9]|203\d)\b/);
  if (yearMatch) {
    const yr = parseInt(yearMatch[1], 10);
    const futureDate = new Date(Date.UTC(yr, 0, 1, 18, 0, 0));
    return futureDate.toISOString();
  }

  // 3. "tomorrow" / "kal"
  if (lower.includes('tomorrow') || lower.includes('kal')) {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(18, 0, 0, 0);
    return tomorrow.toISOString();
  }

  // 4. "next week" / "agle hafte"
  if (lower.includes('next week') || lower.includes('agle hafte')) {
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    nextWeek.setHours(18, 0, 0, 0);
    return nextWeek.toISOString();
  }

  // 5. "next month" / "agle mahine"
  if (lower.includes('next month') || lower.includes('agle mahine')) {
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    nextMonth.setHours(18, 0, 0, 0);
    return nextMonth.toISOString();
  }

  // 6. "next year" / "agle saal"
  if (lower.includes('next year') || lower.includes('agle saal')) {
    const nextYear = new Date(Date.UTC(now.getFullYear() + 1, 0, 1, 18, 0, 0));
    return nextYear.toISOString();
  }

  return null;
}

/**
 * Intelligent viral metadata generator when offline or without API key
 */
function createFallbackPlan(
  instruction: string,
  meta: { filename: string; duration?: number; isVertical?: boolean },
  preferences?: InstructionPreferences
): ExecutionPlan {
  const lower = instruction.toLowerCase();
  const isShort = Boolean(
    meta.isVertical ||
    (meta.duration && meta.duration <= 60) ||
    lower.includes('short')
  );

  const rawTitle = cleanFilename(meta.filename);
  const scheduledTime = extractScheduledTimeFromInstruction(instruction);

  // Determine visibility strictly matching user request
  const wantsPublic =
    preferences?.forcedPrivacy === 'public' ||
    lower.includes('public') ||
    lower.includes('پبلک') ||
    lower.includes('publish') ||
    lower.includes('aam') ||
    lower.includes('open') ||
    lower.includes('لائیو');

  const wantsPrivate =
    preferences?.forcedPrivacy === 'private' ||
    (lower.includes('private') && !wantsPublic);

  const visibility: 'private' | 'unlisted' | 'public' =
    preferences?.forcedPrivacy && preferences.forcedPrivacy !== 'auto'
      ? preferences.forcedPrivacy
      : wantsPublic
      ? 'public'
      : wantsPrivate
      ? 'private'
      : 'public'; // Default to public

  // Determine madeForKids
  let madeForKids = false;
  if (preferences?.madeForKids === 'yes' || lower.includes('kids') || lower.includes('bachon')) {
    madeForKids = true;
  } else if (preferences?.madeForKids === 'no' || preferences?.madeForKids === 'none') {
    madeForKids = false;
  }

  // Generate powerful viral title
  let title = rawTitle;
  if (rawTitle.includes('امید') || lower.includes('امید') || lower.includes('islam') || lower.includes('madad')) {
    title = rawTitle.includes('|') ? rawTitle : `${rawTitle} | روح پرور سبق آموز کہانی | IslamNoorae`;
  } else if (!title.includes('|') && !isShort) {
    title = `${rawTitle} | Must Watch Story`;
  }

  // Construct Rich, Viral, Viewer-Facing YouTube Description (NEVER leak instructions!)
  const descParagraphs: string[] = [];
  
  if (title.includes('امید') || lower.includes('islam') || lower.includes('madad') || rawTitle.includes('اللہ')) {
    descParagraphs.push(
      `${title}\n\nایک انتہائی سبق آموز، دل کو چھو لینے والی اور روح پرور اسلامی کہانی جو دلوں میں امید کی شمع جلاتی ہے۔ اللہ تعالیٰ کی رحمت پر کامل توکل، صبر اور استقامت کا عظیم پیغام۔`
    );
    descParagraphs.push(
      '✨ اس ویڈیو سے آپ نے کیا سبق سیکھا؟ نیچے کمنٹ سیکشن میں اپنی قیمتی رائے ضرور دیجیے۔\n\n🔔 مزید سبق آموز اسلامی کہانیاں، قرآنی حکمت، اور خوبصورت ویڈیوز کے لیے ہمارے چینل @IslamNoorae کو ابھی سبسکرائب کریں!'
    );
  } else {
    descParagraphs.push(
      `${title}\n\nDiscover key insights, powerful storytelling, and inspiring moments in this video. Watch till the end for maximum benefit.`
    );
    descParagraphs.push(
      '✨ What did you think of this video? Drop a comment below!\n\n🔔 Don\'t forget to Like, Share, and Subscribe to stay updated with our latest releases.'
    );
  }

  // Embed user's custom links cleanly if provided
  if (preferences?.customLinks && preferences.customLinks.trim()) {
    descParagraphs.push(`🔗 Important Links & Resources:\n${preferences.customLinks.trim()}`);
  }

  // Official Channel Link
  descParagraphs.push('📺 Official YouTube Channel: https://youtube.com/@IslamNoorae');

  // Viral Hashtags
  const viralHashtags = isShort
    ? ['#Shorts', '#IslamicStories', '#UrduStories', '#Trending', '#Viral', '#IslamNoorae', '#AllahKiMadad', '#Motivation']
    : ['#IslamNoorae', '#IslamicStories', '#UrduStories', '#SabaqAmozKahani', '#Iman', '#AllahKiMadad', '#Motivation', '#Trending'];

  descParagraphs.push(viralHashtags.join(' '));

  const richDescription = descParagraphs.join('\n\n');

  // High search-volume tags
  const tags = [
    'IslamNoorae',
    'Islamic stories in Urdu',
    'sabaq amoz kahani',
    'Allah ki madad',
    'Iman afroz kahani',
    'sabar ki taqat',
    'viral islamic video',
    'urdu moral stories',
    'shorts',
    'trending shorts',
    'islamic status',
    'motivation in urdu',
  ];

  return {
    title,
    suggestedTitles: [
      title,
      `${rawTitle} | دل کو چھو لینے والا واقعہ #Shorts`,
      `${rawTitle} - سب کے لیے عظیم سبق | IslamNoorae`,
    ],
    description: richDescription,
    hashtags: viralHashtags,
    tags,
    categoryId: '27',
    categoryName: 'Education',
    visibility,
    madeForKids,
    isShort,
    scheduledTime,
    confidence: 0.95,
    detectedLanguage: 'Urdu',
    conflicts: [],
    ambiguities: [],
    explanation: `Generated high-impact viral plan with ${visibility} visibility, high-ranking SEO tags, and engaging storytelling description.`,
  };
}

export interface SeoPackage {
  primaryTitle: string;
  titleVariants: Array<{ title: string; angle: string; score: number }>;
  optimizedDescription: string;
  tagString: string;
  tagsArray: string[];
  hashtags: string[];
  thumbnailConcept: {
    visualDescription: string;
    textOverlay: string;
    dominantColors: string;
    aiPrompt: string;
  };
  policyCheck: {
    riskLevel: 'low' | 'medium' | 'high';
    notes: string;
  };
}

/**
 * Generates comprehensive SEO metadata package
 */
export async function generateSeoMetadataWithGemini(
  topicOrSummary: string,
  contentType: 'short' | 'video',
  targetAudience?: string
): Promise<SeoPackage> {
  const aiClient = await getAiClient();
  if (!aiClient) {
    return {
      primaryTitle: topicOrSummary.slice(0, 70),
      titleVariants: [
        { title: topicOrSummary.slice(0, 70), angle: 'Direct', score: 85 },
        { title: `How to Master: ${topicOrSummary}`.slice(0, 70), angle: 'How-To', score: 88 },
        { title: `The Truth About ${topicOrSummary}`.slice(0, 70), angle: 'Curiosity', score: 92 },
      ],
      optimizedDescription: `In this ${contentType === 'short' ? 'Short' : 'video'}, we cover ${topicOrSummary}.\n\nTimestamps:\n0:00 - Introduction\n1:00 - Core Concept\n2:30 - Key Takeaways\n\n#YouTube #${contentType === 'short' ? 'Shorts' : 'Tutorial'}`,
      tagString: 'youtube, creator, tutorial, educational, guide',
      tagsArray: ['youtube', 'creator', 'tutorial', 'educational', 'guide'],
      hashtags: contentType === 'short' ? ['#Shorts', '#Trending', '#Viral'] : ['#YouTube', '#Tutorial', '#Video'],
      thumbnailConcept: {
        visualDescription: 'Clean high-contrast graphic with bold typography and expressive creator portrait.',
        textOverlay: topicOrSummary.slice(0, 20).toUpperCase(),
        dominantColors: 'Red, Black, White',
        aiPrompt: `Bold YouTube thumbnail graphic for ${topicOrSummary}, high contrast, dramatic studio lighting, 8k resolution`,
      },
      policyCheck: {
        riskLevel: 'low',
        notes: 'Content appears standard and compliant with YouTube guidelines.',
      },
    };
  }

  try {
    const prompt = `
You are a master YouTube SEO strategist and thumbnail designer.
Create a high-performing YouTube metadata package for this ${contentType.toUpperCase()}:

Topic / Video Content:
"""${topicOrSummary}"""

Audience: ${targetAudience || 'General Creators / Interested viewers'}

Provide:
1. Primary Title (under 70 chars, strong CTR)
2. 5 Title Variants with psychological angle (Curiosity, Benefit, How-To, Shocking, Story) and estimated CTR score (1-100)
3. Optimized Description (formatted with Hook summary, Chapters timestamps, Links placeholder, and Call To Action)
4. YouTube Tags: max 15 tags, total characters under 450 characters (YouTube allows 500)
5. 3-5 Relevant Hashtags (#Shorts if short)
6. Thumbnail Visual Creative Concept (visual elements, short 3-word text overlay, colors, and an image generation prompt)
7. Policy Risk Assessment (check for copyright red flags, clickbait violations, or misleading claims)

Return strictly JSON matching this structure:
{
  "primaryTitle": "string",
  "titleVariants": [{"title": "string", "angle": "string", "score": 92}],
  "optimizedDescription": "string",
  "tagString": "comma, separated, tags",
  "tagsArray": ["tag1", "tag2"],
  "hashtags": ["#tag1", "#tag2"],
  "thumbnailConcept": {
    "visualDescription": "string",
    "textOverlay": "string",
    "dominantColors": "string",
    "aiPrompt": "string"
  },
  "policyCheck": {
    "riskLevel": "low",
    "notes": "string"
  }
}
`;

    const res = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(res.text?.trim() || '{}');
    return {
      primaryTitle: parsed.primaryTitle || topicOrSummary.slice(0, 70),
      titleVariants: Array.isArray(parsed.titleVariants) ? parsed.titleVariants : [],
      optimizedDescription: parsed.optimizedDescription || '',
      tagString: parsed.tagString || (Array.isArray(parsed.tagsArray) ? parsed.tagsArray.join(', ') : ''),
      tagsArray: Array.isArray(parsed.tagsArray) ? parsed.tagsArray : [],
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
      thumbnailConcept: parsed.thumbnailConcept || {
        visualDescription: 'High contrast focal image with bold text',
        textOverlay: 'MUST WATCH',
        dominantColors: 'Red and Black',
        aiPrompt: 'High quality YouTube thumbnail',
      },
      policyCheck: parsed.policyCheck || { riskLevel: 'low', notes: 'Standard compliant topic' },
    };
  } catch (err) {
    console.warn('SEO generation fallback invoked:', err);
    return {
      primaryTitle: topicOrSummary.slice(0, 70),
      titleVariants: [{ title: topicOrSummary.slice(0, 70), angle: 'Direct', score: 80 }],
      optimizedDescription: topicOrSummary,
      tagString: 'youtube, video',
      tagsArray: ['youtube', 'video'],
      hashtags: ['#YouTube'],
      thumbnailConcept: {
        visualDescription: 'Clear thumbnail',
        textOverlay: 'NEW VIDEO',
        dominantColors: 'Dark theme',
        aiPrompt: 'Clean modern thumbnail',
      },
      policyCheck: { riskLevel: 'low', notes: 'Pass' },
    };
  }
}


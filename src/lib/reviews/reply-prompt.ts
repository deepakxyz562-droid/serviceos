/**
 * Star-Rating & Sentiment-Conditioned Review Reply Prompt Builder
 * -------------------------------------------------------------
 * Ensures AI and deterministic fallbacks reply according to review sentiment:
 * - 1★ & 2★ (Critical): Sincere apology, de-escalation, offline contact, NO cheerful thank you.
 * - 3★ (Neutral): Appreciation for constructive feedback, commitment to improvement.
 * - 4★ & 5★ (Positive): Enthusiastic gratitude, SEO keyword integration, invite back.
 */

export interface ReviewReplyParams {
  author?: string;
  rating?: number;
  comment?: string;
  businessName: string;
  category?: string;
  address?: string;
  phone?: string;
  email?: string;
  salutation?: string;
  language?: 'English' | 'Hindi' | string;
  tone?: string;
  seoKeywords?: string[];
}

export type ReviewSentiment = 'critical' | 'neutral' | 'positive';

export interface ReviewReplyPromptResult {
  sentiment: ReviewSentiment;
  systemPrompt: string;
  userPrompt: string;
  fallbackText: string;
}

export function classifyReviewSentiment(rating: number): ReviewSentiment {
  const r = Math.round(rating);
  if (r <= 2) return 'critical';
  if (r === 3) return 'neutral';
  return 'positive';
}

export function formatSalutation(salutationTemplate: string | undefined, author: string): string {
  if (!salutationTemplate || !salutationTemplate.trim()) {
    return `Dear ${author}`;
  }
  const clean = salutationTemplate.trim();
  if (clean.includes('{author}') || clean.includes('{name}')) {
    return clean.replace('{author}', author).replace('{name}', author);
  }
  // If template is just "Namaste" or "Hello", append author name
  if (/^[a-zA-Z\s]+$/.test(clean) && !clean.toLowerCase().includes(author.toLowerCase())) {
    return `${clean} ${author}`;
  }
  return clean;
}

export function buildReviewReplyPrompt(params: ReviewReplyParams): ReviewReplyPromptResult {
  const author = (params.author || 'Valued Customer').trim();
  const rating = Math.max(1, Math.min(5, Math.round(params.rating || 5)));
  const comment = (params.comment || '').trim();
  const businessName = (params.businessName || 'our business').trim();
  const sentiment = classifyReviewSentiment(rating);
  const isHindi = params.language === 'Hindi';
  const contact = params.phone || params.email || 'our office';
  const salutation = formatSalutation(params.salutation, author);
  const city = (params.address || '').split(',')[0]?.trim();
  const category = (params.category || '').trim();

  const systemPrompt = isHindi
    ? 'आप एक पेशेवर स्थानीय व्यवसाय प्रतिष्ठा प्रबंधक हैं। समीक्षा की रेटिंग और भावना के आधार पर उपयुक्त, संवेदनशील और सटीक उत्तर दें।'
    : 'You are an expert local business reputation manager. Craft authentic, respectful, sentiment-appropriate Google Business review replies matching the customer rating.';

  let userPrompt = '';
  let fallbackText = '';

  if (sentiment === 'critical') {
    // ── 1★ & 2★ CRITICAL REPLIES: Apology, Ownership & Private Escalation ──
    if (isHindi) {
      userPrompt = `आप ${businessName} के प्रबंधक/मालिक हैं। ग्राहक ${author} ने असंतोषजनक ${rating}-स्टार समीक्षा दी है:
"${comment || 'कम रेटिंग'}"

निर्देश:
1. ग्राहक का नाम लेकर विनम्रतापूर्वक उत्तर शुरू करें।
2. उनकी असुविधा और निराशा के लिए बिना किसी रक्षात्मक रवैये के वास्तविक रूप से क्षमा मांगें।
3. कभी भी "शानदार समीक्षा" या "धन्यवाद" कहकर गलत संदेश न दें।
4. निजी तौर पर समाधान के लिए प्रबंधन से सीधे संपर्क करने का आग्रह करें (फ़ोन/ईमेल: ${contact})।
5. 2-3 वाक्यों में उत्तर दें। कोई उद्धरण चिह्न (quotes) न लगाएं।`;
      fallbackText = `${salutation}, हमें बहुत खेद है कि ${businessName} में आपका अनुभव अपेक्षा के अनुरूप नहीं रहा। हम आपकी प्रतिक्रिया को पूरी गंभीरता से लेते हैं। कृपया मामले को सुलझाने के लिए हमारे प्रबंधन से ${contact} पर संपर्क करें ताकि हम आपकी बेहतर सहायता कर सकें।`;
    } else {
      userPrompt = `You are the owner of ${businessName}. A customer named ${author} left a critical ${rating}-star review on Google:
"${comment || 'Rating only with no comment'}"

STRICT GUIDELINES:
1. NEVER thank them for a "great review" or express cheerful gratitude.
2. Acknowledge their frustration sincerely and apologize that our service fell short of expectations.
3. Keep the tone empathetic, humble, and professional without making excuses.
4. Provide a direct offline escalation channel (phone/email: ${contact}) so management can investigate and make it right privately.
5. Do NOT include cheerful emojis or keyword stuffing on negative reviews.
6. Keep it to 2-3 concise sentences. Do not wrap in quotation marks.`;
      fallbackText = `${salutation}, we are sincerely sorry to hear that your experience with ${businessName} did not meet expectations. We take your feedback seriously and would appreciate the opportunity to make things right. Please contact our management team directly at ${contact} so we can address your concerns personally.`;
    }
  } else if (sentiment === 'neutral') {
    // ── 3★ NEUTRAL REPLIES: Constructive Feedback & Continuous Improvement ──
    if (isHindi) {
      userPrompt = `आप ${businessName} के मालिक हैं। ग्राहक ${author} ने 3-स्टार औसत समीक्षा दी है:
"${comment || 'औसत अनुभव'}"

निर्देश:
1. ग्राहक को उनकी निष्पक्ष और रचनात्मक प्रतिक्रिया के लिए धन्यवाद दें।
2. स्वीकार करें कि सेवा को और बेहतर बनाने की गुंजाइश है।
3. उन्हें अगली बार 5-स्टार अनुभव प्रदान करने की प्रतिबद्धता व्यक्त करें।
4. 2-3 वाक्यों में लिखें। कोई उद्धरण चिह्न न लगाएं।`;
      fallbackText = `${salutation}, अपनी निष्पक्ष प्रतिक्रिया साझा करने के लिए धन्यवाद। हम लगातार अपनी सेवा में सुधार कर रहे हैं और आपकी राय हमारे लिए महत्वपूर्ण है। आशा है कि अगली बार ${businessName} में हम आपको 5-स्टार अनुभव दे सकेंगे।`;
    } else {
      userPrompt = `You are the owner of ${businessName}. A customer named ${author} left a balanced 3-star review on Google:
"${comment || 'Rating only'}"

STRICT GUIDELINES:
1. Thank them politely for taking the time to share their honest feedback.
2. Acknowledge that while some parts were satisfactory, there is room for improvement.
3. Express genuine commitment to continuous service improvement.
4. Invite them back so we can deliver a complete 5-star experience next time.
5. Keep it to 2-3 sentences. Do not wrap in quotes.`;
      fallbackText = `Thank you for sharing your feedback, ${author}. We appreciate your honest thoughts and are continuously working to refine our service at ${businessName}. We hope to welcome you back soon and deliver a true 5-star experience!`;
    }
  } else {
    // ── 4★ & 5★ PRAISE REPLIES: Genuine Gratitude, SEO & Warm Welcome ──
    const keywordHints = Array.isArray(params.seoKeywords)
      ? params.seoKeywords.map((k) => k.trim()).filter(Boolean).slice(0, 4)
      : [];
    const baseHint = [category, city].filter(Boolean).join(' in ');
    const seoHint = [baseHint, ...keywordHints].filter(Boolean).join(', ');
    if (isHindi) {
      userPrompt = `आप ${businessName} के मालिक हैं। ग्राहक ${author} ने Google पर एक शानदार ${rating}-स्टार समीक्षा दी है:
"${comment || 'बहुत बढ़िया सेवा!'}"

निर्देश:
1. ग्राहक का नाम लेकर गर्मजोशी से आभार व्यक्त करें।
2. समीक्षा में उल्लिखित किसी विशेष बात या सेवा की गुणवत्ता की सराहना करें।
3. उन्हें दोबारा आने के लिए गर्मजोशी से आमंत्रित करें।
4. 2-3 वाक्यों में विनम्र उत्तर लिखें। कोई उद्धरण चिह्न न लगाएं।`;
      fallbackText = `${salutation}, आपकी इस शानदार ${rating}-स्टार समीक्षा और स्नेह भरे शब्दों के लिए बहुत-बहुत धन्यवाद! ${businessName} की पूरी टीम आपकी सेवा करके अत्यंत प्रसन्न है। हम जल्द ही आपका पुनः स्वागत करने के लिए उत्सुक हैं!`;
    } else {
      userPrompt = `You are the owner of ${businessName}. A customer named ${author} left a glowing ${rating}-star review on Google:
"${comment || 'Great experience!'}"

STRICT GUIDELINES:
1. Thank them enthusiastically and authentically by name.
2. Naturally mention the high quality of service and any specific compliment they made.
3. Weave in natural local business terms${seoHint ? ` (such as ${seoHint})` : ''} without sounding spammy.
4. Warmly invite them back for their next visit.
5. Keep it to 2-3 sincere sentences. Do not wrap in quotes.`;
      fallbackText = `Thank you so much for the wonderful ${rating}-star review, ${author}! The entire team at ${businessName} is thrilled to hear about your great experience. We look forward to welcoming you back soon!`;
    }
  }

  return {
    sentiment,
    systemPrompt,
    userPrompt,
    fallbackText,
  };
}

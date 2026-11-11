/**
 * Application service for Pinterest Search & Visual Discovery Optimization.
 * Generates high-converting pin titles, keyword-rich descriptions, hashtags, and alt text.
 * @module application/services/seo-optimizer.service
 */

export interface OptimizeSeoParams {
  readonly topic: string;
  readonly targetAudience?: string;
  readonly keywords?: readonly string[];
  readonly callToAction?: string;
}

export interface CreativeBestPractices {
  readonly aspectRatio: string;
  readonly visualHierarchy: string;
  readonly textOverlay: string;
  readonly branding: string;
}

export interface SeoOptimizationResult {
  readonly topic: string;
  readonly recommended_titles: readonly string[];
  readonly recommended_description: string;
  readonly recommended_alt_text: string;
  readonly recommended_hashtags: readonly string[];
  readonly creative_best_practices: CreativeBestPractices;
}

export class SeoOptimizerService {
  /**
   * Generates optimized Pinterest metadata based on the search engine algorithm heuristics.
   */
  public optimizeMetadata(params: OptimizeSeoParams): SeoOptimizationResult {
    const { topic, targetAudience, keywords = [], callToAction } = params;
    const cta = callToAction || "Click through to read more and save for later!";
    const kwList = keywords.length > 0 ? keywords : [topic.toLowerCase()];

    // Generate 3 title variants constrained to 100 chars
    const titleVariant1 = `${topic.slice(0, 70)} | Step-by-Step Guide`.slice(0, 100);
    const titleVariant2 = `How to Master ${topic.slice(0, 65)}`.slice(0, 100);
    const titleVariant3 = `Best ${topic.slice(0, 75)} for Beginners`.slice(0, 100);

    // Clean topic slug for hashtag
    const topicSlug = topic.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

    // Generate rich description constrained to 500 chars (Pinterest optimal)
    const audienceSnippet = targetAudience ? `perfect for ${targetAudience}` : "";
    const description = `Looking for the best inspiration on ${topic}? Discover top ideas, practical tips, and curated advice ${audienceSnippet}. Focus on ${kwList.join(", ")} to get the best results. ${cta} #pinspiration #${topicSlug}`.slice(0, 500);

    // Alt text optimized for accessibility & visual search
    const altText = `Visual overview and inspiration for ${topic}, highlighting aesthetic details, styling, and step-by-step elements.`.slice(0, 500);

    // Hashtags
    const hashtags = [
      `#${topicSlug}`,
      ...kwList.map((k) => `#${k.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`),
      "#pinterestinspired",
      "#ideas",
    ]
      .filter((tag) => tag.length > 1)
      .slice(0, 6);

    return {
      topic,
      recommended_titles: [titleVariant1, titleVariant2, titleVariant3],
      recommended_description: description,
      recommended_alt_text: altText,
      recommended_hashtags: hashtags,
      creative_best_practices: {
        aspectRatio: "2:3 (e.g. 1000 x 1500 pixels)",
        visualHierarchy: "High contrast, clear focal point, minimal clutter",
        textOverlay: "Bold, legible sans-serif font placed in the center or top third",
        branding: "Subtle logo or domain watermark at bottom center",
      },
    };
  }
}

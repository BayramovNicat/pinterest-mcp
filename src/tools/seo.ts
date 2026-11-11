import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerSeoTools(server: McpServer) {
  server.registerTool(
    "pinterest_optimize_pin_metadata",
    {
      description: "Generate SEO-optimized pin titles, descriptions, hashtags, and alt text tailored for Pinterest's visual search algorithm",
      inputSchema: {
        topic: z.string().describe("The main topic, product, or subject of the pin"),
        target_audience: z.string().optional().describe("Intended audience or demographic"),
        keywords: z.array(z.string()).optional().describe("Key search terms or phrases to incorporate"),
        call_to_action: z.string().optional().describe("Desired action (e.g., 'Read the full guide', 'Shop the look')"),
      },
    },
    async ({ topic, target_audience, keywords = [], call_to_action }) => {
      const cta = call_to_action || "Click through to read more and save for later!";
      const kwList = keywords.length > 0 ? keywords : [topic.toLowerCase()];

      const titleVariant1 = `${topic.slice(0, 70)} | Step-by-Step Guide`.slice(0, 100);
      const titleVariant2 = `How to Master ${topic.slice(0, 65)}`.slice(0, 100);
      const titleVariant3 = `Best ${topic.slice(0, 75)} for Beginners`.slice(0, 100);

      const description = `Looking for the best inspiration on ${topic}? Discover top ideas, practical tips, and curated advice ${
        target_audience ? `perfect for ${target_audience}` : ""
      }. Focus on ${kwList.join(", ")} to get the best results. ${cta} #pinspiration #${topic.replace(/\s+/g, "").toLowerCase()}`.slice(0, 500);

      const altText = `Visual overview and inspiration for ${topic}, highlighting aesthetic details, styling, and step-by-step elements.`.slice(0, 500);

      const hashtags = [
        `#${topic.replace(/\s+/g, "").toLowerCase()}`,
        ...kwList.map((k) => `#${k.replace(/\s+/g, "").toLowerCase()}`),
        "#pinterestinspired",
        "#ideas",
      ].slice(0, 6);

      const recommendations = {
        topic,
        recommended_titles: [titleVariant1, titleVariant2, titleVariant3],
        recommended_description: description,
        recommended_alt_text: altText,
        recommended_hashtags: hashtags,
        creative_best_practices: {
          aspect_ratio: "2:3 (e.g. 1000 x 1500 pixels)",
          visual_hierarchy: "High contrast, clear focal point, minimal clutter",
          text_overlay: "Bold, legible sans-serif font placed in the center or top third",
          branding: "Subtle logo or domain watermark at bottom center",
        },
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(recommendations, null, 2),
          },
        ],
      };
    }
  );
}

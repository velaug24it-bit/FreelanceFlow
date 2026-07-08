const axios = require('axios');

/**
 * Call the Groq AI API (llama-3.1-8b-instant).
 * Groq free tier: 14,400 requests/day, 30 RPM — no billing required.
 * Falls back to realistic mock data if GROQ_API_KEY is missing or quota is exceeded.
 *
 * @param {string} prompt The text prompt to send.
 * @param {boolean} isJson Whether to request structured JSON output.
 * @param {string} systemInstruction Optional system instructions to set the model's persona/behavior.
 * @returns {Promise<any>} The text content or parsed JSON object.
 */
async function callGemini(prompt, isJson = false, systemInstruction = null) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ GROQ_API_KEY is not configured in .env. Falling back to mock generator.');
    return generateFallbackMock(prompt, isJson);
  }

  const messages = [];

  // System instruction (sets persona / behavior)
  const sysText = systemInstruction ||
    'You are a helpful AI assistant for a freelance marketplace platform. Always respond concisely and professionally.';
  messages.push({ role: 'system', content: sysText });

  // User prompt — if JSON requested, enforce it in the prompt itself
  const userContent = isJson
    ? `${prompt}\n\nIMPORTANT: Respond ONLY with a valid JSON object. Do not include any markdown, explanation, or code fences.`
    : prompt;
  messages.push({ role: 'user', content: userContent });

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.7,
        max_tokens: 2048
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const textResult = response.data?.choices?.[0]?.message?.content;

    if (!textResult) {
      throw new Error('Empty response from Groq API');
    }

    if (isJson) {
      // Strip any accidental markdown code fences the model may include
      let cleaned = textResult
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      // Extract only the outermost JSON object (ignore any trailing text)
      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
      }

      // Robust LLM JSON sanitizer:
      // LLMs often put literal newlines/tabs inside JSON string values,
      // making JSON.parse fail. Walk char-by-char and escape them.
      const sanitizeLlmJson = (str) => {
        let result = '';
        let inString = false;
        let escaped = false;
        for (let i = 0; i < str.length; i++) {
          const ch = str[i];
          if (escaped) {
            result += ch;
            escaped = false;
          } else if (ch === '\\') {
            result += ch;
            escaped = true;
          } else if (ch === '"') {
            result += ch;
            inString = !inString;
          } else if (inString && ch === '\n') {
            result += '\\n';
          } else if (inString && ch === '\r') {
            result += '\\r';
          } else if (inString && ch === '\t') {
            result += '\\t';
          } else {
            result += ch;
          }
        }
        return result;
      };

      try {
        return JSON.parse(sanitizeLlmJson(cleaned));
      } catch (parseErr) {
        console.error('Failed to parse Groq JSON output:', cleaned.substring(0, 200));
        return generateFallbackMock(prompt, isJson);
      }
    }


    return textResult.trim();
  } catch (err) {
    console.error('❌ Groq API Error:', err.response?.data || err.message);
    return generateFallbackMock(prompt, isJson);
  }
}

/**
 * Simple mock generator to provide realistic-looking data when API key is missing.
 * Prevents app crashes and facilitates testing.
 */
function generateFallbackMock(prompt, isJson) {
  const p = prompt.toLowerCase();

  if (isJson) {
    // 1. Project description fallback
    if (p.includes('description') || p.includes('keywords')) {
      return {
        description: "A production-grade, highly scalable web application built to streamline operations and provide real-time updates.",
        scope_of_work: [
          "Design full-fidelity wireframes and design system components.",
          "Build responsive client application with robust state management.",
          "Implement REST APIs, database schemas, and JWT user authentication.",
          "Optimize performance, write automated tests, and deploy to hosting."
        ],
        deliverables: [
          "Interactive Figma UI Prototypes.",
          "Fully documented backend codebase & Mongo DB setup.",
          "Production deployment link and source repository.",
          "Comprehensive user guides and API documentation."
        ],
        required_skills: ["React.js", "Node.js", "Express.js", "MongoDB", "CSS3"],
        estimated_duration: "4-6 Weeks",
        suggested_budget: 150000
      };
    }

    // 2. Budget estimator fallback
    if (p.includes('budget') || p.includes('estimate')) {
      return {
        minimum: 45000,
        average: 95000,
        maximum: 180000,
        reasoning: "Industry rates for custom full-stack solutions typically range from ₹40,000 for standard applications to ₹1,80,000+ for enterprise integrations with custom features."
      };
    }

    // 3. Timeline estimator fallback
    if (p.includes('timeline') || p.includes('milestones')) {
      return {
        estimated_duration: "30 Days",
        milestones: [
          { title: "Requirements & Database Schema Design", duration_days: 5, budget_percentage: 15 },
          { title: "Core REST API & User Authentication", duration_days: 10, budget_percentage: 35 },
          { title: "Frontend Dashboard Integration & UI Styling", duration_days: 10, budget_percentage: 35 },
          { title: "UAT, Bug Fixes & Staging Deployment", duration_days: 5, budget_percentage: 15 }
        ],
        risks: [
          { risk: "Third-party payment gateway latency", mitigation: "Integrate mock transactions early to speed up client-side flow testing." },
          { risk: "Database structure changes mid-project", mitigation: "Lock down schema specs during the initial requirements milestone." }
        ]
      };
    }

    // 4. Proposal Analyzer fallback
    if (p.includes('proposal') || p.includes('analyzer')) {
      return {
        professionalism: 88,
        grammar_completeness: 92,
        relevance: 85,
        selection_probability: 78,
        suggestions: [
          "Address the client by name if it is mentioned in their project posting.",
          "Highlight a past project similar to their web app requirements.",
          "Clearly split your estimated timeline into weekly project milestones."
        ]
      };
    }

    // 5. Skill Gap fallback
    if (p.includes('skill') || p.includes('gap')) {
      return {
        missing_skills: ["TypeScript", "Next.js", "TailwindCSS", "Redux Toolkit"],
        trending_technologies: ["AI Integration (Gemini/OpenAI)", "Serverless Functions", "GraphQL"],
        suggested_certifications: [
          "AWS Certified Cloud Practitioner",
          "MongoDB Certified Developer Associate"
        ],
        learning_roadmap: [
          "Week 1: TypeScript fundamentals and migration from pure JS.",
          "Week 2: Next.js app router layout systems and SSR concepts.",
          "Week 3: Integrate Gemini API endpoints in a Next.js project.",
          "Week 4: Build a small end-to-end portfolio tool to showcase your new stack."
        ],
        profile_improvement_suggestions: [
          "Add a brief tagline at the top of your bio highlighting your target tech stack.",
          "Upload high-quality screenshots and live hosting links for your past two web projects."
        ]
      };
    }

    // 6. Review summarizer fallback
    if (p.includes('review') || p.includes('summarize')) {
      return {
        strengths: ["Excellent communication", "Fast delivery", "Clean React components"],
        weaknesses: ["Occasional delay in final testing steps"],
        overall_reputation: "Highly professional freelancer with top ratings for technical competency.",
        hiring_recommendation: "Highly recommended for full-stack React-based developments."
      };
    }

    // 7. Fraud check fallback
    if (p.includes('fraud') || p.includes('risk')) {
      return {
        risk_score: 12,
        flags: ["No suspicious activity detected. Profile and bids match standard usage indices."],
        details: "Clean history, normal bidding behavior, and verified email."
      };
    }

    // 8. Analytics insights fallback
    if (p.includes('insight') || p.includes('forecast')) {
      return {
        forecasted_revenue_next_month: 250000,
        growth_rate: 15.5,
        insights: [
          "Hiring trends are shifting heavily towards Node/React developers.",
          "Freelancer project completion rate has climbed by 8% this month.",
          "Platform transaction volume peaks during mid-month invoicing cycles."
        ]
      };
    }

    // 9. Document generator / contract boilerplate fallback
    if (p.includes('contract') || p.includes('invoice')) {
      return {
        contract_text: "# PROFESSIONAL SERVICE CONTRACT\n\nThis agreement is entered by the Client and Freelancer.\n\n### 1. SCOPE OF SERVICES\nFreelancer agrees to perform development services as set in the milestones.\n\n### 2. PAYMENT TERMS\nClient agrees to fund milestones. Releases occur on verification.\n\n### 3. INTELLECTUAL PROPERTY\nUpon final payment, all rights transfer to the client.",
        invoice_gst_number: "27AAAAA1111A1Z1",
        invoice_notes: "Thank you for your business. This is an AI-generated receipt/milestone invoice."
      };
    }

    // 10. Project Risk Predictor fallback
    if (p.includes('delay') || p.includes('overrun')) {
      return {
        delay_probability: "Low",
        budget_overrun_risk: "Low",
        communication_issues: "Minimal risk. Regular task updates found.",
        suggested_actions: [
          "Establish weekly check-in syncs to review current milestone progress.",
          "Pre-define backend endpoints so frontend work can proceed in parallel."
        ]
      };
    }

    // 11. Portfolio Analyzer fallback
    if (p.includes('portfolio') || p.includes('confidence')) {
      return {
        skill_score: 85,
        experience_score: 80,
        portfolio_quality_score: 75,
        hiring_confidence_score: 82,
        strengths: ["Strong JavaScript proficiency", "Good layout rendering skills"],
        improvements: ["Add more backend projects with MongoDB integration to showcase database knowledge."]
      };
    }

    // 12. Smart search parsing fallback
    if (p.includes('smart search') || p.includes('parse')) {
      return {
        query: {},
        skills: ["React"],
        budget_max: 50000,
        parsed: true
      };
    }
  }

  // Text response fallback
  return "I am the FreelanceFlow AI business assistant. How can I help you navigate your projects, manage budgets, or optimize your freelancer workflows today?";
}

module.exports = {
  callGemini
};

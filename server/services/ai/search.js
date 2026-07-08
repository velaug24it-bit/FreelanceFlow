const User = require('../../models/User');
const ProjectPost = require('../../models/ProjectPost');
const { callGemini } = require('./gemini');

/**
 * Executes a natural language search against projects or freelancers.
 * 
 * @param {string} rawQuery User's natural language search query.
 * @param {string} type Target search domain ('projects' or 'freelancers').
 * @returns {Promise<Array>} List of matching documents.
 */
async function smartSearch(rawQuery, type = 'projects') {
  try {
    const prompt = `
      You are an expert search engine parsing parser.
      Translate this natural language user query into search criteria parameters:
      Query: "${rawQuery}"
      Target Collection Type: "${type}"

      Available Project Categories: ['Web Development', 'Mobile App', 'Design', 'Content Writing', 'Marketing', 'Other']

      You must return a JSON object with this exact structure:
      {
        "skills": ["Skill1", "Skill2", ...],
        "budget_min": number or null,
        "budget_max": number or null,
        "experience_years": number or null,
        "category": "One of the project categories or null",
        "keywords": ["key1", "key2", ...],
        "hourly_rate_max": number or null
      }
    `;

    const parsed = await callGemini(prompt, true, "You parse natural language to JSON query criteria. Return only JSON.");
    
    let dbQuery = {};

    if (type === 'projects') {
      // 1. Build Query for Marketplace Projects
      dbQuery.status = 'open'; // only show open projects

      if (parsed.category) {
        dbQuery.category = parsed.category;
      }

      if (parsed.skills && parsed.skills.length > 0) {
        dbQuery.skills_required = { 
          $in: parsed.skills.map(s => new RegExp(`^${s}$`, 'i')) 
        };
      }

      if (parsed.budget_max > 0) {
        dbQuery.budget_min = { $lte: parsed.budget_max };
      }

      if (parsed.keywords && parsed.keywords.length > 0) {
        const regexes = parsed.keywords.map(kw => new RegExp(kw, 'i'));
        dbQuery.$or = [
          { title: { $in: regexes } },
          { description: { $in: regexes } }
        ];
      }

      const results = await ProjectPost.find(dbQuery)
        .populate('client_id', 'full_name avatar_url')
        .sort({ created_at: -1 })
        .limit(20);

      return { results, criteria: parsed };

    } else {
      // 2. Build Query for Freelancers (Users)
      dbQuery.role = 'freelancer';
      dbQuery.moderation_status = 'active';

      if (parsed.skills && parsed.skills.length > 0) {
        dbQuery.skills = { 
          $in: parsed.skills.map(s => new RegExp(`^${s}$`, 'i')) 
        };
      }

      if (parsed.hourly_rate_max > 0) {
        dbQuery.hourly_rate = { $lte: parsed.hourly_rate_max };
      } else if (parsed.budget_max > 0) {
        // Assume hourly rate translates roughly (budget_max / 30 hours)
        const estHourlyMax = Math.round(parsed.budget_max / 30);
        dbQuery.hourly_rate = { $lte: estHourlyMax > 0 ? estHourlyMax : 50 };
      }

      if (parsed.keywords && parsed.keywords.length > 0) {
        const regexes = parsed.keywords.map(kw => new RegExp(kw, 'i'));
        dbQuery.$or = [
          { full_name: { $in: regexes } },
          { bio: { $in: regexes } }
        ];
      }

      const results = await User.find(dbQuery)
        .select('full_name avatar_url bio skills hourly_rate availability_status total_clients total_earnings')
        .limit(20);

      return { results, criteria: parsed };
    }
  } catch (err) {
    console.error('Error in AI Smart Search:', err);
    throw err;
  }
}

module.exports = {
  smartSearch
};

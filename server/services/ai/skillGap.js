const User = require('../../models/User');
const ProjectPost = require('../../models/ProjectPost');
const { callGemini } = require('./gemini');

/**
 * Analyzes freelancer profile skills against platform demand and outputs improvements.
 * 
 * @param {string} freelancerId The ID of the freelancer user.
 * @returns {Promise<object>} Missing skills, trending tech, certifications, learning roadmap, and profile improvements.
 */
async function analyzeSkillGap(freelancerId) {
  try {
    const freelancer = await User.findById(freelancerId);
    if (!freelancer) {
      throw new Error('Freelancer not found');
    }

    const freelancerSkills = freelancer.skills || [];
    const bioText = freelancer.bio || '';

    // Gather trending skills on the platform from open projects
    const openProjects = await ProjectPost.find({ status: 'open' }).select('skills_required').limit(50);
    const skillCounts = {};
    openProjects.forEach(p => {
      p.skills_required?.forEach(skill => {
        const s = skill.trim().toLowerCase();
        skillCounts[s] = (skillCounts[s] || 0) + 1;
      });
    });

    // Sort platform skills by demand
    const trendingPlatformSkills = Object.keys(skillCounts)
      .sort((a, b) => skillCounts[b] - skillCounts[a])
      .slice(0, 10);

    const prompt = `
      You are an expert career advisor for technical professionals and creatives.
      Analyze this freelancer's profile and compare their stack against the current hot market skills.

      Freelancer Current Skills: [${freelancerSkills.join(', ')}]
      Freelancer Bio Tagline: "${bioText}"
      Trending Skills on Platform: [${trendingPlatformSkills.join(', ')}]

      Evaluate the profile gap and return a JSON object with this exact structure:
      {
        "missing_skills": ["Skill1", "Skill2", ...],
        "trending_technologies": ["Tech1", "Tech2", ...],
        "suggested_certifications": ["Cert1", "Cert2", ...],
        "learning_roadmap": ["Roadmap Step 1", "Roadmap Step 2", "Roadmap Step 3", ...],
        "profile_improvement_suggestions": ["Suggestion 1", "Suggestion 2", ...]
      }
    `;

    const result = await callGemini(prompt, true, "You are an expert career advisory coach. Return only JSON.");
    return result;
  } catch (err) {
    console.error('Error analyzing skill gap:', err);
    throw err;
  }
}

module.exports = {
  analyzeSkillGap
};

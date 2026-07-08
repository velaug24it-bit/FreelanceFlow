const { callGemini } = require('./gemini');

/**
 * Analyzes freelancer resume text and social portfolio links.
 * 
 * @param {string} resumeText Raw text contents of resume.
 * @param {string} portfolioUrl Portfolio website link.
 * @param {string} githubUrl Github developer link.
 * @returns {Promise<object>} Visual scores and strengths.
 */
async function analyzePortfolio(resumeText, portfolioUrl, githubUrl) {
  const prompt = `
    You are an technical recruiter and elite portfolio reviewer.
    Evaluate the following candidate credentials:

    Resume Content Snippet:
    "${resumeText || 'No resume text uploaded.'}"

    Portfolio Link: "${portfolioUrl || 'None'}"
    GitHub Link: "${githubUrl || 'None'}"

    Determine the candidate scores out of 100 for technical skills, experience depth, portfolio presentation quality, and general hiring confidence.
    Return a JSON object with this exact structure:
    {
      "skill_score": number,
      "experience_score": number,
      "portfolio_quality_score": number,
      "hiring_confidence_score": number,
      "strengths": ["Strength 1", "Strength 2", ...],
      "improvements": ["Improvement 1", "Improvement 2", ...]
    }
  `;

  try {
    const result = await callGemini(prompt, true, "You are a technical talent assessor. Return only JSON.");
    return result;
  } catch (err) {
    console.error('Error analyzing portfolio:', err);
    throw err;
  }
}

module.exports = {
  analyzePortfolio
};

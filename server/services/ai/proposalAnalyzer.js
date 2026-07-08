const { callGemini } = require('./gemini');

/**
 * Analyzes freelancer bidding proposal.
 * 
 * @param {string} proposalText The freelancer's bid description.
 * @param {string} projectDescription The original client project description.
 * @param {number} bidAmount The proposed price.
 * @returns {Promise<object>} Scoring and suggestions list.
 */
async function analyzeProposal(proposalText, projectDescription, bidAmount) {
  const prompt = `
    You are an expert pitch consultant and job recruiter.
    Analyze this freelancer proposal submitted for a job post:

    Project Description: "${projectDescription}"
    Bid Price: ₹${bidAmount}
    Proposal Text: "${proposalText}"

    Evaluate it out of 100 and write specific actionable feedback.
    You must return a JSON object with this exact structure:
    {
      "professionalism": number,
      "grammar_completeness": number,
      "relevance": number,
      "selection_probability": number,
      "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3", ...]
    }
  `;

  try {
    const result = await callGemini(prompt, true, "You are a proposal pitch auditor. Return only JSON.");
    return result;
  } catch (err) {
    console.error('Error analyzing proposal:', err);
    throw err;
  }
}

module.exports = {
  analyzeProposal
};

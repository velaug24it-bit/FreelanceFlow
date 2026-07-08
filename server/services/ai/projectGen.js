const { callGemini } = require('./gemini');

/**
 * Generates a full project outline based on a title and keywords.
 * 
 * @param {string} title The user's typed project title.
 * @param {string} keywords Key technologies or descriptions.
 * @returns {Promise<object>} Generated description, scope, deliverables, skills, duration, suggested budget.
 */
async function generateProjectDescription(title, keywords) {
  const prompt = `
    You are an expert IT Project Manager and Business Analyst.
    Generate a professional project posting for the following:
    Project Title: "${title}"
    Key Concepts/Keywords: "${keywords}"

    You must return a JSON object with this exact structure:
    {
      "description": "Detailed professional overview of the project",
      "scope_of_work": ["Scope step 1", "Scope step 2", "Scope step 3", ...],
      "deliverables": ["Deliverable 1", "Deliverable 2", "Deliverable 3", ...],
      "required_skills": ["Skill1", "Skill2", "Skill3", ...],
      "estimated_duration": "Duration in weeks or months (e.g. '4-6 Weeks')",
      "suggested_budget": 120000
    }

    Keep the description engaging and professional. Suggest a realistic budget in INR (or USD if keywords indicate) as a number.
  `;

  try {
    const result = await callGemini(prompt, true, "You are a professional technical project spec writer. Return only JSON.");
    return result;
  } catch (err) {
    console.error('Error generating project description:', err);
    throw err;
  }
}

module.exports = {
  generateProjectDescription
};

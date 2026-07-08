const Review = require('../../models/Review');
const User = require('../../models/User');
const { callGemini } = require('./gemini');

/**
 * Summarizes all ratings and comments for a freelancer.
 * 
 * @param {string} freelancerId The ID of the freelancer.
 * @returns {Promise<object>} Summary containing strengths, weaknesses, overall reputation, and recommendation.
 */
async function summarizeReviews(freelancerId) {
  try {
    const freelancer = await User.findById(freelancerId);
    if (!freelancer) {
      throw new Error('Freelancer not found');
    }

    const reviews = await Review.find({ reviewee_id: freelancerId });
    if (reviews.length === 0) {
      return {
        strengths: ["No reviews submitted yet."],
        weaknesses: ["No reviews submitted yet."],
        overall_reputation: "New freelancer on the platform. No historical reviews available.",
        hiring_recommendation: "Consider hiring for smaller initial milestones to evaluate performance."
      };
    }

    const commentsList = reviews.map((r, i) => `${i+1}. Rating: ${r.rating}/5, Comment: "${r.comment}"`).join('\n');

    const prompt = `
      You are an independent quality assurance auditor.
      Analyze the following client reviews for Freelancer: "${freelancer.full_name}".
      
      Reviews:
      ${commentsList}

      Summarize these ratings and text reviews into a concise reputation overview.
      Return a JSON object with this exact structure:
      {
        "strengths": ["Strength 1", "Strength 2", ...],
        "weaknesses": ["Weakness 1", "Weakness 2", ...],
        "overall_reputation": "Paragraph summarizing their overall performance reputation on the platform.",
        "hiring_recommendation": "A sentence describing what projects/clients this freelancer is best suited for."
      }
    `;

    const result = await callGemini(prompt, true, "You are a customer feedback review auditor. Return only JSON.");
    return result;
  } catch (err) {
    console.error('Error summarizing reviews:', err);
    throw err;
  }
}

module.exports = {
  summarizeReviews
};

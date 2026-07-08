const User = require('../../models/User');
const Bid = require('../../models/Bid');
const Review = require('../../models/Review');
const { callGemini } = require('./gemini');

/**
 * Audit safety risks for a profile, bid, or general platform actions.
 * 
 * @param {string} targetType The type of data to check ('profile', 'bid', 'review').
 * @param {string} targetId The DB object ID to evaluate.
 * @returns {Promise<object>} Risk score (0-100), red flags list, and audit detail.
 */
async function auditFraudRisk(targetType, targetId) {
  try {
    let rawText = '';
    let contextData = {};

    if (targetType === 'profile') {
      const user = await User.findById(targetId);
      if (!user) throw new Error('User not found');
      
      contextData = {
        name: user.full_name,
        email: user.email,
        bio: user.bio,
        skills: user.skills || [],
        portfolio: user.portfolio_links || [],
        earnings: user.total_earnings,
        created: user.created_at
      };
      rawText = `Name: ${user.full_name}. Bio: "${user.bio}". Skills: [${(user.skills || []).join(', ')}]. Portfolio Links: [${(user.portfolio_links || []).join(', ')}].`;

    } else if (targetType === 'bid') {
      const bid = await Bid.findById(targetId).populate('project_id');
      if (!bid) throw new Error('Bid not found');

      contextData = {
        freelancerName: bid.freelancer_name,
        amount: bid.bid_amount,
        durationDays: bid.estimated_days,
        proposal: bid.proposal,
        phoneNumber: bid.phone_number,
        portfolioLink: bid.portfolio_link
      };
      rawText = `Freelancer: ${bid.freelancer_name}. Bid: $${bid.bid_amount}. Duration: ${bid.estimated_days} days. Proposal: "${bid.proposal}". Contact Info: ${bid.phone_number || 'none'}. Portfolio: ${bid.portfolio_link || 'none'}.`;

    } else if (targetType === 'review') {
      const review = await Review.findById(targetId);
      if (!review) throw new Error('Review not found');

      contextData = {
        reviewer: review.reviewer_name,
        rating: review.rating,
        comment: review.comment
      };
      rawText = `Reviewer: ${review.reviewer_name}. Rating: ${review.rating}/5. Comment: "${review.comment}".`;
    } else {
      throw new Error('Invalid target type for fraud check');
    }

    const prompt = `
      You are an expert trust and safety compliance officer at a freelance platform.
      Analyze the following platform entity data for policy violations, fake details, spam content, or platform circumvention attempts (e.g. sharing direct phone numbers/emails in descriptions to bypass platform payment).

      Entity Type: ${targetType}
      Entity Details:
      ${rawText}

      Determine a risk score (0 to 100 where 0 is completely safe and 100 is high risk/scam).
      List any red flags found.
      Return a JSON object with this exact structure:
      {
        "risk_score": number,
        "flags": ["Flag 1", "Flag 2", ...],
        "details": "Explanation of the evaluation rating."
      }
    `;

    const result = await callGemini(prompt, true, "You are a trust and safety fraud detector. Return only JSON.");
    return result;
  } catch (err) {
    console.error('Error auditing fraud risk:', err);
    throw err;
  }
}

module.exports = {
  auditFraudRisk
};

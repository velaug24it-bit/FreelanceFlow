const User = require('../../models/User');
const ProjectPost = require('../../models/ProjectPost');
const Review = require('../../models/Review');
const { callGemini } = require('./gemini');

/**
 * Recommends the best freelancers for a specific project.
 * 
 * @param {string} projectId The ID of the project post.
 * @returns {Promise<Array>} List of recommended freelancers with scores and reasons.
 */
async function recommendFreelancers(projectId) {
  try {
    const project = await ProjectPost.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const requiredSkills = project.skills_required || [];
    const maxBudget = project.budget_max || project.budget || 0;

    // Fetch all active freelancers
    const freelancers = await User.find({ role: 'freelancer', moderation_status: 'active' });
    const recommended = [];

    for (const freelancer of freelancers) {
      // 1. Skill Match Score (0 - 40 points)
      let skillScore = 0;
      if (requiredSkills.length > 0) {
        const freelancerSkills = freelancer.skills || [];
        const overlap = requiredSkills.filter(skill => 
          freelancerSkills.some(fs => fs.toLowerCase() === skill.toLowerCase())
        );
        skillScore = (overlap.length / requiredSkills.length) * 40;
      } else {
        skillScore = 30; // Default if project has no required skills
      }

      // 2. Rating Score (0 - 25 points)
      const reviews = await Review.find({ reviewee_id: freelancer._id });
      let avgRating = 4.0; // Default rating if no reviews
      if (reviews.length > 0) {
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        avgRating = sum / reviews.length;
      }
      const ratingScore = (avgRating / 5) * 25;

      // 3. Completed Projects Score (0 - 15 points)
      const completedCount = freelancer.my_projects?.filter(p => p.status === 'completed').length || 0;
      const completedScore = Math.min(completedCount, 5) * 3; // Cap at 5 projects for max score

      // 4. Budget/Rate Fit Score (0 - 20 points)
      // Check if freelancer's hourly rate fits within the budget estimate (assuming standard 30-hour project baseline or direct fit)
      const freelancerRate = freelancer.hourly_rate || 20;
      let budgetScore = 20;
      if (maxBudget > 0) {
        const estimatedProjectCost = freelancerRate * 30; // Assume 30 hours of work
        if (estimatedProjectCost > maxBudget) {
          const ratio = maxBudget / estimatedProjectCost;
          budgetScore = Math.max(5, ratio * 20); // Scale down but keep a minimum of 5 points
        }
      }

      const totalScore = Math.round(skillScore + ratingScore + completedScore + budgetScore);

      recommended.push({
        freelancerId: freelancer._id,
        name: freelancer.full_name,
        avatar: freelancer.avatar_url,
        bio: freelancer.bio,
        skills: freelancer.skills,
        hourlyRate: freelancerRate,
        rating: Number(avgRating.toFixed(1)),
        completedProjectsCount: completedCount,
        matchPercentage: Math.min(totalScore, 100)
      });
    }

    // Sort by match percentage descending
    recommended.sort((a, b) => b.matchPercentage - a.matchPercentage);

    // Take top 3 and ask Gemini for personalized recommendation reasons
    const top3 = recommended.slice(0, 3);
    
    if (top3.length > 0) {
      const candidatesInfo = top3.map((c, i) => 
        `${i+1}. ${c.name}: Skills=[${c.skills.join(',')}], Rating=${c.rating}, CompletedProjects=${c.completedProjectsCount}, HourlyRate=$${c.hourlyRate}/hr.`
      ).join('\n');

      const prompt = `
        You are a project recruiter matchmaker.
        Project Title: "${project.title}"
        Project Description: "${project.description}"
        Required Skills: [${requiredSkills.join(', ')}]
        Budget Maximum: $${maxBudget}

        Review these top 3 candidates matching this project:
        ${candidatesInfo}

        Provide a JSON object where the keys are the candidate names, and the values are string containing a 2-sentence explanation of why they are the perfect match (incorporating their skills, ratings, and experience relative to the project).
        
        Example Output Format:
        {
          "John Doe": "John has a strong background in React matching your frontend requirements, along with a flawless 5.0 rating on 4 projects.",
          "Jane Smith": "Jane matches 100% of the required skills, and her competitive hourly rate fits comfortably within your budget specifications."
        }
      `;

      const reasons = await callGemini(prompt, true, "Generate candidate match reasonings in JSON format.");
      
      top3.forEach(c => {
        c.recommendationReason = reasons?.[c.name] || `${c.name} has a strong skill alignment and a high match rate of ${c.matchPercentage}% based on platform history.`;
      });
    }

    return top3;
  } catch (err) {
    console.error('Error matching freelancers:', err);
    throw err;
  }
}

module.exports = {
  recommendFreelancers
};

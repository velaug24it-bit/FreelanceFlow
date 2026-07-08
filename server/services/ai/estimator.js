const ProjectPost = require('../../models/ProjectPost');
const { callGemini } = require('./gemini');

/**
 * Predicts realistic minimum, average, and maximum costs based on historical platform data and inputs.
 */
async function estimateBudget(title, category, skillsRequired) {
  try {
    // 1. Gather historical data from completed/open project posts in similar category
    const similarProjects = await ProjectPost.find({ 
      $or: [
        { category: category },
        { title: { $regex: title.split(' ')[0], $options: 'i' } }
      ]
    }).limit(20);

    let historicalMin = 10000;
    let historicalMax = 200000;
    let historicalAvg = 80000;

    if (similarProjects.length > 0) {
      const budgets = similarProjects.map(p => p.budget || p.budget_max || (p.budget_min + p.budget_max)/2 || 0).filter(b => b > 0);
      if (budgets.length > 0) {
        historicalMin = Math.min(...budgets);
        historicalMax = Math.max(...budgets);
        historicalAvg = Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length);
      }
    }

    // 2. Request Gemini to refine estimates based on specific skill requirements and title complexity
    const prompt = `
      Analyze this project request to generate a professional budget estimate:
      Title: "${title}"
      Category: "${category}"
      Skills: [${skillsRequired?.join(', ')}]
      
      Historical Platform Baseline:
      - Min Project Budget: ₹${historicalMin}
      - Avg Project Budget: ₹${historicalAvg}
      - Max Project Budget: ₹${historicalMax}

      Suggest a realistic minimum, average, and maximum budget in Indian Rupees (INR) for this custom job.
      Return a JSON object with this exact structure:
      {
        "minimum": number,
        "average": number,
        "maximum": number,
        "reasoning": "A paragraph explaining the pricing tier based on skills, tech complexity, and historical baseline."
      }
    `;

    const result = await callGemini(prompt, true, "You are a professional IT Estimator. Return only JSON.");
    return result;
  } catch (err) {
    console.error('Error estimating budget:', err);
    throw err;
  }
}

/**
 * Predicts timeline, milestones and delay risks based on requirements.
 */
async function estimateTimeline(title, description, budget, skillsRequired) {
  try {
    const prompt = `
      Analyze this project and estimate its timeline and milestones:
      Title: "${title}"
      Description: "${description}"
      Budget: ₹${budget}
      Skills Required: [${skillsRequired?.join(', ')}]

      Provide an estimated duration, structured milestones, and potential project delay risks.
      Return a JSON object with this exact structure:
      {
        "estimated_duration": "Estimated completion time (e.g. '30 Days' or '8 Weeks')",
        "milestones": [
          {
            "title": "Milestone title",
            "duration_days": number,
            "budget_percentage": number,
            "deliverables": "Deliverable description"
          },
          ...
        ],
        "risks": [
          {
            "risk": "Description of delay risk",
            "mitigation": "Suggested action to mitigate risk"
          },
          ...
        ]
      }
    `;

    const result = await callGemini(prompt, true, "You are a professional IT Project Manager. Return only JSON.");
    return result;
  } catch (err) {
    console.error('Error estimating timeline:', err);
    throw err;
  }
}

module.exports = {
  estimateBudget,
  estimateTimeline
};

const User = require('../../models/User');
const ProjectPost = require('../../models/ProjectPost');
const Invoice = require('../../models/Invoice');
const { callGemini } = require('./gemini');

/**
 * Generates platform analytics reports, linear forecasts, and AI insights.
 * 
 * @returns {Promise<object>} Forecasts, growth metrics, completion rate, and insights.
 */
async function generatePlatformAnalytics() {
  try {
    // 1. Gather stats from MongoDB
    const totalUsers = await User.countDocuments();
    const freelancersCount = await User.countDocuments({ role: 'freelancer' });
    const clientsCount = totalUsers - freelancersCount;

    const allProjects = await ProjectPost.find();
    const totalProjects = allProjects.length;
    const completedProjects = allProjects.filter(p => p.status === 'completed').length;
    const projectCompletionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

    // Fetch invoices to compute monthly revenue
    const invoices = await Invoice.find({ status: 'paid' }).select('total_amount paid_at created_at');
    
    // Group paid revenue by month (last 6 months)
    const monthlyRevMap = {};
    invoices.forEach(inv => {
      const date = inv.paid_at || inv.created_at;
      if (date) {
        const key = new Date(date).toLocaleString('default', { month: 'short', year: 'numeric' });
        monthlyRevMap[key] = (monthlyRevMap[key] || 0) + inv.total_amount;
      }
    });

    const monthlyRevenue = Object.keys(monthlyRevMap).map(month => ({
      name: month,
      revenue: Math.round(monthlyRevMap[month])
    })).slice(-6); // Top 6 most recent months

    // Compute simple linear growth average
    let avgGrowthRate = 5; // Default 5%
    let forecastedRev = 50000; // Default estimate
    if (monthlyRevenue.length >= 2) {
      let totalGrowth = 0;
      for (let i = 1; i < monthlyRevenue.length; i++) {
        const prev = monthlyRevenue[i-1].revenue || 1;
        const curr = monthlyRevenue[i].revenue;
        totalGrowth += ((curr - prev) / prev) * 100;
      }
      avgGrowthRate = Number((totalGrowth / (monthlyRevenue.length - 1)).toFixed(1));
      const lastMonthRev = monthlyRevenue[monthlyRevenue.length - 1].revenue;
      forecastedRev = Math.round(lastMonthRev * (1 + avgGrowthRate / 100));
    }

    // Client signup growth metrics
    const userSignups = await User.find().select('created_at');
    const signupMap = {};
    userSignups.forEach(u => {
      if (u.created_at) {
        const key = new Date(u.created_at).toLocaleString('default', { month: 'short' });
        signupMap[key] = (signupMap[key] || 0) + 1;
      }
    });

    const clientGrowthData = Object.keys(signupMap).map(month => ({
      name: month,
      signups: signupMap[month]
    })).slice(-6);

    // Call Gemini (via Groq) to generate business insights based on these aggregated figures
    const analyticsContext = `
      Platform Statistics:
      - Total Registered Users: ${totalUsers} (Clients: ${clientsCount}, Freelancers: ${freelancersCount})
      - Total Posted Projects: ${totalProjects} (Completed: ${completedProjects}, Completion Rate: ${projectCompletionRate}%)
      - Monthly Revenue History: ${JSON.stringify(monthlyRevenue)}
      - Current Avg Monthly Growth Rate: ${avgGrowthRate}%
      - Forecasted Revenue Next Month: $${forecastedRev}
      - Signups History: ${JSON.stringify(clientGrowthData)}
    `;

    const prompt = `
      You are an AI Business Advisor for a Freelance Marketplace.
      Analyze these platform operational metrics:
      ${analyticsContext}

      Generate 3 highly useful market insights that directly help the Freelancers and Clients using this platform. 
      For example, advise freelancers on earning potential, pricing, or demand trends, and advise clients on hiring strategies, budgets, or market activity based on these stats.
      Make the insights sound like actionable advice for the platform's users (not administrators).
      Return a JSON object with this exact structure:
      {
        "forecasted_revenue_next_month": number,
        "growth_rate": number,
        "insights": [
          "Market Insight 1 (e.g., advice for freelancers on maximizing revenue or demand)",
          "Market Insight 2 (e.g., advice for clients on project completion trends or hiring)",
          "Market Insight 3 (e.g., general platform momentum and what it means for users)"
        ]
      }
    `;

    const result = await callGemini(prompt, true, "You are a professional business intelligence reporter. Return only JSON.");
    
    return {
      monthlyRevenue,
      clientGrowthData,
      projectCompletionRate,
      totalProjects,
      totalUsers,
      insights: result?.insights || [
        "Platform revenue is growing steadily. Freelancers should consider increasing their rates for high-demand skills to match the rising market value.",
        "With consistent user growth, clients have access to a larger talent pool. Now is a great time to post complex projects and attract top-tier freelancers.",
        "The project completion rate indicates strong reliability. Freelancers who consistently deliver on time are positioned to capture the forecasted revenue growth."
      ],
      forecastedRevenue: result?.forecasted_revenue_next_month || forecastedRev,
      growthRate: result?.growth_rate || avgGrowthRate
    };
  } catch (err) {
    console.error('Error generating platform analytics:', err);
    throw err;
  }
}

module.exports = {
  generatePlatformAnalytics
};

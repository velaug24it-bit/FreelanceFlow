const Task = require('../../models/Task');
const Milestone = require('../../models/Milestone');
const ProjectPost = require('../../models/ProjectPost');
const { callGemini } = require('./gemini');

/**
 * Evaluates active project metrics and returns delay/overrun predictions.
 * 
 * @param {string} projectId The ID of the project.
 * @returns {Promise<object>} Delay probability, overrun probability, and suggested actions.
 */
async function predictProjectRisk(projectId) {
  try {
    const project = await ProjectPost.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const tasks = await Task.find({ project_id: projectId });
    const milestones = await Milestone.find({ project_id: projectId });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    
    // Check overdue tasks
    const now = new Date();
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done').length;

    // Check overdue milestones
    const overdueMilestones = milestones.filter(m => m.due_date && new Date(m.due_date) < now && m.status !== 'completed').length;

    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const prompt = `
      You are an expert technical risk auditor.
      Analyze the project delivery execution health:

      Project: "${project.title}"
      Status: "${project.status}"
      Budget: $${project.budget || project.bid_amount || 0}
      Due Date: ${project.due_date || 'None'}

      Platform Metrics:
      - Total Tasks: ${totalTasks} (Completed: ${completedTasks}, In-Progress: ${inProgressTasks}, Completion Rate: ${taskCompletionRate}%)
      - Overdue Tasks: ${overdueTasks}
      - Total Milestones: ${milestones.length}
      - Overdue Milestones: ${overdueMilestones}

      Predict delay probability and budget overrun risks. Recommend immediately actionable steps.
      Return a JSON object with this exact structure:
      {
        "delay_probability": "Low" | "Medium" | "High",
        "budget_overrun_risk": "Low" | "Medium" | "High",
        "communication_issues": "Description of any collaboration signals or minimal risk details.",
        "suggested_actions": ["Action 1", "Action 2", "Action 3", ...]
      }
    `;

    const result = await callGemini(prompt, true, "You are a professional project risk auditor. Return only JSON.");
    
    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      overdueMilestones,
      taskCompletionRate,
      delayProbability: result?.delay_probability || "Low",
      budgetOverrunRisk: result?.budget_overrun_risk || "Low",
      communicationIssues: result?.communication_issues || "No communication blockages detected.",
      suggestedActions: result?.suggested_actions || [
        "Review overdue tasks and re-align milestone due dates.",
        "Schedule a quick sync with the freelancer to check current progress roadblocks."
      ]
    };
  } catch (err) {
    console.error('Error predicting project risk:', err);
    throw err;
  }
}

module.exports = {
  predictProjectRisk
};

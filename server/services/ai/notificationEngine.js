const NotificationHelper = require('../../utils/notificationHelper');
const ProjectPost = require('../../models/ProjectPost');
const User = require('../../models/User');
const { recommendFreelancers } = require('./recommendation');

/**
 * Periodically scan and send AI notifications for match recommendations, approaching deadlines, etc.
 */
class AINotificationEngine {
  /**
   * Triggers notifications for high-matching freelancers when a project is posted.
   */
  static async notifyMatchingFreelancers(projectId) {
    try {
      const project = await ProjectPost.findById(projectId);
      if (!project) return;

      // Get recommended freelancers
      const recommendations = await recommendFreelancers(projectId);
      
      // Notify freelancers with a match percentage >= 75%
      const matchCandidates = recommendations.filter(r => r.matchPercentage >= 75);

      for (const candidate of matchCandidates) {
        await NotificationHelper.createNotification({
          userId: candidate.freelancerId,
          type: 'job_match',
          title: '✨ AI Matchmaker recommendation',
          message: `You are a ${candidate.matchPercentage}% match for the project: "${project.title}". Bid now!`,
          referenceId: project._id,
          referenceType: 'project',
          actionUrl: `/marketplace/projects/${project._id}`
        });
      }
      console.log(`📡 AI matching notifications sent to ${matchCandidates.length} freelancers for project: ${project.title}`);
    } catch (err) {
      console.error('Error in AI notify matching freelancers:', err);
    }
  }

  /**
   * Scans active projects and sends reminder notifications for approaching deadlines.
   */
  static async sendDeadlineReminders() {
    try {
      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(now.getDate() + 3);

      // Find projects in progress with deadline soon
      const projects = await ProjectPost.find({
        status: { $in: ['active', 'in_progress'] },
        deadline: { $gte: now, $lte: threeDaysFromNow }
      });

      for (const project of projects) {
        // Notify client
        await NotificationHelper.createNotification({
          userId: project.client_id,
          type: 'general',
          title: '⏳ Project Deadline Approaching',
          message: `Your project "${project.title}" is due in less than 3 days on ${new Date(project.deadline).toLocaleDateString()}. Check status.`,
          referenceId: project._id,
          referenceType: 'project',
          actionUrl: `/projects/${project._id}`
        });

        // Notify freelancer
        if (project.selected_freelancer_id) {
          await NotificationHelper.createNotification({
            userId: project.selected_freelancer_id,
            type: 'general',
            title: '⏳ Project Deadline Approaching',
            message: `Milestone submission for "${project.title}" is due in less than 3 days. Complete tasks.`,
            referenceId: project._id,
            referenceType: 'project',
            actionUrl: `/projects/${project._id}`
          });
        }
      }
    } catch (err) {
      console.error('Error sending AI deadline reminders:', err);
    }
  }
}

module.exports = AINotificationEngine;

const User = require('../models/User');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Invoice = require('../models/Invoice');

const PLAN_LIMITS = {
    free: { maxClients: 5, maxProjects: 10, maxInvoices: 20 },
    pro: { maxClients: 50, maxProjects: 100, maxInvoices: 500 },
    business: { maxClients: 999999, maxProjects: 999999, maxInvoices: 999999 }
};

async function checkLimit(userId, resourceType) {
    try {
        const user = await User.findById(userId).select('subscription_tier subscription_plan').lean();
        const plan = user?.subscription_tier || user?.subscription_plan || 'free';
        const models = { client: Client, project: Project, invoice: Invoice };
        const Model = models[resourceType];
        const currentCount = Model ? await Model.countDocuments({ user_id: userId }) : 0;
        const key = `max${resourceType.charAt(0).toUpperCase()}${resourceType.slice(1)}s`;
        const limit = (PLAN_LIMITS[plan] || PLAN_LIMITS.free)[key];

        if (currentCount >= limit) {
            return {
                allowed: false,
                limit,
                current: currentCount,
                plan,
                message: `You've reached your ${plan} plan limit of ${limit} ${resourceType}s. Upgrade to add more.`
            };
        }

        return { allowed: true, limit, current: currentCount, plan };
    } catch (error) {
        console.error('Error checking limit:', error);
        return { allowed: true };
    }
}

module.exports = { checkLimit, PLAN_LIMITS };

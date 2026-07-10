const User = require('../models/User');
const Client = require('../models/Client');
const Project = require('../models/Project');
const ProjectPost = require('../models/ProjectPost');
const Invoice = require('../models/Invoice');
const Bid = require('../models/Bid');
const Contract = require('../models/Contract');
const SavedSearch = require('../models/SavedSearch');
const { LIMITS } = require('../utils/constants');

async function getCurrentUsage(userId, resourceType) {
    try {
        switch (resourceType) {
            // Freelancer resources
            case 'bids':
                return await Bid.countDocuments({ freelancer_id: userId });
            case 'saved_projects':
                return await SavedSearch.countDocuments({ user_id: userId });
            case 'proposals_in_progress':
                return await Bid.countDocuments({ freelancer_id: userId, status: 'pending' });
            case 'portfolio_items': {
                const user = await User.findById(userId).select('portfolio_links');
                return user?.portfolio_links?.length || 0;
            }
            case 'active_contracts':
                return await Contract.countDocuments({ freelancer_id: userId, status: 'active' });
            case 'profile_boosts': {
                const user = await User.findById(userId).select('boosts_count');
                return user?.boosts_count || 0;
            }
            case 'featured_applications':
                return await Bid.countDocuments({ freelancer_id: userId, is_featured: true });

            // Client resources
            case 'projects_posted':
                return await ProjectPost.countDocuments({ client_id: userId });
            case 'active_projects':
                return await ProjectPost.countDocuments({ client_id: userId, status: { $in: ['active', 'in_progress', 'open'] } });
            case 'featured_projects':
                return await ProjectPost.countDocuments({ client_id: userId, is_featured: true });
            case 'shortlisted_freelancers': {
                const clientProjectIds = await ProjectPost.find({ client_id: userId }).distinct('_id');
                return await Bid.countDocuments({ project_id: { $in: clientProjectIds }, is_shortlisted: true });
            }
            case 'hiring_slots':
                return await Contract.countDocuments({ client_id: userId, status: 'active' });

            // Existing resources (backward compatibility)
            case 'clients':
                return await Client.countDocuments({ user_id: userId });
            case 'invoices':
                return await Invoice.countDocuments({ user_id: userId });
            case 'projects':
                return await Project.countDocuments({ user_id: userId });

            default:
                return 0;
        }
    } catch (err) {
        console.error(`Error getting current usage for ${resourceType}:`, err);
        return 0;
    }
}

const validateLimit = (resourceType) => {
    return async (req, res, next) => {
        try {
            const userId = req.userId || req.user?._id;
            if (!userId) {
                return res.status(401).json({ error: 'Access denied' });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Resolve effective plan: prefer subscriptionPlan unless it's still the
            // default 'FREE' and subscription_tier is an upgraded tier (legacy users).
            const legacyPlan = (user.subscription_tier || 'free').toUpperCase();
            const newPlan    = (user.subscriptionPlan || 'FREE').toUpperCase();
            const plan = (newPlan === 'FREE' && legacyPlan !== 'FREE') ? legacyPlan : newPlan;

            // Sync subscriptionPlan with subscription_tier if out of date
            if (plan !== newPlan) {
                user.subscriptionPlan = plan;
                user.subscriptionStatus = (user.subscription_status || 'active').toUpperCase();
                await user.save();
            }

            // Bypass check for BUSINESS plan
            if (plan === 'BUSINESS') {
                return next();
            }

            const limit = LIMITS[plan]?.[resourceType] ?? LIMITS.FREE[resourceType];
            if (limit === Infinity) {
                return next();
            }

            const count = await getCurrentUsage(userId, resourceType);

            if (count >= limit) {
                const upgradeTo = plan === 'FREE' ? 'PRO' : 'BUSINESS';
                return res.status(403).json({
                    error: 'LIMIT_REACHED',
                    message: `You have reached your ${plan} plan limit. Upgrade to ${upgradeTo} to continue.`,
                    resource: resourceType,
                    limit: limit,
                    current: count
                });
            }

            next();
        } catch (error) {
            console.error(`Error checking limit for ${resourceType}:`, error);
            res.status(500).json({ error: 'Server error while checking plan limits' });
        }
    };
};

const checkResourceLimit = (resourceType) => {
    return validateLimit(resourceType);
};

const requireProPlan = (featureName) => {
    return async (req, res, next) => {
        try {
            const userId = req.userId || req.user?._id;
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Resolve effective plan: prefer subscriptionPlan unless it's still the
            // default 'FREE' and subscription_tier is an upgraded tier (legacy users).
            const legacyPlan = (user.subscription_tier || 'free').toUpperCase();
            const newPlan    = (user.subscriptionPlan || 'FREE').toUpperCase();
            const plan = (newPlan === 'FREE' && legacyPlan !== 'FREE') ? legacyPlan : newPlan;

            // Sync subscriptionPlan with subscription_tier if out of date
            if (plan !== newPlan) {
                user.subscriptionPlan = plan;
                user.subscriptionStatus = (user.subscription_status || 'active').toUpperCase();
                await user.save();
            }

            if (plan === 'FREE') {
                return res.status(403).json({
                    error: 'UPGRADE_REQUIRED',
                    message: `The ${featureName} feature requires a Pro or Business plan. Please upgrade to access this feature.`,
                    feature: featureName
                });
            }

            next();
        } catch (error) {
            console.error(`Error checking access for ${featureName}:`, error);
            res.status(500).json({ error: 'Server error while checking feature access' });
        }
    };
};

module.exports = {
    getCurrentUsage,
    validateLimit,
    checkResourceLimit,
    requireProPlan
};

const User = require('../models/User');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Invoice = require('../models/Invoice');

const PLAN_LIMITS = {
    free: {
        clients: 5,
        projects: 10,
        invoices: 20
    },
    pro: {
        clients: 50,
        projects: 100,
        invoices: 500
    },
    business: {
        clients: Infinity,
        projects: Infinity,
        invoices: Infinity
    }
};

const checkResourceLimit = (resourceType) => {
    return async (req, res, next) => {
        try {
            const user = await User.findById(req.userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const tier = user.subscription_tier || 'free';
            const limit = PLAN_LIMITS[tier]?.[resourceType];

            if (limit === Infinity) {
                return next();
            }

            let count = 0;
            switch (resourceType) {
                case 'clients':
                    count = await Client.countDocuments({ user_id: req.userId });
                    break;
                case 'projects':
                    count = await Project.countDocuments({ user_id: req.userId });
                    break;
                case 'invoices':
                    count = await Invoice.countDocuments({ user_id: req.userId });
                    break;
                default:
                    return next();
            }

            if (count >= limit) {
                return res.status(403).json({
                    error: 'LIMIT_REACHED',
                    message: `You have reached the maximum number of ${resourceType} for the ${tier} plan. Please upgrade to continue.`,
                    resource: resourceType,
                    limit: limit
                });
            }

            next();
        } catch (error) {
            console.error(`Error checking limits for ${resourceType}:`, error);
            res.status(500).json({ error: 'Server error while checking plan limits' });
        }
    };
};

const requireProPlan = (featureName) => {
    return async (req, res, next) => {
        try {
            const user = await User.findById(req.userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const tier = user.subscription_tier || 'free';
            
            if (tier === 'free') {
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
    checkResourceLimit,
    requireProPlan
};

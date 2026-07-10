const FREE_LIMIT = 2;
const PRO_LIMIT = 10;
const BUSINESS_LIMIT = Infinity;

const LIMITS = {
    FREE: {
        // Freelancer Limits
        bids: FREE_LIMIT,
        saved_projects: FREE_LIMIT,
        proposals_in_progress: FREE_LIMIT,
        portfolio_items: FREE_LIMIT,
        active_contracts: FREE_LIMIT,
        profile_boosts: FREE_LIMIT,
        featured_applications: FREE_LIMIT,

        // Client Limits
        projects_posted: FREE_LIMIT,
        active_projects: FREE_LIMIT,
        featured_projects: FREE_LIMIT,
        shortlisted_freelancers: FREE_LIMIT,
        hiring_slots: FREE_LIMIT,

        // Existing client-side features
        clients: 5,
        invoices: 20,
        projects: 10
    },
    PRO: {
        // Freelancer Limits
        bids: PRO_LIMIT,
        saved_projects: PRO_LIMIT,
        proposals_in_progress: PRO_LIMIT,
        portfolio_items: PRO_LIMIT,
        active_contracts: PRO_LIMIT,
        profile_boosts: PRO_LIMIT,
        featured_applications: PRO_LIMIT,

        // Client Limits
        projects_posted: PRO_LIMIT,
        active_projects: PRO_LIMIT,
        featured_projects: PRO_LIMIT,
        shortlisted_freelancers: PRO_LIMIT,
        hiring_slots: PRO_LIMIT,

        // Existing client-side features
        clients: 50,
        invoices: 500,
        projects: 100
    },
    BUSINESS: {
        // Freelancer Limits
        bids: BUSINESS_LIMIT,
        saved_projects: BUSINESS_LIMIT,
        proposals_in_progress: BUSINESS_LIMIT,
        portfolio_items: BUSINESS_LIMIT,
        active_contracts: BUSINESS_LIMIT,
        profile_boosts: BUSINESS_LIMIT,
        featured_applications: BUSINESS_LIMIT,

        // Client Limits
        projects_posted: BUSINESS_LIMIT,
        active_projects: BUSINESS_LIMIT,
        featured_projects: BUSINESS_LIMIT,
        shortlisted_freelancers: BUSINESS_LIMIT,
        hiring_slots: BUSINESS_LIMIT,

        // Existing client-side features
        clients: BUSINESS_LIMIT,
        invoices: BUSINESS_LIMIT,
        projects: BUSINESS_LIMIT
    }
};

module.exports = {
    FREE_LIMIT,
    PRO_LIMIT,
    BUSINESS_LIMIT,
    LIMITS
};

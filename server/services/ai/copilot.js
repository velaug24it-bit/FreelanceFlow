const ProjectPost = require('../../models/ProjectPost');
const Bid = require('../../models/Bid');
const User = require('../../models/User');
const { callGemini } = require('./gemini');

/**
 * Generates a tailored AI Deal Copilot plan for a project and its selected freelancer.
 * 
 * @param {string} projectId The ID of the ProjectPost.
 * @returns {Promise<object>} The roadmap, pricing valuation, and conflict resolution advice.
 */
async function generateDealCopilotPlan(projectId) {
  try {
    const project = await ProjectPost.findById(projectId);
    if (!project) throw new Error('Project not found');

    if (!project.selected_freelancer_id) {
      throw new Error('This project does not have a freelancer assigned yet. Deal Copilot requires a client-freelancer pair.');
    }

    const client = await User.findById(project.client_id);
    const freelancer = await User.findById(project.selected_freelancer_id);
    
    // Retrieve the accepted bid details
    const acceptedBid = await Bid.findOne({
      project_id: projectId,
      freelancer_id: project.selected_freelancer_id,
      status: 'accepted'
    });

    const budget = project.bid_amount || acceptedBid?.bid_amount || project.budget_min || 0;
    const duration = project.duration || (acceptedBid ? `${acceptedBid.estimated_days} days` : 'Not specified');
    const proposal = acceptedBid?.proposal || 'No proposal text available.';

    const context = `
      Project Title: ${project.title}
      Project Category: ${project.category}
      Project Description: ${project.description}
      Skills Required: ${project.skills_required.join(', ')}
      
      Freelancer: ${freelancer?.full_name || 'Freelancer'}
      Freelancer Proposal: "${proposal}"
      
      Client: ${client?.full_name || 'Client'}
      
      Agreed Budget: $${budget}
      Agreed Timeline/Duration: ${duration}
    `;

    const prompt = `
      You are an AI Deal Mediator and Agile Project Manager.
      Analyze the project contract details below:
      ${context}

      Generate a comprehensive AI Deal Copilot & Scope Plan to help both the client and the freelancer collaborate successfully.
      
      Ensure your advice is extremely useful for BOTH parties:
      - The Roadmap must contain clear, technical milestones for the freelancer, but translate them into concrete "Acceptance Criteria" so the non-technical client knows exactly how to verify the work.
      - The Fair Deal section must evaluate if the budget and timeline are reasonable, listing concrete cost-saving compromises (if tight) or value-add opportunities.
      - The Dispute Resolution section must provide escrow advice and mitigation tips for the top integration risks of this specific project stack.

      Return a JSON object with this exact structure:
      {
        "pricing_rating": "Fair" | "Slightly Low" | "Slightly High",
        "pricing_reasoning": "Reasoning explaining the market value of these skills relative to the budget.",
        "value_add_suggestions": ["Value add 1", "Value add 2"],
        "cost_saving_suggestions": ["Cost saving 1", "Cost saving 2"],
        "dispute_mitigation_rules": [
          { "risk": "Risk 1", "mitigation": "Mitigation 1" },
          { "risk": "Risk 2", "mitigation": "Mitigation 2" }
        ],
        "escrow_split_guidelines": "Advice on how milestones should be structured and released to protect both parties.",
        "roadmap": [
          {
            "phase": "Phase name (e.g. Planning & Database)",
            "deliverables": ["Deliverable 1", "Deliverable 2"],
            "verification_instructions_for_client": "Step-by-step instructions on how the client can verify this phase is complete (without coding knowledge)."
          },
          {
            "phase": "Phase name (e.g. API Development)",
            "deliverables": ["Deliverable 1", "Deliverable 2"],
            "verification_instructions_for_client": "Step-by-step instructions on how the client can verify this phase is complete."
          },
          {
            "phase": "Phase name (e.g. Front-end Integration & Testing)",
            "deliverables": ["Deliverable 1", "Deliverable 2"],
            "verification_instructions_for_client": "Step-by-step instructions on how the client can verify this phase is complete."
          }
        ]
      }
    `;

    const result = await callGemini(prompt, true, "You are a professional project mediator. Return only JSON.");

    return {
      pricingRating: result?.pricing_rating || "Fair",
      pricingReasoning: result?.pricing_reasoning || "The budget aligns with standard freelance rates for similar technical specifications and complexity levels.",
      valueAddSuggestions: result?.value_add_suggestions || [
        "Suggest adding automated integration tests to avoid future regression errors.",
        "Propose a post-delivery support window of 14 days for minor bug fixes."
      ],
      costSavingSuggestions: result?.cost_saving_suggestions || [
        "Use pre-built templates for basic landing page elements to save development hours.",
        "Focus on key features first (MVP) and delay secondary features like analytics to Phase 2."
      ],
      disputeMitigationRules: result?.dispute_mitigation_rules || [
        { risk: "Scope Creep", mitigation: "Establish a strict change request process for any features not explicitly listed in this scope plan." },
        { risk: "Third-party APIs", mitigation: "Verify API keys and credentials are provided by the client on Day 1 to avoid staging delays." }
      ],
      escrowSplitGuidelines: result?.escrow_split_guidelines || "Recommend releasing 20% on database setup, 40% on main functionality integration, and 40% upon successful final verification.",
      roadmap: result?.roadmap || [
        {
          phase: "1. Planning & Setup",
          deliverables: ["Database architecture", "Figma user flows"],
          verification_instructions_for_client: "Request a screenshare walkthrough of the Figma designs and ask to see the hosted database structure."
        },
        {
          phase: "2. Backend API Development",
          deliverables: ["Secure user authentication", "API integrations"],
          verification_instructions_for_client: "Check that user login/signup works on a staging domain and verify that data is saved correctly in the database."
        },
        {
          phase: "3. Frontend Integration & Launch",
          deliverables: ["Fully responsive UI dashboards", "Final deployment link"],
          verification_instructions_for_client: "Open the website on both your mobile phone and desktop browser to check responsiveness, and perform end-to-end testing of the payment system."
        }
      ]
    };
  } catch (err) {
    console.error('Error generating AI Deal Copilot plan:', err);
    throw err;
  }
}

module.exports = {
  generateDealCopilotPlan
};

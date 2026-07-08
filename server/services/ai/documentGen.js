const { callGemini } = require('./gemini');
const ProjectPost = require('../../models/ProjectPost');
const User = require('../../models/User');

/**
 * Automatically generates professional freelance contract documents.
 */
async function generateContractDocument(projectId, clientName, freelancerName, amount, startDate, endDate, milestones) {
  let projectTitle = 'Freelance Work';
  try {
    const project = await ProjectPost.findById(projectId);
    if (project) projectTitle = project.title;
  } catch (err) {
    // Ignore error
  }

  const milestonesText = (milestones || []).map((m, i) =>
    `  Milestone ${i + 1}: "${m.title || m.name || 'Milestone'}" — $${m.amount}`
  ).join('\n');

  const prompt = `
You are a senior legal counsel specializing in freelance technology contracts.

Generate a COMPREHENSIVE, DETAILED, and LEGALLY BINDING freelance agreement for the following engagement:

Project Title: "${projectTitle}"
Client Name: "${clientName}"
Freelancer Name: "${freelancerName}"
Contract Amount: $${amount} USD
Start Date: ${startDate}
End Date: ${endDate}
Payment Milestones:
${milestonesText || '  Full payment upon project completion'}

Requirements for the contract:
1. Use proper legal language throughout
2. Include DETAILED scope of work specific to "${projectTitle}"
3. Include specific payment schedule tied to milestones
4. Include intellectual property assignment with software-specific terms
5. Include non-disclosure and confidentiality obligations
6. Include liability limitation and indemnification clauses
7. Include revision policy (number of revision rounds)
8. Include acceptance criteria and approval process
9. Include termination clause with notice period
10. Include governing law and arbitration clause
11. Use markdown formatting with ## for sections, **bold** for key terms, and tables for milestones

Return ONLY a valid JSON object in this exact format:
{
  "contract_text": "full markdown formatted contract here",
  "agreement_summary": "Three concise sentences summarizing the key obligations of each party and payment terms."
}
  `;

  try {
    const result = await callGemini(prompt, true, "You are a legal contract drafter. Return only JSON.");
    return result;
  } catch (err) {
    console.error('Error generating contract document:', err);
    throw err;
  }
}

/**
 * Automatically generates a structured GST Invoice.
 */
function generateInvoiceDetails(invoiceNumber, clientName, clientCompany, freelancerName, subtotal, taxRate) {
  const gstRate = taxRate || 18; // Default Indian GST is 18%
  const taxAmount = (subtotal * gstRate) / 100;
  const totalAmount = subtotal + taxAmount;

  // Mock GST code for the billing document
  const stateCode = "27"; // Maharashtra default state code
  const randomGstSuffix = "AAAAA1111A1Z1";
  const mockGstNumber = `${stateCode}${randomGstSuffix}`;

  return {
    invoice_number: invoiceNumber,
    client_name: clientName,
    client_company: clientCompany || 'N/A',
    freelancer_name: freelancerName,
    gst_number: mockGstNumber,
    tax_rate: gstRate,
    tax_amount: Number(taxAmount.toFixed(2)),
    subtotal: subtotal,
    total_amount: Number(totalAmount.toFixed(2)),
    invoice_date: new Date().toLocaleDateString(),
    payment_terms: "Due on Receipt",
    notes: "Thank you for partnering with FreelanceFlow. This invoice includes GST standard platform compliance charges."
  };
}

module.exports = {
  generateContractDocument,
  generateInvoiceDetails
};

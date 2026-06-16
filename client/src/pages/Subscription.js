import React from 'react';
import { Check } from 'lucide-react';

const Subscription = () => {
  const plans = [
    {
      name: 'Starter',
      price: 29,
      features: ['Up to 10 clients', 'Basic invoicing', 'Email support']
    },
    {
      name: 'Professional',
      price: 59,
      popular: true,
      features: ['Up to 50 clients', 'Payment processing', 'Analytics', 'Priority support']
    },
    {
      name: 'Business',
      price: 99,
      features: ['Unlimited clients', 'White-label', 'API access', 'Dedicated support']
    }
  ];

  return (
    <div className="p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
        <p className="text-gray-600">Start free, upgrade when you need more</p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan, index) => (
          <div key={index} className={`bg-white rounded-lg shadow p-6 ${plan.popular ? 'ring-2 ring-blue-500' : ''}`}>
            {plan.popular && (
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">Popular</span>
            )}
            <h2 className="text-xl font-bold mt-4">{plan.name}</h2>
            <p className="text-3xl font-bold mt-4">${plan.price}<span className="text-sm text-gray-500">/mo</span></p>
            <ul className="mt-4 space-y-2">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-center">
                  <Check size={16} className="text-green-500 mr-2" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <button className="w-full mt-6 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
              Get Started
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Subscription;

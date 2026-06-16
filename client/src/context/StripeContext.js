import React, { createContext, useContext } from 'react';

const StripeContext = createContext(null);

export const StripeProvider = ({ children }) => {
  return (
    <StripeContext.Provider value={{}}>
      {children}
    </StripeContext.Provider>
  );
};

export const useStripe = () => useContext(StripeContext);

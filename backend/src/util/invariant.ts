const isProduction: boolean = process.env.NODE_ENV === 'production';
const prefix: string = 'Invariant failed';

// Throw an error if the condition fails
// Strip out error messages for production
// > Not providing an inline default argument for message as the result is smaller
const invariant = (condition: boolean, message?: string) => {
  if (condition) {
    return;
  }
  // Condition not passed

  if (isProduction) {
    // In production we strip the message but still throw
    throw new Error(prefix);
  } else {
    // When not in production we allow the message to pass through
    // *This block will be removed in non-production builds*
    throw new Error(`${prefix}: ${message || ''}`);
  }
};

export {
  invariant,
}
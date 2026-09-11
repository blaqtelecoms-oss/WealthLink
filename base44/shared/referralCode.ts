export const generateCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export async function generateUniqueReferralCode(base44) {
  let uniqueCode = generateCode();
  while ((await base44.asServiceRole.entities.User.filter({ referral_code: uniqueCode })).length) {
    uniqueCode = generateCode();
  }
  return uniqueCode;
}
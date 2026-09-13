function cleanName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function resolveStudentDisplayName({ profileName, metadataName, email } = {}) {
  const savedProfileName = cleanName(profileName);
  if (savedProfileName) return savedProfileName;

  const signupName = cleanName(metadataName);
  if (signupName) return signupName;

  const emailAddress = cleanName(email);
  const emailName = emailAddress.includes('@') ? emailAddress.split('@')[0].trim() : '';
  return emailName || 'طالب DarLugha';
}

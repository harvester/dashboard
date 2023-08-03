export function validateRfc1123Label(pathValue, getters, errors, validatorArgs, displayKey, value) {
  if (pathValue && pathValue?.length > 63) {
    errors.push(getters['i18n/t']('validation.stringLength.between', {
      key: displayKey,
      min: 1,
      max: 63
    }, true));
  }

  const reg = /[a-z0-9]([-a-z0-9]*[a-z0-9])?/;

  if (!reg.test(pathValue)) {
    const regex = `[a-z0-9]([-a-z0-9]*[a-z0-9])?`;

    errors.push(getters['i18n/t']('harvester.validation.generic.regex', {
      lowerType: displayKey, name: pathValue, regex, upperType: displayKey
    }));
  }

  return errors;
}

export function validateDnsSubdomainRfc1123(pathValue, getters, errors, validatorArgs, displayKey, value) {
  if (pathValue && pathValue?.length > 253) {
    errors.push(getters['i18n/t']('validation.stringLength.between', {
      key: displayKey,
      min: 1,
      max: 253
    }, true));
  }

  const reg = /[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*/;

  if (!reg.test(pathValue)) {
    const regex = `[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*`;

    errors.push(getters['i18n/t']('harvester.validation.generic.regex', {
      lowerType: displayKey, name: pathValue, regex, upperType: displayKey
    }));
  }

  return errors;
}

export function volumeSize(size, getters, errors, validatorArgs, displayKey, value) {
  if (!/^([1-9][0-9]{0,8})[a-zA-Z]+$/.test(size)) {
    const message = getters['i18n/t']('harvester.validation.generic.maximumSize', { max: '999999999 GiB' });

    errors.push(message);
  }

  return errors;
}

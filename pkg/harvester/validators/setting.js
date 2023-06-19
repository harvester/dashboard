export function backupTarget(value, getters, errors, validatorArgs) {
  const t = getters['i18n/t'];

  if (!value) {
    return errors;
  }

  const parseValue = JSON.parse(value);
  const type = parseValue.type;

  if (!type) {
    return errors;
  }

  if (type === 's3') {
    if (!parseValue.accessKeyId) {
      errors.push(t('validation.required', { key: 'accessKeyId' }));
    }

    if (!parseValue.secretAccessKey) {
      errors.push(t('validation.required', { key: 'secretAccessKey' }));
    }

    if (!parseValue.bucketRegion) {
      errors.push(t('validation.required', { key: 'bucketRegion' }));
    }

    if (!parseValue.bucketName) {
      errors.push(t('validation.required', { key: 'bucketName' }));
    }
  }

  if (!parseValue.endpoint && type !== 's3') {
    errors.push(t('validation.required', { key: 'endpoint' }));
  }

  return errors;
}

export function ntpServers(value, getters, errors, validatorArgs) {
  const { ntpServers } = JSON.parse(value);
  const t = getters['i18n/t'];
  const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  const hostRegex = /^(?!:\/\/)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/;

  if (!ntpServers) {
    return errors;
  }

  const ntpServersSet = new Set(ntpServers);

  if (ntpServers.length !== ntpServersSet.size) {
    errors.push(t('harvester.setting.ntpServers.isDuplicate'));
  }

  if (ntpServers.find(V => !ipv4Regex.test(V) && !hostRegex.test(V))) {
    errors.push(t('harvester.setting.ntpServers.isNotIPV4'));
  }

  return errors;
}

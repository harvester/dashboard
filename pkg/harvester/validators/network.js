export function ranges(ranges = [], getters, errors, validatorArgs) {
  const t = getters['i18n/t'];

  if (ranges.length === 0) {
    errors.push(t('validation.required', { key: t('harvester.ipPool.tabs.range') }, true));
  }

  ranges.map((r) => {
    if (!r.subnet) {
      errors.push(t('validation.required', { key: t('harvester.ipPool.subnet.label') }, true));
    }
  });

  return errors;
}

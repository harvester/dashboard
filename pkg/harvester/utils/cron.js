import cronstrue from 'cronstrue';

export function isCronValid(schedule = '') {
  try {
    const hint = cronstrue.toString(schedule);

    return !!hint;
  } catch (e) {
    return false;
  }
}

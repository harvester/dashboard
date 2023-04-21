export function allSettled(hash) {
  const keys = Object.keys(hash);
  const promises = Object.values(hash);

  return Promise.allSettled(promises).then((res) => {
    const out = {};

    for ( let i = 0 ; i < keys.length ; i++ ) {
      if (res[i].status === 'fulfilled') {
        out[keys[i]] = res[i].value;
      } else {
        out[keys[i]] = [];
      }
    }

    return out;
  });
}

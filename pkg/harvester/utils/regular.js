
export function isValidMac(value) {
  return /^[A-Fa-f0-9]{2}(-[A-Fa-f0-9]{2}){5}$|^[A-Fa-f0-9]{2}(:[A-Fa-f0-9]{2}){5}$/.test(value);
}

/**
 * RFC 1123
 * https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#dns-label-names
 */
export function isValidDNSLabelName(str) {
  const reg = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

  return reg.test(str);
}

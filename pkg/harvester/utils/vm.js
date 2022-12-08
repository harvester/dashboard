import { HCI as HCI_ANNOTATIONS } from '@/pkg/harvester/config/labels-annotations';

export function parseVolumeClaimTemplates(data) {
  const volumeClaimTemplateString = data?.metadata?.annotations[HCI_ANNOTATIONS.VOLUME_CLAIM_TEMPLATE];

  try {
    return JSON.parse(volumeClaimTemplateString);
  } catch (e) {
    return [];
  }
}

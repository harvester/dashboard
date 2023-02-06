import jsyaml from 'js-yaml';
import { get } from '@shell/utils/object';

export function rancherMonitoring(valuesContent, getters, errors, validatorArgs) {
  const valueJson = jsyaml.load(valuesContent);
  const requiredFields = [
    {
      path:           'prometheus.prometheusSpec.scrapeInterval',
      translationKey: 'monitoring.prometheus.config.scrape'
    },
    {
      path:           'prometheus.prometheusSpec.evaluationInterval',
      translationKey: 'monitoring.prometheus.config.evaluation'
    },
    {
      path:           'prometheus.prometheusSpec.retention',
      translationKey: 'monitoring.prometheus.config.retention'
    },
    {
      path:           'prometheus.prometheusSpec.retentionSize',
      translationKey: 'monitoring.prometheus.config.retentionSize'
    },
    {
      path:           'prometheus.prometheusSpec.resources.requests.cpu',
      translationKey: 'monitoring.prometheus.config.requests.cpu'
    },
    {
      path:           'prometheus.prometheusSpec.resources.requests.memory',
      translationKey: 'monitoring.prometheus.config.requests.memory'
    },
    {
      path:           'prometheus.prometheusSpec.resources.limits.cpu',
      translationKey: 'monitoring.prometheus.config.limits.cpu'
    },
    {
      path:           'prometheus.prometheusSpec.resources.limits.memory',
      translationKey: 'monitoring.prometheus.config.limits.memory'
    },
    {
      path:           'prometheus-node-exporter.resources.requests.cpu',
      translationKey: 'monitoring.prometheus.config.requests.cpu'
    },
    {
      path:           'prometheus-node-exporter.resources.requests.memory',
      translationKey: 'monitoring.prometheus.config.requests.memory'
    },
    {
      path:           'prometheus-node-exporter.resources.limits.cpu',
      translationKey: 'monitoring.prometheus.config.limits.cpu'
    },
    {
      path:           'prometheus-node-exporter.resources.limits.memory',
      translationKey: 'monitoring.prometheus.config.limits.memory'
    },
    {
      path:           'grafana.resources.requests.cpu',
      translationKey: 'monitoring.prometheus.config.requests.cpu'
    },
    {
      path:           'grafana.resources.requests.memory',
      translationKey: 'monitoring.prometheus.config.requests.memory'
    },
    {
      path:           'grafana.resources.limits.cpu',
      translationKey: 'monitoring.prometheus.config.limits.cpu'
    },
    {
      path:           'grafana.resources.limits.memory',
      translationKey: 'monitoring.prometheus.config.limits.memory'
    },
    {
      path:           'alertmanager.alertmanagerSpec.retention',
      translationKey: 'monitoring.prometheus.config.retention'
    },
    {
      path:           'alertmanager.alertmanagerSpec.resources.requests.cpu',
      translationKey: 'monitoring.prometheus.config.requests.cpu'
    },
    {
      path:           'alertmanager.alertmanagerSpec.resources.requests.memory',
      translationKey: 'monitoring.prometheus.config.requests.memory'
    },
    {
      path:           'alertmanager.alertmanagerSpec.resources.limits.cpu',
      translationKey: 'monitoring.prometheus.config.limits.cpu'
    },
    {
      path:           'alertmanager.alertmanagerSpec.resources.limits.memory',
      translationKey: 'monitoring.prometheus.config.limits.memory'
    },
  ];

  requiredFields.forEach((rule) => {
    if (!get(valueJson, rule.path)) {
      errors.push(getters['i18n/t']('validation.required', { key: getters['i18n/t'](rule.translationKey) }));
    }
  });

  return errors;
}

export function rancherLogging(valuesContent, getters, errors, validatorArgs) {
  const valueJson = jsyaml.load(valuesContent);
  const requiredFields = [
    {
      path:           'fluentbit.resources.requests.cpu',
      translationKey: 'monitoring.prometheus.config.requests.cpu'
    },
    {
      path:           'fluentbit.resources.requests.memory',
      translationKey: 'monitoring.prometheus.config.requests.memory'
    },
    {
      path:           'fluentbit.resources.limits.cpu',
      translationKey: 'monitoring.prometheus.config.limits.cpu'
    },
    {
      path:           'fluentbit.resources.limits.memory',
      translationKey: 'monitoring.prometheus.config.limits.memory'
    },
    {
      path:           'fluentd.resources.requests.cpu',
      translationKey: 'monitoring.prometheus.config.requests.cpu'
    },
    {
      path:           'fluentd.resources.requests.memory',
      translationKey: 'monitoring.prometheus.config.requests.memory'
    },
    {
      path:           'fluentd.resources.limits.cpu',
      translationKey: 'monitoring.prometheus.config.limits.cpu'
    },
    {
      path:           'fluentd.resources.limits.memory',
      translationKey: 'monitoring.prometheus.config.limits.memory'
    },
  ];

  requiredFields.forEach((rule) => {
    if (!get(valueJson, rule.path)) {
      errors.push(getters['i18n/t']('validation.required', { key: getters['i18n/t'](rule.translationKey) }));
    }
  });

  return errors;
}

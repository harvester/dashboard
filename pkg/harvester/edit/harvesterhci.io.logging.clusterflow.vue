<script>
import { LAST_NAMESPACE } from '@shell/store/prefs';
import { LOGGING } from '@shell/config/types';
import Flow from '@shell/edit/logging-flow';

export default {
  extends: Flow,
  created() {
    if (this.isCreate && this.value.type === LOGGING.CLUSTER_FLOW) {
      this.value.metadata.namespace = 'cattle-logging-system';
    }

    this.registerBeforeHook(this.willSave, 'willSave');
    this.registerAfterHook(() => {
      const allNamespaces = this.$store.getters['allNamespaces'];
      const defaultNamepsace = allNamespaces.find(N => N.id === 'default');
      const ns = defaultNamepsace?.id || allNamespaces?.[0]?.id || '';

      this.value.$dispatch('prefs/set', { key: LAST_NAMESPACE, value: ns }, { root: true });
      this.willSave();
    });
  }
};

</script>

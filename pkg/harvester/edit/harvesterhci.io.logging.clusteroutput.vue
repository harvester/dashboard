<script>
import { LAST_NAMESPACE } from '@shell/store/prefs';
import CreateEditView from './harvesterhci.io.logging.output';

export default {
  extends: CreateEditView,
  created() {
    if (this.isCreate) {
      this.value.metadata.namespace = 'cattle-logging-system';
    }

    this.registerAfterHook(() => {
      const allNamespaces = this.$store.getters['allNamespaces'];
      const defaultNamepsace = allNamespaces.find(N => N.id === 'default');
      const ns = defaultNamepsace?.id || allNamespaces?.[0]?.id || '';

      this.value.$dispatch('prefs/set', { key: LAST_NAMESPACE, value: ns }, { root: true });
    });
  }
};
</script>

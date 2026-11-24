/**
 * Side-effect entry for typestyles build-time CSS extraction (`mode: 'build'`).
 * Import every module that registers typestyles used by this site.
 */
import './styles';
import './demos/components-variants';
import './demos/theming-light-dark';
import '@examples/design-system';
import '@examples/design-system/codeHighlight';
import '@var-ui/core/styles';
import '@var-ui/docs/styles';

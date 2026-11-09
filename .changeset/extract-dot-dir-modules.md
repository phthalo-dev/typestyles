---
'@typestyles/build-runner': patch
---

Extraction now finds style modules under a dot directory (such as `.storybook/styles.ts`). A root-relative path starting with `.` was passed to esbuild without `./`, so it was resolved as a package name and the build failed.
